import type { TestCapability, TestSubject, TestSuiteDescriptor } from "../../../../src/shared/testing/test-contracts";
import type { TestSurfaceCatalogEntry } from "../../hosted/test-surface-catalog";
import { TEST_SURFACE_CATALOG } from "../../hosted/test-surface-catalog";
import { NODE_TSX_IMPORT_PATH } from "./external-library-launchers";
import { H2_VERIFICATION_IDS, type H2ExecutorTestHooks } from "./h2-isolated-verification";

export const NODE_HOSTED_COMMAND_SURFACE_IDS = Object.freeze([
  "hson-live:build",
  "hson-live:check",
  "hson-live:check:source",
  "hson-live:check:tests",
  "hson-live:check:entrypoints",
  "hson-live:test:diagnostics-inventory",
  "hson-live:test:hson-array-index",
  "hson-live:test:hson-attribute-transport",
  "hson-live:test:locus-graph-content-codec",
  "hson-live:test:locus-public-contract",
  "hson-live:test:transform-worker",
  "hson-demo2:test:reflect-keyed-node",
  "hson-demo2:test:liveinspect-node",
  "hson-demo2:test:liveinspect-scaling-node",
  "hson-demo2:test:liveinspect-materialization-node",
  "hson-demo2:test:hosted-deployment-node",
  "hson-demo2:test:node-host-backpressure",
  "hson-demo2:test:node-application-host-entry",
  "hson-demo2:test:livehost-bootstrap-integration",
  "hson-demo2:test:hosted-jsdom-runtime-node",
  "hson-demo2:test:hosted-dom-collection-node",
  "hson-demo2:test:hosted-sanitizer-node",
  "hson-demo2:test:hosted-canvas-runtime-node",
  "hson-demo2:test:hosted-canvas-collection-node",
  "hson-demo2:test:hosted-test-timing-node",
  "hson-demo2:test:phase3a-coordinator-node",
  "hson-demo2:test:generated-json-node",
  "hson-demo2:test:amoebi-geometry",
  "hson-demo2:test:soft-tile-node",
  "hson-demo2:test:external-launcher-protocol-node",
  "hson-demo2:test:external-launcher-manifest-audit-node",
  "hson-demo2:test:runner-truthfulness-node",
  "hson-demo2:test:splash-lifecycle-node",
  "hson-demo2:test:presentation-cleanup-node",
  "hson-demo2:test:node-process-supervisor",
  "hson-demo2:test:hosted-cloudflare",
  "hson-demo2:build",
  "hson-demo2:check",
  "hson-demo2:build:node-production",
  "hson-demo2:check:cloudflare",
  "hson-demo2:cloudflare:types",
  "hson-demo2:test:surface-enumeration-node",
  "hson-demo2:test:stage2-contracts-node",
  "hson-demo2:test:stage3-discovery-node",
  "hson-demo2:test:stage4a-selected-node",
  "hson-demo2:test:stage4b-panel-node",
  "hson-demo2:test:phase1-convergence-node",
  "hson-demo2:test:phase2a-lifecycle-node",
  "hson-demo2:test:phase2b-presentation-node",
  "hson-demo2:test:phase4a-layering-node",
  "hson-demo2:test:phase4b-retirement-node",
] as const);

