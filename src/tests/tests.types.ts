// tests.types.ts

import type { LiveTree } from "hson-live";
import type { Artifact, LoopReport } from "hson-live/diagnostics";
import type { FixtureAtom, LoopOpts } from "../../../hson-live/dist/types/diagnostics.types";

export type Named<T> = Readonly<{ name: string; value: T; }>;

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
    assertRows?: readonly TestAssertRow[];
    metaPatch?: Record<string, string>; // ADDED
  };

export type TestFailure = Readonly<{
  suite: string;
  name: string;
  err: string;
  ms: number;
  meta?: CaseMeta;
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
  | "transform"
  | "livetree"
  | "legacy"
  | "dev"
  | "unit"

export type CaseMeta = Readonly<{
  fixture?: string;
  sub?: string;
  preview?: string;      // (snipped)
  input?: string;
  reportId?: Artifact;  // lookup key
  category?: string;
  assertRows?: string;
}>;


export type RunOptions = Readonly<{
  bail?: boolean; // stop on first failure
  filterSuite?: string; // exact match
  filterCase?: string; // substring match
  yieldEveryCases?: number;  // e.g. 1 = every case, 5 = every 5 cases
  yieldBetweenSuites?: boolean;
}>;

export type RunResult = Readonly<{
  ok: boolean;
  summary: TestSummary;
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
  meta?: CaseMeta;
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
  name: string;
  status: "pass" | "fail" | "skip";
  ms?: number;

  steps: readonly StepLog[];

  summaryLine: string;

  norms?: readonly string[];
  hashes?: Readonly<{
    in_raw?: string;
    in_canon?: string;
    out_raw?: string;
    out_canon?: string;

  }>;
}>;

// src/tests/livetree-suite.types.ts
export type LiveTreeFx = {
  name: string;
  html: string;
  run: (tree: LiveTree) => void | Promise<void>;
  assert: (tree: LiveTree) => void;
  preview?: string;           // short inspector snippet
  inputLabel?: string;        // optional: “attrs / text / append”
};

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

export type LiveTreeCaseSpec = Readonly<{
  suite: string;
  name: string;

  // "input" is your fixture HTML for inspector
  html: string;

  // Optional: label shown in inspector meta
  fixture?: string;
  sub?: string;
  dom?: boolean;
  // Arrange/Act: mutate tree
  act: (tree: LiveTree) => void | Promise<void>;

  // Assert: use the `t` helper below (pedantic, multi-check)
  assert: (tree: LiveTree, t: Asserter) => void | Promise<void>;

  // Optional: customize what gets shown in preview
  preview?: (tree: LiveTree) => string;
}>;

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
  actual?: string;
  expected?: string;
}>;