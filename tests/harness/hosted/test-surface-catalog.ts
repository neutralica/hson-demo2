import { HOSTED_TEST_SUITE_IDS, HOSTED_TEST_VISIBLE_SUITES, type HostedTestSuiteId } from "./hosted-test-suite";
import {
  HSON_LIVE_TEST_COMPLETION_REQUIREMENT,
  hson_live_non_launcher_test_scripts,
  hson_live_test_launchers,
  type HsonLiveTestLauncher,
} from "hson-live/test-launchers";

export const TEST_SURFACE_CATEGORIES = [
  "Transforms", "LiveTree", "LiveMap", "Reflect", "LiveHost", "LiveInspector", "Application / Demo", "Hosted Runtime", "Real WebSocket", "Build / Types",
] as const;

export type TestSurfaceCategory = typeof TEST_SURFACE_CATEGORIES[number];
export type TestClassification = "fixture" | "library acceptance" | "runtime integration" | "real transport integration" | "build/typecheck certification" | "temporary diagnostic" | "obsolete";
export type TestCatalogStatus = "available" | "skipped" | "unavailable" | "migration-required";
export type TestSurfaceRole =
  | "canonical selectable suite"
  | "external diagnostic launcher"
  | "aggregate verification command"
  | "integration journey"
  | "production artifact verification"
  | "developer utility";
export type TestSurfaceExposure = "hosted selectable" | "command only" | "explicitly excluded";
export type ExternalLauncherCatalogProjection = Readonly<{
  launcherId: string;
  packageScript: `test:${string}`;
  primarySubject: HsonLiveTestLauncher["subject"];
  executableChecks: number;
  runtime: HsonLiveTestLauncher["runtime"];
  completionRequirement: typeof HSON_LIVE_TEST_COMPLETION_REQUIREMENT;
  panelVisible: boolean;
  inclusiveEligible: boolean;
}>;

export type TestSurfaceCatalogEntry = Readonly<{
  id: string;
  label: string;
  category: TestSurfaceCategory;
  repository: "hson-live" | "hson-demo2";
  path: string;
  behavior: string;
  classification: TestClassification;
  role: TestSurfaceRole;
  exposure: TestSurfaceExposure;
  exclusionReason?: string;
  aliasOf?: string;
  environment: string;
  transport: string;
  runner: string;
  hostedSuiteId?: HostedTestSuiteId;
  externalLauncher?: ExternalLauncherCatalogProjection;
  appearsInHostedUi: boolean;
  status: TestCatalogStatus;
}>;

