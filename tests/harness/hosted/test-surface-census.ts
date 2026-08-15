import { JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS } from "../runtimes/dom/canvas/canvas-fidelity-manifest";
import { make_cloudflare_livehost_executor_registry } from "../runtimes/cloudflare/cloudflare-test-executor";
import { make_local_node_livehost_executor_registry } from "../runtimes/node/livehost-node-executor";
import {
  TEST_SURFACE_CATALOG,
  type TestSurfaceCatalogEntry,
} from "./test-surface-catalog";
import {
  DEFAULT_GENERATED_JSON_CASES,
  GENERATED_JSON_COUNT_ENVIRONMENT,
  GENERATED_JSON_SEED_ENVIRONMENT,
} from "./generated-test-policy";
import {
  NODE_HOSTED_COMMAND_SURFACE_IDS,
  NODE_HOSTED_SEMANTIC_ALIAS_SURFACE_IDS,
  NODE_VERIFICATION_ONLY_SURFACE_IDS,
} from "../runtimes/node/node-command-surfaces";

export const TEST_CENSUS_CAPABILITIES = Object.freeze([
  "javascript",
  "node",
  "worker-threads",
  "cloudflare-worker",
  "filesystem",
  "process",
  "synthetic-dom",
  "synthetic-canvas",
  "browser-dom",
  "browser",
  "chromium",
  "websocket",
  "network",
  "local-server",
  "compiler/typescript",
  "build-tooling",
  "environment/secrets",
  "deployment-access",
] as const);

export type TestCensusCapability = typeof TEST_CENSUS_CAPABILITIES[number];
export type TestVerificationKind =
  | "semantic runtime test"
  | "type/compile certification"
  | "build/entrypoint certification"
  | "inventory/meta certification"
  | "generated/fuzz testing"
  | "developer utility";
export type TestCensusDenominator =
  | "canonical cases"
  | "opaque checks"
  | "browser journeys"
  | "dynamic/generated checks"
  | "certification surfaces"
  | "none";
export type TestSurfaceShape =
  | "canonical suite"
  | "opaque launcher"
  | "browser spec"
  | "browser fidelity case"
  | "standalone runner"
  | "aggregate/alias runner"
  | "certification command"
  | "developer utility";
export type TestHostabilityClass =
  | "hosted-deployed-now"
  | "hosted-local-now"
  | "hostable-worker"
  | "hostable-node"
  | "hostable-external-process"
  | "hostable-browser"
  | "verification-only"
  | "excluded-developer-utility"
  | "blocked-external";
export type Phase6ExecutorClass =
  | "deployed-worker-executor"
  | "deployed-node-executor"
  | "supervised-process-executor"
  | "browser-executor"
  | "verification-executor"
  | "none";

export type TestSurfaceCensusEntry = Readonly<{
  id: string;
  semanticSubject: string;
  provenance: "hson-live" | "hson-demo2";
  path: string;
  executionShape: TestSurfaceShape;
  verificationKind: TestVerificationKind;
  denominator: TestCensusDenominator;
  semanticCount: number | null;
  dynamicCountPolicy?: string;
  currentExecutor: string;
  requiredCapabilities: readonly TestCensusCapability[];
  currentLocalAvailability: boolean;
  currentLocalLiveHostAvailability: boolean;
  currentDeployedAvailability: boolean;
  currentDeployedLiveHostAvailability: boolean;
  cancellationSupport: "authoritative" | "runner-local" | "none" | "not applicable";
  recoveryReportSupport: "normalized LiveHost report" | "terminal evidence only" | "artifact result" | "not applicable";
  artifactEvidenceRequirements: readonly string[];
  hostabilityClass: TestHostabilityClass;
  reasonNotCurrentlyDeployed: string | null;
  exactMissingCapability: string | null;
  phase6ExecutorClass: Phase6ExecutorClass;
}>;

export type BrowserSurfaceInventory = Readonly<{
  path: `tests/integration/browser/${string}.spec.ts`;
  cases: number;
}>;

