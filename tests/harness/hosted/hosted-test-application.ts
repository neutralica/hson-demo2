
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
import type { TestExecutorDiscovery } from "../../../src/shared/testing/test-discovery-contract";
import { decode_test_executor_discovery_request } from "../../../src/shared/testing/test-discovery-contract";
import { TEST_SUBJECT_IDENTIFIERS, type TestFailure, type TestSummary } from "../../../src/shared/testing/test-contracts";
import type { RunOptions, RunResult, TestEvent } from "../core/test-contracts";
import type { TestExecutorRegistry } from "../core/test-executor";
import { decode_run_selected_tests_request } from "../../../src/shared/testing/test-run-contract";
import { make_test_run_plan } from "../core/test-run-plan";
import type { TestRunPlan } from "../../../src/shared/testing/test-run-contract";
import { run_selected_test_ids } from "../core/run-selected-test-suites";
import type { HostedTestActions, HostedTestCancelResult, HostedTestCaseDiagnostic, HostedTestInspectRequest, HostedTestSelectedRunResult } from "../../../src/shared/hosted-tests/hosted-test-action.types";
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
  type HostedTestReportController,
  type HostedTestReportOptions,
} from "../reporting/hosted/hosted-test-report";
import type { HostedTestReport, HostedTestReportMap, HostedTestReportState } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import type { HostedTestRunId } from "../../../src/shared/hosted-tests/hosted-test-report-wire.types";
import { HOSTED_TEST_SELECTED_RUN_TARGET, type HostedTestRunTarget } from "../../../src/shared/hosted-tests/hosted-test-suite-contract";
import { HOSTED_TEST_COORDINATOR_HOST_ID, type HostedTestAttemptId, type HostedTestCoordinatedRun, type HostedTestCoordinatorMap, type HostedTestCoordinatorState, type HostedTestRunAssociation, type HostedTestRunRequestAssociation } from "../../../src/shared/hosted-tests/hosted-test-application.types";
import {
  make_hosted_test_execution_control,
  type HostedTestExecutionControl,
} from "./hosted-test-execution-control";
import {
  create_livehost,
  create_livehost_authority_registry,
  create_livehost_store,
} from "hson-live/livehost";
import { HOSTED_TEST_RUN_OPTIONS } from "./hosted-test-scheduling";
import { observe_hosted_test_timeline, type HostedTestTimelineObserver } from "../../../src/shared/hosted-tests/hosted-test-timeline";

export { HOSTED_TEST_COORDINATOR_HOST_ID } from "../../../src/shared/hosted-tests/hosted-test-application.types";
export type {
  HostedTestAttemptId,
  HostedTestCoordinatedRun,
  HostedTestCoordinatorState,
  HostedTestRunAssociation,
  HostedTestRunRequestAssociation,
} from "../../../src/shared/hosted-tests/hosted-test-application.types";

// Temporary Cloudflare localization surface. Remove with tests.diagnostic.runLane.
export type HostedTestDiagnosticLane = "runner" | "report-map" | "report-authority";
export type HostedTestDiagnosticRunLanePayload = Readonly<{
  lane: HostedTestDiagnosticLane;
  selectionIds: readonly string[];
}>;
export type HostedTestDiagnosticRunLaneResult = Readonly<{
  lane: HostedTestDiagnosticLane;
  selectionCount: number;
  summary: Readonly<{ suites: number; cases: number; pass: number; fail: number }>;
  elapsedMs: number;
  runnerMs: number;
  report: Readonly<{
    reducer: boolean;
    map: boolean;
    authority: boolean;
    rev?: number;
  }>;
}>;

type HostedTestApplicationActions = HostedTestActions & Readonly<{
  /** LiveHost's JSON action constraint spells wire arrays as mutable arrays. */
  "tests.diagnostic.runLane": Readonly<{ lane: HostedTestDiagnosticLane; selectionIds: string[] }>;
}>;

export type HostedTestDiagnosticConstructionEvent =
  | "runner"
  | "report-reducer"
  | "report-map"
  | "report-authority"
  | "report-authority-disposed";

