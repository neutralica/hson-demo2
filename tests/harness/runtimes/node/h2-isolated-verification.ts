/**
 * H2's private, paired working-tree executor.  This module deliberately has no
 * connection to the public LiveHost API: callers may select an ID only.
 */
import { createHash, randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
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
  completion: Readonly<{ kind: "exit-and-artifacts" }>;
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
    completion: Object.freeze({ kind: "exit-and-artifacts" as const }),
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
}>;
export type H2ExecutorOptions = Readonly<{ hsonLiveRoot: string; hsonDemo2Root: string; tempRoot?: string }>;

type ManifestEntry = Readonly<{ path: string; digest: string; mode: number }>;
type RepositoryManifest = Readonly<{ root: string; head: string; dirty: boolean; entries: readonly ManifestEntry[] }>;

function inside(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value === "" || (!value.startsWith(`..${sep}`) && value !== "..");
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", root, ...args], { maxBuffer: 16 * 1024 * 1024 });
  return result.stdout;
}

async function manifest(root: string): Promise<RepositoryManifest> {
  const names = new Set<string>();
  for (const args of [["ls-files", "-z"], ["ls-files", "--others", "--exclude-standard", "-z"]] as const) {
    for (const name of (await git(root, args)).split("\0")) if (name !== "") names.add(name);
  }
  const entries: ManifestEntry[] = [];
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
    entries.push(Object.freeze({ path, digest: createHash("sha256").update(await readFile(absolute)).digest("hex"), mode: info.mode }));
  }
  const status = await git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  return Object.freeze({ root, head: (await git(root, ["rev-parse", "HEAD"])).trim(), dirty: status !== "", entries: Object.freeze(entries) });
}

function paired_digest(live: RepositoryManifest, demo: RepositoryManifest): string {
  return createHash("sha256").update(JSON.stringify([
    ["hson-live", live.entries.map((entry) => [entry.path, entry.digest, entry.mode])],
    ["hson-demo2", demo.entries.map((entry) => [entry.path, entry.digest, entry.mode])],
  ])).digest("hex");
}

async function materialize(source: RepositoryManifest, target: string): Promise<void> {
  for (const entry of source.entries) {
    const destination = resolve(target, entry.path);
    if (!inside(target, destination)) throw new Error("SNAPSHOT_PATH_ESCAPE");
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(source.root, entry.path), destination);
  }
}

async function workspace_bytes(root: string): Promise<number> {
  let total = 0;
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = join(root, item.name);
    if (item.isSymbolicLink()) continue;
    if (item.isDirectory()) total += await workspace_bytes(path);
    else if (item.isFile()) total += (await stat(path)).size;
  }
  return total;
}

