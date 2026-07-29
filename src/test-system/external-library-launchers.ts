import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, realpath } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hson_live_test_launchers,
  type HsonLiveTestLauncher,
} from "hson-live/test-launchers";
import type { TestSubject } from "../app/demos/test/tests.types";

export const EXTERNAL_LIBRARY_LAUNCHER_TIMEOUT_MS = 120_000;
const TSX_IMPORT_PATH = fileURLToPath(import.meta.resolve("tsx"));

export type ExternalLibraryLauncherInvocationKind = "direct" | "package-script";

type ExternalLibraryLauncherInvocation = Readonly<{
  kind: ExternalLibraryLauncherInvocationKind;
  command: string;
  args: readonly string[];
  env: Readonly<Record<string, string>>;
  fallback?: ExternalLibraryLauncherInvocation;
}>;

export type ExternalLibraryLauncherTarget = Readonly<{
  id: string;
  launcherId: string;
  subject: TestSubject;
  displayName: string;
  runtime: HsonLiveTestLauncher["runtime"];
  executableChecks: number;
  collections: readonly string[];
}>;

export type ExternalLibraryLauncherAvailability = Readonly<{
  repositoryRoot?: string;
  targets: readonly ExternalLibraryLauncherTarget[];
  unavailable: readonly Readonly<{ launcherId: string; reason: string }>[];
  invocations?: Readonly<Record<string, ExternalLibraryLauncherInvocation>>;
}>;

export type ExternalLibraryLauncherResult = Readonly<{
  target: ExternalLibraryLauncherTarget;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  timedOut: boolean;
  spawnError?: string;
  invocationKind: ExternalLibraryLauncherInvocationKind;
  ok: boolean;
}>;

type ExternalLibraryLauncherState = {
  readonly activeChildren: Set<ChildProcess>;
  readonly activeLaunchers: Map<string, Promise<ExternalLibraryLauncherResult>>;
  maximumObservedConcurrentChildren: number;
  terminationGeneration: number;
  directLauncherStarts: number;
  packageScriptStarts: number;
};

export type ExternalLibraryLauncherRunOptions = Readonly<{
  timeoutMs?: number;
  signal?: AbortSignal;
  command?: string;
  terminationGeneration?: number;
  forcePackageScript?: boolean;
  forceTsx?: boolean;
  forcePlainNode?: boolean;
  forceVerifiedDirect?: boolean;
}>;

export type ExternalLibraryLauncherService = Readonly<{
  run(
    availability: ExternalLibraryLauncherAvailability,
    targetId: string,
    options?: ExternalLibraryLauncherRunOptions,
  ): Promise<ExternalLibraryLauncherResult>;
  terminate(): void;
  terminationGeneration(): number;
  resetMetrics(): void;
  metrics(): Readonly<{
    activeChildren: number;
    maximumObservedConcurrentChildren: number;
    directLauncherStarts: number;
    packageScriptStarts: number;
  }>;
}>;

function make_external_library_launcher_state(): ExternalLibraryLauncherState {
  return {
    activeChildren: new Set(),
    activeLaunchers: new Map(),
    maximumObservedConcurrentChildren: 0,
    terminationGeneration: 0,
    directLauncherStarts: 0,
    packageScriptStarts: 0,
  };
}

const SUBJECTS: Readonly<Record<HsonLiveTestLauncher["subject"], TestSubject>> = Object.freeze({
  Transform: "transform",
  LiveTree: "livetree",
  LiveMap: "livemap",
  LiveHost: "livehost",
  Core: "integration",
});

const TSX_PARITY_MANIFEST_FINGERPRINT =
  "4b70a0101420cbc96ae5c2f0c393bc5c2d21dc452f0b464c17d18e0d566b3469";

