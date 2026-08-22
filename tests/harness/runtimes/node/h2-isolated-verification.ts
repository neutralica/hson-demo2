/**
 * H2's private, paired working-tree executor.  This module deliberately has no
 * connection to the public LiveHost API: callers may select an ID only.
 */
import { createHash, randomUUID } from "node:crypto";
import { chmod, copyFile, cp, lstat, mkdir, readdir, readFile, readlink, realpath, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { create_node_process_supervisor, type NodeProcessResult } from "./node-process-supervisor";

const execFileAsync = promisify(execFile);
const H2_MARKER = "hson-h2-isolated-verification-v1";
const MAX_WORKSPACE_BYTES = 1024 * 1024 * 1024;
const OUTPUT_LIMIT_BYTES = 256 * 1024;
const STALE_AGE_MS = 6 * 60 * 60 * 1000;
/** Polling detects growth while subprocesses run.  A writer may therefore
 * overshoot by up to one polling interval plus one filesystem walk; this is a
 * bounded detection policy, not a kernel quota. */
export const H2_WORKSPACE_POLL_INTERVAL_MS = 250;

export const H2_VERIFICATION_IDS = Object.freeze([
  "hson-demo2:test:surface-enumeration-node",
  "hson-demo2:test:stage2-contracts-node",
  "hson-demo2:test:stage3-discovery-node",
  "hson-demo2:test:stage4a-selected-node",
  "hson-demo2:test:stage4b-panel-node",
  "hson-demo2:test:phase1-convergence-node",
  "hson-demo2:test:phase2a-lifecycle-node",
  "hson-demo2:test:phase2b-presentation-node",
  "hson-demo2:test:phase4a-layering-node",
  "hson-demo2:test:phase4b-retirement-node",
] as const);
export type H2VerificationId = typeof H2_VERIFICATION_IDS[number];

type Descriptor = Readonly<{
  id: H2VerificationId;
  scope: "hson-demo2";
  packageScript: H2VerificationId extends `hson-demo2:${infer Script}` ? Script : never;
  preparation: "build-hson-live";
  capabilityProfile: "source-meta";
  timeoutMs: number;
  completion: Readonly<{ kind: "stdout-marker"; marker: string }>;
  artifactPolicy: "discard";
}>;

const H2_REGISTRY: ReadonlyMap<H2VerificationId, Descriptor> = new Map(
  H2_VERIFICATION_IDS.map((id) => [id, Object.freeze({
    id,
    scope: "hson-demo2" as const,
    packageScript: id.slice("hson-demo2:".length) as Descriptor["packageScript"],
    preparation: "build-hson-live" as const,
    capabilityProfile: "source-meta" as const,
    timeoutMs: 180_000,
    completion: Object.freeze({ kind: "stdout-marker" as const, marker: id.endsWith("surface-enumeration-node")
      ? "test surface enumeration: ok"
      : id.endsWith("stage2-contracts-node") ? "Stage 2 contracts: ok" : "{" }),
    artifactPolicy: "discard" as const,
  })]),
);

export type H2SnapshotMetadata = Readonly<{
  hsonLiveHead: string;
  hsonDemo2Head: string;
  hsonLiveDirty: boolean;
  hsonDemo2Dirty: boolean;
  sourceDigest: string;
  snapshotTime: string;
  nodeVersion: string;
}>;
export type H2ExecutionResult = Readonly<{
  id: H2VerificationId;
  status: "PASS" | "FAIL";
  metadata: H2SnapshotMetadata;
  process?: NodeProcessResult;
  failureReason?: string;
  cleanup: "removed" | "quarantined";
  quarantinePath?: string;
  completion?: Readonly<{ kind: "terminal-json"; accepted: boolean; detail: string }>;
}>;
/** Test hooks are intentionally private to the H2 harness: they never cross the
 * hosted request boundary, whose input remains a fixed verification ID only. */
export type H2ExecutorTestHooks = Readonly<{
  afterCapture?(attempt: number): Promise<void> | void;
  afterMaterialization?(attempt: number): Promise<void> | void;
  beforeCleanup?(workspace: string): Promise<void> | void;
  /** Test-only seam used by hosted lifecycle certification fixtures after the
   * copied dependency graph is ready but before the verification child starts. */
  beforeExecution?(workspace: string, snapshotDemo: string): Promise<void> | void;
}>;
export type H2ExecutorOptions = Readonly<{
  hsonLiveRoot: string;
  hsonDemo2Root: string;
  tempRoot?: string;
  workspaceLimitBytes?: number;
  testHooks?: H2ExecutorTestHooks;
}>;

export type SourceManifestEntry = Readonly<{
  repository: "hson-live" | "hson-demo2";
  relativePath: string;
  byteLength: number;
  sha256: string;
  executable: boolean;
}>;
type RepositoryManifest = Readonly<{ repository: SourceManifestEntry["repository"]; root: string; head: string; dirty: boolean; entries: readonly SourceManifestEntry[] }>;

function inside(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value === "" || (!value.startsWith(`..${sep}`) && value !== "..");
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", root, ...args], { maxBuffer: 16 * 1024 * 1024 });
  return result.stdout;
}

export async function capture_h2_source_manifest(repository: SourceManifestEntry["repository"], root: string): Promise<RepositoryManifest> {
  const names = new Set<string>();
  for (const args of [["ls-files", "-z"], ["ls-files", "--others", "--exclude-standard", "-z"]] as const) {
    for (const name of (await git(root, args)).split("\0")) if (name !== "") names.add(name);
  }
  const entries: SourceManifestEntry[] = [];
  for (const path of [...names].sort()) {
    if (path.startsWith(".env") || path.includes("/.env")) continue;
    const absolute = resolve(root, path);
    if (!inside(root, absolute)) throw new Error("SOURCE_PATH_ESCAPE");
    let info;
    try { info = await lstat(absolute); } catch (error) {
      // A tracked deletion is intentionally absent from a working-tree snapshot.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error(`SOURCE_SYMLINK_REJECTED: ${path}`);
    if (!info.isFile()) continue;
    const bytes = await readFile(absolute);
    entries.push(Object.freeze({
      repository,
      relativePath: path,
      byteLength: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      executable: (info.mode & 0o111) !== 0,
    }));
  }
  const status = await git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  return Object.freeze({ repository, root, head: (await git(root, ["rev-parse", "HEAD"])).trim(), dirty: status !== "", entries: Object.freeze(entries) });
}

export function h2_paired_manifest_digest(live: RepositoryManifest, demo: RepositoryManifest): string {
  return createHash("sha256").update(JSON.stringify([live, demo].sort((a, b) => a.repository.localeCompare(b.repository)).map((manifest) => [
    manifest.repository,
    manifest.entries.map((entry) => [entry.relativePath, entry.byteLength, entry.sha256, entry.executable]),
  ]))).digest("hex");
}

/** The fixed descriptor marker is necessary but not sufficient: an explicit
 * failure completion always wins, including when the command exits zero. */
export function h2_completion_accepted(stdout: string, marker: string): boolean {
  return stdout.includes(marker)
    && !/"(?:status|result)"\s*:\s*"fail"|"pass"\s*:\s*false|"ok"\s*:\s*false/i.test(stdout);
}

async function materialize(source: RepositoryManifest, target: string): Promise<void> {
  for (const entry of source.entries) {
    const destination = resolve(target, entry.relativePath);
    if (!inside(target, destination)) throw new Error("SNAPSHOT_PATH_ESCAPE");
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(source.root, entry.relativePath), destination);
  }
}

async function verify_materialized_manifest(source: RepositoryManifest, target: string): Promise<void> {
  const expected = source.entries.map(({ repository, relativePath, byteLength, sha256, executable }) => ({ repository, relativePath, byteLength, sha256, executable }));
  const actual: SourceManifestEntry[] = [];
  for (const entry of source.entries) {
    const file = resolve(target, entry.relativePath);
    if (!inside(target, file)) throw new Error("SNAPSHOT_PATH_ESCAPE");
    const info = await lstat(file);
    if (!info.isFile()) throw new Error("MATERIALIZED_SNAPSHOT_MISMATCH");
    const bytes = await readFile(file);
    actual.push(Object.freeze({ repository: source.repository, relativePath: entry.relativePath, byteLength: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), executable: (info.mode & 0o111) !== 0 }));
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("MATERIALIZED_SNAPSHOT_MISMATCH");
}

function is_missing_path(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

/** Workspace preparation legitimately replaces directories while the monitor is
 * walking them.  A path that disappears after enumeration contributes zero;
 * other filesystem failures remain accounting failures. */
async function workspace_bytes(root: string, afterReadDirectory?: (path: string) => Promise<void> | void): Promise<number> {
  let total = 0;
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); }
  catch (error) {
    if (is_missing_path(error)) return 0;
    throw error;
  }
  await afterReadDirectory?.(root);
  for (const item of entries) {
    const path = join(root, item.name);
    if (item.isSymbolicLink()) continue;
    if (item.isDirectory()) total += await workspace_bytes(path, afterReadDirectory);
    else if (item.isFile()) {
      try { total += (await stat(path)).size; }
      catch (error) {
        if (!is_missing_path(error)) throw error;
      }
    }
  }
  return total;
}

