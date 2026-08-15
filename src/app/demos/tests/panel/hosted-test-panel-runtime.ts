import { create_livehost_client, LiveHostDisconnectedError } from "hson-live/livehost";
import type { LiveHostActionId, LiveHostClient, LiveHostClientActionPromise, LiveMapCommitObservation } from "hson-live/types";
import type { HostedTestActions, HostedTestAnyRunResult, HostedTestCancelResult, HostedTestCaseDiagnostic, HostedTestInspectRequest, HostedTestSelectedRunResult } from "../../../../shared/hosted-tests/hosted-test-action.types";
import { decode_hosted_test_discovery_response, decode_hosted_test_inspect_response, decode_hosted_test_cancel_response, decode_selected_hosted_test_run_response } from "../../../../shared/hosted-tests/hosted-test-client-action";
import type { HostedTestReportState } from "../../../../shared/hosted-tests/hosted-test-report.types";
import { HOSTED_TEST_SELECTED_RUN_TARGET, type HostedTestRunTarget } from "../../../../shared/hosted-tests/hosted-test-suite-contract";
import type { TestExecutorDiscovery } from "../../../../shared/testing/test-discovery-contract";
import { HOSTED_TEST_COORDINATOR_HOST_ID, hosted_test_recovery_association, hosted_test_run_association, type HostedTestAttemptId, type HostedTestCoordinatorState, type HostedTestRunAssociation } from "../../../../shared/hosted-tests/hosted-test-application.types";
import {
  create_browser_livehost_socket as make_hosted_test_browser_websocket,
  type BrowserWebSocketConstructor,
  type BrowserLiveHostSocket as HostedTestBrowserSocket,
} from "hson-live/livehost";
import { observe_hosted_test_timeline, type HostedTestTimelineObserver } from "../../../../shared/hosted-tests/hosted-test-timeline";

type HostedTestReportActions = Readonly<{
  "tests.inspect": Readonly<{ runId: string; caseKey: string }>;
  "tests.ready": Readonly<{ runId: string }>;
}>;

type HostedTestAssociationWaiter = Readonly<{
  target: HostedTestRunTarget;
  resolve(association: HostedTestRunAssociation): void;
}>;

export type HostedTestPanelRuntimeStatus =
  | "connecting"
  | "discovering"
  | "ready"
  | "running"
  | "cancelling"
  | "completed"
  | "reconnecting"
  | "recovering"
  | "discovery-failed"
  | "run-rejected"
  | "failed"
  | "disposed";

export type HostedTestRemoteRun = Readonly<{
  association: HostedTestRunAssociation;
  readonly client: LiveHostClient<HostedTestReportState, HostedTestReportActions>;
  actionResult: Promise<HostedTestAnyRunResult>;
  on_change(listener: (observation?: LiveMapCommitObservation) => void): () => void;
  ready(): Promise<void>;
  inspect(request: HostedTestInspectRequest): Promise<HostedTestCaseDiagnostic>;
  cancel(): Promise<HostedTestCancelResult>;
  dispose(): void;
}>;

export type HostedTestPanelRuntime = Readonly<{
  readonly client: LiveHostClient<HostedTestCoordinatorState, HostedTestActions>;
  readonly status: HostedTestPanelRuntimeStatus;
  readonly failure: Error | undefined;
  readonly discovery: TestExecutorDiscovery | undefined;
  ready(): Promise<void>;
  discover(): Promise<TestExecutorDiscovery>;
  start_selected(selectionIds: readonly string[]): Promise<HostedTestRemoteRun>;
  recover_run(runId: string, attemptId: HostedTestAttemptId): Promise<HostedTestRemoteRun>;
  dispose(): void;
}>;

export type HostedTestPanelRuntimeOptions = Readonly<{
  url?: string;
  /** Build environment override. Primarily injectable for deterministic configuration tests. */
  environment?: HostedTestBuildEnvironment;
  WebSocketConstructor?: BrowserWebSocketConstructor;
  /** Fixed bounded schedule; defaults to immediate, 50ms, then 200ms. */
  reconnectDelaysMs?: readonly number[];
  /** Refresh-safe identity factory. Primarily injectable for deterministic tests. */
  makeClientId?: () => string;
  /** Fresh-action identity factory. Primarily injectable for deterministic tests. */
  makeActionId?: () => LiveHostActionId;
  timeline?: HostedTestTimelineObserver;
}>;

