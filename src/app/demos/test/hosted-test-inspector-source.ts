import { hson } from "hson-live";
import type { LiveMap } from "hson-live/types";
import type { HostedTestReportStatus } from "../../hosted-test/hosted-test-report.types";
import type { HostedTestSuiteId } from "../../hosted-test/hosted-test-suite";
import type { HostedTestPanelReportUpdate } from "./hosted-test-panel-adapter";

export type HostedTestInspectorCase = {
  key: string;
  name: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  error: string | null;
};

export type HostedTestInspectorSuite = {
  id: string;
  summary: { passed: number; failed: number; skipped: number; duration: number | null };
  cases: HostedTestInspectorCase[];
};

export type HostedTestInspectorState = {
  run: {
    id: string | null;
    suite: HostedTestSuiteId;
    status: HostedTestReportStatus;
    timing: { runnerMs: number; hostMs: number } | null;
  };
  suites: HostedTestInspectorSuite[];
};

export type HostedTestInspectorSourceSnapshot = Readonly<{
  value: HostedTestInspectorState;
  suites: number;
  cases: number;
  caseKeysBySuite: Readonly<Record<string, readonly string[]>>;
  ignoredIdentityUpdates: number;
  duplicateCaseUpdates: number;
  disposed: boolean;
}>;

export type HostedTestInspectorSource = Readonly<{
  readonly map: LiveMap<HostedTestInspectorState>;
  readonly runId: string | undefined;
  readonly suite: HostedTestSuiteId;
  reset(suite: HostedTestSuiteId): LiveMap<HostedTestInspectorState>;
  ingest(update: HostedTestPanelReportUpdate): boolean;
  pathForCase(caseKey: string): readonly (string | number)[] | undefined;
  snapshot(): HostedTestInspectorSourceSnapshot;
  dispose(): void;
}>;

type SuiteIndex = {
  index: number;
  cases: Map<string, number>;
  counts: { passed: number; failed: number; skipped: number };
};

function initial_state(suite: HostedTestSuiteId): HostedTestInspectorState {
  return { run: { id: null, suite, status: "running", timing: null }, suites: [] };
}

function make_map(suite: HostedTestSuiteId): LiveMap<HostedTestInspectorState> {
  return hson.liveMap.fromJson(initial_state(suite)) as unknown as LiveMap<HostedTestInspectorState>;
}

export function make_hosted_test_inspector_source(initialSuite: HostedTestSuiteId = "livemap/replay"): HostedTestInspectorSource {
  let currentMap = make_map(initialSuite);
  let expectedSuite = initialSuite;
  let activeRunId: string | undefined;
  let disposed = false;
  let ignoredIdentityUpdates = 0;
  let duplicateCaseUpdates = 0;
  const suites = new Map<string, SuiteIndex>();
  const cases = new Map<string, Readonly<{ suite: string; suiteIndex: number; caseIndex: number; status: "pass" | "fail" | "skip" }>>();

  function reset(suite: HostedTestSuiteId): LiveMap<HostedTestInspectorState> {
    if (disposed) return currentMap;
    expectedSuite = suite;
    activeRunId = undefined;
    suites.clear();
    cases.clear();
    currentMap = make_map(suite);
    return currentMap;
  }

  function ingest(update: HostedTestPanelReportUpdate): boolean {
    if (disposed) return false;
    const report = update.report;
    const reportRunId = report.run.id;
    if (report.run.suite !== expectedSuite || reportRunId === undefined || (activeRunId !== undefined && reportRunId !== activeRunId)) {
      ignoredIdentityUpdates += 1;
      return false;
    }
    activeRunId ??= reportRunId;
    currentMap.batch((tx) => {
      const ensure_suite = (id: string): SuiteIndex => {
        const existing = suites.get(id);
        if (existing !== undefined) return existing;
        const index = suites.size;
        tx.splice(["suites"], index, 0, {
          id,
          summary: { passed: 0, failed: 0, skipped: 0, duration: null },
          cases: [],
        });
        const created = { index, cases: new Map<string, number>(), counts: { passed: 0, failed: 0, skipped: 0 } };
        suites.set(id, created);
        return created;
      };
      const adjust_count = (suiteState: SuiteIndex, status: "pass" | "fail" | "skip", delta: number): void => {
        const field = status === "pass" ? "passed" : status === "fail" ? "failed" : "skipped";
        suiteState.counts[field] += delta;
        tx.set(["suites", suiteState.index, "summary", field], suiteState.counts[field]);
      };

      tx.replace(["run"], {
        id: reportRunId,
        suite: report.run.suite,
        status: report.run.status,
        timing: report.run.timing === null ? null : { ...report.run.timing },
      });
      for (const testCase of update.newCases) {
        const existing = cases.get(testCase.key);
        if (existing !== undefined) {
          if (existing.suite !== testCase.suite) {
            ignoredIdentityUpdates += 1;
            continue;
          }
          duplicateCaseUpdates += 1;
          const suiteState = suites.get(existing.suite);
          if (suiteState === undefined) continue;
          if (existing.status !== testCase.status) {
            adjust_count(suiteState, existing.status, -1);
            adjust_count(suiteState, testCase.status, 1);
          }
          tx.replace(["suites", existing.suiteIndex, "cases", existing.caseIndex], {
            key: testCase.key, name: testCase.name, status: testCase.status, duration: testCase.ms, error: testCase.err,
          });
          cases.set(testCase.key, { ...existing, status: testCase.status });
          continue;
        }
        const suiteState = ensure_suite(testCase.suite);
        const caseIndex = suiteState.cases.size;
        tx.splice(["suites", suiteState.index, "cases"], caseIndex, 0, {
          key: testCase.key, name: testCase.name, status: testCase.status, duration: testCase.ms, error: testCase.err,
        });
        suiteState.cases.set(testCase.key, caseIndex);
        cases.set(testCase.key, { suite: testCase.suite, suiteIndex: suiteState.index, caseIndex, status: testCase.status });
        adjust_count(suiteState, testCase.status, 1);
      }
      for (const timing of update.newSuiteTimings) {
        const suiteState = ensure_suite(timing.suite);
        tx.set(["suites", suiteState.index, "summary", "duration"], timing.ms);
      }
    });
    return true;
  }

  function snapshot(): HostedTestInspectorSourceSnapshot {
    const value = currentMap.snap();
    const caseKeysBySuite = Object.fromEntries(value.suites.map((suite) => [suite.id, Object.freeze(suite.cases.map((testCase) => testCase.key))]));
    return Object.freeze({
      value,
      suites: value.suites.length,
      cases: cases.size,
      caseKeysBySuite: Object.freeze(caseKeysBySuite),
      ignoredIdentityUpdates,
      duplicateCaseUpdates,
      disposed,
    });
  }

  return Object.freeze({
    get map() { return currentMap; },
    get runId() { return activeRunId; },
    get suite() { return expectedSuite; },
    reset,
    ingest,
    pathForCase(caseKey: string) {
      const found = cases.get(caseKey);
      return found === undefined ? undefined : Object.freeze(["suites", found.suiteIndex, "cases", found.caseIndex]);
    },
    snapshot,
    dispose() {
      if (disposed) return;
      disposed = true;
      suites.clear();
      cases.clear();
    },
  });
}
