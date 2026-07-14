import { all_jsdom_hosted_test_suites } from "./jsdom-hosted-test-suites";

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

const SHIM_SUITES = new Set(["livetree/dom-contains-surface", "livetree/listen-api-surface"]);

export const HOSTED_JSDOM_SUITES: readonly HostedDomMigrationEntry[] = Object.freeze(
  all_jsdom_hosted_test_suites().map((suite) => Object.freeze({
    suite: suite.suite,
    cases: suite.cases.length,
    status: SHIM_SUITES.has(suite.suite) ? "SHIM_READY" as const : "JSDOM_READY" as const,
    requirement: SHIM_SUITES.has(suite.suite)
      ? "PointerEvent construction/dispatch shim; deterministic RAF runner scheduling"
      : "jsdom parsing/tree/serialization/events; deterministic RAF runner scheduling",
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

export const LAYOUT_REQUIRED_SUITES = deferred("LAYOUT_REQUIRED", "computed pseudo-style, hit testing, dimensions, or SVG geometry", [
  ["livetree/coverage-css-and-content", 5], ["livetree/css-pseudo", 4], ["livetree/document", 12],
  ["livetree/create-size", 10], ["livetree/new-svg/", 6], ["livetree-18/treeselector-surface", 12],
  ["livetree/graph-dom-markup-surface", 8],
]);

export const CANVAS_REQUIRED_SUITES = deferred("CANVAS_REQUIRED", "2D context, bitmap state, display geometry, or pointer geometry", [
  ["livetree/canvas", 10], ["livetree/canvas-stress", 12], ["livetree/canvas-display", 18],
  ["livetree/canvas-clear", 5], ["livetree/canvas-plot", 9], ["livetree/canvas-pointer", 15],
]);

export const BROWSER_ONLY_SUITES: readonly HostedDomMigrationEntry[] = Object.freeze([]);

export const UNKNOWN_DOM_SUITES = deferred("UNKNOWN", "jsdom/browser semantic discrepancy requires a separate compatibility decision", [
  ["livetree/append-and-create", 9], ["livetree/regressions/css", 6], ["livetree/scheduling-and-events", 6],
  ["livetree/svg/intermediate", 38], ["livetree/document-ownership", 7], ["livetree/construction-parity", 8],
  ["transform/legacy/html", 88], ["transform/html/new", 125],
]);

export const GENERATED_DOM_ENTRIES = Object.freeze([
  Object.freeze({ suite: "transform/fuzz-json/seed_<startup-seed>", cases: 50 }),
  Object.freeze({ suite: "generated/json/seed_<run-seed>", cases: 200 }),
]);

export const HOSTED_DOM_MIGRATION_INVENTORY = Object.freeze([
  ...HOSTED_JSDOM_SUITES,
  ...LAYOUT_REQUIRED_SUITES,
  ...CANVAS_REQUIRED_SUITES,
  ...BROWSER_ONLY_SUITES,
  ...UNKNOWN_DOM_SUITES,
]);