export const HOSTED_TEST_COORDINATOR_SCHEMA = hson.liveMap.schema.define((s) => {
  const nonNegativeInteger = s.number.constrain(
    "non-negative integer",
    (value) => Number.isSafeInteger(value) && value >= 0,
  );
  const positiveInteger = s.number.constrain(
    "positive integer",
    (value) => Number.isSafeInteger(value) && value >= 1,
  );
  const plannedCase = s.object.exact({
    id: s.string,
    caseId: s.string,
    title: s.string,
    order: nonNegativeInteger,
  });
  const plannedSuite = s.object.exact({
    id: s.string,
    title: s.string,
    subject: s.pick(...TEST_SUBJECT_IDENTIFIERS),
    collections: s.array(s.pick("unit", "dev")),
    provenance: s.pick("hson-demo2", "hson-live"),
    order: nonNegativeInteger,
    executionShape: s.pick("cases", "browser-journeys", "opaque-aggregate", "certification-aggregate"),
    executorId: s.string.optional,
    sourceRef: s.string.optional,
    declaredChecks: nonNegativeInteger.optional,
    cases: s.array(plannedCase),
  });
  const runPlan = s.object.exact({
    runId: s.string,
    protocolVersion: positiveInteger,
    catalogVersion: s.string,
    executorId: s.string,
    selectionIds: s.array(s.string),
    suites: s.array(plannedSuite),
  });
  const request = s.object.exact({
    clientId: s.string,
    requestId: s.string,
    runId: s.string,
    attemptId: s.string,
  });
  const attempt = s.object.exact({
    id: s.string,
    ordinal: positiveInteger,
    reportHostId: s.string,
    controlStatus: s.pick("accepted", "running", "cancelling", "settled"),
    cancellation: s.object.exact({ clientId: s.string, requestId: s.string }).nullable,
  });
  const run = s.object.exact({
    id: s.string,
    clientId: s.string,
    requestId: s.string,
    suite: s.pick(HOSTED_TEST_SELECTED_RUN_TARGET),
    activeAttemptId: s.string,
    acceptedPlan: runPlan,
    attempts: s.record(attempt),
  });
  return s.object.exact({
    requests: s.record(s.record(request.optional).optional),
    runs: s.record(run.optional),
  });
});

type HostedTestReportActions = Readonly<{
  "tests.inspect": HostedTestInspectRequest;
  "tests.ready": Readonly<{ runId: string }>;
}>;

type HostedTestReportHost = LiveHostForMap<HostedTestReportMap, HostedTestReportActions>;

export type HostedTestApplication = Readonly<{
  store: LiveHostStore;
  coordinator: LiveHostForMap<HostedTestCoordinatorMap, HostedTestApplicationActions>;
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
  makeAttemptId?: (runId: HostedTestRunId, ordinal: number) => HostedTestAttemptId;
  inspectCase?: HostedTestCaseInspector;
  retention?: HostedTestRunRetention;
  discovery: TestExecutorDiscovery;
  executorRegistry: TestExecutorRegistry;
  runSelected?: (
    registry: TestExecutorRegistry,
    selectionIds: readonly string[],
    onEvent?: (event: TestEvent) => void,
    options?: RunOptions,
  ) => Promise<RunResult>;
  timeline?: HostedTestTimelineObserver;
  /** Temporary construction proof for tests.diagnostic.runLane. */
  observeDiagnosticConstruction?: (event: HostedTestDiagnosticConstructionEvent) => void;
  /** Production control-plane barrier: execution begins after initial report projection acknowledges readiness. */
  requireReportReady?: boolean;
  assignExecutor?: (suite: TestExecutorDiscovery["catalog"]["suites"][number]) => string;
  lifecycle?: Readonly<{
    maxReports: number;
    terminalRetentionMs: number;
    sweepIntervalMs?: number;
    now?: () => number;
    schedule?: (delayMs: number, callback: () => void) => () => void;
  }>;
}>;

export const HOSTED_TEST_AUTHORITY_LIFECYCLE = Object.freeze({
  maxReports: 16,
  terminalRetentionMs: 10 * 60_000,
  sweepIntervalMs: 30_000,
});

function redact_hosted_server_diagnostic_text(value: string, maxLength: number): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b(authorization|cookie|token|credential|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/((?:wss?|https?):\/\/[^\s?#]+)\?[^\s#]*/gi, "$1?[redacted]")
    .slice(0, maxLength);
}

function safe_hosted_server_error(error: unknown, depth = 0): Readonly<Record<string, unknown>> {
  if (!(error instanceof Error)) return Object.freeze({ type: error === null ? "null" : typeof error });
  const code = Reflect.get(error, "code");
  return Object.freeze({
    name: error.name,
    message: redact_hosted_server_diagnostic_text(error.message, 2_048),
    ...(typeof code === "string" && /^[A-Z][A-Z0-9_]{0,95}$/.test(code) ? { code } : {}),
    ...(error.stack === undefined ? {} : { stack: redact_hosted_server_diagnostic_text(error.stack, 8_192) }),
    ...(depth === 0 && error.cause instanceof Error ? { cause: safe_hosted_server_error(error.cause, depth + 1) } : {}),
  });
}

function log_hosted_server_action_failure(
  action: keyof HostedTestActions & string,
  error: unknown,
  context: Readonly<{
    clientId?: string;
    requestId?: string;
    runId?: string;
    attemptId?: string;
    executorId?: string;
  }>,
): void {
  console.error(`[hosted-tests] ${action} failed`, Object.freeze({
    application: "hosted-tests",
    action,
    authorityId: HOSTED_TEST_COORDINATOR_HOST_ID,
    ...(context.clientId === undefined ? {} : { clientId: context.clientId }),
    ...(context.requestId === undefined ? {} : { requestId: context.requestId }),
    ...(context.runId === undefined ? {} : { runId: context.runId }),
    ...(context.attemptId === undefined ? {} : { attemptId: context.attemptId }),
    ...(context.executorId === undefined ? {} : { executorId: context.executorId }),
    error: safe_hosted_server_error(error),
  }));
}

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

function decode_cancel(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, issues: ["tests.cancel requires exact runId and attemptId strings."] } as const;
  }
  const record = value as { runId?: unknown; attemptId?: unknown };
  if (Object.keys(record).length !== 2 || typeof record.runId !== "string" || !record.runId
    || typeof record.attemptId !== "string" || !record.attemptId) {
    return { ok: false, issues: ["tests.cancel requires exact non-empty runId and attemptId strings."] } as const;
  }
  return { ok: true, value: { runId: record.runId, attemptId: record.attemptId } } as const;
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

function decode_report_ready(value: unknown) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.keys(value).length === 1 && typeof (value as { runId?: unknown }).runId === "string"
    && (value as { runId: string }).runId.length > 0) {
    return { ok: true, value: { runId: (value as { runId: string }).runId } } as const;
  }
  return { ok: false, issues: ["tests.ready requires one non-empty runId string."] } as const;
}

