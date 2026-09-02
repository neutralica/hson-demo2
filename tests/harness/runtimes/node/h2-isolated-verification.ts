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
import { H2C_VERIFICATION_IDS, clean_h2c_owned_outputs, h2c_certificate_valid, resolve_h2c_descriptor } from "./h2-artifact-certification";
import type { H2CChildModule } from "../../../runners/harness/h2-artifact-certification-child.node.mts";

const execFileAsync = promisify(execFile);
const H2_MARKER = "hson-h2-isolated-verification-v1";
const MAX_WORKSPACE_BYTES = 1024 * 1024 * 1024;
const OUTPUT_LIMIT_BYTES = 256 * 1024;
const STALE_AGE_MS = 6 * 60 * 60 * 1000;
const PREPARED_DEPENDENCIES_SCHEMA = "hson-h2-prepared-dependencies-v1";
const PREPARED_DEPENDENCIES_MARKER = ".h2-prepared-dependencies.json";
const H2C_CHILD_RELATIVE_PATH: H2CChildModule extends true ? string : never = "tests/runners/harness/h2-artifact-certification-child.node.mts";
/** Polling detects growth while subprocesses run.  A writer may therefore
 * overshoot by up to one polling interval plus one filesystem walk; this is a
 * bounded detection policy, not a kernel quota. */
export const H2_WORKSPACE_POLL_INTERVAL_MS = 250;

