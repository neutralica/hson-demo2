import type { HostedTestSuiteId } from "./hosted-test-suite";
import { all_jsdom_hosted_test_suites, JSDOM_HOSTED_TEST_SUITE_IDS } from "../runtimes/dom/jsdom-hosted-test-suites";
import { all_jsdom_hosted_canvas_suites, JSDOM_HOSTED_CANVAS_SUITE_IDS } from "../runtimes/dom/canvas/jsdom-hosted-canvas-suites";

export type HostedMigrationClassification = "HOSTED" | "HOST_READY" | "DOM_REQUIRED" | "UNKNOWN_OR_MIXED";

export type HostedMigrationInventoryEntry = Readonly<{
  suite: string;
  cases: number | undefined;
  runner: string;
  classification: HostedMigrationClassification;
  browserApis: readonly string[];
  transitiveBlocker?: string;
  nextBulk: boolean;
  hostedBy?: HostedTestSuiteId;
  includedIn?: readonly HostedTestSuiteId[];
}>;

function hosted(suite: string, cases: number, runner: string): HostedMigrationInventoryEntry {
  return Object.freeze({ suite, cases, runner, classification: "HOSTED", browserApis: [], nextBulk: false, hostedBy: "node/all", includedIn: Object.freeze(["node/all", "hosted/all"] as const) });
}

function dom(suite: string, cases: number | undefined, runner: string, browserApis: readonly string[], transitiveBlocker = "DOMParser-backed LiveTree/transform construction"): HostedMigrationInventoryEntry {
  return Object.freeze({ suite, cases, runner, classification: "DOM_REQUIRED", browserApis: Object.freeze([...browserApis]), transitiveBlocker, nextBulk: false });
}

const LIVETREE_DOM_APIS = Object.freeze([
  "DOMParser", "document", "HTMLElement", "Element", "SVGElement", "selectors", "serialization",
  "events", "getComputedStyle", "getBoundingClientRect", "ResizeObserver", "canvas",
]);

const NODE_HOSTED_SUITES: readonly HostedMigrationInventoryEntry[] = Object.freeze([
  hosted("livemap/editor", 15, "all_node_safe_hosted_test_suites"),
  hosted("livemap/core", 65, "all_node_safe_hosted_test_suites"),
  hosted("livemap/feed", 18, "all_node_safe_hosted_test_suites"),
  hosted("livemap/path", 20, "all_node_safe_hosted_test_suites"),
  hosted("livemap/link", 34, "all_node_safe_hosted_test_suites"),
  hosted("livemap/handle", 101, "all_node_safe_hosted_test_suites"),
  hosted("livemap/guard", 14, "all_node_safe_hosted_test_suites"),
  hosted("livemap/handle/level-2", 102, "all_node_safe_hosted_test_suites"),
  hosted("livemap/proxy", 67, "all_node_safe_hosted_test_suites"),
  hosted("livemap/schema", 100, "all_node_safe_hosted_test_suites"),
  hosted("livemap/api", 19, "all_node_safe_hosted_test_suites"),
  hosted("livemap/store", 33, "all_node_safe_hosted_test_suites"),
  hosted("livemap/batch", 13, "all_node_safe_hosted_test_suites"),
  hosted("livemap/editor-contract", 8, "all_node_safe_hosted_test_suites"),
  hosted("livemap/schema-contract", 8, "all_node_safe_hosted_test_suites"),
  hosted("livemap/object-exact", 3, "all_node_safe_hosted_test_suites"),
  hosted("livemap/link-contract", 8, "all_node_safe_hosted_test_suites"),
  hosted("livemap/bridge", 20, "all_node_safe_hosted_test_suites"),
  hosted("livemap/misc", 44, "all_node_safe_hosted_test_suites"),
  hosted("livemap/path-handle", 8, "all_node_safe_hosted_test_suites"),
  hosted("livemap/schema-errors", 14, "all_node_safe_hosted_test_suites"),
  hosted("livemap/rev", 25, "all_node_safe_hosted_test_suites"),
  hosted("livemap/replay", 45, "all_node_safe_hosted_test_suites"),
  hosted("livehost/protocol", 33, "all_node_safe_hosted_test_suites"),
  hosted("livehost/core", 23, "all_node_safe_hosted_test_suites"),
  hosted("livehost/socket", 18, "all_node_safe_hosted_test_suites"),
  hosted("livehost/session-lifecycle", 11, "all_node_safe_hosted_test_suites"),
  hosted("livehost/host-disposal", 6, "all_node_safe_hosted_test_suites"),
  hosted("livehost/sync", 9, "all_node_safe_hosted_test_suites"),
  hosted("livehost/client", 28, "all_node_safe_hosted_test_suites"),
  hosted("livehost/pair", 17, "all_node_safe_hosted_test_suites"),
  hosted("livehost/resume", 10, "all_node_safe_hosted_test_suites"),
  hosted("livehost/store", 12, "all_node_safe_hosted_test_suites"),
  hosted("livehost/api", 17, "all_node_safe_hosted_test_suites"),
  hosted("unit/css", 25, "all_node_safe_hosted_test_suites"),
  hosted("unit/internals", 17, "all_node_safe_hosted_test_suites"),
  hosted("unit/internals-2", 10, "all_node_safe_hosted_test_suites"),
  hosted("unit/css-manager", 10, "all_node_safe_hosted_test_suites"),
  hosted("unit/css/more", 11, "all_node_safe_hosted_test_suites"),
  hosted("unit/parser-helpers", 15, "all_node_safe_hosted_test_suites"),
  hosted("unit/css/pseudo-unification", 5, "all_node_safe_hosted_test_suites"),
  hosted("unit/media", 6, "all_node_safe_hosted_test_suites"),
  hosted("unit/test-harness", 2, "all_node_safe_hosted_test_suites"),
]);

