import { HOSTED_TEST_SUITE_IDS, HOSTED_TEST_VISIBLE_SUITES, type HostedTestSuiteId } from "./hosted-test-suite";

export const TEST_SURFACE_CATEGORIES = [
  "Transforms", "LiveTree", "LiveMap", "LiveHost", "LiveInspector", "Hosted Runtime", "Real WebSocket", "Build / Types",
] as const;

export type TestSurfaceCategory = typeof TEST_SURFACE_CATEGORIES[number];
export type TestClassification = "fixture" | "library acceptance" | "runtime integration" | "real transport integration" | "build/typecheck certification" | "temporary diagnostic" | "obsolete";
export type TestCatalogStatus = "available" | "skipped" | "unavailable" | "migration-required";

export type TestSurfaceCatalogEntry = Readonly<{
  id: string;
  label: string;
  category: TestSurfaceCategory;
  repository: "hson-live" | "hson-demo2";
  path: string;
  behavior: string;
  classification: TestClassification;
  environment: string;
  transport: string;
  runner: string;
  hostedSuiteId?: HostedTestSuiteId;
  appearsInHostedUi: boolean;
  status: TestCatalogStatus;
}>;

const DEMO_TEST_SCRIPTS = Object.freeze({
  "test:replay-node": "src/tests/livemap/run-replay-suite.node.mts",
  "test:liveproject-keyed-node": "src/tests/liveproject/run-keyed-projection.node.mts",
  "test:liveinspect-node": "src/tests/liveinspect/run-live-inspector.node.mts",
  "test:liveinspect-scaling-node": "src/tests/liveinspect/run-live-inspector-scaling.node.mts",
  "test:liveinspect-materialization-node": "src/tests/liveinspect/run-live-inspector-materialization.node.mts",
  "test:hosted-replay-node": "src/tests/livehost/run-hosted-replay-action.node.mts",
  "test:hosted-report-node": "src/tests/livehost/run-hosted-test-report.node.mts",
  "test:hosted-report-wire-node": "src/tests/livehost/run-hosted-test-report-wire.node.mts",
  "test:hosted-report-protocol-node": "src/tests/livehost/run-hosted-test-report-protocol.node.mts",
  "test:hosted-report-initial-node": "src/tests/livehost/run-hosted-test-report-initial.node.mts",
  "test:hosted-report-mirror-node": "src/tests/livehost/run-hosted-test-report-mirror.node.mts",
  "test:hosted-report-router-node": "src/tests/livehost/run-hosted-test-report-router.node.mts",
  "test:hosted-replay-router-node": "src/tests/livehost/run-hosted-replay-router.node.mts",
  "test:hosted-test-panel-adapter-node": "src/tests/livehost/run-hosted-test-panel-adapter.node.mts",
  "test:hosted-test-panel-projection-node": "src/tests/livehost/run-hosted-test-panel-projection.node.mts",
  "test:hosted-test-inspector-parity-node": "src/tests/livehost/run-hosted-test-inspector-parity.node.mts",
  "test:hosted-suite-registry-node": "src/tests/livehost/run-hosted-suite-registry.node.mts",
  "test:hosted-node-all-node": "src/tests/livehost/run-hosted-node-all.node.mts",
  "test:hosted-report-batch-node": "src/tests/livehost/run-hosted-test-report-batch.node.mts",
  "test:hosted-report-performance-node": "src/tests/livehost/run-hosted-report-performance.node.mts",
  "test:hosted-real-websocket-node": "src/tests/livehost/run-hosted-real-websocket.node.mts",
  "test:hosted-generic-livehost-node": "src/tests/livehost/run-hosted-generic-livehost.node.mts",
  "test:hosted-websocket-lifecycle-node": "src/tests/livehost/run-hosted-websocket-lifecycle.node.mts",
  "test:hosted-jsdom-runtime-node": "src/tests/livehost/run-hosted-jsdom-runtime.node.mts",
  "test:hosted-dom-collection-node": "src/tests/livehost/run-hosted-dom-collection.node.mts",
  "test:hosted-dom-compatibility-node": "src/tests/livehost/run-hosted-dom-compatibility.node.mts",
  "test:hosted-dom-real-websocket-node": "src/tests/livehost/run-hosted-dom-real-websocket.node.mts",
  "test:hosted-stale-suite-real-websocket-node": "src/tests/livehost/run-hosted-stale-suite-real-websocket.node.mts",
  "test:hosted-dom-behavior-diagnostics-node": "src/tests/livehost/run-hosted-dom-behavior-diagnostics.node.mts",
  "test:hosted-dom-layout-diagnostics-node": "src/tests/livehost/run-hosted-dom-layout-diagnostics.node.mts",
  "test:hosted-sanitizer-node": "src/tests/livehost/run-hosted-sanitizer.node.mts",
  "test:hosted-canvas-runtime-node": "src/tests/livehost/run-hosted-canvas-runtime.node.mts",
  "test:hosted-canvas-collection-node": "src/tests/livehost/run-hosted-canvas-collection.node.mts",
  "test:hosted-canvas-real-websocket-node": "src/tests/livehost/run-hosted-canvas-real-websocket.node.mts",
  "test:hosted-all-real-websocket-node": "src/tests/livehost/run-hosted-all-real-websocket.node.mts",
  "test:hosted-case-inspection-node": "src/tests/livehost/run-hosted-case-inspection.node.mts",
  "test:hosted-test-timing-node": "src/tests/livehost/run-hosted-test-timing.node.mts",
  "test:hosted-multi-suite-concurrent-node": "src/tests/livehost/run-hosted-multi-suite-concurrent.node.mts",
  "test:hosted-app-boundary-node": "src/tests/livehost/run-hosted-app-boundary.node.mts",
  "test:hosted-run-identity-node": "src/tests/livehost/run-hosted-run-identity.node.mts",
  "test:hosted-retry-classification-node": "src/tests/livehost/run-hosted-retry-classification.node.mts",
  "test:livetree-lifecycle-foundations-node": "src/tests/livehost/run-livetree-lifecycle-foundations.node.mts",
  "test:livetree-lifecycle-public-node": "src/tests/livehost/run-livetree-lifecycle-public.node.mts",
  "test:livetree-lifecycle-ownership-node": "src/tests/livehost/run-livetree-lifecycle-ownership.node.mts",
  "test:livetree-allocation-node": "src/tests/livehost/run-livetree-allocation.node.mts",
  "test:hson-node-representation-node": "src/tests/livehost/run-hson-node-representation.node.mts",
  "test:generated-json-node": "src/tests/diagnostics/run-generated-json.node.mts",
  "test:hosted-replay-events-node": "src/tests/livehost/run-hosted-replay-events.node.mts",
  "test:hosted-replay-concurrent-node": "src/tests/livehost/run-hosted-replay-concurrent.node.mts",
  "test:amoebi-geometry": "src/app/demos/amoeba/amoebi-geometry.test.mts",
  "test:surface-enumeration-node": "src/tests/test-surface/run-test-surface-enumeration.node.mts",
} as const);

