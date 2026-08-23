import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { H2B_VERIFICATION_IDS, H2D_VERIFICATION_IDS, H2_VERIFICATION_IDS } from "../../harness/runtimes/node/h2-isolated-verification";
import { H2C_VERIFICATION_IDS } from "../../harness/runtimes/node/h2-artifact-certification";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";

const H2_LIFECYCLE_ID = "hson-demo2:test:surface-enumeration-node";

async function wait_for_file(path: string, label: string): Promise<void> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try { await access(path); return; } catch { await new Promise<void>((resolve) => setTimeout(resolve, 20)); }
  }
  throw new Error(`Hosted H2 lifecycle did not reach ${label} within 12 seconds.`);
}

async function is_alive(pid: number): Promise<boolean> {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === "EPERM"; }
}

async function wait_for_process_exit(pid: number, label: string): Promise<void> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (!await is_alive(pid)) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Hosted H2 lifecycle did not observe ${label} exit within 12 seconds.`);
}

async function lifecycle_fixture(mode: "cancel" | "pass"): Promise<Readonly<{
  reportStatus: string;
  terminalResults: number;
  workspace: string;
  parentPid?: number | undefined;
  descendantPid?: number | undefined;
  cancellationObserved: boolean;
}>> {
  const root = await mkdtemp(join(tmpdir(), `h2-hosted-${mode}-`));
  const ready = join(root, "ready.json");
  const cancelled = join(root, "cancelled");
  let workspace = "";
  const server = await start_hosted_test_server({
    port: 0,
    h2TestHooks: {
      async beforeExecution(runWorkspace, snapshotDemo) {
        workspace = runWorkspace;
        const pkg = JSON.parse(await readFile(join(snapshotDemo, "package.json"), "utf8")) as { scripts: Record<string, string> };
        pkg.scripts["test:surface-enumeration-node"] = "node h2-hosted-lifecycle-fixture.mjs";
        await writeFile(join(snapshotDemo, "package.json"), JSON.stringify(pkg));
        await writeFile(join(snapshotDemo, "h2-hosted-lifecycle-fixture.mjs"), mode === "cancel"
          ? `import { appendFileSync, existsSync, writeFileSync } from "node:fs"; import { spawn } from "node:child_process"; const descendantReady = ${JSON.stringify(`${ready}.descendant`)}; const descendant = spawn("/bin/sh", ["-c", 'trap "" TERM; touch "$1"; while :; do sleep 1; done', "sh", descendantReady], { stdio: "ignore" }); const published = setInterval(() => { if (existsSync(descendantReady)) { clearInterval(published); writeFileSync(${JSON.stringify(ready)}, JSON.stringify({ parentPid: process.ppid, descendantPid: descendant.pid })); } }, 5); process.on("SIGTERM", () => { appendFileSync(${JSON.stringify(cancelled)}, "observed\\n"); process.exit(0); }); setInterval(() => {}, 1000);`
          : `console.log("test surface enumeration: ok");`,
        );
      },
      beforeCleanup(runWorkspace) { workspace = runWorkspace; },
    },
  });
  const runtime = make_remote_hosted_test_runtime({ url: server.url, environment: { DEV: true, PROD: false }, WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor, reconnectDelaysMs: [0, 5, 20] });
  try {
    await runtime.ready();
    const discovery = await runtime.discover();
    const suite = discovery.catalog.suites.find((candidate) => candidate.sourceRef === `node-command:${H2_LIFECYCLE_ID}`);
    assert.ok(suite, "controlled H2 fixture must be admitted through the hosted command catalog");
    const run = await runtime.start_selected([suite.id]);
    await run.ready();
    let parentPid: number | undefined;
    let descendantPid: number | undefined;
    if (mode === "cancel") {
      await wait_for_file(ready, "child and descendant readiness");
      const pids = JSON.parse(await readFile(ready, "utf8")) as { parentPid: number; descendantPid: number };
      parentPid = pids.parentPid; descendantPid = pids.descendantPid;
      assert.equal(await is_alive(parentPid), true, "fixture parent must be alive before hosted cancellation");
      assert.equal(await is_alive(descendantPid), true, "fixture descendant must be alive before hosted cancellation");
      const acknowledged = await run.cancel();
      assert.equal(acknowledged.accepted, true, "actual hosted cancellation route must accept the admitted request");
      await wait_for_process_exit(parentPid, "direct parent");
      assert.equal(await is_alive(descendantPid), true, "TERM-resistant descendant must survive after direct parent close and before fallback kill");
    }
    const action = await run.actionResult;
    const report = run.client.recovery.map.snap();
    const terminalResults = report.suiteRuns.length;
    assert.equal(terminalResults, 1, "one hosted request must produce exactly one terminal certification result");
    assert.equal(workspace !== "", true, "H2 fixture must expose its owned workspace to the harness");
    await assert.rejects(() => stat(workspace), "workspace must be gone before the hosted terminal result is observable");
    if (mode === "cancel") {
      assert.equal(action.cancelled, true, "hosted H2 result must terminalize as cancellation");
      assert.equal(report.run.status, "cancelled", "hosted report terminal status must be cancelled, not pass");
      assert.equal(await is_alive(parentPid!), false, "fixture parent must be dead after settlement");
      assert.equal(await is_alive(descendantPid!), false, "fixture descendant must be dead after settlement");
      await wait_for_file(cancelled, "child cancellation observation");
    } else {
      assert.equal(action.ok, true, "controlled successful H2 fixture must pass through the hosted route");
      assert.equal(report.run.status, "passed", "hosted report may publish PASS only after workspace cleanup");
    }
    run.dispose();
    return Object.freeze({ reportStatus: report.run.status, terminalResults, workspace, parentPid, descendantPid, cancellationObserved: mode === "cancel" });
  } finally { runtime.dispose(); await server.stop(); await rm(root, { recursive: true, force: true }); }
}

const server = await start_hosted_test_server({ port: 0 });
const runtime = make_remote_hosted_test_runtime({ url: server.url, environment: { DEV: true, PROD: false }, WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor, reconnectDelaysMs: [0, 5, 20] });
const results: Array<Readonly<{ id: string; discovered: boolean; execution: boolean; cleanup: boolean; workspacePeakBytes: number; stdoutBytes: number; stderrBytes: number; certificate: string }>> = [];
try {
  await runtime.ready();
  const discovery = await runtime.discover();
  const selected = process.env.H2_ONLY !== undefined
    ? H2_VERIFICATION_IDS.filter((id) => id === process.env.H2_ONLY)
    : process.env.H2_SET === "H2B" ? H2B_VERIFICATION_IDS
      : process.env.H2_SET === "H2C" ? H2C_VERIFICATION_IDS
        : process.env.H2_SET === "H2D" ? H2D_VERIFICATION_IDS : H2_VERIFICATION_IDS;
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
    const evidence = suiteRun?.evidence.map((entry) => entry.content).join("\n") ?? "";
    const workspacePeakBytes = Number(evidence.match(/"h2WorkspacePeakBytes":(\d+)/)?.[1] ?? "0");
    const certificate = evidence.split("\n").findLast((line) => line.includes(`\"certificate\":\"${id}\"`)) ?? "";
    const stdoutBytes = Buffer.byteLength(suiteRun?.evidence.find((entry) => entry.kind === "stdout")?.content ?? "", "utf8");
    const stderrBytes = Buffer.byteLength(suiteRun?.evidence.find((entry) => entry.kind === "stderr")?.content ?? "", "utf8");
    results.push(Object.freeze({ id, discovered: true, execution: true, cleanup: !evidence.includes("WORKSPACE_CLEANUP_FAILED") && evidence.includes('"h2Cleanup":"removed"'), workspacePeakBytes, stdoutBytes, stderrBytes, certificate }));
    console.log(JSON.stringify({ certificate: "h2b-hosted-id", id, result: results.at(-1) }));
    run.dispose();
  }
} finally { runtime.dispose(); await server.stop(); }
const cancellation = await lifecycle_fixture("cancel");
const cleanupBeforePass = await lifecycle_fixture("pass");
console.log(JSON.stringify({ certificate: "h2-hosted-lifecycle", cancellation, cleanupBeforePass }));
console.log(JSON.stringify({ certificate: "h2b-hosted", results }));