export const BROWSER_SPEC_PATHS = Object.freeze([
  "tests/integration/browser/app-boot.spec.ts",
  "tests/integration/browser/build.spec.ts",
  "tests/integration/browser/cellsheet-resize.spec.ts",
  "tests/integration/browser/cellsheet.spec.ts",
  "tests/integration/browser/parse-verification-performance.spec.ts",
  "tests/integration/browser/parse-verification.spec.ts",
  "tests/integration/browser/parse.spec.ts",
  "tests/integration/browser/quid-selector.spec.ts",
  "tests/integration/browser/sanitizer-metadata.spec.ts",
  "tests/integration/browser/shell-resource-lifecycle.spec.ts",
  "tests/integration/browser/small-state-surfaces.spec.ts",
  "tests/integration/browser/towl-direct-entry.spec.ts",
  "tests/integration/browser/towl-rooms.spec.ts",
  "tests/integration/browser/visual-determinism-authority.spec.ts",
] as const satisfies readonly BrowserSurfaceInventory["path"][]);

export type DuplicateRetirement = Readonly<{
  removedTestIdentity: string;
  retainedAuthoritativeIdentity: string;
  semanticProposition: string;
  reason: string;
  removedCanonicalCases: number;
}>;

export const PHASE5_DUPLICATE_RETIREMENTS: readonly DuplicateRetirement[] = Object.freeze([
  ["transform/hson/quoted-name-acceptance", "transform.hson-quoted-name-acceptance", "HSON quoted property-name acceptance grammar", 24],
  ["transform/hson/quoted-name-rejection", "transform.hson-quoted-name-rejection", "HSON quoted property-name rejection grammar", 25],
  ["livemap/path-handle", "livemap.path-handle", "LiveMap path-handle semantics", 8],
  ["livemap/carrier-mutation-planning", "livemap.carrier-mutation-planning", "LiveMap carrier mutation planning", 23],
  ["livemap/exact-transport", "livemap.exact-transport", "LiveMap exact transport", 23],
  ["livemap/exact-transport-rejection", "livemap.exact-transport-rejection", "LiveMap exact transport rejection", 10],
  ["livemap/exact-propagation", "livemap.exact-propagation", "LiveMap exact propagation", 23],
  ["livemap/schema-value-boundary", "livemap.schema-value-boundary", "LiveMap schema value boundary", 24],
].map(([removedTestIdentity, retainedAuthoritativeIdentity, semanticProposition, removedCanonicalCases]) => Object.freeze({
  removedTestIdentity,
  retainedAuthoritativeIdentity,
  semanticProposition,
  reason: "Both surfaces asserted the same core hson-live contract at the library boundary; the broader manifested hson-live launcher is authoritative.",
  removedCanonicalCases,
})) as readonly DuplicateRetirement[]);

function unique_capabilities(values: readonly TestCensusCapability[]): readonly TestCensusCapability[] {
  const order = new Map(TEST_CENSUS_CAPABILITIES.map((capability, index) => [capability, index]));
  return Object.freeze([...new Set(values)].sort((left, right) => order.get(left)! - order.get(right)!));
}

function command_capabilities(entry: TestSurfaceCatalogEntry): readonly TestCensusCapability[] {
  const text = `${entry.id} ${entry.environment} ${entry.transport}`.toLowerCase();
  const capabilities: TestCensusCapability[] = ["javascript"];
  if (text.includes("node")) capabilities.push("node");
  if (text.includes("cloudflare") || entry.id === "hson-demo2:test:hosted-cloudflare"
    || entry.id === "hson-demo2:test:stage4a-selected-worker") capabilities.push("cloudflare-worker");
  else if (text.includes("worker") && entry.id !== "hson-live:test:transform-worker") capabilities.push("worker-threads");
  if (text.includes("process") || text.includes("production artifact")) capabilities.push("process");
  if (text.includes("synthetic dom") || text.includes("jsdom")) capabilities.push("synthetic-dom");
  if (text.includes("canvas")) capabilities.push("synthetic-canvas");
  if (text.includes("chromium") || entry.id === "hson-demo2:test:browser") {
    capabilities.push("browser-dom", "browser", "chromium", "network", "local-server");
  }
  if (text.includes("websocket")) capabilities.push("websocket", "network");
  if (text.includes("deployed")) capabilities.push("network", "environment/secrets", "deployment-access");
  if (entry.classification === "build/typecheck certification") capabilities.push("node", "compiler/typescript", "build-tooling");
  if (entry.id.includes("production-runtime")) capabilities.push("filesystem", "local-server");
  return unique_capabilities(capabilities);
}

