
// -----------------------------
// Types
// -----------------------------

import { LiveTree, hson } from "hson-live";
import type { TestSuite, TestCase, LiveTreeCaseSpec, MetaPatch, Asserter } from "../tests.types";

// -----------------------------
// Implementation
// -----------------------------
export function make_livetree_suite(
  suiteName: string,
  cases: readonly LiveTreeCaseSpec[],
): TestSuite {
  const suite = suiteName;

  const built: TestCase[] = cases.map((spec) => ({
    suite,
    name: spec.name,

    meta: {
      fixture: spec.fixture ?? spec.name,
      sub: spec.sub ?? "",
    },

    run: async () => {
      // CHANGED: build IR-only tree (detached) first
      const tree = hson.fromTrustedHtml(spec.html).liveTree.asBranch();

      // ADDED: optional DOM mount
      let sandbox: HTMLDivElement | null = null;

      try {
        if (spec.dom) {
          sandbox = document.createElement("div");
          sandbox.setAttribute("data-test-sandbox", suite);
          sandbox.style.position = "fixed";
          sandbox.style.left = "-10000px";
          sandbox.style.top = "0px";
          sandbox.style.width = "1px";
          sandbox.style.height = "1px";
          sandbox.style.overflow = "hidden";

          document.body.appendChild(sandbox);

          // CHANGED: this is the key — create DOM now
          // If graft is sync in your implementation, await is harmless.
          const grafted = hson.fromTrustedHtml(sandbox).liveTree.asBranch()

          tree.append(grafted);
        }

        await spec.act(tree);

        const bag = new FailureBag();
        const t = bag.asserter();

        await spec.assert(tree, t);

        bag.throwIfAny({
          suite,
          name: spec.name,
          input: spec.html,
          preview: (spec.preview ?? default_preview)(tree),
          fixture: spec.fixture ?? spec.name,
          sub: spec.sub ?? "",
        });

        const metaPatch: MetaPatch = {
          input: spec.html,
          preview: (spec.preview ?? default_preview)(tree),
          fixture: spec.fixture ?? spec.name,
          sub: spec.sub ?? "",
          category: "livetree",
        };
        return { metaPatch } as const;
      } finally {
        // ADDED: teardown so cases can't leak DOM into later tests
        if (sandbox) sandbox.remove();
      }
    },
  }));

  return { suite, cases: built } as const;
}

function default_preview(tree: LiveTree): string {
  // Prefer DOM outerHTML if present; otherwise something stable-ish.
  const el = tree.dom?.el?.() ?? tree.asDomElement?.();
  if (el && "outerHTML" in el) return (el as Element).outerHTML;
  return `<no-dom quids=${tree.quid ?? "?"}>`;
}

// -----------------------------
// Failure aggregation
// -----------------------------

class FailureBag {
  private readonly lines: string[] = [];

  asserter(): Asserter {
    return {
      ok: (label, condition) => {
        if (!condition) this.lines.push(`${label}: expected truthy, got ${fmt(condition)}`);
      },

      eq: (label, got, want) => {
        if (!Object.is(got, want)) {
          this.lines.push(`${label}: expected ${fmt(want)}, got ${fmt(got)}`);
        }
      },

      neq: (label, got, notWant) => {
        if (Object.is(got, notWant)) {
          this.lines.push(`${label}: expected != ${fmt(notWant)}, got ${fmt(got)}`);
        }
      },

      hasAttr: (label, el, attr) => {
        const ok = !!el && el.hasAttribute(attr);
        if (!ok) this.lines.push(`${label}: expected element to have attr "${attr}"`);
      },

      attrEq: (label, el, attr, want) => {
        const got = el ? el.getAttribute(attr) : null;
        if (got !== want) {
          this.lines.push(
            `${label}: attr "${attr}" expected ${fmt(want)}, got ${fmt(got)}`,
          );
        }
      },

      // Outcome recognition without constructing Outcomes:
      // - if your outcome type has outcome.isErr(x), you can adapt here.
      // For now we do a conservative check: common shapes.
      outcomeOk: (label, maybeOutcome) => {
        // CHANGED: conservative - avoids importing outcome/relay APIs here.
        // You can tighten this later to your canonical Outcome shape.
        if (!maybeOutcome) {
          this.lines.push(`${label}: outcome was ${fmt(maybeOutcome)}`);
          return;
        }

        const asAny = maybeOutcome as any;

        // Common conventions: { ok: boolean }, { kind: "err"|"ok" }, { tag: ... }
        if (typeof asAny === "object") {
          if ("ok" in asAny && asAny.ok === false) {
            this.lines.push(`${label}: outcome ok=false`);
            return;
          }
          if ("kind" in asAny && asAny.kind === "err") {
            this.lines.push(`${label}: outcome kind=err`);
            return;
          }
          if ("tag" in asAny && String(asAny.tag).toLowerCase().includes("err")) {
            this.lines.push(`${label}: outcome tag indicates error`);
            return;
          }
        }
      },
    };
  }

  throwIfAny(meta: {
    suite: string;
    name: string;
    input: string;
    preview: string;
    fixture: string;
    sub: string;
  }): void {
    if (this.lines.length === 0) return;

    const header =
      `[LiveTree FAIL] ${meta.suite} :: ${meta.name}\n` +
      `fixture=${meta.fixture} sub=${meta.sub}\n`;

    const body = this.lines.map((l) => `- ${l}`).join("\n");

    // Keep preview compact to avoid log blowups
    const preview = meta.preview.length > 1200 ? meta.preview.slice(0, 1200) + "…" : meta.preview;

    const msg =
      `${header}\n` +
      `${body}\n\n` +
      `--- preview ---\n` +
      `${preview}\n`;

    throw new Error(msg);
  }
}

function fmt(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}