const DEMO_TEST_SCRIPTS = Object.freeze({
  "test:towl": "tests/runners/towl/run-towl-suites.node.mts",
  "test:towl-room": "tests/runners/towl/run-towl-room-suite.node.mts",
  "test:replay-node": "tests/runners/livemap/run-replay-suite.node.mts",
  "test:reflect-keyed-node": "tests/runners/reflect/run-keyed-projection.node.mts",
  "test:liveinspect-node": "tests/runners/liveinspect/run-live-inspector.node.mts",
  "test:liveinspect-scaling-node": "tests/runners/liveinspect/run-live-inspector-scaling.node.mts",
  "test:liveinspect-materialization-node": "tests/runners/liveinspect/run-live-inspector-materialization.node.mts",
  "test:hosted-replay-node": "tests/runners/livehost/run-hosted-replay-action.node.mts",
  "test:hosted-report-node": "tests/runners/livehost/run-hosted-test-report.node.mts",
  "test:hosted-report-wire-node": "tests/runners/livehost/run-hosted-test-report-wire.node.mts",
  "test:hosted-report-protocol-node": "tests/runners/livehost/run-hosted-test-report-protocol.node.mts",
  "test:hosted-report-initial-node": "tests/runners/livehost/run-hosted-test-report-initial.node.mts",
  "test:hosted-report-mirror-node": "tests/runners/livehost/run-hosted-test-report-mirror.node.mts",
  "test:hosted-report-router-node": "tests/runners/livehost/run-hosted-test-report-router.node.mts",
  "test:hosted-replay-router-node": "tests/runners/livehost/run-hosted-replay-router.node.mts",
  "test:hosted-test-panel-adapter-node": "tests/runners/livehost/run-hosted-test-panel-adapter.node.mts",
  "test:hosted-test-panel-projection-node": "tests/runners/livehost/run-hosted-test-panel-projection.node.mts",
  "test:hosted-suite-registry-node": "tests/runners/livehost/run-hosted-suite-registry.node.mts",
  "test:hosted-node-all-node": "tests/runners/livehost/run-hosted-node-all.node.mts",
  "test:hosted-report-batch-node": "tests/runners/livehost/run-hosted-test-report-batch.node.mts",
  "test:hosted-report-performance-node": "tests/runners/livehost/run-hosted-report-performance.node.mts",
  "test:hosted-real-websocket-node": "tests/runners/livehost/run-hosted-real-websocket.node.mts",
  "test:hosted-generic-livehost-node": "tests/runners/livehost/run-hosted-generic-livehost.node.mts",
  "test:hosted-websocket-lifecycle-node": "tests/runners/livehost/run-hosted-websocket-lifecycle.node.mts",
  "test:hosted-deployment-node": "tests/runners/livehost/run-hosted-deployment.node.mts",
  "test:node-application-host": "tests/runners/harness/run-canonical-tests.node.mts",
  "test:circuit-worker-service": "tests/runners/harness/run-canonical-tests.node.mts",
  "test:circuit-livehost-integration": "tests/runners/harness/run-canonical-tests.node.mts",
  "test:circuit-worker-parity": "tests/runners/harness/run-canonical-tests.node.mts",
  "test:parsing-verification-coordinator": "tests/runners/harness/run-canonical-tests.node.mts",
  "test:parsing-browser-certificate": "tests/runners/harness/run-canonical-tests.node.mts",
  "test:node-application-host-entry": "tests/runners/livehost/run-node-application-host-entry.node.mts",
  "test:livehost-bootstrap-integration": "tests/runners/livehost/run-livehost-bootstrap-integration.node.mts",
  "test:node-production-runtime": "tests/runners/livehost/run-node-production-runtime.node.mts",
  "test:hosted-cloudflare": "tests/integration/cloudflare/run-hosted-cloudflare.node.mts",
  "test:hosted-jsdom-runtime-node": "tests/runners/livehost/run-hosted-jsdom-runtime.node.mts",
  "test:hosted-dom-collection-node": "tests/runners/livehost/run-hosted-dom-collection.node.mts",
  "test:hosted-dom-compatibility-node": "tests/runners/livehost/run-hosted-dom-compatibility.node.mts",
  "test:hosted-dom-real-websocket-node": "tests/runners/livehost/run-hosted-dom-real-websocket.node.mts",
  "test:hosted-stale-suite-real-websocket-node": "tests/runners/livehost/run-hosted-stale-suite-real-websocket.node.mts",
  "test:hosted-dom-behavior-diagnostics-node": "tests/runners/livehost/run-hosted-dom-behavior-diagnostics.node.mts",
  "test:hosted-dom-layout-diagnostics-node": "tests/runners/livehost/run-hosted-dom-layout-diagnostics.node.mts",
  "test:hosted-sanitizer-node": "tests/runners/livehost/run-hosted-sanitizer.node.mts",
  "test:hosted-canvas-runtime-node": "tests/runners/livehost/run-hosted-canvas-runtime.node.mts",
  "test:hosted-canvas-collection-node": "tests/runners/livehost/run-hosted-canvas-collection.node.mts",
  "test:hosted-canvas-real-websocket-node": "tests/runners/livehost/run-hosted-canvas-real-websocket.node.mts",
  "test:hosted-all-real-websocket-node": "tests/runners/livehost/run-hosted-all-real-websocket.node.mts",
  "test:hosted-case-inspection-node": "tests/runners/livehost/run-hosted-case-inspection.node.mts",
  "test:hosted-test-timing-node": "tests/runners/livehost/run-hosted-test-timing.node.mts",
  "test:hosted-multi-suite-concurrent-node": "tests/runners/livehost/run-hosted-multi-suite-concurrent.node.mts",
  "test:hosted-app-boundary-node": "tests/runners/livehost/run-hosted-app-boundary.node.mts",
  "test:hosted-run-identity-node": "tests/runners/livehost/run-hosted-run-identity.node.mts",
  "test:hosted-retry-classification-node": "tests/runners/livehost/run-hosted-retry-classification.node.mts",
  "test:livetree-lifecycle-foundations-node": "tests/runners/livehost/run-livetree-lifecycle-foundations.node.mts",
  "test:livetree-lifecycle-public-node": "tests/runners/livehost/run-livetree-lifecycle-public.node.mts",
  "test:livetree-lifecycle-ownership-node": "tests/runners/livehost/run-livetree-lifecycle-ownership.node.mts",
  "test:livetree-allocation-node": "tests/runners/livehost/run-livetree-allocation.node.mts",
  "test:hson-node-representation-node": "tests/runners/livehost/run-hson-node-representation.node.mts",
  "test:generated-json-node": "tests/runners/diagnostics/run-generated-json.node.mts",
  "test:hosted-replay-events-node": "tests/runners/livehost/run-hosted-replay-events.node.mts",
  "test:hosted-replay-concurrent-node": "tests/runners/livehost/run-hosted-replay-concurrent.node.mts",
  "test:amoebi-geometry": "tests/runners/app/run-amoebi-geometry.node.mts",
  "test:soft-tile-node": "tests/runners/app/run-soft-tile.node.mts",
  "test:browser": "playwright.config.ts",
  "test:browser:headed": "playwright.config.ts",
  "test:browser:debug": "playwright.config.ts",
  "test:browser:install": "playwright.config.ts",
  "test:surface-enumeration-node": "tests/runners/harness/run-test-surface-enumeration.node.mts",
  "test:canonical-node": "tests/runners/harness/run-canonical-tests.node.mts",
  "test:stage2-contracts-node": "tests/runners/harness/run-stage-2-contracts.node.mts",
  "test:stage3-discovery-node": "tests/runners/harness/run-stage-3-discovery.node.mts",
  "test:stage4a-selected-node": "tests/runners/harness/run-stage-4a-selected.node.mts",
  "test:stage4a-selected-worker": "tests/integration/cloudflare/run-hosted-cloudflare.node.mts",
  "test:stage4b-panel-node": "tests/runners/harness/run-stage-4b-panel.node.mts",
  "test:stage5a-corpus-node": "tests/runners/harness/run-stage-5a-corpus.node.mts",
  "test:stage5b-dom-node": "tests/runners/harness/run-stage-5b-dom.node.mts",
  "test:stage5c-closeout-node": "tests/runners/harness/run-stage-5c-closeout.node.mts",
  "test:external-library-node": "tests/runners/harness/run-external-library-launchers.node.mts",
  "test:external-library-all-node": "tests/runners/harness/run-external-library-launchers.node.mts",
  "test:external-launcher-protocol-node": "tests/runners/harness/run-external-launcher-protocol.node.mts",
  "test:runner-truthfulness-node": "tests/runners/harness/run-test-runner-truthfulness.node.mts",
  "test:splash-lifecycle-node": "tests/runners/app/run-splash-lifecycle.node.mts",
  "test:inclusive-library-node": "tests/runners/harness/run-inclusive-library-verification.node.mts",
  "test:hosted-performance-node": "tests/runners/harness/run-hosted-test-performance.node.mts",
} as const);