function verification_kind(entry: TestSurfaceCatalogEntry): TestVerificationKind {
  if (entry.role === "developer utility") return "developer utility";
  if (entry.id.includes("generated-json")) return "generated/fuzz testing";
  if (entry.classification === "build/typecheck certification") {
    return entry.id.includes("check") ? "type/compile certification" : "build/entrypoint certification";
  }
  if (entry.role === "aggregate verification command" || entry.id.includes("inventory") || entry.id.includes("truthfulness")) {
    return "inventory/meta certification";
  }
  return "semantic runtime test";
}

function command_shape(entry: TestSurfaceCatalogEntry): TestSurfaceShape {
  if (entry.role === "external diagnostic launcher") return "opaque launcher";
  if (entry.role === "developer utility") return "developer utility";
  if (entry.classification === "build/typecheck certification" || entry.role === "production artifact verification") return "certification command";
  if (entry.role === "aggregate verification command" || entry.role === "canonical selectable suite" || entry.aliasOf !== undefined) return "aggregate/alias runner";
  return "standalone runner";
}

function command_hostability(entry: TestSurfaceCatalogEntry, capabilities: readonly TestCensusCapability[]): Readonly<{
  hostabilityClass: TestHostabilityClass;
  phase6ExecutorClass: Phase6ExecutorClass;
  missing: string | null;
}> {
  if (entry.role === "developer utility") return Object.freeze({ hostabilityClass: "excluded-developer-utility", phase6ExecutorClass: "none", missing: null });
  if ((NODE_HOSTED_COMMAND_SURFACE_IDS as readonly string[]).includes(entry.id)
    || (NODE_HOSTED_SEMANTIC_ALIAS_SURFACE_IDS as readonly string[]).includes(entry.id)) {
    return Object.freeze({ hostabilityClass: "hosted-local-now", phase6ExecutorClass: capabilities.includes("process") ? "supervised-process-executor" : "deployed-node-executor", missing: "deploy the complete Node LiveHost mothership" });
  }
  if ((NODE_VERIFICATION_ONLY_SURFACE_IDS as readonly string[]).includes(entry.id)) {
    return Object.freeze({ hostabilityClass: "verification-only", phase6ExecutorClass: "verification-executor", missing: "optional bounded verification-executor promotion" });
  }
  if (entry.classification === "build/typecheck certification" || entry.role === "production artifact verification") {
    return Object.freeze({ hostabilityClass: "verification-only", phase6ExecutorClass: "verification-executor", missing: "remote build/typecheck execution and artifact capture" });
  }
  if (capabilities.includes("browser")) return Object.freeze({ hostabilityClass: "hostable-browser", phase6ExecutorClass: "browser-executor", missing: "managed Chromium with supervised local server and artifact upload" });
  if (entry.appearsInHostedUi) return Object.freeze({ hostabilityClass: "hosted-local-now", phase6ExecutorClass: capabilities.includes("process") ? "supervised-process-executor" : "deployed-node-executor", missing: capabilities.includes("process") ? "deployed supervised process executor" : "deployed Node executor" });
  if (capabilities.includes("process")) return Object.freeze({ hostabilityClass: "hostable-external-process", phase6ExecutorClass: "supervised-process-executor", missing: "deployed supervised process execution" });
  if (capabilities.includes("cloudflare-worker")) return Object.freeze({ hostabilityClass: "hostable-worker", phase6ExecutorClass: "deployed-worker-executor", missing: "optional Cloudflare Worker portability executor" });
  return Object.freeze({ hostabilityClass: "hostable-node", phase6ExecutorClass: "deployed-node-executor", missing: "deployed Node executor with normalized lifecycle adapter" });
}

