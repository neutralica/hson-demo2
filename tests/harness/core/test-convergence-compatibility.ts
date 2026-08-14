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
    adapter: "caseBatches, suites, and externalResults remain beside normalized seeded suiteRuns",
    deletionGate: "Phase 2 Inspector/Logger/report consumers project normalized SuiteRun/CaseRun state exclusively",
  }),
  Object.freeze({
    id: "legacy-suite-routes",
    adapter: "tests.run and category/* routes remain available beside exact canonical selection",
    deletionGate: "Phase 4 legacy-route retirement removes every non-exact selector transport consumer",
  }),
]);