function launcher_manifest_fingerprint(): string {
  return createHash("sha256").update(hson_live_test_launchers.map((launcher) => [
    launcher.id,
    launcher.repositoryModule,
    launcher.packageScript,
    launcher.runtime,
    launcher.executableChecks,
  ].join("|")).join("\n")).digest("hex");
}

function tsx_invocation(
  launcher: HsonLiveTestLauncher,
  fallback?: ExternalLibraryLauncherInvocation,
): ExternalLibraryLauncherInvocation {
  return Object.freeze({
    kind: "direct",
    command: process.execPath,
    args: Object.freeze(["--import", TSX_IMPORT_PATH, launcher.repositoryModule]),
    env: Object.freeze({ TS_NODE_TRANSPILE_ONLY: "true" }),
    ...(fallback === undefined ? {} : { fallback }),
  });
}

export function external_library_target_id(launcherId: string): string {
  return `library::${launcherId}`;
}

function target(launcher: HsonLiveTestLauncher): ExternalLibraryLauncherTarget {
  return Object.freeze({
    id: external_library_target_id(launcher.id),
    launcherId: launcher.id,
    subject: SUBJECTS[launcher.subject],
    displayName: launcher.displayName,
    runtime: launcher.runtime,
    executableChecks: launcher.executableChecks,
    collections: Object.freeze([...launcher.collections]),
  });
}

export function classify_external_library_launcher_invocation(
  launcher: HsonLiveTestLauncher,
  packageCommand: string,
): ExternalLibraryLauncherInvocation {
  const expectedDirectShape =
    `TS_NODE_TRANSPILE_ONLY=true node --loader ts-node/esm ${launcher.repositoryModule}`;
  return packageCommand === expectedDirectShape
    ? Object.freeze({
      kind: "direct",
      command: process.execPath,
      args: Object.freeze(["--loader", "ts-node/esm", launcher.repositoryModule]),
      env: Object.freeze({ TS_NODE_TRANSPILE_ONLY: "true" }),
    })
    : Object.freeze({
      kind: "package-script",
      command: "npm",
      args: Object.freeze(["run", "--silent", launcher.packageScript]),
      env: Object.freeze({}),
    });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function find_package_root(start: string): Promise<string | undefined> {
  let current = start;
  const filesystemRoot = parse(current).root;
  while (true) {
    const packageJson = join(current, "package.json");
    if (await exists(packageJson)) {
      try {
        const parsed = JSON.parse(await readFile(packageJson, "utf8")) as { name?: unknown };
        if (parsed.name === "hson-live") return current;
      } catch {
        return undefined;
      }
    }
    if (current === filesystemRoot) return undefined;
    current = dirname(current);
  }
}

export async function resolve_external_library_launchers(
  resolvedManifestUrl: string = import.meta.resolve("hson-live/test-launchers"),
): Promise<ExternalLibraryLauncherAvailability> {
  let manifestPath: string;
  try {
    manifestPath = await realpath(new URL(resolvedManifestUrl));
  } catch (error) {
    return Object.freeze({
      targets: Object.freeze([]),
      unavailable: Object.freeze(hson_live_test_launchers.map((launcher) => Object.freeze({
        launcherId: launcher.id,
        reason: `manifest resolution failed: ${error instanceof Error ? error.message : String(error)}`,
      }))),
      invocations: Object.freeze({}),
    });
  }
  const repositoryRoot = await find_package_root(dirname(manifestPath));
  if (repositoryRoot === undefined) {
    return Object.freeze({
      targets: Object.freeze([]),
      unavailable: Object.freeze(hson_live_test_launchers.map((launcher) => Object.freeze({
        launcherId: launcher.id,
        reason: "hson-live package root was not found",
      }))),
      invocations: Object.freeze({}),
    });
  }
  let scripts: Readonly<Record<string, unknown>> = {};
  try {
    const packageJson = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8")) as {
      scripts?: Readonly<Record<string, unknown>>;
    };
    scripts = packageJson.scripts ?? {};
  } catch {
    // Per-target diagnostics below keep ordinary Node discovery usable.
  }
  const targets: ExternalLibraryLauncherTarget[] = [];
  const unavailable: { launcherId: string; reason: string }[] = [];
  const invocations: Record<string, ExternalLibraryLauncherInvocation> = {};
  const tsxParityVerified = launcher_manifest_fingerprint() === TSX_PARITY_MANIFEST_FINGERPRINT;
  for (const launcher of hson_live_test_launchers) {
    const moduleExists = await exists(join(repositoryRoot, launcher.repositoryModule));
    const scriptExists = typeof scripts[launcher.packageScript] === "string";
    if (moduleExists && scriptExists) {
      const selectedTarget = target(launcher);
      targets.push(selectedTarget);
      const packageCommand = scripts[launcher.packageScript] as string;
      const verifiedInvocation = classify_external_library_launcher_invocation(
        launcher,
        packageCommand,
      );
      invocations[selectedTarget.id] = tsxParityVerified && verifiedInvocation.kind === "direct"
        ? tsx_invocation(launcher, verifiedInvocation)
        : verifiedInvocation;
    }
    else unavailable.push({
      launcherId: launcher.id,
      reason: !moduleExists
        ? `repository module is absent: ${launcher.repositoryModule}`
        : `package script is absent: ${launcher.packageScript}`,
    });
  }
  return Object.freeze({
    repositoryRoot,
    targets: Object.freeze(targets),
    unavailable: Object.freeze(unavailable.map((entry) => Object.freeze(entry))),
    invocations: Object.freeze(invocations),
  });
}