function category_for(name: string): TestSurfaceCategory {
  if (name.includes("real-websocket") || name.includes("websocket-lifecycle")) return "Real WebSocket";
  if (name.includes("liveinspect") || name.includes("inspector-parity")) return "LiveInspector";
  if (name.includes("livetree") || name.includes("node-representation")) return "LiveTree";
  if (name.includes("replay") || name.includes("liveproject")) return "LiveMap";
  if (name.includes("generated-json")) return "Transforms";
  if (name.includes("surface-enumeration")) return "Build / Types";
  return name.includes("hosted") ? "Hosted Runtime" : "LiveHost";
}

function demo_entry([name, path]: readonly [string, string]): TestSurfaceCatalogEntry {
  const diagnostic = name.includes("diagnostics");
  const realSocket = category_for(name) === "Real WebSocket";
  const jsdom = name.includes("dom-") || name.includes("jsdom");
  return Object.freeze({
    id: `hson-demo2:${name}`,
    label: name.replace(/^test:/, "").replaceAll("-node", "").replaceAll("-", " "),
    category: category_for(name), repository: "hson-demo2", path,
    behavior: `Permanent ${name} contract declared by hson-demo2/package.json.`,
    classification: diagnostic ? "temporary diagnostic" : realSocket ? "real transport integration" : "runtime integration",
    environment: jsdom ? "Node + jsdom" : "Node", transport: realSocket ? "real WebSocket" : name.includes("hosted") ? "in-memory / local runtime" : "none",
    runner: `npm run ${name}`, appearsInHostedUi: true, status: "available",
  });
}