export const H2B_VERIFICATION_IDS = Object.freeze([
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
export const H2D_VERIFICATION_IDS = Object.freeze([
  "hson-demo2:test:stage5a-corpus-node",
  "hson-demo2:test:phase6a-node-hosted",
  "hson-demo2:test:phase6a-full-node-hosted",
  "hson-demo2:test:phase6b-browser-executor",
  "hson-demo2:test:phase6b-browser-cancellation",
  "hson-demo2:test:phase6b-mixed-run",
  "hson-demo2:test:phase6b-full-browser-hosted",
] as const);
export const H2_VERIFICATION_IDS = Object.freeze([...H2B_VERIFICATION_IDS, ...H2C_VERIFICATION_IDS, ...H2D_VERIFICATION_IDS] as const);
export type H2VerificationId = typeof H2_VERIFICATION_IDS[number];

type Descriptor = Readonly<{
  id: H2VerificationId;
  scope: "hson-live" | "hson-demo2";
  packageScript: string;
  preparation: "build-hson-live";
  capabilityProfile: "source-meta" | "artifact" | "aggregate-node" | "hosted-node" | "browser-chromium" | "mixed-node-browser";
  timeoutMs: number;
  completion: Readonly<{ kind: "stdout-marker"; marker: string }> | Readonly<{ kind: "terminal-json"; certificate: string }>;
  artifactPolicy: "discard";
  execution: "package-script" | "h2c-wrapper";
}>;

const H2B_TERMINAL_CERTIFICATES: Readonly<Record<string, string>> = Object.freeze({
  "hson-demo2:test:stage3-discovery-node": "stage-3-discovery",
  "hson-demo2:test:stage4a-selected-node": "stage-4a-selected",
  "hson-demo2:test:stage4b-panel-node": "stage-4b-panel",
  "hson-demo2:test:phase1-convergence-node": "phase1-convergence",
  "hson-demo2:test:phase2a-lifecycle-node": "phase2a-lifecycle",
  "hson-demo2:test:phase2b-presentation-node": "phase2b-presentation",
  "hson-demo2:test:phase4a-layering-node": "phase-4a-layering",
  "hson-demo2:test:phase4b-retirement-node": "phase4b-retirement",
});

function h2b_terminal_certificate(id: string): string {
  const certificate = H2B_TERMINAL_CERTIFICATES[id];
  if (certificate === undefined) throw new Error(`H2B_DESCRIPTOR_CERTIFICATE_MISSING: ${id}`);
  return certificate;
}

const H2_REGISTRY: ReadonlyMap<H2VerificationId, Descriptor> = new Map(
  [
  ...H2B_VERIFICATION_IDS.map((id): readonly [H2VerificationId, Descriptor] => [id, Object.freeze({
    id,
    scope: "hson-demo2" as const,
    packageScript: id.slice("hson-demo2:".length) as Descriptor["packageScript"],
    preparation: "build-hson-live" as const,
    capabilityProfile: "source-meta" as const,
    timeoutMs: 180_000,
    completion: id.endsWith("stage2-contracts-node")
        ? Object.freeze({ kind: "stdout-marker" as const, marker: "Stage 2 contracts: ok" })
        : Object.freeze({ kind: "terminal-json" as const, certificate: h2b_terminal_certificate(id) }),
    artifactPolicy: "discard" as const,
    execution: "package-script" as const,
  })]),
  ...H2C_VERIFICATION_IDS.map((id): readonly [H2VerificationId, Descriptor] => {
    const artifact = resolve_h2c_descriptor(id);
    return [id, Object.freeze({
      id,
      scope: artifact.repository,
      packageScript: artifact.script,
      preparation: "build-hson-live" as const,
      capabilityProfile: "artifact" as const,
      timeoutMs: 180_000,
      completion: Object.freeze({ kind: "terminal-json" as const, certificate: id }),
      artifactPolicy: "discard" as const,
    execution: "h2c-wrapper" as const,
    })];
  }),
  ...H2D_VERIFICATION_IDS.map((id): readonly [H2VerificationId, Descriptor] => [id, Object.freeze({
    id,
    scope: "hson-demo2" as const,
    packageScript: id.slice("hson-demo2:".length) as Descriptor["packageScript"],
    preparation: "build-hson-live" as const,
    capabilityProfile: id.endsWith("stage5a-corpus-node") ? "aggregate-node" as const
      : id.endsWith("phase6a-node-hosted") || id.endsWith("phase6a-full-node-hosted") ? "hosted-node" as const
        : id.endsWith("mixed-run") ? "mixed-node-browser" as const : "browser-chromium" as const,
    timeoutMs: id.endsWith("full-browser-hosted") ? 600_000 : 300_000,
    completion: Object.freeze({
      kind: "terminal-json" as const,
      certificate: id.endsWith("stage5a-corpus-node") ? "stage5a-corpus" : id.slice("hson-demo2:test:".length),
    }),
    artifactPolicy: "discard" as const,
    execution: "package-script" as const,
  })]),
  ],
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
  workspacePeakBytes: number;
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
  /** Deterministic test-only barrier immediately before an immutable dependency
   * candidate is published to its content-addressed final path. */
  beforeDependencyPublication?(key: string, staging: string, prepared: string): Promise<void> | void;
  /** Test-only filesystem fault seam; production always uses node:fs rename. */
  publishDependencyCandidate?(staging: string, prepared: string): Promise<void>;
  afterDependencyPreparation?(prepared: string): Promise<void> | void;
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

/** A terminal JSON certificate is authoritative only when the final non-empty
 * stdout record is the expected, successful certificate for this fixed ID. */
export function h2_terminal_json_completion_accepted(stdout: string, certificate: string): boolean {
  const line = stdout.trimEnd().split("\n").at(-1);
  if (line === undefined || line === "") return false;
  let value: unknown;
  try { value = JSON.parse(line); } catch { return false; }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.certificate !== certificate) return false;
  if (record.status === "fail" || record.result === "fail" || record.pass === false || record.ok === false) return false;
  if (H2C_VERIFICATION_IDS.includes(certificate as typeof H2C_VERIFICATION_IDS[number])) return h2c_certificate_valid(record, certificate);
  return TERMINAL_CERTIFICATE_VALIDATORS[certificate]?.(record) === true;
}

/** Fields are taken from each runner's existing final JSON record.  This is
 * deliberately an internal fixed-ID contract, not caller-supplied schema. */
const is_record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const is_string_array = (value: unknown): boolean => Array.isArray(value) && value.every((item) => typeof item === "string");
const is_check_count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const TERMINAL_CERTIFICATE_VALIDATORS: Readonly<Record<string, (record: Record<string, unknown>) => boolean>> = Object.freeze({
  "stage-3-discovery": (r) => is_record(r.node) && is_record(r.worker),
  "stage-4a-selected": (r) => typeof r.selectionId === "string" && is_record(r.node) && is_record(r.worker) && typeof r.opaqueId === "string",
  "stage-4b-panel": (r) => is_string_array(r.selectors) && [r.all, r.unit, r.dev, r.overlap, r.reflect].every((value) => typeof value === "number"),
  "phase1-convergence": (r) => is_record(r.counts) && is_string_array(r.initialOrder) && is_string_array(r.hostileCompletion) && is_string_array(r.finalOrder),
  "phase2a-lifecycle": (r) => r.suite === "phase2a-lifecycle" && is_check_count(r.checks) && is_string_array(r.order) && is_string_array(r.executors),
  "phase2b-presentation": (r) => r.suite === "phase2b-presentation" && is_check_count(r.checks) && is_string_array(r.groups) && typeof r.suites === "number",
  "phase-4a-layering": (r) => is_check_count(r.checks) && typeof r.appFiles === "number" && typeof r.reachableSourceFiles === "number",
  "phase4b-retirement": (r) => is_check_count(r.checks) && typeof r.canonicalId === "string" && typeof r.opaqueId === "string" && is_string_array(r.selectors),
  "stage5a-corpus": (r) => is_record(r.node) && is_record(r.worker) && is_record(r.taxonomy) && is_record(r.executionContexts),
  "phase6a-node-hosted": (r) => typeof r.canonicalRunId === "string" && typeof r.opaqueChecks === "number" && r.cleanShutdown === true,
  "phase6a-full-node-hosted": (r) => typeof r.selectedSurfaces === "number" && typeof r.canonicalCases === "number" && r.browserLaunches === 0 && r.failures === 0,
  "phase6b-browser-executor": (r) => r.executorId === "local-playwright-chromium" && is_record(r.metrics) && r.metrics.activeProcesses === 0 && r.metrics.maximumActiveProcesses === 1,
  "phase6b-browser-cancellation": (r) => r.cancellationAccepted === true && is_record(r.metrics) && r.metrics.activeProcesses === 0 && r.metrics.activeJourneys === 0,
  "phase6b-mixed-run": (r) => r.oneRunPlan === true && r.oneReportAuthority === true && is_record(r.browserMetrics) && r.browserMetrics.activeProcesses === 0,
  "phase6b-full-browser-hosted": (r) => r.failures === 0 && is_record(r.metrics) && r.metrics.activeProcesses === 0 && r.metrics.activeJourneys === 0 && r.metrics.maximumActiveProcesses === 1,
});

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

async function prepare_snapshot_repository(root: string): Promise<void> {
  await execFileAsync("git", ["-C", root, "init", "-q"]);
  await execFileAsync("git", ["-C", root, "add", "--all"]);
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

async function require_valid_prepared_dependencies(prepared: string, key: string): Promise<boolean> {
  let preparedInfo;
  try { preparedInfo = await stat(prepared); }
  catch (error) {
    if (is_missing_path(error)) return false;
    throw error;
  }
  if (!preparedInfo.isDirectory()) throw new Error(`H2_PREPARED_DEPENDENCIES_INVALID: ${key}`);
  let markerBytes: string;
  try { markerBytes = await readFile(join(prepared, PREPARED_DEPENDENCIES_MARKER), "utf8"); }
  catch (error) {
    if (is_missing_path(error)) throw new Error(`H2_PREPARED_DEPENDENCIES_INVALID: ${key}`);
    throw error;
  }
  let marker: unknown;
  try { marker = JSON.parse(markerBytes); }
  catch { throw new Error(`H2_PREPARED_DEPENDENCIES_INVALID: ${key}`); }
  if (typeof marker !== "object" || marker === null || Array.isArray(marker)
    || (marker as Record<string, unknown>).schema !== PREPARED_DEPENDENCIES_SCHEMA
    || (marker as Record<string, unknown>).key !== key) {
    throw new Error(`H2_PREPARED_DEPENDENCIES_INVALID: ${key}`);
  }
  let dependenciesInfo;
  try { dependenciesInfo = await stat(join(prepared, "node_modules")); }
  catch (error) {
    if (is_missing_path(error)) throw new Error(`H2_PREPARED_DEPENDENCIES_INVALID: ${key}`);
    throw error;
  }
  if (!dependenciesInfo.isDirectory()) throw new Error(`H2_PREPARED_DEPENDENCIES_INVALID: ${key}`);
  return true;
}

function is_concurrent_directory_publication(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === "EEXIST" || code === "ENOTEMPTY";
}

async function publish_prepared_dependencies(
  staging: string,
  prepared: string,
  key: string,
  publish: (staging: string, prepared: string) => Promise<void>,
): Promise<void> {
  await require_valid_prepared_dependencies(staging, key);
  try { await publish(staging, prepared); }
  catch (error) {
    if (!is_concurrent_directory_publication(error)) throw error;
    if (!await require_valid_prepared_dependencies(prepared, key)) throw error;
  }
}

async function npm_dependency_root(packageRoot: string): Promise<string> {
  const root = resolve((await execFileAsync("npm", ["root"], { cwd: packageRoot })).stdout.trim());
  if ((await stat(root).catch(() => undefined))?.isDirectory() !== true) {
    throw new Error(`H2_DEPENDENCY_ROOT_UNAVAILABLE: ${packageRoot}`);
  }
  return root;
}

async function installed_dependency(packageRoot: string, name: string): Promise<string | undefined> {
  let current = resolve(packageRoot);
  while (true) {
    const candidate = join(current, "node_modules", name);
    if ((await stat(candidate).catch(() => undefined))?.isDirectory() === true) return candidate;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function locked_top_level_dependencies(lock: unknown): readonly string[] {
  if (typeof lock !== "object" || lock === null || Array.isArray(lock)) throw new Error("H2_DEMO_DEPENDENCY_LOCK_INVALID");
  const packages = (lock as { packages?: unknown }).packages;
  if (typeof packages !== "object" || packages === null || Array.isArray(packages)) throw new Error("H2_DEMO_DEPENDENCY_LOCK_INVALID");
  const names = new Set<string>();
  for (const path of Object.keys(packages)) {
    const match = /^node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(path);
    if (match?.[1] !== undefined && match[1] !== "hson-live") names.add(match[1]);
  }
  return Object.freeze([...names].sort());
}

async function prepare_dependencies(sourceLive: string, sourceDemo: string, snapshotDemo: string, snapshotLive: string, preparedRoot: string, testHooks?: H2ExecutorTestHooks): Promise<void> {
  const demoDependencies = await npm_dependency_root(sourceDemo);
  const demoLockBytes = await readFile(join(sourceDemo, "package-lock.json"));
  const demoDependencyNames = locked_top_level_dependencies(JSON.parse(demoLockBytes.toString("utf8")));
  const key = createHash("sha256")
    .update(await readFile(join(sourceLive, "package-lock.json")))
    .update(demoLockBytes)
    .update(await readFile(join(dirname(demoDependencies), "package-lock.json")))
    .update(process.version)
    .update(await execFileAsync("npm", ["--version"]).then((result) => result.stdout.trim()))
    .update("h2-prepared-dependencies-v8")
    .digest("hex");
  const preparedDirectory = join(preparedRoot, key);
  const prepared = join(preparedDirectory, "node_modules");
  if (!await require_valid_prepared_dependencies(preparedDirectory, key)) {
    const staging = join(preparedRoot, `${key}.staging-${randomUUID()}`);
    try {
      const copied = join(staging, "node_modules");
      await mkdir(copied, { recursive: true });
      for (const name of demoDependencyNames) {
        const source = await installed_dependency(sourceDemo, name);
        // Platform-specific optional packages may be present in the lock but
        // absent from this installation.  Parent-local nested packages travel
        // with their installed parent package.
        if (source === undefined) continue;
        const target = join(copied, name);
        await mkdir(dirname(target), { recursive: true });
        await cp(source, target, {
          recursive: true,
          dereference: true,
          filter: (path) => basename(path) !== ".bin",
        });
      }
      const sourceBin = join(demoDependencies, ".bin");
      await rm(join(copied, ".bin"), { recursive: true, force: true });
      await mkdir(join(copied, ".bin"));
      for (const entry of await readdir(sourceBin)) {
        const link = await readlink(join(sourceBin, entry));
        const resolved = resolve(sourceBin, link);
        if (!inside(demoDependencies, resolved)) throw new Error("DEPENDENCY_BIN_ESCAPE");
        await symlink(link, join(copied, ".bin", entry));
      }
      // tsx is an ESM entrypoint whose relative imports are resolved against a
      // symlinked .bin path on Node 24.  A workspace-owned launcher preserves
      // the package's real module location without pointing at developer files.
      await rm(join(copied, ".bin", "tsx"), { force: true });
      await writeFile(join(copied, ".bin", "tsx"), `#!${process.execPath}\nimport { dirname, resolve } from "node:path";\nimport { fileURLToPath, pathToFileURL } from "node:url";\nawait import(pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), "../tsx/dist/cli.mjs")).href);\n`);
      await chmod(join(copied, ".bin", "tsx"), 0o755);
      await writeFile(join(staging, PREPARED_DEPENDENCIES_MARKER), `${JSON.stringify({ schema: PREPARED_DEPENDENCIES_SCHEMA, key })}\n`, { flag: "wx" });
      await testHooks?.beforeDependencyPublication?.(key, staging, preparedDirectory);
      await publish_prepared_dependencies(staging, preparedDirectory, key, testHooks?.publishDependencyCandidate ?? rename);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
  await testHooks?.afterDependencyPreparation?.(preparedDirectory);
  // The prepared tree is a reusable template only.  Every verification gets
  // one writable copy.  The paired library uses that same run-owned tree so a
  // run does not spend its 1 GiB budget on two identical dependency graphs.
  // Bin links may target the paired hson-live package, which is intentionally
  // absent from the reusable dependency template and linked into the run only
  // after this copy.  Clone package contents first, then restore the bin links
  // below without dereferencing them while their run-local targets are absent.
  await cp(prepared, join(snapshotDemo, "node_modules"), {
    recursive: true,
    dereference: true,
    filter: (path) => {
      const preparedPath = relative(prepared, path);
      return preparedPath !== ".bin" && !preparedPath.startsWith(`.bin${sep}`);
    },
  });
  // `cp(..., dereference)` is required for a self-contained tree, but it turns
  // .bin links into copied launcher files whose relative imports are wrong.
  // Restore those links from the prepared template; they point only within the
  // per-run node_modules tree.
  const runBin = join(snapshotDemo, "node_modules", ".bin");
  await rm(runBin, { recursive: true, force: true });
  await mkdir(runBin);
  for (const entry of await readdir(join(prepared, ".bin"))) {
    const templateEntry = join(prepared, ".bin", entry);
    const info = await lstat(templateEntry);
    if (info.isSymbolicLink()) await symlink(await readlink(templateEntry), join(runBin, entry));
    else await copyFile(templateEntry, join(runBin, entry));
  }
  // The repositories intentionally use different dependency versions (most
  // notably their Node type libraries).  Giving the library the demo graph can
  // make an isolated build fail even when the ordinary library build passes.
  const liveDependencies = join(snapshotLive, "node_modules");
  await cp(join(sourceLive, "node_modules"), liveDependencies, {
    recursive: true,
    dereference: true,
    filter: (path) => basename(path) !== ".bin",
  });
  const liveBin = join(liveDependencies, ".bin");
  await mkdir(liveBin);
  for (const entry of await readdir(join(sourceLive, "node_modules", ".bin"))) {
    const sourceEntry = join(sourceLive, "node_modules", ".bin", entry);
    const info = await lstat(sourceEntry);
    if (info.isSymbolicLink()) await symlink(await readlink(sourceEntry), join(liveBin, entry));
    else await copyFile(sourceEntry, join(liveBin, entry));
  }
  if ((await stat(join(runBin, "tsx")).catch(() => undefined))?.isFile() === true) {
    await rm(join(liveBin, "tsx"), { force: true });
    await copyFile(join(runBin, "tsx"), join(liveBin, "tsx"));
    await chmod(join(liveBin, "tsx"), 0o755);
  }
  const sourceEditor = join(sourceLive, "editors", "vscode-hson");
  if ((await stat(join(sourceEditor, "package.json")).catch(() => undefined))?.isFile() === true) {
    const editorDependencies = await npm_dependency_root(sourceEditor);
    const snapshotEditorDependencies = join(snapshotLive, "editors", "vscode-hson", "node_modules");
    await cp(editorDependencies, snapshotEditorDependencies, {
      recursive: true,
      dereference: true,
      filter: (path) => basename(path) !== ".bin",
    });
    const editorBin = join(snapshotEditorDependencies, ".bin");
    await mkdir(editorBin);
    for (const entry of await readdir(join(editorDependencies, ".bin"))) {
      const sourceEntry = join(editorDependencies, ".bin", entry);
      const info = await lstat(sourceEntry);
      if (info.isSymbolicLink()) await symlink(await readlink(sourceEntry), join(editorBin, entry));
      else await copyFile(sourceEntry, join(editorBin, entry));
    }
  }
  await symlink(snapshotLive, join(snapshotDemo, "node_modules", "hson-live"), "dir");
  const resolved = await realpath(join(snapshotDemo, "node_modules", "hson-live"));
  if (!inside(await realpath(snapshotLive), resolved)) throw new Error("DEPENDENCY_RESOLUTION_ESCAPES_SNAPSHOT");
}

function host_playwright_browsers_path(): string {
  const home = process.env.HOME;
  if (home === undefined || home === "") throw new Error("H2_PLAYWRIGHT_BROWSER_SOURCE_UNAVAILABLE");
  return process.platform === "darwin"
    ? join(home, "Library", "Caches", "ms-playwright")
    : join(home, ".cache", "ms-playwright");
}

/** The host cache is only a provisioning source.  Children receive a copy in
 * their H2 workspace and never resolve Chromium from the developer cache. */
async function prepare_playwright_browsers(workspace: string, preparedRoot: string, dependencies: string): Promise<string> {
  const source = host_playwright_browsers_path();
  const sourceInfo = await stat(source).catch(() => undefined);
  if (sourceInfo?.isDirectory() !== true) throw new Error("H2_PLAYWRIGHT_BROWSER_SOURCE_UNAVAILABLE");
  const browserManifest = JSON.parse(await readFile(join(dependencies, "playwright-core", "browsers.json"), "utf8")) as {
    browsers?: readonly Readonly<{ name?: string; revision?: string }>[];
  };
  const revision = browserManifest.browsers?.find((entry) => entry.name === "chromium-headless-shell")?.revision;
  if (revision === undefined || !/^\d+$/.test(revision)) throw new Error("H2_PLAYWRIGHT_BROWSER_REVISION_UNAVAILABLE");
  const browserDirectory = `chromium_headless_shell-${revision}`;
  if ((await stat(join(source, browserDirectory)).catch(() => undefined))?.isDirectory() !== true) {
    throw new Error("H2_PLAYWRIGHT_BROWSER_SOURCE_UNAVAILABLE");
  }
  const prepared = join(preparedRoot, `playwright-browsers-v3-${browserDirectory}`);
  try { await stat(prepared); } catch {
    const staging = `${prepared}.staging-${randomUUID()}`;
    await mkdir(staging, { recursive: true });
    await cp(join(source, browserDirectory), join(staging, browserDirectory), { recursive: true, dereference: false });
    try { await rename(staging, prepared); }
    catch (error) {
      await rm(staging, { recursive: true, force: true });
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  const runBrowsers = join(workspace, "playwright-browsers");
  await cp(prepared, runBrowsers, { recursive: true, dereference: false });
  return runBrowsers;
}

function replacement_environment(workspace: string, dependencies: string, playwrightBrowsersPath?: string): Readonly<Record<string, string>> {
  const home = join(workspace, "home");
  return Object.freeze({
    PATH: [dirname(process.execPath), join(dependencies, ".bin"), "/usr/local/bin", "/usr/bin", "/bin"].join(":"),
    HOME: home,
    TMPDIR: join(workspace, "tmp"),
    XDG_CACHE_HOME: join(home, ".cache"),
    npm_config_cache: join(home, ".npm"),
    CI: "true", FORCE_COLOR: "0", NO_COLOR: "1", HSON_HOSTED_VERIFICATION_DEPTH: "1",
    ...(playwrightBrowsersPath === undefined ? {} : { PLAYWRIGHT_BROWSERS_PATH: playwrightBrowsersPath }),
  });
}

function supported_node(): boolean {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major !== undefined && minor !== undefined && (major > 22 || (major === 22 && minor >= 12)) && major < 25;
}

async function npm_cli_path(): Promise<string> {
  const executable = (await execFileAsync("which", ["npm"])).stdout.trim();
  const candidate = await realpath(executable);
  if (!(await stat(candidate)).isFile()) throw new Error("H2_NPM_CLI_UNAVAILABLE");
  return candidate;
}

export function resolve_h2_verification(id: string): Descriptor {
  const descriptor = H2_REGISTRY.get(id as H2VerificationId);
  if (descriptor === undefined) throw new Error(`UNKNOWN_H2_VERIFICATION_ID: ${id}`);
  return descriptor;
}

function combine_h2_process_results(command: NodeProcessResult, evidence: NodeProcessResult): NodeProcessResult {
  const separator = command.stdout !== "" && !command.stdout.endsWith("\n") ? "\n" : "";
  const stdout = command.stdout + separator + evidence.stdout;
  const stderrSeparator = command.stderr !== "" && evidence.stderr !== "" && !command.stderr.endsWith("\n") ? "\n" : "";
  const stderr = command.stderr + stderrSeparator + evidence.stderr;
  const stdoutBytes = Buffer.byteLength(stdout);
  const stderrBytes = Buffer.byteLength(stderr);
  const outputLimitExceeded = command.outputLimitExceeded || evidence.outputLimitExceeded || stdoutBytes > OUTPUT_LIMIT_BYTES || stderrBytes > OUTPUT_LIMIT_BYTES;
  const spawnError = command.spawnError ?? evidence.spawnError;
  return Object.freeze({
    stdout, stderr, stdoutBytes, stderrBytes,
    stdoutTruncated: command.stdoutTruncated || evidence.stdoutTruncated,
    stderrTruncated: command.stderrTruncated || evidence.stderrTruncated,
    exitCode: evidence.exitCode,
    signal: evidence.signal,
    durationMs: command.durationMs + evidence.durationMs,
    timedOut: command.timedOut || evidence.timedOut,
    cancelled: command.cancelled || evidence.cancelled,
    outputLimitExceeded,
    forceKilled: command.forceKilled || evidence.forceKilled,
    ...(spawnError === undefined ? {} : { spawnError }),
    ok: command.ok && evidence.ok && !outputLimitExceeded,
  });
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
  let workspacePeakBytes = 0;
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
        const bytes = await workspace_bytes(workspace);
        workspacePeakBytes = Math.max(workspacePeakBytes, bytes);
        if (bytes > workspaceLimit) {
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
    await prepare_snapshot_repository(snapshotLive);
    const preparedRoot = join(tempRoot, "prepared-dependencies");
    await prepare_dependencies(options.hsonLiveRoot, options.hsonDemo2Root, snapshotDemo, snapshotLive, preparedRoot, options.testHooks);
    await scan();
    if (workspaceLimitExceeded) throw new Error("WORKSPACE_LIMIT_EXCEEDED");
    if (workspaceScanFailed) throw new Error("WORKSPACE_ACCOUNTING_FAILED");
    const dependencies = join(snapshotDemo, "node_modules");
    const playwrightBrowsersPath = descriptor.capabilityProfile === "browser-chromium" || descriptor.capabilityProfile === "mixed-node-browser"
      ? await prepare_playwright_browsers(workspace, preparedRoot, dependencies)
      : undefined;
    await options.testHooks?.beforeExecution?.(workspace, snapshotDemo);
    const supervisor = create_node_process_supervisor({ stdoutLimitBytes: OUTPUT_LIMIT_BYTES, stderrLimitBytes: OUTPUT_LIMIT_BYTES, truncationMarker: "<H2_OUTPUT_TRUNCATED>", terminationGraceMs: 1_000, environmentMode: "replace" });
    const npmCli = await npm_cli_path();
    // This is executor-owned preparation: it builds only the copied library
    // snapshot so the existing package export contract remains authoritative.
    const preparation = supervisor.start({
      cwd: snapshotLive,
      command: process.execPath,
      args: Object.freeze([npmCli, "run", "build"]),
      environment: replacement_environment(workspace, dependencies, playwrightBrowsersPath),
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
      const executionCwd = descriptor.scope === "hson-live" ? snapshotLive : snapshotDemo;
      const h2c = descriptor.execution === "h2c-wrapper" ? resolve_h2c_descriptor(descriptor.id) : undefined;
      if (h2c !== undefined) await clean_h2c_owned_outputs({ id: descriptor.id, hsonLiveRoot: snapshotLive, hsonDemo2Root: snapshotDemo });
      const executionArgs = h2c?.directModule === undefined
        ? Object.freeze([npmCli, "run", descriptor.packageScript])
        : Object.freeze(["--import", "tsx", join(executionCwd, h2c.directModule)]);
      const execution = supervisor.start(
        { cwd: executionCwd, command: process.execPath, args: executionArgs, environment: replacement_environment(workspace, dependencies, playwrightBrowsersPath), timeoutMs: descriptor.timeoutMs },
        signal === undefined ? {} : { signal },
      );
      activeExecution = execution;
      if (workspaceLimitExceeded || workspaceScanFailed) execution.terminate();
      const commandResult = await execution.result;
      processResult = commandResult;
      if (commandResult.ok && h2c !== undefined) {
        const evidenceExecution = supervisor.start({
          cwd: executionCwd,
          command: process.execPath,
          args: Object.freeze(["--import", "tsx", join(snapshotDemo, H2C_CHILD_RELATIVE_PATH), descriptor.id, snapshotLive, snapshotDemo]),
          environment: replacement_environment(workspace, dependencies, playwrightBrowsersPath),
          timeoutMs: descriptor.timeoutMs,
        }, signal === undefined ? {} : { signal });
        activeExecution = evidenceExecution;
        if (workspaceLimitExceeded || workspaceScanFailed) evidenceExecution.terminate();
        processResult = combine_h2_process_results(commandResult, await evidenceExecution.result);
      }
      await scan();
      if (workspaceLimitExceeded) failureReason = "WORKSPACE_LIMIT_EXCEEDED";
      else if (workspaceScanFailed) failureReason = "WORKSPACE_ACCOUNTING_FAILED";
      else if (processResult.outputLimitExceeded) failureReason = "OUTPUT_LIMIT_EXCEEDED";
      else if (!processResult.ok) failureReason = processResult.timedOut ? "TIMEOUT" : processResult.cancelled ? "CANCELLED" : "PROCESS_FAILED";
      else if (workspaceLimitExceeded) failureReason = "WORKSPACE_LIMIT_EXCEEDED";
      else {
        const accepted = descriptor.completion.kind === "stdout-marker"
          ? h2_completion_accepted(processResult.stdout, descriptor.completion.marker)
          : h2_terminal_json_completion_accepted(processResult.stdout, descriptor.completion.certificate);
        completion = Object.freeze({ kind: "terminal-json", accepted, detail: descriptor.completion.kind === "stdout-marker" ? descriptor.completion.marker : descriptor.completion.certificate });
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
  return Object.freeze({ id: descriptor.id, status: failureReason === undefined && cleanup === "removed" ? "PASS" : "FAIL", metadata, ...(processResult === undefined ? {} : { process: processResult }), ...(failureReason === undefined ? {} : { failureReason }), cleanup, workspacePeakBytes, ...(quarantinePath === undefined ? {} : { quarantinePath }), ...(completion === undefined ? {} : { completion }) });
}
