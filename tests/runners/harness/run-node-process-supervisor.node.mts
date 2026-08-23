import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create_node_process_supervisor } from "../../harness/runtimes/node/node-process-supervisor";
import { H2_VERIFICATION_IDS, resolve_h2_verification } from "../../harness/runtimes/node/h2-isolated-verification";

assert.deepEqual(
  H2_VERIFICATION_IDS.map((id) => resolve_h2_verification(id).id),
  H2_VERIFICATION_IDS,
  "every registered H2 verification identity resolves to its fixed descriptor",
);
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

const treeSupervisor = create_node_process_supervisor({
  stdoutLimitBytes: 256,
  stderrLimitBytes: 256,
  truncationMarker: "<TRUNCATED>",
  terminationGraceMs: 1_000,
});
const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));
const process_exists = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
};
async function cancellation_tree(source: string, options: Readonly<{ descendantTermMarker?: string; mustSurviveGrace?: boolean }> = {}): Promise<Readonly<{ result: Awaited<ReturnType<typeof treeSupervisor.start>["result"]>; descendantPid: number; parentPid: number; parentTermObserved: boolean; descendantTermObserved: boolean }>> {
  let output = "";
  let descendantPid = 0;
  let parentPid = 0;
  let readyResolve!: () => void;
  const ready = new Promise<void>((resolve) => { readyResolve = resolve; });
  const execution = treeSupervisor.start(invocation(source), { observeStdoutChunk(chunk) {
    output += chunk.toString("utf8");
    const match = /^ready:(\d+)/m.exec(output);
    if (match !== null) { descendantPid = Number(match[1]); readyResolve(); }
    const parentMatch = /parent:(\d+)/.exec(output);
    if (parentMatch !== null) parentPid = Number(parentMatch[1]);
  } });
  await ready;
  if (process.platform !== "win32") assert.equal(process_exists(-parentPid), true, "detached parent owns a live process group");
  execution.terminate();
  // The fixture writes this immediately before its direct parent exits.  The
  // result must remain pending even though the parent has already closed.
  while (!output.includes("parent-term")) await wait(5);
  let settled = false;
  void execution.result.then(() => { settled = true; });
  await wait(50);
  if (options.mustSurviveGrace === true) {
    assert.equal(process_exists(descendantPid), true, "descendant remains alive during termination grace");
    if (process.platform !== "win32") assert.equal(process_exists(-parentPid), true, "owned process group remains alive after parent close");
    assert.equal(settled, false, "parent close does not settle a live owned process group");
  }
  const result = await execution.result;
  const descendantTermObserved = options.descendantTermMarker === undefined
    ? output.includes("descendant-term")
    : await readFile(options.descendantTermMarker, "utf8").then((value) => value === "SIGTERM", () => false);
  return Object.freeze({ result, descendantPid, parentPid, parentTermObserved: output.includes("parent-term"), descendantTermObserved });
}

const resistantFixtureDirectory = await mkdtemp(join(tmpdir(), "hson-supervisor-resistant-"));
const resistantTermMarker = join(resistantFixtureDirectory, "descendant-term");
const resistantTree = await cancellation_tree(
  `const{spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',${JSON.stringify(`const{writeFileSync}=require('node:fs');process.on('SIGTERM',()=>writeFileSync(${JSON.stringify(resistantTermMarker)},'SIGTERM'));setInterval(()=>{},1000);process.stdout.write('descendant-ready')`)}],{stdio:['ignore','pipe','ignore']});let armed=false;c.stdout.on('data',b=>{const s=b.toString();if(s.includes('descendant-ready')&&!armed){armed=true;process.stdout.write('ready:'+c.pid+' parent:'+process.pid)}});process.on('SIGTERM',()=>{process.stdout.write(' parent-term');process.exit(0)});setInterval(()=>{},1000)`,
  { descendantTermMarker: resistantTermMarker, mustSurviveGrace: true },
);
assert.equal(resistantTree.parentTermObserved, true);
assert.equal(resistantTree.descendantTermObserved, true, "resistant descendant receives SIGTERM before SIGKILL");
assert.equal(resistantTree.result.forceKilled, true, "SIGKILL follows the preserved grace period for a resistant descendant");
if (process.platform !== "win32") assert.equal(process_exists(resistantTree.descendantPid), false, "resistant descendant is gone before settlement");
if (process.platform !== "win32") assert.equal(process_exists(-resistantTree.parentPid), false, "resistant process group is gone before settlement");
await rm(resistantFixtureDirectory, { recursive: true, force: true });

const cooperativeTree = await cancellation_tree(
  "const{spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',\"process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000);process.stdout.write('descendant-ready')\"],{stdio:['ignore','pipe','ignore']});c.stdout.on('data',b=>{if(b.toString().includes('descendant-ready'))process.stdout.write('ready:'+c.pid+' parent:'+process.pid)});process.on('SIGTERM',()=>{process.stdout.write(' parent-term');process.exit(0)});setInterval(()=>{},1000)",
);
assert.equal(cooperativeTree.result.forceKilled, false, "cooperative process group does not receive SIGKILL");
if (process.platform !== "win32") assert.equal(process_exists(cooperativeTree.descendantPid), false, "cooperative descendant is gone before settlement");
if (process.platform !== "win32") assert.equal(process_exists(-cooperativeTree.parentPid), false, "cooperative process group is gone before settlement");

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
  resistantDescendantForceKilled: resistantTree.result.forceKilled,
  resistantDescendantGone: !process_exists(resistantTree.descendantPid),
  resistantDescendantTermObserved: resistantTree.descendantTermObserved,
  cooperativeDescendantForceKilled: cooperativeTree.result.forceKilled,
  processTreeCleanup: true,
  activeChildDisposal: supervisor.metrics().activeChildren === 0,
  replacementEnvironment: replacedEnvironment.ok,
}));