const LIVE_RUNNERS: readonly (readonly [string, string, TestClassification])[] = [
  ["build", "tsc production emit", "build/typecheck certification"],
  ["check", "strict no-emit typecheck", "build/typecheck certification"],
  ["test:livehost-recovery", "server recovery and replay", "library acceptance"],
  ["test:livehost-client-recovery", "client recovery lifecycle", "library acceptance"],
  ["test:livehost-session", "session identity and lifecycle", "library acceptance"],
  ["test:livehost-action-dedupe", "client/request identity, retry stability, and reload-safe defaults", "library acceptance"],
];

const LIVE_ENTRIES: readonly TestSurfaceCatalogEntry[] = LIVE_RUNNERS.map(([name, behavior, classification]) => Object.freeze({
  id: `hson-live:${name}`, label: name, category: name === "build" || name === "check" ? "Build / Types" : "LiveHost",
  repository: "hson-live", path: name.startsWith("test:") ? `tests/${name.slice(5)}.acceptance.mts` : "package.json",
  behavior, classification, environment: "Node", transport: name.includes("recovery") || name.includes("session") || name.includes("dedupe") ? "in-memory socket" : "none",
  runner: `npm run ${name}`, appearsInHostedUi: true, status: "available",
}) as TestSurfaceCatalogEntry);

const visibleLabelById = new Map<HostedTestSuiteId, string>(HOSTED_TEST_VISIBLE_SUITES.map((suite) => [suite.id, suite.label]));
const HOSTED_ENTRIES = HOSTED_TEST_SUITE_IDS.map((suiteId): TestSurfaceCatalogEntry => Object.freeze({
  id: `hosted-suite:${suiteId}`, label: visibleLabelById.get(suiteId) ?? suiteId,
  category: suiteId.includes("livetree") ? "LiveTree" : suiteId.includes("livemap") ? "LiveMap" : suiteId.includes("transform") ? "Transforms" : suiteId.includes("livehost") ? "LiveHost" : "Hosted Runtime",
  repository: "hson-demo2", path: "src/hosted-test/registered-hosted-test-suites.ts",
  behavior: `Hosted fixture collection ${suiteId}, reachable through a visible category or the all collection.`, classification: "fixture", environment: "browser or hosted Node",
  transport: "dedicated LiveHost report host", runner: "Hosted Tests UI", hostedSuiteId: suiteId, appearsInHostedUi: true, status: "available",
}));

const LIVE_IDENTITY_FIXTURE: TestSurfaceCatalogEntry = Object.freeze({
  id: "hson-live:fixture:default-identity-runtime", label: "default identity browser-runtime fixture", category: "LiveHost",
  repository: "hson-live", path: "tests/fixtures/livehost-default-identity-runtime.mts",
  behavior: "Separately initialized runtimes generate reload-safe default client and fresh action request identities.",
  classification: "fixture", environment: "separate Node processes modeling browser reloads", transport: "in-memory socket",
  runner: "npm run test:livehost-action-dedupe", appearsInHostedUi: true, status: "available",
});

const DEMO_CERTIFICATIONS: readonly TestSurfaceCatalogEntry[] = ["build", "check"].map((name): TestSurfaceCatalogEntry => Object.freeze({
  id: `hson-demo2:${name}`, label: name, category: "Build / Types", repository: "hson-demo2", path: "package.json",
  behavior: name === "build" ? "Production Vite build completes." : "Strict TypeScript no-emit check completes.",
  classification: "build/typecheck certification", environment: "Node", transport: "none", runner: `npm run ${name}`,
  appearsInHostedUi: true, status: "available",
}));

export const TEST_SURFACE_CATALOG = Object.freeze([
  ...HOSTED_ENTRIES,
  ...LIVE_ENTRIES,
  LIVE_IDENTITY_FIXTURE,
  ...DEMO_CERTIFICATIONS,
  ...Object.entries(DEMO_TEST_SCRIPTS).map(demo_entry),
]);

export const TEST_SURFACE_COMMAND_ENTRIES = Object.freeze(TEST_SURFACE_CATALOG.filter((entry) => entry.hostedSuiteId === undefined));
export const DECLARED_DEMO_TEST_SCRIPTS = Object.freeze(Object.keys(DEMO_TEST_SCRIPTS));
