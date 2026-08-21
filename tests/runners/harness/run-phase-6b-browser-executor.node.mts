import assert from "node:assert/strict";
import { createRequire } from "node:module";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { hosted_test_panel_selected_ids } from "../../../src/app/demos/tests/panel/hosted-test-panel-selection";
import { hosted_test_report_cases } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import { BROWSER_JOURNEY_COUNT, BROWSER_RASTER_SUITE_MANIFEST, BROWSER_SUITE_MANIFEST } from "../../harness/runtimes/node/browser/browser-test-manifest";
import { LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR } from "../../harness/runtimes/node/browser/playwright-browser-executor";
import { NODE_LOCUS_MOTHERSHIP_EXECUTOR } from "../../harness/runtimes/node/livehost-node-executor";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

const server = await start_hosted_test_server({ port: 0 });
const require = createRequire(import.meta.url);
const authorityJsdomModules = Object.keys(require.cache).filter((path) => path.includes("/jsdom/"));
assert.equal(authorityJsdomModules.length > 0, true);
const authorityEncodingFallbackLoaded = Object.keys(require.cache).some((path) => path.endsWith("/fallback/encoding.js"));
assert.equal(authorityEncodingFallbackLoaded, true);
const runtime = make_remote_hosted_test_runtime({
  url: server.url,
  environment: { DEV: true, PROD: false },
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
  reconnectDelaysMs: [0, 5, 20],
});

try {
  await runtime.ready();
  const discovery = await runtime.discover();
  assert.equal(discovery.executor.id, NODE_LOCUS_MOTHERSHIP_EXECUTOR.id);
  assert.equal(discovery.executor.capabilities.provides.includes("browser-raster"), true);
  const browserSuites = discovery.catalog.suites.filter((suite) => suite.executionShape === "browser-journeys");
  assert.equal(browserSuites.length, BROWSER_SUITE_MANIFEST.length + 1);
  const browserSuiteIds = new Set(browserSuites.map((suite) => suite.id));
  const browserTests = discovery.catalog.tests.filter((entry) => browserSuiteIds.has(entry.suiteId));
  assert.equal(browserTests.length, BROWSER_JOURNEY_COUNT + BROWSER_RASTER_SUITE_MANIFEST.journeys.length);
  const ordinaryAllIds = hosted_test_panel_selected_ids(
    discovery.catalog.tests,
    { kind: "all" },
    discovery.catalog.suites,
  );
  assert.equal(ordinaryAllIds.some((id) => browserTests.some((entry) => entry.id === id)), false);

  const dom = browserTests.find((entry) => entry.suiteId === "livedemo/browser/small-state-surfaces")!;
  const raster = browserTests.find((entry) => entry.suiteId === BROWSER_RASTER_SUITE_MANIFEST.id
    && entry.caseId === "canvas-clear-full-bitmap")!;
  const run = await runtime.start_selected([dom.id, raster.id]);
  await run.ready();
  const result = await run.actionResult;
  assert.equal(result.ok, true);
  const report = run.client.recovery.map.snap();
  assert.equal(report.run.status, "passed");
  assert.deepEqual(report.plan.selectionIds, [raster.id, dom.id]);
  assert.deepEqual(hosted_test_report_cases(report).map((entry) => entry.status), ["pass", "pass"]);
  assert.equal(report.suiteRuns.every((suite) => suite.executionShape === "browser-journeys"), true);
  assert.equal(report.suiteRuns.every((suite) => suite.executorIds.includes(LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id)), true);
  assert.equal(hosted_test_report_cases(report).every((entry) => entry.executorId === LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id), true);
  assert.equal(report.suiteRuns.some((suite) => suite.evidence.some((entry) => entry.kind === "artifact")), true);

  const recovered = await runtime.recover_run(run.association.runId, run.association.attemptId);
  assert.equal(recovered.client.recovery.map.snap().run.status, "passed");
  assert.deepEqual(recovered.client.recovery.map.snap().plan.selectionIds, report.plan.selectionIds);
  const metrics = server.browserMetrics!();
  assert.equal(metrics.launches, 1);
  assert.equal(metrics.activeProcesses, 0);
  assert.equal(metrics.maximumActiveProcesses, 1);
  assert.equal(metrics.chromiumLaunchMs >= 0, true);
  assert.equal(metrics.serverReadinessMs >= 0, true);
  assert.equal(metrics.journeyMs > 0, true);
  assert.notEqual(metrics.lastChildPid, process.pid);
  assert.equal(metrics.lastChildJsdomModules, 0);
  assert.equal(metrics.lastChildEncodingFallbackLoaded, false);

  console.log(JSON.stringify({
    certificate: "phase6b-browser-executor",
    browserSuites: browserSuites.length,
    browserJourneys: BROWSER_JOURNEY_COUNT,
    rasterCases: BROWSER_RASTER_SUITE_MANIFEST.journeys.length,
    selected: report.plan.selectionIds.length,
    executorId: LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id,
    authorityPid: process.pid,
    authorityJsdomModules: authorityJsdomModules.length,
    authorityEncodingFallbackLoaded,
    reportRecovery: true,
    metrics,
  }));
  recovered.dispose();
  run.dispose();
} finally {
  runtime.dispose();
  await server.stop();
}
