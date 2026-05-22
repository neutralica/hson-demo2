import type { CaseKey, FixtureBundle, HsonTestApi, TestCase, TestRunMode, TestSuite } from "./tests.types";
import { JSON_FIXTURES_DEV, JSON_FIXTURES_LEGACY } from "../../data-old/data/json-fixtures"
import { _snip } from "../app/utils/helpers";
import { _is_Node, _test_full_loop } from "hson-live/diagnostics";
import { TRANSFORM_FAILS, HTML_FIXTURES_LEGACY } from "../../data-old/data/html-fixtures";
import { _freeze } from "./tests.consts";
import { all_livetree_suites } from "./livetree-tests/all-livetree-suites";
import { HTML_FIXTURES_NEW } from "./transform-tests/new-html-fixtures";
import { all_unit_tests } from "./unit-tests/all-unit-tests";
import { EXTRA_FIXTURES } from "./transform-tests/extra-fixtures";
import { livetree_create_size } from "./livetree-tests/livetree-06";
import { livetree_more_listeners } from "./livetree-tests/livetree-07";
import { listeners_teardown } from "./livetree-tests/livetree-04";
import { livetree_completionist } from "./livetree-tests/livetree-05";
import { HSON_FIXTURES, HSON_FXT_INVALID } from "./transform-tests/hson-tests";
import { JSON_FIXTURES_LEVEL2 } from "./transform-tests/json-level-2";
import type { FixtureAtom, LoopReport, SourceFormat, LoopOpts } from "../../../hson-live/dist/types/diagnostics.types";
import { livetree_svg_lvl2 } from "./livetree-tests/livetree-12-svg-new";
import { livetree_new_form_api } from "./livetree-tests/livetree-13-form";
import { make_json_fixture_bundle, make_json_fixture_map, random_seed } from "./json-tests/json-test-builder";
import { livetree_canvas, livetree_canvas_stress } from "./livetree-tests/livetree-14-canvas";
import { livetree_canvas_clear, livetree_canvas_display, livetree_canvas_plot } from "./livetree-tests/livetree-15-canvas-size";
import { livetree_canvas_pointer, livetree_document_ownership } from "./livetree-tests/livetree-16-canvas-3";

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

      const input =
        typeof atom === "string"
          ? atom
          : (typeof atom === "object" && atom && "text" in atom)
            ? JSON.stringify((atom as { text?: unknown }).text ?? "", null, 2)
            : JSON.stringify(atom, null, 2);

      cases.push(_freeze({
        suite,
        name,
        meta: {
          fixture: group,
          input,
          sub,
          preview: input.length ? _snip(input) : "—",
        },


        run: () => {
          const base = {
            entry,
            dual: true,
            times: 3,
            stopOnFirstFail: false,
          } as const;

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

const GENERATED_JSON_SEED = random_seed();

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
      make_transform_test_suite(h, HSON_FIXTURES, "transform/hson/fixtures", map),
      make_transform_test_suite(h, TRANSFORM_FAILS, "transform/invalid/fail_is_pass", map, "auto", "fail"),
      make_transform_test_suite(h, HSON_FXT_INVALID, "transform/hson/invalid", map, "hson", "fail"),
      make_transform_test_suite(h, JSON_FIXTURES_LEVEL2, "transform/json/level-2", map),
      make_transform_test_suite(
        h,
        make_json_fixture_bundle(50, GENERATED_JSON_SEED),
        `generated/json/seed_${GENERATED_JSON_SEED}`,
        map,
      ),
    ]);
  }
  if (mode === "dev") {
    return _freeze([
      livetree_document_ownership()
    ])
  }
  if (mode === "fuzz-json") {
    const GENERATED_JSON_SEED = random_seed();
    return _freeze([

      make_transform_test_suite(
        h,
        make_json_fixture_bundle(200, GENERATED_JSON_SEED),
        `generated/json/seed_${GENERATED_JSON_SEED}`,
        map,
      )

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
    make_transform_test_suite(h, HSON_FIXTURES, "transform/hson/fixtures", map),
    make_transform_test_suite(h, EXTRA_FIXTURES, "transform/extra", map),
    make_transform_test_suite(h, JSON_FIXTURES_LEGACY, "transform/legacy/json", map),
    make_transform_test_suite(h, HTML_FIXTURES_LEGACY, "transform/legacy/html", map),
    make_transform_test_suite(h, JSON_FIXTURES_DEV, "dev/test", map),
    make_transform_test_suite(h, TRANSFORM_FAILS, "transform/invalid/fail_is_pass", map, "auto", "fail"),
    make_transform_test_suite(h, HSON_FXT_INVALID, "transform/hson/invalid", map, "hson", "fail"),
    make_transform_test_suite(h, JSON_FIXTURES_LEVEL2, "transform/json/level-2", map),
    ...all_livetree_suites(),
    ...all_unit_tests(),
    make_transform_test_suite(
      h,
      make_json_fixture_bundle(50, GENERATED_JSON_SEED),
      `generated/json/seed_${GENERATED_JSON_SEED}`,
      map,
    ),
  ]);
}