const CANONICAL_COMMANDS = new Set(["test:canonical-node", "test:node-application-host"]);
const AGGREGATE_COMMANDS = new Set([
  "test:surface-enumeration-node",
  "test:stage2-contracts-node",
  "test:stage3-discovery-node",
  "test:stage4a-selected-node",
  "test:stage4a-selected-worker",
  "test:stage4b-panel-node",
  "test:stage5a-corpus-node",
  "test:stage5b-dom-node",
  "test:stage5c-closeout-node",
  "test:external-library-node",
  "test:external-library-all-node",
  "test:inclusive-library-node",
]);
const ARTIFACT_COMMANDS = new Set(["test:node-production-runtime"]);
const UTILITY_REASONS = Object.freeze({
  "test:browser:headed": "Interactive headed variant of the authoritative test:browser journey.",
  "test:browser:debug": "Interactive Playwright debugging variant; not a durable independent verification.",
  "test:browser:install": "Installs the browser runtime and executes no tests.",
  "test:hosted-dom-behavior-diagnostics-node": "Developer diagnostic output; durable DOM assertions live in canonical suites.",
  "test:hosted-dom-layout-diagnostics-node": "Developer layout diagnostic output; it is not a rendering certification.",
  "test:hosted-performance-node": "Developer performance matrix that repeatedly composes canonical and external inventories.",
} satisfies Readonly<Record<string, string>>);
const DEMO_ENVIRONMENT_OVERRIDES = Object.freeze({
  "test:node-application-host": Object.freeze({ environment: "Node", transport: "real HTTP + WebSocket" }),
  "test:node-application-host-entry": Object.freeze({ environment: "Node child process", transport: "real HTTP + WebSocket" }),
  "test:livehost-bootstrap-integration": Object.freeze({ environment: "Node", transport: "real HTTP + WebSocket" }),
  "test:node-production-runtime": Object.freeze({ environment: "built Node production artifact", transport: "real HTTP + WebSocket" }),
  "test:inclusive-library-node": Object.freeze({ environment: "Node + synthetic DOM + child processes", transport: "mixed canonical and external" }),
  "test:hosted-performance-node": Object.freeze({ environment: "Node child processes", transport: "mixed canonical and external" }),
  "test:hosted-cloudflare": Object.freeze({ environment: "checked-in Cloudflare Worker adapter", transport: "in-memory Durable Object sockets" }),
  "test:parsing-browser-certificate": Object.freeze({ environment: "Node + synthetic DOM", transport: "none" }),
} satisfies Readonly<Record<string, Readonly<{ environment: string; transport: string }>>>);

