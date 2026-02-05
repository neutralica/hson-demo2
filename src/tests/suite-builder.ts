import type { FixtureAtom, LoopOpts } from "../../../hson-live/dist/diagnostics/loop-3.test";
import { _freeze, FIXTURES_GENERATED } from "../fixtures/generate-fixtures";
import type { Fixture, FixtureFmt } from "../fixtures/fixtures.types";
import type { TestCase, TestRunMode, TestSuite } from "./tests.types";
import { FIXTURES_BASIC } from "../../data-old/data/json-fixtures"
import { _snip } from "../app/utils/helpers";
import { _is_Node } from "hson-live/diagnostics";

type FixtureBundlePart = Readonly<Record<string, FixtureAtom>>;
// CHANGED: fixtures are now always grouped bundles (2-level)
export type FixtureBundle = Readonly<Record<string, FixtureBundlePart>>;
type LoopReport = {
  ok: boolean;
  entry: string;
  failures: unknown[];
  trace?: unknown[];
  final?: { fmt: string; text: string };
};

export type HsonTestApi = Readonly<{
  _test_full_loop: (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;
}>;


export type FixtureMap = Readonly<Record<string, FixtureAtom>>;
function preview_atom(atom: FixtureAtom): string {
  // CHANGED: small, safe, non-throwy preview for inspector.
  // We do NOT stringify huge objects or do deep serialization here.

  if (atom === null) return "null";

  const t = typeof atom;
  if (t === "string") return _snip(atom as string);
  if (t === "number" || t === "boolean") return String(atom);

  // HTMLElement
  if (typeof HTMLElement !== "undefined" && atom instanceof HTMLElement) {
    return _snip(atom.outerHTML);
  }

  // HsonNode / object (cheap tag hint if present)
  if (atom && t === "object") {
    const a = atom as Record<string, unknown>;
    if (typeof a["_tag"] === "string") return `[HsonNode ${a["_tag"]}]`;
    return "[object]";
  }

  return String(atom);
}

function fmt_report(r: LoopReport): string {
  const lines: string[] = [];
  lines.push(`ok: ${String(r.ok)}`);
  lines.push(`entry: ${r.entry}`);
  lines.push(`failures: ${r.failures?.length ?? 0}`);
  if (r.final) lines.push(`final: ${r.final.fmt}`);
  return lines.join("\n");
}

// CHANGED: helper
function is_json_primitive(v: unknown): v is string | number | boolean | null {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

// CHANGED: normalize JSON source so root is always obj/arr (wrap primitives)
function normalize_json_root_source(src: string): { src: string; wrapped: boolean } {
  const parsed = JSON.parse(src) as unknown;

  if (is_json_primitive(parsed)) {
    return {
      src: JSON.stringify({ scalar: parsed }),
      wrapped: true,
    };
  }

  return { src, wrapped: false };
}

function is_plain_object(x: unknown): x is Record<string, unknown> {
  if (!x || typeof x !== "object") return false;
  if (Array.isArray(x)) return false;
  if (x instanceof HTMLElement) return false;      // CHANGED
  if (_is_Node(x)) return false;
  return true;
}

function is_json_source_text(s: string): boolean {
  const t = s.trim();
  if (typeof t[0] !== "string") return false;

  // quick shape gate: most JSON documents/scalars start like this
  const c0: string = t[0];
  const looksLikeJson =
    c0 === "{" || c0 === "[" || c0 === "\"" || c0 === "-" ||
    (c0 >= "0" && c0 <= "9") || t === "true" || t === "false" || t === "null";

  if (!looksLikeJson) return false;

  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

// CHANGED: normalize ANY Jsonish/scalar into JSON source text
function to_json_source(v: unknown): string {
  if (typeof v === "string") {
    // If it already parses as JSON, keep verbatim (for your pre-stringified fixtures).
    // Otherwise it’s a scalar string value -> quote it.
    return is_json_source_text(v) ? v : JSON.stringify(v);
  }
  // numbers, booleans, null, objects, arrays
  return JSON.stringify(v);
}

// CHANGED: snippet helper for inspector previews
function preview_text(s: string, max = 200): string {
  const t = s.length > max ? `${s.slice(0, max)}…` : s;
  return t.replace(/\s+/g, " ").trim();
}

function is_fixture_atom(x: unknown): x is FixtureAtom {
  if (x === null) return true;
  const t = typeof x;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (typeof HTMLElement !== "undefined" && x instanceof HTMLElement) return true;
  // HsonNode / object counts as FixtureAtom in your union, so:
  if (t === "object") return true;
  return false;
}

export function make_test_suite(
  hson: HsonTestApi,
  fixtures: FixtureBundle,
  suite = "fixtures/basic",
): TestSuite {
  const cases: TestCase[] = [];

  for (const [group, bundle] of Object.entries(fixtures)) {
    for (const [sub, atom] of Object.entries(bundle)) {
      const name = `${group}.${sub}`;

      cases.push(_freeze({
        suite,
        name,
        meta: {
          fixture: group,
          sub,
          // optional: useful for inspector readability
          preview: preview_atom(atom),
        },
        run: () => {
          const r = hson._test_full_loop(atom, { entry: "json", dual: true, times: 3 });
          // ^ CHANGED: if you want entry derived from group prefix, do it here,
          // but if you're stringifying everything anyway, entry can be constant.
          if (!r.ok) throw new Error(`fixture failed: ${name}\n${fmt_report(r)}`);
        },
      }));
    }
  }

  return _freeze({ suite, cases: _freeze(cases) });
}

export function make_generated_fixtures_suite(
  hson: HsonTestApi,
  fixtures: readonly Fixture[],
): TestSuite {
  const suite = "fixtures/generated";

  return _freeze({
    suite,
    cases: _freeze(
      fixtures.map((fx) => {
        const preview = preview_atom(fx.atom);                 // CHANGED
        const tags = fx.tags?.length ? fx.tags.join(",") : ""; // CHANGED

        const meta: Record<string, string> = {                 // CHANGED
          fmt: fx.fmt,
          preview,
          ...(tags ? { tags } : {}),
        };

        return _freeze({
          suite,
          name: fx.name,
          meta,                                                // CHANGED (always)
          run: () => {
            const r = hson._test_full_loop(fx.atom, { entry: fx.fmt, dual: true, times: 3 });
            if (!r.ok) throw new Error(`fixture failed: ${fx.name}`);
          },
        });
      }),
    ),
  });
}


type FullLoopFn = (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;

export function build_suites_for_mode(
  mode: TestRunMode,
  h: Readonly<{ _test_full_loop: FullLoopFn }>,
): readonly TestSuite[] {
  if (mode === "basic") {
    return _freeze([
      make_test_suite(h, FIXTURES_BASIC, "fixtures/basic"),
    ]);
  }

  if (mode === "generated") {
    return _freeze([
      make_generated_fixtures_suite(h, FIXTURES_GENERATED),
    ]);
  }

  // "all" (default)
  return _freeze([
    make_test_suite(h, FIXTURES_BASIC, "fixtures/basic"),
    make_generated_fixtures_suite(h, FIXTURES_GENERATED),
  ]);
}