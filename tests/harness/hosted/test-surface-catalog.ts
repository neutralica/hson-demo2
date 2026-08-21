import {
  HSON_LIVE_TEST_COMPLETION_REQUIREMENT,
  hson_live_non_launcher_test_scripts,
  hson_live_test_launchers,
  type HsonLiveTestLauncher,
} from "hson-live/test-launchers";

export const TEST_SURFACE_CATEGORIES = [
  "Transforms", "LiveTree", "LiveMap", "Reflect", "Locus", "LiveInspector", "Application / Demo", "Hosted Runtime", "Real WebSocket", "Build / Types",
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
  "test:hosted-deployment-node": "tests/runners/livehost/run-hosted-deployment.node.mts",
  "test:node-host-backpressure": "tests/runners/livehost/run-node-host-backpressure.node.mts",
  "test:hosted-report-authority-scaling-node": "tests/runners/livehost/run-hosted-report-authority-scaling.node.mts",
  "test:hosted-production-panel-timeline-node": "tests/runners/livehost/run-hosted-production-panel-timeline.node.mts",
  "test:phase3b-cancellation-node": "tests/runners/livehost/run-hosted-phase-3b-cancellation.node.mts",
  "test:phase3b-process-cancellation-node": "tests/runners/livehost/run-hosted-phase-3b-process-cancellation.node.mts",
  "test:phase3b-panel-cancellation-node": "tests/runners/livehost/run-hosted-phase-3b-panel-cancellation.node.mts",
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
  "test:hosted-dom-behavior-diagnostics-node": "tests/runners/livehost/run-hosted-dom-behavior-diagnostics.node.mts",
  "test:hosted-dom-layout-diagnostics-node": "tests/runners/livehost/run-hosted-dom-layout-diagnostics.node.mts",
  "test:hosted-sanitizer-node": "tests/runners/livehost/run-hosted-sanitizer.node.mts",
  "test:hosted-canvas-runtime-node": "tests/runners/livehost/run-hosted-canvas-runtime.node.mts",
  "test:hosted-canvas-collection-node": "tests/runners/livehost/run-hosted-canvas-collection.node.mts",
  "test:hosted-test-timing-node": "tests/runners/livehost/run-hosted-test-timing.node.mts",
  "test:phase3a-coordinator-node": "tests/runners/livehost/run-hosted-phase-3a-coordinator.node.mts",
  "test:livetree-lifecycle-foundations-node": "tests/runners/livehost/run-livetree-lifecycle-foundations.node.mts",
  "test:livetree-lifecycle-public-node": "tests/runners/livehost/run-livetree-lifecycle-public.node.mts",
  "test:livetree-lifecycle-ownership-node": "tests/runners/livehost/run-livetree-lifecycle-ownership.node.mts",
  "test:livetree-allocation-node": "tests/runners/livehost/run-livetree-allocation.node.mts",
  "test:hson-node-representation-node": "tests/runners/livehost/run-hson-node-representation.node.mts",
  "test:generated-json-node": "tests/runners/diagnostics/run-generated-json.node.mts",
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
  "test:phase1-convergence-node": "tests/runners/harness/run-phase-1-convergence.node.mts",
  "test:phase2a-lifecycle-node": "tests/runners/harness/run-phase-2a-lifecycle.node.mts",
  "test:phase2b-presentation-node": "tests/runners/harness/run-phase-2b-presentation.node.mts",
  "test:presentation-cleanup-node": "tests/runners/harness/run-test-presentation-cleanup.node.mts",
  "test:phase4a-layering-node": "tests/runners/harness/run-phase-4a-layering.node.mts",
  "test:phase4b-retirement-node": "tests/runners/harness/run-phase-4b-retirement.node.mts",
  "test:external-library-node": "tests/runners/harness/run-external-library-launchers.node.mts",
  "test:external-library-all-node": "tests/runners/harness/run-external-library-launchers.node.mts",
  "test:external-launcher-protocol-node": "tests/runners/harness/run-external-launcher-protocol.node.mts",
  "test:external-launcher-manifest-audit-node": "tests/runners/harness/run-external-launcher-manifest-audit.node.mts",
  "test:runner-truthfulness-node": "tests/runners/harness/run-test-runner-truthfulness.node.mts",
  "test:splash-lifecycle-node": "tests/runners/app/run-splash-lifecycle.node.mts",
  "test:inclusive-library-node": "tests/runners/harness/run-inclusive-library-verification.node.mts",
  "test:hosted-performance-node": "tests/runners/harness/run-hosted-test-performance.node.mts",
  "test:direct-all-performance-node": "tests/runners/harness/run-direct-all-performance.node.mts",
  "test:phase6a-node-mothership": "tests/runners/harness/run-phase-6a-node-mothership.node.mts",
  "test:phase6a-full-node-hosted": "tests/runners/harness/run-phase-6a-full-node-hosted.node.mts",
  "test:node-process-supervisor": "tests/runners/harness/run-node-process-supervisor.node.mts",
  "test:phase6b-browser-executor": "tests/runners/harness/run-phase-6b-browser-executor.node.mts",
  "test:phase6b-browser-cancellation": "tests/runners/harness/run-phase-6b-browser-cancellation.node.mts",
  "test:phase6b-mixed-run": "tests/runners/harness/run-phase-6b-mixed-run.node.mts",
  "test:phase6b-full-browser-hosted": "tests/runners/harness/run-phase-6b-full-browser-hosted.node.mts",
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
  "test:phase1-convergence-node",
  "test:phase2a-lifecycle-node",
  "test:phase2b-presentation-node",
  "test:presentation-cleanup-node",
  "test:phase4a-layering-node",
  "test:phase4b-retirement-node",
  "test:phase3b-cancellation-node",
  "test:phase3b-process-cancellation-node",
  "test:phase3b-panel-cancellation-node",
  "test:external-library-node",
  "test:external-library-all-node",
  "test:inclusive-library-node",
  "test:phase6a-node-mothership",
  "test:phase6a-full-node-hosted",
  "test:node-process-supervisor",
  "test:phase6b-browser-executor",
  "test:phase6b-browser-cancellation",
  "test:phase6b-mixed-run",
  "test:phase6b-full-browser-hosted",
]);
const ARTIFACT_COMMANDS = new Set(["test:node-production-runtime"]);
const UTILITY_REASONS = Object.freeze({
  "test:browser:headed": "Interactive headed variant of the authoritative test:browser journey.",
  "test:browser:debug": "Interactive Playwright debugging variant; not a durable independent verification.",
  "test:browser:install": "Installs the browser runtime and executes no tests.",
  "test:hosted-dom-behavior-diagnostics-node": "Developer diagnostic output; durable DOM assertions live in canonical suites.",
  "test:hosted-dom-layout-diagnostics-node": "Developer layout diagnostic output; it is not a rendering certification.",
  "test:hosted-performance-node": "Developer performance matrix that repeatedly composes canonical and external inventories.",
  "test:direct-all-performance-node": "Developer direct-execution baseline for the complete canonical and external inventory.",
  "test:hosted-report-authority-scaling-node": "Focused synthetic scaling certificate for hosted report authority overhead.",
  "test:hosted-production-panel-timeline-node": "Production-panel latency, memory, transport, and recovery certificate.",
} satisfies Readonly<Record<string, string>>);
const DEMO_ENVIRONMENT_OVERRIDES = Object.freeze({
  "test:node-application-host": Object.freeze({ environment: "Node", transport: "real HTTP + WebSocket" }),
  "test:node-application-host-entry": Object.freeze({ environment: "Node child process", transport: "real HTTP + WebSocket" }),
  "test:livehost-bootstrap-integration": Object.freeze({ environment: "Node", transport: "real HTTP + WebSocket" }),
  "test:node-production-runtime": Object.freeze({ environment: "built Node production artifact", transport: "real HTTP + WebSocket" }),
  "test:inclusive-library-node": Object.freeze({ environment: "Node + synthetic DOM + child processes", transport: "mixed canonical and external" }),
  "test:hosted-performance-node": Object.freeze({ environment: "Node child processes", transport: "mixed canonical and external" }),
  "test:direct-all-performance-node": Object.freeze({ environment: "Node + child processes", transport: "mixed canonical and external" }),
  "test:hosted-production-panel-timeline-node": Object.freeze({ environment: "Node child process + synthetic DOM", transport: "real WebSocket" }),
  "test:phase3b-cancellation-node": Object.freeze({ environment: "Node + Worker-portable", transport: "in-memory Locus authority" }),
  "test:phase3b-process-cancellation-node": Object.freeze({ environment: "Node child processes", transport: "supervised process control" }),
  "test:phase3b-panel-cancellation-node": Object.freeze({ environment: "Node + production panel adapter", transport: "in-memory Locus authority" }),
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
  return name.includes("hosted") ? "Hosted Runtime" : "Locus";
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
  ["check:source", "strict source no-emit typecheck", "build/typecheck certification"],
  ["check:tests", "strict test no-emit typecheck", "build/typecheck certification"],
  ["check:entrypoints", "public and environment entrypoint compile certification", "build/typecheck certification"],
  ["corpus:review", "authored-corpus human review artifact generator", "temporary diagnostic"],
  ["livemap:operators:review", "LiveMap operator human review artifact generator", "temporary diagnostic"],
  ["test:hson-array-index", "HSON array-index acceptance", "library acceptance"],
  ["test:hson-attribute-transport", "HSON attribute transport acceptance", "library acceptance"],
  ["test:diagnostics-inventory", "external diagnostics manifest consistency", "runtime integration"],
  ["test:locus-graph-content-codec", "Locus graph-content codec acceptance", "library acceptance"],
  ["test:locus-public-contract", "Locus built-package public contract", "library acceptance"],
  ["test:root-compatibility", "root compatibility acceptance", "library acceptance"],
  ["test:transform-worker", "Worker transform entrypoint acceptance", "library acceptance"],
];

function live_support_role(name: string): Readonly<{
  role: TestSurfaceRole;
  exposure: TestSurfaceExposure;
  exclusionReason?: string;
}> {
  if (name === "corpus:review" || name === "livemap:operators:review") {
    return Object.freeze({
      role: "developer utility",
      exposure: "explicitly excluded",
      exclusionReason: "Generates a human review artifact and executes no independent semantic test.",
    });
  }
  if (name === "build" || name === "check" || name.startsWith("check:") || name === "test:root-compatibility") {
    return Object.freeze({ role: "production artifact verification", exposure: "command only" });
  }
  if (name === "test:diagnostics-inventory") {
    return Object.freeze({ role: "aggregate verification command", exposure: "command only" });
  }
  if (name === "test:hson-array-index"
    || name === "test:hson-attribute-transport"
    || name === "test:locus-graph-content-codec"
    || name === "test:locus-public-contract"
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
  if (launcher.subject === "Locus") return "Locus";
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
  category: name === "build" || name === "check" || name.startsWith("check:") || name === "test:root-compatibility"
    ? "Build / Types"
    : name.includes("hson") || name.includes("transform") ? "Transforms" : "Locus",
  repository: "hson-live", path: name === "test:locus-public-contract"
    ? "tests/locus-public-contract.acceptance.mjs"
    : name.startsWith("test:") ? `tests/${name.slice(5)}.acceptance.mts` : "package.json",
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

const LIVE_IDENTITY_FIXTURE: TestSurfaceCatalogEntry = Object.freeze({
  id: "hson-live:fixture:default-identity-runtime", label: "default identity browser-runtime fixture", category: "Locus",
  repository: "hson-live", path: "tests/runtime-probes/fixtures/locus-default-identity-runtime.mjs",
  behavior: "Separately initialized runtimes generate reload-safe default client and fresh action request identities.",
  classification: "fixture", role: "integration journey", exposure: "command only",
  aliasOf: "hson-live:test:locus-action-dedupe",
  environment: "separate Node processes modeling browser reloads", transport: "in-memory socket",
  runner: "npm run test:locus-action-dedupe", appearsInHostedUi: false, status: "available",
});

const DEMO_CERTIFICATIONS: readonly TestSurfaceCatalogEntry[] = ["build", "check", "build:node-production", "check:cloudflare", "cloudflare:types"].map((name): TestSurfaceCatalogEntry => Object.freeze({
  id: `hson-demo2:${name}`, label: name, category: "Build / Types", repository: "hson-demo2", path: "package.json",
  behavior: name === "build"
    ? "Production Vite build completes."
    : name === "build:node-production"
      ? "Production Node server and circuit-worker entrypoints bundle successfully."
      : name === "cloudflare:types"
        ? "Cloudflare runtime bindings are generated from the deployment configuration."
        : "Strict TypeScript no-emit check completes.",
  classification: "build/typecheck certification", role: "production artifact verification", exposure: "command only",
  environment: name.includes("cloudflare") ? "Node + Cloudflare build tooling" : "Node + build tooling", transport: "none", runner: `npm run ${name}`,
  appearsInHostedUi: false, status: "available",
}));

const DEMO_NON_TEST_VERIFICATIONS: readonly TestSurfaceCatalogEntry[] = Object.freeze([
  Object.freeze({
    id: "hson-demo2:diagnose:towl-deployed", label: "deployed TOWL diagnosis", category: "Hosted Runtime",
    repository: "hson-demo2", path: "tests/runners/towl/diagnose-deployed-towl.node.mts",
    behavior: "Exercises the deployed TOWL runtime boundary and reports transport evidence.",
    classification: "real transport integration", role: "integration journey", exposure: "command only",
    environment: "Node against deployed Worker", transport: "network + real WebSocket",
    runner: "npm run diagnose:towl-deployed", appearsInHostedUi: false, status: "available",
  }),
  Object.freeze({
    id: "hson-demo2:measure:circuit-worker", label: "circuit Worker measurement", category: "Hosted Runtime",
    repository: "hson-demo2", path: "tests/runners/livehost/measure-circuit-worker.node.mts",
    behavior: "Developer measurement command; durable circuit Worker assertions live in canonical suites.",
    classification: "temporary diagnostic", role: "developer utility", exposure: "explicitly excluded",
    exclusionReason: "Performance measurement is not a stable semantic verification surface.",
    environment: "Node + Worker", transport: "in-memory worker threads",
    runner: "npm run measure:circuit-worker", appearsInHostedUi: false, status: "available",
  }),
]);

export const TEST_SURFACE_CATALOG = Object.freeze([
  ...LIVE_ENTRIES,
  LIVE_IDENTITY_FIXTURE,
  ...DEMO_CERTIFICATIONS,
  ...DEMO_NON_TEST_VERIFICATIONS,
  ...Object.entries(DEMO_TEST_SCRIPTS).map(demo_entry),
]);

export const TEST_SURFACE_COMMAND_ENTRIES = TEST_SURFACE_CATALOG;
export const DECLARED_DEMO_TEST_SCRIPTS = Object.freeze(Object.keys(DEMO_TEST_SCRIPTS));
