export type TestConvergenceCompatibilityBridge = Readonly<{
  id: string;
  adapter: string;
  deletionGate: string;
}>;

/** Finite Phase 1 boundary adapters. None is a canonical identity alias. */
export const PHASE1_TEST_COMPATIBILITY_BRIDGES: readonly TestConvergenceCompatibilityBridge[] = Object.freeze([
  Object.freeze({
    id: "hson-live-launcher-manifest",
    adapter: "launcherId/packageScript/runtime metadata is normalized to a semantic suite descriptor and retained as sourceRef/executor binding evidence",
    deletionGate: "hson-live publishes canonical suite descriptors with an executor binding that hson-demo2 can consume directly",
  }),
  Object.freeze({
    id: "discovery-external-targets",
    adapter: "Node discovery retains externalTargets beside the unified catalog.suites descriptor list",
    deletionGate: "opaque launcher execution can resolve sourceRef directly from catalog suite descriptors",
  }),
  Object.freeze({
    id: "selected-testids-wire-field",
    adapter: "tests.runSelected.testIds carries both canonical case IDs and opaque suite IDs",
    deletionGate: "the hosted selected-run wire protocol names the field selectionIds or transports a RunPlan directly",
  }),
  Object.freeze({
    id: "legacy-report-projections",
    adapter: "the normalized lifecycle reducer derives caseBatches, suites, and externalResults as temporary compatibility projections from SuiteRun/CaseRun authority",
    deletionGate: "Phase 2B Inspector/Logger/report consumers project normalized SuiteRun/CaseRun counts and evidence exclusively",
  }),
  Object.freeze({
    id: "legacy-suite-routes",
    adapter: "tests.run and category/* routes remain available beside exact canonical selection",
    deletionGate: "Phase 4 legacy-route retirement removes every non-exact selector transport consumer",
  }),
]);

export type Phase4ACompatibilityDisposition =
  | "KEEP THROUGH 4A"
  | "DELETE IN 4A"
  | "DELETE IN 4B"
  | "KEEP BECAUSE REAL CROSS-REPO BOUNDARY";

export type Phase4ACompatibilityBridge = TestConvergenceCompatibilityBridge & Readonly<{
  disposition: Phase4ACompatibilityDisposition;
}>;

/** Finite ownership inventory after Phase 4A. */
export const PHASE4A_TEST_COMPATIBILITY_BRIDGES: readonly Phase4ACompatibilityBridge[] = Object.freeze([
  Object.freeze({
    id: "hson-live-launcher-manifest",
    disposition: "KEEP BECAUSE REAL CROSS-REPO BOUNDARY",
    adapter: "hson-live launcher manifests are normalized to canonical descriptor and executor-binding evidence",
    deletionGate: "hson-live publishes directly consumable canonical descriptors with executor bindings",
  }),
  Object.freeze({
    id: "discovery-external-targets",
    disposition: "DELETE IN 4B",
    adapter: "discovery retains externalTargets beside catalog.suites",
    deletionGate: "opaque launcher execution resolves sourceRef directly from catalog suite descriptors",
  }),
  Object.freeze({
    id: "selected-testids-wire-field",
    disposition: "DELETE IN 4B",
    adapter: "tests.runSelected.testIds transports canonical case and opaque-suite IDs",
    deletionGate: "the wire carries selectionIds or a RunPlan directly",
  }),
  Object.freeze({
    id: "legacy-case-batches",
    disposition: "DELETE IN 4B",
    adapter: "report caseBatches remains an incremental legacy compact-case projection",
    deletionGate: "all report consumers project normalized suiteRuns/cases incrementally",
  }),
  Object.freeze({
    id: "legacy-suite-timings",
    disposition: "DELETE IN 4B",
    adapter: "report suites remains the legacy suite-timing projection",
    deletionGate: "all timing consumers read normalized suiteRuns",
  }),
  Object.freeze({
    id: "legacy-external-results",
    disposition: "DELETE IN 4B",
    adapter: "report externalResults remains the legacy opaque-launcher projection",
    deletionGate: "all opaque presentation reads normalized suiteRuns evidence and counts",
  }),
  Object.freeze({
    id: "legacy-summary-fallback",
    disposition: "DELETE IN 4B",
    adapter: "presentation retains summary fallback for unplanned legacy reports",
    deletionGate: "legacy unplanned report routes are retired",
  }),
  Object.freeze({
    id: "legacy-raw-external-serialization",
    disposition: "DELETE IN 4B",
    adapter: "copy-report serialization retains legacy raw externalResults output",
    deletionGate: "opaque report serialization reads normalized evidence exclusively",
  }),
  Object.freeze({
    id: "legacy-suite-category-routes",
    disposition: "DELETE IN 4B",
    adapter: "tests.run and aggregate/category routes remain available for older clients",
    deletionGate: "all non-exact selector transport consumers are retired",
  }),
  Object.freeze({
    id: "legacy-prefix-presentation-grouping",
    disposition: "DELETE IN 4B",
    adapter: "unplanned legacy routes still infer presentation groups from suite ID prefixes",
    deletionGate: "all reports carry normalized RunPlan subject/collection identity",
  }),
  Object.freeze({
    id: "plain-run-id-recovery",
    disposition: "DELETE IN 4B",
    adapter: "session recovery accepts a plain run ID without attempt identity",
    deletionGate: "every persisted recovery identity carries runId and attemptId",
  }),
  Object.freeze({
    id: "dom-quid-case-action-lookup",
    disposition: "DELETE IN 4A",
    adapter: "delegated case actions previously rediscovered a LiveTree from hson:quid",
    deletionGate: "application-owned canonical case/action handles route every materialized control",
  }),
  Object.freeze({
    id: "legacy-panel-event-router-overload",
    disposition: "DELETE IN 4A",
    adapter: "the production panel adapter previously accepted the deprecated event-router test client",
    deletionGate: "production panel construction uses only the hosted runtime/recovery boundary",
  }),
]);
