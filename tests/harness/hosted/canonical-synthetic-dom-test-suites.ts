import type { TestCollection, TestDescriptorMetadata, TestSubject } from "../../../src/shared/testing/test-contracts";
import type { TestSuite } from "../core/test-contracts";
import { all_jsdom_hosted_test_suites } from "../runtimes/dom/jsdom-hosted-test-suites";
import {
  all_jsdom_hosted_canvas_suites,
  JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS,
  JSDOM_HOSTED_CANVAS_SUITE_IDS,
} from "../runtimes/dom/canvas/jsdom-hosted-canvas-suites";
import { parsing_browser_certificate_suite } from "../../suites/transform/parsing-browser-certificate-suite";

const DEV_SUITES = new Set(["livetree/quid-level-2"]);

export type TransformDomDependency =
  | "test/assertion dependency"
  | "implementation and test/assertion dependency";

/**
 * Verified by executing every fixed Transform suite without DOM globals and
 * inspecting the shared circuit harness. The JSON/HSON entry paths themselves
 * are DOM-free, but these suites assert dual HTML round trips. HTML/mixed
 * fixtures additionally exercise DOM-backed production parsing directly.
 */
export const TRANSFORM_SYNTHETIC_DOM_CLASSIFICATION: Readonly<Record<string, TransformDomDependency>> = Object.freeze({
  "transform/json/basic-test": "test/assertion dependency",
  "transform/legacy/json": "test/assertion dependency",
  "transform/hson": "test/assertion dependency",
  "transform/json/level-2": "test/assertion dependency",
  "transform/hson/invalid": "test/assertion dependency",
  "transform/legacy/html": "implementation and test/assertion dependency",
  "transform/html/new": "implementation and test/assertion dependency",
  "transform/misc-extra": "implementation and test/assertion dependency",
  "transform/invalid": "implementation and test/assertion dependency",
  "transform/parsing-browser-certificate": "implementation and test/assertion dependency",
});

export const CANVAS_DETERMINISTIC_SUITE_IDS = JSDOM_HOSTED_CANVAS_SUITE_IDS;
export const CANVAS_BROWSER_RASTER_CASE_IDS = JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS;

function suite_subject(suite: string): TestSubject {
  if (suite.startsWith("transform/")) return "transform";
  if (suite.startsWith("livemap/")) return "livemap";
  if (suite.startsWith("livetree/") || suite.startsWith("livetree-")) return "livetree";
  throw new Error(`Missing canonical synthetic-DOM subject mapping: ${suite}`);
}

function suite_collections(suite: string): readonly TestCollection[] {
  return DEV_SUITES.has(suite) ? Object.freeze(["dev"] as const) : Object.freeze([]);
}

function annotate(suite: TestSuite): TestSuite {
  if (suite.suite.startsWith("transform/")
    && TRANSFORM_SYNTHETIC_DOM_CLASSIFICATION[suite.suite] === undefined) {
    throw new Error(`Unclassified Transform execution dependency: ${suite.suite}`);
  }
  const descriptor: TestDescriptorMetadata = Object.freeze({
    subject: suite_subject(suite.suite),
    requirements: Object.freeze(["javascript", "node", "synthetic-dom"] as const),
    collections: suite_collections(suite.suite),
  });
  return Object.freeze({ ...suite, descriptor });
}

/** Original jsdom-hosted suites annotated for canonical Node execution. */
export function all_canonical_synthetic_dom_test_suites(): readonly TestSuite[] {
  return Object.freeze([
    ...all_jsdom_hosted_test_suites(),
    ...all_jsdom_hosted_canvas_suites(),
    parsing_browser_certificate_suite(),
  ].map(annotate));
}
