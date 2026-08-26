import { createHash } from "node:crypto";
import { access, readFile, realpath } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";
import {
  hson_live_test_launchers,
  type HsonLiveTestLauncher,
} from "hson-live/test-launchers";
import type { TestCapability, TestCollection, TestSubject } from "../../../../src/shared/testing/test-contracts";
import type { ExternalLibraryLauncherTarget } from "../../../../src/shared/testing/external-launcher-contract";
import type { TestSuiteDescriptor } from "../../../../src/shared/testing/test-contracts";
import { validate_test_suite_id } from "../../../../src/shared/testing/test-identity";
import {
  BoundedOutputCapture,
  create_node_process_supervisor,
  type NodeProcessResult,
  type NodeProcessSupervisor,
} from "./node-process-supervisor";

export const EXTERNAL_LIBRARY_LAUNCHER_TIMEOUT_MS = 120_000;
export const EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS = 1_000;
export const EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES = 256 * 1024;
export const EXTERNAL_LIBRARY_LAUNCHER_STDERR_LIMIT_BYTES = 256 * 1024;
export const EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER = "<HSON_LIVE_TEST_OUTPUT_TRUNCATED>";
export const HSON_LIVE_TEST_COMPLETION_PREFIX = "<HSON_LIVE_TEST_COMPLETION>";
export const HSON_LIVE_TEST_COMPLETION_VERSION = 1;
const COMPLETION_LINE_LIMIT = 16 * 1024;
export const NODE_TSX_IMPORT_PATH = fileURLToPath(import.meta.resolve("tsx"));

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
  /** Untouched, bounded process stdout, including protocol control frames. */
  stdout: string;
  /** Bounded human stdout with completion control frames removed. */
  ordinaryStdout: string;
  stderr: string;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  timedOut: boolean;
  spawnError?: string;
  completion?: ExternalLibraryLauncherCompletion;
  completionError?: string;
  forceKilled?: boolean;
  cancelled?: boolean;
  completionAcceptedBeforeCancellation?: boolean;
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
  readonly processSupervisor: NodeProcessSupervisor;
  readonly activeLaunchers: Map<string, Promise<ExternalLibraryLauncherResult>>;
  readonly activeCommands: Map<string, Promise<SupervisedNodeCommandResult>>;
  directLauncherStarts: number;
  packageScriptStarts: number;
  commandStarts: number;
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
  /** Deterministic process-boundary certificate hook; receives raw chunks. */
  observeStdoutChunk?: (text: string) => void;
}>;

export type SupervisedNodeCommand = Readonly<{
  id: string;
  cwd: string;
  command: string;
  args: readonly string[];
  environment: Readonly<Record<string, string>>;
  timeoutMs: number;
}>;

export type SupervisedNodeCommandResult = NodeProcessResult & Readonly<{ id: string }>;

export type ExternalLibraryLauncherService = Readonly<{
  run(
    availability: ExternalLibraryLauncherAvailability,
    targetId: string,
    options?: ExternalLibraryLauncherRunOptions,
  ): Promise<ExternalLibraryLauncherResult>;
  runCommand(
    command: SupervisedNodeCommand,
    options?: Readonly<{
      signal?: AbortSignal;
      terminationGeneration?: number;
      observeStdoutChunk?: (text: string) => void;
      observeStderrChunk?: (text: string) => void;
    }>,
  ): Promise<SupervisedNodeCommandResult>;
  readonly processSupervisor: NodeProcessSupervisor;
  terminate(): void;
  terminationGeneration(): number;
  resetMetrics(): void;
  metrics(): Readonly<{
    activeChildren: number;
    maximumObservedConcurrentChildren: number;
    directLauncherStarts: number;
    packageScriptStarts: number;
    commandStarts: number;
  }>;
}>;

function make_external_library_launcher_state(): ExternalLibraryLauncherState {
  return {
    processSupervisor: create_node_process_supervisor({
      stdoutLimitBytes: EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES,
      stderrLimitBytes: EXTERNAL_LIBRARY_LAUNCHER_STDERR_LIMIT_BYTES,
      truncationMarker: EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER,
      terminationGraceMs: EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS,
    }),
    activeLaunchers: new Map(),
    activeCommands: new Map(),
    directLauncherStarts: 0,
    packageScriptStarts: 0,
    commandStarts: 0,
  };
}

