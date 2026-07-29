import { create_livehost_client, LiveHostDisconnectedError } from "hson-live/livehost";
import type { LiveHostActionId, LiveHostClient, LiveHostClientActionPromise } from "hson-live/types";
import type {
  HostedTestActions,
  HostedTestAnyRunResult,
  HostedTestCaseDiagnostic,
  HostedTestInspectRequest,
  HostedTestRunResult,
  HostedTestSelectedRunResult,
} from "../../hosted-test/hosted-test-action.types";
import {
  decode_hosted_test_discovery_response,
  decode_hosted_test_inspect_response,
  decode_hosted_test_run_response,
  decode_selected_hosted_test_run_response,
} from "../../hosted-test/hosted-test-client-action";
import type { HostedTestReportState } from "../../hosted-test/hosted-test-report.types";
import {
  HOSTED_TEST_SELECTED_RUN_TARGET,
  type HostedTestRunTarget,
  type HostedTestSuiteId,
} from "../../hosted-test/hosted-test-suite";
import type { TestExecutorDiscovery } from "../../../test-system/test-discovery";
import {
  HOSTED_TEST_COORDINATOR_HOST_ID,
  type HostedTestCoordinatorState,
  type HostedTestRunAssociation,
} from "../../hosted-test/hosted-test-application.types";
import {
  create_browser_livehost_socket as make_hosted_test_browser_websocket,
  type BrowserWebSocketConstructor,
  type BrowserLiveHostSocket as HostedTestBrowserSocket,
} from "hson-live/livehost";

type HostedTestReportActions = Readonly<{
  "tests.inspect": Readonly<{ runId: string; caseKey: string }>;
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
  on_change(listener: () => void): () => void;
  inspect(request: HostedTestInspectRequest): Promise<HostedTestCaseDiagnostic>;
  dispose(): void;
}>;

export type HostedTestPanelRuntime = Readonly<{
  readonly client: LiveHostClient<HostedTestCoordinatorState, HostedTestActions>;
  readonly status: HostedTestPanelRuntimeStatus;
  readonly failure: Error | undefined;
  readonly discovery: TestExecutorDiscovery | undefined;
  ready(): Promise<void>;
  discover(): Promise<TestExecutorDiscovery>;
  start_run(suite: HostedTestSuiteId): Promise<HostedTestRemoteRun>;
  start_selected(testIds: readonly string[]): Promise<HostedTestRemoteRun>;
  recover_run(runId: string): Promise<HostedTestRemoteRun>;
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
  return client.recovery.map.capture().value.requests[client.clientId]?.[requestId];
}

function all_associations(state: HostedTestCoordinatorState): readonly HostedTestRunAssociation[] {
  return Object.values(state.requests).flatMap((requests) => Object.values(requests));
}

function result_summary_from_report(report: HostedTestReportState): HostedTestRunResult["summary"] {
  const failures = Object.values(report.caseBatches).flat()
    .filter((testCase) => testCase.status === "fail")
    .map((testCase) => ({ suite: testCase.suite, name: testCase.name, err: testCase.err ?? "", ms: testCase.ms }));
  return Object.freeze({
    suites: report.suites.length,
    cases: report.summary.cases,
    pass: report.summary.pass,
    fail: report.summary.fail,
    skip: report.summary.skip,
    msTotal: report.run.timing?.runnerMs ?? 0,
    failures: Object.freeze(failures),
  });
}

