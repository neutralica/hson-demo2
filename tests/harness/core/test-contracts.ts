// tests.types.ts

import type { Artifact, FixtureAtom, LoopOpts, LoopReport } from "hson-live/diagnostics";
import type {
  CaseMeta,
  TestDescriptorMetadata,
  TestDescriptorMetadataOverride,
  TestSummary,
  TestSubject,
} from "../../../src/shared/testing/test-contracts";

export type Named<T> = Readonly<{ name: string; value: T; }>;

export type TestStatus = "pass" | "fail" | "skip";
export type TestExpected = "ok" | "fail";
export type TestExpectedError = Readonly<{
  message?: string;
  includes?: string;
}>;

// allow runner to attach derived diagnostics after executing the case
export type TestEvent =
  | { t: "suite_begin"; suite: string; totalPlanned?: number }
  | { t: "suite_end"; suite: string; ms: number }
  | { t: "case_begin"; suite: string; caseId: string; name: string; meta?: Record<string, string> }
  | {
    t: "case_end";
    suite: string;
    caseId: string;
    name: string;
    status: TestStatus;
    ms: number;
    err?: string;
    assertRows?: readonly TestAssertRow[];
    expected?: TestExpected;
    metaPatch?: Record<string, string>; // ADDED
  }
  | {
    t: "case_cancelled";
    suite: string;
    caseId: string;
    name: string;
    ms: number;
  }
  | {
    t: "external_state";
    id: string;
    suite: string;
    name: string;
    subject: TestSubject;
    runtime: string;
    executableChecks: number;
    collections: readonly string[];
    status: "queued" | "running";
  }
  | {
    t: "external_end";
    id: string;
    suite: string;
    name: string;
    subject: TestSubject;
    runtime: string;
    executableChecks: number;
    collections: readonly string[];
    status: "pass" | "fail" | "cancelled";
    ms: number;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
    spawnError?: string;
    completion?: Readonly<{
      version: 1;
      launcherId: string;
      executed: number;
      passed: number;
      failed: number;
    }>;
    completionError?: string;
    completionAcceptedBeforeCancellation?: boolean;
    ordinaryStdout?: string;
    stdoutBytes?: number;
    stderrBytes?: number;
    stdoutTruncated?: boolean;
    stderrTruncated?: boolean;
  };

export type TestCase = Readonly<{
  suite: string;
  caseId: string;
  name: string;
  descriptor?: TestDescriptorMetadataOverride;
  meta?: Record<string, string>;
  expected?: TestExpected;
  expectedError?: TestExpectedError;
  timeoutMs?: number;
  run: () => void | RunCaseRet | Promise<void | RunCaseRet>;
  cleanup?: () => void | Promise<void>;
}>;

export type RunCaseRet = Readonly<{
  metaPatch?: Record<string, string>;
  assertRows?: readonly TestAssertRow[];
}>;

export type TestSuite = Readonly<{
  suite: string;
  descriptor?: TestDescriptorMetadata;
  timeoutMs?: number;
  setup?: () => void | Promise<void>;
  cases: readonly TestCase[];
}>;


export type RunOptions = Readonly<{
  bail?: boolean; // stop on first failure
  filterSuite?: string; // exact match
  filterCase?: string; // substring match
  yieldEveryCases?: number;  // e.g. 1 = every case, 5 = every 5 cases
  yieldAfterMs?: number; // elapsed execution budget between event-loop yields
  yieldBetweenSuites?: boolean;
  includePassedDiagnostics?: boolean;
  caseTimeoutMs?: number;
  signal?: AbortSignal;
}>;

export type RunResult = Readonly<{
  ok: boolean;
  summary: TestSummary;
  /** Internal executor truth: semantic completion did not win the authority race. */
  cancelled?: true;
}>;

export type CaseKey = `${string}::${string}`; // suiteId::caseId

export type CaseLog = Readonly<{
  key: CaseKey;
  suite: string;
  caseId: string; name: string;
  status?: TestStatus;
  ms?: number;
  err?: string;
  meta?: CaseMeta;
  assertRows?: readonly TestAssertRow[];
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
  _circuit_test: (atom: FixtureAtom, opts?: Partial<LoopOpts>) => LoopReport;
}>;


export type BuildSuitesOpts = Readonly<{
  seed?: number;
  genHtmlCount?: number;
  genJsonCount?: number;
}>;

export type StepName =
  | "enter"
  | "emit:json" | "parse:json"
  | "emit:hson" | "parse:hson"
  | "emit:html" | "parse:html"
  | "diff";

export type StepLog = Readonly<{
  i: number;
  ok: boolean;
  step: StepName;
  label: string;          // nice label for humans
  note?: string;          // optional details (e.g. “normalized CRLF→LF”)
  artifacts?: readonly Artifact[];
  err?: string;
}>;

export type CaseReport = Readonly<{
  key: CaseKey;
  suite: string;
  caseId: string; name: string;
  status: "pass" | "fail" | "skip";
  ms?: number;

  steps: readonly StepLog[];
  assertRows?: readonly TestAssertRow[];

  summaryLine: string;

  norms?: readonly string[];
  hashes?: Readonly<{
    in_raw?: string;
    in_canon?: string;
    out_raw?: string;
    out_canon?: string;

  }>;
}>;

export type TransFxtrFmt = "html" | "json" | "hson";


export interface JObj {
  readonly [k: string]: Jsonish;
}

export interface JArr extends ReadonlyArray<Jsonish> { }

export type FixtureFmt = "html" | "json" | "hson";

export type Fixture = Readonly<{
  name: string;
  fmt: FixtureFmt;
  atom: FixtureAtom;
  tags?: readonly string[];
}>;

export type FixtureBag = Readonly<Record<string, Fixture>>;
export type JPrim = null | boolean | number | string;

export interface JArr extends ReadonlyArray<Jsonish> { }

export type Jsonish = JPrim | JArr | JObj;

export type Rng = () => number;

export type Gen<T> = Readonly<{
  name: string;
  sample: (rnd: Rng) => T;
}>;
export type MetaPatch = Record<string, string>;

export type Asserter = Readonly<{
  ok: (label: string, condition: unknown) => void;
  eq: (label: string, got: unknown, want: unknown) => void;
  neq: (label: string, got: unknown, notWant: unknown) => void;
  
  // Useful for DOM checks without exploding when missing:
  hasAttr: (label: string, el: Element | null | undefined, attr: string) => void;
  attrEq: (
    label: string,
    el: Element | null | undefined,
    attr: string,
    want: string | null
  ) => void;
  
  outcomeOk: (label: string, maybeOutcome: unknown) => void;
}>;

export type TestAssertRow = Readonly<{
  ok: boolean;
  label: string;
  actual?: unknown;
  expected?: unknown;
}>;
