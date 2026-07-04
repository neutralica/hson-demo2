import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import { _freeze } from "./tests.consts";
import type { TestEvent, TestSummary, SuiteLog, CaseLog, CaseKey, TestFailure } from "./tests.types";

export type TestLog = Readonly<{
  onEvent: (e: TestEvent) => void;

  // "tiny UI" access
  getSummary: () => TestSummary;
  getActiveSuite: () => string | undefined;
  getLastLine: () => string;

  // "inspector" access
  listSuites: () => readonly SuiteLog[];
  listCases: (suite: string) => readonly CaseLog[];
  getCase: (key: CaseKey) => CaseLog | undefined;
  listFailures: () => readonly TestFailure[];

  clear: () => void;
}>;

type SuiteLogState = {
  suite: string;
  totalPlanned?: number;
  caseKeys: CaseKey[];
  pass: number;
  fail: number;
  skip: number;
  ms?: number;
};

type TestLogState = {
  activeSuite: string | null;
  casesByKey: Record<CaseKey, CaseLog>;
  caseKeysBySuite: Record<string, CaseKey[]>;
  suitesByName: Record<string, SuiteLogState>;
  failures: TestFailure[];
  summary: {
    suites: number;
    cases: number;
    pass: number;
    fail: number;
    skip: number;
    msTotal: number;
  };
  lastLine: string;
};

type TestEventWithAssertRows = TestEvent & Readonly<{
  assertRows?: readonly unknown[];
}>;

type TestLogMutation = Readonly<{
  kind: "set";
  path: readonly (string | number)[];
  value: JsonValue;
}>;

function make_initial_test_log_state(): TestLogState {
  return {
    activeSuite: null,
    casesByKey: {},
    caseKeysBySuite: {},
    suitesByName: {},
    failures: [],
    summary: {
      suites: 0,
      cases: 0,
      pass: 0,
      fail: 0,
      skip: 0,
      msTotal: 0,
    },
    lastLine: "idle",
  };
}

function as_json(value: unknown): JsonValue {
  return value as JsonValue;
}

