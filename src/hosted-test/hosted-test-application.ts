
import type { LiveHost, LiveHostActions, LiveHostSchema, LiveHostSocketLike, LiveHostStore } from "hson-live/types";
import type { JsonValue } from "hson-live/types";
import type { TestExecutorDiscovery } from "../test-system/test-discovery";
import { decode_test_executor_discovery_request } from "../test-system/test-discovery";
import type { RunOptions, RunResult, TestEvent, TestFailure, TestSummary } from "../app/demos/test/tests.types";
import type { TestExecutorRegistry } from "../test-system/test-executor";
import { decode_run_selected_tests_request } from "../test-system/test-selected-run";
import { test_catalog_version } from "../test-system/test-catalog";
import { run_selected_test_ids } from "./run-selected-test-suites";
import { HostedTestUnknownSuiteError } from "../app/hosted-test/hosted-test-action-error";
import type {
  HostedTestActions,
  HostedTestCaseDiagnostic,
  HostedTestInspectRequest,
  HostedTestRunResult,
  HostedTestSelectedRunResult,
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
import {
  HOSTED_TEST_SELECTED_RUN_TARGET,
  is_hosted_test_suite_id,
  type HostedTestRunTarget,
  type HostedTestSuiteId,
  type HostedTestSuiteRegistry,
  type HostedTestSuiteRunner,
} from "../app/hosted-test/hosted-test-suite";
import {
  HOSTED_TEST_COORDINATOR_HOST_ID,
  type HostedTestCoordinatorState,
  type HostedTestRunAssociation,
} from "../app/hosted-test/hosted-test-application.types";
import { create_livehost_store, create_livehost } from "hson-live/livehost";

export { HOSTED_TEST_COORDINATOR_HOST_ID } from "../app/hosted-test/hosted-test-application.types";
export type { HostedTestCoordinatorState, HostedTestRunAssociation } from "../app/hosted-test/hosted-test-application.types";

type HostedTestReportActions = Readonly<{
  "tests.inspect": HostedTestInspectRequest;
}>;

export type HostedTestApplication = Readonly<{
  store: LiveHostStore;
  coordinator: LiveHost<HostedTestCoordinatorState, HostedTestActions>;
  retention: HostedTestRunRetention;
  connect(hostId: string, socket: LiveHostSocketLike): ReturnType<LiveHostStore["connect"]>;
  dispose(): void;
}>;

export type HostedTestApplicationOptions = Readonly<{
  makeRunId?: HostedTestRunIdFactory;
  report?: HostedTestReportOptions;
  inspectCase?: HostedTestCaseInspector;
  retention?: HostedTestRunRetention;
  discovery?: TestExecutorDiscovery;
  executorRegistry?: TestExecutorRegistry;
  runSelected?: (
    registry: TestExecutorRegistry,
    testIds: readonly string[],
    onEvent?: (event: TestEvent) => void,
    options?: RunOptions,
  ) => Promise<RunResult>;
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
  if ((options.discovery === undefined) !== (options.executorRegistry === undefined)) {
    throw new Error("HOSTED_TEST_EXECUTOR_CONFIGURATION_INVALID: Discovery and canonical executor registry must be configured together.");
  }
  if (options.discovery !== undefined && options.executorRegistry !== undefined) {
    const registryIds = options.executorRegistry.catalog.tests.map((descriptor) => descriptor.id).sort();
    const discoveryIds = options.discovery.catalog.tests.map((descriptor) => descriptor.id).sort();
    if (
      options.discovery.executor.id !== options.executorRegistry.executor.id
      || options.discovery.catalogVersion !== test_catalog_version(options.executorRegistry.catalog)
      || registryIds.length !== discoveryIds.length
      || registryIds.some((id, index) => id !== discoveryIds[index])
    ) {
      throw new Error("HOSTED_TEST_EXECUTOR_CONFIGURATION_INVALID: Discovery does not match the executable registry.");
    }
    if (
      options.executorRegistry.catalog.tests.some((descriptor) => descriptor.requirements.includes("synthetic-dom"))
      && options.runSelected === undefined
    ) {
      throw new Error(
        "HOSTED_TEST_EXECUTOR_CONFIGURATION_INVALID:"
        + " An executor advertising synthetic-dom tests must install a selected-run execution strategy.",
      );
    }
  }
  const store = create_livehost_store();
  const retention = options.retention ?? make_hosted_test_run_retention(16);
  const makeRunId = options.makeRunId ?? make_hosted_test_run_id;
  const reportHostIds = new Set<string>();

  type RunPlan = Readonly<{
    target: HostedTestRunTarget;
    run: HostedTestSuiteRunner;
    testIds?: readonly string[];
  }>;

  async function execute_run(
    plan: RunPlan,
    clientId: HostedTestRunAssociation["clientId"],
    requestId: HostedTestRunAssociation["requestId"],
    retainAssociation: (association: HostedTestRunAssociation) => void,
    replaceAssociation: (association: HostedTestRunAssociation) => void,
  ): Promise<HostedTestRunResult | HostedTestSelectedRunResult> {
    const runId = makeRunId() as HostedTestRunId;
    if (!runId) throw new Error("Hosted test run ID must be non-empty.");
    const reportHostId = `hosted-report:${runId}`;
    const reportActions: LiveHostActions<HostedTestReportActions, HostedTestReportState> = {
      "tests.inspect": async (_reportContext, inspectRequest) => {
        if (inspectRequest.runId !== runId) throw new Error(`HOSTED_TEST_UNKNOWN_RUN: Hosted test run "${inspectRequest.runId}" is not owned by this report host.`);
        if (retention.get(runId) === undefined) throw new Error(`HOSTED_TEST_UNKNOWN_RUN: Hosted test run "${runId}" is no longer inspectable.`);
        if (!options.inspectCase) throw new Error("HOSTED_TEST_INSPECTION_UNAVAILABLE: Case inspection is unavailable on this host.");
        const diagnostic: HostedTestCaseDiagnostic = await options.inspectCase({
          runId,
          suite: plan.target,
          caseKey: inspectRequest.caseKey,
        });
        return JSON.parse(JSON.stringify(diagnostic)) as JsonValue;
      },
    };
    const reportSchema: LiveHostSchema<HostedTestReportState, HostedTestReportActions> = {
      actions: { "tests.inspect": { payload: decode_inspect } },
    };
    const reportHost = create_livehost<HostedTestReportState, HostedTestReportActions>({
      state: make_initial_hosted_test_report(plan.target, runId) as HostedTestReportState,
      actions: reportActions,
      schema: reportSchema,
      logicalMapId: reportHostId,
    });
    const stored = store.set(reportHostId, reportHost);
    if (!stored.ok) throw new Error(stored.error.message);
    reportHostIds.add(reportHostId);
    retention.retain(runId, plan.target);
    const report = make_hosted_test_report(Date.now, undefined, plan.target, report_options(options.report, runId, reportHost.map));

    const association: HostedTestRunAssociation = {
      clientId,
      requestId,
      runId,
      reportHostId,
      suite: plan.target,
      status: "running",
      reportRev: reportHost.stream.headRev,
    };
    retainAssociation(association);

    const hostStartedAt = performance.now();
    let result: RunResult;
    try {
      result = await plan.run(report.reduce, { yieldEveryCases: 0, yieldBetweenSuites: false });
      report.complete(result, {
        runnerMs: finite(result.summary.msTotal, "timing.runnerMs"),
        hostMs: finite(performance.now() - hostStartedAt, "timing.hostMs"),
      });
    } catch (error) {
      report.failInfrastructure(error);
      replaceAssociation({ ...association, status: "error", reportRev: reportHost.stream.headRev });
      report.dispose();
      throw error;
    }

    report.dispose();
    const state = reportHost.map.capture().value;
    const status = state.run.status === "passed" ? "passed" : "failed";
    replaceAssociation({ ...association, status, reportRev: reportHost.stream.headRev });
    const timing = state.run.timing;
    if (timing === null) throw new Error("Hosted test report completed without timing.");
    const summary = normalize_summary(result.summary);
    if (plan.testIds !== undefined) {
      return {
        runId,
        reportHostId,
        reportRev: reportHost.stream.headRev,
        suite: HOSTED_TEST_SELECTED_RUN_TARGET,
        testIds: plan.testIds,
        ok: result.ok,
        summary,
        timing,
      };
    }
    if (!is_hosted_test_suite_id(plan.target)) {
      throw new Error(`Hosted test legacy run has invalid report target "${plan.target}".`);
    }
    return {
      runId,
      reportHostId,
      reportRev: reportHost.stream.headRev,
      suite: plan.target,
      ok: result.ok,
      summary,
      timing,
    };
  }

  const actions: LiveHostActions<HostedTestActions, HostedTestCoordinatorState> = {
    "tests.discover": async () => {
      if (options.discovery === undefined) throw new Error("HOSTED_TEST_DISCOVERY_UNAVAILABLE: This compatibility host has no canonical executor registry.");
      return JSON.parse(JSON.stringify(options.discovery)) as JsonValue;
    },
    "tests.run": async (context, request, message) => {
      if (!message.clientId || !message.requestId) throw new Error("HOSTED_TEST_REQUEST_ID_REQUIRED: tests.run requires a retry-safe client and request identity.");
      let descriptor;
      try { descriptor = registry.get(request.suite); }
      catch { throw new HostedTestUnknownSuiteError(request.suite, true); }
      const clientId = message.clientId;
      const requestId = message.requestId;
      const retainAssociation = (association: HostedTestRunAssociation): void => {
        if (context.map.capture().value.requests[clientId] === undefined) {
          context.map.setMany(["requests"], { [clientId]: { [requestId]: association } });
        } else {
          context.map.setMany(["requests", clientId], { [requestId]: association });
        }
      };
      const replaceAssociation = (association: HostedTestRunAssociation): void => {
        context.map.replace(["requests", clientId, requestId], association);
      };
      const result = await execute_run(
        { target: descriptor.id, run: descriptor.run },
        clientId,
        requestId,
        retainAssociation,
        replaceAssociation,
      );
      return JSON.parse(JSON.stringify(result)) as JsonValue;
    },
    "tests.runSelected": async (context, request, message) => {
      if (!message.clientId || !message.requestId) throw new Error("HOSTED_TEST_REQUEST_ID_REQUIRED: tests.runSelected requires a retry-safe client and request identity.");
      if (options.executorRegistry === undefined) {
        throw new Error("HOSTED_TEST_SELECTED_EXECUTION_UNAVAILABLE: This host has no canonical executor registry.");
      }
      const executorRegistry = options.executorRegistry;
      const clientId = message.clientId;
      const requestId = message.requestId;
      const retainAssociation = (association: HostedTestRunAssociation): void => {
        if (context.map.capture().value.requests[clientId] === undefined) {
          context.map.setMany(["requests"], { [clientId]: { [requestId]: association } });
        } else {
          context.map.setMany(["requests", clientId], { [requestId]: association });
        }
      };
      const replaceAssociation = (association: HostedTestRunAssociation): void => {
        context.map.replace(["requests", clientId, requestId], association);
      };
      const result = await execute_run(
        {
          target: HOSTED_TEST_SELECTED_RUN_TARGET,
          testIds: request.testIds,
          run: (onEvent, runOptions) => (options.runSelected ?? run_selected_test_ids)(
            executorRegistry,
            request.testIds,
            onEvent ?? (() => undefined),
            runOptions,
          ),
        },
        clientId,
        requestId,
        retainAssociation,
        replaceAssociation,
      );
      return JSON.parse(JSON.stringify(result)) as JsonValue;
    },
    // Compatibility only: production inspection is registered on each report
    // host so it shares that run's session and retry-safe action namespace.
    "tests.inspect": async () => {
      throw new Error("HOSTED_TEST_INSPECTION_MOVED: Connect to the run report host before inspecting a case.");
    },
  };
  const schema: LiveHostSchema<HostedTestCoordinatorState, HostedTestActions> = {
    actions: {
      "tests.discover": { payload: decode_test_executor_discovery_request },
      "tests.run": { payload: decode_run },
      "tests.runSelected": { payload: decode_run_selected_tests_request },
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
    connect(hostId, socket) {
      return store.connect(hostId, socket);
    },
    dispose() {
      coordinator.dispose();
      for (const id of reportHostIds) {
        const host = store.get(id);
        host?.dispose();
        store.delete(id);
      }
      reportHostIds.clear();
      retention.clear();
      store.delete(HOSTED_TEST_COORDINATOR_HOST_ID);
    },
  });
}