/** Deterministic H2 boundary seam for a directory-entry disappearance race. */
export async function h2_workspace_bytes_for_tests(root: string, afterReadDirectory: (path: string) => Promise<void> | void): Promise<number> {
  return workspace_bytes(root, afterReadDirectory);
}

async function prepare_dependencies(sourceLive: string, sourceDemo: string, snapshotDemo: string, snapshotLive: string, preparedRoot: string): Promise<void> {
  const key = createHash("sha256")
    .update(await readFile(join(sourceLive, "package-lock.json")))
    .update(await readFile(join(sourceDemo, "package-lock.json")))
    .update(process.version)
    .update(await execFileAsync("npm", ["--version"]).then((result) => result.stdout.trim()))
    .update("h2-prepared-dependencies-v4")
    .digest("hex");
  const prepared = join(preparedRoot, key, "node_modules");
  try { await stat(prepared); } catch {
    const staging = join(preparedRoot, `${key}.staging-${randomUUID()}`);
    await mkdir(staging, { recursive: true });
    await cp(join(sourceDemo, "node_modules"), join(staging, "node_modules"), { recursive: true, dereference: true, filter: (path) => basename(path) !== "hson-live" });
    const copied = join(staging, "node_modules");
    const sourceBin = join(sourceDemo, "node_modules", ".bin");
    await rm(join(copied, ".bin"), { recursive: true, force: true });
    await mkdir(join(copied, ".bin"));
    for (const entry of await readdir(sourceBin)) {
      const link = await readlink(join(sourceBin, entry));
      const resolved = resolve(sourceBin, link);
      if (!inside(join(sourceDemo, "node_modules"), resolved)) throw new Error("DEPENDENCY_BIN_ESCAPE");
      await symlink(link, join(copied, ".bin", entry));
    }
    // tsx is an ESM entrypoint whose relative imports are resolved against a
    // symlinked .bin path on Node 24.  A workspace-owned launcher preserves
    // the package's real module location without pointing at developer files.
    await rm(join(copied, ".bin", "tsx"), { force: true });
    await writeFile(join(copied, ".bin", "tsx"), `#!${process.execPath}\nimport { dirname, resolve } from "node:path";\nimport { fileURLToPath, pathToFileURL } from "node:url";\nawait import(pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), "../tsx/dist/cli.mjs")).href);\n`);
    await chmod(join(copied, ".bin", "tsx"), 0o755);
    try { await rename(staging, join(preparedRoot, key)); } catch (error) {
      await rm(staging, { recursive: true, force: true });
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  await symlink(prepared, join(snapshotLive, "node_modules"), "dir");
  await cp(prepared, join(snapshotDemo, "node_modules"), { recursive: true, dereference: true });
  await symlink(snapshotLive, join(snapshotDemo, "node_modules", "hson-live"), "dir");
  const resolved = await realpath(join(snapshotDemo, "node_modules", "hson-live"));
  if (!inside(await realpath(snapshotLive), resolved)) throw new Error("DEPENDENCY_RESOLUTION_ESCAPES_SNAPSHOT");
}

function replacement_environment(workspace: string, dependencies: string): Readonly<Record<string, string>> {
  const home = join(workspace, "home");
  return Object.freeze({
    PATH: [dirname(process.execPath), join(dependencies, ".bin"), "/usr/local/bin", "/usr/bin", "/bin"].join(":"),
    HOME: home,
    TMPDIR: join(workspace, "tmp"),
    XDG_CACHE_HOME: join(home, ".cache"),
    npm_config_cache: join(home, ".npm"),
    CI: "true", FORCE_COLOR: "0", NO_COLOR: "1", HSON_HOSTED_VERIFICATION_DEPTH: "1",
  });
}

function supported_node(): boolean {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major !== undefined && minor !== undefined && (major > 22 || (major === 22 && minor >= 12)) && major < 25;
}

async function npm_cli_path(): Promise<string> {
  const root = (await execFileAsync("npm", ["root", "-g"])).stdout.trim();
  const candidate = join(root, "npm", "bin", "npm-cli.js");
  if (!(await stat(candidate)).isFile()) throw new Error("H2_NPM_CLI_UNAVAILABLE");
  return candidate;
}

export function resolve_h2_verification(id: string): Descriptor {
  const descriptor = H2_REGISTRY.get(id as H2VerificationId);
  if (descriptor === undefined) throw new Error(`UNKNOWN_H2_VERIFICATION_ID: ${id}`);
  return descriptor;
}

export async function sweep_stale_h2_workspaces(tempRoot = join(tmpdir(), "hson-h2")): Promise<void> {
  try {
    for (const entry of await readdir(tempRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("run-")) continue;
      const root = join(tempRoot, entry.name);
      try {
        const marker = JSON.parse(await readFile(join(root, "marker.json"), "utf8")) as { owner?: unknown; createdAt?: unknown };
        if (marker.owner === H2_MARKER && typeof marker.createdAt === "string" && Date.now() - Date.parse(marker.createdAt) > STALE_AGE_MS) await rm(root, { recursive: true, force: true });
      } catch { /* unmarked or malformed directories are never owned by this sweep */ }
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}

/** Only an executor-created run directory may be retained as quarantine. */
export function h2_owned_quarantine_path(tempRoot: string, workspace: string): string | undefined {
  const root = resolve(tempRoot);
  const candidate = resolve(workspace);
  return inside(root, candidate) && basename(candidate).startsWith("run-") ? candidate : undefined;
}

export async function execute_h2_verification(options: H2ExecutorOptions, requestedId: string, signal?: AbortSignal): Promise<H2ExecutionResult> {
  if (process.env.HSON_HOSTED_VERIFICATION_DEPTH !== undefined) throw new Error("H2_NESTED_VERIFICATION_FORBIDDEN");
  if (!supported_node()) throw new Error(`UNSUPPORTED_H2_NODE: ${process.version}`);
  const descriptor = resolve_h2_verification(requestedId);
  const tempRoot = options.tempRoot ?? join(tmpdir(), "hson-h2");
  await sweep_stale_h2_workspaces(tempRoot);
  await mkdir(tempRoot, { recursive: true });
  const workspace = join(tempRoot, `run-${randomUUID()}`);
  let metadata: H2SnapshotMetadata | undefined;
  let processResult: NodeProcessResult | undefined;
  let failureReason: string | undefined;
  let cleanup: H2ExecutionResult["cleanup"] = "removed";
  let quarantinePath: string | undefined;
  let completion: H2ExecutionResult["completion"] | undefined;
  let diskTimer: ReturnType<typeof setInterval> | undefined;
  try {
    await mkdir(join(workspace, "root"), { recursive: true });
    await Promise.all([mkdir(join(workspace, "home"), { recursive: true }), mkdir(join(workspace, "tmp"), { recursive: true })]);
    await writeFile(join(workspace, "marker.json"), JSON.stringify({ owner: H2_MARKER, createdAt: new Date().toISOString() }));
    const workspaceLimit = options.workspaceLimitBytes ?? MAX_WORKSPACE_BYTES;
    let workspaceLimitExceeded = false;
    let workspaceScanFailed = false;
    let scanning = false;
    let activeExecution: Readonly<{ terminate(): void }> | undefined;
    const scan = async (): Promise<void> => {
      if (scanning) return;
      scanning = true;
      try {
        if ((await workspace_bytes(workspace)) > workspaceLimit) {
          workspaceLimitExceeded = true;
          activeExecution?.terminate();
        }
      } catch {
        workspaceScanFailed = true;
        activeExecution?.terminate();
      } finally { scanning = false; }
    };
    // This begins before snapshot preparation and remains active through child
    // verification, so every executor-owned write shares one budget.
    diskTimer = setInterval(() => { void scan(); }, H2_WORKSPACE_POLL_INTERVAL_MS);
    await scan();
    let live: RepositoryManifest | undefined;
    let demo: RepositoryManifest | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      live = await capture_h2_source_manifest("hson-live", options.hsonLiveRoot); demo = await capture_h2_source_manifest("hson-demo2", options.hsonDemo2Root);
      await options.testHooks?.afterCapture?.(attempt);
      await materialize(live, join(workspace, "root", "hson-live"));
      await materialize(demo, join(workspace, "root", "hson-demo2"));
      await scan();
      if (workspaceLimitExceeded) throw new Error("WORKSPACE_LIMIT_EXCEEDED");
      if (workspaceScanFailed) throw new Error("WORKSPACE_ACCOUNTING_FAILED");
      await options.testHooks?.afterMaterialization?.(attempt);
      await verify_materialized_manifest(live, join(workspace, "root", "hson-live"));
      await verify_materialized_manifest(demo, join(workspace, "root", "hson-demo2"));
      const afterLive = await capture_h2_source_manifest("hson-live", options.hsonLiveRoot); const afterDemo = await capture_h2_source_manifest("hson-demo2", options.hsonDemo2Root);
      if (h2_paired_manifest_digest(live, demo) === h2_paired_manifest_digest(afterLive, afterDemo)) break;
      if (attempt === 1) throw new Error("SOURCE_CHANGED_DURING_SNAPSHOT");
      await rm(join(workspace, "root"), { recursive: true, force: true }); await mkdir(join(workspace, "root"), { recursive: true });
    }
    if (live === undefined || demo === undefined) throw new Error("SNAPSHOT_MANIFEST_UNAVAILABLE");
    metadata = Object.freeze({ hsonLiveHead: live.head, hsonDemo2Head: demo.head, hsonLiveDirty: live.dirty, hsonDemo2Dirty: demo.dirty, sourceDigest: h2_paired_manifest_digest(live, demo), snapshotTime: new Date().toISOString(), nodeVersion: process.version });
    const snapshotLive = join(workspace, "root", "hson-live"); const snapshotDemo = join(workspace, "root", "hson-demo2");
    const preparedRoot = join(tempRoot, "prepared-dependencies");
    await prepare_dependencies(options.hsonLiveRoot, options.hsonDemo2Root, snapshotDemo, snapshotLive, preparedRoot);
    await scan();
    if (workspaceLimitExceeded) throw new Error("WORKSPACE_LIMIT_EXCEEDED");
    if (workspaceScanFailed) throw new Error("WORKSPACE_ACCOUNTING_FAILED");
    const dependencies = join(snapshotDemo, "node_modules");
    await options.testHooks?.beforeExecution?.(workspace, snapshotDemo);
    const supervisor = create_node_process_supervisor({ stdoutLimitBytes: OUTPUT_LIMIT_BYTES, stderrLimitBytes: OUTPUT_LIMIT_BYTES, truncationMarker: "<H2_OUTPUT_TRUNCATED>", terminationGraceMs: 1_000, environmentMode: "replace" });
    const npmCli = await npm_cli_path();
    // This is executor-owned preparation: it builds only the copied library
    // snapshot so the existing package export contract remains authoritative.
    const preparation = supervisor.start({
      cwd: snapshotLive,
      command: process.execPath,
      args: Object.freeze([npmCli, "run", "build"]),
      environment: replacement_environment(workspace, dependencies),
      timeoutMs: descriptor.timeoutMs,
    }, signal === undefined ? {} : { signal });
    activeExecution = preparation;
    if (workspaceLimitExceeded || workspaceScanFailed) preparation.terminate();
    const preparationResult = await preparation.result;
    await scan();
    if (workspaceLimitExceeded) {
      failureReason = "WORKSPACE_LIMIT_EXCEEDED";
      processResult = preparationResult;
    } else if (workspaceScanFailed) {
      failureReason = "WORKSPACE_ACCOUNTING_FAILED";
      processResult = preparationResult;
    } else if (!preparationResult.ok || preparationResult.outputLimitExceeded) {
      failureReason = preparationResult.outputLimitExceeded
        ? "OUTPUT_LIMIT_EXCEEDED"
        : preparationResult.timedOut ? "PREPARATION_TIMEOUT" : preparationResult.cancelled ? "CANCELLED" : "PREPARATION_FAILED";
      processResult = preparationResult;
    } else {
      const execution = supervisor.start(
        { cwd: snapshotDemo, command: process.execPath, args: Object.freeze([npmCli, "run", descriptor.packageScript]), environment: replacement_environment(workspace, dependencies), timeoutMs: descriptor.timeoutMs },
        signal === undefined ? {} : { signal },
      );
      activeExecution = execution;
      if (workspaceLimitExceeded || workspaceScanFailed) execution.terminate();
      processResult = await execution.result;
      await scan();
      if (workspaceLimitExceeded) failureReason = "WORKSPACE_LIMIT_EXCEEDED";
      else if (workspaceScanFailed) failureReason = "WORKSPACE_ACCOUNTING_FAILED";
      else if (processResult.outputLimitExceeded) failureReason = "OUTPUT_LIMIT_EXCEEDED";
      else if (!processResult.ok) failureReason = processResult.timedOut ? "TIMEOUT" : processResult.cancelled ? "CANCELLED" : "PROCESS_FAILED";
      else if (workspaceLimitExceeded) failureReason = "WORKSPACE_LIMIT_EXCEEDED";
      else {
        const accepted = h2_completion_accepted(processResult.stdout, descriptor.completion.marker);
        completion = Object.freeze({ kind: "terminal-json", accepted, detail: descriptor.completion.marker });
        if (!accepted) failureReason = "COMPLETION_REJECTED";
      }
    }
  } catch (error) { failureReason = error instanceof Error ? error.message : "H2_SETUP_FAILED"; }
  finally { if (diskTimer !== undefined) clearInterval(diskTimer); }
  try { await options.testHooks?.beforeCleanup?.(workspace); await rm(workspace, { recursive: true, force: true }); } catch {
    cleanup = "quarantined";
    quarantinePath = h2_owned_quarantine_path(tempRoot, workspace);
    failureReason ??= "WORKSPACE_CLEANUP_FAILED";
  }
  if (metadata === undefined) {
    metadata = Object.freeze({ hsonLiveHead: "", hsonDemo2Head: "", hsonLiveDirty: false, hsonDemo2Dirty: false, sourceDigest: "", snapshotTime: new Date().toISOString(), nodeVersion: process.version });
  }
  return Object.freeze({ id: descriptor.id, status: failureReason === undefined && cleanup === "removed" ? "PASS" : "FAIL", metadata, ...(processResult === undefined ? {} : { process: processResult }), ...(failureReason === undefined ? {} : { failureReason }), cleanup, ...(quarantinePath === undefined ? {} : { quarantinePath }), ...(completion === undefined ? {} : { completion }) });
}
