import type { JsonValue, LivePath } from "hson-live/types";
import type { HostedTestRunTarget } from "./hosted-test-suite-contract";

export type HostedTestRunId = string;

export type HostedTestWireUndefined = Readonly<{ kind: "undefined" }>;
export type HostedTestWireJsonValue = Readonly<{ kind: "value"; value: JsonValue }>;
export type HostedTestWireValue = HostedTestWireUndefined | HostedTestWireJsonValue;

export type HostedTestReportWireSetOp = Readonly<{
  kind: "set";
  path: LivePath;
  prev: HostedTestWireValue;
  next: HostedTestWireJsonValue;
}>;

export type HostedTestReportWireDeleteOp = Readonly<{
  kind: "delete";
  path: LivePath;
  prev: HostedTestWireValue;
  next: HostedTestWireUndefined;
}>;

export type HostedTestReportWireReplaceOp = Readonly<{
  kind: "replace";
  path: LivePath;
  prev: HostedTestWireValue;
  next: HostedTestWireJsonValue;
}>;

export type HostedTestReportWireSpliceOp = Readonly<{
  kind: "splice";
  path: LivePath;
  start: number;
  removed: readonly JsonValue[];
  inserted: readonly JsonValue[];
  prev: HostedTestWireJsonValue;
  next: HostedTestWireJsonValue;
}>;

export type HostedTestReportWireRenameOp = Readonly<{
  kind: "rename";
  path: LivePath;
  from: string;
  to: string;
  prev: HostedTestWireJsonValue;
  next: HostedTestWireJsonValue;
}>;

export type HostedTestReportWireMoveOp = Readonly<{
  kind: "move";
  path: LivePath;
  from: number;
  to: number;
  prev: HostedTestWireJsonValue;
  next: HostedTestWireJsonValue;
}>;

export type HostedTestReportWireOp =
  | HostedTestReportWireSetOp
  | HostedTestReportWireDeleteOp
  | HostedTestReportWireReplaceOp
  | HostedTestReportWireSpliceOp
  | HostedTestReportWireRenameOp
  | HostedTestReportWireMoveOp;

export type HostedTestReportCommitEnvelope = Readonly<{
  type: "hosted-test-report-commit";
  runId: HostedTestRunId;
  suite: HostedTestRunTarget;
  prevRev: number;
  rev: number;
  ops: readonly HostedTestReportWireOp[];
}>;

export type HostedTestReportCommitSequenceExpected = Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestRunTarget;
  prevRev: number;
}>;