function selected_ids_from_report(report: HostedTestReportState): readonly string[] {
  return Object.freeze(Object.keys(report.caseBatches).sort().flatMap((batchKey) => (
    report.caseBatches[batchKey]?.map((testCase) => testCase.key) ?? []
  )));
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
      void ensure_reconnected();
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

  async function retry_safe_result(
    action: LiveHostClientActionPromise<HostedTestActions, "tests.run">,
    suite: HostedTestSuiteId,
  ): Promise<HostedTestRunResult> {
    let response: unknown;
    try {
      response = await action;
    } catch (error) {
      if (disposed || !(error instanceof LiveHostDisconnectedError)) throw error;
      await ensure_reconnected();
      response = await coordinatorClient.retry_action(action.request);
    }
    return decode_hosted_test_run_response(response, suite);
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
    const reportListeners = new Set<() => void>();
    let runDisposed = false;

    function notify_report(): void {
      for (const listener of [...reportListeners]) listener();
    }

    async function open_report(previous?: LiveHostClient<HostedTestReportState, HostedTestReportActions>): Promise<void> {
      const nextTransport = make_hosted_test_browser_websocket(hosted_test_host_url(configured_base_url(), association.reportHostId), options.WebSocketConstructor);
      await nextTransport.ready;
      if (disposed || runDisposed) { nextTransport.dispose(); throw new Error("Hosted-test run was disposed while attaching its report."); }
      const cursor = previous?.recovery.incarnationId !== undefined && previous.recovery.lastAppliedRev !== undefined
        ? { incarnationId: previous.recovery.incarnationId, lastAppliedRev: previous.recovery.lastAppliedRev }
        : undefined;
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
      stopReportChanges = next.recovery.on_change(notify_report);
      stopReportClose = nextTransport.socket.onClose(() => {
        if (disposed || runDisposed || reportTransport !== nextTransport) return;
        void ensure_report_reconnected();
      }) ?? undefined;
      previous?.recovery.dispose();
      previous?.session.dispose();
      oldTransport?.dispose();
      status = "ready";
      notify_report();
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
        throw retainedFailure;
      })().finally(() => { reportReconnecting = undefined; });
      return reportReconnecting;
    }

    await open_report();
    const actionResult = requestedActionResult ?? new Promise<HostedTestAnyRunResult>((resolve, reject) => {
      const finish = (): boolean => {
        const report = reportClient.recovery.map.capture().value;
        if (report.run.id !== association.runId || report.run.suite !== association.suite) {
          reject(new Error("Recovered hosted report identity does not match the explicitly requested run."));
          return true;
        }
        if (report.run.status !== "passed" && report.run.status !== "failed" && report.run.status !== "error") return false;
        if (report.run.timing === null) {
          reject(new Error("Recovered hosted report completed without timing."));
          return true;
        }
        const reportRev = reportClient.recovery.lastAppliedRev;
        if (reportRev === undefined) {
          reject(new Error("Recovered hosted report completed without a revision cursor."));
          return true;
        }
        const common = {
          runId: association.runId,
          reportHostId: association.reportHostId,
          reportRev,
          ok: report.run.status === "passed",
          summary: result_summary_from_report(report),
          timing: report.run.timing,
        };
        resolve(target === HOSTED_TEST_SELECTED_RUN_TARGET
          ? Object.freeze({
            ...common,
            suite: HOSTED_TEST_SELECTED_RUN_TARGET,
            testIds: selected_ids_from_report(report),
          })
          : Object.freeze({ ...common, suite: target }));
        return true;
      };
      if (finish()) return;
      let stop = (): void => undefined;
      stop = reportClient.recovery.on_change(() => {
        if (!finish()) return;
        stop();
      });
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
      dispose() {
        if (runDisposed) return;
        runDisposed = true;
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

  async function start_run(suite: HostedTestSuiteId): Promise<HostedTestRemoteRun> {
    await readiness;
    if (status === "reconnecting" || status === "recovering") await ensure_reconnected();
    if (disposed) throw new Error("Hosted-test runtime is disposed.");
    status = "running";
    const action = coordinatorClient.action("tests.run", { suite });
    const actionResult = retry_safe_result(action, suite).then((result) => {
      status = "completed";
      return result;
    }, (cause: unknown) => {
      status = "run-rejected";
      throw cause;
    });
    void actionResult.catch(() => undefined);
    const association = await wait_for_association(action.request.requestId, suite, actionResult);
    return attach_run(association, actionResult);
  }

  async function start_selected(testIds: readonly string[]): Promise<HostedTestRemoteRun> {
    await readiness;
    if (status === "reconnecting" || status === "recovering") await ensure_reconnected();
    if (disposed) throw new Error("Hosted-test runtime is disposed.");
    const discovery = discoveredExecutor;
    if (discovery === undefined) throw new Error("Hosted-test selected execution requires successful executor discovery.");
    const ids = Object.freeze([...new Set(testIds)]);
    if (ids.length === 0) throw new Error("Hosted-test selected execution requires at least one test ID.");
    if (ids.length !== testIds.length) throw new Error("Hosted-test selected execution does not accept duplicate test IDs.");
    const advertised = new Set([
      ...discovery.catalog.tests.map((descriptor) => descriptor.id),
      ...discovery.externalTargets.map((target) => target.id),
    ]);
    const unknown = ids.find((id) => !advertised.has(id));
    if (unknown !== undefined) throw new Error(`Hosted-test selection contains an undiscovered test ID "${unknown}".`);
    status = "running";
    const action = coordinatorClient.action("tests.runSelected", { testIds: [...ids] });
    const actionResult = retry_safe_selected_result(action).then((result) => {
      status = "completed";
      return result;
    }, (cause: unknown) => {
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

  async function recover_run(runId: string): Promise<HostedTestRemoteRun> {
    await readiness;
    if (status === "reconnecting" || status === "recovering") await ensure_reconnected();
    if (disposed) throw new Error("Hosted-test runtime is disposed.");
    if (!runId) throw new Error("Hosted-test recovery requires an explicit non-empty run ID.");
    const matches = all_associations(coordinatorClient.recovery.map.capture().value)
      .filter((association) => association.runId === runId);
    if (matches.length !== 1) throw new Error(`Hosted-test run "${runId}" is not available for explicit recovery.`);
    return attach_run(matches[0]!);
  }

  return Object.freeze({
    get client() { return coordinatorClient; },
    get status() { return status; },
    get failure() { return retainedFailure; },
    get discovery() { return discoveredExecutor; },
    ready: () => readiness,
    discover,
    start_run,
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
