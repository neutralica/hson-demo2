import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, realpath } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";
import {
  hson_live_test_launchers,
  type HsonLiveTestLauncher,
} from "hson-live/test-launchers";
import type { TestSubject } from "../../core/test-contracts";
import type { ExternalLibraryLauncherTarget } from "../../core/external-launcher-contract";

export const EXTERNAL_LIBRARY_LAUNCHER_TIMEOUT_MS = 120_000;
export const EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS = 1_000;
export const EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES = 256 * 1024;
export const EXTERNAL_LIBRARY_LAUNCHER_STDERR_LIMIT_BYTES = 256 * 1024;
export const EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER = "<HSON_LIVE_TEST_OUTPUT_TRUNCATED>";
export const HSON_LIVE_TEST_COMPLETION_PREFIX = "<HSON_LIVE_TEST_COMPLETION>";
export const HSON_LIVE_TEST_COMPLETION_VERSION = 1;
const COMPLETION_LINE_LIMIT = 16 * 1024;
const TSX_IMPORT_PATH = fileURLToPath(import.meta.resolve("tsx"));

export type ExternalLibraryLauncherInvocationKind = "direct" | "package-script";

type ExternalLibraryLauncherInvocation = Readonly<{
  kind: ExternalLibraryLauncherInvocationKind;
  command: string;
  args: readonly string[];
  env: Readonly<Record<string, string>>;
  fallback?: ExternalLibraryLauncherInvocation;
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
  completion?: ExternalLibraryLauncherCompletion;
  completionError?: string;
  forceKilled?: boolean;
  invocationKind: ExternalLibraryLauncherInvocationKind;
  ok: boolean;
}>;

export type ExternalLibraryLauncherCompletion = Readonly<{
  version: 1;
  launcherId: string;
  executed: number;
  passed: number;
  failed: number;
}>;

type ExternalLibraryLauncherState = {
  readonly activeChildren: Map<ChildProcess, () => void>;
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
    activeChildren: new Map(),
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
  Reflect: "reflect",
  LiveHost: "livehost",
  Core: "integration",
});

const TSX_PARITY_MANIFEST_FINGERPRINT =
  "e02ada8089a1708b859c9798105f69482a8fbc292078f68f63ab2a11e022670f";

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

class BoundedOutputCapture {
  readonly #headLimit: number;
  readonly #tailLimit: number;
  readonly #full: Buffer[] = [];
  #fullBytes = 0;
  #head = Buffer.alloc(0);
  #tail = Buffer.alloc(0);
  #totalBytes = 0;
  #truncated = false;

  constructor(readonly limitBytes: number) {
    const markerReserve = Math.min(128, Math.floor(limitBytes / 4));
    const retained = limitBytes - markerReserve;
    this.#headLimit = Math.floor(retained / 2);
    this.#tailLimit = retained - this.#headLimit;
  }

