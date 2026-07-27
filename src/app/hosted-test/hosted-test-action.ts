import { create_livehost } from "hson-live/livehost";
import type { LiveHostActions, LiveHostSchema } from "hson-live/livehost";
import type { JsonValue } from "hson-live/types";
import type { RunResult, TestFailure, TestSummary } from "../demos/test/tests.types";
import { is_hosted_test_suite_id } from "./hosted-test-suite";
import type { HostedTestRunTarget, HostedTestSuiteId, HostedTestSuiteRegistry } from "./hosted-test-suite";
import { make_hosted_test_report } from "./hosted-test-report";
import type { HostedTestReportController, HostedTestReportOptions } from "./hosted-test-report";
import {
  encode_hosted_test_report_initial,
  HOSTED_TEST_REPORT_INITIAL_EVENT,
} from "./hosted-test-report-initial";
import {
  encode_hosted_test_report_commit,
  HOSTED_TEST_REPORT_COMMIT_EVENT,
} from "./hosted-test-report-wire";
import type { HostedTestRunId } from "./hosted-test-report-wire.types";
import type { HostedTestActions, HostedTestCaseDiagnostic, HostedTestInspectRequest, HostedTestRunResult } from "./hosted-test-action.types";
import { HostedTestUnknownSuiteError } from "./hosted-test-action-error";
import type { TestExecutorDiscovery } from "../../test-system/test-discovery";
import { decode_test_executor_discovery_request } from "../../test-system/test-discovery";
import type { TestExecutorRegistry } from "../../test-system/test-executor";
import { decode_run_selected_tests_request } from "../../test-system/test-selected-run";
import { run_selected_test_ids } from "../../hosted-test/run-selected-test-suites";
import { HOSTED_TEST_SELECTED_RUN_TARGET } from "./hosted-test-suite";
import type { HostedTestSelectedRunResult } from "./hosted-test-action.types";

export type {
  HostedTestActions,
  HostedTestRunRequest,
  HostedTestRunResult,
  HostedTestSelectedRunResult,
} from "./hosted-test-action.types";
export type { RunSelectedTestsRequest } from "../../test-system/test-selected-run";
export {
  discover_hosted_test_executor,
  run_hosted_test_action,
  run_selected_hosted_tests_action,
} from "./hosted-test-client-action";

export type HostedTestRunIdFactory = () => string;
export type HostedTestCaseInspector = (request: Readonly<{
  runId: HostedTestRunId;
  suite: HostedTestRunTarget;
  caseKey: string;
}>) => Promise<HostedTestCaseDiagnostic>;
export type HostedTestRunRetention = Readonly<{
  retain(runId: HostedTestRunId, suite: HostedTestRunTarget): void;
  get(runId: HostedTestRunId): HostedTestRunTarget | undefined;
  clear(): void;
  size(): number;
}>;

export function make_hosted_test_run_retention(maxRuns = 16): HostedTestRunRetention {
  if (!Number.isInteger(maxRuns) || maxRuns <= 0) throw new Error("Hosted test retention limit must be a positive integer.");
  const runs = new Map<HostedTestRunId, HostedTestRunTarget>();
  return Object.freeze({
    retain(runId, suite) {
      runs.delete(runId);
      runs.set(runId, suite);
      while (runs.size > maxRuns) {
        const oldest = runs.keys().next().value as HostedTestRunId | undefined;
        if (oldest === undefined) break;
        runs.delete(oldest);
      }
    },
    get: (runId) => runs.get(runId),
    clear: () => runs.clear(),
    size: () => runs.size,
  });
}

let hostedTestRunId = 0;

export function make_hosted_test_run_id(): string {
  hostedTestRunId += 1;
  return `hosted-run-${Date.now().toString(36)}-${hostedTestRunId.toString(36)}`;
}

function finite(value: number, field: string): number {
  if (!Number.isFinite(value)) throw new Error(`Hosted test result has non-finite ${field}.`);
  return value;
}

function normalize_failure(failure: TestFailure): TestFailure {
  return {
    suite: failure.suite,
    name: failure.name,
    err: failure.err,
    ms: finite(failure.ms, "failure.ms"),
  };
}