export function create_test_log(): TestLog {
  const logState = hson.liveMap.fromJson(make_initial_test_log_state() as unknown as JsonValue);

  const key = (suite: string, name: string): CaseKey => `${suite}::${name}`;

  const read = <T>(path: readonly (string | number)[]): T | undefined => {
    return logState.at(path).snap() as unknown as T | undefined;
  };

  const set = (
    mutations: TestLogMutation[],
    path: readonly (string | number)[],
    value: unknown,
  ): void => {
    mutations.push({ kind: "set", path, value: as_json(value) });
  };

  const commit = (mutations: TestLogMutation[]): void => {
    logState.batch((tx) => {
      for (const mutation of mutations) {
        tx.set(mutation.path, mutation.value);
      }
    });
  };

  const emptySummary = (): TestLogState["summary"] => ({
    suites: 0,
    cases: 0,
    pass: 0,
    fail: 0,
    skip: 0,
    msTotal: 0,
  });

  const getSummaryState = (): TestLogState["summary"] => {
    return read<TestLogState["summary"]>(["summary"]) ?? emptySummary();
  };

  const makeSuite = (suite: string): SuiteLogState => ({
    suite,
    caseKeys: [],
    pass: 0,
    fail: 0,
    skip: 0,
  });

  const getSuite = (suite: string): SuiteLogState => {
    return read<SuiteLogState>(["suitesByName", suite]) ?? makeSuite(suite);
  };

  const clear = (): void => {
    const next = make_initial_test_log_state();

    logState.batch((tx) => {
      tx.set(["activeSuite"], next.activeSuite);
      tx.set(["casesByKey"], next.casesByKey);
      tx.set(["caseKeysBySuite"], next.caseKeysBySuite);
      tx.set(["suitesByName"], next.suitesByName);
      tx.set(["failures"], next.failures);
      tx.set(["summary"], next.summary);
      tx.set(["lastLine"], next.lastLine);
    });
  };

  const onEvent = (e: TestEvent): void => {
    const mutations: TestLogMutation[] = [];

    if (e.t === "suite_begin") {
      const summary = getSummaryState();
      set(mutations, ["activeSuite"], e.suite);
      set(mutations, ["summary"], { ...summary, suites: summary.suites + 1 });

      const existing = read<SuiteLogState>(["suitesByName", e.suite]);
      const base = existing ?? makeSuite(e.suite);
      const withPlanned = e.totalPlanned !== undefined
        ? { ...base, totalPlanned: e.totalPlanned }
        : base;

      set(mutations, ["suitesByName", e.suite], withPlanned);
      if (!existing) set(mutations, ["caseKeysBySuite", e.suite], []);
      set(mutations, ["lastLine"], `suite begin: ${e.suite}…`);
      commit(mutations);
      return;
    }

    if (e.t === "case_begin") {
      const summary = getSummaryState();
      const k = key(e.suite, e.name);
      const meta = e.meta;
      const suiteKeys = read<CaseKey[]>(["caseKeysBySuite", e.suite]) ?? [];
      const suiteState = getSuite(e.suite);

      set(mutations, ["summary"], { ...summary, cases: summary.cases + 1 });
      set(mutations, ["caseKeysBySuite", e.suite], [...suiteKeys, k]);
      set(mutations, ["suitesByName", e.suite], {
        ...suiteState,
        caseKeys: [...suiteState.caseKeys, k],
      });

      const base = { key: k, suite: e.suite, name: e.name } as const;
      set(mutations, ["casesByKey", k], meta ? { ...base, meta } : base);
      set(mutations, ["lastLine"], `run: ${e.name}`);
      commit(mutations);
      return;
    }

    if (e.t === "case_end") {
      const summary = getSummaryState();
      const k = key(e.suite, e.name);
      const prev = read<CaseLog>(["casesByKey", k]);
      const suiteState = getSuite(e.suite);

      const nextSummary = { ...summary };
      if (e.status === "pass") nextSummary.pass += 1;
      else if (e.status === "fail") nextSummary.fail += 1;
      else nextSummary.skip += 1;
      set(mutations, ["summary"], nextSummary);

      const nextSuite = { ...suiteState };
      if (e.status === "pass") nextSuite.pass += 1;
      else if (e.status === "fail") nextSuite.fail += 1;
      else nextSuite.skip += 1;
      set(mutations, ["suitesByName", e.suite], nextSuite);

      const prevMeta = prev?.meta;
      const nextMeta =
        (prevMeta || e.metaPatch)
          ? { ...(prevMeta ?? {}), ...(e.metaPatch ?? {}) }
          : undefined;

      const baseEnd = {
        key: k,
        suite: e.suite,
        name: e.name,
        status: e.status,
        ms: e.ms,
      } as const;

      const assertRows = (e as TestEventWithAssertRows).assertRows;

      const withMeta = nextMeta ? { ...baseEnd, meta: nextMeta } : baseEnd;
      const withErr = e.err ? { ...withMeta, err: e.err } : withMeta;
      const withAssertRows = assertRows !== undefined
        ? { ...withErr, assertRows }
        : withErr;
      set(mutations, ["casesByKey", k], withAssertRows);

      if (e.status === "fail") {
        const meta = prev?.meta;
        const base = {
          suite: e.suite,
          name: e.name,
          err: e.err ?? "Unknown error",
          ms: e.ms,
        } as const;

        const failures = read<TestFailure[]>(["failures"]) ?? [];
        set(mutations, ["failures"], [...failures, meta ? { ...base, meta } : base]);
        set(mutations, ["lastLine"], `FAIL ${e.suite} :: ${e.name}`);
      } else {
        set(mutations, ["lastLine"], e.status.toUpperCase());
      }

      commit(mutations);
      return;
    }

    if (e.t === "suite_end") {
      const summary = getSummaryState();
      const suiteState = read<SuiteLogState>(["suitesByName", e.suite]);

      set(mutations, ["summary"], { ...summary, msTotal: summary.msTotal + e.ms });
      if (suiteState) set(mutations, ["suitesByName", e.suite], { ...suiteState, ms: e.ms });
      set(mutations, ["lastLine"], `done ${e.suite} (${e.ms.toFixed(1)}ms)`);
      commit(mutations);
      return;
    }
  };

  const getSummary = (): TestSummary => {
    const summary = getSummaryState();
    const failures = read<TestFailure[]>(["failures"]) ?? [];

    return _freeze({
      suites: summary.suites,
      cases: summary.cases,
      pass: summary.pass,
      fail: summary.fail,
      skip: summary.skip,
      msTotal: summary.msTotal,
      failures: _freeze([...failures]),
    });
  };

  const listSuites = (): readonly SuiteLog[] => {
    const suitesByName = read<Record<string, SuiteLogState>>(["suitesByName"]) ?? {};

    return _freeze(
      Object.values(suitesByName).map((s) => {
        const base = {
          suite: s.suite,
          cases: _freeze([...s.caseKeys]),
          pass: s.pass,
          fail: s.fail,
          skip: s.skip,
        } as const;

        const withPlanned =
          s.totalPlanned !== undefined ? { ...base, totalPlanned: s.totalPlanned } : base;

        const withMs =
          s.ms !== undefined ? { ...withPlanned, ms: s.ms } : withPlanned;

        return _freeze(withMs);
      }),
    );
  };

  const listCases = (suite: string): readonly CaseLog[] => {
    const keys = read<CaseKey[]>(["caseKeysBySuite", suite]) ?? [];
    const out: CaseLog[] = [];

    for (const k of keys) {
      const c = read<CaseLog>(["casesByKey", k]);
      if (c) out.push(_freeze(c));
    }

    return _freeze(out);
  };

  const getCase = (k: CaseKey): CaseLog | undefined => {
    const c = read<CaseLog>(["casesByKey", k]);
    return c ? _freeze(c) : undefined;
  };

  const listFailures = (): readonly TestFailure[] => _freeze([...(read<TestFailure[]>(["failures"]) ?? [])]);

  return _freeze({
    onEvent,
    getSummary,
    getActiveSuite: () => read<string | null>(["activeSuite"]) ?? undefined,
    getLastLine: () => read<string>(["lastLine"]) ?? "idle",
    listSuites,
    listCases,
    getCase,
    listFailures,
    clear,
  });
}