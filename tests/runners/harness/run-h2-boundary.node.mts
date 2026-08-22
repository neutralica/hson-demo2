import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { capture_h2_source_manifest, execute_h2_verification, h2_completion_accepted, h2_owned_quarantine_path, h2_paired_manifest_digest, h2_terminal_json_completion_accepted, h2_workspace_bytes_for_tests, H2_VERIFICATION_IDS, H2_WORKSPACE_POLL_INTERVAL_MS, resolve_h2_verification, sweep_stale_h2_workspaces } from "../../harness/runtimes/node/h2-isolated-verification";
import { create_node_process_supervisor } from "../../harness/runtimes/node/node-process-supervisor";
import { collect_h2_artifact_manifest, h2c_terminal_certificate, resolve_h2c_descriptor, run_h2c_artifact_certification, verify_h2_artifact_manifest } from "../../harness/runtimes/node/h2-artifact-certification";

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
  const terminalDescriptors = H2_VERIFICATION_IDS.map(resolve_h2_verification).filter((descriptor) => descriptor.capabilityProfile === "source-meta" && descriptor.completion.kind === "terminal-json");
  check(terminalDescriptors.length === 8 && new Set(terminalDescriptors.map((descriptor) => descriptor.completion.kind === "terminal-json" ? descriptor.completion.certificate : "")).size === 8, "all eight formerly weak H2 descriptors use distinct terminal JSON certificate contracts");
  const descriptorRealSuccess: Readonly<Record<string, string>> = {
    "hson-demo2:test:surface-enumeration-node": "test surface enumeration: ok",
    "hson-demo2:test:stage2-contracts-node": "Stage 2 contracts: ok",
    "hson-demo2:test:stage3-discovery-node": JSON.stringify({ certificate: "stage-3-discovery", node: {}, worker: {} }),
    "hson-demo2:test:stage4a-selected-node": JSON.stringify({ certificate: "stage-4a-selected", selectionId: "selection", node: {}, worker: {}, opaqueId: "opaque" }),
    "hson-demo2:test:stage4b-panel-node": JSON.stringify({ certificate: "stage-4b-panel", selectors: [], all: 1, unit: 1, dev: 1, overlap: 1, reflect: 1 }),
    "hson-demo2:test:phase1-convergence-node": JSON.stringify({ certificate: "phase1-convergence", counts: {}, initialOrder: [], hostileCompletion: [], finalOrder: [] }),
    "hson-demo2:test:phase2a-lifecycle-node": JSON.stringify({ certificate: "phase2a-lifecycle", suite: "phase2a-lifecycle", checks: 1, order: [], executors: [] }),
    "hson-demo2:test:phase2b-presentation-node": JSON.stringify({ certificate: "phase2b-presentation", suite: "phase2b-presentation", checks: 1, groups: [], suites: 1 }),
    "hson-demo2:test:phase4a-layering-node": JSON.stringify({ certificate: "phase-4a-layering", checks: 1, appFiles: 1, reachableSourceFiles: 1 }),
    "hson-demo2:test:phase4b-retirement-node": JSON.stringify({ certificate: "phase4b-retirement", checks: 1, canonicalId: "canonical", opaqueId: "opaque", selectors: [] }),
  };
  for (const descriptor of H2_VERIFICATION_IDS.map(resolve_h2_verification).filter((entry) => entry.capabilityProfile === "source-meta")) {
    const output = descriptorRealSuccess[descriptor.id]!;
    const accepted = descriptor.completion.kind === "stdout-marker"
      ? h2_completion_accepted(output, descriptor.completion.marker)
      : h2_terminal_json_completion_accepted(output, descriptor.completion.certificate);
    check(accepted, `${descriptor.id} representative real-success completion contract accepts`);
  }
  const validCertificate = JSON.stringify({ certificate: "stage-4b-panel", selectors: [], all: 1, unit: 1, dev: 1, overlap: 1, reflect: 1 });
  check(h2_terminal_json_completion_accepted(validCertificate, "stage-4b-panel"), "valid terminal JSON certificate accepts");
  const finalRecordExpected = JSON.stringify({ certificate: "stage-4b-panel", selectors: [], all: 1, unit: 1, dev: 1, overlap: 1, reflect: 1 });
  const finalRecordWrongSuite = JSON.stringify({ certificate: "stage-3-discovery", node: {}, worker: {} });
  const finalRecordUnrelated = JSON.stringify({ note: "history" });
  const finalRecordFailure = JSON.stringify({ certificate: "stage-4b-panel", selectors: [], all: 1, unit: 1, dev: 1, overlap: 1, reflect: 1, status: "fail" });
  for (const [output, accepted, name] of [
    [finalRecordExpected, true, "final-record authority accepts valid expected certificate"],
    [finalRecordUnrelated + "\n" + finalRecordExpected, true, "final-record authority permits unrelated JSON before expected certificate"],
    [finalRecordWrongSuite + "\n" + finalRecordExpected, true, "final-record authority permits wrong-suite JSON before expected certificate"],
    [finalRecordExpected + "\n" + finalRecordExpected, true, "final-record authority permits duplicate expected JSON before final expected certificate"],
    [finalRecordExpected + "\n" + finalRecordUnrelated, false, "final-record authority rejects unrelated JSON after expected certificate"],
    [finalRecordExpected + "\nprose", false, "final-record authority rejects prose after expected certificate"],
    [finalRecordExpected + "\n{not-json", false, "final-record authority rejects malformed JSON after expected certificate"],
    [finalRecordWrongSuite, false, "final-record authority rejects wrong final certificate identity"],
    [finalRecordFailure, false, "final-record authority rejects failure final certificate state"],
    [finalRecordExpected + "\n\n", true, "final-record authority permits blank lines after expected certificate"],
  ] as const) check(h2_terminal_json_completion_accepted(output, "stage-4b-panel") === accepted, name);
  const realSuccessRecords = [
    ["phase2a-lifecycle", { certificate: "phase2a-lifecycle", suite: "phase2a-lifecycle", checks: 1, order: [], executors: [] }],
    ["phase2b-presentation", { certificate: "phase2b-presentation", suite: "phase2b-presentation", checks: 1, groups: [], suites: 1 }],
    ["phase-4a-layering", { certificate: "phase-4a-layering", checks: 1, appFiles: 1, reachableSourceFiles: 1 }],
    ["phase4b-retirement", { certificate: "phase4b-retirement", checks: 1, canonicalId: "canonical", opaqueId: "opaque", selectors: [] }],
  ] as const;
  for (const [certificate, record] of realSuccessRecords) {
    check(h2_terminal_json_completion_accepted(JSON.stringify(record), certificate), `${certificate} real successful terminal schema accepts`);
    check(!h2_terminal_json_completion_accepted(JSON.stringify({ ...record, certificate: "wrong-certificate" }), certificate), `${certificate} rejects mutated certificate identity`);
    check(!h2_terminal_json_completion_accepted(JSON.stringify({ ...record, checks: [] }), certificate), `${certificate} rejects mutated checks type`);
  }
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

  const npmCli = await realpath((await exec("which", ["npm"])).stdout.trim());
  const artifactDemo = join(root, "artifact-demo"); await mkdir(artifactDemo);
  const validLive = join(root, "artifact-valid-live"); await mkdir(join(validLive, "src"), { recursive: true });
  await writeFile(join(validLive, "src", "index.ts"), "export const fresh = true;\n");
  await mkdir(join(validLive, "dist"), { recursive: true });
  await writeFile(join(validLive, "dist", "index.js"), "stale-runtime\n");
  await writeFile(join(validLive, "dist", "index.d.ts"), "stale-types\n");
  await writeFile(join(validLive, "package.json"), JSON.stringify({ name: "hson-live", version: "0.0.0", type: "module", main: "./dist/index.js", types: "./dist/index.d.ts", exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } }, scripts: { build: "node build.mjs" } }));
  await writeFile(join(validLive, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist", { recursive: true }); for (const [path, bytes] of [["dist/index.js", "export const fresh = true;\\n"], ["dist/index.d.ts", "export declare const fresh: true;\\n"], ["dist/index.js.map", "{}\\n"], ["dist/index.d.ts.map", "{}\\n"]]) await writeFile(path, bytes);`);
  const validArtifact = await run_h2c_artifact_certification({ id: "hson-live:build", hsonLiveRoot: validLive, hsonDemo2Root: artifactDemo, npmCli });
  check(validArtifact.artifacts.some((entry) => entry.relativePath === "dist/index.js" && entry.byteLength !== "stale-runtime\n".length), "stale artifact is removed and cannot satisfy a build certificate");
  check(validArtifact.status === "pass" && validArtifact.artifacts.length === 4 && validArtifact.exportTargets?.length === 2, "valid command plus valid artifact evidence accepts");
  check(h2c_terminal_certificate(validArtifact).artifactEvidence.required.length === 2, "package certificate exposes its required export targets as terminal artifact evidence");
  check((await readFile(join(validLive, "dist", "index.js"), "utf8")).includes("fresh"), "build certificate requires the cleaned artifact to be recreated");

  const originalManifest = await collect_h2_artifact_manifest(validLive, ["dist/index.d.ts", "dist/index.js"]);
  const reversedManifest = await collect_h2_artifact_manifest(validLive, ["dist/index.js", "dist/index.d.ts"]);
  check(JSON.stringify(originalManifest) === JSON.stringify(reversedManifest), "artifact manifest is enumeration-order independent");
  await utimes(join(validLive, "dist", "index.js"), new Date(0), new Date());
  check(JSON.stringify(await collect_h2_artifact_manifest(validLive, ["dist/index.d.ts", "dist/index.js"])) === JSON.stringify(originalManifest), "artifact manifest is mtime independent");
  await writeFile(join(validLive, "dist", "index.js"), "export const fresh = false;\n");
  await assert.rejects(() => verify_h2_artifact_manifest(validLive, originalManifest), /H2C_ARTIFACT_MANIFEST_MISMATCH/); checks.push("artifact byte mutation and SHA mismatch reject");

  const missingLive = join(root, "artifact-missing-live"); await mkdir(join(missingLive, "src"), { recursive: true }); await writeFile(join(missingLive, "src", "index.ts"), "export {};\n");
  await writeFile(join(missingLive, "package.json"), JSON.stringify({ name: "hson-live", version: "0.0.0", type: "module", main: "./dist/index.js", types: "./dist/index.d.ts", exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } }, scripts: { build: "node build.mjs" } }));
  await writeFile(join(missingLive, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist", { recursive: true }); await writeFile("dist/other.js", "export {};\\n");`);
  await assert.rejects(() => run_h2c_artifact_certification({ id: "hson-live:build", hsonLiveRoot: missingLive, hsonDemo2Root: artifactDemo, npmCli }), /H2C_REQUIRED_ARTIFACT_MISSING/); checks.push("missing expected artifact rejects");

  const unexpectedLive = join(root, "artifact-unexpected-live"); await mkdir(join(unexpectedLive, "src"), { recursive: true }); await writeFile(join(unexpectedLive, "src", "index.ts"), "export {};\n");
  await writeFile(join(unexpectedLive, "package.json"), JSON.stringify({ name: "hson-live", version: "0.0.0", type: "module", main: "./dist/index.js", types: "./dist/index.d.ts", exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } }, scripts: { build: "node build.mjs" } }));
  await writeFile(join(unexpectedLive, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist", { recursive: true }); for (const path of ["index.js", "index.d.ts", "index.js.map", "index.d.ts.map", "injected-unexpected.js"]) await writeFile("dist/" + path, "export {};\\n");`);
  await assert.rejects(() => run_h2c_artifact_certification({ id: "hson-live:build", hsonLiveRoot: unexpectedLive, hsonDemo2Root: artifactDemo, npmCli }), /H2C_UNEXPECTED_ARTIFACT/); checks.push("package build rejects unexpected artifact outside TypeScript output contract");

  const viteDemo = join(root, "artifact-vite-demo"); await mkdir(join(viteDemo, "public"), { recursive: true }); await writeFile(join(viteDemo, "public", "logo.svg"), "<svg/>");
  await writeFile(join(viteDemo, "package.json"), JSON.stringify({ name: "hson-demo2", version: "0.0.0", type: "module", scripts: { build: "node build.mjs" } }));
  await writeFile(join(viteDemo, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist/assets", { recursive: true }); await writeFile("dist/index.html", "<!doctype html><script type=\\"module\\" src=\\"/assets/index-AbCd1234.js\\"></script>"); await writeFile("dist/logo.svg", "<svg/>"); await writeFile("dist/assets/index-AbCd1234.js", "import './chunk-AbCd1234.js';\\n"); await writeFile("dist/assets/chunk-AbCd1234.js", "import './index-AbCd1234.js';\\n");`);
  const viteArtifact = await run_h2c_artifact_certification({ id: "hson-demo2:build", hsonLiveRoot: validLive, hsonDemo2Root: viteDemo, npmCli });
  check(viteArtifact.status === "pass", "Vite contract accepts index, checked-in public files, and build-referenced generated assets");
  await writeFile(join(viteDemo, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist/assets", { recursive: true }); await writeFile("dist/index.html", "<!doctype html><script type=\\"module\\" src=\\"/assets/missing-AbCd1234.js\\"></script>");`);
  await assert.rejects(() => run_h2c_artifact_certification({ id: "hson-demo2:build", hsonLiveRoot: validLive, hsonDemo2Root: viteDemo, npmCli }), /H2C_VITE_MISSING_REFERENCE/); checks.push("Vite build rejects a referenced emitted asset that is absent");
  await writeFile(join(viteDemo, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist/assets", { recursive: true }); await writeFile("dist/index.html", "<!doctype html><script type=\\"module\\" src=\\"/assets/../../escape.js\\"></script>");`);
  await assert.rejects(() => run_h2c_artifact_certification({ id: "hson-demo2:build", hsonLiveRoot: validLive, hsonDemo2Root: viteDemo, npmCli }), /H2C_ARTIFACT_PATH_ESCAPE/); checks.push("Vite reference traversal cannot escape dist");
  await writeFile(join(viteDemo, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist/assets", { recursive: true }); await writeFile("dist/index.html", "<!doctype html><script type=\\"module\\" src=\\"/assets/index-AbCd1234.js\\"></script>"); await writeFile("dist/assets/index-AbCd1234.js", "export {};\\n"); await writeFile("dist/assets/forged-AbCd1234.js", "injected\\n");`);
  await assert.rejects(() => run_h2c_artifact_certification({ id: "hson-demo2:build", hsonLiveRoot: validLive, hsonDemo2Root: viteDemo, npmCli }), /H2C_UNEXPECTED_ARTIFACT/); checks.push("Vite build rejects unreferenced hash-shaped asset");
  await writeFile(join(viteDemo, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist", { recursive: true }); await writeFile("dist/index.html", "<!doctype html>"); await writeFile("dist/injected-unexpected.js", "export {};\\n");`);
  await assert.rejects(() => run_h2c_artifact_certification({ id: "hson-demo2:build", hsonLiveRoot: validLive, hsonDemo2Root: viteDemo, npmCli }), /H2C_UNEXPECTED_ARTIFACT/); checks.push("Vite build rejects unexpected root artifact");

  const failedLive = join(root, "artifact-failed-live"); await mkdir(join(failedLive, "dist"), { recursive: true });
  await writeFile(join(failedLive, "dist", "index.js"), "stale\n"); await writeFile(join(failedLive, "dist", "index.d.ts"), "stale\n");
  await writeFile(join(failedLive, "package.json"), JSON.stringify({ name: "hson-live", version: "0.0.0", type: "module", main: "./dist/index.js", types: "./dist/index.d.ts", exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } }, scripts: { build: "node fail.mjs" } }));
  await writeFile(join(failedLive, "fail.mjs"), `console.log('{"certificate":"hson-live:build","status":"pass"}'); process.exit(9);`);
  await assert.rejects(() => run_h2c_artifact_certification({ id: "hson-live:build", hsonLiveRoot: failedLive, hsonDemo2Root: artifactDemo, npmCli }), /H2C_COMMAND_FAILED/); checks.push("command failure rejects despite stale-looking output");
  await assert.rejects(() => stat(join(failedLive, "dist"))); checks.push("failed build cannot retain stale owned output");

  const unexpectedDemo = join(root, "artifact-unexpected-demo"); await mkdir(unexpectedDemo);
  await writeFile(join(unexpectedDemo, "package.json"), JSON.stringify({ name: "hson-demo2", version: "0.0.0", type: "module", scripts: { "build:node-production": "node build.mjs" } }));
  await writeFile(join(unexpectedDemo, "build.mjs"), `import { mkdir, writeFile } from "node:fs/promises"; await mkdir("dist-node", { recursive: true }); for (const path of ["livehost-server.mjs", "circuit-verification-worker.mjs", "unexpected.mjs"]) await writeFile("dist-node/" + path, "export {};\\n");`);
  await assert.rejects(() => run_h2c_artifact_certification({ id: "hson-demo2:build:node-production", hsonLiveRoot: validLive, hsonDemo2Root: unexpectedDemo, npmCli }), /H2C_UNEXPECTED_ARTIFACT/); checks.push("exact build tree rejects unexpected artifact");
  assert.throws(() => resolve_h2c_descriptor("hson-live:build?artifact=../../developer-dist"), /UNKNOWN_H2C_VERIFICATION_ID/); checks.push("remote artifact-path injection cannot resolve a fixed descriptor");
  check(validArtifact.artifacts.every((entry) => entry.sha256.length === 64), "artifact evidence is collected and hashed before cleanup");
  await rm(validLive, { recursive: true, force: true }); await assert.rejects(() => stat(validLive)); checks.push("artifact workspace can be removed only after evidence collection");
  console.log(JSON.stringify({ certificate: "h2-boundary", checks, total: checks.length }));
} finally { await rm(root, { recursive: true, force: true }); }
