
import type {
  LiveHost,
  LiveHostActions,
  LiveHostActionsForMap,
  LiveHostAuthorityAcquisition,
  LiveHostAuthorityEvictionResult,
  LiveHostAuthorityRegistry,
  LiveHostConnectionContext,
  LiveHostForMap,
  LiveHostSchema,
  LiveHostSocketLike,
  LiveHostStore,
} from "hson-live/types";
import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestExecutorDiscovery } from "../core/test-discovery";
import { decode_test_executor_discovery_request } from "../core/test-discovery";
import type { RunOptions, RunResult, TestEvent, TestFailure, TestSummary } from "../core/test-contracts";
import type { TestExecutorRegistry } from "../core/test-executor";
import { decode_run_selected_tests_request } from "../core/test-selected-run";
import { make_test_run_plan, type TestRunPlan } from "../core/test-run-plan";
import { run_selected_test_ids } from "../core/run-selected-test-suites";
import { HostedTestUnknownSuiteError } from "./hosted-test-action-error";
import type {
  HostedTestActions,
  HostedTestCaseDiagnostic,
  HostedTestInspectRequest,
  HostedTestRunResult,
  HostedTestSelectedRunResult,
} from "./hosted-test-action.types";
import {
  make_hosted_test_run_id,
  make_hosted_test_run_retention,
  type HostedTestCaseInspector,
  type HostedTestRunIdFactory,
  type HostedTestRunRetention,
} from "./hosted-test-action";
import {
  HOSTED_TEST_REPORT_SCHEMA,
  make_hosted_test_report,
  make_initial_hosted_test_report,
  type HostedTestReportOptions,
} from "../reporting/hosted/hosted-test-report";
import type { HostedTestReport, HostedTestReportMap, HostedTestReportState } from "../reporting/hosted/hosted-test-report.types";
import type { HostedTestRunId } from "../reporting/hosted/hosted-test-report-wire.types";
import {
  HOSTED_TEST_SELECTED_RUN_TARGET,
  is_hosted_test_suite_id,
  type HostedTestRunTarget,
  type HostedTestSuiteId,
  type HostedTestSuiteRegistry,
  type HostedTestSuiteRunner,
} from "./hosted-test-suite";
import {
  HOSTED_TEST_COORDINATOR_HOST_ID,
  type HostedTestCoordinatorState,
  type HostedTestRunAssociation,
} from "./hosted-test-application.types";
import {
  create_livehost,
  create_livehost_authority_registry,
  create_livehost_store,
} from "hson-live/livehost";

export { HOSTED_TEST_COORDINATOR_HOST_ID } from "./hosted-test-application.types";
export type { HostedTestCoordinatorState, HostedTestRunAssociation } from "./hosted-test-application.types";

type HostedTestReportActions = Readonly<{
  "tests.inspect": HostedTestInspectRequest;
}>;

type HostedTestReportHost = LiveHostForMap<HostedTestReportMap, HostedTestReportActions>;

export type HostedTestApplication = Readonly<{
  store: LiveHostStore;
  coordinator: LiveHost<HostedTestCoordinatorState, HostedTestActions>;
  retention: HostedTestRunRetention;
  connect(
    hostId: string,
    socket: LiveHostSocketLike,
    context?: LiveHostConnectionContext,
  ): ReturnType<LiveHostStore["connect"]>;
  connectBounded(
    hostId: string,
    socket: LiveHostSocketLike,
    context?: LiveHostConnectionContext,
  ): Promise<ReturnType<LiveHostStore["connect"]>>;
  reportCount(): number;
  hasReport(hostId: string): boolean;
  evictReport(hostId: string): Promise<LiveHostAuthorityEvictionResult>;
  sweepReports(): Promise<number>;
  dispose(): void | Promise<void>;
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
  lifecycle?: Readonly<{
    maxReports: number;
    terminalRetentionMs: number;
    sweepIntervalMs?: number;
    now?: () => number;
    schedule?: (delayMs: number, callback: () => void) => () => void;
  }>;
}>;