/** Command entrypoints whose semantic work is already exactly selectable in the Node Locus catalog. */
export const NODE_HOSTED_SEMANTIC_ALIAS_SURFACE_IDS = Object.freeze([
  "hson-live:fixture:default-identity-runtime",
  "hson-demo2:test:towl",
  "hson-demo2:test:towl-room",
  "hson-demo2:test:replay-node",
  "hson-demo2:test:phase3b-cancellation-node",
  "hson-demo2:test:phase3b-process-cancellation-node",
  "hson-demo2:test:phase3b-panel-cancellation-node",
  "hson-demo2:test:node-application-host",
  "hson-demo2:test:circuit-worker-service",
  "hson-demo2:test:circuit-livehost-integration",
  "hson-demo2:test:circuit-worker-parity",
  "hson-demo2:test:parsing-verification-coordinator",
  "hson-demo2:test:parsing-browser-certificate",
  "hson-demo2:test:livetree-lifecycle-foundations-node",
  "hson-demo2:test:livetree-lifecycle-public-node",
  "hson-demo2:test:livetree-lifecycle-ownership-node",
  "hson-demo2:test:livetree-allocation-node",
  "hson-demo2:test:hson-node-representation-node",
  "hson-demo2:test:external-library-node",
  "hson-demo2:test:external-library-all-node",
  "hson-demo2:test:inclusive-library-node",
  "hson-demo2:test:hosted-dom-compatibility-node",
] as const);

export const NODE_VERIFICATION_ONLY_SURFACE_IDS = Object.freeze([
  "hson-live:test:diagnostics-inventory",
  "hson-demo2:diagnose:towl-deployed",
  "hson-demo2:test:stage4a-selected-worker",
  "hson-demo2:test:stage5a-corpus-node",
  "hson-demo2:test:phase6a-node-hosted",
  "hson-demo2:test:phase6a-full-node-hosted",
  "hson-demo2:test:phase6b-browser-executor",
  "hson-demo2:test:phase6b-browser-cancellation",
  "hson-demo2:test:phase6b-mixed-run",
  "hson-demo2:test:phase6b-full-browser-hosted",
] as const);

export type NodeCommandSurfaceTarget = Readonly<{
  id: string;
  sourceCatalogId: string;
  title: string;
  subject: TestSubject;
  provenance: "hson-live" | "hson-demo2";
  sourceRef: string;
  requirements: readonly TestCapability[];
  order: number;
  cwd: string;
  command: string;
  args: readonly string[];
  environment: Readonly<Record<string, string>>;
  timeoutMs: number;
  h2?: Readonly<{ hsonLiveRoot: string; hsonDemo2Root: string; testHooks?: H2ExecutorTestHooks }>;
}>;

export type NodeCommandSurfaceAvailability = Readonly<{
  targets: readonly NodeCommandSurfaceTarget[];
  unavailable: readonly Readonly<{ sourceCatalogId: string; reason: string }>[];
}>;

const SUBJECT_BY_CATEGORY: Readonly<Record<TestSurfaceCatalogEntry["category"], TestSubject>> = Object.freeze({
  Transforms: "transform",
  LiveTree: "livetree",
  LiveMap: "livemap",
  Reflect: "reflect",
  Locus: "livehost",
  LiveInspector: "integration",
  "Application / Demo": "livedemo",
  "Hosted Runtime": "livehost",
  "Real WebSocket": "livehost",
  "Build / Types": "integration",
});

function suite_id(entry: TestSurfaceCatalogEntry): string {
  const repository = entry.repository === "hson-live" ? "library" : "demo";
  const command = entry.id.slice(entry.id.indexOf(":") + 1).replaceAll(":", "-");
  return `verification/${repository}/${command}`;
}

function requirements(entry: TestSurfaceCatalogEntry): readonly TestCapability[] {
  const text = `${entry.id} ${entry.environment} ${entry.transport}`.toLowerCase();
  const values: TestCapability[] = ["javascript", "node", "process", "filesystem"];
  if (text.includes("synthetic dom") || text.includes("jsdom")) values.push("synthetic-dom");
  if (text.includes("canvas")) values.push("synthetic-dom", "synthetic-canvas");
  if (text.includes("websocket")) values.push("websocket", "network");
  if (text.includes("application-host-entry") || text.includes("bootstrap-integration")) values.push("local-server");
  if (entry.id.includes("generated-json")) values.push("dynamic-generated");
  return Object.freeze([...new Set(values)]);
}

