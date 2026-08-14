import type { HsonLiveTestLauncher } from "hson-live/test-launchers";
import type { TestCapability, TestCollection, TestSuiteDescriptor, TestSubject } from "./test-contracts";

/** Descriptor-only projection of an external library launcher. */
export type ExternalLibraryLauncherTarget = Readonly<{
  id: string; // canonical semantic suite ID
  launcherId: string;
  sourceRef: string;
  subject: TestSubject;
  displayName: string;
  runtime: HsonLiveTestLauncher["runtime"];
  executableChecks: number;
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
    executionShape: "opaque-aggregate",
    sourceRef: target.sourceRef,
    declaredChecks: target.executableChecks,
  });
}