function demo_role(name: string): Readonly<{
  role: TestSurfaceRole;
  exposure: TestSurfaceExposure;
  exclusionReason?: string;
  aliasOf?: string;
}> {
  if (CANONICAL_COMMANDS.has(name)) {
    return Object.freeze({ role: "canonical selectable suite", exposure: "hosted selectable" });
  }
  if (AGGREGATE_COMMANDS.has(name)) {
    return Object.freeze({
      role: "aggregate verification command",
      exposure: "command only",
      ...(name === "test:stage4a-selected-worker"
        ? { aliasOf: "hson-demo2:test:hosted-cloudflare" }
        : name === "test:external-library-all-node"
          ? { aliasOf: "hson-demo2:test:external-library-node" }
          : {}),
    });
  }
  if (ARTIFACT_COMMANDS.has(name)) {
    return Object.freeze({ role: "production artifact verification", exposure: "command only" });
  }
  const exclusionReason = Reflect.get(UTILITY_REASONS, name) as string | undefined;
  if (exclusionReason !== undefined) {
    return Object.freeze({
      role: "developer utility",
      exposure: "explicitly excluded",
      exclusionReason,
      ...(name === "test:browser:headed" || name === "test:browser:debug"
        ? { aliasOf: "hson-demo2:test:browser" }
        : {}),
    });
  }
  return Object.freeze({ role: "integration journey", exposure: "command only" });
}

function category_for(name: string): TestSurfaceCategory {
  if (name === "test:parsing-browser-certificate" || name === "test:parsing-verification-coordinator") return "Transforms";
  if (name.includes("real-websocket") || name.includes("websocket-lifecycle")) return "Real WebSocket";
  if (name.includes("liveinspect")) return "LiveInspector";
  if (name.includes("livetree") || name.includes("node-representation")) return "LiveTree";
  if (name.includes("reflect")) return "Reflect";
  if (name.includes("replay")) return "LiveMap";
  if (name.includes("generated-json")) return "Transforms";
  if (name.includes("surface-enumeration")) return "Build / Types";
  if (name.includes("browser") || name.includes("amoebi") || name.includes("soft-tile") || name.includes("splash")) return "Application / Demo";
  return name.includes("hosted") ? "Hosted Runtime" : "LiveHost";
}

function demo_entry([name, path]: readonly [string, string]): TestSurfaceCatalogEntry {
  const diagnostic = name.includes("diagnostics");
  const realSocket = category_for(name) === "Real WebSocket";
  const jsdom = name.includes("dom-") || name.includes("jsdom");
  const browser = name === "test:browser"
    || name === "test:browser:headed"
    || name === "test:browser:debug"
    || name === "test:browser:install";
  const policy = demo_role(name);
  const environmentOverride = Reflect.get(DEMO_ENVIRONMENT_OVERRIDES, name) as
    | Readonly<{ environment: string; transport: string }>
    | undefined;
  return Object.freeze({
    id: `hson-demo2:${name}`,
    label: name.replace(/^test:/, "").replaceAll("-node", "").replaceAll("-", " "),
    category: category_for(name), repository: "hson-demo2", path,
    behavior: browser
      ? (name === "test:browser" ? "Chromium certifies application boot, Parse and Build journeys, and canonical HTML/SVG QUID selector application." : `Playwright support command ${name}.`)
      : `Permanent ${name} contract declared by hson-demo2/package.json.`,
    classification: diagnostic ? "temporary diagnostic" : realSocket ? "real transport integration" : browser ? "runtime integration" : "runtime integration",
    ...policy,
    environment: environmentOverride?.environment ?? (browser ? "real Chromium" : jsdom ? "Node + jsdom" : "Node"),
    transport: environmentOverride?.transport ?? (browser ? "localhost Vite" : realSocket ? "real WebSocket" : name.includes("hosted") ? "in-memory / local runtime" : "none"),
    runner: `npm run ${name}`, appearsInHostedUi: policy.exposure === "hosted selectable", status: "available",
  });
}