  add(chunk: Buffer): void {
    this.#totalBytes += chunk.length;
    if (!this.#truncated) {
      if (this.#fullBytes + chunk.length <= this.limitBytes) {
        this.#full.push(chunk);
        this.#fullBytes += chunk.length;
      } else {
        this.#truncated = true;
        const prior = Buffer.concat([...this.#full, chunk]);
        this.#head = prior.subarray(0, this.#headLimit);
        this.#tail = prior.subarray(Math.max(0, prior.length - this.#tailLimit));
        this.#full.length = 0;
        this.#fullBytes = 0;
      }
      return;
    }
    if (this.#head.length < this.#headLimit) {
      const needed = this.#headLimit - this.#head.length;
      this.#head = Buffer.concat([this.#head, chunk.subarray(0, needed)]);
    }
    this.#tail = Buffer.concat([this.#tail, chunk]);
    if (this.#tail.length > this.#tailLimit) {
      this.#tail = this.#tail.subarray(this.#tail.length - this.#tailLimit);
    }
  }

  text(): string {
    if (!this.#truncated) return Buffer.concat(this.#full).toString("utf8");
    const omitted = Math.max(0, this.#totalBytes - this.#head.length - this.#tail.length);
    const marker = `\n${EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER} ${omitted} bytes omitted\n`;
    return `${this.#head.toString("utf8")}${marker}${this.#tail.toString("utf8")}`;
  }
}

type CompletionScan = Readonly<{
  records: readonly unknown[];
  malformedRecords: number;
  trailingOutput: boolean;
}>;

class CompletionScanner {
  readonly #decoder = new StringDecoder("utf8");
  readonly #records: unknown[] = [];
  #pending = "";
  #discardingLongLine = false;
  #malformedRecords = 0;
  #sawCompletionLine = false;
  #trailingOutput = false;

  add(chunk: Buffer): void {
    this.#consume(this.#decoder.write(chunk));
  }

  finish(): CompletionScan {
    this.#consume(this.#decoder.end());
    if (!this.#discardingLongLine && this.#pending.length > 0) this.#line(this.#pending);
    this.#pending = "";
    return Object.freeze({
      records: Object.freeze([...this.#records]),
      malformedRecords: this.#malformedRecords,
      trailingOutput: this.#trailingOutput,
    });
  }

  #consume(text: string): void {
    let remaining = text;
    while (remaining.length > 0) {
      if (this.#discardingLongLine) {
        const newline = remaining.indexOf("\n");
        if (newline < 0) return;
        this.#discardingLongLine = false;
        remaining = remaining.slice(newline + 1);
        continue;
      }
      const newline = remaining.indexOf("\n");
      if (newline < 0) {
        this.#pending += remaining;
        if (this.#pending.length > COMPLETION_LINE_LIMIT) {
          if (this.#pending.startsWith(HSON_LIVE_TEST_COMPLETION_PREFIX)) {
            this.#malformedRecords += 1;
            this.#sawCompletionLine = true;
          } else if (this.#sawCompletionLine && this.#pending.trim().length > 0) {
            this.#trailingOutput = true;
          }
          this.#pending = "";
          this.#discardingLongLine = true;
        }
        return;
      }
      this.#pending += remaining.slice(0, newline);
      this.#line(this.#pending);
      this.#pending = "";
      remaining = remaining.slice(newline + 1);
    }
  }

  #line(rawLine: string): void {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith(HSON_LIVE_TEST_COMPLETION_PREFIX)) {
      this.#sawCompletionLine = true;
      const payload = line.slice(HSON_LIVE_TEST_COMPLETION_PREFIX.length);
      try {
        this.#records.push(JSON.parse(payload));
      } catch {
        this.#malformedRecords += 1;
      }
      return;
    }
    if (this.#sawCompletionLine && line.trim().length > 0) this.#trailingOutput = true;
  }
}

function completion_record(value: unknown): ExternalLibraryLauncherCompletion | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expectedKeys = ["executed", "failed", "launcherId", "passed", "version"];
  if (keys.length !== expectedKeys.length || !keys.every((key, index) => key === expectedKeys[index])) {
    return undefined;
  }
  const counts = [record.executed, record.passed, record.failed];
  if (record.version !== HSON_LIVE_TEST_COMPLETION_VERSION
    || typeof record.launcherId !== "string" || record.launcherId.length === 0
    || !counts.every((count) => Number.isSafeInteger(count) && (count as number) >= 0)) {
    return undefined;
  }
  const executed = record.executed as number;
  const passed = record.passed as number;
  const failed = record.failed as number;
  if (executed !== passed + failed) return undefined;
  return Object.freeze({
    version: HSON_LIVE_TEST_COMPLETION_VERSION,
    launcherId: record.launcherId,
    executed,
    passed,
    failed,
  });
}

export function reconcile_external_launcher_completion(
  scan: CompletionScan,
  target: ExternalLibraryLauncherTarget,
): Readonly<{ completion?: ExternalLibraryLauncherCompletion; error?: string }> {
  if (scan.malformedRecords > 0) {
    return Object.freeze({ error: "External launcher emitted malformed completion data." });
  }
  if (scan.records.length === 0) {
    return Object.freeze({ error: "External launcher emitted no completion record." });
  }
  if (scan.records.length !== 1) {
    return Object.freeze({ error: "External launcher emitted more than one completion record." });
  }
  if (scan.trailingOutput) {
    return Object.freeze({ error: "External launcher emitted output after its terminal completion record." });
  }
  const completion = completion_record(scan.records[0]);
  if (completion === undefined) {
    return Object.freeze({ error: "External launcher completion record has an invalid shape or count relationship." });
  }
  if (completion.launcherId !== target.launcherId) {
    return Object.freeze({
      completion,
      error: `External launcher completion identified "${completion.launcherId}", expected "${target.launcherId}".`,
    });
  }
  if (completion.executed !== target.executableChecks) {
    return Object.freeze({
      completion,
      error: `External launcher executed ${completion.executed} checks, manifest declares ${target.executableChecks}.`,
    });
  }
  if (completion.failed !== 0 || completion.passed !== target.executableChecks) {
    return Object.freeze({
      completion,
      error: `External launcher completion reported ${completion.passed} passed and ${completion.failed} failed checks.`,
    });
  }
  return Object.freeze({ completion });
}

function append_protocol_error(stderr: string, error: string | undefined): string {
  if (error === undefined) return stderr;
  return `${stderr}${stderr.length === 0 || stderr.endsWith("\n") ? "" : "\n"}[external launcher protocol] ${error}\n`;
}

function terminate_process_tree(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  if (process.platform !== "win32") {
    try { process.kill(-child.pid, signal); } catch { child.kill(signal); }
    return;
  }
  child.kill(signal);
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
    const stdoutCapture = new BoundedOutputCapture(EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES);
    const stderrCapture = new BoundedOutputCapture(EXTERNAL_LIBRARY_LAUNCHER_STDERR_LIMIT_BYTES);
    const completionScanner = new CompletionScanner();
    let timedOut = false;
    let spawnError: string | undefined;
    let settled = false;
    let terminationRequested = false;
    let forceKilled = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
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
    const requestTermination = (): void => {
      if (terminationRequested || settled) return;
      terminationRequested = true;
      terminate_process_tree(child, "SIGTERM");
      forceTimer = setTimeout(() => {
        if (settled) return;
        forceKilled = true;
        terminate_process_tree(child, "SIGKILL");
      }, EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS);
    };
    state.activeChildren.set(child, requestTermination);
    state.maximumObservedConcurrentChildren = Math.max(
      state.maximumObservedConcurrentChildren,
      state.activeChildren.size,
    );
    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutCapture.add(chunk);
      completionScanner.add(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => { stderrCapture.add(chunk); });
    const timer = setTimeout(() => {
      timedOut = true;
      requestTermination();
    }, timeoutMs);
    const abort = (): void => requestTermination();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) requestTermination();
    child.once("error", (error) => { spawnError = error.message; });
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      state.activeChildren.delete(child);
      clearTimeout(timer);
      if (forceTimer !== undefined) clearTimeout(forceTimer);
      options.signal?.removeEventListener("abort", abort);
      const completionResult = reconcile_external_launcher_completion(
        completionScanner.finish(),
        selectedTarget,
      );
      const stdout = stdoutCapture.text();
      const stderr = append_protocol_error(stderrCapture.text(), completionResult.error);
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
        ...(completionResult.completion === undefined ? {} : { completion: completionResult.completion }),
        ...(completionResult.error === undefined ? {} : { completionError: completionResult.error }),
        ...(forceKilled ? { forceKilled: true } : {}),
        invocationKind: invocation.kind,
        ok: exitCode === 0
          && signal === null
          && spawnError === undefined
          && !timedOut
          && !terminationRequested
          && completionResult.error === undefined,
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
      for (const terminate of state.activeChildren.values()) terminate();
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
