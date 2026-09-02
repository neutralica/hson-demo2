import type { TestCapability, TestSubject, TestSuiteDescriptor } from "../../../../src/shared/testing/test-contracts";
import { H2_VERIFICATION_IDS, resolve_h2_verification, type H2ExecutorTestHooks } from "./h2-isolated-verification";

/** Neutral supervised-command binding retained for later control-plane wrappers. */
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

/** Projects the existing fixed H2 control-plane registry without maintaining a second command inventory. */
export function resolve_h2_command_surfaces(options: Readonly<{
  demoRoot: string;
  hsonLiveRoot?: string;
  h2TestHooks?: H2ExecutorTestHooks;
}>): NodeCommandSurfaceAvailability {
  const targets: NodeCommandSurfaceTarget[] = [];
  const unavailable: Array<{ sourceCatalogId: string; reason: string }> = [];
  for (const [order, sourceCatalogId] of H2_VERIFICATION_IDS.entries()) {
    const descriptor = resolve_h2_verification(sourceCatalogId);
    const cwd = descriptor.scope === "hson-live" ? options.hsonLiveRoot : options.demoRoot;
    if (cwd === undefined || options.hsonLiveRoot === undefined) {
      unavailable.push({ sourceCatalogId, reason: "hson-live repository root is unavailable" });
      continue;
    }
    targets.push(Object.freeze({
      id: `verification/${descriptor.scope === "hson-live" ? "library" : "demo"}/${descriptor.packageScript.replaceAll(":", "-")}`,
      sourceCatalogId,
      title: descriptor.packageScript.replace(/^test:/, "").replaceAll("-", " "),
      subject: "integration",
      provenance: descriptor.scope,
      sourceRef: `node-command:${sourceCatalogId}`,
      requirements: Object.freeze(["javascript", "node", "process", "filesystem"] as const),
      order: 20_000 + order,
      cwd,
      command: process.execPath,
      args: Object.freeze([]),
      environment: Object.freeze({}),
      timeoutMs: descriptor.timeoutMs,
      h2: Object.freeze({
        hsonLiveRoot: options.hsonLiveRoot,
        hsonDemo2Root: options.demoRoot,
        ...(options.h2TestHooks === undefined ? {} : { testHooks: options.h2TestHooks }),
      }),
    }));
  }
  return Object.freeze({ targets: Object.freeze(targets), unavailable: Object.freeze(unavailable.map((entry) => Object.freeze(entry))) });
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
