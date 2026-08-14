import { create_livehost_client } from "hson-live/livehost";
import type { LiveHostClient, LiveHostSocketLike } from "hson-live/types";
import type { HostedTestPanelRuntime, HostedTestRemoteRun } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import type { HostedTestActions, HostedTestAnyRunResult } from "../../../src/shared/hosted-tests/hosted-test-action.types";
import { decode_hosted_test_discovery_response, decode_hosted_test_cancel_response, decode_hosted_test_run_response, decode_selected_hosted_test_run_response, inspect_hosted_test_action } from "../../../src/shared/hosted-tests/hosted-test-client-action";
import type { HostedTestReportState } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { HOSTED_TEST_SELECTED_RUN_TARGET, type HostedTestSuiteId } from "../../../src/shared/hosted-tests/hosted-test-suite-contract";
import type { HostedTestSuiteRegistry } from "../../harness/hosted/hosted-test-suite";
import { create_hosted_test_application, HOSTED_TEST_COORDINATOR_HOST_ID } from "../../harness/hosted/hosted-test-application";
import { hosted_test_recovery_association, hosted_test_run_association, type HostedTestCoordinatorState, type HostedTestRunAssociation } from "../../../src/shared/hosted-tests/hosted-test-application.types";
import type { TestExecutorRegistry } from "../../harness/core/test-executor";
import { run_fresh_node_selected_test_ids } from "../../harness/runtimes/node/run-node-selected-test-suites";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import type { TestExecutorDiscovery } from "../../../src/shared/testing/test-discovery-contract";

type MessageListener = (message: string) => void;
type ReportActions = Readonly<{ "tests.inspect": Readonly<{ runId: string; caseKey: string }> }>;

function make_socket_pair(): readonly [LiveHostSocketLike, LiveHostSocketLike] {
  const firstMessages = new Set<MessageListener>();
  const secondMessages = new Set<MessageListener>();
  const firstCloses = new Set<() => void>();
  const secondCloses = new Set<() => void>();
  function socket(ownMessages: Set<MessageListener>, peerMessages: Set<MessageListener>, ownCloses: Set<() => void>, peerCloses: Set<() => void>): LiveHostSocketLike {
    return {
      send(message) { queueMicrotask(() => { for (const listener of peerMessages) listener(message); }); },
      close() { queueMicrotask(() => { for (const listener of peerCloses) listener(); }); },
      onMessage(listener) { ownMessages.add(listener); return () => ownMessages.delete(listener); },
      onClose(listener) { ownCloses.add(listener); return () => ownCloses.delete(listener); },
    };
  }
  return [
    socket(firstMessages, secondMessages, firstCloses, secondCloses),
    socket(secondMessages, firstMessages, secondCloses, firstCloses),
  ];
}