export const HOST_READY_SUITES: readonly HostedMigrationInventoryEntry[] = Object.freeze([]);

const DECLARED_DOM_REQUIRED_SUITES: readonly HostedMigrationInventoryEntry[] = Object.freeze([
  dom("livemap/node-internals", 37, "all_livemap_suites", ["DOMParser"]),
  dom("livemap/bridge-livetree", 29, "all_livemap_suites", ["DOMParser"]),
  dom("livemap/bridge-livetree-controls", 11, "all_livemap_suites", ["DOMParser", "HTMLElement", "events"]),
  dom("livemap/schema-controls", 8, "all_livemap_suites", ["DOMParser", "HTMLElement", "events"]),
  dom("livemap/schema-validation-controls", 3, "all_livemap_suites", ["DOMParser", "HTMLElement", "events"]),
  dom("livemap/bind", 19, "all_livemap_suites", ["DOMParser", "HTMLElement"]),
  dom("livemap/document-foundation", 6, "all_livemap_suites", ["DOMParser", "DOMPurify"]),
  ...[
    ["livetree/find",2],["livetree/attrs-and-flags",2],["livetree/append-and-create",9],["livetree/mixed-regression",7],
    ["livetree/extra cases",6],["livetree/coverage-css-and-content",5],["livetree/regressions/graft",3],["livetree/regressions/css",6],
    ["livetree/legacy-attrs-flags",2],["livetree/legacy-empty-append",2],["livetree/legacy-dataset",2],["livetree/identity-stability",4],
    ["livetree/legacy-css-value-selection",3],["livetree/final-legacy-css-empty",1],["livetree/more-dataset",7],["livetree/more-css",3],
    ["livetree/more-find",3],["livetree/scheduling-and-events",6],["livetree/css-manager-lifecycle",6],["livetree/node-lifecycle",6],
    ["livetree/listeners-teardown",7],["livetree/root-multi-isolation",6],["livetree/document-question",9],["livetree/error-handling",9],
    ["livetree/roundtrip-projection",7],["livetree/sync-perf",8],["livetree/completionist",4],["livetree/svg/basic",24],
    ["livetree/svg/intermediate",38],["livetree/svg/gnarly",5],["livetree/css-pseudo",4],["livetree/document",12],
    ["livetree/recent-api",10],["livetree/create-size",10],["livetree/listener-cleanup",6],["livetree/new-svg/",6],
    ["livetree/form",10],["livetree/canvas",10],["livetree/canvas-stress",12],["livetree/canvas-display",18],
    ["livetree/canvas-clear",5],["livetree/canvas-plot",9],["livetree/canvas-pointer",15],["livetree/document-ownership",7],
    ["livetree/css-surface-accessors",9],["livetree/css-refinements",12],["livetree/new-css-vars-get-sel",5],["livetree/more-find-findall",7],
    ["livetree-18/treeselector-surface",12],["livetree/css-pseudo-selector-unification",9],["livetree/css-var-facade-surfaces",10],["livetree/get-many-surface",12],
    ["livetree/animation-identifier-preservation",7],["livetree/dom-contains-surface",6],["livetree/listen-api-surface",10],["livetree/quid-scoped-media",6],
    ["livetree/construction-parity",8],["livetree/find-query-surface",16],["livetree/text-content-surface",14],["livetree/listener-builder-corners",14],
    ["livetree/dom-helper-surface",10],["livetree/graph-dom-markup-surface",8],["livetree/regression-2",11],["livetree/quid-level-2",7],
  ].map(([suite, cases]) => dom(String(suite), Number(cases), "all_livetree_suites", LIVETREE_DOM_APIS)),
  dom("transform/json/basic-test", 8, "all_test_suites(transform)", ["DOMParser"]),
  dom("transform/fuzz-json/seed_<startup-seed>", 50, "all_test_suites(transform)", ["DOMParser"]),
  dom("transform/legacy/json", 29, "all_test_suites(transform|legacy)", ["DOMParser"]),
  dom("transform/legacy/html", 88, "all_test_suites(transform|legacy)", ["DOMParser", "document", "serialization"]),
  dom("transform/html/new", 126, "all_test_suites(transform)", ["DOMParser", "document", "serialization"]),
  dom("transform/misc-extra", 9, "all_test_suites(transform)", ["DOMParser"]),
  dom("transform/hson", 19, "all_test_suites(transform)", ["DOMParser"]),
  dom("transform/json/level-2", 42, "all_test_suites(transform)", ["DOMParser"]),
  dom("transform/_INVALID", 10, "all_test_suites(transform)", ["DOMParser"], "Expected-failure cases currently pass under Node for the wrong reason: missing DOMParser"),
  dom("transform/hson/_INVALID", 31, "all_test_suites(transform)", ["DOMParser"], "Expected-failure cases currently pass under Node for the wrong reason: missing DOMParser"),
  dom("generated/json/seed_<run-seed>", 200, "all_test_suites(fuzz-json)", ["DOMParser"]),
]);

