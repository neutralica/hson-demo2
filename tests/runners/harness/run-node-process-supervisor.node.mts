import assert from "node:assert/strict";
import { create_node_process_supervisor } from "../../harness/runtimes/node/node-process-supervisor";
import { H2_VERIFICATION_IDS, resolve_h2_verification } from "../../harness/runtimes/node/h2-isolated-verification";

assert.equal(H2_VERIFICATION_IDS.length, 10);
assert.throws(() => resolve_h2_verification("forged-command"), /UNKNOWN_H2_VERIFICATION_ID/);

const supervisor = create_node_process_supervisor({
  stdoutLimitBytes: 256,
  stderrLimitBytes: 256,
  truncationMarker: "<TRUNCATED>",
  terminationGraceMs: 100,
});

const invocation = (source: string, timeoutMs = 2_000) => ({
  cwd: process.cwd(),
  command: process.execPath,
  args: Object.freeze(["-e", source]),
  environment: Object.freeze({}),
  timeoutMs,
});

const successful = await supervisor.start(invocation(
  "process.stdout.write('stdout'); process.stderr.write('stderr')",
)).result;
assert.equal(successful.ok, true);
assert.equal(successful.stdout, "stdout");
assert.equal(successful.stderr, "stderr");

const nonzero = await supervisor.start(invocation("process.exitCode = 7")).result;
assert.equal(nonzero.ok, false);
assert.equal(nonzero.exitCode, 7);

const isolatedSupervisor = create_node_process_supervisor({
  stdoutLimitBytes: 256,
  stderrLimitBytes: 256,
  truncationMarker: "<TRUNCATED>",
  terminationGraceMs: 100,
  environmentMode: "replace",
});
const replacedEnvironment = await isolatedSupervisor.start({
  ...invocation("process.stdout.write([process.env.NODE_OPTIONS ?? 'absent', process.env.H2_SECRET ?? 'absent', process.env.H2_ALLOWED ?? 'absent'].join('|'))"),
  environment: Object.freeze({ PATH: process.env.PATH ?? "/usr/bin:/bin", H2_ALLOWED: "present" }),
}).result;
assert.equal(replacedEnvironment.stdout, "absent|absent|present");

const bounded = await supervisor.start(invocation(
  "process.stdout.write('head-' + 'x'.repeat(1_000) + '-tail')",
)).result;
assert.equal(bounded.stdoutTruncated, true);
assert.equal(bounded.stdoutBytes, 1_010);
assert.match(bounded.stdout, /^head-/);
assert.match(bounded.stdout, /<TRUNCATED>/);
assert.match(bounded.stdout, /-tail$/);
assert.ok(Buffer.byteLength(bounded.stdout, "utf8") <= 256);

const timedOut = await supervisor.start(invocation(
  "process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1_000)",
  50,
)).result;
assert.equal(timedOut.timedOut, true);
assert.equal(timedOut.forceKilled, false);
assert.equal(timedOut.ok, false);

const cooperativeController = new AbortController();
const cooperative = supervisor.start(invocation(
  "process.on('SIGTERM', () => process.exit(0)); process.stdout.write('ready'); setInterval(() => {}, 1_000)",
), { signal: cooperativeController.signal });
setTimeout(() => cooperativeController.abort(), 50);
const cooperativelyCancelled = await cooperative.result;
assert.equal(cooperativelyCancelled.cancelled, true);
assert.equal(cooperativelyCancelled.forceKilled, false);

const forcedController = new AbortController();
const forced = supervisor.start(invocation(
  "process.on('SIGTERM', () => {}); setInterval(() => {}, 1_000)",
), { signal: forcedController.signal });
setTimeout(() => forcedController.abort(), 50);
const forceKilled = await forced.result;
assert.equal(forceKilled.cancelled, true);
assert.equal(forceKilled.forceKilled, true);
assert.equal(forceKilled.signal, "SIGKILL");

let descendantPid = 0;
let descendantPidResolve!: () => void;
const descendantPidReady = new Promise<void>((resolve) => { descendantPidResolve = resolve; });
const tree = supervisor.start(invocation(
  "const {spawn}=require('node:child_process'); const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)']); process.stdout.write(String(c.pid)); setInterval(()=>{},1000)",
), {
  observeStdoutChunk(chunk) {
    descendantPid = Number(chunk.toString("utf8"));
    if (Number.isSafeInteger(descendantPid) && descendantPid > 0) descendantPidResolve();
  },
});
await descendantPidReady;
tree.terminate();
await tree.result;
if (process.platform !== "win32") {
  assert.throws(() => process.kill(descendantPid, 0), /ESRCH/);
}

const activeAtDispose = supervisor.start(invocation(
  "process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1_000)",
));
assert.equal(supervisor.metrics().activeChildren, 1);
supervisor.dispose();
const disposed = await activeAtDispose.result;
assert.equal(disposed.ok, false);
assert.equal(supervisor.metrics().activeChildren, 0);

console.log(JSON.stringify({
  certificate: "node-process-supervisor",
  outputBounded: bounded.stdoutTruncated,
  timeout: timedOut.timedOut,
  cooperativeCancellation: cooperativelyCancelled.cancelled && !cooperativelyCancelled.forceKilled,
  forcedTermination: forceKilled.forceKilled,
  processTreeCleanup: true,
  activeChildDisposal: supervisor.metrics().activeChildren === 0,
  replacementEnvironment: replacedEnvironment.ok,
}));
