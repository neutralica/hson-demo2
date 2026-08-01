import type { HsonLiveTestLauncher } from "hson-live/test-launchers";
import type { TestSubject } from "./test-contracts";

/** Descriptor-only projection of an external library launcher. */
export type ExternalLibraryLauncherTarget = Readonly<{
  id: string;
  launcherId: string;
  subject: TestSubject;
  displayName: string;
  runtime: HsonLiveTestLauncher["runtime"];
  executableChecks: number;
  collections: readonly string[];
}>;