function terminate_process_tree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform !== "win32") {
    try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
    return;
  }
  child.kill("SIGTERM");
}

async function run_external_library_launcher_with_state(
  state: ExternalLibraryLauncherState,
  availability: ExternalLibraryLauncherAvailability,
  targetId: string,
  options: ExternalLibraryLauncherRunOptions = {},
): Promise<ExternalLibraryLauncherResult> {
  if (options.terminationGeneration !== undefined && options.terminationGeneration !== state.terminationGeneration) {
    throw new Error(`External library launcher was cancelled before start: ${targetId}`);
  }
  if (availability.repositoryRoot === undefined) throw new Error("External hson-live repository is unavailable.");
  const selectedTarget = availability.targets.find((entry) => entry.id === targetId);
  if (selectedTarget === undefined) throw new Error(`External library launcher is unavailable: ${targetId}`);
  const launcher = hson_live_test_launchers.find((entry) => entry.id === selectedTarget.launcherId);
  if (launcher === undefined) throw new Error(`External library launcher manifest identity changed: ${targetId}`);
  const timeoutMs = options.timeoutMs ?? EXTERNAL_LIBRARY_LAUNCHER_TIMEOUT_MS;
  const active = state.activeLaunchers.get(targetId);
  if (active !== undefined) return active;
  const startedAt = performance.now();
  const execution = new Promise<ExternalLibraryLauncherResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let spawnError: string | undefined;
    let settled = false;
    const configuredInvocation = availability.invocations?.[targetId];
    let resolvedInvocation: ExternalLibraryLauncherInvocation;
    if (options.forcePackageScript) {
      resolvedInvocation = Object.freeze({
        kind: "package-script" as const,
        command: "npm",
        args: Object.freeze(["run", "--silent", launcher.packageScript]),
        env: Object.freeze({}),
      });
    } else if (options.forceTsx) {
      resolvedInvocation = tsx_invocation(launcher);
    } else if (options.forcePlainNode) {
      resolvedInvocation = Object.freeze({
        kind: "direct",
        command: process.execPath,
        args: Object.freeze([launcher.repositoryModule]),
        env: Object.freeze({ TS_NODE_TRANSPILE_ONLY: "true" }),
      });
    } else {
      resolvedInvocation = (
        options.forceVerifiedDirect
          ? configuredInvocation?.fallback ?? configuredInvocation
          : configuredInvocation
      ) ?? Object.freeze({
        kind: "package-script" as const,
        command: "npm",
        args: Object.freeze(["run", "--silent", launcher.packageScript]),
        env: Object.freeze({}),
      });
    }
    const invocation = options.command === undefined
      ? resolvedInvocation
      : Object.freeze({ ...resolvedInvocation, command: options.command });
    if (invocation.kind === "direct") state.directLauncherStarts += 1;
    else state.packageScriptStarts += 1;
    const child = spawn(invocation.command, invocation.args, {
      cwd: availability.repositoryRoot,
      env: { ...process.env, ...invocation.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    state.activeChildren.add(child);
    state.maximumObservedConcurrentChildren = Math.max(
      state.maximumObservedConcurrentChildren,
      state.activeChildren.size,
    );
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr?.on("data", (chunk: string) => { stderr += chunk; });
    const stop = (): void => terminate_process_tree(child);
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const abort = (): void => stop();
    options.signal?.addEventListener("abort", abort, { once: true });
    child.once("error", (error) => { spawnError = error.message; });
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      state.activeChildren.delete(child);
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      const durationMs = performance.now() - startedAt;
      resolve(Object.freeze({
        target: selectedTarget,
        stdout,
        stderr,
        exitCode,
        signal,
        durationMs,
        timedOut,
        ...(spawnError === undefined ? {} : { spawnError }),
        invocationKind: invocation.kind,
        ok: exitCode === 0 && signal === null && spawnError === undefined && !timedOut,
      }));
    });
  });
  state.activeLaunchers.set(targetId, execution);
  return execution.finally(() => state.activeLaunchers.delete(targetId));
}