const LIVE_SUPPORT_RUNNERS: readonly (readonly [string, string, TestClassification])[] = [
  ["build", "tsc production emit", "build/typecheck certification"],
  ["check", "strict no-emit typecheck", "build/typecheck certification"],
  ["test:hson-array-index", "HSON array-index acceptance", "library acceptance"],
  ["test:hson-attribute-transport", "HSON attribute transport acceptance", "library acceptance"],
  ["test:diagnostics-inventory", "external diagnostics manifest consistency", "runtime integration"],
  ["test:livehost-graph-content-codec", "LiveHost graph-content codec acceptance", "library acceptance"],
  ["test:root-compatibility", "root compatibility acceptance", "library acceptance"],
  ["test:transform-worker", "Worker transform entrypoint acceptance", "library acceptance"],
];

function live_support_role(name: string): Readonly<{
  role: TestSurfaceRole;
  exposure: TestSurfaceExposure;
}> {
  if (name === "build" || name === "check" || name === "test:root-compatibility") {
    return Object.freeze({ role: "production artifact verification", exposure: "command only" });
  }
  if (name === "test:diagnostics-inventory") {
    return Object.freeze({ role: "aggregate verification command", exposure: "command only" });
  }
  if (name === "test:hson-array-index"
    || name === "test:hson-attribute-transport"
    || name === "test:livehost-graph-content-codec"
    || name === "test:transform-worker") {
    return Object.freeze({ role: "integration journey", exposure: "command only" });
  }
  throw new Error(`Unclassified hson-live support runner: ${name}`);
}

function live_environment(
  launcher: HsonLiveTestLauncher,
): Readonly<{ environment: string; transport: string }> {
  if (launcher.runtime === "node-synthetic-dom") {
    return Object.freeze({ environment: "Node + synthetic DOM", transport: "none" });
  }
  if (launcher.runtime === "node-real-websocket-process") {
    return Object.freeze({ environment: "Node child processes", transport: "real WebSocket" });
  }
  if (launcher.runtime === "node-real-websocket") {
    return Object.freeze({ environment: "Node", transport: "real WebSocket" });
  }
  return Object.freeze({ environment: "Node", transport: "in-memory or none" });
}

function live_launcher_category(launcher: HsonLiveTestLauncher): TestSurfaceCategory {
  if (launcher.subject === "Transform") return "Transforms";
  if (launcher.subject === "LiveTree") return "LiveTree";
  if (launcher.subject === "LiveMap") return "LiveMap";
  if (launcher.subject === "Reflect") return "Reflect";
  if (launcher.subject === "LiveHost") return "LiveHost";
  return launcher.id === "core.public-boundaries" ? "Build / Types" : "Transforms";
}

function live_launcher_entry(launcher: HsonLiveTestLauncher): TestSurfaceCatalogEntry {
  const externalLauncher: ExternalLauncherCatalogProjection = Object.freeze({
    launcherId: launcher.id,
    packageScript: launcher.packageScript,
    primarySubject: launcher.subject,
    executableChecks: launcher.executableChecks,
    runtime: launcher.runtime,
    completionRequirement: HSON_LIVE_TEST_COMPLETION_REQUIREMENT,
    panelVisible: true,
    inclusiveEligible: true,
  });
  return Object.freeze({
    id: `hson-live:${launcher.packageScript}`,
    label: launcher.displayName,
    category: live_launcher_category(launcher),
    repository: "hson-live",
    path: launcher.repositoryModule,
    behavior: `${launcher.displayName} acceptance (${launcher.executableChecks} executable checks).`,
    classification: launcher.runtime === "node-real-websocket"
      || launcher.runtime === "node-real-websocket-process"
      ? "real transport integration"
      : "library acceptance",
    role: "external diagnostic launcher",
    exposure: "hosted selectable",
    ...live_environment(launcher),
    runner: `npm run ${launcher.packageScript}`,
    externalLauncher,
    appearsInHostedUi: externalLauncher.panelVisible,
    status: "available",
  });
}