export type HostedTestBuildEnvironment = Readonly<{
  DEV?: boolean;
  PROD?: boolean;
  VITE_HOSTED_TEST_WS_URL?: string;
}>;

export const HOSTED_TEST_WS_CONFIGURATION_ERROR =
  "Hosted tests are unavailable because VITE_HOSTED_TEST_WS_URL was not configured for this deployment.";

let fallbackClientId = 0;

function make_browser_client_id(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid !== undefined) return `hosted-panel-${uuid}`;
  fallbackClientId += 1;
  return `hosted-panel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${fallbackClientId.toString(36)}`;
}

function current_build_environment(): HostedTestBuildEnvironment {
  const environment = (import.meta as ImportMeta & {
    readonly env?: Readonly<{
      DEV?: boolean;
      PROD?: boolean;
      VITE_HOSTED_TEST_WS_URL?: string;
    }>;
  }).env;
  return Object.freeze({
    DEV: environment?.DEV ?? false,
    PROD: environment?.PROD ?? false,
    ...(environment?.VITE_HOSTED_TEST_WS_URL === undefined
      ? {}
      : { VITE_HOSTED_TEST_WS_URL: environment.VITE_HOSTED_TEST_WS_URL }),
  });
}

export function resolve_hosted_test_websocket_url(
  environment: HostedTestBuildEnvironment,
  explicitUrl?: string,
): string {
  const configured = explicitUrl ?? environment.VITE_HOSTED_TEST_WS_URL;
  if (configured === undefined || configured.trim() === "") {
    if (environment.PROD === true) throw new Error(HOSTED_TEST_WS_CONFIGURATION_ERROR);
    return "ws://127.0.0.1:8787";
  }
  let url: URL;
  try { url = new URL(configured); }
  catch { throw new Error(`Hosted-test WebSocket URL is invalid: ${configured}`); }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error(`Hosted-test WebSocket URL must use ws:// or wss://, received ${url.protocol}`);
  }
  if (environment.PROD === true && url.protocol !== "wss:") {
    throw new Error("Hosted-test WebSocket URL must use wss:// in a production build.");
  }
  return url.toString();
}

export function hosted_test_host_url(base: string, hostId: string): string {
  const url = new URL(base);
  url.searchParams.set("livehost", hostId);
  return url.toString();
}

function association_from(
  client: LiveHostClient<HostedTestCoordinatorState, HostedTestActions>,
  requestId: string,
): HostedTestRunAssociation | undefined {
  const state = client.recovery.map.capture().value;
  const request = state.requests[client.clientId]?.[requestId];
  return request === undefined ? undefined : hosted_test_run_association(state, request);
}

function result_summary_from_report(report: HostedTestReportState): HostedTestSelectedRunResult["summary"] {
  const failures = report.suiteRuns.flatMap((suite) => suite.cases
    .filter((testCase) => testCase.status === "fail")
    .map((testCase) => ({ suite: suite.id, caseId: testCase.caseId, name: testCase.title, err: testCase.err ?? "", ms: testCase.ms ?? 0 })));
  return Object.freeze({
    suites: report.suiteRuns.length,
    cases: report.summary.cases,
    pass: report.summary.pass,
    fail: report.summary.fail,
    skip: report.summary.skip,
    msTotal: report.run.timing?.runnerMs ?? 0,
    failures: Object.freeze(failures),
  });
}

function report_matches_accepted_plan(
  report: HostedTestReportState,
  association: HostedTestRunAssociation,
): boolean {
  const accepted = association.acceptedPlan;
  const projected = report.plan;
  if (accepted === null || projected === null) return accepted === null && projected === null;
  return projected.protocolVersion === accepted.protocolVersion
    && projected.catalogVersion === accepted.catalogVersion
    && projected.executorId === accepted.executorId
    && projected.selectionIds.length === accepted.selectionIds.length
    && projected.selectionIds.every((id, index) => id === accepted.selectionIds[index])
    && report.suiteRuns.length === accepted.suites.length
    && report.suiteRuns.every((suite, suiteIndex) => {
      const planned = accepted.suites[suiteIndex];
      return planned !== undefined
        && suite.id === planned.id
        && suite.title === planned.title
        && suite.subject === planned.subject
        && suite.order === planned.order
        && suite.executionShape === planned.executionShape
        && suite.cases.length === planned.cases.length
        && suite.cases.every((testCase, caseIndex) => testCase.id === planned.cases[caseIndex]?.id);
    });
}

