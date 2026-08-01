import { _circuit_test } from "hson-live/diagnostics";
import type { TestSuite } from "../core/test-contracts";
import type { CaseKey } from "../core/test-contracts";
import type { LoopReport } from "hson-live/diagnostics";
import { HTML_FIXTURES_LEGACY, TRANSFORM_FAILS } from "../../fixtures/transform/html/html-fixtures";
import { JSON_FIXTURES_LEGACY, JSON_FIXTURES_DEV } from "../../fixtures/transform/json/json-fixtures";
import { EXTRA_FIXTURES } from "../../fixtures/transform/html/extra-fixtures";
import { HSON_FIXTURES, HSON_FXT_INVALID } from "../../fixtures/transform/hson/hson-tests";
import { JSON_FIXTURES_LEVEL2 } from "../../fixtures/transform/json/json-level-2";
import { make_transform_test_suite } from "../../suites/transform/make-transform-suite";
import { HTML_FIXTURES_NEW } from "../../fixtures/transform/html/new-html-fixtures";

/** Fixed, reproducible transform suites. Generated/fuzz declarations are intentionally excluded. */
export function all_deterministic_transform_test_suites(
  captureMap?: Map<CaseKey, () => Promise<LoopReport>>,
): readonly TestSuite[] {
  return Object.freeze([
    make_transform_test_suite({ _circuit_test }, JSON_FIXTURES_DEV, "transform/json/basic-test", captureMap),
    make_transform_test_suite({ _circuit_test }, JSON_FIXTURES_LEGACY, "transform/legacy/json", captureMap),
    make_transform_test_suite({ _circuit_test }, HTML_FIXTURES_LEGACY, "transform/legacy/html", captureMap),
    make_transform_test_suite({ _circuit_test }, HTML_FIXTURES_NEW, "transform/html/new", captureMap),
    make_transform_test_suite({ _circuit_test }, EXTRA_FIXTURES, "transform/misc-extra", captureMap),
    make_transform_test_suite({ _circuit_test }, HSON_FIXTURES, "transform/hson", captureMap, "hson"),
    make_transform_test_suite({ _circuit_test }, JSON_FIXTURES_LEVEL2, "transform/json/level-2", captureMap),
    make_transform_test_suite({ _circuit_test }, TRANSFORM_FAILS, "transform/_INVALID", captureMap, "auto", "fail"),
    make_transform_test_suite({ _circuit_test }, HSON_FXT_INVALID, "transform/hson/_INVALID", captureMap, "hson", "fail"),
  ]);
}