export function resolve_node_command_surfaces(options: Readonly<{
  demoRoot: string;
  hsonLiveRoot?: string;
  /** Private hosted-harness seam for lifecycle certification. */
  h2TestHooks?: H2ExecutorTestHooks;
}>): NodeCommandSurfaceAvailability {
  const byId = new Map(TEST_SURFACE_CATALOG.map((entry) => [entry.id, entry]));
  const targets: NodeCommandSurfaceTarget[] = [];
  const unavailable: Array<{ sourceCatalogId: string; reason: string }> = [];
  for (const [order, sourceCatalogId] of NODE_HOSTED_COMMAND_SURFACE_IDS.entries()) {
    const entry = byId.get(sourceCatalogId);
    if (entry === undefined) throw new Error(`NODE_COMMAND_SURFACE_UNKNOWN: ${sourceCatalogId}`);
    const cwd = entry.repository === "hson-live" ? options.hsonLiveRoot : options.demoRoot;
    if (cwd === undefined) {
      unavailable.push({
        sourceCatalogId,
        reason: "hson-live repository root is unavailable",
      });
      continue;
    }
    if ((H2_VERIFICATION_IDS as readonly string[]).includes(sourceCatalogId)) {
      if (options.hsonLiveRoot === undefined) throw new Error("H2_HSON_LIVE_ROOT_UNAVAILABLE");
      targets.push(Object.freeze({
        id: suite_id(entry), sourceCatalogId, title: entry.label, subject: SUBJECT_BY_CATEGORY[entry.category], provenance: entry.repository,
        sourceRef: `node-command:${sourceCatalogId}`, requirements: requirements(entry), order: 20_000 + order, cwd, command: process.execPath,
        args: Object.freeze([]), environment: Object.freeze({}), timeoutMs: 180_000,
        h2: Object.freeze({ hsonLiveRoot: options.hsonLiveRoot, hsonDemo2Root: options.demoRoot,
          ...(options.h2TestHooks === undefined ? {} : { testHooks: options.h2TestHooks }) }),
      }));
      continue;
    }
    targets.push(Object.freeze({
      id: suite_id(entry),
      sourceCatalogId,
      title: entry.label,
      subject: SUBJECT_BY_CATEGORY[entry.category],
      provenance: entry.repository,
      sourceRef: `node-command:${sourceCatalogId}`,
      requirements: requirements(entry),
      order: 20_000 + order,
      cwd,
      command: process.execPath,
      args: Object.freeze(["--import", NODE_TSX_IMPORT_PATH, entry.path]),
      environment: Object.freeze({}),
      timeoutMs: 180_000,
    }));
  }
  return Object.freeze({
    targets: Object.freeze(targets),
    unavailable: Object.freeze(unavailable.map((entry) => Object.freeze(entry))),
  });
}

export function node_command_suite_descriptor(target: NodeCommandSurfaceTarget): TestSuiteDescriptor {
  return Object.freeze({
    id: target.id,
    title: target.title,
    subject: target.subject,
    collections: Object.freeze(["dev"] as const),
    provenance: target.provenance,
    order: target.order,
    requirements: Object.freeze([...target.requirements]),
    executionShape: "certification-aggregate",
    sourceRef: target.sourceRef,
    declaredChecks: 1,
  });
}

export function resolve_node_command_binding(
  availability: NodeCommandSurfaceAvailability,
  descriptor: TestSuiteDescriptor,
): NodeCommandSurfaceTarget {
  if (descriptor.executionShape !== "certification-aggregate"
    || descriptor.sourceRef === undefined
    || !descriptor.sourceRef.startsWith("node-command:")) {
    throw new Error(`HOSTED_TEST_COMMAND_DESCRIPTOR_INVALID: ${descriptor.id}`);
  }
  const matches = availability.targets.filter((target) => target.sourceRef === descriptor.sourceRef);
  if (matches.length !== 1 || matches[0]?.id !== descriptor.id || descriptor.declaredChecks !== 1) {
    throw new Error(`HOSTED_TEST_COMMAND_BINDING_INVALID: ${descriptor.id} resolved to ${matches.length} targets.`);
  }
  return matches[0];
}
