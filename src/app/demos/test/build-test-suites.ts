import type { FixtureAtom, LoopOpts, LoopReport } from "hson-live/diagnostics";
import type { SourceFormat } from "../../../../../hson-live/dist/types/diagnostics.types";
import { all_demo_meta } from "../../../tests/demo-meta-tests/make-demo-meta-test";
import { random_seed, make_json_fuzz_suite } from "../../../tests/json-fuzzer/fuzzer-builder";
import { all_livetree_suites } from "../../../tests/livetree-tests/all-livetree-suites";
import { EXTRA_FIXTURES } from "../../../tests/transform-tests/extra-fixtures";
import { HSON_FIXTURES, HSON_FXT_INVALID } from "../../../tests/transform-tests/hson-tests";
import { JSON_FIXTURES_LEVEL2 } from "../../../tests/transform-tests/json-level-2";
import { HTML_FIXTURES_NEW } from "../../../tests/transform-tests/new-html-fixtures";
import { HTML_FIXTURES_LEGACY, TRANSFORM_FAILS } from "../../../../data-old/data/html-fixtures"
import { JSON_FIXTURES_DEV, JSON_FIXTURES_LEGACY } from "../../../../data-old/data/json-fixtures"

import { all_unit_tests } from "../../../tests/unit-tests/all-unit-tests";
import { _freeze } from "./tests.consts";
import type { HsonTestApi, CaseKey, TestSuite, TestRunMode } from "./tests.types";
import { livetree_graph_dom_markup_surface } from "../../../tests/livetree-tests/livetree-24-dom-corners";
import { make_transform_test_suite } from "../../../tests/transform-tests/make-transform-suite";
import { all_livemap_suites } from "../../../tests/livemap-tests/all-livemap-suites";

type FullLoopFn = (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;


export function make_ad_hoc_transform_suite(
  hson: HsonTestApi,
  fmt: SourceFormat,
  text: string,
  captureMap?: Map<CaseKey, () => Promise<LoopReport>>,
): TestSuite {
  return make_transform_test_suite(
    hson,
    {
      "parse-panel": {
        [fmt]: text as FixtureAtom,
      },
    },
    `transform/ad-hoc/${fmt}`,
    captureMap,
    fmt,
  );
}

/* [{
  "resource": "/Users/philliphanson/Documents/Design/web/hson/hson-demo2/src/app/demos/test/tp-factory.ts",
  "owner": "typescript",
  "code": "2353",
  "severity": 8,
  "message": "Object literal may only specify known properties, and '_circuit_test' does not exist in type 'Readonly<{ _test_full_loop: (atom: FixtureAtom, opts?: Partial<LoopOpts> | undefined) => LoopReport; }>'.",
  "source": "ts",
  "startLineNumber": 297,
  "startColumn": 55,
  "endLineNumber": 297,
  "endColumn": 68,
  "origin": "extHost1"
}] */
const GENERATED_JSON_SEED = random_seed();

export function build_suites_for_mode(
  mode: TestRunMode,
  h: Readonly<{ _circuit_test: FullLoopFn }>,
  map?: Map<CaseKey, () => Promise<LoopReport>>,
): readonly TestSuite[] {


  if (mode === "legacy") {
    return _freeze([
      make_transform_test_suite(h, JSON_FIXTURES_LEGACY, "transform/legacy/json", map),
      make_transform_test_suite(h, HTML_FIXTURES_LEGACY, "transform/legacy/html", map),
    ]);
  }

  if (mode === "livemap") {
    return _freeze([
      ...all_livemap_suites(),

    ]);
  }

  if (mode === "transform") {
    return _freeze([
      make_transform_test_suite(h, JSON_FIXTURES_DEV, "transform/json/basic-test", map),
      make_transform_test_suite(
        h,
        make_json_fuzz_suite(50, GENERATED_JSON_SEED),
        `transform/fuzz-json/seed_${GENERATED_JSON_SEED}`,
        map,
      ),
      make_transform_test_suite(h, JSON_FIXTURES_LEGACY, "transform/legacy/json", map),
      make_transform_test_suite(h, HTML_FIXTURES_LEGACY, "transform/legacy/html", map),
      make_transform_test_suite(h, HTML_FIXTURES_NEW, "transform/html/new", map),
      make_transform_test_suite(h, EXTRA_FIXTURES, "transform/misc-extra", map),
      make_transform_test_suite(h, HSON_FIXTURES, "transform/hson", map),
      make_transform_test_suite(h, JSON_FIXTURES_LEVEL2, "transform/json/level-2", map),
      make_transform_test_suite(h, TRANSFORM_FAILS, "transform/_INVALID", map, "auto", "fail"),
      make_transform_test_suite(h, HSON_FXT_INVALID, "transform/hson/_INVALID", map, "hson", "fail"),
    ]);
  }
  if (mode === "dev") {
    return _freeze([
      livetree_graph_dom_markup_surface(),
    ]);
  }
  if (mode === "demo-meta") {
    return _freeze([
      ...all_demo_meta(),
    ]);
  }
  if (mode === "fuzz-json") {
    const GENERATED_JSON_SEED = random_seed();
    return _freeze([
      make_transform_test_suite(
        h,
        make_json_fuzz_suite(200, GENERATED_JSON_SEED),
        `generated/json/seed_${GENERATED_JSON_SEED}`,
        map,
      )

    ])
  }
  if (mode === "unit") {
    return _freeze([
      ...all_unit_tests(),
    ]);
  }
  if (mode === "livetree") {
    return _freeze([
      ...all_livetree_suites(),
    ]);
  }

  return _freeze([
    make_transform_test_suite(h, JSON_FIXTURES_DEV, "transform/json/basic-test", map),
    make_transform_test_suite(
      h,
      make_json_fuzz_suite(50, GENERATED_JSON_SEED),
      `transform/fuzz-json/seed_${GENERATED_JSON_SEED}`,
      map,
    ),
    make_transform_test_suite(h, JSON_FIXTURES_LEGACY, "transform/legacy/json", map),
    make_transform_test_suite(h, HTML_FIXTURES_LEGACY, "transform/legacy/html", map),
    make_transform_test_suite(h, HTML_FIXTURES_NEW, "transform/html/new", map),
    make_transform_test_suite(h, EXTRA_FIXTURES, "transform/misc-extra", map),
    make_transform_test_suite(h, HSON_FIXTURES, "transform/hson", map),
    make_transform_test_suite(h, JSON_FIXTURES_LEVEL2, "transform/json/level-2", map),
    make_transform_test_suite(h, TRANSFORM_FAILS, "transform/_INVALID", map, "auto", "fail"),
    make_transform_test_suite(h, HSON_FXT_INVALID, "transform/hson/_INVALID", map, "hson", "fail"),
    ...all_livetree_suites(),
    ...all_livemap_suites(),
    ...all_unit_tests(),
  ]);
}
