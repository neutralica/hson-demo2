import { create_livehost, create_livehost_store } from "hson-live";
import type { LiveHost, LiveHostActions, LiveHostSchema, LiveHostStore } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { RunResult, TestFailure, TestSummary } from "../app/demos/test/tests.types";
import { HostedTestUnknownSuiteError } from "../app/hosted-test/hosted-test-action-error";
import type {
  HostedTestActions,
  HostedTestCaseDiagnostic,
  HostedTestInspectRequest,
  HostedTestRunResult,
} from "../app/hosted-test/hosted-test-action.types";
import {
  make_hosted_test_run_id,
  make_hosted_test_run_retention,
  type HostedTestCaseInspector,
  type HostedTestRunIdFactory,
  type HostedTestRunRetention,
} from "../app/hosted-test/hosted-test-action";
import {
  HOSTED_TEST_REPORT_SCHEMA,
  make_hosted_test_report,
  make_initial_hosted_test_report,
  type HostedTestReportOptions,
} from "../app/hosted-test/hosted-test-report";
import type { HostedTestReport, HostedTestReportMap, HostedTestReportState } from "../app/hosted-test/hosted-test-report.types";
import type { HostedTestRunId } from "../app/hosted-test/hosted-test-report-wire.types";
import { is_hosted_test_suite_id, type HostedTestSuiteId, type HostedTestSuiteRegistry } from "../app/hosted-test/hosted-test-suite";
import {
  HOSTED_TEST_COORDINATOR_HOST_ID,
  type HostedTestCoordinatorState,
  type HostedTestRunAssociation,
} from "../app/hosted-test/hosted-test-application.types";

export { HOSTED_TEST_COORDINATOR_HOST_ID } from "../app/hosted-test/hosted-test-application.types";
export type { HostedTestCoordinatorState, HostedTestRunAssociation } from "../app/hosted-test/hosted-test-application.types";

type HostedTestReportActions = Readonly<{
  "tests.inspect": HostedTestInspectRequest;
}>;

export type HostedTestApplication = Readonly<{
  store: LiveHostStore;
  coordinator: LiveHost<HostedTestCoordinatorState, HostedTestActions>;
  retention: HostedTestRunRetention;
  dispose(): void;
}>;

export type HostedTestApplicationOptions = Readonly<{
  makeRunId?: HostedTestRunIdFactory;
  report?: HostedTestReportOptions;
  inspectCase?: HostedTestCaseInspector;
  retention?: HostedTestRunRetention;
}>;

function finite(value: number, field: string): number {
  if (!Number.isFinite(value)) throw new Error(`Hosted test result has non-finite ${field}.`);
  return value;
}

function normalize_failure(failure: TestFailure): TestFailure {
  return { suite: failure.suite, name: failure.name, err: failure.err, ms: finite(failure.ms, "failure.ms") };
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

function decode_run(value: unknown) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.keys(value).length === 1 && is_hosted_test_suite_id((value as { suite?: unknown }).suite)) {
    return { ok: true, value: { suite: (value as { suite: HostedTestSuiteId }).suite } } as const;
  }
  return { ok: false, issues: ["tests.run requires a registered hosted-test suite ID."] } as const;
}

function decode_inspect(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, issues: ["tests.inspect requires runId and caseKey strings."] } as const;
  }
  const record = value as { runId?: unknown; caseKey?: unknown };
  if (Object.keys(record).length !== 2 || typeof record.runId !== "string" || !record.runId
    || typeof record.caseKey !== "string" || !record.caseKey) {
    return { ok: false, issues: ["tests.inspect requires non-empty runId and caseKey strings."] } as const;
  }
  return { ok: true, value: { runId: record.runId as HostedTestRunId, caseKey: record.caseKey } } as const;
}

function report_options(
  configured: HostedTestReportOptions | undefined,
  runId: HostedTestRunId,
  map: LiveHost<HostedTestReportState, HostedTestReportActions>["map"],
): HostedTestReportOptions {
  return {
    runId,
    map: map.schema.use(HOSTED_TEST_REPORT_SCHEMA) as unknown as HostedTestReportMap,
    ...(configured?.caseBatchSize !== undefined ? { caseBatchSize: configured.caseBatchSize } : {}),
  };
}

