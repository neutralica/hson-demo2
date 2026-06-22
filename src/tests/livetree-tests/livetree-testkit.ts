
// -----------------------------
// Types
// -----------------------------

import { LiveTree, hson } from "hson-live";
import type { TestSuite, TestCase, LiveTreeCaseSpec, MetaPatch, Asserter, TestAssertRow } from "../../app/demos/test/tests.types";

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
      // build IR-only tree (detached) first
      const html = spec.html?.trim() ?? "";
      if (!html) {
        throw new Error(
          `LiveTree test case has empty html: fixture=${spec.fixture ?? ""} sub=${spec.sub ?? ""} name=${spec.name}`
        );
      }

      const tree = hson.liveTree.fromTrustedHtml(html);
      // ADDED: optional DOM mount
      let sandbox: HTMLDivElement | null = null;

      try {
        if (spec.dom) {
          sandbox = document.createElement("div");
          sandbox.id = "hson-sandbox"
          sandbox.setAttribute("data-test-sandbox", suite);
          sandbox.style.position = "fixed";
          sandbox.style.left = "-10000px";
          sandbox.style.top = "0px";
          sandbox.style.width = "1px";
          sandbox.style.height = "1px";
          sandbox.style.overflow = "hidden";

          document.body.appendChild(sandbox);

          // this is the key — create DOM now
          // If graft is sync in your implementation, await is harmless.
          const host = hson.liveTree.queryDom("#hson-sandbox").graft();
          (tree as any).__sandboxHost = host;
          (tree as any).__sandboxEl = sandbox;
          host.append(tree);
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
        const assertRows = bag.getRows();

        const metaPatch: MetaPatch = {
          input: spec.html,
          preview: (spec.preview ?? default_preview)(tree),
          fixture: spec.fixture ?? spec.name,
          sub: spec.sub ?? "",
          category: "livetree",
          assertRows: JSON.stringify(assertRows), // CHANGED
        };

        return { metaPatch, assertRows } as const;
      } finally {
        // ADDED: teardown so cases can't leak DOM into later tests
        if (sandbox) sandbox.remove();
      }
    },
  }));

  return { suite, cases: built } as const;
}

export function default_preview(tree: LiveTree): string {
  try {
    const domApi = tree.dom;
    const el = domApi.el?.();
    if (el && "outerHTML" in el) return (el as Element).outerHTML;
  } catch {
    // ignore
  }

  try {
    const el = tree.dom.el?.();
    if (el && "outerHTML" in el) return (el as Element).outerHTML;
  } catch {
    // ignore
  }

  return `<no-dom quids=${tree.quid ?? "?"}>`;
}
// -----------------------------
// Failure aggregation
// -----------------------------

class FailureBag {
  private readonly lines: string[] = [];
  private readonly rows: TestAssertRow[] = [];

  private pushRow(row: TestAssertRow): void {
    this.rows.push(Object.freeze(row));
  }

  public getRows(): readonly TestAssertRow[] {
    return Object.freeze([...this.rows]);
  }

  asserter(): Asserter {
    return {
      ok: (label, condition) => {
        const pass = !!condition;

        this.pushRow({
          ok: pass,
          label,
          actual: fmt(condition),
          expected: "truthy",
        });

        if (!pass) {
          this.lines.push(`${label}: expected truthy, got ${fmt(condition)}`);
        }
      },

      eq: (label, got, want) => {
        const pass = Object.is(got, want);

        this.pushRow({
          ok: pass,
          label,
          actual: fmt(got),
          expected: fmt(want),
        });

        if (!pass) {
          this.lines.push(`${label}: expected ${fmt(want)}, got ${fmt(got)}`);
        }
      },

      neq: (label, got, notWant) => {
        const pass = !Object.is(got, notWant);

        this.pushRow({
          ok: pass,
          label,
          actual: fmt(got),
          expected: `!= ${fmt(notWant)}`,
        });

        if (!pass) {
          this.lines.push(`${label}: expected != ${fmt(notWant)}, got ${fmt(got)}`);
        }
      },

      hasAttr: (label, el, attr) => {
        const pass = !!el && el.hasAttribute(attr);

        this.pushRow({
          ok: pass,
          label,
          actual: el ? String(el.getAttribute(attr)) : "null-el",
          expected: `has attr "${attr}"`,
        });

        if (!pass) {
          this.lines.push(`${label}: expected element to have attr "${attr}"`);
        }
      },

      attrEq: (label, el, attr, want) => {
        const got = el ? el.getAttribute(attr) : null;
        const pass = got === want;

        this.pushRow({
          ok: pass,
          label,
          actual: fmt(got),
          expected: fmt(want),
        });

        if (!pass) {
          this.lines.push(
            `${label}: attr "${attr}" expected ${fmt(want)}, got ${fmt(got)}`,
          );
        }
      },

      outcomeOk: (label, maybeOutcome) => {
        let pass = true;
        let actual = fmt(maybeOutcome);

        if (!maybeOutcome) {
          pass = false;
        } else {
          const asAny = maybeOutcome as any;

          if (typeof asAny === "object") {
            if ("ok" in asAny && asAny.ok === false) {
              pass = false;
              actual = "ok=false";
            } else if ("kind" in asAny && asAny.kind === "err") {
              pass = false;
              actual = "kind=err";
            } else if ("tag" in asAny && String(asAny.tag).toLowerCase().includes("err")) {
              pass = false;
              actual = `tag=${String(asAny.tag)}`;
            }
          }
        }

        this.pushRow({
          ok: pass,
          label,
          actual,
          expected: "outcome ok",
        });

        if (!pass) {
          if (!maybeOutcome) {
            this.lines.push(`${label}: outcome was ${fmt(maybeOutcome)}`);
            return;
          }

          const asAny = maybeOutcome as any;
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
  if (typeof v === "string") return JSON.stringify(v, null, 2);
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}