import { all_livetree_suites } from "../../../suites/livetree/suite-registry";
import {
  all_jsdom_hosted_test_suites,
  JSDOM_HOSTED_DEFERRED_CASE_KEYS,
} from "./jsdom-hosted-test-suites";
import {
  all_jsdom_hosted_canvas_suites,
  JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS,
} from "./canvas/jsdom-hosted-canvas-suites";

export type HostedDomMigrationStatus =
  | "JSDOM_READY"
  | "SHIM_READY"
  | "LAYOUT_REQUIRED"
  | "CANVAS_REQUIRED"
  | "BROWSER_ONLY"
  | "UNKNOWN";

export type HostedDomMigrationEntry = Readonly<{
  suite: string;
  cases: number;
  status: HostedDomMigrationStatus;
  requirement: string;
  hosted: boolean;
}>;

const SHIM_SUITES = new Set([
  "livetree/dom-contains-surface",
  "livetree/listen-api-surface",
  "livetree/append-and-create",
  "livetree/regressions/css",
  "livetree/scheduling-and-events",
  "livetree/svg/intermediate",
  "transform/legacy/html",
  "transform/html/new",
  "livetree/coverage-css-and-content",
  "livetree/document",
  "livetree/create-size",
  "livetree/new-svg/",
  "livetree/graph-dom-markup-surface",
  "livetree/construction-parity",
]);

export type HostedDomLayoutCaseStatus =
  | "MIGRATED_NATIVE"
  | "MIGRATED_RECT_INJECTION"
  | "MIGRATED_OBSERVER_SHIM"
  | "MIGRATED_SVG_INJECTION"
  | "DEFERRED_REAL_LAYOUT";

export type HostedDomLayoutCaseEntry = Readonly<{
  suite: string;
  name: string;
  status: HostedDomLayoutCaseStatus;
  requirement: string;
}>;

export type HostedCanvasMigrationStatus =
  | "MIGRATED_ELEMENT_ONLY"
  | "MIGRATED_COMMAND_RECORDER"
  | "MIGRATED_STATE_RECORDER"
  | "MIGRATED_POINTER_INJECTION"
  | "DEFERRED_PIXEL_OUTPUT"
  | "DEFERRED_IMAGE_LOADING"
  | "DEFERRED_TEXT_MEASUREMENT"
  | "DEFERRED_REAL_LAYOUT"
  | "DEFERRED_NATIVE_CANVAS"
  | "UNKNOWN";

export type HostedCanvasMigrationEntry = Readonly<{
  suite: string;
  name: string;
  sourceIndex: number;
  duplicateDeclaration: boolean;
  status: HostedCanvasMigrationStatus;
  requirement: string;
}>;

const CANVAS_SUITE_IDS = new Set([
  "livetree/canvas", "livetree/canvas-stress", "livetree/canvas-display",
  "livetree/canvas-clear", "livetree/canvas-plot", "livetree/canvas-pointer",
]);
const CANVAS_DEFERRED_PIXEL_KEYS = new Set<string>(JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS);
const CANVAS_COMMAND_RECORDER_KEYS = new Set([
  "livetree/canvas::canvas ctx2d returns 2d context when mounted",
  "livetree/canvas-stress::canvas must.ctx2d returns context when mounted",
  "livetree/canvas-stress::canvas ctx2d accepts context settings",
  "livetree/canvas-clear::canvas.clear returns tree for chaining",
  "livetree/canvas-plot::canvas.plot returns tree for chaining",
  "livetree/canvas-plot::canvas.must.plot returns tree for chaining",
  "livetree/canvas-plot::canvas.plot accepts context settings",
]);
const CANVAS_STATE_RECORDER_KEYS = new Set([
  "livetree/canvas-display::canvas.display.match sets bitmap attrs from display size",
  "livetree/canvas-display::canvas.display.match returns tree for chaining",
  "livetree/canvas-display::canvas.display.match.watch removed node does not keep matching after detach",
]);
const canvasSuites = all_livetree_suites().filter((suite) => CANVAS_SUITE_IDS.has(suite.suite));

