import { create_livehost_client } from "hson-live";
import type { LiveHostClient, LiveHostSocketLike } from "hson-live/types";
import type { HostedTestPanelRuntime, HostedTestRemoteRun } from "../../app/demos/test/hosted-test-panel-runtime";
import type { HostedTestActions, HostedTestRunResult } from "../../app/hosted-test/hosted-test-action.types";
import { decode_hosted_test_run_response, inspect_hosted_test_action } from "../../app/hosted-test/hosted-test-client-action";
import type { HostedTestReportState } from "../../app/hosted-test/hosted-test-report.types";
import type { HostedTestSuiteId, HostedTestSuiteRegistry } from "../../app/hosted-test/hosted-test-suite";
import { create_hosted_test_application, HOSTED_TEST_COORDINATOR_HOST_ID } from "../../hosted-test/hosted-test-application";
import type { HostedTestCoordinatorState, HostedTestRunAssociation } from "../../app/hosted-test/hosted-test-application.types";

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

export function make_in_memory_hosted_test_runtime(registry: HostedTestSuiteRegistry): HostedTestPanelRuntime {
  const application = create_hosted_test_application(registry);
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
  const readiness = client.session.create().then(() => client.recovery.recover()).then(() => undefined);
  const runs = new Set<HostedTestRemoteRun>();

  async function attach_run(
    association: HostedTestRunAssociation,
    actionResult?: Promise<HostedTestRunResult>,
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
      .map((testCase) => ({ suite: testCase.suite, name: testCase.name, err: testCase.err ?? "", ms: testCase.ms }));
    const settledResult = actionResult ?? Promise.resolve({
      runId: association.runId,
      reportHostId: association.reportHostId,
      reportRev: reportClient.recovery.lastAppliedRev ?? association.reportRev,
      suite: association.suite,
      ok: recovered.run.status === "passed",
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
    });
    let runDisposed = false;
    const run: HostedTestRemoteRun = Object.freeze({
      association,
      client: reportClient as LiveHostClient<HostedTestReportState, ReportActions>,
      actionResult: settledResult,
      on_change(listener) { return reportClient.recovery.on_change(() => listener()); },
      inspect(request) { return inspect_hosted_test_action(reportClient, request); },
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
    ready: () => readiness,
    async start_run(suite: HostedTestSuiteId) {
      await readiness;
      const action = client.action("tests.run", { suite });
      const requestId = action.request.requestId;
      const association = await new Promise<HostedTestRunAssociation>((resolve, reject) => {
        const existing = client.recovery.map.capture().value.requests[client.clientId]?.[requestId];
        if (existing) { resolve(existing); return; }
        const stop = client.recovery.on_change(() => {
          const found = client.recovery.map.capture().value.requests[client.clientId]?.[requestId];
          if (!found) return;
          stop();
          resolve(found);
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
    async recover_run(runId: string) {
      await readiness;
      const matches = Object.values(client.recovery.map.capture().value.requests)
        .flatMap((requests) => Object.values(requests))
        .filter((association) => association.runId === runId);
      if (matches.length !== 1) throw new Error(`Hosted-test run "${runId}" is not available for explicit recovery.`);
      return attach_run(matches[0]!);
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