function normalize_summary(summary: TestSummary): TestSummary {
  return {
    suites: finite(summary.suites, "summary.suites"),
    cases: finite(summary.cases, "summary.cases"),
    pass: finite(summary.pass, "summary.pass"),
    fail: finite(summary.fail, "summary.fail"),
    skip: finite(summary.skip, "summary.skip"),
    msTotal: finite(summary.msTotal, "summary.msTotal"),
    failures: summary.failures.map(normalize_failure),
  };
}

function decode_hosted_test_request(value: unknown) {
  if (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.keys(value).length === 1
    && is_hosted_test_suite_id((value as { suite?: unknown }).suite)
  ) {
    return { ok: true, value: { suite: (value as { suite: HostedTestSuiteId }).suite } } as const;
  }

  return {
    ok: false,
    issues: ["tests.run requires a registered hosted-test suite ID."],
  } as const;
}

function decode_hosted_test_inspect_request(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, issues: ["tests.inspect requires runId and caseKey strings."] } as const;
  }
  const record = value as { runId?: unknown; caseKey?: unknown };
  if (Object.keys(record).length !== 2 || typeof record.runId !== "string" || !record.runId || typeof record.caseKey !== "string" || !record.caseKey) {
    return { ok: false, issues: ["tests.inspect requires non-empty runId and caseKey strings."] } as const;
  }
  return { ok: true, value: { runId: record.runId as HostedTestRunId, caseKey: record.caseKey } satisfies HostedTestInspectRequest } as const;
}

