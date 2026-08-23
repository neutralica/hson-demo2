export const TEST_LIFECYCLE_STATUSES = Object.freeze([
  "queued",
  "running",
  "pass",
  "fail",
  "skip",
  "unsupported",
  "cancelled",
] as const);

export type TestLifecycleStatus = typeof TEST_LIFECYCLE_STATUSES[number];
export type TestLifecycleTerminalStatus = Exclude<TestLifecycleStatus, "queued" | "running">;

export const TEST_ERROR_KINDS = Object.freeze([
  "assertion",
  "suite",
  "infrastructure",
  "protocol",
  "timeout",
  "cancelled",
] as const);

export type TestErrorKind = typeof TEST_ERROR_KINDS[number];

export type TestLifecycleError = Readonly<{
  kind: TestErrorKind;
  message: string;
  stack?: string;
  expected?: string;
  actual?: string;
}>;

export type TestLifecycleCounts = Readonly<{
  declared: number;
  total: number;
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
  unsupported: number;
  cancelled: number;
}>;

export type TestOpaqueExecutionEvidence = Readonly<{
  id: string;
  name: string;
  subject: string;
  runtime: string;
  executableChecks: number;
  collections: readonly string[];
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  signal?: string | null;
  timedOut?: boolean;
  spawnError?: string | null;
}>;

export type TestLifecycleEventBase = Readonly<{
  runId: string;
  executorId: string;
  sequence: number;
  timestamp: number;
}>;

export type TestLifecycleEvent =
  | (TestLifecycleEventBase & Readonly<{ t: "run_planned"; suiteIds: readonly string[] }>)
  | (TestLifecycleEventBase & Readonly<{ t: "suite_queued"; suiteId: string }>)
  | (TestLifecycleEventBase & Readonly<{ t: "suite_started"; suiteId: string; opaque?: TestOpaqueExecutionEvidence }>)
  | (TestLifecycleEventBase & Readonly<{
      t: "suite_finished";
      suiteId: string;
      status: TestLifecycleTerminalStatus;
      durationMs: number;
      counts?: TestLifecycleCounts;
      errors?: readonly TestLifecycleError[];
      opaque?: TestOpaqueExecutionEvidence;
    }>)
  | (TestLifecycleEventBase & Readonly<{ t: "case_queued"; suiteId: string; caseId: string }>)
  | (TestLifecycleEventBase & Readonly<{ t: "case_started"; suiteId: string; caseId: string; title?: string }>)
  | (TestLifecycleEventBase & Readonly<{
      t: "case_finished";
      suiteId: string;
      caseId: string;
      title?: string;
      status: TestLifecycleTerminalStatus;
      durationMs: number;
      error?: TestLifecycleError;
      /** Internal hosted original-run structured case diagnostic. */
      diagnostic?: import("../hosted-tests/hosted-test-action.types").HostedTestCaseDiagnostic;
    }>)
  | (TestLifecycleEventBase & Readonly<{
      t: "output";
      suiteId: string;
      caseId?: string;
      stream: "stdout" | "stderr" | "runtime_warning";
      text: string;
      truncated?: boolean;
      knownBytes?: number;
    }>)
  | (TestLifecycleEventBase & Readonly<{
      t: "artifact";
      suiteId: string;
      caseId?: string;
      kind: "raw_process_output" | "protocol_control" | "artifact";
      name: string;
      content: string;
      reference?: string;
      mediaType?: string;
      truncated?: boolean;
      knownBytes?: number;
    }>)
  | (TestLifecycleEventBase & Readonly<{
      t: "infrastructure_error";
      suiteId?: string;
      caseId?: string;
      error: TestLifecycleError;
    }>)
  | (TestLifecycleEventBase & Readonly<{
      t: "run_finished";
      status: "pass" | "fail" | "cancelled";
      durationMs: number;
    }>);