export function make_remote_hosted_test_runtime(options: HostedTestPanelRuntimeOptions = {}): HostedTestPanelRuntime {
  const environment = options.environment ?? current_build_environment();
  let baseUrl: string | undefined;
  const configured_base_url = (): string => baseUrl ??= resolve_hosted_test_websocket_url(environment, options.url);
  const reconnectDelays = Object.freeze([...(options.reconnectDelaysMs ?? [0, 50, 200])]);
  const makeClientId = options.makeClientId ?? make_browser_client_id;
  const coordinatorClientId = makeClientId();
  if (!coordinatorClientId) throw new Error("Hosted-test client ID must be non-empty.");
  if (reconnectDelays.some((delay) => !Number.isFinite(delay) || delay < 0)) {
    throw new Error("Hosted-test reconnect delays must be finite non-negative numbers.");
  }
  let status: HostedTestPanelRuntimeStatus = "connecting";
  let retainedFailure: Error | undefined;
  let discoveredExecutor: TestExecutorDiscovery | undefined;
  let disposed = false;
  let coordinatorTransport: HostedTestBrowserSocket | undefined;
  let coordinatorClient: LiveHostClient<HostedTestCoordinatorState, HostedTestActions>;
  let stopCoordinatorClose: (() => void) | undefined;
  let stopCoordinatorChanges: (() => void) | undefined;
  let reconnecting: Promise<void> | undefined;
  const cancelDelays = new Set<() => void>();
  const activeRuns = new Set<HostedTestRemoteRun>();
  const associationWaiters = new Map<string, Set<HostedTestAssociationWaiter>>();

  function wait_delay(ms: number): Promise<void> {
    if (ms === 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const id = setTimeout(() => { cancelDelays.delete(cancel); resolve(); }, ms);
      const cancel = () => { clearTimeout(id); cancelDelays.delete(cancel); resolve(); };
      cancelDelays.add(cancel);
    });
  }

  function notify_associations(): void {
    for (const [requestId, listeners] of [...associationWaiters]) {
      const association = association_from(coordinatorClient, requestId);
      if (!association) continue;
      for (const listener of [...listeners]) {
        if (listener.target !== association.suite) continue;
        listeners.delete(listener);
        listener.resolve(association);
      }
      if (listeners.size === 0) associationWaiters.delete(requestId);
    }
  }

  function bind_coordinator_changes(): void {
    stopCoordinatorChanges?.();
    stopCoordinatorChanges = coordinatorClient.recovery.on_change(notify_associations);
    notify_associations();
  }

  async function open_coordinator(
    previous?: LiveHostClient<HostedTestCoordinatorState, HostedTestActions>,
  ): Promise<void> {
    const transport = make_hosted_test_browser_websocket(
      hosted_test_host_url(configured_base_url(), HOSTED_TEST_COORDINATOR_HOST_ID),
      options.WebSocketConstructor,
    );
    await transport.ready;
    if (disposed) { transport.dispose(); throw new Error("Hosted-test runtime was disposed while connecting."); }
    const cursor = previous?.recovery.incarnationId !== undefined && previous.recovery.lastAppliedRev !== undefined
      ? { incarnationId: previous.recovery.incarnationId, lastAppliedRev: previous.recovery.lastAppliedRev }
      : undefined;
    const next = create_livehost_client<HostedTestCoordinatorState, HostedTestActions>({
      socket: transport.socket,
      clientId: previous?.clientId ?? coordinatorClientId,
      ...(options.makeActionId ? { actionId: options.makeActionId } : {}),
      ...(previous ? { map: previous.recovery.map } : {}),
      recovery: {
        logicalMapId: HOSTED_TEST_COORDINATOR_HOST_ID,
        ...(cursor ? { cursor } : {}),
      },
      session: previous?.session.credential ? { credential: previous.session.credential } : {},
    });
    next.connect();
    if (previous?.session.credential) {
      try { await next.session.reattach(); }
      catch { await next.session.create(); }
    } else {
      await next.session.create();
    }
    status = "recovering";
    await next.recovery.recover();

    stopCoordinatorClose?.();
    stopCoordinatorChanges?.();
    const oldTransport = coordinatorTransport;
    coordinatorTransport = transport;
    coordinatorClient = next;
    bind_coordinator_changes();
    stopCoordinatorClose = transport.socket.onClose(() => {
      if (disposed || coordinatorTransport !== transport) return;
      void ensure_reconnected().catch(() => undefined);
    }) ?? undefined;
    previous?.recovery.dispose();
    previous?.session.dispose();
    oldTransport?.dispose();
    status = "ready";
  }

  async function ensure_reconnected(): Promise<void> {
    if (disposed) throw new Error("Hosted-test runtime is disposed.");
    if (reconnecting) return reconnecting;
    const previous = coordinatorClient;
    reconnecting = (async () => {
      let lastError: unknown = new Error("Hosted-test coordinator disconnected.");
      for (const delay of reconnectDelays) {
        if (disposed) throw new Error("Hosted-test runtime is disposed.");
        status = "reconnecting";
        await wait_delay(delay);
        if (disposed) throw new Error("Hosted-test runtime is disposed.");
        try {
          await open_coordinator(previous);
          return;
        } catch (error) {
          lastError = error;
        }
      }
      retainedFailure ??= lastError instanceof Error ? lastError : new Error(String(lastError));
      status = "failed";
      throw retainedFailure;
    })().finally(() => { reconnecting = undefined; });
    return reconnecting;
  }

  const readiness = open_coordinator().catch((cause: unknown) => {
    retainedFailure ??= cause instanceof Error ? cause : new Error(String(cause));
    if (!disposed) status = "failed";
    throw retainedFailure;
  });

  async function discover(): Promise<TestExecutorDiscovery> {
    await readiness;
    if (disposed) throw new Error("Hosted-test runtime is disposed.");
    status = "discovering";
    try {
      const discovery = decode_hosted_test_discovery_response(
        await coordinatorClient.action("tests.discover", {}),
      );
      discoveredExecutor = discovery;
      retainedFailure = undefined;
      status = "ready";
      return discovery;
    } catch (cause) {
      const failure = cause instanceof Error ? cause : new Error(String(cause));
      retainedFailure = failure;
      status = "discovery-failed";
      throw failure;
    }
  }

  async function retry_safe_selected_result(
    action: LiveHostClientActionPromise<HostedTestActions, "tests.runSelected">,
  ): Promise<HostedTestSelectedRunResult> {
    let response: unknown;
    try {
      response = await action;
    } catch (error) {
      if (disposed || !(error instanceof LiveHostDisconnectedError)) throw error;
      await ensure_reconnected();
      response = await coordinatorClient.retry_action(action.request);
    }
    return decode_selected_hosted_test_run_response(response);
  }

  async function retry_safe_cancel_result(
    action: LiveHostClientActionPromise<HostedTestActions, "tests.cancel">,
    request: Readonly<{ runId: string; attemptId: HostedTestAttemptId }>,
  ): Promise<HostedTestCancelResult> {
    let response: unknown;
    try {
      response = await action;
    } catch (error) {
      if (disposed || !(error instanceof LiveHostDisconnectedError)) throw error;
      await ensure_reconnected();
      response = await coordinatorClient.retry_action(action.request);
    }
    return decode_hosted_test_cancel_response(response, request);
  }

  function wait_for_association(
    requestId: string,
    target: HostedTestRunTarget,
    actionResult: Promise<HostedTestAnyRunResult>,
  ): Promise<HostedTestRunAssociation> {
    const current = association_from(coordinatorClient, requestId);
    if (current?.suite === target) return Promise.resolve(current);
    return new Promise<HostedTestRunAssociation>((resolve, reject) => {
      const listeners = associationWaiters.get(requestId) ?? new Set();
      const waiter = Object.freeze({ target, resolve });
      listeners.add(waiter);
      associationWaiters.set(requestId, listeners);
      void actionResult.catch((error) => {
        const pending = associationWaiters.get(requestId);
        if (!pending?.delete(waiter)) return;
        if (pending.size === 0) associationWaiters.delete(requestId);
        reject(error);
      });
    });
  }

  async function attach_run(
    association: HostedTestRunAssociation,
    requestedActionResult?: Promise<HostedTestAnyRunResult>,
  ): Promise<HostedTestRemoteRun> {
    const target = association.suite;
    const reportClientId = makeClientId();
    if (!reportClientId) throw new Error("Hosted-test report client ID must be non-empty.");
    let reportTransport: HostedTestBrowserSocket | undefined;
    let reportClient: LiveHostClient<HostedTestReportState, HostedTestReportActions>;
    let stopReportClose: (() => void) | undefined;
    let stopReportChanges: (() => void) | undefined;
    let reportReconnecting: Promise<void> | undefined;
    const reportListeners = new Set<(observation?: LiveMapCommitObservation) => void>();
    let readyAction: Promise<void> | undefined;
    let runDisposed = false;
    let reportTerminalSettled = false;
    let resolveReportTerminal: () => void = () => undefined;
    let rejectReportTerminal: (error: Error) => void = () => undefined;
    const reportTerminal = new Promise<void>((resolve, reject) => {
      resolveReportTerminal = resolve;
      rejectReportTerminal = reject;
    });
    void reportTerminal.catch(() => undefined);

    function fail_report(error: unknown): void {
      if (reportTerminalSettled) return;
      reportTerminalSettled = true;
      rejectReportTerminal(error instanceof Error ? error : new Error(String(error)));
    }

    function settle_report_if_terminal(): void {
      if (reportTerminalSettled || reportClient === undefined) return;
      const status = reportClient.recovery.map.snap(["run", "status"]);
      if (status !== "passed" && status !== "failed" && status !== "cancelled" && status !== "error") return;
      reportTerminalSettled = true;
      resolveReportTerminal();
    }

    function notify_report(observation?: LiveMapCommitObservation): void {
      settle_report_if_terminal();
      for (const listener of [...reportListeners]) listener(observation);
    }

    async function open_report(previous?: LiveHostClient<HostedTestReportState, HostedTestReportActions>): Promise<void> {
      const nextTransport = make_hosted_test_browser_websocket(hosted_test_host_url(configured_base_url(), association.reportHostId), options.WebSocketConstructor);
      await nextTransport.ready;
      if (disposed || runDisposed) { nextTransport.dispose(); throw new Error("Hosted-test run was disposed while attaching its report."); }
      const cursor = previous?.recovery.incarnationId !== undefined && previous.recovery.lastAppliedRev !== undefined
        ? { incarnationId: previous.recovery.incarnationId, lastAppliedRev: previous.recovery.lastAppliedRev }
        : undefined;
      let firstReportFrameObserved = false;
      const stopTimeline = nextTransport.socket.onMessage((message) => {
        if (firstReportFrameObserved) return;
        try {
          const decoded = JSON.parse(message) as { type?: unknown };
          if (decoded.type !== "recovery-snapshot") return;
        } catch { return; }
        firstReportFrameObserved = true;
        observe_hosted_test_timeline(options.timeline, "browser_received_first_report_frame", {
          runId: association.runId,
          reportHostId: association.reportHostId,
        });
        stopTimeline?.();
      });
      const next = create_livehost_client<HostedTestReportState, HostedTestReportActions>({
        socket: nextTransport.socket,
        clientId: previous?.clientId ?? reportClientId,
        ...(previous ? { map: previous.recovery.map } : {}),
        recovery: { logicalMapId: association.reportHostId, ...(cursor ? { cursor } : {}) },
        session: previous?.session.credential ? { credential: previous.session.credential } : {},
      });
      next.connect();
      if (previous?.session.credential) {
        try { await next.session.reattach(); }
        catch { await next.session.create(); }
      } else {
        await next.session.create();
      }
      status = "recovering";
      await next.recovery.recover();
      stopReportClose?.();
      stopReportChanges?.();
      const oldTransport = reportTransport;
      reportTransport = nextTransport;
      reportClient = next;
      stopReportChanges = next.recovery.on_change(settle_report_if_terminal);
      const stopReportCommits = next.recovery.map.commits.observe(notify_report);
      stopReportClose = nextTransport.socket.onClose(() => {
        if (disposed || runDisposed || reportTransport !== nextTransport) return;
        void ensure_report_reconnected().catch(() => undefined);
      }) ?? undefined;
      previous?.recovery.dispose();
      previous?.session.dispose();
      oldTransport?.dispose();
      status = "ready";
      notify_report(Object.freeze({
        kind: "snapshot",
        origin: "snapshot",
        revision: next.recovery.lastAppliedRev ?? next.recovery.map.rev,
      }));

      const priorDispose = stopReportChanges;
      stopReportChanges = () => {
        priorDispose?.();
        stopReportCommits();
      };
    }

    async function ensure_report_reconnected(): Promise<void> {
      if (reportReconnecting) return reportReconnecting;
      const previous = reportClient;
      reportReconnecting = (async () => {
        let lastError: unknown = new Error("Hosted-test report disconnected.");
        for (const delay of reconnectDelays) {
          if (disposed || runDisposed) throw new Error("Hosted-test run is disposed.");
          status = "reconnecting";
          await wait_delay(delay);
          try { await open_report(previous); return; }
          catch (error) { lastError = error; }
        }
        retainedFailure ??= lastError instanceof Error ? lastError : new Error(String(lastError));
        status = "failed";
        fail_report(retainedFailure);
        throw retainedFailure;
      })().finally(() => { reportReconnecting = undefined; });
      return reportReconnecting;
    }

    await open_report();
    const recovered_result = (): HostedTestAnyRunResult => {
      const report = reportClient.recovery.map.capture().value;
      if (report.run.id !== association.runId || report.run.suite !== association.suite) {
        throw new Error("Recovered hosted report identity does not match the explicitly requested run.");
      }
      if (!report_matches_accepted_plan(report, association)) {
        throw new Error("Recovered hosted report does not match the coordinator's accepted RunPlan.");
      }
      if (report.run.timing === null) throw new Error("Recovered hosted report completed without timing.");
      const reportRev = reportClient.recovery.lastAppliedRev;
      if (reportRev === undefined) throw new Error("Recovered hosted report completed without a revision cursor.");
      const common = {
        runId: association.runId,
        attemptId: association.attemptId,
        reportHostId: association.reportHostId,
        reportRev,
        ok: report.run.status === "passed",
        cancelled: report.run.status === "cancelled",
        summary: result_summary_from_report(report),
        timing: report.run.timing,
      };
      return Object.freeze({
        ...common,
        suite: HOSTED_TEST_SELECTED_RUN_TARGET,
        selectionIds: association.acceptedPlan.selectionIds,
      });
    };
    const terminalResult = requestedActionResult === undefined
      ? reportTerminal.then(recovered_result)
      : Promise.all([requestedActionResult, reportTerminal]).then(([result]) => result);
    const actionResult: Promise<HostedTestAnyRunResult> = terminalResult.then((result) => {
      if (!disposed && !runDisposed) status = "completed";
      return result;
    });
    void actionResult.catch(() => undefined);
    const run: HostedTestRemoteRun = Object.freeze({
      association,
      get client() { return reportClient; },
      actionResult,
      on_change(listener) {
        reportListeners.add(listener);
        return () => reportListeners.delete(listener);
      },
      ready() {
        readyAction ??= (async () => {
          const pending = reportClient.action("tests.ready", { runId: association.runId });
          try { await pending; }
          catch (error) {
            if (disposed || runDisposed || !(error instanceof LiveHostDisconnectedError)) throw error;
            await ensure_report_reconnected();
            await reportClient.retry_action(pending.request);
          }
        })();
        return readyAction;
      },
      async inspect(request) {
        const pending = reportClient.action("tests.inspect", request);
        let response: unknown;
        try { response = await pending; }
        catch (error) {
          if (disposed || runDisposed || !(error instanceof LiveHostDisconnectedError)) throw error;
          await ensure_report_reconnected();
          response = await reportClient.retry_action(pending.request);
        }
        return decode_hosted_test_inspect_response(response, request.caseKey);
      },
      async cancel() {
        const request = Object.freeze({ runId: association.runId, attemptId: association.attemptId });
        const action = coordinatorClient.action("tests.cancel", request);
        const result = await retry_safe_cancel_result(action, request);
        if (result.accepted && result.controlStatus === "cancelling" && !disposed && !runDisposed) {
          status = "cancelling";
        }
        return result;
      },
      dispose() {
        if (runDisposed) return;
        runDisposed = true;
        fail_report(new LiveHostDisconnectedError());
        activeRuns.delete(run);
        reportListeners.clear();
        stopReportClose?.();
        stopReportChanges?.();
        reportClient.disconnect();
        reportClient.recovery.dispose();
        reportClient.session.dispose();
        reportTransport?.dispose();
      },
    });
    activeRuns.add(run);
    return run;
  }

  async function start_selected(selectionIds: readonly string[]): Promise<HostedTestRemoteRun> {
    await readiness;
    if (status === "reconnecting" || status === "recovering") await ensure_reconnected();
    if (disposed) throw new Error("Hosted-test runtime is disposed.");
    const discovery = discoveredExecutor;
    if (discovery === undefined) throw new Error("Hosted-test selected execution requires successful executor discovery.");
    const ids = Object.freeze([...new Set(selectionIds)]);
    if (ids.length === 0) throw new Error("Hosted-test selected execution requires at least one test ID.");
    if (ids.length !== selectionIds.length) throw new Error("Hosted-test selected execution does not accept duplicate selection IDs.");
    const advertised = new Set([
      ...discovery.catalog.tests.map((descriptor) => descriptor.id),
      ...discovery.catalog.suites.filter((suite) => suite.executionShape !== "cases").map((suite) => suite.id),
    ]);
    const unknown = ids.find((id) => !advertised.has(id));
    if (unknown !== undefined) throw new Error(`Hosted-test selection contains an undiscovered test ID "${unknown}".`);
    status = "running";
    const action = coordinatorClient.action("tests.runSelected", { selectionIds: [...ids] });
    observe_hosted_test_timeline(options.timeline, "coordinator_request_sent", {
      requestId: action.request.requestId,
      action: "tests.runSelected",
      selectedIds: ids.length,
    });
    const actionResult = retry_safe_selected_result(action).then(undefined, (cause: unknown) => {
      status = "run-rejected";
      throw cause;
    });
    void actionResult.catch(() => undefined);
    const association = await wait_for_association(
      action.request.requestId,
      HOSTED_TEST_SELECTED_RUN_TARGET,
      actionResult,
    );
    return attach_run(association, actionResult);
  }

  async function recover_run(runId: string, attemptId: HostedTestAttemptId): Promise<HostedTestRemoteRun> {
    await readiness;
    if (status === "reconnecting" || status === "recovering") await ensure_reconnected();
    if (disposed) throw new Error("Hosted-test runtime is disposed.");
    if (!runId || !attemptId) throw new Error("Hosted-test recovery requires exact non-empty run and attempt IDs.");
    const association = hosted_test_recovery_association(
      coordinatorClient.recovery.map.capture().value,
      runId,
      attemptId,
    );
    if (association === undefined) throw new Error(`Hosted-test run "${runId}" is not available for explicit recovery.`);
    return attach_run(association);
  }

  return Object.freeze({
    get client() { return coordinatorClient; },
    get status() { return status; },
    get failure() { return retainedFailure; },
    get discovery() { return discoveredExecutor; },
    ready: () => readiness,
    discover,
    start_selected,
    recover_run,
    dispose() {
      if (disposed) return;
      disposed = true;
      status = "disposed";
      for (const cancel of [...cancelDelays]) cancel();
      for (const run of [...activeRuns]) run.dispose();
      activeRuns.clear();
      associationWaiters.clear();
      stopCoordinatorClose?.();
      stopCoordinatorChanges?.();
      coordinatorClient?.disconnect();
      coordinatorClient?.recovery.dispose();
      coordinatorClient?.session.dispose();
      coordinatorTransport?.dispose();
    },
  });
}