export const HOSTED_CANVAS_MIGRATION_CASES: readonly HostedCanvasMigrationEntry[] = Object.freeze(
  canvasSuites.flatMap((suite) => {
    const seen = new Set<string>();
    return suite.cases.map((testCase, sourceIndex) => {
      const key = `${suite.suite}::${testCase.name}`;
      const duplicateDeclaration = seen.has(key);
      seen.add(key);
      if (CANVAS_DEFERRED_PIXEL_KEYS.has(key)) return Object.freeze({
        suite: suite.suite, name: testCase.name, sourceIndex, duplicateDeclaration,
        status: "DEFERRED_PIXEL_OUTPUT" as const,
        requirement: "getImageData raster readback",
      });
      if (suite.suite === "livetree/canvas-pointer") return Object.freeze({
        suite: suite.suite, name: testCase.name, sourceIndex, duplicateDeclaration,
        status: "MIGRATED_POINTER_INJECTION" as const,
        requirement: "explicit hosted rectangle and deterministic ResizeObserver notification where applicable",
      });
      if (CANVAS_STATE_RECORDER_KEYS.has(key)) return Object.freeze({
        suite: suite.suite, name: testCase.name, sourceIndex, duplicateDeclaration,
        status: "MIGRATED_STATE_RECORDER" as const,
        requirement: "deterministic backing-size reset and 2D transform state",
      });
      if (CANVAS_COMMAND_RECORDER_KEYS.has(key)) return Object.freeze({
        suite: suite.suite, name: testCase.name, sourceIndex, duplicateDeclaration,
        status: "MIGRATED_COMMAND_RECORDER" as const,
        requirement: "stable 2D context and deterministic command dispatch without rasterization",
      });
      return Object.freeze({
        suite: suite.suite, name: testCase.name, sourceIndex, duplicateDeclaration,
        status: "MIGRATED_ELEMENT_ONLY" as const,
        requirement: "canvas element, attributes, lifecycle, or explicit display rectangle only",
      });
    });
  }),
);

const LAYOUT_SUITE_IDS = Object.freeze([
  "livetree/coverage-css-and-content", "livetree/css-pseudo", "livetree/document",
  "livetree/create-size", "livetree/new-svg/", "livetree-18/treeselector-surface",
  "livetree/graph-dom-markup-surface",
] as const);
const RECT_INJECTION_CASES = new Set([
  "livetree/coverage-css-and-content::CssManager: emitted QUID CSS coexists with registered hosted geometry",
  "livetree/document::dom.doc: point queries resolve mounted target tree",
  "livetree/document::dom.doc: elementsFromPoint returns a stack",
  "livetree/create-size::dom.clientSize: mounted html element returns size",
]);
const SVG_INJECTION_CASES = new Set([
  "livetree/new-svg/::svg bbox returns mounted geometry",
  "livetree/graph-dom-markup-surface::svg bbox is mounted renderer-backed",
]);
const DEFERRED_LAYOUT_CASES = new Set<string>(JSDOM_HOSTED_DEFERRED_CASE_KEYS);

