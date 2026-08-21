import assert from "node:assert/strict";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR } from "../../harness/runtimes/node/browser/playwright-browser-executor";
import { NODE_LOCUS_MOTHERSHIP_EXECUTOR } from "../../harness/runtimes/node/livehost-node-executor";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

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
  const canonicalSuiteIds = new Set(discovery.catalog.suites
    .filter((suite) => suite.executionShape === "cases")
    .map((suite) => suite.id));
  const canonical = ["transform", "livetree", "livemap", "livehost"].map((subject) => (
    discovery.catalog.tests.find((entry) => canonicalSuiteIds.has(entry.suiteId) && entry.subject === subject)!
  ));
  assert.equal(discovery.catalog.tests.some((entry) => canonicalSuiteIds.has(entry.suiteId) && entry.subject === "reflect"), false);
  const opaque = discovery.catalog.suites.find((suite) => (
    suite.executionShape === "opaque-aggregate" && suite.subject === "reflect"
  ))!;
  const command = discovery.catalog.suites.find((suite) => (
    suite.sourceRef === "node-command:hson-demo2:test:hosted-test-timing-node"
  ))!;
  const browser = discovery.catalog.tests.find((entry) => entry.suiteId === "livedemo/browser/small-state-surfaces")!;
  const raster = discovery.catalog.tests.find((entry) => entry.suiteId === "livetree/browser-raster-fidelity"
    && entry.caseId === "canvas-plot")!;
  const selection = [...canonical.map((entry) => entry.id), opaque.id, command.id, browser.id, raster.id];
  const run = await runtime.start_selected(selection);
  await run.ready();
  const result = await run.actionResult;
  assert.equal(result.ok, true);
  const report = run.client.recovery.map.snap();
  assert.equal(report.run.status, "passed");
  assert.equal(report.suiteRuns.length, 8);
  assert.deepEqual(report.suiteRuns.map((suite) => suite.id), run.association.acceptedPlan.suites.map((suite) => suite.id));
  assert.deepEqual(report.plan.selectionIds, run.association.acceptedPlan.selectionIds);
  assert.equal(run.association.acceptedPlan.suites.filter((suite) => suite.executorId === LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id).length, 2);
  assert.equal(run.association.acceptedPlan.suites.filter((suite) => suite.executorId === NODE_LOCUS_MOTHERSHIP_EXECUTOR.id).length, 6);
  assert.equal(report.suiteRuns.filter((suite) => suite.executionShape === "browser-journeys")
    .every((suite) => suite.executorIds.includes(LOCAL_PLAYWRIGHT_BROWSER_EXECUTOR.id)), true);
  assert.equal(report.suiteRuns.filter((suite) => suite.executionShape !== "browser-journeys")
    .every((suite) => suite.executorIds.includes(NODE_LOCUS_MOTHERSHIP_EXECUTOR.id)), true);

  const recovered = await runtime.recover_run(run.association.runId, run.association.attemptId);
  assert.equal(recovered.client.recovery.map.snap().run.status, "passed");
  assert.deepEqual(recovered.client.recovery.map.snap().plan.selectionIds, report.plan.selectionIds);
  assert.equal(server.browserMetrics!().activeProcesses, 0);
  assert.equal(server.browserMetrics!().activeJourneys, 0);

  console.log(JSON.stringify({
    certificate: "phase6b-mixed-run",
    oneRunPlan: true,
    oneReportAuthority: true,
    canonicalCases: canonical.length,
    reflectCanonicalCases: 0,
    reflectOpaqueLaunchers: 1,
    opaqueLaunchers: 1,
    commandCertifications: 1,
    browserJourneys: 1,
    rasterCases: 1,
    stableOrder: true,
    reportRecovery: true,
    browserMetrics: server.browserMetrics!(),
  }));
  recovered.dispose();
  run.dispose();
} finally {
  runtime.dispose();
  await server.stop();
}
