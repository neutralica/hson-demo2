import type { TestCapability } from "./test-contracts";

export type TestExecutorCapabilities = Readonly<{
  provides: readonly TestCapability[];
}>;

export type TestExecutorKind = "node" | "cloudflare-worker" | "browser";
export type TestExecutorLocation = "hosted" | "local";

export type TestExecutorDescriptor = Readonly<{
  id: string;
  kind: TestExecutorKind;
  label: string;
  location: TestExecutorLocation;
  capabilities: TestExecutorCapabilities;
  supportsStreaming: boolean;
  supportsCancellation: boolean;
}>;
