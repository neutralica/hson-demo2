import { _freeze } from "./fixtures/generate-fixtures";
import type { CaseKey, CaseLog, SuiteLog, TestEvent, TestFailure, TestSummary } from "./tests.types";

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

export function create_test_log(): TestLog {
  let activeSuite: string | undefined;

  // store all cases by key (suite::name)
  const cases = new Map<CaseKey, CaseLog>();
  const caseKeysBySuite = new Map<string, CaseKey[]>();

  // suite aggregates
  const suites = new Map<string, {
    suite: string;
    totalPlanned?: number;
    caseKeys: CaseKey[];
    pass: number;
    fail: number;
    skip: number;
    ms?: number;
  }>();

  // failures list for inspector
  const failures: TestFailure[] = [];

  // running counters (for gem dashboard)
  let suitesCount = 0;
  let casesCount = 0;
  let pass = 0;
  let fail = 0;
  let skip = 0;
  let msTotal = 0;

  // one-line marquee (always short, always meaningful)
  let lastLine = "idle";

  const key = (suite: string, name: string): CaseKey => `${suite}::${name}`;

  const ensureSuite = (suite: string): void => {
    if (suites.has(suite)) return;
    suites.set(suite, { suite, caseKeys: [], pass: 0, fail: 0, skip: 0 });
    caseKeysBySuite.set(suite, []);
  };

  const clear = (): void => {
    activeSuite = undefined;
    cases.clear();
    caseKeysBySuite.clear();
    suites.clear();
    failures.length = 0;

    suitesCount = 0;
    casesCount = 0;
    pass = 0;
    fail = 0;
    skip = 0;
    msTotal = 0;

    lastLine = "idle";
  };

  const onEvent = (e: TestEvent): void => {
    if (e.t === "suite_begin") {
      activeSuite = e.suite;
      suitesCount += 1;
      ensureSuite(e.suite);

      const s = suites.get(e.suite)!;
      if (e.totalPlanned !== undefined) s.totalPlanned = e.totalPlanned;
      lastLine = `suite ${e.suite}…`;
      return;
    }

    if (e.t === "case_begin") {
      casesCount += 1;
      ensureSuite(e.suite);

      const k = key(e.suite, e.name);
      const meta = e.meta;

      const s = suites.get(e.suite)!;
      caseKeysBySuite.get(e.suite)!.push(k);
      s.caseKeys.push(k);

      const base = { key: k, suite: e.suite, name: e.name } as const;
      cases.set(k, _freeze(meta ? { ...base, meta } : base));

      lastLine = `… ${e.name}`;
      return;
    }

    if (e.t === "case_end") {
      const k = key(e.suite, e.name);
      const prev = cases.get(k);

      // update global counts
      if (e.status === "pass") pass += 1;
      else if (e.status === "fail") fail += 1;
      else skip += 1;

      // update per-suite counts
      ensureSuite(e.suite);
      const s = suites.get(e.suite)!;
      if (e.status === "pass") s.pass += 1;
      else if (e.status === "fail") s.fail += 1;
      else s.skip += 1;

      // merge metaPatch into existing meta (exactOptionalPropertyTypes friendly)
      const prevMeta = prev?.meta;
      const nextMeta =
        (prevMeta || e.metaPatch)
          ? _freeze({ ...(prevMeta ?? {}), ...(e.metaPatch ?? {}) })
          : undefined;

      const baseEnd = {
        key: k,
        suite: e.suite,
        name: e.name,
        status: e.status,
        ms: e.ms,
      } as const;

      //  only attach err/meta when present (no `undefined` assignment)
      const withMeta = nextMeta ? { ...baseEnd, meta: nextMeta } : baseEnd;
      const withErr = e.err ? { ...withMeta, err: e.err } : withMeta;

      cases.set(k, _freeze(withErr));
      // TODO these can be consolidated with the above vars
      if (e.status === "fail") {
        const meta = prev?.meta;
        const base = {
          suite: e.suite,
          name: e.name,
          err: e.err ?? "Unknown error",
          ms: e.ms,
        } as const;

        //  with exactOptionalPropertyTypes, only attach meta when present
        failures.push(meta ? { ...base, meta } : base);

        lastLine = `FAIL ${e.suite} :: ${e.name}`;
      } else {
        lastLine = `${e.status.toUpperCase()} ${e.name}`;
      }
      return;
    }

    if (e.t === "suite_end") {
      msTotal += e.ms;
      const s = suites.get(e.suite);
      if (s) s.ms = e.ms;
      lastLine = `done ${e.suite} (${e.ms.toFixed(1)}ms)`;
      return;
    }
  };

  const getSummary = (): TestSummary => _freeze({
    suites: suitesCount,
    cases: casesCount,
    pass,
    fail,
    skip,
    msTotal,
    failures: _freeze([...failures]),
  });

  const listSuites = (): readonly SuiteLog[] => {
    return _freeze(
      [...suites.values()].map((s) => {
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
  }


  const listCases = (suite: string): readonly CaseLog[] => {
    const keys = caseKeysBySuite.get(suite) ?? [];
    const out: CaseLog[] = [];
    for (const k of keys) {
      const c = cases.get(k);
      if (c) out.push(c);
    }
    return _freeze(out);
  };

  const getCase = (k: CaseKey): CaseLog | undefined => cases.get(k);

  const listFailures = (): readonly TestFailure[] => _freeze([...failures]);

  return _freeze({
    onEvent,
    getSummary,
    getActiveSuite: () => activeSuite,
    getLastLine: () => lastLine,
    listSuites,
    listCases,
    getCase,
    listFailures,
    clear,
  });
}