const SUBJECTS: Readonly<Record<HsonLiveTestLauncher["subject"], TestSubject>> = Object.freeze({
  Transform: "transform",
  LiveTree: "livetree",
  LiveMap: "livemap",
  Reflect: "reflect",
  LiveHost: "livehost",
  Locus: "livehost",
  Core: "integration",
});

const SEMANTIC_SUBJECT_OVERRIDES: Readonly<Record<string, TestSubject>> = Object.freeze({
  "core.hson-number": "transform",
  "core.canonical-hson-equality": "transform",
});

const TSX_PARITY_MANIFEST_FINGERPRINT =
  "f3ed6b6a64676c54b8b0f39a8829d5b2040ebdfe9c5d4b1d8f65aa492693b164";

function launcher_manifest_fingerprint(): string {
  return createHash("sha256").update(hson_live_test_launchers.map((launcher) => [
    launcher.id,
    launcher.repositoryModule,
    launcher.packageScript,
    launcher.runtime,
  ].join("|")).join("\n")).digest("hex");
}

function tsx_invocation(
  launcher: HsonLiveTestLauncher,
  fallback?: ExternalLibraryLauncherInvocation,
): ExternalLibraryLauncherInvocation {
  return Object.freeze({
    kind: "direct",
    command: process.execPath,
    args: Object.freeze(["--import", NODE_TSX_IMPORT_PATH, launcher.repositoryModule]),
    env: Object.freeze({ TS_NODE_TRANSPILE_ONLY: "true" }),
    ...(fallback === undefined ? {} : { fallback }),
  });
}

const SEMANTIC_SUITE_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  "core.hson-number": "transform/hson-number",
  "core.canonical-hson-equality": "transform/canonical-hson-equality",
  "core.public-boundaries": "integration/public-boundaries",
});

function semantic_suite_id(launcher: HsonLiveTestLauncher): string {
  const explicit = SEMANTIC_SUITE_OVERRIDES[launcher.id];
  if (explicit !== undefined) return validate_test_suite_id(explicit);
  const subject = SUBJECTS[launcher.subject];
  const pieces = launcher.id.split(".");
  const leaf = pieces[0] === subject || pieces[0] === "core" || pieces[0] === "diagnostics"
    ? pieces.slice(1)
    : pieces;
  return validate_test_suite_id([subject, ...leaf].join("/"));
}

function semantic_subject(launcher: HsonLiveTestLauncher): TestSubject {
  return SEMANTIC_SUBJECT_OVERRIDES[launcher.id] ?? SUBJECTS[launcher.subject];
}

export function external_library_target_id(launcherId: string): string {
  const launcher = hson_live_test_launchers.find((candidate) => candidate.id === launcherId);
  if (launcher === undefined) throw new Error(`Unknown hson-live launcher ID: ${launcherId}`);
  return semantic_suite_id(launcher);
}

function launcher_requirements(runtime: HsonLiveTestLauncher["runtime"]): readonly TestCapability[] {
  if (runtime === "node") return Object.freeze(["javascript", "node"]);
  if (runtime === "node-synthetic-dom") return Object.freeze(["javascript", "node", "synthetic-dom"]);
  return Object.freeze(["javascript", "node", "websocket"]);
}

