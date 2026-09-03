import type {
  TestCollection,
  TestExecutionShape,
  TestProvenance,
  TestSubject,
} from "./test-contracts";

export const TERMINAL_STATUSES = Object.freeze([
  "pass",
  "fail",
  "skip",
  "unsupported",
  "cancelled",
  "error",
] as const);

export type TerminalStatus = typeof TERMINAL_STATUSES[number];
export type ReportTotals = Readonly<Record<TerminalStatus, number> & { cases: number; suites: number }>;

export function empty_totals(): ReportTotals {
  return Object.freeze({ pass: 0, fail: 0, skip: 0, unsupported: 0, cancelled: 0, error: 0, cases: 0, suites: 0 });
}

export function reduce_status(statuses: readonly TerminalStatus[]): TerminalStatus {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("cancelled")) return "cancelled";
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("pass")) return "pass";
  if (statuses.includes("unsupported")) return "unsupported";
  return "skip";
}

export type PlannedTestCase = Readonly<{
  id: string;
  caseId: string;
  title: string;
  order: number;
}>;

export type PlannedTestSuite = Readonly<{
  id: string;
  title: string;
  subject: TestSubject;
  collections: readonly TestCollection[];
  provenance: TestProvenance;
  order: number;
  executionShape: TestExecutionShape;
  executorId?: string;
  sourceRef?: string;
  cases: readonly PlannedTestCase[];
}>;

export type TestRunPlan = Readonly<{
  runId: string;
  protocolVersion: number;
  catalogVersion: string;
  executorId: string;
  selectionIds: readonly string[];
  suites: readonly PlannedTestSuite[];
}>;
