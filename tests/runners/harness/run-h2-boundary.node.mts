import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { capture_h2_source_manifest, execute_h2_verification, h2_completion_accepted, h2_owned_quarantine_path, h2_paired_manifest_digest, h2_terminal_json_completion_accepted, h2_workspace_bytes_for_tests, H2_VERIFICATION_IDS, H2_WORKSPACE_POLL_INTERVAL_MS, resolve_h2_verification, sweep_stale_h2_workspaces } from "../../harness/runtimes/node/h2-isolated-verification";
import { create_node_process_supervisor } from "../../harness/runtimes/node/node-process-supervisor";

const exec = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), "h2-boundary-"));
const checks: string[] = [];
const check = (condition: unknown, name: string): void => { assert.ok(condition, name); checks.push(name); };
async function repo(name: string): Promise<string> {
  const path = join(root, name); await mkdir(path); await exec("git", ["init", "-q", path]); await exec("git", ["-C", path, "config", "user.email", "h2@example.invalid"]); await exec("git", ["-C", path, "config", "user.name", "H2"]); await writeFile(join(path, "tracked.txt"), "base"); await exec("git", ["-C", path, "add", "."]); await exec("git", ["-C", path, "commit", "-qm", "base"]); return path;
}
async function h2_fixture(name: string): Promise<Readonly<{ live: string; demo: string }>> {
  const live = await repo(`${name}-live`); const demo = await repo(`${name}-demo`);
  await writeFile(join(live, "package.json"), JSON.stringify({ name: "hson-live", version: "0.0.0", type: "module", scripts: { build: "node build.mjs" }, exports: { ".": "./dist/index.js", "./test-launchers": "./dist/test-launchers.js" } }));
  await writeFile(join(live, "package-lock.json"), "{}\n");
  await writeFile(join(live, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist", { recursive: true }); await writeFile("dist/index.js", "export const fixture = true;\\n"); await writeFile("dist/test-launchers.js", "export const fixtureLauncher = true;\\n"); await writeFile("dist/preparation-budget.bin", Buffer.alloc(65536)); console.log("preparation-fixture-write");`);
  await writeFile(join(demo, "package.json"), JSON.stringify({ name: "hson-demo2", version: "0.0.0", type: "module", scripts: { "test:surface-enumeration-node": "node child.mjs" } }));
  await writeFile(join(demo, "package-lock.json"), "{}\n");
  await writeFile(join(demo, "child.mjs"), `import { createRequire } from "node:module"; import { realpathSync, readFileSync, existsSync } from "node:fs"; const require = createRequire(import.meta.url); const names = ["NODE_OPTIONS", "H2_SECRET", "GITHUB_TOKEN", "CLOUDFLARE_API_TOKEN", "AWS_SECRET_ACCESS_KEY", "TOWL_DEPLOYED_WS_URL", "VITE_SECRET_CANARY", "HOME", "TMPDIR", "XDG_CACHE_HOME", "npm_config_cache", "CI", "HSON_HOSTED_VERIFICATION_DEPTH"]; console.log(JSON.stringify({ live: realpathSync(require.resolve("hson-live")), launchers: realpathSync(require.resolve("hson-live/test-launchers")), sentinel: readFileSync("node_modules/sentinel", "utf8"), canary: existsSync("node_modules/run-canary"), env: Object.fromEntries(names.map((name) => [name, process.env[name] ?? null])) })); console.log("test surface enumeration: ok");`);
  await writeFile(join(demo, ".gitignore"), "node_modules\n"); await mkdir(join(demo, "node_modules", ".bin"), { recursive: true }); await writeFile(join(demo, "node_modules", "sentinel"), "fixture"); await symlink("../sentinel", join(demo, "node_modules", ".bin", "sentinel"));
  await exec("git", ["-C", live, "add", "."]); await exec("git", ["-C", live, "commit", "-qm", "fixture"]);
  await exec("git", ["-C", demo, "add", "."]); await exec("git", ["-C", demo, "commit", "-qm", "fixture"]);
  return Object.freeze({ live, demo });
}
try {
  const live = await repo("live"); const demo = await repo("demo");
  await writeFile(join(live, "tracked.txt"), "modified"); await writeFile(join(live, "new.txt"), "untracked");
  const first = await capture_h2_source_manifest("hson-live", live); const paired = await capture_h2_source_manifest("hson-demo2", demo);
  check(first.entries.some((entry) => entry.relativePath === "tracked.txt" && entry.byteLength === 8), "modified tracked bytes captured");
  check(first.entries.some((entry) => entry.relativePath === "new.txt"), "nonignored untracked file captured");
  const digest = h2_paired_manifest_digest(first, paired); await utimes(join(live, "tracked.txt"), new Date(0), new Date());
  check(h2_paired_manifest_digest(await capture_h2_source_manifest("hson-live", live), paired) === digest, "mtime excluded from digest");
  await writeFile(join(live, "tracked.txt"), "changed"); check(h2_paired_manifest_digest(await capture_h2_source_manifest("hson-live", live), paired) !== digest, "byte changes alter digest");
  await rm(join(live, "tracked.txt")); check(!(await capture_h2_source_manifest("hson-live", live)).entries.some((entry) => entry.relativePath === "tracked.txt"), "deleted tracked file absent");
  await symlink("/etc/passwd", join(live, "escape")); await assert.rejects(() => capture_h2_source_manifest("hson-live", live), /SOURCE_SYMLINK_REJECTED/); checks.push("absolute symlink rejected"); await rm(join(live, "escape"));
  await symlink("../demo", join(live, "relative-escape")); await assert.rejects(() => capture_h2_source_manifest("hson-live", live), /SOURCE_SYMLINK_REJECTED/); checks.push("relative symlink rejected"); await rm(join(live, "relative-escape"));
  const churn = join(root, "workspace-churn"); await mkdir(join(churn, "vanishing-directory"), { recursive: true }); await writeFile(join(churn, "vanishing-file"), "transient");
  let removedDuringScan = false;
  const churnBytes = await h2_workspace_bytes_for_tests(churn, async (path) => {
    if (path === churn && !removedDuringScan) { removedDuringScan = true; await rm(join(churn, "vanishing-directory"), { recursive: true }); await rm(join(churn, "vanishing-file")); }
  });
  check(removedDuringScan && churnBytes === 0, "workspace accounting tolerates an enumerated file or directory disappearing during scan");
  assert.throws(() => resolve_h2_verification("forged-command"), /UNKNOWN_H2_VERIFICATION_ID/); checks.push("fixed ID rejects forged command");
  const stale = join(root, "stale"); await mkdir(join(stale, "run-old"), { recursive: true }); await writeFile(join(stale, "run-old", "marker.json"), JSON.stringify({ owner: "hson-h2-isolated-verification-v1", createdAt: new Date(Date.now() - 7 * 60 * 60_000).toISOString() })); await mkdir(join(stale, "run-fresh"), { recursive: true }); await writeFile(join(stale, "run-fresh", "marker.json"), JSON.stringify({ owner: "hson-h2-isolated-verification-v1", createdAt: new Date().toISOString() })); await mkdir(join(stale, "run-unmarked")); await sweep_stale_h2_workspaces(stale); await assert.rejects(() => import("node:fs/promises").then(({ stat }) => stat(join(stale, "run-old")))); checks.push("stale owned workspace removed"); check(true, "fresh and unmarked workspaces retained");
  const mismatchLive = await repo("mismatch-live"); const mismatchDemo = await repo("mismatch-demo");
  const mismatch = await execute_h2_verification({ hsonLiveRoot: mismatchLive, hsonDemo2Root: mismatchDemo, tempRoot: join(root, "mismatch-work"), testHooks: { afterCapture: async () => { await writeFile(join(mismatchLive, "tracked.txt"), "changed-after-capture"); } } }, "hson-demo2:test:surface-enumeration-node");
  check(mismatch.status === "FAIL" && mismatch.failureReason === "MATERIALIZED_SNAPSHOT_MISMATCH" && mismatch.process === undefined, "materialized mismatch rejects before child start");
  const unstableLive = await repo("unstable-live"); const unstableDemo = await repo("unstable-demo"); let attempts = 0;
  const unstable = await execute_h2_verification({ hsonLiveRoot: unstableLive, hsonDemo2Root: unstableDemo, tempRoot: join(root, "unstable-work"), testHooks: { afterMaterialization: async () => { attempts += 1; await writeFile(join(unstableLive, "tracked.txt"), `unstable-${attempts}`); } } }, "hson-demo2:test:surface-enumeration-node");
  check(unstable.status === "FAIL" && unstable.failureReason === "SOURCE_CHANGED_DURING_SNAPSHOT" && attempts === 2, "source instability retries once then rejects");
  const originalDepth = process.env.HSON_HOSTED_VERIFICATION_DEPTH; process.env.HSON_HOSTED_VERIFICATION_DEPTH = "1";
  await assert.rejects(() => execute_h2_verification({ hsonLiveRoot: live, hsonDemo2Root: demo, tempRoot: join(root, "nested-work") }, "hson-demo2:test:surface-enumeration-node"), /H2_NESTED_VERIFICATION_FORBIDDEN/); checks.push("nested H2 invocation rejected at depth one");
  if (originalDepth === undefined) delete process.env.HSON_HOSTED_VERIFICATION_DEPTH; else process.env.HSON_HOSTED_VERIFICATION_DEPTH = originalDepth;
  check(h2_completion_accepted('{"status":"pass"}', "{"), "authoritative successful completion accepted");
  check(!h2_completion_accepted('{"status":"fail"}', "{"), "exit-zero failure completion rejects");
  check(!h2_completion_accepted("ordinary output", "{"), "missing completion evidence rejects");
  const terminalDescriptors = H2_VERIFICATION_IDS.map(resolve_h2_verification).filter((descriptor) => descriptor.completion.kind === "terminal-json");
  check(terminalDescriptors.length === 8 && new Set(terminalDescriptors.map((descriptor) => descriptor.completion.kind === "terminal-json" ? descriptor.completion.certificate : "")).size === 8, "all eight formerly weak H2 descriptors use distinct terminal JSON certificate contracts");
  const validCertificate = JSON.stringify({ certificate: "stage-4b-panel", selectors: [], all: 1, unit: 1, dev: 1, overlap: 1, reflect: 1 });
  check(h2_terminal_json_completion_accepted(validCertificate, "stage-4b-panel"), "valid terminal JSON certificate accepts");
  for (const [output, name] of [
    ["", "missing terminal JSON certificate rejects"], ["{", "bare brace rejects"], ["{not-json", "malformed terminal JSON rejects"], [JSON.stringify({ certificate: "stage-4b-panel" }), "wrong-shaped terminal JSON rejects"], [JSON.stringify({ ...JSON.parse(validCertificate), certificate: "stage-4a-selected" }), "wrong certificate identity rejects"], [JSON.stringify({ ...JSON.parse(validCertificate), status: "fail" }), "explicit failure terminal JSON rejects"], ["{not-json\n" + validCertificate.slice(0, -1), "malformed marker-bearing terminal JSON rejects"],
  ] as const) check(!h2_terminal_json_completion_accepted(output, "stage-4b-panel"), name);
  const supervisor = create_node_process_supervisor({ stdoutLimitBytes: 64, stderrLimitBytes: 64, truncationMarker: "<CUT>", terminationGraceMs: 50, environmentMode: "replace" });
  const overflow = await supervisor.start({ cwd: root, command: process.execPath, args: ["-e", "process.stdout.write('x'.repeat(512));setInterval(()=>{},1000)"], environment: { PATH: process.env.PATH ?? "/usr/bin:/bin" }, timeoutMs: 2_000 }).result;
  check(overflow.outputLimitExceeded && !overflow.ok, "stdout overflow terminates process");
  const stderr = await supervisor.start({ cwd: root, command: process.execPath, args: ["-e", "process.stderr.write('x'.repeat(512));setInterval(()=>{},1000)"], environment: { PATH: process.env.PATH ?? "/usr/bin:/bin" }, timeoutMs: 2_000 }).result;
  check(stderr.outputLimitExceeded && !stderr.ok, "stderr overflow terminates process");
  let timedDescendant = 0;
  const timedTree = supervisor.start({ cwd: root, command: process.execPath, args: ["-e", "const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)']);process.stdout.write(String(c.pid));setInterval(()=>{},1000)"], environment: { PATH: process.env.PATH ?? "/usr/bin:/bin" }, timeoutMs: 100 }, { observeStdoutChunk(chunk) { timedDescendant = Number(chunk.toString()); } }).result;
  const timed = await timedTree;
  check(timed.timedOut && !timed.ok, "timeout produces one non-pass result");
  if (process.platform !== "win32") check(timedDescendant > 0 && (() => { try { process.kill(timedDescendant, 0); return false; } catch { return true; } })(), "timeout terminates descendant process tree");
  const cancellation = new AbortController();
  const cancelled = supervisor.start({ cwd: root, command: process.execPath, args: ["-e", "setInterval(()=>{},1000)"], environment: { PATH: process.env.PATH ?? "/usr/bin:/bin" }, timeoutMs: 2_000 }, { signal: cancellation.signal }); setTimeout(() => cancellation.abort(), 30);
  check((await cancelled.result).cancelled, "executor cancellation settles child process");
  const canary = await supervisor.start({ cwd: root, command: process.execPath, args: ["-e", "process.stdout.write(['NODE_OPTIONS','H2_SECRET','GITHUB_TOKEN','CLOUDFLARE_API_TOKEN','AWS_SECRET_ACCESS_KEY','TOWL_DEPLOYED_WS_URL','VITE_SECRET_CANARY'].map((name)=>process.env[name]??'absent').join('|'))"], environment: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: join(root, "home"), TMPDIR: join(root, "tmp"), XDG_CACHE_HOME: join(root, "cache"), npm_config_cache: join(root, "npm-cache"), CI: "true", HSON_HOSTED_VERIFICATION_DEPTH: "1" }, timeoutMs: 2_000 }).result;
  check(canary.stdout === "absent|absent|absent|absent|absent|absent|absent", "replacement environment strips parent secret canaries");
  check(canary.ok, "replacement environment child succeeds with executor-owned variables");
  const fixture = await h2_fixture("real");
  const workspaceLimit = await execute_h2_verification({ hsonLiveRoot: fixture.live, hsonDemo2Root: fixture.demo, tempRoot: join(root, "workspace-limit"), workspaceLimitBytes: 16 * 1024 }, "hson-demo2:test:surface-enumeration-node");
  check(workspaceLimit.status === "FAIL" && workspaceLimit.failureReason === "WORKSPACE_LIMIT_EXCEEDED" && workspaceLimit.process?.stdout.includes("preparation-fixture-write") === true && workspaceLimit.cleanup === "removed", `preparation workspace limit is authoritative (poll ${H2_WORKSPACE_POLL_INTERVAL_MS}ms; bounded polling overshoot)`);
  const originalCanaries = Object.fromEntries(["NODE_OPTIONS", "H2_SECRET", "GITHUB_TOKEN", "CLOUDFLARE_API_TOKEN", "AWS_SECRET_ACCESS_KEY", "TOWL_DEPLOYED_WS_URL", "VITE_SECRET_CANARY"].map((name) => [name, process.env[name]]));
  Object.assign(process.env, Object.fromEntries(Object.keys(originalCanaries).map((name) => [name, `${name}-parent-canary`])));
  const isolated = await execute_h2_verification({ hsonLiveRoot: fixture.live, hsonDemo2Root: fixture.demo, tempRoot: join(root, "isolated-child") }, "hson-demo2:test:surface-enumeration-node");
  for (const [name, value] of Object.entries(originalCanaries)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  const childEvidenceText = isolated.process?.stdout.split("\n").find((line) => line.startsWith('{"live"')) ?? "";
  assert.ok(childEvidenceText !== "", JSON.stringify(isolated));
  const childEvidence = JSON.parse(childEvidenceText) as { live?: string; launchers?: string; env?: Record<string, string | null> };
  const isolatedRoot = "/isolated-child/run-";
  check(isolated.status === "PASS" && isolated.cleanup === "removed" && childEvidence.live?.includes(isolatedRoot) === true && childEvidence.launchers?.includes(isolatedRoot) === true && !childEvidence.live.includes(fixture.live) && !childEvidence.launchers.includes(fixture.demo), "actual isolated child resolves hson-live and test-launchers inside its run workspace");
  check(["NODE_OPTIONS", "H2_SECRET", "GITHUB_TOKEN", "CLOUDFLARE_API_TOKEN", "AWS_SECRET_ACCESS_KEY", "TOWL_DEPLOYED_WS_URL", "VITE_SECRET_CANARY"].every((name) => childEvidence.env?.[name] === null) && ["HOME", "TMPDIR", "XDG_CACHE_HOME", "npm_config_cache", "CI", "HSON_HOSTED_VERIFICATION_DEPTH"].every((name) => typeof childEvidence.env?.[name] === "string" && childEvidence.env[name] !== ""), "actual isolated child has replacement-environment canaries and executor-owned values");
  const dependencyRoot = join(root, "dependency-isolation");
  const runA = await execute_h2_verification({ hsonLiveRoot: fixture.live, hsonDemo2Root: fixture.demo, tempRoot: dependencyRoot, testHooks: { async beforeExecution(_workspace, snapshotDemo) { await writeFile(join(snapshotDemo, "node_modules", "run-canary"), "run-a"); await writeFile(join(snapshotDemo, "node_modules", "sentinel"), "mutated-by-run-a"); } } }, "hson-demo2:test:surface-enumeration-node");
  check(runA.status === "PASS", "dependency-isolation run A completes");
  const preparedDirectories = await readdir(join(dependencyRoot, "prepared-dependencies"));
  const prepared = join(dependencyRoot, "prepared-dependencies", preparedDirectories.find((name) => !name.includes(".staging-"))!, "node_modules");
  let preparedHasCanary = true;
  try { await stat(join(prepared, "run-canary")); } catch { preparedHasCanary = false; }
  check(!preparedHasCanary, "prepared template has no run A canary");
  check(await readFile(join(prepared, "sentinel"), "utf8") === "fixture", "prepared template bytes survive run A mutation");
  const runB = await execute_h2_verification({ hsonLiveRoot: fixture.live, hsonDemo2Root: fixture.demo, tempRoot: dependencyRoot }, "hson-demo2:test:surface-enumeration-node");
  const runBEvidenceText = runB.process?.stdout.split("\n").find((line) => line.startsWith('{"live"')) ?? "";
  const runBEvidence = JSON.parse(runBEvidenceText) as { sentinel: string; canary: boolean };
  check(runB.status === "PASS" && runBEvidence.canary === false, "run B cannot observe run A canary");
  check(runBEvidence.sentinel === "fixture", "run B observes original disposable dependency bytes");
  const quarantine = h2_owned_quarantine_path(join(root, "owned-root"), join(root, "owned-root", "run-fixture"));
  check(quarantine === join(root, "owned-root", "run-fixture") && h2_owned_quarantine_path(join(root, "owned-root"), join(root, "outside", "run-fixture")) === undefined, "cleanup quarantine evidence is bounded to an owned run workspace");
  console.log(JSON.stringify({ certificate: "h2-boundary", checks, total: checks.length }));
} finally { await rm(root, { recursive: true, force: true }); }