export function make_in_memory_hosted_test_runtime(
  registry: HostedTestSuiteRegistry,
  executorRegistry?: TestExecutorRegistry,
): HostedTestPanelRuntime {
  const application = create_hosted_test_application(registry, executorRegistry === undefined
    ? {}
    : {
      executorRegistry,
      ...(executorRegistry.executor.id === "local-node-livehost"
        ? { runSelected: run_fresh_node_selected_test_ids }
        : {}),
      discovery: make_test_executor_discovery(executorRegistry),
    });
  const disposers: (() => void)[] = [];
  function connect(id: string): LiveHostSocketLike {
    const [clientSocket, hostSocket] = make_socket_pair();
    const connected = application.store.connect(id, hostSocket);
    if (!connected.ok) throw new Error(connected.error.message);
    disposers.push(connected.value);
    return clientSocket;
  }
  const client = create_livehost_client<HostedTestCoordinatorState, HostedTestActions>({
    socket: connect(HOSTED_TEST_COORDINATOR_HOST_ID),
    recovery: { logicalMapId: HOSTED_TEST_COORDINATOR_HOST_ID },
    session: {},
  });
  client.connect();
  let disposed = false;
  let discovery: TestExecutorDiscovery | undefined;
  const readiness = client.session.create().then(() => client.recovery.recover()).then(() => undefined);
  const runs = new Set<HostedTestRemoteRun>();

  async function attach_run(
    association: HostedTestRunAssociation,
    actionResult?: Promise<HostedTestAnyRunResult>,
  ): Promise<HostedTestRemoteRun> {
    const reportClient = create_livehost_client<HostedTestReportState, ReportActions>({
      socket: connect(association.reportHostId),
      recovery: { logicalMapId: association.reportHostId },
      session: {},
    });
    reportClient.connect();
    await reportClient.session.create();
    await reportClient.recovery.recover();
    const recovered = reportClient.recovery.map.capture().value;
    const failures = Object.values(recovered.caseBatches).flat()
      .filter((testCase) => testCase.status === "fail")
      .map((testCase) => ({ suite: testCase.suite, caseId: testCase.caseId, name: testCase.name, err: testCase.err ?? "", ms: testCase.ms }));
    const common = {
      runId: association.runId,
      attemptId: association.attemptId,
      reportHostId: association.reportHostId,
      reportRev: reportClient.recovery.lastAppliedRev ?? 0,
      ok: recovered.run.status === "passed",
      cancelled: association.cancellation !== null,
      summary: {
        suites: recovered.suites.length,
        cases: recovered.summary.cases,
        pass: recovered.summary.pass,
        fail: recovered.summary.fail,
        skip: recovered.summary.skip,
        msTotal: recovered.run.timing?.runnerMs ?? 0,
        failures,
      },
      timing: recovered.run.timing ?? { runnerMs: 0, hostMs: 0 },
    };
    const settledResult = actionResult ?? Promise.resolve(
      association.suite === HOSTED_TEST_SELECTED_RUN_TARGET
        ? {
          ...common,
          suite: HOSTED_TEST_SELECTED_RUN_TARGET,
          testIds: association.acceptedPlan?.selectionIds ?? [],
        }
        : { ...common, suite: association.suite },
    );
    let runDisposed = false;
    const run: HostedTestRemoteRun = Object.freeze({
      association,
      client: reportClient as LiveHostClient<HostedTestReportState, ReportActions>,
      actionResult: settledResult,
      on_change(listener) { return reportClient.recovery.on_change(() => listener()); },
      async ready() {},
      inspect(request) { return inspect_hosted_test_action(reportClient, request); },
      async cancel() {
        const request = { runId: association.runId, attemptId: association.attemptId };
        return decode_hosted_test_cancel_response(await client.action("tests.cancel", request), request);
      },
      dispose() {
        if (runDisposed) return;
        runDisposed = true;
        runs.delete(run);
        reportClient.disconnect();
        reportClient.recovery.dispose();
        reportClient.session.dispose();
      },
    });
    runs.add(run);
    return run;
  }

  return Object.freeze({
    client,
    get status() { return disposed ? "disposed" as const : "ready" as const; },
    get failure() { return undefined; },
    get discovery() { return discovery; },
    ready: () => readiness,
    async discover() {
      await readiness;
      discovery = decode_hosted_test_discovery_response(await client.action("tests.discover", {}));
      return discovery;
    },
    async start_run(suite: HostedTestSuiteId) {
      await readiness;
      const action = client.action("tests.run", { suite });
      const requestId = action.request.requestId;
      const association = await new Promise<HostedTestRunAssociation>((resolve, reject) => {
        const initial = client.recovery.map.capture().value;
        const existing = initial.requests[client.clientId]?.[requestId];
        const joined = existing === undefined ? undefined : hosted_test_run_association(initial, existing);
        if (joined) { resolve(joined); return; }
        const stop = client.recovery.on_change(() => {
          const state = client.recovery.map.capture().value;
          const found = state.requests[client.clientId]?.[requestId];
          const association = found === undefined ? undefined : hosted_test_run_association(state, found);
          if (!association) return;
          stop();
          resolve(association);
        });
        void action.then((response) => {
          if (response.type !== "error") return;
          stop();
          try { decode_hosted_test_run_response(response, suite); }
          catch (error) { reject(error); }
        }, reject);
      });
      return attach_run(association, action.then((response) => decode_hosted_test_run_response(response, suite)));
    },
    async start_selected(testIds: readonly string[]) {
      await readiness;
      if (discovery === undefined) throw new Error("HOSTED_TEST_DISCOVERY_REQUIRED: Discover before selected execution.");
      const action = client.action("tests.runSelected", { testIds: [...testIds] });
      const requestId = action.request.requestId;
      const result = action.then(decode_selected_hosted_test_run_response);
      const association = await new Promise<HostedTestRunAssociation>((resolve, reject) => {
        const initial = client.recovery.map.capture().value;
        const existing = initial.requests[client.clientId]?.[requestId];
        const joined = existing === undefined ? undefined : hosted_test_run_association(initial, existing);
        if (joined) { resolve(joined); return; }
        const stop = client.recovery.on_change(() => {
          const state = client.recovery.map.capture().value;
          const found = state.requests[client.clientId]?.[requestId];
          const association = found === undefined ? undefined : hosted_test_run_association(state, found);
          if (!association) return;
          stop();
          resolve(association);
        });
        void result.catch((error) => {
          stop();
          reject(error);
        });
      });
      return attach_run(association, result);
    },
    async recover_run(runId: string, attemptId?: string) {
      await readiness;
      const association = hosted_test_recovery_association(client.recovery.map.capture().value, runId, attemptId);
      if (association === undefined) throw new Error(`Hosted-test run "${runId}" is not available for explicit recovery.`);
      return attach_run(association);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const run of [...runs]) run.dispose();
      client.disconnect();
      client.recovery.dispose();
      client.session.dispose();
      while (disposers.length) disposers.pop()?.();
      application.dispose();
    },
  });
}
