import assert from "node:assert/strict";
import { create_external_library_launcher_service } from "../../harness/runtimes/node/external-library-launchers";

const service = create_external_library_launcher_service();
const command = (id: string, source: string, timeoutMs = 5_000) => ({
  id, cwd: process.cwd(), command: process.execPath, args: Object.freeze(["-e", source]), environment: Object.freeze({}), timeoutMs,
});
try {
  const first = service.runCommand(command("scheduler-dedupe", "process.stdout.write('once')"));
  const duplicate = service.runCommand(command("scheduler-dedupe", "process.stdout.write('once')"));
  const [left, right] = await Promise.all([first, duplicate]);
  assert.equal(left.stdout, "once");
  assert.equal(right.stdout, "once");
  assert.equal(service.metrics().commandStarts, 1);

  const failure = await service.runCommand(command("scheduler-failure", "process.stderr.write('truthful failure');process.exitCode=7"));
  assert.equal(failure.ok, false);
  assert.equal(failure.exitCode, 7);
  assert.equal(failure.stderr, "truthful failure");

  const controller = new AbortController();
  const held = service.runCommand(command("scheduler-cancel", "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)", 10_000), { signal: controller.signal });
  setTimeout(() => controller.abort(), 50);
  const cancelled = await held;
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.forceKilled, true);
  assert.equal(service.metrics().activeChildren, 0);
} finally {
  service.terminate();
}
console.log(JSON.stringify({ suite: "external-command-scheduler", checks: 9 }));
