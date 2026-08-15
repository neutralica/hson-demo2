import assert from "node:assert/strict";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { hosted_test_report_cases } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { BROWSER_JOURNEY_COUNT, BROWSER_RASTER_SUITE_MANIFEST } from "../../harness/runtimes/node/browser/browser-test-manifest";
import { LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR } from "../../harness/runtimes/node/browser/playwright-browser-executor";
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
  await runtime.ready();
  const discovery = await runtime.discover();
  const browserSuiteIds = new Set(discovery.catalog.suites
    .filter((suite) => suite.executionShape === "browser-journeys")
    .map((suite) => suite.id));
  const browserIds = discovery.catalog.tests.filter((entry) => browserSuiteIds.has(entry.suiteId)).map((entry) => entry.id);
  assert.equal(browserIds.length, BROWSER_JOURNEY_COUNT + BROWSER_RASTER_SUITE_MANIFEST.journeys.length);
  const run = await runtime.start_selected(browserIds);
  await run.ready();
  const result = await run.actionResult;
  const report = run.client.recovery.map.capture().value;
  if (!result.ok) {
    console.error(JSON.stringify(report.suiteRuns.filter((suite) => suite.status === "fail").map((suite) => ({
      id: suite.id,
      errors: suite.errors,
      cases: suite.cases.filter((entry) => entry.status === "fail"),
    })), null, 2));
  }
  assert.equal(result.ok, true);
  assert.equal(report.run.status, "passed");
  assert.equal(hosted_test_report_cases(report).length, browserIds.length);
  assert.equal(hosted_test_report_cases(report).every((entry) => entry.status === "pass"), true);
  assert.equal(report.suiteRuns.every((suite) => suite.executorIds.includes(LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id)), true);
  assert.equal(report.suiteRuns.filter((suite) => suite.id === BROWSER_RASTER_SUITE_MANIFEST.id)[0]?.counts.passed,
    BROWSER_RASTER_SUITE_MANIFEST.journeys.length);

  const recovered = await runtime.recover_run(run.association.runId, run.association.attemptId);
  assert.equal(recovered.client.recovery.map.capture().value.run.status, "passed");
  assert.deepEqual(recovered.client.recovery.map.capture().value.plan.selectionIds, report.plan.selectionIds);
  const metrics = server.browserMetrics!();
  assert.equal(metrics.launches, 1);
  assert.equal(metrics.activeProcesses, 0);
  assert.equal(metrics.activeJourneys, 0);
  assert.equal(metrics.maximumActiveProcesses, 1);

  console.log(JSON.stringify({
    certificate: "phase6b-full-browser-hosted",
    browserJourneys: BROWSER_JOURNEY_COUNT,
    rasterCases: BROWSER_RASTER_SUITE_MANIFEST.journeys.length,
    failures: 0,
    reportRecovery: true,
    metrics,
    wallMs: performance.now() - startedAt,
  }));
  recovered.dispose();
  run.dispose();
} finally {
  runtime.dispose();
  await server.stop();
}
