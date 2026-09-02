import { createHash, randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { create_node_process_supervisor, type NodeProcessResult } from "./node-process-supervisor";

const OWNED_MARKER = ".isolated-command-workspace.json";
const OWNED_SCHEMA = "hson-isolated-command-workspace-v1";
const NESTING_ENVIRONMENT_KEY = "HSON_ISOLATED_COMMAND_DEPTH";
const DEFAULT_STALE_AGE_MS = 6 * 60 * 60 * 1_000;
export const ISOLATED_WORKSPACE_POLL_INTERVAL_MS = 100;

export type IsolatedCommandFailure =
  | "source-mutated"
  | "workspace-limit"
  | "command-failed";

export type IsolatedCommandResult = Readonly<{
  ok: boolean;
  process?: NodeProcessResult;
  failure?: IsolatedCommandFailure;
  workspacePeakBytes: number;
  cleanup: "removed";
}>;

export type IsolatedCommandOptions = Readonly<{
  sourceRoot: string;
  command: string;
  args?: readonly string[];
  workingDirectory?: string;
  environment: Readonly<Record<string, string>>;
  timeoutMs: number;
  tempRoot?: string;
  workspaceLimitBytes?: number;
  stdoutLimitBytes?: number;
  stderrLimitBytes?: number;
  terminationGraceMs?: number;
  signal?: AbortSignal;
  staleAgeMs?: number;
  testHooks?: Readonly<{
    afterSourceCapture?(): Promise<void> | void;
    afterSourceCopy?(workspace: string): Promise<void> | void;
    beforeCommand?(workspace: string): Promise<void> | void;
  }>;
}>;

type SourceEntry = Readonly<{
  path: string;
  bytes: number;
  executable: boolean;
  digest: string;
}>;

function inside(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value === "" || (value !== ".." && !value.startsWith(`..${sep}`));
}

function owned_path(root: string, path: string): string {
  if (path === "" || path.includes("\0")) throw new Error(`ISOLATED_PATH_INVALID:${path}`);
  const candidate = resolve(root, path);
  if (!inside(root, candidate)) throw new Error(`ISOLATED_PATH_ESCAPE:${path}`);
  return candidate;
}

async function path_exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function source_entries(root: string, directory = ""): Promise<readonly SourceEntry[]> {
  const absolute = directory === "" ? root : owned_path(root, directory);
  const found: SourceEntry[] = [];
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    if (directory === "" && (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".test-reports")) continue;
    const path = directory === "" ? entry.name : join(directory, entry.name);
    const candidate = owned_path(root, path);
    const info = await lstat(candidate);
    if (info.isSymbolicLink()) {
      throw new Error(`ISOLATED_SOURCE_SYMLINK_REJECTED:${path}`);
    }
    if (info.isDirectory()) found.push(...await source_entries(root, path));
    else if (info.isFile()) {
      const content = await readFile(candidate);
      found.push(Object.freeze({
        path: path.replaceAll("\\", "/"),
        bytes: content.byteLength,
        executable: (info.mode & 0o111) !== 0,
        digest: createHash("sha256").update(content).digest("hex"),
      }));
    } else {
      throw new Error(`ISOLATED_SOURCE_TYPE_REJECTED:${path}`);
    }
  }
  return Object.freeze(found.sort((left, right) => left.path.localeCompare(right.path)));
}

function same_source(left: readonly SourceEntry[], right: readonly SourceEntry[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function materialize_source(root: string, target: string, entries: readonly SourceEntry[], limit: number): Promise<number> {
  let total = 0;
  for (const entry of entries) {
    total += entry.bytes;
    if (total > limit) throw new Error("ISOLATED_WORKSPACE_LIMIT_EXCEEDED");
    const destination = owned_path(target, entry.path);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(owned_path(root, entry.path), destination);
  }
  return total;
}

export async function isolated_workspace_bytes(root: string): Promise<number> {
  let total = 0;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`ISOLATED_WORKSPACE_SYMLINK_REJECTED:${entry.name}`);
    if (entry.isDirectory()) total += await isolated_workspace_bytes(path);
    else if (entry.isFile()) total += (await stat(path)).size;
    else throw new Error(`ISOLATED_WORKSPACE_TYPE_REJECTED:${entry.name}`);
  }
  return total;
}

async function owned_workspace(path: string): Promise<boolean> {
  try {
    const marker = JSON.parse(await readFile(join(path, OWNED_MARKER), "utf8")) as Record<string, unknown>;
    return marker.schema === OWNED_SCHEMA && marker.id === path.split(sep).at(-1);
  } catch { return false; }
}

export async function clean_stale_isolated_workspaces(tempRoot = join(tmpdir(), "hson-isolated-commands"), staleAgeMs = DEFAULT_STALE_AGE_MS): Promise<readonly string[]> {
  await mkdir(tempRoot, { recursive: true });
  if ((await lstat(tempRoot)).isSymbolicLink()) throw new Error("ISOLATED_TEMP_ROOT_SYMLINK_REJECTED");
  const removed: string[] = [];
  for (const entry of await readdir(tempRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("run-")) continue;
    const path = join(tempRoot, entry.name);
    const info = await stat(path);
    if (Date.now() - info.mtimeMs < staleAgeMs || !(await owned_workspace(path))) continue;
    await rm(path, { recursive: true });
    removed.push(path);
  }
  return Object.freeze(removed);
}