const layoutSuitesById = new Map(all_livetree_suites().map((suite) => [suite.suite, suite]));
export const HOSTED_DOM_LAYOUT_CASES: readonly HostedDomLayoutCaseEntry[] = Object.freeze(
  LAYOUT_SUITE_IDS.flatMap((suiteId) => {
    const suite = layoutSuitesById.get(suiteId);
    if (suite === undefined) throw new Error(`Missing layout inventory suite: ${suiteId}`);
    return suite.cases.map((testCase) => {
      const key = `${suiteId}::${testCase.name}`;
      if (DEFERRED_LAYOUT_CASES.has(key)) return Object.freeze({
        suite: suiteId,
        name: testCase.name,
        status: "DEFERRED_REAL_LAYOUT" as const,
        requirement: "rendered pseudo-element computed-style content",
      });
      if (RECT_INJECTION_CASES.has(key)) return Object.freeze({
        suite: suiteId,
        name: testCase.name,
        status: "MIGRATED_RECT_INJECTION" as const,
        requirement: "explicit registered rectangle, client size, or deterministic point hit",
      });
      if (SVG_INJECTION_CASES.has(key)) return Object.freeze({
        suite: suiteId,
        name: testCase.name,
        status: "MIGRATED_SVG_INJECTION" as const,
        requirement: "explicit registered SVG bounding box",
      });
      return Object.freeze({
        suite: suiteId,
        name: testCase.name,
        status: "MIGRATED_NATIVE" as const,
        requirement: "jsdom DOM/CSS state without rendered layout",
      });
    });
  }),
);

export const HOSTED_JSDOM_SUITES: readonly HostedDomMigrationEntry[] = Object.freeze(
  all_jsdom_hosted_test_suites().map((suite) => Object.freeze({
    suite: suite.suite,
    cases: suite.cases.length,
    status: SHIM_SUITES.has(suite.suite) ? "SHIM_READY" as const : "JSDOM_READY" as const,
    requirement: SHIM_SUITES.has(suite.suite)
      ? "narrow runtime-bound sanitizer, PointerEvent, RAF, CSS.supports, XML-parser diagnostic, or explicit geometry capability"
      : "jsdom parsing/tree/serialization/events; deterministic RAF runner scheduling",
    hosted: true,
  })),
);

export const HOSTED_CANVAS_SUITES: readonly HostedDomMigrationEntry[] = Object.freeze(
  all_jsdom_hosted_canvas_suites().map((suite) => Object.freeze({
    suite: suite.suite,
    cases: suite.cases.length,
    status: "SHIM_READY" as const,
    requirement: "Node-only deterministic 2D command/state recorder with explicit geometry and resize triggering",
    hosted: true,
  })),
);

function deferred(
  status: Exclude<HostedDomMigrationStatus, "JSDOM_READY" | "SHIM_READY">,
  requirement: string,
  entries: readonly Readonly<[string, number]>[],
): readonly HostedDomMigrationEntry[] {
  return Object.freeze(entries.map(([suite, cases]) => Object.freeze({ suite, cases, status, requirement, hosted: false })));
}

export const LAYOUT_REQUIRED_SUITES = deferred("LAYOUT_REQUIRED", "no rendered CSS application remains synthetic-owned", []);

export const CANVAS_REQUIRED_SUITES = deferred("CANVAS_REQUIRED", "pixel readback requires real rasterization", [
  ["livetree/canvas-clear::pixel-output", 2], ["livetree/canvas-plot::pixel-output", 2],
]);

export const BROWSER_ONLY_SUITES: readonly HostedDomMigrationEntry[] = deferred(
  "BROWSER_ONLY",
  "no runtime-bound deterministic DOM cases remain",
  [],
);

export const UNKNOWN_DOM_SUITES = deferred("UNKNOWN", "no unexplained deterministic DOM cases remain", [
]);

export const GENERATED_DOM_ENTRIES = Object.freeze([
  Object.freeze({ suite: "transform/fuzz-json/seed_<startup-seed>", cases: 50 }),
  Object.freeze({ suite: "generated/json/seed_<run-seed>", cases: 200 }),
]);

export const HOSTED_DOM_MIGRATION_INVENTORY = Object.freeze([
  ...HOSTED_JSDOM_SUITES,
  ...HOSTED_CANVAS_SUITES,
  ...LAYOUT_REQUIRED_SUITES,
  ...CANVAS_REQUIRED_SUITES,
  ...BROWSER_ONLY_SUITES,
  ...UNKNOWN_DOM_SUITES,
]);
