// tests.types.ts

import type { FixtureAtom, LoopOpts, LoopReport } from "../../../hson-live/dist/diagnostics/loop-3.test";


export type TestStatus = "pass" | "fail" | "skip";

// allow runner to attach derived diagnostics after executing the case
export type TestEvent =
  | { t: "suite_begin"; suite: string; totalPlanned?: number }
  | { t: "suite_end"; suite: string; ms: number }
  | { t: "case_begin"; suite: string; name: string; meta?: Record<string, string> }
  | {
      t: "case_end";
      suite: string;
      name: string;
      status: TestStatus;
      ms: number;
      err?: string;
      metaPatch?: Record<string, string>; // ADDED
    };

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

export type TestCase = Readonly<{
  suite: string;
  name: string;
  meta?: Record<string, string>;
  run: () => void | RunCaseRet | Promise<void | RunCaseRet>; 
}>;

export type RunCaseRet = Readonly<{
  metaPatch?: Record<string, string>;
}>;

export type TestSuite = Readonly<{
  suite: string;
  cases: readonly TestCase[];
}>;


export type TestRunMode =
  | "all"
  | "generated"
  | "legacy"
  | "dev"

  export type CaseMeta = Readonly<{
  fixture?: string;
  sub?: string;
  preview?: string;      // snipped
  // later:
  // reportId?: string;  // lookup key into a side-store
}>;


export type RunOptions = Readonly<{
  bail?: boolean; // stop on first failure
  filterSuite?: string; // exact match
  filterCase?: string; // substring match
}>;

export type RunResult = Readonly<{
  ok: boolean;
  summary: TestSummary;
}>;

// reuse encoder to avoid alloc spam
// const _ENC = new TextEncoder();
// const bytes_of = (txt: string): number => {
//   if (!txt) return 0;
//   return _ENC.encode(txt).length;
// };
// const kb_str = (bytes: number): string => {
//   if (!bytes) return "—";
//   return (bytes / 1024).toFixed(1);
// };

export type InspectorUi = Readonly<{
  render: () => void;
  show: () => void;
  hide: () => void;
  clear: () => void;
}>;

export type UiLevel = "quiet" | "normal";
export type CaseKey = `${string}::${string}`; // suite::name

export type CaseLog = Readonly<{
  key: CaseKey;
  suite: string;
  name: string;
  status?: TestStatus;
  ms?: number;
  err?: string;
  meta?: Record<string, string>;
}>;

export type SuiteLog = Readonly<{
  suite: string;
  totalPlanned?: number;
  cases: readonly CaseKey[];
  pass: number;
  fail: number;
  skip: number;
  ms?: number;
}>;
// fixtures are now always grouped bundles (2-level)

export type FixtureMap = Readonly<Record<string, FixtureAtom>>;
export type FixtureBundle = Readonly<Record<string, FixtureMap>>;

export type HsonTestApi = Readonly<{
  _test_full_loop: (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;
}>;


export type BuildSuitesOpts = Readonly<{
  seed?: number;
  genHtmlCount?: number;
  genJsonCount?: number;
}>;