export function create_hosted_test_livehost(
  registry: HostedTestSuiteRegistry,
  inspectReport?: (report: HostedTestReportController, runId: HostedTestRunId) => void,
  makeRunId: HostedTestRunIdFactory = make_hosted_test_run_id,
  reportOptions: HostedTestReportOptions = {},
  inspectCase?: HostedTestCaseInspector,
  retention: HostedTestRunRetention = make_hosted_test_run_retention(),
  discovery?: TestExecutorDiscovery,
  executorRegistry?: TestExecutorRegistry,
  runSelected: typeof run_selected_test_ids = run_selected_test_ids,
) {
  if (
    executorRegistry?.catalog.tests.some((descriptor) => descriptor.requirements.includes("synthetic-dom"))
    && runSelected === run_selected_test_ids
  ) {
    throw new Error(
      "HOSTED_TEST_EXECUTOR_CONFIGURATION_INVALID:"
      + " An executor advertising synthetic-dom tests must install a selected-run execution strategy.",
    );
  }
  const actions: LiveHostActions<HostedTestActions, undefined> = {
    "tests.discover": async () => {
      if (discovery === undefined) throw new Error("HOSTED_TEST_DISCOVERY_UNAVAILABLE: This compatibility host has no canonical executor registry.");
      return JSON.parse(JSON.stringify(discovery)) as JsonValue;
    },
    "tests.run": async (context, request) => {
      const hostStartedAt = performance.now();
      let descriptor;
      try {
        descriptor = registry.get(request.suite);
      } catch {
        // This happens before report construction, so no initial state or
        // terminal report can truthfully be emitted.
        throw new HostedTestUnknownSuiteError(request.suite, true);
      }
      const runId = makeRunId();
      if (!runId) throw new Error("Hosted test run ID must be non-empty.");
      retention.retain(runId, descriptor.id);
      const report = make_hosted_test_report(Date.now, (commit) => {
        const envelope = encode_hosted_test_report_commit(runId, descriptor.id, commit);
        context.emit_event(
          HOSTED_TEST_REPORT_COMMIT_EVENT,
          envelope as unknown as JsonValue,
        );
      }, descriptor.id, reportOptions);
      try {
        const initial = encode_hosted_test_report_initial(runId, descriptor.id, report.map.capture());
        context.emit_event(HOSTED_TEST_REPORT_INITIAL_EVENT, initial as unknown as JsonValue);
        inspectReport?.(report, runId);
      } catch (error) {
        report.dispose();
        throw error;
      }
      let result: RunResult;
      try {
        result = await descriptor.run(report.reduce, {
          yieldEveryCases: 0,
          yieldBetweenSuites: false,
        });
        report.complete(result, {
          runnerMs: finite(result.summary.msTotal, "timing.runnerMs"),
          hostMs: finite(performance.now() - hostStartedAt, "timing.hostMs"),
        });
      } catch (error) {
        report.failInfrastructure(error);
        throw error;
      } finally {
        report.dispose();
      }
      const reportTiming = report.map.capture().value.run.timing;
      if (reportTiming === null) throw new Error("Hosted test report completed without timing.");
      const hostedResult: HostedTestRunResult = {
        runId,
        suite: descriptor.id,
        ok: result.ok,
        summary: normalize_summary(result.summary),
        timing: reportTiming,
      };
      return JSON.parse(JSON.stringify(hostedResult)) as JsonValue;
    },
    "tests.runSelected": async (context, request) => {
      if (executorRegistry === undefined) {
        throw new Error("HOSTED_TEST_SELECTED_EXECUTION_UNAVAILABLE: This compatibility host has no canonical executor registry.");
      }
      const hostStartedAt = performance.now();
      const runId = makeRunId();
      if (!runId) throw new Error("Hosted test run ID must be non-empty.");
      retention.retain(runId, HOSTED_TEST_SELECTED_RUN_TARGET);
      const report = make_hosted_test_report(Date.now, (commit) => {
        const envelope = encode_hosted_test_report_commit(runId, HOSTED_TEST_SELECTED_RUN_TARGET, commit);
        context.emit_event(HOSTED_TEST_REPORT_COMMIT_EVENT, envelope as unknown as JsonValue);
      }, HOSTED_TEST_SELECTED_RUN_TARGET, reportOptions);
      try {
        const initial = encode_hosted_test_report_initial(
          runId,
          HOSTED_TEST_SELECTED_RUN_TARGET,
          report.map.capture(),
        );
        context.emit_event(HOSTED_TEST_REPORT_INITIAL_EVENT, initial as unknown as JsonValue);
        inspectReport?.(report, runId);
      } catch (error) {
        report.dispose();
        throw error;
      }
      let result: RunResult;
      try {
        result = await runSelected(executorRegistry, request.testIds, report.reduce, {
          yieldEveryCases: 0,
          yieldBetweenSuites: false,
        });
        report.complete(result, {
          runnerMs: finite(result.summary.msTotal, "timing.runnerMs"),
          hostMs: finite(performance.now() - hostStartedAt, "timing.hostMs"),
        });
      } catch (error) {
        report.failInfrastructure(error);
        throw error;
      } finally {
        report.dispose();
      }
      const reportTiming = report.map.capture().value.run.timing;
      if (reportTiming === null) throw new Error("Hosted test report completed without timing.");
      const hostedResult: HostedTestSelectedRunResult = {
        runId,
        suite: HOSTED_TEST_SELECTED_RUN_TARGET,
        testIds: request.testIds,
        ok: result.ok,
        summary: normalize_summary(result.summary),
        timing: reportTiming,
      };
      return JSON.parse(JSON.stringify(hostedResult)) as JsonValue;
    },
    "tests.inspect": async (_context, request) => {
      const suite = retention.get(request.runId);
      if (suite === undefined) throw new Error(`HOSTED_TEST_UNKNOWN_RUN: Hosted test run "${request.runId}" is no longer inspectable.`);
      if (inspectCase === undefined) throw new Error("HOSTED_TEST_INSPECTION_UNAVAILABLE: Case inspection is unavailable on this host.");
      const diagnostic = await inspectCase({ runId: request.runId, suite, caseKey: request.caseKey });
      return JSON.parse(JSON.stringify(diagnostic)) as JsonValue;
    },
  };
  const schema: LiveHostSchema<undefined, HostedTestActions> = {
    actions: {
      "tests.discover": { payload: decode_test_executor_discovery_request },
      "tests.run": { payload: decode_hosted_test_request },
      "tests.runSelected": { payload: decode_run_selected_tests_request },
      "tests.inspect": { payload: decode_hosted_test_inspect_request },
    },
  };

  return create_livehost<undefined, HostedTestActions>({ actions, schema });
}