const LIVE_SUPPORT_ENTRIES: readonly TestSurfaceCatalogEntry[] =
LIVE_SUPPORT_RUNNERS.map(([name, behavior, classification]) => Object.freeze({
  id: `hson-live:${name}`, label: name,
  category: name === "build" || name === "check" || name === "test:root-compatibility"
    ? "Build / Types"
    : name.includes("hson") || name.includes("transform") ? "Transforms" : "LiveHost",
  repository: "hson-live", path: name.startsWith("test:") ? `tests/${name.slice(5)}.acceptance.mts` : "package.json",
  behavior, classification,
  ...live_support_role(name),
  environment: "Node",
  transport: "none",
  runner: `npm run ${name}`,
  appearsInHostedUi: false,
  status: "available",
}) as TestSurfaceCatalogEntry);

export const HSON_LIVE_NON_LAUNCHER_TEST_SCRIPT_REASONS = Object.freeze(
  Object.fromEntries(hson_live_non_launcher_test_scripts.map((entry) => [
    entry.packageScript,
    entry.reason,
  ])) as Readonly<Record<`test:${string}`, string>>,
);

const LIVE_ENTRIES: readonly TestSurfaceCatalogEntry[] = Object.freeze([
  ...hson_live_test_launchers.map(live_launcher_entry),
  ...LIVE_SUPPORT_ENTRIES,
]);

const visibleLabelById = new Map<HostedTestSuiteId, string>(HOSTED_TEST_VISIBLE_SUITES.map((suite) => [suite.id, suite.label]));
const HOSTED_ENTRIES = HOSTED_TEST_SUITE_IDS.map((suiteId): TestSurfaceCatalogEntry => Object.freeze({
  id: `hosted-suite:${suiteId}`, label: visibleLabelById.get(suiteId) ?? suiteId,
  category: suiteId.includes("livetree") ? "LiveTree" : suiteId.includes("livemap") ? "LiveMap" : suiteId.includes("transform") ? "Transforms" : suiteId.includes("livehost") ? "LiveHost" : "Hosted Runtime",
  repository: "hson-demo2", path: "tests/harness/hosted/registered-hosted-test-suites.ts",
  behavior: suiteId === "hosted/all"
    ? "Complete deterministic hosted collection; generated/fuzz transform verification runs separately."
    : `Hosted fixture collection ${suiteId}, reachable through a visible category or the all collection.`, classification: "fixture",
  role: "canonical selectable suite", exposure: "hosted selectable", environment: "browser or hosted Node",
  transport: "dedicated LiveHost report host", runner: "Hosted Tests UI", hostedSuiteId: suiteId, appearsInHostedUi: true, status: "available",
}));

const LIVE_IDENTITY_FIXTURE: TestSurfaceCatalogEntry = Object.freeze({
  id: "hson-live:fixture:default-identity-runtime", label: "default identity browser-runtime fixture", category: "LiveHost",
  repository: "hson-live", path: "tests/fixtures/livehost-default-identity-runtime.mts",
  behavior: "Separately initialized runtimes generate reload-safe default client and fresh action request identities.",
  classification: "fixture", role: "integration journey", exposure: "command only",
  aliasOf: "hson-live:test:livehost-action-dedupe",
  environment: "separate Node processes modeling browser reloads", transport: "in-memory socket",
  runner: "npm run test:livehost-action-dedupe", appearsInHostedUi: false, status: "available",
});

const DEMO_CERTIFICATIONS: readonly TestSurfaceCatalogEntry[] = ["build", "check"].map((name): TestSurfaceCatalogEntry => Object.freeze({
  id: `hson-demo2:${name}`, label: name, category: "Build / Types", repository: "hson-demo2", path: "package.json",
  behavior: name === "build" ? "Production Vite build completes." : "Strict TypeScript no-emit check completes.",
  classification: "build/typecheck certification", role: "production artifact verification", exposure: "command only",
  environment: "Node", transport: "none", runner: `npm run ${name}`,
  appearsInHostedUi: false, status: "available",
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