function finite(value: number, field: string): number {
  if (!Number.isFinite(value)) throw new Error(`Hosted test result has non-finite ${field}.`);
  return value;
}

function normalize_failure(failure: TestFailure): TestFailure {
  return {
    suite: failure.suite,
    ...(failure.caseId === undefined ? {} : { caseId: failure.caseId }),
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
  map: HostedTestReportHost["map"],
  mutate: HostedTestReportHost["mutate"],
  runPlan?: TestRunPlan,
): HostedTestReportOptions {
  return {
    runId,
    map: map as unknown as HostedTestReportMap,
    mutate: (operation) => mutate((draft) => operation(draft as unknown as HostedTestReportMap)),
    ...(runPlan === undefined ? {} : { runPlan }),
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

  type ExecutionPlan = Readonly<{
    target: HostedTestRunTarget;
    run: HostedTestSuiteRunner;
    testIds?: readonly string[];
  }>;
  type ReportHost = HostedTestReportHost;
  type ReportBlueprint = Readonly<{ runId: HostedTestRunId; plan: ExecutionPlan; reportPlan?: TestRunPlan }>;
  const reportBlueprints = new Map<string, ReportBlueprint>();

  function create_report_host(reportHostId: string, blueprint: ReportBlueprint): ReportHost {
    const { runId, plan, reportPlan } = blueprint;
    const reportActions: LiveHostActionsForMap<HostedTestReportActions, HostedTestReportMap> = {
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
    const map = hson.liveMap.fromJson(
      make_initial_hosted_test_report(plan.target, runId, reportPlan) as HostedTestReportState,
    ).schema.use(HOSTED_TEST_REPORT_SCHEMA) as unknown as HostedTestReportMap;
    return create_livehost({
      map,
      actions: reportActions,
      schema: reportSchema,
      logicalMapId: reportHostId,
    });
  }

  const reportRegistry: LiveHostAuthorityRegistry<ReportHost> | undefined = options.lifecycle === undefined
    ? undefined
    : create_livehost_authority_registry<ReportHost>({
        maxAuthorities: options.lifecycle.maxReports,
        idleMs: options.lifecycle.terminalRetentionMs,
        ...(options.lifecycle.sweepIntervalMs === undefined ? {} : { sweepIntervalMs: options.lifecycle.sweepIntervalMs }),
        ...(options.lifecycle.now === undefined ? {} : { now: options.lifecycle.now }),
        ...(options.lifecycle.schedule === undefined ? {} : { schedule: options.lifecycle.schedule }),
        create(reportHostId) {
          const blueprint = reportBlueprints.get(reportHostId);
          if (blueprint === undefined) throw new Error("Hosted report authority is unknown or evicted.");
          return create_report_host(reportHostId, blueprint);
        },
        dispose(host) {
          const runId = host.stream.logicalMapId.slice("hosted-report:".length) as HostedTestRunId;
          reportBlueprints.delete(host.stream.logicalMapId);
          reportHostIds.delete(host.stream.logicalMapId);
          retention.remove(runId);
          host.dispose();
        },
      });

  async function execute_run(
    plan: ExecutionPlan,
    clientId: HostedTestRunAssociation["clientId"],
    requestId: HostedTestRunAssociation["requestId"],
    retainAssociation: (association: HostedTestRunAssociation) => void,
    replaceAssociation: (association: HostedTestRunAssociation) => void,
  ): Promise<HostedTestRunResult | HostedTestSelectedRunResult> {
    const runId = makeRunId() as HostedTestRunId;
    if (!runId) throw new Error("Hosted test run ID must be non-empty.");
    const reportHostId = `hosted-report:${runId}`;
    const reportPlan = plan.testIds === undefined || options.discovery === undefined
      ? undefined
      : make_test_run_plan({
          runId,
          protocolVersion: options.discovery.protocolVersion,
          catalogVersion: options.discovery.catalogVersion,
          executorId: options.discovery.executor.id,
          catalog: options.discovery.catalog,
          selectedIds: plan.testIds,
        });
    let reportAcquisition: LiveHostAuthorityAcquisition<ReportHost> | undefined;
    let reportHost: ReportHost;
    if (reportRegistry === undefined) {
      reportHost = create_report_host(reportHostId, { runId, plan, ...(reportPlan === undefined ? {} : { reportPlan }) });
      const stored = store.set(
        reportHostId,
        reportHost as unknown as LiveHost<HostedTestReportState, HostedTestReportActions>,
      );
      if (!stored.ok) throw new Error(stored.error.message);
    } else {
      if (reportRegistry.has(reportHostId) || reportBlueprints.has(reportHostId)) {
        throw new Error(`LIVEHOST_STORE_DUPLICATE_ID: Hosted report authority already exists: ${reportHostId}`);
      }
      reportBlueprints.set(reportHostId, { runId, plan, ...(reportPlan === undefined ? {} : { reportPlan }) });
      const acquired = await reportRegistry.acquire(reportHostId);
      if (!acquired.ok) {
        reportBlueprints.delete(reportHostId);
        throw new Error(`${acquired.error.code}: ${acquired.error.message}`);
      }
      reportAcquisition = acquired.value;
      reportHost = acquired.value.authority;
    }
    try {
      reportHostIds.add(reportHostId);
      retention.retain(runId, plan.target);
      const report = make_hosted_test_report(
        Date.now,
        undefined,
        plan.target,
        report_options(options.report, runId, reportHost.map, reportHost.mutate, reportPlan),
      );

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
        await report.settle();
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
    } finally {
      reportAcquisition?.release();
    }
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
          void context.mutate((draft) => draft.setMany(["requests"], { [clientId]: { [requestId]: association } }));
        } else {
          void context.mutate((draft) => draft.setMany(["requests", clientId], { [requestId]: association }));
        }
      };
      const replaceAssociation = (association: HostedTestRunAssociation): void => {
        void context.mutate((draft) => draft.replace(["requests", clientId, requestId], association));
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
          void context.mutate((draft) => draft.setMany(["requests"], { [clientId]: { [requestId]: association } }));
        } else {
          void context.mutate((draft) => draft.setMany(["requests", clientId], { [requestId]: association }));
        }
      };
      const replaceAssociation = (association: HostedTestRunAssociation): void => {
        void context.mutate((draft) => draft.replace(["requests", clientId, requestId], association));
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
    connect(hostId, socket, context) {
      return store.connect(hostId, socket, context);
    },
    async connectBounded(hostId, socket, context) {
      if (hostId === HOSTED_TEST_COORDINATOR_HOST_ID || reportRegistry === undefined) {
        return store.connect(hostId, socket, context);
      }
      if (!reportRegistry.has(hostId)) {
        return { ok: false, error: { code: "LIVEHOST_STORE_UNKNOWN_ID", message: `Unknown hosted report authority: ${hostId}` } };
      }
      const acquired = await reportRegistry.acquire(hostId);
      if (!acquired.ok) return acquired;
      try {
        return { ok: true, value: acquired.value.authority.connect(socket, context) };
      } finally {
        acquired.value.release();
      }
    },
    reportCount: () => reportRegistry?.diagnostics().entryCount ?? reportHostIds.size,
    hasReport: (hostId) => reportRegistry?.has(hostId) ?? reportHostIds.has(hostId),
    evictReport: (hostId) => reportRegistry?.evict(hostId) ?? Promise.resolve(
      reportHostIds.has(hostId)
        ? { status: "busy" as const, blockers: Object.freeze(["acquisition" as const]) }
        : { status: "not-found" as const },
    ),
    sweepReports: () => reportRegistry?.sweep() ?? Promise.resolve(0),
    async dispose() {
      coordinator.dispose();
      if (reportRegistry !== undefined) {
        await reportRegistry.dispose();
      } else {
        for (const id of reportHostIds) {
          const host = store.get(id);
          host?.dispose();
          store.delete(id);
        }
      }
      reportHostIds.clear();
      reportBlueprints.clear();
      retention.clear();
      store.delete(HOSTED_TEST_COORDINATOR_HOST_ID);
    },
  });
}
