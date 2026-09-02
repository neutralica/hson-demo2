import type { TestCapability, TestCollection, TestSuiteDescriptor, TestSubject } from "./test-contracts";

export type HsonLiveExecutableRuntime = "node" | "node-synthetic-dom" | "node-websocket" | "node-real-websocket" | "node-real-websocket-process";

/** Descriptor-only projection of an external library launcher. */
export type ExternalLibraryLauncherTarget = Readonly<{
  id: string; // canonical semantic suite ID
  launcherId: string;
  sourceRef: string;
  /** Repository-relative executable source discovered statically. */
  sourceFile: string;
  /** Source-owned navigation category from HSON_LIVE_TEST_METADATA. */
  category: string;
  subject: TestSubject;
  displayName: string;
  runtime: HsonLiveExecutableRuntime;
  collections: readonly TestCollection[];
  tags: readonly string[];
  requirements: readonly TestCapability[];
  order: number;
}>;

export function external_launcher_suite_descriptor(
  target: ExternalLibraryLauncherTarget,
): TestSuiteDescriptor {
  return Object.freeze({
    id: target.id,
    title: target.displayName,
    subject: target.subject,
    collections: Object.freeze([...target.collections]),
    provenance: "hson-live",
    order: target.order,
    requirements: Object.freeze([...target.requirements]),
    executionShape: "cases",
    sourceRef: target.sourceRef,
  });
}