async function prepare_dependencies(sourceDemo: string, snapshotDemo: string, snapshotLive: string, preparedRoot: string): Promise<void> {
  const key = createHash("sha256").update(await readFile(join(sourceDemo, "package-lock.json"))).update(process.version).digest("hex");
  const prepared = join(preparedRoot, key, "node_modules");
  await mkdir(prepared, { recursive: true });
  for (const entry of await readdir(join(sourceDemo, "node_modules"), { withFileTypes: true })) {
    if (entry.name === "hson-live") continue;
    const source = join(sourceDemo, "node_modules", entry.name);
    const destination = join(prepared, entry.name);
    try { await symlink(source, destination, entry.isDirectory() ? "dir" : "file"); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  await symlink(prepared, join(snapshotDemo, "node_modules"), "dir");
  await symlink(prepared, join(snapshotLive, "node_modules"), "dir");
  // This link is per snapshot; the remaining prepared dependency links are
  // keyed by lockfile + Node and never point at either source repository.
  await rm(join(prepared, "hson-live"), { force: true });
  await symlink(snapshotLive, join(prepared, "hson-live"), "dir");
  const resolved = await realpath(join(snapshotDemo, "node_modules", "hson-live"));
  if (!inside(await realpath(snapshotLive), resolved)) throw new Error("DEPENDENCY_RESOLUTION_ESCAPES_SNAPSHOT");
}

function replacement_environment(workspace: string, dependencies: string): Readonly<Record<string, string>> {
  const home = join(workspace, "home");
  return Object.freeze({
    PATH: [dirname(process.execPath), join(dependencies, ".bin"), "/usr/bin", "/bin"].join(":"),
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
  try {
    await mkdir(join(workspace, "root"), { recursive: true });
    await Promise.all([mkdir(join(workspace, "home"), { recursive: true }), mkdir(join(workspace, "tmp"), { recursive: true })]);
    await writeFile(join(workspace, "marker.json"), JSON.stringify({ owner: H2_MARKER, createdAt: new Date().toISOString() }));
    let live: RepositoryManifest | undefined;
    let demo: RepositoryManifest | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      live = await manifest(options.hsonLiveRoot); demo = await manifest(options.hsonDemo2Root);
      await materialize(live, join(workspace, "root", "hson-live"));
      await materialize(demo, join(workspace, "root", "hson-demo2"));
      const afterLive = await manifest(options.hsonLiveRoot); const afterDemo = await manifest(options.hsonDemo2Root);
      if (paired_digest(live, demo) === paired_digest(afterLive, afterDemo)) break;
      if (attempt === 1) throw new Error("SOURCE_CHANGED_DURING_SNAPSHOT");
      await rm(join(workspace, "root"), { recursive: true, force: true }); await mkdir(join(workspace, "root"), { recursive: true });
    }
    if (live === undefined || demo === undefined) throw new Error("SNAPSHOT_MANIFEST_UNAVAILABLE");
    metadata = Object.freeze({ hsonLiveHead: live.head, hsonDemo2Head: demo.head, hsonLiveDirty: live.dirty, hsonDemo2Dirty: demo.dirty, sourceDigest: paired_digest(live, demo), snapshotTime: new Date().toISOString(), nodeVersion: process.version });
    const snapshotLive = join(workspace, "root", "hson-live"); const snapshotDemo = join(workspace, "root", "hson-demo2");
    const preparedRoot = join(tempRoot, "prepared-dependencies");
    await prepare_dependencies(options.hsonDemo2Root, snapshotDemo, snapshotLive, preparedRoot);
    const dependencies = join(snapshotDemo, "node_modules");
    const supervisor = create_node_process_supervisor({ stdoutLimitBytes: OUTPUT_LIMIT_BYTES, stderrLimitBytes: OUTPUT_LIMIT_BYTES, truncationMarker: "<H2_OUTPUT_TRUNCATED>", terminationGraceMs: 1_000, environmentMode: "replace" });
    const npmCli = join(dirname(dirname(process.execPath)), "lib", "node_modules", "npm", "bin", "npm-cli.js");
    // This is executor-owned preparation: it builds only the copied library
    // snapshot so the existing package export contract remains authoritative.
    const preparation = supervisor.start({
      cwd: snapshotLive,
      command: process.execPath,
      args: Object.freeze([npmCli, "run", "build"]),
      environment: replacement_environment(workspace, dependencies),
      timeoutMs: descriptor.timeoutMs,
    }, signal === undefined ? {} : { signal });
    const preparationResult = await preparation.result;
    if (!preparationResult.ok || preparationResult.stdoutTruncated || preparationResult.stderrTruncated) {
      failureReason = preparationResult.stdoutTruncated || preparationResult.stderrTruncated
        ? "OUTPUT_LIMIT_EXCEEDED"
        : preparationResult.timedOut ? "PREPARATION_TIMEOUT" : preparationResult.cancelled ? "CANCELLED" : "PREPARATION_FAILED";
      processResult = preparationResult;
    } else {
      const execution = supervisor.start(
        { cwd: snapshotDemo, command: process.execPath, args: Object.freeze([npmCli, "run", descriptor.packageScript]), environment: replacement_environment(workspace, dependencies), timeoutMs: descriptor.timeoutMs },
        signal === undefined ? {} : { signal },
      );
      const diskTimer = setInterval(() => { void workspace_bytes(workspace).then((bytes) => { if (bytes > MAX_WORKSPACE_BYTES) execution.terminate(); }); }, 250);
      processResult = await execution.result; clearInterval(diskTimer);
      if (processResult.stdoutTruncated || processResult.stderrTruncated) failureReason = "OUTPUT_LIMIT_EXCEEDED";
      else if (!processResult.ok) failureReason = processResult.timedOut ? "TIMEOUT" : processResult.cancelled ? "CANCELLED" : "PROCESS_FAILED";
      else if ((await workspace_bytes(workspace)) > MAX_WORKSPACE_BYTES) failureReason = "WORKSPACE_LIMIT_EXCEEDED";
    }
  } catch (error) { failureReason = error instanceof Error ? error.message : "H2_SETUP_FAILED"; }
  try { await rm(workspace, { recursive: true, force: true }); } catch { cleanup = "quarantined"; failureReason ??= "WORKSPACE_CLEANUP_FAILED"; }
  if (metadata === undefined) {
    metadata = Object.freeze({ hsonLiveHead: "", hsonDemo2Head: "", hsonLiveDirty: false, hsonDemo2Dirty: false, sourceDigest: "", snapshotTime: new Date().toISOString(), nodeVersion: process.version });
  }
  return Object.freeze({ id: descriptor.id, status: failureReason === undefined && cleanup === "removed" ? "PASS" : "FAIL", metadata, ...(processResult === undefined ? {} : { process: processResult }), ...(failureReason === undefined ? {} : { failureReason }), cleanup });
}
