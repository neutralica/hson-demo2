import type { CaseKey, FixtureBundle, HsonTestApi, TestCase, TestRunMode, TestSuite } from "./tests.types";
import { JSON_FIXTURES_DEV, JSON_FIXTURES_LEGACY } from "../../../../../data-old/data/json-fixtures"
import { _snip } from "../../../utils/helpers";
import { _is_Node, _test_full_loop } from "hson-live/diagnostics";
import { TRANSFORM_FAILS, HTML_FIXTURES_LEGACY } from "../../../../../data-old/data/html-fixtures";
import { _freeze } from "./tests.consts";
import { all_livetree_suites } from "../../../../tests/livetree-tests/all-livetree-suites";
import { HTML_FIXTURES_NEW } from "../../../../tests/transform-tests/new-html-fixtures";
import { all_unit_tests } from "../../../../tests/unit-tests/all-unit-tests";
import { EXTRA_FIXTURES } from "../../../../tests/transform-tests/extra-fixtures";
import { HSON_FIXTURES, HSON_FXT_INVALID } from "../../../../tests/transform-tests/hson-tests";
import { JSON_FIXTURES_LEVEL2 } from "../../../../tests/transform-tests/json-level-2";
import type { FixtureAtom, LoopReport, SourceFormat, LoopOpts } from "../../../../../../hson-live/dist/types/diagnostics.types";
import { make_json_fixture_bundle, random_seed } from "../../../../tests/json-tests/json-test-builder";
import { livetree_anim_key_preservation, livetree_dom_contains_surface, livetree_listener_api_surface } from "../../../../tests/livetree-tests/livetree-21-anim-kf";


type FullLoopFn = (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;


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
      make_transform_test_suite(h, JSON_FIXTURES_DEV, "transform/json/basic-test", map),
      make_transform_test_suite(
        h,
        make_json_fixture_bundle(50, GENERATED_JSON_SEED),
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
      livetree_anim_key_preservation(),
      livetree_dom_contains_surface(),
      livetree_listener_api_surface(),


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
    make_transform_test_suite(h, JSON_FIXTURES_DEV, "transform/json/basic-test", map),
    make_transform_test_suite(
      h,
      make_json_fixture_bundle(50, GENERATED_JSON_SEED),
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
    ...all_unit_tests(),
  ]);
}
