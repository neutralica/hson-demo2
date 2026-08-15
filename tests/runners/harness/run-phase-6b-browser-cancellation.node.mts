import assert from "node:assert/strict";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { hosted_test_report_cases } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

async function wait_until(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for active browser executor process.");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const server = await start_hosted_test_server({ port: 0 });
const runtime = make_remote_hosted_test_runtime({
  url: server.url,
  environment: { DEV: true, PROD: false },
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});

try {
  await runtime.ready();
  const discovery = await runtime.discover();
  const browserCase = discovery.catalog.tests.find((entry) => (
    entry.suiteId === "livedemo/browser/towl-direct-entry" && entry.caseId === "journey-01"
  ))!;
  const run = await runtime.start_selected([browserCase.id]);
  await run.ready();
  await wait_until(() => server.browserMetrics!().activeJourneys === 1, 30_000);
  const cancellation = await run.cancel();
  assert.equal(cancellation.accepted, true);
  const result = await run.actionResult;
  assert.equal(result.cancelled, true);
  const report = run.client.recovery.map.capture().value;
  assert.equal(report.run.status, "cancelled");
  assert.deepEqual(hosted_test_report_cases(report).map((entry) => entry.status), ["cancelled"]);
  assert.equal(server.browserMetrics!().activeProcesses, 0);
  assert.equal(server.browserMetrics!().activeJourneys, 0);
  assert.equal(server.browserMetrics!().cancellations, 1);

  const recovered = await runtime.recover_run(run.association.runId, run.association.attemptId);
  const recoveredReport = recovered.client.recovery.map.capture().value;
  assert.equal(recoveredReport.run.status, "cancelled");
  assert.equal(recovered.association.attemptId, run.association.attemptId);
  assert.deepEqual(recoveredReport.plan.selectionIds, [browserCase.id]);

  console.log(JSON.stringify({
    certificate: "phase6b-browser-cancellation",
    cancellationAccepted: cancellation.accepted,
    reportRecovery: true,
    attemptFenced: true,
    metrics: server.browserMetrics!(),
  }));
  recovered.dispose();
  run.dispose();
} finally {
  runtime.dispose();
  await server.stop();
}