export function create_hosted_test_application(
  registry: HostedTestSuiteRegistry,
  options: HostedTestApplicationOptions = {},
): HostedTestApplication {
  const store = create_livehost_store();
  const retention = options.retention ?? make_hosted_test_run_retention(16);
  const makeRunId = options.makeRunId ?? make_hosted_test_run_id;
  const reportHostIds = new Set<string>();

  const actions: LiveHostActions<HostedTestActions, HostedTestCoordinatorState> = {
    "tests.run": async (context, request, message) => {
      if (!message.clientId || !message.requestId) throw new Error("HOSTED_TEST_REQUEST_ID_REQUIRED: tests.run requires a retry-safe client and request identity.");
      let descriptor;
      try { descriptor = registry.get(request.suite); }
      catch { throw new HostedTestUnknownSuiteError(request.suite, true); }

      const runId = makeRunId() as HostedTestRunId;
      if (!runId) throw new Error("Hosted test run ID must be non-empty.");
      const reportHostId = `hosted-report:${runId}`;
      const reportActions: LiveHostActions<HostedTestReportActions, HostedTestReportState> = {
        "tests.inspect": async (_reportContext, inspectRequest) => {
          if (inspectRequest.runId !== runId) throw new Error(`HOSTED_TEST_UNKNOWN_RUN: Hosted test run "${inspectRequest.runId}" is not owned by this report host.`);
          if (retention.get(runId) === undefined) throw new Error(`HOSTED_TEST_UNKNOWN_RUN: Hosted test run "${runId}" is no longer inspectable.`);
          if (!options.inspectCase) throw new Error("HOSTED_TEST_INSPECTION_UNAVAILABLE: Case inspection is unavailable on this host.");
          const diagnostic: HostedTestCaseDiagnostic = await options.inspectCase({ runId, suite: descriptor.id, caseKey: inspectRequest.caseKey });
          return JSON.parse(JSON.stringify(diagnostic)) as JsonValue;
        },
      };
      const reportSchema: LiveHostSchema<HostedTestReportState, HostedTestReportActions> = {
        actions: { "tests.inspect": { payload: decode_inspect } },
      };
      const reportHost = create_livehost<HostedTestReportState, HostedTestReportActions>({
        state: make_initial_hosted_test_report(descriptor.id, runId) as HostedTestReportState,
        actions: reportActions,
        schema: reportSchema,
        logicalMapId: reportHostId,
      });
      const stored = store.set(reportHostId, reportHost);
      if (!stored.ok) throw new Error(stored.error.message);
      reportHostIds.add(reportHostId);
      retention.retain(runId, descriptor.id);
      const report = make_hosted_test_report(Date.now, undefined, descriptor.id, report_options(options.report, runId, reportHost.map));

      const association: HostedTestRunAssociation = {
        clientId: message.clientId,
        requestId: message.requestId,
        runId,
        reportHostId,
        suite: descriptor.id,
        status: "running",
        reportRev: reportHost.stream.headRev,
      };
      // The request-to-report association is authoritative before execution can
      // yield, so an uncertain action can always rediscover the one created run.
      if (context.map.capture().value.requests[message.clientId] === undefined) {
        context.map.setMany(["requests"], { [message.clientId]: { [message.requestId]: association } });
      } else {
        context.map.setMany(["requests", message.clientId], { [message.requestId]: association });
      }

      const hostStartedAt = performance.now();
      let result: RunResult;
      try {
        result = await descriptor.run(report.reduce, { yieldEveryCases: 0, yieldBetweenSuites: false });
        report.complete(result, {
          runnerMs: finite(result.summary.msTotal, "timing.runnerMs"),
          hostMs: finite(performance.now() - hostStartedAt, "timing.hostMs"),
        });
      } catch (error) {
        report.failInfrastructure(error);
        const failed = { ...association, status: "error" as const, reportRev: reportHost.stream.headRev };
        context.map.replace(["requests", message.clientId, message.requestId], failed);
        report.dispose();
        throw error;
      }

      report.dispose();
      const state = reportHost.map.capture().value;
      const status = state.run.status === "passed" ? "passed" : "failed";
      const terminal: HostedTestRunAssociation = { ...association, status, reportRev: reportHost.stream.headRev };
      context.map.replace(["requests", message.clientId, message.requestId], terminal);
      const timing = state.run.timing;
      if (timing === null) throw new Error("Hosted test report completed without timing.");
      const hostedResult: HostedTestRunResult = {
        runId,
        reportHostId,
        reportRev: reportHost.stream.headRev,
        suite: descriptor.id,
        ok: result.ok,
        summary: normalize_summary(result.summary),
        timing,
      };
      return JSON.parse(JSON.stringify(hostedResult)) as JsonValue;
    },
    // Compatibility only: production inspection is registered on each report
    // host so it shares that run's session and retry-safe action namespace.
    "tests.inspect": async () => {
      throw new Error("HOSTED_TEST_INSPECTION_MOVED: Connect to the run report host before inspecting a case.");
    },
  };
  const schema: LiveHostSchema<HostedTestCoordinatorState, HostedTestActions> = {
    actions: {
      "tests.run": { payload: decode_run },
      "tests.inspect": { payload: decode_inspect },
    },
  };
  const coordinator = create_livehost<HostedTestCoordinatorState, HostedTestActions>({
    state: { requests: {} },
    actions,
    schema,
    logicalMapId: HOSTED_TEST_COORDINATOR_HOST_ID,
  });
  const registered = store.set(HOSTED_TEST_COORDINATOR_HOST_ID, coordinator);
  if (!registered.ok) throw new Error(registered.error.message);

  return Object.freeze({
    store,
    coordinator,
    retention,
    dispose() {
      coordinator.actionRequests.dispose();
      coordinator.sessions.dispose();
      for (const id of reportHostIds) {
        const host = store.get(id);
        host?.actionRequests.dispose();
        host?.sessions.dispose();
        store.delete(id);
      }
      reportHostIds.clear();
      retention.clear();
      store.delete(HOSTED_TEST_COORDINATOR_HOST_ID);
    },
  });
}