function command_census(entry: TestSurfaceCatalogEntry): TestSurfaceCensusEntry {
  const capabilities = command_capabilities(entry);
  const hostability = command_hostability(entry, capabilities);
  const kind = verification_kind(entry);
  const opaque = entry.externalLauncher !== undefined;
  const generated = kind === "generated/fuzz testing";
  const certification = kind === "type/compile certification" || kind === "build/entrypoint certification" || kind === "inventory/meta certification";
  const hostedCommand = (NODE_HOSTED_COMMAND_SURFACE_IDS as readonly string[]).includes(entry.id);
  const hostedAlias = (NODE_HOSTED_SEMANTIC_ALIAS_SURFACE_IDS as readonly string[]).includes(entry.id);
  const localLiveHost = entry.appearsInHostedUi || hostedCommand || hostedAlias;
  return Object.freeze({
    id: entry.id,
    semanticSubject: entry.externalLauncher?.primarySubject ?? entry.category,
    provenance: entry.repository,
    path: entry.path,
    executionShape: command_shape(entry),
    verificationKind: kind,
    denominator: opaque ? "opaque checks" : generated ? "dynamic/generated checks" : certification || hostedCommand ? "certification surfaces" : "none",
    semanticCount: opaque ? entry.externalLauncher!.executableChecks : generated ? null : certification || hostedCommand ? 1 : null,
    ...(generated ? { dynamicCountPolicy: `${GENERATED_JSON_SEED_ENVIRONMENT} selects the seed; ${GENERATED_JSON_COUNT_ENVIRONMENT} selects the generated check count (default ${DEFAULT_GENERATED_JSON_CASES}).` } : {}),
    currentExecutor: hostedCommand
      ? "Node LiveHost supervised command executor"
      : hostedAlias ? "Node LiveHost canonical/opaque executor" : entry.environment,
    requiredCapabilities: capabilities,
    currentLocalAvailability: entry.status === "available" && !capabilities.includes("environment/secrets"),
    currentLocalLiveHostAvailability: localLiveHost,
    currentDeployedAvailability: false,
    currentDeployedLiveHostAvailability: false,
    cancellationSupport: localLiveHost ? "authoritative" : entry.role === "developer utility" ? "not applicable" : "runner-local",
    recoveryReportSupport: localLiveHost ? "normalized LiveHost report" : certification ? "artifact result" : entry.role === "developer utility" ? "not applicable" : "terminal evidence only",
    artifactEvidenceRequirements: Object.freeze(localLiveHost
      ? ["normalized lifecycle", "normalized report", "captured stdout/stderr for opaque launchers"]
      : capabilities.includes("browser")
        ? ["journey result", "trace/screenshot/video on failure", "server logs"]
        : certification
          ? ["exit status", "compiler/build diagnostics", "produced artifact identity when applicable"]
          : ["exit status", "stdout/stderr"]),
    hostabilityClass: hostability.hostabilityClass,
    reasonNotCurrentlyDeployed: entry.role === "developer utility" ? entry.exclusionReason ?? "Developer utility, not a legitimate test denominator." : hostability.missing,
    exactMissingCapability: hostability.missing,
    phase6ExecutorClass: hostability.phase6ExecutorClass,
  });
}

function browser_fidelity_census(id: string): TestSurfaceCensusEntry {
  const [suite = "missing-suite"] = id.split("::", 1);
  return Object.freeze({
    id: `browser-fidelity:${id}`,
    semanticSubject: suite,
    provenance: "hson-demo2",
    path: "tests/suites/livetree (manifested by JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS)",
    executionShape: "browser fidelity case",
    verificationKind: "semantic runtime test",
    denominator: "browser journeys",
    semanticCount: 1,
    currentExecutor: "no passing executor; jsdom diagnostics certify the unsupported raster boundary",
    requiredCapabilities: Object.freeze(["javascript", "browser-dom", "browser", "chromium"] as const),
    currentLocalAvailability: false,
    currentLocalLiveHostAvailability: false,
    currentDeployedAvailability: false,
    currentDeployedLiveHostAvailability: false,
    cancellationSupport: "none",
    recoveryReportSupport: "terminal evidence only",
    artifactEvidenceRequirements: Object.freeze(["pixel assertion result", "failure screenshot/trace"]),
    hostabilityClass: "hostable-browser",
    reasonNotCurrentlyDeployed: "The deterministic synthetic-canvas recorder intentionally has no raster readback.",
    exactMissingCapability: "real CanvasRenderingContext2D rasterization and getImageData in a managed browser",
    phase6ExecutorClass: "browser-executor",
  });
}