function decode_diagnostic_run_lane(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, issues: ["tests.diagnostic.runLane requires exact lane and selectionIds fields."] } as const;
  }
  const record = value as { lane?: unknown; selectionIds?: unknown };
  if (Object.keys(record).length !== 2
    || (record.lane !== "runner" && record.lane !== "report-map" && record.lane !== "report-authority")) {
    return { ok: false, issues: ["tests.diagnostic.runLane lane must be exactly runner, report-map, or report-authority."] } as const;
  }
  const selection = decode_run_selected_tests_request({ selectionIds: record.selectionIds });
  if (!selection.ok) return selection;
  return {
    ok: true,
    value: Object.freeze({ lane: record.lane, selectionIds: selection.value.selectionIds }),
  } as const;
}

function report_options(
  map: HostedTestReportHost["map"],
  mutate: HostedTestReportHost["mutate"],
  runPlan: TestRunPlan,
): HostedTestReportOptions {
  return {
    captureCommits: false,
    map: map as unknown as HostedTestReportMap,
    mutate: (operation) => mutate((draft) => operation(draft as unknown as HostedTestReportMap)),
    runPlan,
  };
}

export function create_hosted_test_application(
  options: HostedTestApplicationOptions,
): HostedTestApplication {
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
  const store = create_livehost_store();
  const retention = options.retention ?? make_hosted_test_run_retention(16);
  const makeRunId = options.makeRunId ?? make_hosted_test_run_id;
  const makeAttemptId = options.makeAttemptId ?? ((runId: HostedTestRunId, ordinal: number) => (
    `${runId}:attempt:${ordinal}`
  ));
  const reportHostIds = new Set<string>();
  const projectedReportIds = new Set<string>();
  const reportProjectionWaiters = new Map<string, Set<() => void>>();
  const mark_report_projected = (runId: string): void => {
    projectedReportIds.add(runId);
    for (const resolve of reportProjectionWaiters.get(runId) ?? []) resolve();
    reportProjectionWaiters.delete(runId);
  };
  const wait_for_report_projection_or_cancel = async (runId: string, signal: AbortSignal): Promise<void> => {
    if (signal.aborted || projectedReportIds.has(runId)) return;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", finish);
        const waiters = reportProjectionWaiters.get(runId);
        waiters?.delete(finish);
        if (waiters?.size === 0) reportProjectionWaiters.delete(runId);
        resolve();
      };
      const waiters = reportProjectionWaiters.get(runId) ?? new Set();
      waiters.add(finish);
      reportProjectionWaiters.set(runId, waiters);
      signal.addEventListener("abort", finish, { once: true });
      if (signal.aborted || projectedReportIds.has(runId)) finish();
    });
  };
  const clear_report_projection = (runId: string): void => {
    projectedReportIds.delete(runId);
    for (const resolve of reportProjectionWaiters.get(runId) ?? []) resolve();
    reportProjectionWaiters.delete(runId);
  };

  type ExecutionPlan = Readonly<{
    target: typeof HOSTED_TEST_SELECTED_RUN_TARGET;
    run: (onEvent?: (event: TestEvent) => void, options?: RunOptions) => Promise<RunResult>;
    selectionIds: readonly string[];
  }>;
  type ReportHost = HostedTestReportHost;
  type ReportBlueprint = Readonly<{
    runId: HostedTestRunId;
    clientId: HostedTestRunAssociation["clientId"];
    requestId: HostedTestRunAssociation["requestId"];
    attemptId: HostedTestAttemptId;
    plan: ExecutionPlan;
    reportPlan: TestRunPlan;
  }>;
  const reportBlueprints = new Map<string, ReportBlueprint>();
  const coordinatorMap = hson.liveMap.fromJson({ requests: {}, runs: {} })
    .schema.use(HOSTED_TEST_COORDINATOR_SCHEMA) as unknown as HostedTestCoordinatorMap;
  const attemptControls = new Map<string, HostedTestExecutionControl>();
  let coordinator: LiveHostForMap<HostedTestCoordinatorMap, HostedTestApplicationActions>;
  let disposing = false;

  function create_report_map(reportPlan: TestRunPlan, diagnostic = false): HostedTestReportMap {
    const initial = make_initial_hosted_test_report(reportPlan) as HostedTestReportState;
    observe_hosted_test_timeline(options.timeline, "report_seeded_queued", {
      runId: reportPlan.runId,
      suites: initial.suiteRuns.length,
      cases: initial.suiteRuns.reduce((total, suiteRun) => total + suiteRun.cases.length, 0),
    });
    const map = hson.liveMap.fromJson(initial).schema.use(HOSTED_TEST_REPORT_SCHEMA) as unknown as HostedTestReportMap;
    if (diagnostic) options.observeDiagnosticConstruction?.("report-map");
    return map;
  }

  function create_report_host(reportHostId: string, blueprint: ReportBlueprint, diagnostic = false): ReportHost {
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
      "tests.ready": async (_reportContext, request) => {
        if (request.runId !== runId) throw new Error(`HOSTED_TEST_UNKNOWN_RUN: Hosted test run "${request.runId}" is not owned by this report host.`);
        mark_report_projected(runId);
        return { ready: true };
      },
    };
    const reportSchema: LiveHostSchema<HostedTestReportState, HostedTestReportActions> = {
      actions: {
        "tests.inspect": { payload: decode_inspect },
        "tests.ready": { payload: decode_report_ready },
      },
    };
    const map = create_report_map(reportPlan, diagnostic);
    const host = create_livehost({
      map,
      actions: reportActions,
      schema: reportSchema,
      logicalMapId: reportHostId,
    });
    if (diagnostic) options.observeDiagnosticConstruction?.("report-authority");
    observe_hosted_test_timeline(options.timeline, "report_host_allocated", { runId, reportHostId });
    observe_hosted_test_timeline(options.timeline, "initial_report_mutation_committed", {
      runId,
      revision: host.stream.headRev,
      initialAuthorityState: true,
    });
    return host;
  }

  async function run_diagnostic_lane(
    payload: HostedTestDiagnosticRunLanePayload,
  ): Promise<HostedTestDiagnosticRunLaneResult> {
    const startedAt = performance.now();
    const runId = makeRunId() as HostedTestRunId;
    if (!runId) throw new Error("Hosted diagnostic run ID must be non-empty.");
    const reportPlan = make_test_run_plan({
      runId,
      protocolVersion: options.discovery.protocolVersion,
      catalogVersion: options.discovery.catalogVersion,
      executorId: options.discovery.executor.id,
      catalog: options.discovery.catalog,
      selectedIds: payload.selectionIds,
      ...(options.assignExecutor === undefined ? {} : { assignExecutor: options.assignExecutor }),
    });
    const executionControl = make_hosted_test_execution_control();
    let report: HostedTestReportController | undefined;
    let reportMap: HostedTestReportMap | undefined;
    let reportAuthority: ReportHost | undefined;
    let result: RunResult | undefined;
    const lifecycleSink = { events: 0, terminalCases: 0, terminalSuites: 0 };
    try {
      if (payload.lane === "report-map") {
        reportMap = create_report_map(reportPlan, true);
      } else if (payload.lane === "report-authority") {
        reportAuthority = create_report_host(`hosted-diagnostic-report:${runId}`, {
          runId,
          clientId: "diagnostic",
          requestId: "diagnostic",
          attemptId: `${runId}:diagnostic`,
          plan: { target: HOSTED_TEST_SELECTED_RUN_TARGET, selectionIds: reportPlan.selectionIds, run: () => Promise.reject(new Error("unused diagnostic report blueprint")) },
          reportPlan,
        }, true);
        reportMap = reportAuthority.map as unknown as HostedTestReportMap;
      }
      if (reportMap !== undefined) {
        const mutate: NonNullable<HostedTestReportOptions["mutate"]> = reportAuthority === undefined
          ? (operation) => Promise.resolve().then(() => operation(reportMap!))
          : (operation) => reportAuthority!.mutate((draft) => operation(draft as unknown as HostedTestReportMap));
        report = make_hosted_test_report(Date.now, undefined, {
          ...report_options(reportMap as unknown as HostedTestReportHost["map"], mutate as HostedTestReportHost["mutate"], reportPlan),
          captureCommits: false,
        });
        options.observeDiagnosticConstruction?.("report-reducer");
      }

      if (!executionControl.begin()) throw new Error("Hosted diagnostic execution control did not begin.");
      options.observeDiagnosticConstruction?.("runner");
      result = await (options.runSelected ?? run_selected_test_ids)(
        options.executorRegistry,
        reportPlan.selectionIds,
        (event) => {
          lifecycleSink.events += 1;
          if (event.t === "case_end" || event.t === "case_cancelled" || event.t === "external_end") lifecycleSink.terminalCases += 1;
          if (event.t === "suite_end") lifecycleSink.terminalSuites += 1;
          report?.reduce(event);
        },
        { ...HOSTED_TEST_RUN_OPTIONS, signal: executionControl.signal },
      );
      const naturalTerminal = await executionControl.acceptNaturalTerminal();
      if (!naturalTerminal) result = Object.freeze({ ...result, ok: false, cancelled: true });
      if (report !== undefined) {
        const timing = {
          runnerMs: finite(result.summary.msTotal, "diagnostic.runnerMs"),
          hostMs: finite(performance.now() - startedAt, "diagnostic.hostMs"),
        };
        if (naturalTerminal) report.complete(result, timing);
        else report.cancel(result, timing);
        await report.settle();
        const terminal = report.map.capture().value;
        if (terminal.summary.cases !== result.summary.cases
          || terminal.summary.pass !== result.summary.pass
          || terminal.summary.fail !== result.summary.fail
          || terminal.summary.skip !== result.summary.skip) {
          throw new Error("HOSTED_TEST_DIAGNOSTIC_REPORT_MISMATCH: Report terminal summary differs from runner truth.");
        }
      }
      const elapsedMs = finite(performance.now() - startedAt, "diagnostic.elapsedMs");
      void lifecycleSink;
      return Object.freeze({
        lane: payload.lane,
        selectionCount: reportPlan.selectionIds.length,
        summary: Object.freeze({
          suites: result.summary.suites,
          cases: result.summary.cases,
          pass: result.summary.pass,
          fail: result.summary.fail,
        }),
        elapsedMs,
        runnerMs: finite(result.summary.msTotal, "diagnostic.runnerMs"),
        report: Object.freeze({
          reducer: report !== undefined,
          map: reportMap !== undefined,
          authority: reportAuthority !== undefined,
          ...(reportMap === undefined ? {} : { rev: reportAuthority?.stream.headRev ?? reportMap.capture().rev }),
        }),
      });
    } catch (cause) {
      if (report !== undefined && result === undefined) {
        report.failInfrastructure(cause);
        await report.settle();
      }
      throw cause;
    } finally {
      report?.dispose();
      if (reportAuthority !== undefined) {
        reportAuthority.dispose();
        options.observeDiagnosticConstruction?.("report-authority-disposed");
      }
      executionControl.release();
    }
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
        async dispose(host) {
          const blueprint = reportBlueprints.get(host.stream.logicalMapId);
          if (!disposing && blueprint !== undefined) {
            const state = coordinator.map.capture().value;
            const run = state.runs[blueprint.runId];
            const attempt = run?.attempts[blueprint.attemptId];
            const request = state.requests[blueprint.clientId]?.[blueprint.requestId];
            const ownsRun = run?.id === blueprint.runId
              && run.clientId === blueprint.clientId
              && run.requestId === blueprint.requestId
              && run.activeAttemptId === blueprint.attemptId
              && attempt?.reportHostId === host.stream.logicalMapId;
            const ownsRequest = request?.runId === blueprint.runId
              && request.attemptId === blueprint.attemptId
              && request.clientId === blueprint.clientId
              && request.requestId === blueprint.requestId;
            await coordinator.mutate((draft) => draft.batch((tx) => {
              if (ownsRun) tx.delete(["runs", blueprint.runId]);
              if (ownsRequest) {
                const clientRequests = state.requests[blueprint.clientId];
                if (clientRequests !== undefined && Object.keys(clientRequests).length === 1) {
                  tx.delete(["requests", blueprint.clientId]);
                } else {
                  tx.delete(["requests", blueprint.clientId, blueprint.requestId]);
                }
              }
            }));
          }
          reportBlueprints.delete(host.stream.logicalMapId);
          reportHostIds.delete(host.stream.logicalMapId);
          if (blueprint !== undefined) {
            retention.remove(blueprint.runId);
            clear_report_projection(blueprint.runId);
          }
          host.dispose();
        },
      });

  function report_outcome(status: HostedTestReport["run"]["status"] | undefined): HostedTestCancelResult["outcome"] {
    if (status === "passed" || status === "failed" || status === "cancelled" || status === "error") return status;
    return "pending";
  }

  async function cancellation_result(
    state: HostedTestCoordinatorState,
    runId: HostedTestRunId,
    attemptId: HostedTestAttemptId,
  ): Promise<HostedTestCancelResult> {
    const run = state.runs[runId];
    const attempt = run?.attempts[attemptId];
    if (run === undefined || attempt === undefined || attempt.id !== attemptId) {
      throw new Error(`HOSTED_TEST_UNKNOWN_ATTEMPT: Hosted test attempt "${runId}/${attemptId}" is unavailable.`);
    }
    let status: HostedTestReport["run"]["status"] | undefined;
    if (reportRegistry === undefined) {
      const host = store.get(attempt.reportHostId) as LiveHost<HostedTestReportState, HostedTestReportActions> | undefined;
      status = host?.map.capture().value.run.status;
    } else if (reportRegistry.has(attempt.reportHostId)) {
      const acquired = await reportRegistry.acquire(attempt.reportHostId);
      if (acquired.ok) {
        try { status = acquired.value.authority.map.capture().value.run.status; }
        finally { acquired.value.release(); }
      }
    }
    return Object.freeze({
      runId,
      attemptId,
      reportHostId: attempt.reportHostId,
      accepted: attempt.cancellation !== null,
      controlStatus: attempt.controlStatus,
      outcome: report_outcome(status),
      cancellation: attempt.cancellation,
    });
  }

  async function execute_run(
    plan: ExecutionPlan,
    clientId: HostedTestRunAssociation["clientId"],
    requestId: HostedTestRunAssociation["requestId"],
    retainRun: (
      request: HostedTestRunRequestAssociation,
      run: HostedTestCoordinatedRun,
    ) => Promise<void>,
    setAttemptStatus: (
      runId: HostedTestRunId,
      attemptId: HostedTestAttemptId,
      status: "running" | "settled",
    ) => Promise<void>,
    identifyRun: (runId: HostedTestRunId, attemptId: HostedTestAttemptId) => void,
  ): Promise<HostedTestSelectedRunResult> {
    const runId = makeRunId() as HostedTestRunId;
    if (!runId) throw new Error("Hosted test run ID must be non-empty.");
    const attemptId = makeAttemptId(runId, 1);
    if (!attemptId) throw new Error("Hosted test attempt ID must be non-empty.");
    identifyRun(runId, attemptId);
    const reportHostId = `hosted-report:${runId}`;
    const reportPlan = make_test_run_plan({
      runId,
      protocolVersion: options.discovery.protocolVersion,
      catalogVersion: options.discovery.catalogVersion,
      executorId: options.discovery.executor.id,
      catalog: options.discovery.catalog,
      selectedIds: plan.selectionIds,
      ...(options.assignExecutor === undefined ? {} : { assignExecutor: options.assignExecutor }),
    });
    observe_hosted_test_timeline(options.timeline, "run_plan_created", {
      runId,
      selectedIds: reportPlan.selectionIds.length,
      suites: reportPlan.suites.length,
    });
    let reportAcquisition: LiveHostAuthorityAcquisition<ReportHost> | undefined;
    let reportHost: ReportHost;
    if (reportRegistry === undefined) {
      reportHost = create_report_host(reportHostId, {
        runId, clientId, requestId, attemptId, plan, reportPlan,
      });
      const stored = store.set(
        reportHostId,
        reportHost as unknown as LiveHost<HostedTestReportState, HostedTestReportActions>,
      );
      if (!stored.ok) throw new Error(stored.error.message);
    } else {
      if (reportRegistry.has(reportHostId) || reportBlueprints.has(reportHostId)) {
        throw new Error(`LIVEHOST_STORE_DUPLICATE_ID: Hosted report authority already exists: ${reportHostId}`);
      }
      reportBlueprints.set(reportHostId, {
        runId, clientId, requestId, attemptId, plan, reportPlan,
      });
      const acquired = await reportRegistry.acquire(reportHostId);
      if (!acquired.ok) {
        reportBlueprints.delete(reportHostId);
        throw new Error(`${acquired.error.code}: ${acquired.error.message}`);
      }
      reportAcquisition = acquired.value;
      reportHost = acquired.value.authority;
    }
    let associationRetained = false;
    let report: HostedTestReportController | undefined;
    const executionControl = make_hosted_test_execution_control();
    attemptControls.set(attemptId, executionControl);
    try {
      reportHostIds.add(reportHostId);
      retention.retain(runId, plan.target);
      const activeReport = make_hosted_test_report(
        Date.now,
        undefined,
        report_options(reportHost.map, reportHost.mutate, reportPlan),
      );
      report = activeReport;

      const requestAssociation: HostedTestRunRequestAssociation = {
        clientId,
        requestId,
        runId,
        attemptId,
      };
      const coordinatedRun: HostedTestCoordinatedRun = {
        id: runId,
        clientId,
        requestId,
        suite: plan.target,
        activeAttemptId: attemptId,
        acceptedPlan: reportPlan,
        attempts: {
          [attemptId]: {
            id: attemptId,
            ordinal: 1,
            reportHostId,
            controlStatus: "accepted",
            cancellation: null,
          },
        },
      };
      await retainRun(requestAssociation, coordinatedRun);
      associationRetained = true;
      observe_hosted_test_timeline(options.timeline, "coordinator_association_committed", { runId, attemptId, reportHostId });
      if (options.requireReportReady === true) {
        await wait_for_report_projection_or_cancel(runId, executionControl.signal);
        if (!executionControl.signal.aborted) {
          observe_hosted_test_timeline(options.timeline, "report_client_ready", { runId, reportHostId });
        }
      }

      const hostStartedAt = performance.now();
      let result: RunResult;
      try {
        let mayExecute = false;
        if (executionControl.phase() === "ready") {
          await setAttemptStatus(runId, attemptId, "running");
          mayExecute = executionControl.begin();
        }
        if (mayExecute) {
          let firstStartObserved = false;
          result = await plan.run((event) => {
            if (!executionControl.acceptsEvent(event)) return;
            if (!firstStartObserved && (event.t === "suite_begin" || event.t === "case_begin"
              || (event.t === "external_state" && event.status === "running"))) {
              firstStartObserved = true;
              observe_hosted_test_timeline(options.timeline, "first_suite_or_case_started", {
                runId,
                event: event.t,
                suite: event.suite,
              });
            }
            activeReport.reduce(event);
          }, { ...HOSTED_TEST_RUN_OPTIONS, signal: executionControl.signal });
        } else {
          result = Object.freeze({
            ok: false,
            cancelled: true,
            summary: Object.freeze({ suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: 0, failures: Object.freeze([]) }),
          });
        }
        const naturalTerminal = await executionControl.acceptNaturalTerminal();
        if (!naturalTerminal) result = Object.freeze({ ...result, ok: false, cancelled: true });
        observe_hosted_test_timeline(options.timeline, "run_finished", {
          runId,
          attemptId,
          runnerMs: result.summary.msTotal,
          cases: result.summary.cases,
          failures: result.summary.fail,
        });
        const timing = {
          runnerMs: finite(result.summary.msTotal, "timing.runnerMs"),
          hostMs: finite(performance.now() - hostStartedAt, "timing.hostMs"),
        };
        if (naturalTerminal) activeReport.complete(result, timing);
        else activeReport.cancel(result, timing);
        await activeReport.settle();
        if (!naturalTerminal) executionControl.markCancellationTerminal();
        observe_hosted_test_timeline(options.timeline, "report_terminal_committed", {
          runId,
          revision: reportHost.stream.headRev,
        });
      } catch (error) {
        const naturalTerminal = await executionControl.acceptNaturalTerminal();
        if (!naturalTerminal) {
          result = Object.freeze({
            ok: false,
            cancelled: true,
            summary: Object.freeze({ suites: 0, cases: 0, pass: 0, fail: 0, skip: 0, msTotal: performance.now() - hostStartedAt, failures: Object.freeze([]) }),
          });
          activeReport.cancel(result, {
            runnerMs: result.summary.msTotal,
            hostMs: performance.now() - hostStartedAt,
          });
          await activeReport.settle();
          executionControl.markCancellationTerminal();
        } else {
        activeReport.failInfrastructure(error);
        await activeReport.settle();
        await setAttemptStatus(runId, attemptId, "settled");
        activeReport.dispose();
        throw error;
        }
      }

      activeReport.dispose();
      const state = reportHost.map.capture().value;
      await setAttemptStatus(runId, attemptId, "settled");
      const timing = state.run.timing;
      if (timing === null) throw new Error("Hosted test report completed without timing.");
      const summary = normalize_summary(result.summary);
      const authoritativeFailures = state.suiteRuns.flatMap((suiteRun) => suiteRun.cases
          .filter((testCase) => testCase.status === "fail")
          .map((testCase) => Object.freeze({
            suite: suiteRun.id,
            caseId: testCase.caseId,
            name: testCase.title,
            err: testCase.err ?? "",
            ms: testCase.ms ?? 0,
          })));
      const authoritativeSummary = normalize_summary({
        suites: state.suiteRuns.length,
        cases: state.summary.cases,
        pass: state.summary.pass,
        fail: state.summary.fail,
        skip: state.summary.skip,
        msTotal: summary.msTotal,
        failures: authoritativeFailures,
      });
      return {
        runId,
        attemptId,
        reportHostId,
        reportRev: reportHost.stream.headRev,
        suite: HOSTED_TEST_SELECTED_RUN_TARGET,
        selectionIds: reportPlan.selectionIds,
        ok: state.run.status === "passed",
        cancelled: state.run.status === "cancelled",
        summary: authoritativeSummary,
        timing,
      };
    } finally {
      attemptControls.delete(attemptId);
      executionControl.release();
      reportAcquisition?.release();
      if (!associationRetained) {
        report?.dispose();
        if (reportRegistry === undefined) {
          reportHost.dispose();
          store.delete(reportHostId);
          reportHostIds.delete(reportHostId);
          retention.remove(runId);
        } else {
          await reportRegistry.evict(reportHostId);
        }
      }
    }
  }

  const actions: LiveHostActions<HostedTestApplicationActions, HostedTestCoordinatorState> = {
    "tests.discover": async (_context, _request, message) => {
      try {
        return JSON.parse(JSON.stringify(options.discovery)) as JsonValue;
      } catch (cause) {
        log_hosted_server_action_failure("tests.discover", cause, {
          ...(message.clientId === undefined ? {} : { clientId: message.clientId }),
          ...(message.requestId === undefined ? {} : { requestId: message.requestId }),
          executorId: options.discovery.executor.id,
        });
        throw cause;
      }
    },
    "tests.runSelected": async (context, request, message) => {
      let runIdentity: Readonly<{ runId: HostedTestRunId; attemptId: HostedTestAttemptId }> | undefined;
      try {
      if (!message.clientId || !message.requestId) throw new Error("HOSTED_TEST_REQUEST_ID_REQUIRED: tests.runSelected requires a retry-safe client and request identity.");
      const executorRegistry = options.executorRegistry;
      const clientId = message.clientId;
      const requestId = message.requestId;
      observe_hosted_test_timeline(options.timeline, "coordinator_request_accepted", { requestId, action: "tests.runSelected" });
      const retainRun = async (
        association: HostedTestRunRequestAssociation,
        run: HostedTestCoordinatedRun,
      ): Promise<void> => {
        if (context.map.capture().value.requests[clientId] === undefined) {
          await context.mutate((draft) => draft.batch((tx) => {
            tx.setMany(["requests"], { [clientId]: { [requestId]: association } });
            tx.setMany(["runs"], { [run.id]: run } as unknown as Record<string, JsonValue>);
          }));
        } else {
          await context.mutate((draft) => draft.batch((tx) => {
            tx.setMany(["requests", clientId], { [requestId]: association });
            tx.setMany(["runs"], { [run.id]: run } as unknown as Record<string, JsonValue>);
          }));
        }
      };
      const setAttemptStatus = (
        runId: HostedTestRunId,
        attemptId: HostedTestAttemptId,
        status: "running" | "settled",
      ): Promise<void> => context.mutate((draft) => (
        draft.replace(["runs", runId, "attempts", attemptId, "controlStatus"], status)
      )).then(() => undefined);
      const result = await execute_run(
        {
          target: HOSTED_TEST_SELECTED_RUN_TARGET,
          selectionIds: request.selectionIds,
          run: (onEvent, runOptions) => (options.runSelected ?? run_selected_test_ids)(
            executorRegistry,
            request.selectionIds,
            onEvent ?? (() => undefined),
            runOptions,
          ),
        },
        clientId,
        requestId,
        retainRun,
        setAttemptStatus,
        (runId, attemptId) => { runIdentity = Object.freeze({ runId, attemptId }); },
      );
      return JSON.parse(JSON.stringify(result)) as JsonValue;
      } catch (cause) {
        log_hosted_server_action_failure("tests.runSelected", cause, {
          ...(message.clientId === undefined ? {} : { clientId: message.clientId }),
          ...(message.requestId === undefined ? {} : { requestId: message.requestId }),
          ...(runIdentity === undefined ? {} : runIdentity),
          executorId: options.discovery.executor.id,
        });
        throw cause;
      }
    },
    "tests.cancel": async (context, request, message) => {
      try {
      if (!message.clientId || !message.requestId) {
        throw new Error("HOSTED_TEST_REQUEST_ID_REQUIRED: tests.cancel requires a retry-safe client and request identity.");
      }
      const initial = context.map.capture().value;
      const run = initial.runs[request.runId];
      const attempt = run?.attempts[request.attemptId];
      if (run === undefined || attempt === undefined || attempt.id !== request.attemptId) {
        throw new Error(`HOSTED_TEST_UNKNOWN_ATTEMPT: Hosted test attempt "${request.runId}/${request.attemptId}" is unavailable.`);
      }
      if (attempt.controlStatus === "settled" || attempt.cancellation !== null) {
        return JSON.parse(JSON.stringify(await cancellation_result(initial, request.runId, request.attemptId))) as JsonValue;
      }
      const executionControl = attemptControls.get(request.attemptId);
      if (executionControl === undefined) {
        throw new Error(`HOSTED_TEST_EXECUTOR_CONTROL_UNAVAILABLE: Attempt "${request.runId}/${request.attemptId}" has no active executor control.`);
      }
      await executionControl.requestCancellation(async () => {
        await context.mutate((draft) => draft.batch((tx) => {
          tx.replace(["runs", request.runId, "attempts", request.attemptId, "controlStatus"], "cancelling");
          tx.replace(["runs", request.runId, "attempts", request.attemptId, "cancellation"], {
            clientId: message.clientId!,
            requestId: message.requestId!,
          });
        }));
        observe_hosted_test_timeline(options.timeline, "coordinator_request_accepted", {
          requestId: message.requestId!,
          action: "tests.cancel",
          runId: request.runId,
          attemptId: request.attemptId,
        });
      });
      return JSON.parse(JSON.stringify(await cancellation_result(
        context.map.capture().value,
        request.runId,
        request.attemptId,
      ))) as JsonValue;
      } catch (cause) {
        log_hosted_server_action_failure("tests.cancel", cause, {
          ...(message.clientId === undefined ? {} : { clientId: message.clientId }),
          ...(message.requestId === undefined ? {} : { requestId: message.requestId }),
          runId: request.runId,
          attemptId: request.attemptId,
          executorId: options.discovery.executor.id,
        });
        throw cause;
      }
    },
    "tests.diagnostic.runLane": async (_context, request) => (
      JSON.parse(JSON.stringify(await run_diagnostic_lane(request))) as JsonValue
    ),
  };
  const schema: LiveHostSchema<HostedTestCoordinatorState, HostedTestApplicationActions> = {
    actions: {
      "tests.discover": { payload: decode_test_executor_discovery_request },
      "tests.runSelected": { payload: decode_run_selected_tests_request },
      "tests.cancel": { payload: decode_cancel },
      "tests.diagnostic.runLane": { payload: decode_diagnostic_run_lane },
    },
  };
  coordinator = create_livehost({
    map: coordinatorMap,
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
      disposing = true;
      const activeControls = [...attemptControls.values()];
      await Promise.allSettled(activeControls.map((control) => (
        control.requestCancellation(() => Promise.resolve())
      )));
      await Promise.allSettled(activeControls.map((control) => control.released()));
      for (const waiters of reportProjectionWaiters.values()) for (const resolve of waiters) resolve();
      reportProjectionWaiters.clear();
      projectedReportIds.clear();
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
      for (const control of attemptControls.values()) control.release();
      attemptControls.clear();
      retention.clear();
      store.delete(HOSTED_TEST_COORDINATOR_HOST_ID);
      coordinator.dispose();
    },
  });
}
