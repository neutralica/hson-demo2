import assert from "node:assert/strict";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { hosted_test_projection_summary } from "../../../src/app/demos/tests/panel/hosted-test-report-summary";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

const startedAt = performance.now();
const server = await start_hosted_test_server({ port: 0 });
const runtime = make_remote_hosted_test_runtime({
  url: server.url,
  environment: { DEV: true, PROD: false },
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});

try {
  const healthUrl = new URL(server.url);
  healthUrl.protocol = "http:";
  healthUrl.pathname = "/healthz";
  healthUrl.search = "";
  const health = await fetch(healthUrl);
  assert.equal(health.status, 200);

  await runtime.ready();
  const discovery = await runtime.discover();
  const canonicalSuiteIds = new Set(discovery.catalog.suites
    .filter((suite) => suite.executionShape === "cases")
    .map((suite) => suite.id));
  const canonicalIds = discovery.catalog.tests.filter((entry) => canonicalSuiteIds.has(entry.suiteId)).map((entry) => entry.id);
  const opaqueSuiteIds = discovery.catalog.suites
    .filter((suite) => suite.executionShape === "opaque-aggregate")
    .map((suite) => suite.id);
  const certificationIds = discovery.catalog.suites
    .filter((suite) => suite.executionShape === "certification-aggregate")
    .map((suite) => suite.id);
  const opaqueChecks = discovery.catalog.suites
    .filter((suite) => suite.executionShape === "opaque-aggregate")
    .reduce((total, suite) => total + (suite.declaredChecks ?? 0), 0);
  const selectionIds = [...canonicalIds, ...opaqueSuiteIds, ...certificationIds];
  const run = await runtime.start_selected(selectionIds);
  await run.ready();
  const result = await run.actionResult;
  const report = run.client.recovery.map.capture().value;
  const summary = hosted_test_projection_summary(report);
  if (!result.ok) {
    console.error(JSON.stringify({
      failedSuites: report.suiteRuns.filter((suite) => suite.status === "fail").map((suite) => ({
        id: suite.id,
        shape: suite.executionShape,
        errors: suite.errors,
        stderr: suite.evidence.filter((entry) => entry.kind === "stderr").map((entry) => entry.content),
      })),
      actionFailures: result.summary.failures,
    }, null, 2));
  }
  assert.equal(result.ok, true);
  assert.equal(report.run.status, "passed");
  assert.equal(summary.canonical.total, canonicalIds.length);
  assert.equal(summary.canonical.pass, canonicalIds.length);
  assert.equal(summary.launchers.declaredChecks, opaqueChecks);
  assert.equal(summary.launchers.passedChecks, opaqueChecks);
  assert.equal(summary.certifications.total, certificationIds.length);
  assert.equal(summary.certifications.pass, certificationIds.length);
  assert.deepEqual([...report.plan.selectionIds].sort(), [...selectionIds].sort());

  const recovered = await runtime.recover_run(run.association.runId, run.association.attemptId);
  assert.equal(recovered.client.recovery.map.capture().value.run.status, "passed");
  const metrics = server.metrics();
  const connections = server.connectionSnapshot();
  const browserMetrics = server.browserMetrics!();
  assert.equal(browserMetrics.launches, 0);
  assert.equal(browserMetrics.activeProcesses, 0);
  assert.equal(browserMetrics.activeJourneys, 0);
  const healthAfter = await fetch(healthUrl);
  assert.equal(healthAfter.status, 200);

  console.log(JSON.stringify({
    certificate: "phase6a-full-node-hosted",
    selectedSurfaces: report.suiteRuns.length,
    canonicalSuites: report.suiteRuns.filter((suite) => suite.executionShape === "cases").length,
    canonicalCases: summary.canonical.total,
    opaqueLaunchers: summary.launchers.total,
    opaqueChecks: summary.launchers.declaredChecks,
    commandCertifications: summary.certifications.total,
    dynamicGeneratedSurfaces: certificationIds.filter((id) => id.includes("generated-json")).length,
    failures: summary.suites.fail,
    cancellationReady: discovery.executor.supportsCancellation,
    reportRecovery: true,
    backpressureRejections: connections.hostedTests.backpressureRejections,
    heartbeatHealth: healthAfter.status === 200,
    reportCommits: metrics.reportCommits,
    browserLaunches: browserMetrics.launches,
    wallMs: performance.now() - startedAt,
  }));
  recovered.dispose();
  run.dispose();
} finally {
  runtime.dispose();
  await server.stop();
}