function canonical_census(): readonly TestSurfaceCensusEntry[] {
  const node = make_local_node_livehost_executor_registry();
  const worker = make_cloudflare_livehost_executor_registry();
  const workerSuites = new Set(worker.catalog.suites.map((suite) => suite.id));
  return Object.freeze(node.catalog.suites.map((suite) => {
    const workerCapable = workerSuites.has(suite.id);
    const cases = node.catalog.tests.filter((test) => test.suiteId === suite.id);
    const capabilities = unique_capabilities(cases.flatMap((test) => test.requirements as readonly TestCensusCapability[]));
    return Object.freeze({
      id: `canonical:${suite.id}`,
      semanticSubject: suite.subject,
      provenance: suite.provenance,
      path: suite.sourceRef ?? `canonical suite ${suite.id}`,
      executionShape: "canonical suite",
      verificationKind: "semantic runtime test",
      denominator: "canonical cases",
      semanticCount: cases.length,
      currentExecutor: workerCapable ? `${node.executor.id} + ${worker.executor.id} (local adapter)` : node.executor.id,
      requiredCapabilities: capabilities,
      currentLocalAvailability: true,
      currentLocalLiveHostAvailability: true,
      currentDeployedAvailability: false,
      currentDeployedLiveHostAvailability: false,
      cancellationSupport: "authoritative",
      recoveryReportSupport: "normalized LiveHost report",
      artifactEvidenceRequirements: Object.freeze(["normalized case lifecycle", "normalized report", "failure diagnostics"]),
      hostabilityClass: "hosted-local-now",
      reasonNotCurrentlyDeployed: workerCapable
        ? "The Worker executor and deployment configuration exist, but no concrete deployed endpoint or frontend VITE_HOSTED_TEST_WS_URL is recorded in repository authority."
        : "The Worker executor does not provide this suite's Node/synthetic environment requirements.",
      exactMissingCapability: workerCapable
        ? "deploy the Worker executor and configure the deployed frontend endpoint"
        : capabilities.filter((capability) => capability !== "javascript").join(" + ") || "deployed Node executor",
      phase6ExecutorClass: workerCapable ? "deployed-worker-executor" : "deployed-node-executor",
    } satisfies TestSurfaceCensusEntry);
  }));
}

function browser_census(surface: BrowserSurfaceInventory): TestSurfaceCensusEntry {
  const name = surface.path.slice(surface.path.lastIndexOf("/") + 1, -".spec.ts".length);
  return Object.freeze({
    id: `browser:${name}`,
    semanticSubject: "application/browser integration",
    provenance: "hson-demo2",
    path: surface.path,
    executionShape: "browser spec",
    verificationKind: "semantic runtime test",
    denominator: "browser journeys",
    semanticCount: surface.cases,
    currentExecutor: "local Playwright Chromium",
    requiredCapabilities: Object.freeze(["javascript", "node", "process", "browser-dom", "browser", "chromium", "network", "local-server"] as const),
    currentLocalAvailability: true,
    currentLocalLiveHostAvailability: false,
    currentDeployedAvailability: false,
    currentDeployedLiveHostAvailability: false,
    cancellationSupport: "runner-local",
    recoveryReportSupport: "artifact result",
    artifactEvidenceRequirements: Object.freeze(["Playwright result", "trace/screenshot/video on failure", "Vite and LiveHost server logs"]),
    hostabilityClass: "hostable-browser",
    reasonNotCurrentlyDeployed: "No deployed browser executor is registered with LiveHost.",
    exactMissingCapability: "managed Chromium, supervised Vite/LiveHost servers, lifecycle normalization, and artifact upload",
    phase6ExecutorClass: "browser-executor",
  });
}

export function build_test_surface_census(
  browserSurfaces: readonly BrowserSurfaceInventory[],
): readonly TestSurfaceCensusEntry[] {
  return Object.freeze([
    ...canonical_census(),
    ...TEST_SURFACE_CATALOG.map(command_census),
    ...browserSurfaces.map(browser_census),
    ...JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS.map(browser_fidelity_census),
  ]);
}

export function test_census_denominators(census: readonly TestSurfaceCensusEntry[]): Readonly<Record<TestCensusDenominator, number>> {
  const totals: Record<TestCensusDenominator, number> = {
    "canonical cases": 0,
    "opaque checks": 0,
    "browser journeys": 0,
    "dynamic/generated checks": 0,
    "certification surfaces": 0,
    none: 0,
  };
  for (const entry of census) {
    if (entry.semanticCount !== null) totals[entry.denominator] += entry.semanticCount;
  }
  return Object.freeze(totals);
}