const JSDOM_HOSTED_IDS = new Set<string>(JSDOM_HOSTED_TEST_SUITE_IDS);
const CANVAS_HOSTED_IDS = new Set<string>(JSDOM_HOSTED_CANVAS_SUITE_IDS);

export const HOSTED_SUITES: readonly HostedMigrationInventoryEntry[] = Object.freeze([
  ...NODE_HOSTED_SUITES,
  ...all_jsdom_hosted_test_suites().map((suite) => Object.freeze({
    suite: suite.suite,
    cases: suite.cases.length,
    runner: "run_jsdom_hosted_test_suites",
    classification: "HOSTED" as const,
    browserApis: Object.freeze(["DOMParser", "document"]),
    nextBulk: false,
    hostedBy: "dom/core" as const,
    includedIn: Object.freeze(["dom/core", "hosted/all"] as const),
  })),
  ...all_jsdom_hosted_canvas_suites().map((suite) => Object.freeze({
    suite: suite.suite,
    cases: suite.cases.length,
    runner: "run_jsdom_hosted_canvas_suites",
    classification: "HOSTED" as const,
    browserApis: Object.freeze(["HTMLCanvasElement", "CanvasRenderingContext2D", "getBoundingClientRect", "ResizeObserver"]),
    nextBulk: false,
    hostedBy: "canvas/core" as const,
    includedIn: Object.freeze(["canvas/core", "hosted/all"] as const),
  })),
]);

export const DOM_REQUIRED_SUITES: readonly HostedMigrationInventoryEntry[] = Object.freeze(
  [
    ...DECLARED_DOM_REQUIRED_SUITES.filter((entry) => (
      !JSDOM_HOSTED_IDS.has(entry.suite)
      && !CANVAS_HOSTED_IDS.has(entry.suite)
      && !entry.suite.startsWith("transform/fuzz-json/")
      && !entry.suite.startsWith("generated/json/")
    )),
    dom(
      "livetree/canvas-clear::pixel-output",
      2,
      "all_livetree_suites",
      ["CanvasRenderingContext2D", "getImageData", "pixel rasterization"],
      "requires raster readback after fillRect and clearRect",
    ),
    dom(
      "livetree/canvas-plot::pixel-output",
      2,
      "all_livetree_suites",
      ["CanvasRenderingContext2D", "getImageData", "pixel rasterization"],
      "requires raster readback after plot callbacks",
    ),
  ],
);

export const UNKNOWN_OR_MIXED_SUITES: readonly HostedMigrationInventoryEntry[] = Object.freeze([]);

export const HOSTED_TEST_MIGRATION_INVENTORY = Object.freeze([
  ...HOSTED_SUITES,
  ...HOST_READY_SUITES,
  ...DOM_REQUIRED_SUITES,
  ...UNKNOWN_OR_MIXED_SUITES,
]);
