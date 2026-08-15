import assert from "node:assert/strict";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { hosted_test_report_cases } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import type { TestSuite } from "../../harness/core/test-contracts";
import { executor_supports, make_test_executor_registry, select_executor } from "../../harness/core/test-executor";
import { make_test_run_plan } from "../../harness/core/test-run-plan";
import { create_external_library_launcher_service } from "../../harness/runtimes/node/external-library-launchers";
import { LOCAL_NODE_LIVEHOST_EXECUTOR, NODE_LIVEHOST_MOTHERSHIP_EXECUTOR } from "../../harness/runtimes/node/livehost-node-executor";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

const originalWorkerEndpoint = process.env.VITE_HOSTED_TEST_WS_URL;
const originalCloudflareAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
process.env.VITE_HOSTED_TEST_WS_URL = "wss://must-not-be-consulted.invalid/socket";
process.env.CLOUDFLARE_ACCOUNT_ID = "must-not-be-consulted";

const server = await start_hosted_test_server({ port: 0 });
const runtime = make_remote_hosted_test_runtime({
  url: server.url,
  environment: { DEV: true, PROD: false },
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});

let canonicalRunId = "";
let opaqueChecks = 0;
let commandEvidence = "";
try {
  await runtime.ready();
  const discovery = await runtime.discover();
  assert.equal(discovery.executor.id, NODE_LIVEHOST_MOTHERSHIP_EXECUTOR.id);
  assert.equal(discovery.executor.kind, "node");
  assert.equal(discovery.catalog.tests.length > 0, true);
  assert.equal(discovery.catalog.suites.some((suite) => suite.executionShape === "opaque-aggregate"), true);
  assert.equal(discovery.catalog.suites.some((suite) => suite.executionShape === "certification-aggregate"), true);
  assert.equal(discovery.catalog.suites.some((suite) => suite.requirements.includes("cloudflare-worker")), false);
  assert.equal(discovery.catalog.suites.some((suite) => suite.executionShape === "browser-journeys"), true);

  const canonicalId = discovery.catalog.tests[0]!.id;
  const canonical = await runtime.start_selected([canonicalId]);
  await canonical.ready();
  const canonicalResult = await canonical.actionResult;
  assert.equal(canonicalResult.ok, true);
  const canonicalReport = canonical.client.recovery.map.capture().value;
  assert.deepEqual(hosted_test_report_cases(canonicalReport).map((entry) => entry.id), [canonicalId]);
  canonicalRunId = canonical.association.runId;
  const recovered = await runtime.recover_run(canonical.association.runId, canonical.association.attemptId);
  assert.equal(recovered.client.recovery.map.capture().value.run.status, "passed");
  assert.equal(recovered.association.attemptId, canonical.association.attemptId);
  recovered.dispose();
  canonical.dispose();

  const opaqueSuite = discovery.catalog.suites
    .filter((suite) => suite.executionShape === "opaque-aggregate")
    .sort((left, right) => (left.declaredChecks ?? 0) - (right.declaredChecks ?? 0))[0]!;
  const opaque = await runtime.start_selected([opaqueSuite.id]);
  await opaque.ready();
  assert.equal((await opaque.actionResult).ok, true);
  const opaqueReport = opaque.client.recovery.map.capture().value;
  assert.equal(opaqueReport.suiteRuns[0]?.executionShape, "opaque-aggregate");
  opaqueChecks = opaqueReport.suiteRuns[0]?.counts.passed ?? 0;
  assert.equal(opaqueChecks, opaqueSuite.declaredChecks);
  opaque.dispose();

  const commandSuite = discovery.catalog.suites.find((suite) => (
    suite.sourceRef === "node-command:hson-demo2:test:hosted-test-timing-node"
  ))!;
  const command = await runtime.start_selected([commandSuite.id]);
  await command.ready();
  assert.equal((await command.actionResult).ok, true);
  const commandReport = command.client.recovery.map.capture().value;
  const commandSuiteRun = commandReport.suiteRuns[0]!;
  assert.equal(commandSuiteRun.executionShape, "certification-aggregate");
  assert.deepEqual(commandSuiteRun.counts, {
    declared: 1, total: 1, executed: 1, passed: 1, failed: 0, skipped: 0, unsupported: 0, cancelled: 0,
  });
  assert.deepEqual(commandSuiteRun.executorIds, [NODE_LIVEHOST_MOTHERSHIP_EXECUTOR.id]);
  commandEvidence = commandSuiteRun.evidence.map((entry) => entry.content).join("\n");
  assert.match(commandEvidence, /hosted test timing: ok/);
  command.dispose();
} finally {
  runtime.dispose();
  await server.stop();
  if (originalWorkerEndpoint === undefined) delete process.env.VITE_HOSTED_TEST_WS_URL;
  else process.env.VITE_HOSTED_TEST_WS_URL = originalWorkerEndpoint;
  if (originalCloudflareAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
  else process.env.CLOUDFLARE_ACCOUNT_ID = originalCloudflareAccount;
}

const supervisor = create_external_library_launcher_service();
const direct = (id: string, source: string, timeoutMs = 5_000) => ({
  id,
  cwd: process.cwd(),
  command: process.execPath,
  args: Object.freeze(["-e", source]),
  environment: Object.freeze({}),
  timeoutMs,
});
const sharedA = supervisor.runCommand(direct("phase6a-once", "process.stdout.write('once')"));
const sharedB = supervisor.runCommand(direct("phase6a-once", "process.stdout.write('once')"));
const [sharedResult, sharedDuplicate] = await Promise.all([sharedA, sharedB]);
assert.equal(sharedResult.ok && sharedResult.stdout === "once", true);
assert.equal(sharedDuplicate.ok && sharedDuplicate.stdout === "once", true);
assert.equal(supervisor.metrics().commandStarts, 1);

const failed = await supervisor.runCommand(direct("phase6a-fail", "process.stderr.write('truthful failure'); process.exitCode=7"));
assert.equal(failed.ok, false);
assert.equal(failed.exitCode, 7);
assert.equal(failed.stderr, "truthful failure");

const cancellation = new AbortController();
const held = supervisor.runCommand(direct(
  "phase6a-cancel",
  "process.on('SIGTERM',()=>{}); process.stdout.write('ready'); setInterval(()=>{},1000)",
  10_000,
), { signal: cancellation.signal });
setTimeout(() => cancellation.abort(), 200);
const cancelled = await held;
assert.equal(cancelled.cancelled, true);
assert.equal(cancelled.forceKilled, true);
assert.equal(supervisor.metrics().activeChildren, 0);
supervisor.terminate();

assert.equal(executor_supports(LOCAL_NODE_LIVEHOST_EXECUTOR, { requirements: ["node", "process", "synthetic-dom"] }), true);
assert.equal(select_executor({ requirements: ["node", "process"] }, [LOCAL_NODE_LIVEHOST_EXECUTOR])?.id, LOCAL_NODE_LIVEHOST_EXECUTOR.id);
assert.equal(select_executor({ requirements: ["cloudflare-worker"] }, [LOCAL_NODE_LIVEHOST_EXECUTOR]), undefined);
assert.equal(select_executor({ requirements: ["browser", "chromium"] }, [LOCAL_NODE_LIVEHOST_EXECUTOR]), undefined);
assert.equal(select_executor({ requirements: ["node", "cloudflare-worker"] }, [LOCAL_NODE_LIVEHOST_EXECUTOR]), undefined);

const orderSuite: TestSuite = Object.freeze({
  suite: "livehost/phase6a-order",
  descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript", "node"] as const) }),
  cases: Object.freeze([
    Object.freeze({ suite: "livehost/phase6a-order", caseId: "a", name: "a", run() {} }),
    Object.freeze({ suite: "livehost/phase6a-order", caseId: "b", name: "b", run() {} }),
  ]),
});
const orderRegistry = make_test_executor_registry(LOCAL_NODE_LIVEHOST_EXECUTOR, [orderSuite]);
const orderPlan = make_test_run_plan({
  runId: "phase6a-order",
  protocolVersion: 3,
  catalogVersion: "phase6a-order-catalog",
  executorId: LOCAL_NODE_LIVEHOST_EXECUTOR.id,
  catalog: orderRegistry.catalog,
  selectedIds: orderRegistry.catalog.tests.map((entry) => entry.id).reverse(),
});
assert.deepEqual(orderPlan.selectionIds, orderRegistry.catalog.tests.map((entry) => entry.id));
assert.equal(orderPlan.executorId, LOCAL_NODE_LIVEHOST_EXECUTOR.id);

console.log(JSON.stringify({
  certificate: "phase6a-node-mothership",
  canonicalRunId,
  opaqueChecks,
  commandEvidence: /hosted test timing: ok/.test(commandEvidence),
  processStarts: supervisor.metrics().commandStarts,
  forcedTermination: cancelled.forceKilled,
  workerDependency: false,
  cleanShutdown: true,
}));
