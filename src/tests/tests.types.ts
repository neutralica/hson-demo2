// tests.types.ts

export type TestStatus = "pass" | "fail" | "skip";

export type TestEvent =
  | { t: "suite_begin"; suite: string; totalPlanned?: number }
  | { t: "case_begin"; suite: string; name: string; meta?: Record<string, string> }
  | { t: "case_end"; suite: string; name: string; status: TestStatus; ms: number; err?: string }
  | { t: "suite_end"; suite: string; ms: number };

export type TestFailure = Readonly<{
  suite: string;
  name: string;
  err: string;
  ms: number;
  meta?: Record<string, string>;
}>;

export type TestSummary = Readonly<{
  suites: number;
  cases: number;
  pass: number;
  fail: number;
  skip: number;
  msTotal: number;
  failures: readonly TestFailure[];
}>;