function target(launcher: HsonLiveTestLauncher, order: number): ExternalLibraryLauncherTarget {
  return Object.freeze({
    id: external_library_target_id(launcher.id),
    launcherId: launcher.id,
    sourceRef: `hson-live:${launcher.id}`,
    subject: semantic_subject(launcher),
    displayName: launcher.displayName,
    runtime: launcher.runtime,
    collections: Object.freeze(launcher.id === "core.public-boundaries" ? ["dev"] as const : []),
    tags: Object.freeze([...launcher.collections]),
    requirements: launcher_requirements(launcher.runtime),
    order,
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
  for (const [order, launcher] of hson_live_test_launchers.entries()) {
    const moduleExists = await exists(join(repositoryRoot, launcher.repositoryModule));
    const scriptExists = typeof scripts[launcher.packageScript] === "string";
    if (moduleExists && scriptExists) {
      const selectedTarget = target(launcher, order);
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

export function resolve_external_launcher_binding(
  availability: ExternalLibraryLauncherAvailability,
  descriptor: TestSuiteDescriptor,
): ExternalLibraryLauncherTarget {
  if (descriptor.executionShape !== "opaque-aggregate" || descriptor.provenance !== "hson-live"
    || descriptor.sourceRef === undefined || !descriptor.sourceRef.startsWith("hson-live:")) {
    throw new Error(`HOSTED_TEST_OPAQUE_DESCRIPTOR_INVALID: ${descriptor.id} has no valid hson-live sourceRef binding.`);
  }
  const matches = availability.targets.filter((target) => target.sourceRef === descriptor.sourceRef);
  if (matches.length !== 1) {
    throw new Error(
      `HOSTED_TEST_OPAQUE_BINDING_INVALID: ${descriptor.id} sourceRef "${descriptor.sourceRef}" resolved to ${matches.length} launchers.`,
    );
  }
  const target = matches[0]!;
  if (target.id !== descriptor.id || target.displayName !== descriptor.title
    || target.subject !== descriptor.subject) {
    throw new Error(`HOSTED_TEST_OPAQUE_BINDING_MISMATCH: ${descriptor.id} binding disagrees with the accepted catalog descriptor.`);
  }
  return target;
}

type CompletionScan = Readonly<{
  records: readonly unknown[];
  malformedRecords: number;
  trailingOutput: boolean;
  ordinaryStdout: string;
}>;

class CompletionScanner {
  readonly #decoder = new StringDecoder("utf8");
  readonly #records: unknown[] = [];
  #pending = "";
  #discardingLongLine = false;
  #malformedRecords = 0;
  #sawCompletionLine = false;
  #trailingOutput = false;
  readonly #ordinaryOutput = new BoundedOutputCapture(
    EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES,
    EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER,
  );

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
      ordinaryStdout: this.#ordinaryOutput.snapshot().text,
    });
  }

  snapshot(): CompletionScan {
    return Object.freeze({
      records: Object.freeze([...this.#records]),
      malformedRecords: this.#malformedRecords,
      trailingOutput: this.#trailingOutput,
      ordinaryStdout: this.#ordinaryOutput.snapshot().text,
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
    this.#ordinaryOutput.add(Buffer.from(`${rawLine}\n`, "utf8"));
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
  return Object.freeze({ completion });
}

async function run_supervised_node_command_with_state(
  state: ExternalLibraryLauncherState,
  invocation: SupervisedNodeCommand,
  options: Readonly<{
    signal?: AbortSignal;
    terminationGeneration?: number;
    observeStdoutChunk?: (text: string) => void;
    observeStderrChunk?: (text: string) => void;
  }> = {},
): Promise<SupervisedNodeCommandResult> {
  if (options.terminationGeneration !== undefined && options.terminationGeneration !== state.processSupervisor.generation()) {
    throw new Error(`Supervised Node command was cancelled before start: ${invocation.id}`);
  }
  const active = state.activeCommands.get(invocation.id);
  if (active !== undefined) return active;
  state.commandStarts += 1;
  const processExecution = state.processSupervisor.start({
    cwd: invocation.cwd,
    command: invocation.command,
    args: invocation.args,
    environment: invocation.environment,
    timeoutMs: invocation.timeoutMs,
  }, {
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.terminationGeneration === undefined ? {} : { generation: options.terminationGeneration }),
    ...(options.observeStdoutChunk === undefined ? {} : {
      observeStdoutChunk: (chunk: Buffer) => options.observeStdoutChunk?.(chunk.toString("utf8")),
    }),
    ...(options.observeStderrChunk === undefined ? {} : {
      observeStderrChunk: (chunk: Buffer) => options.observeStderrChunk?.(chunk.toString("utf8")),
    }),
  });
  const execution = processExecution.result.then((result) => Object.freeze({ id: invocation.id, ...result }));
  state.activeCommands.set(invocation.id, execution);
  return execution.finally(() => state.activeCommands.delete(invocation.id));
}

async function run_external_library_launcher_with_state(
  state: ExternalLibraryLauncherState,
  availability: ExternalLibraryLauncherAvailability,
  targetId: string,
  options: ExternalLibraryLauncherRunOptions = {},
): Promise<ExternalLibraryLauncherResult> {
  if (options.terminationGeneration !== undefined && options.terminationGeneration !== state.processSupervisor.generation()) {
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

  const completionScanner = new CompletionScanner();
  let cancelled = false;
  let terminationRequested = false;
  let completionAcceptedBeforeCancellation: ExternalLibraryLauncherCompletion | undefined;
  const processExecution = state.processSupervisor.start({
    cwd: availability.repositoryRoot,
    command: invocation.command,
    args: invocation.args,
    environment: invocation.env,
    timeoutMs,
  }, {
    observeStdoutChunk(chunk) {
      completionScanner.add(chunk);
      options.observeStdoutChunk?.(chunk.toString("utf8"));
    },
  });
  const abort = (): void => {
    const observed = reconcile_external_launcher_completion(completionScanner.snapshot(), selectedTarget);
    if (observed.error === undefined && observed.completion !== undefined) {
      completionAcceptedBeforeCancellation = observed.completion;
    } else {
      cancelled = true;
    }
    terminationRequested = true;
    processExecution.terminate();
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const execution = processExecution.result.then((processResult): ExternalLibraryLauncherResult => {
    options.signal?.removeEventListener("abort", abort);
    const completionScan = completionScanner.finish();
    const completionResult: Readonly<{ completion?: ExternalLibraryLauncherCompletion; error?: string }> = completionAcceptedBeforeCancellation === undefined
      ? reconcile_external_launcher_completion(completionScan, selectedTarget)
      : Object.freeze({ completion: completionAcceptedBeforeCancellation });
    return Object.freeze({
      target: selectedTarget,
      stdout: processResult.stdout,
      ordinaryStdout: completionScan.ordinaryStdout,
      stderr: processResult.stderr,
      stdoutBytes: processResult.stdoutBytes,
      stderrBytes: processResult.stderrBytes,
      stdoutTruncated: processResult.stdoutTruncated,
      stderrTruncated: processResult.stderrTruncated,
      exitCode: processResult.exitCode,
      signal: processResult.signal,
      durationMs: processResult.durationMs,
      timedOut: processResult.timedOut,
      ...(processResult.spawnError === undefined ? {} : { spawnError: processResult.spawnError }),
      ...(completionResult.completion === undefined ? {} : { completion: completionResult.completion }),
      ...(completionResult.error === undefined ? {} : { completionError: completionResult.error }),
      ...(processResult.forceKilled ? { forceKilled: true } : {}),
      ...(cancelled ? { cancelled: true } : {}),
      ...(completionAcceptedBeforeCancellation === undefined ? {} : { completionAcceptedBeforeCancellation: true }),
      invocationKind: invocation.kind,
      ok: completionAcceptedBeforeCancellation !== undefined
        ? completionAcceptedBeforeCancellation.failed === 0
        : processResult.exitCode === 0
        && processResult.signal === null
        && processResult.spawnError === undefined
        && !processResult.timedOut
        && !terminationRequested
        && completionResult.error === undefined
        && completionResult.completion?.failed === 0,
    });
  });
  state.activeLaunchers.set(targetId, execution);
  return execution.finally(() => state.activeLaunchers.delete(targetId));
}

export function create_external_library_launcher_service(): ExternalLibraryLauncherService {
  const state = make_external_library_launcher_state();
  return Object.freeze({
    processSupervisor: state.processSupervisor,
    run: (availability, targetId, options) =>
      run_external_library_launcher_with_state(state, availability, targetId, options ?? {}),
    runCommand: (command, options) => run_supervised_node_command_with_state(state, command, options),
    terminate() {
      state.processSupervisor.dispose();
    },
    terminationGeneration: () => state.processSupervisor.generation(),
    resetMetrics() {
      if (state.processSupervisor.metrics().activeChildren !== 0) {
        throw new Error("Cannot reset external launcher metrics while children are active.");
      }
      state.processSupervisor.resetMetrics();
      state.directLauncherStarts = 0;
      state.packageScriptStarts = 0;
      state.commandStarts = 0;
    },
    metrics: () => {
      const processMetrics = state.processSupervisor.metrics();
      return Object.freeze({
        activeChildren: processMetrics.activeChildren,
        maximumObservedConcurrentChildren: processMetrics.maximumObservedConcurrentChildren,
        directLauncherStarts: state.directLauncherStarts,
        packageScriptStarts: state.packageScriptStarts,
        commandStarts: state.commandStarts,
      });
    },
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
