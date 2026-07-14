import { _circuit_test } from "hson-live/diagnostics";
import type { TestSuite } from "../app/demos/test/tests.types";
import { HTML_FIXTURES_LEGACY, TRANSFORM_FAILS } from "../tests/test-data/html-fixtures";
import { JSON_FIXTURES_LEGACY, JSON_FIXTURES_DEV } from "../tests/test-data/json-fixtures";
import { EXTRA_FIXTURES } from "../tests/transform/extra-fixtures";
import { HSON_FIXTURES, HSON_FXT_INVALID } from "../tests/transform/hson-tests";
import { JSON_FIXTURES_LEVEL2 } from "../tests/transform/json-level-2";
import { make_transform_test_suite } from "../tests/transform/make-transform-suite";
import { HTML_FIXTURES_NEW } from "../tests/transform/new-html-fixtures";

/** Fixed, reproducible transform suites. Generated/fuzz declarations are intentionally excluded. */
export function all_deterministic_transform_test_suites(): readonly TestSuite[] {
  return Object.freeze([
    make_transform_test_suite({ _circuit_test }, JSON_FIXTURES_DEV, "transform/json/basic-test"),
    make_transform_test_suite({ _circuit_test }, JSON_FIXTURES_LEGACY, "transform/legacy/json"),
    make_transform_test_suite({ _circuit_test }, HTML_FIXTURES_LEGACY, "transform/legacy/html"),
    make_transform_test_suite({ _circuit_test }, HTML_FIXTURES_NEW, "transform/html/new"),
    make_transform_test_suite({ _circuit_test }, EXTRA_FIXTURES, "transform/misc-extra"),
    make_transform_test_suite({ _circuit_test }, HSON_FIXTURES, "transform/hson"),
    make_transform_test_suite({ _circuit_test }, JSON_FIXTURES_LEVEL2, "transform/json/level-2"),
    make_transform_test_suite({ _circuit_test }, TRANSFORM_FAILS, "transform/_INVALID", undefined, "auto", "fail"),
    make_transform_test_suite({ _circuit_test }, HSON_FXT_INVALID, "transform/hson/_INVALID", undefined, "hson", "fail"),
  ]);
}