export function create_external_library_launcher_service(): ExternalLibraryLauncherService {
  const state = make_external_library_launcher_state();
  return Object.freeze({
    run: (availability, targetId, options) =>
      run_external_library_launcher_with_state(state, availability, targetId, options ?? {}),
    terminate() {
      state.terminationGeneration += 1;
      for (const child of [...state.activeChildren]) terminate_process_tree(child);
    },
    terminationGeneration: () => state.terminationGeneration,
    resetMetrics() {
      if (state.activeChildren.size !== 0) {
        throw new Error("Cannot reset external launcher metrics while children are active.");
      }
      state.maximumObservedConcurrentChildren = 0;
      state.directLauncherStarts = 0;
      state.packageScriptStarts = 0;
    },
    metrics: () => Object.freeze({
      activeChildren: state.activeChildren.size,
      maximumObservedConcurrentChildren: state.maximumObservedConcurrentChildren,
      directLauncherStarts: state.directLauncherStarts,
      packageScriptStarts: state.packageScriptStarts,
    }),
  });
}

// Direct CLI verification intentionally shares one process-wide service. Node
// hosted applications create their own service so shutdown cannot cancel peers.
const defaultExternalLibraryLauncherService = create_external_library_launcher_service();

export function run_external_library_launcher(
  availability: ExternalLibraryLauncherAvailability,
  targetId: string,
  options: ExternalLibraryLauncherRunOptions = {},
): Promise<ExternalLibraryLauncherResult> {
  return defaultExternalLibraryLauncherService.run(availability, targetId, options);
}

export function terminate_external_library_launchers(): void {
  defaultExternalLibraryLauncherService.terminate();
}

export function external_library_launcher_termination_generation(): number {
  return defaultExternalLibraryLauncherService.terminationGeneration();
}

export function reset_external_library_launcher_metrics(): void {
  defaultExternalLibraryLauncherService.resetMetrics();
}

export function external_library_launcher_metrics(): Readonly<{
  activeChildren: number;
  maximumObservedConcurrentChildren: number;
  directLauncherStarts: number;
  packageScriptStarts: number;
}> {
  return defaultExternalLibraryLauncherService.metrics();
}
