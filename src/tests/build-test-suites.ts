import type { FixtureAtom, LoopOpts, LoopReport, SourceFormat } from "../../../hson-live/dist/diagnostics/loop-3.test";
import type {  CaseKey, FixtureBundle, HsonTestApi, TestCase, TestRunMode, TestSuite } from "./tests.types";
import { JSON_FIXTURES_DEV, JSON_FIXTURES_LEGACY } from "../../data-old/data/json-fixtures"
import { _snip } from "../app/utils/helpers";
import { _is_Node, _test_full_loop } from "hson-live/diagnostics";
import { FAIL_IS_PASS, HTML_FIXTURES_LEGACY } from "../../data-old/data/html-fixtures";
import { _freeze } from "./tests.consts";
import { all_livetree_suites } from "./livetree-tests/all-livetree-suites";
import { unit_test_css, unit_test_pseudo_els } from "./unit-tests/livetree-unit-tests-1";
import { HTML_FIXTURES_NEW } from "./transform-tests/new-fixtures";
import { all_unit_tests } from "./unit-tests/make-unit-case";
import { EXTRA_FIXTURES } from "./transform-tests/extra-fixtures";

function preview_atom(atom: FixtureAtom): string {
  // small, safe, non-throwy preview for inspector.
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

// add an explicit entryFmt param
export function make_transform_test_suite(
  hson: HsonTestApi,
  fixtures: FixtureBundle,
  suite = "transform/",
  captureMap?: Map<CaseKey, () => Promise<LoopReport>>,
  entryFmt: SourceFormat = "auto",
  expected: "pass" | "fail" = "pass",
): TestSuite {
  const cases: TestCase[] = [];

  for (const [group, bundle] of Object.entries(fixtures)) {
    for (const [sub, atom] of Object.entries(bundle)) {
      const name = `${group}.${sub}`;
      const entry = entryFmt;
      const k = `${suite}::${name}` as const;

      if (captureMap) {
        captureMap.set(k, async () => {
          return hson._test_full_loop(atom, {
            entry,
            dual: true,
            times: 3,
            verbose: true,
            capture: true,
            stopOnFirstFail: false,
          });
        });
      }

      cases.push(_freeze({
        suite,
        name,
        meta: {
          fixture: group,
          sub,
          preview: preview_atom(atom),
        },

        run: () => {
          const base = {
            entry,
            dual: true,
            times: 3,
            stopOnFirstFail: false,
          } as const;

          const input =
            typeof atom === "string"
              ? atom
              : (typeof atom === "object" && atom && "text" in atom)
                ? JSON.stringify((atom as { text?: unknown }).text ?? "", null, 2)
                : JSON.stringify(atom, null, 2);

          const report = hson._test_full_loop(atom, {
            ...base,
            verbose: true,
            capture: true,
          });

          const didPass = report.ok;
          const shouldPass = expected === "pass";

          if (didPass !== shouldPass) {
            const f0 = report.failures?.[0];
            const msg =
              expected === "pass"
                ? (f0?.error ? `${f0.step}: ${f0.error}` : `loop failed (ok=false)`)
                : `expected failure, but loop passed`;

            throw new Error(msg);
          }

          return {
            metaPatch: _freeze({
              fixture: group,
              input,
              sub,
              preview: input.length ? _snip(input) : "—",
              expected,
            }),
          };
        },
      }));
    }
  }

  return _freeze({ suite, cases: _freeze(cases) });
}

type FullLoopFn = (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;


export function build_suites_for_mode(
  mode: TestRunMode,
  h: Readonly<{ _test_full_loop: FullLoopFn }>,
  map?: Map<CaseKey, () => Promise<LoopReport>>,
): readonly TestSuite[] {


  if (mode === "legacy") {
    return _freeze([
      make_transform_test_suite(h, JSON_FIXTURES_LEGACY, "transform/legacy/json", map),
      make_transform_test_suite(h, HTML_FIXTURES_LEGACY, "transform/legacy/html", map),
    ]);
  }

  if (mode === "transform") {
    return _freeze([
      make_transform_test_suite(h, HTML_FIXTURES_NEW, "transform/new", map),
      make_transform_test_suite(h, EXTRA_FIXTURES, "transform/extra", map),
      make_transform_test_suite(h, FAIL_IS_PASS, "transform/invalid/fail_is_pass", map, "auto", "fail"),
    ]);
  }
  if (mode === "dev") {
    return _freeze([
      ...all_unit_tests(),

    ])
  }
  if (mode === "unit") {
    return _freeze([
      ...all_unit_tests(),

    ])
  }
  if (mode === "livetree") {
    return _freeze([
      ...all_livetree_suites(),
    ])
  }

  return _freeze([
    make_transform_test_suite(h, HTML_FIXTURES_NEW, "transform/new", map),
    make_transform_test_suite(h, EXTRA_FIXTURES, "transform/extra", map),
    make_transform_test_suite(h, JSON_FIXTURES_LEGACY, "transform/legacy/json", map),
    make_transform_test_suite(h, HTML_FIXTURES_LEGACY, "transform/legacy/html", map),
    make_transform_test_suite(h, JSON_FIXTURES_DEV, "dev/test", map),
    make_transform_test_suite(h, FAIL_IS_PASS, "transform/invalid/fail_is_pass", map, "auto", "fail"),
    ...all_livetree_suites(),
    ...all_unit_tests(),
  ]);
}
