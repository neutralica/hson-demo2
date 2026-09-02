import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clean_stale_isolated_workspaces, run_isolated_command } from "../../harness/runtimes/node/isolated-command-runner";

const root = await mkdtemp(join(tmpdir(), "isolated-command-suite-"));
const tempRoot = join(root, "workspaces");
const make_source = async (name: string): Promise<string> => {
  const source = join(root, name);
  await mkdir(source);
  await writeFile(join(source, "input.txt"), "stable");
  return source;
};
const invoke = (sourceRoot: string, code: string, extra: Partial<Parameters<typeof run_isolated_command>[0]> = {}) => run_isolated_command({
  sourceRoot,
  command: process.execPath,
  args: ["-e", code],
  environment: { PATH: process.env.PATH ?? "/usr/bin:/bin", ALLOWED: "yes" },
  timeoutMs: 2_000,
  tempRoot,
  ...extra,
});

const source = await make_source("source");
let workspaceAtCommand = "";
const successful = await invoke(source, "process.stdout.write([process.env.ALLOWED,process.env.HOME??'absent',require('node:fs').readFileSync('input.txt','utf8')].join('|'))", {
  testHooks: { beforeCommand(workspace) { workspaceAtCommand = workspace; } },
});
assert.equal(successful.ok, true);
assert.equal(successful.process?.stdout, "yes|absent|stable");
await assert.rejects(stat(workspaceAtCommand), { code: "ENOENT" });

const absoluteLinkSource = await make_source("absolute-link");
await symlink(join(absoluteLinkSource, "input.txt"), join(absoluteLinkSource, "bad"));
await assert.rejects(invoke(absoluteLinkSource, ""), /ISOLATED_SOURCE_SYMLINK_REJECTED/);
const relativeLinkSource = await make_source("relative-link");
await symlink("input.txt", join(relativeLinkSource, "bad"));
await assert.rejects(invoke(relativeLinkSource, ""), /ISOLATED_SOURCE_SYMLINK_REJECTED/);

const mutationSource = await make_source("mutation");
const mutation = await invoke(mutationSource, "", {
  testHooks: { afterSourceCapture: async () => writeFile(join(mutationSource, "input.txt"), "changed") },
});
assert.equal(mutation.failure, "source-mutated");
await assert.rejects(invoke(source, "", { workingDirectory: "../escape" }), /ISOLATED_PATH_ESCAPE/);

const stale = join(tempRoot, "run-stale-owned");
await mkdir(stale, { recursive: true });
await writeFile(join(stale, ".isolated-command-workspace.json"), JSON.stringify({ schema: "hson-isolated-command-workspace-v1", id: "run-stale-owned" }));
const old = new Date(Date.now() - 10_000);
await utimes(stale, old, old);
assert.deepEqual(await clean_stale_isolated_workspaces(tempRoot, 1_000), [stale]);

const priorDepth = process.env.HSON_ISOLATED_COMMAND_DEPTH;
process.env.HSON_ISOLATED_COMMAND_DEPTH = "1";
await assert.rejects(invoke(source, ""), /ISOLATED_NESTED_INVOCATION_REJECTED/);
if (priorDepth === undefined) delete process.env.HSON_ISOLATED_COMMAND_DEPTH;
else process.env.HSON_ISOLATED_COMMAND_DEPTH = priorDepth;

const timedOut = await invoke(source, "process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000)", { timeoutMs: 50 });
assert.equal(timedOut.process?.timedOut, true);

const controller = new AbortController();
setTimeout(() => controller.abort(), 50);
const cancelled = await invoke(source, "process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000)", { signal: controller.signal });
assert.equal(cancelled.process?.cancelled, true);

const bounded = await invoke(source, "process.stdout.write('x'.repeat(10000));process.stderr.write('y'.repeat(10000))", { stdoutLimitBytes: 128, stderrLimitBytes: 128 });
assert.equal(bounded.process?.stdoutTruncated, true);
assert.equal(bounded.process?.outputLimitExceeded, true);

const overLimit = await invoke(source, "require('node:fs').writeFileSync('large.bin','x'.repeat(50000));setInterval(()=>{},1000)", { workspaceLimitBytes: 2_000, timeoutMs: 2_000 });
assert.equal(overLimit.failure, "workspace-limit");

console.log(JSON.stringify({ suite: "isolated-command-runner", checks: 14 }));