export async function run_isolated_command(options: IsolatedCommandOptions): Promise<IsolatedCommandResult> {
  if (process.env[NESTING_ENVIRONMENT_KEY] !== undefined) throw new Error("ISOLATED_NESTED_INVOCATION_REJECTED");
  const sourceRoot = await realpath(resolve(options.sourceRoot));
  const sourceInfo = await lstat(sourceRoot);
  if (!sourceInfo.isDirectory() || sourceInfo.isSymbolicLink()) throw new Error("ISOLATED_SOURCE_ROOT_INVALID");
  const tempRoot = resolve(options.tempRoot ?? join(tmpdir(), "hson-isolated-commands"));
  await clean_stale_isolated_workspaces(tempRoot, options.staleAgeMs);
  const id = `run-${randomUUID()}`;
  const workspace = join(tempRoot, id);
  if (!inside(tempRoot, workspace)) throw new Error("ISOLATED_WORKSPACE_PATH_ESCAPE");
  await mkdir(workspace, { recursive: false });
  await writeFile(join(workspace, OWNED_MARKER), JSON.stringify({ schema: OWNED_SCHEMA, id }), { flag: "wx" });
  const sourceCopy = join(workspace, "source");
  await mkdir(sourceCopy);
  const limit = options.workspaceLimitBytes ?? 1024 * 1024 * 1024;
  let peak = 0;
  let execution: ReturnType<ReturnType<typeof create_node_process_supervisor>["start"]> | undefined;
  const supervisor = create_node_process_supervisor({
    stdoutLimitBytes: options.stdoutLimitBytes ?? 256 * 1024,
    stderrLimitBytes: options.stderrLimitBytes ?? 256 * 1024,
    truncationMarker: "<TRUNCATED>",
    terminationGraceMs: options.terminationGraceMs ?? 1_000,
    environmentMode: "replace",
  });
  try {
    const before = await source_entries(sourceRoot);
    await options.testHooks?.afterSourceCapture?.();
    peak = await materialize_source(sourceRoot, sourceCopy, before, limit);
    await options.testHooks?.afterSourceCopy?.(workspace);
    const after = await source_entries(sourceRoot);
    if (!same_source(before, after)) return Object.freeze({ ok: false, failure: "source-mutated", workspacePeakBytes: peak, cleanup: "removed" });
    if (!same_source(before, await source_entries(sourceCopy))) throw new Error("ISOLATED_SOURCE_COPY_MISMATCH");
    await options.testHooks?.beforeCommand?.(workspace);
    const cwd = options.workingDirectory === undefined ? sourceCopy : owned_path(sourceCopy, options.workingDirectory);
    if (!(await lstat(cwd)).isDirectory()) throw new Error("ISOLATED_WORKING_DIRECTORY_INVALID");
    execution = supervisor.start({
      cwd,
      command: options.command,
      args: Object.freeze([...(options.args ?? [])]),
      environment: Object.freeze({ ...options.environment, [NESTING_ENVIRONMENT_KEY]: "1" }),
      timeoutMs: options.timeoutMs,
    }, options.signal === undefined ? {} : { signal: options.signal });
    let limitExceeded = false;
    const monitor = setInterval(() => {
      void isolated_workspace_bytes(workspace).then((bytes) => {
        peak = Math.max(peak, bytes);
        if (bytes > limit && !limitExceeded) { limitExceeded = true; execution?.terminate(); }
      }).catch(() => { limitExceeded = true; execution?.terminate(); });
    }, ISOLATED_WORKSPACE_POLL_INTERVAL_MS);
    const processResult = await execution.result.finally(() => clearInterval(monitor));
    peak = Math.max(peak, await isolated_workspace_bytes(workspace));
    if (limitExceeded || peak > limit) return Object.freeze({ ok: false, process: processResult, failure: "workspace-limit", workspacePeakBytes: peak, cleanup: "removed" });
    return Object.freeze({ ok: processResult.ok, process: processResult, ...(processResult.ok ? {} : { failure: "command-failed" as const }), workspacePeakBytes: peak, cleanup: "removed" });
  } catch (error) {
    if ((error as Error).message === "ISOLATED_WORKSPACE_LIMIT_EXCEEDED") {
      return Object.freeze({ ok: false, failure: "workspace-limit", workspacePeakBytes: peak, cleanup: "removed" });
    }
    throw error;
  } finally {
    execution?.terminate();
    supervisor.dispose();
    await rm(workspace, { recursive: true, force: true });
    if (await path_exists(workspace)) throw new Error(`ISOLATED_CLEANUP_FAILED:${workspace}`);
  }
}
