import assert from "node:assert/strict";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { H2_VERIFICATION_IDS } from "../../harness/runtimes/node/h2-isolated-verification";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

const server = await start_hosted_test_server({ port: 0 });
const runtime = make_remote_hosted_test_runtime({ url: server.url, environment: { DEV: true, PROD: false }, WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor, reconnectDelaysMs: [0, 5, 20] });
const results: Array<Readonly<{ id: string; discovered: boolean; execution: boolean; cleanup: boolean }>> = [];
try {
  await runtime.ready();
  const discovery = await runtime.discover();
  const selected = process.env.H2_ONLY === undefined ? H2_VERIFICATION_IDS : H2_VERIFICATION_IDS.filter((id) => id === process.env.H2_ONLY);
  assert.equal(selected.length > 0, true, "H2_ONLY must name a fixed H2 verification ID");
  for (const id of selected) {
    const suite = discovery.catalog.suites.find((candidate) => candidate.sourceRef === `node-command:${id}`);
    assert.ok(suite, `H2 ID must be discoverable: ${id}`);
    const run = await runtime.start_selected([suite.id]);
    await run.ready();
    const actionResult = await run.actionResult;
    const suiteRun = run.client.recovery.map.snap().suiteRuns[0];
    assert.equal(actionResult.ok, true, `Hosted H2 action must pass: ${id}\n${JSON.stringify(actionResult)}\n${suiteRun?.evidence.map((entry) => entry.content).join("\n") ?? "no report evidence"}`);
    assert.equal(suiteRun?.counts.passed, 1, `Hosted H2 report must contain one PASS: ${id}`);
    assert.equal(suiteRun?.counts.failed, 0, `Hosted H2 report must contain no FAIL: ${id}`);
    results.push(Object.freeze({ id, discovered: true, execution: true, cleanup: !(suiteRun?.evidence.some((entry) => entry.content.includes("WORKSPACE_CLEANUP_FAILED")) ?? false) }));
    console.log(JSON.stringify({ certificate: "h2b-hosted-id", id, result: results.at(-1) }));
    run.dispose();
  }
} finally { runtime.dispose(); await server.stop(); }
console.log(JSON.stringify({ certificate: "h2b-hosted", results }));
