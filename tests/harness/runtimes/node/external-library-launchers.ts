import { access, readFile, realpath, readdir } from "node:fs/promises";
import { dirname, join, parse, relative } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { TestCapability, TestCollection, TestSubject } from "../../../../src/shared/testing/test-contracts";
import type { ExternalLibraryLauncherTarget, HsonLiveExecutableRuntime } from "../../../../src/shared/testing/external-launcher-contract";
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
export const HSON_LIVE_TEST_EVENT_PREFIX = "<HSON_TEST_EVENT>";
const CONTROL_LINE_LIMIT = 16 * 1024;
export const NODE_TSX_IMPORT_PATH = fileURLToPath(import.meta.resolve("tsx"));
type ExternalChildStatus = "pass" | "fail" | "skip" | "unsupported" | "cancelled" | "error";

type ExternalLibraryLauncherInvocation = Readonly<{
  kind: "direct";
  command: string;
  args: readonly string[];
  env: Readonly<Record<string, string>>;
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
  /** Bounded human stdout with test-event control frames removed. */
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
  events?: readonly ExternalLibraryChildEvent[];
  terminalStatus?: ExternalChildStatus;
  protocolError?: string;
  forceKilled?: boolean;
  cancelled?: boolean;
  terminalAcceptedBeforeCancellation?: boolean;
  invocationKind: "direct";
  ok: boolean;
}>;

export type ExternalLibraryChildEvent = Readonly<
  | { t: "case_begin"; caseId: string; name: string }
  | { t: "diagnostic"; caseId: string; kind: string; message: string }
  | { t: "case_end"; caseId: string; name: string; status: ExternalChildStatus }
  | { t: "terminal"; suiteId: string; status: ExternalChildStatus }
>;
type ExternalLibraryLauncherState = {
  readonly processSupervisor: NodeProcessSupervisor;
  readonly activeLaunchers: Map<string, Promise<ExternalLibraryLauncherResult>>;
  readonly activeCommands: Map<string, Promise<SupervisedNodeCommandResult>>;
  directLauncherStarts: number;
  commandStarts: number;
};

export type ExternalLibraryLauncherRunOptions = Readonly<{
  timeoutMs?: number;
  signal?: AbortSignal;
  command?: string;
  terminationGeneration?: number;
  forcePlainNode?: boolean;
  /** Deterministic process-boundary test hook; receives raw chunks. */
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
    commandStarts: 0,
  };
}

const SUBJECTS: Readonly<Record<string, TestSubject>> = Object.freeze({ Transform: "transform", LiveTree: "livetree", LiveMap: "livemap", Reflect: "reflect", LiveHost: "livehost", Locus: "livehost", Core: "integration" });

const SEMANTIC_SUBJECT_OVERRIDES: Readonly<Record<string, TestSubject>> = Object.freeze({
  "core.hson-number": "transform",
  "core.canonical-hson-equality": "transform",
});

function tsx_invocation(launcher: ExternalLibraryLauncherTarget): ExternalLibraryLauncherInvocation {
  return Object.freeze({
    kind: "direct",
    command: process.execPath,
    args: Object.freeze(["--import", NODE_TSX_IMPORT_PATH, launcher.sourceFile]),
    env: Object.freeze({ TS_NODE_TRANSPILE_ONLY: "true" }),
  });
}

const SEMANTIC_SUITE_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  "core.hson-number": "transform/hson-number",
  "core.canonical-hson-equality": "transform/canonical-hson-equality",
  "core.public-boundaries": "integration/public-boundaries",
});

function semantic_suite_id(metadata: Readonly<{ id: string; category: string }>): string {
  const explicit = SEMANTIC_SUITE_OVERRIDES[metadata.id];
  if (explicit !== undefined) return validate_test_suite_id(explicit);
  const subject = SUBJECTS[metadata.category] ?? "integration";
  const pieces = metadata.id.split(".");
  const leaf = pieces[0] === subject || pieces[0] === "core" || pieces[0] === "diagnostics"
    ? pieces.slice(1)
    : pieces;
  return validate_test_suite_id([subject, ...leaf].join("/"));
}
function semantic_subject(metadata: Readonly<{ id: string; category: string }>): TestSubject { return SEMANTIC_SUBJECT_OVERRIDES[metadata.id] ?? SUBJECTS[metadata.category] ?? "integration"; }

export function external_library_target_id(launcherId: string): string {
  return semantic_suite_id({ id: launcherId, category: launcherId.split(".")[0] === "livetree" ? "LiveTree" : launcherId.split(".")[0] === "livemap" ? "LiveMap" : launcherId.split(".")[0] === "reflect" ? "Reflect" : launcherId.split(".")[0] === "locus" ? "Locus" : launcherId.split(".")[0] === "transform" ? "Transform" : "Core" });
}

function launcher_requirements(runtime: HsonLiveExecutableRuntime): readonly TestCapability[] {
  if (runtime === "node") return Object.freeze(["javascript", "node"]);
  if (runtime === "node-synthetic-dom") return Object.freeze(["javascript", "node", "synthetic-dom"]);
  return Object.freeze(["javascript", "node", "websocket"]);
}

function target(launcher: Readonly<{ id: string; title: string; category: string; runtime: HsonLiveExecutableRuntime; tags: readonly string[]; sourceFile: string }>, order: number): ExternalLibraryLauncherTarget {
  return Object.freeze({
    id: semantic_suite_id(launcher),
    launcherId: launcher.id,
    sourceRef: `hson-live:${launcher.sourceFile}`,
    category: launcher.category,
    subject: semantic_subject(launcher),
    displayName: launcher.title,
    runtime: launcher.runtime,
    collections: Object.freeze([]), tags: Object.freeze([...launcher.tags]), sourceFile: launcher.sourceFile,
    requirements: launcher_requirements(launcher.runtime),
    order,
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

export type HsonLiveSourceMetadata = Readonly<{ id: string; title: string; category: string; runtime: HsonLiveExecutableRuntime; tags: readonly string[]; sourceFile: string }>;
const RUNTIMES = new Set<HsonLiveExecutableRuntime>(["node", "node-synthetic-dom", "node-websocket", "node-real-websocket" as HsonLiveExecutableRuntime, "node-real-websocket-process" as HsonLiveExecutableRuntime]);
async function source_files(root: string): Promise<string[]> { const entries = await readdir(root, { withFileTypes: true }); const nested = await Promise.all(entries.map(async entry => entry.isDirectory() ? source_files(join(root, entry.name)) : /\.(?:m?[jt]s)$/.test(entry.name) ? [join(root, entry.name)] : [])); return nested.flat(); }
function frozen_argument(node: ts.Expression): ts.Expression | undefined {
  return ts.isCallExpression(node)
    && node.arguments.length === 1
    && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression)
    && node.expression.expression.text === "Object"
    && node.expression.name.text === "freeze"
    ? node.arguments[0]
    : undefined;
}
function literal_string_property(object: ts.ObjectLiteralExpression, name: string, sourceFile: string): string {
  const property = object.properties.find((entry): entry is ts.PropertyAssignment => ts.isPropertyAssignment(entry)
    && ((ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) && entry.name.text === name));
  if (property === undefined || !ts.isStringLiteral(property.initializer) || property.initializer.text.length === 0) {
    throw new Error(`HSON_LIVE_TEST_METADATA_INVALID:${sourceFile}: ${name} must be a non-empty string literal.`);
  }
  return property.initializer.text;
}
export function parse_hson_live_test_metadata_source(source: string, sourceFile: string): HsonLiveSourceMetadata | undefined {
  const tree = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true);
  const declarations = tree.statements.flatMap((statement) => {
    if (!ts.isVariableStatement(statement)
      || !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      || (statement.declarationList.flags & ts.NodeFlags.Const) === 0) return [];
    return statement.declarationList.declarations.filter((declaration) => ts.isIdentifier(declaration.name)
      && declaration.name.text === "HSON_LIVE_TEST_METADATA");
  });
  if (declarations.length === 0) return undefined;
  if (declarations.length !== 1) throw new Error(`HSON_LIVE_TEST_METADATA_INVALID:${sourceFile}: metadata must be exported exactly once.`);
  const initializer = declarations[0]!.initializer;
  const object = initializer === undefined ? undefined : frozen_argument(initializer);
  if (object === undefined || !ts.isObjectLiteralExpression(object)) {
    throw new Error(`HSON_LIVE_TEST_METADATA_INVALID:${sourceFile}: metadata must be a literal Object.freeze object.`);
  }
  const id = literal_string_property(object, "id", sourceFile);
  const title = literal_string_property(object, "title", sourceFile);
  const category = literal_string_property(object, "category", sourceFile);
  const runtime = literal_string_property(object, "runtime", sourceFile) as HsonLiveExecutableRuntime;
  const tagsProperty = object.properties.find((entry): entry is ts.PropertyAssignment => ts.isPropertyAssignment(entry)
    && ((ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) && entry.name.text === "tags"));
  const tagsArgument = tagsProperty === undefined ? undefined : frozen_argument(tagsProperty.initializer);
  if (tagsArgument === undefined || !ts.isArrayLiteralExpression(tagsArgument)
    || tagsArgument.elements.length === 0 || tagsArgument.elements.some((entry) => !ts.isStringLiteral(entry) || entry.text.length === 0)) {
    throw new Error(`HSON_LIVE_TEST_METADATA_INVALID:${sourceFile}: tags must be a non-empty frozen string-literal array.`);
  }
  if (!RUNTIMES.has(runtime)) throw new Error(`HSON_LIVE_TEST_METADATA_INVALID:${sourceFile}: unsupported runtime ${runtime}.`);
  return Object.freeze({ id, title, category, runtime, tags: Object.freeze(tagsArgument.elements.map((entry) => (entry as ts.StringLiteral).text)), sourceFile });
}
export async function resolve_external_library_launchers(
  resolvedPackageUrl: string = import.meta.resolve("hson-live"),
): Promise<ExternalLibraryLauncherAvailability> {
  let packagePath: string;
  try {
    packagePath = await realpath(new URL(resolvedPackageUrl));
  } catch (error) {
    return Object.freeze({ targets: Object.freeze([]), unavailable: Object.freeze([{ launcherId: "hson-live", reason: `package resolution failed: ${error instanceof Error ? error.message : String(error)}` }]), invocations: Object.freeze({}) });
  }
  const repositoryRoot = await find_package_root(dirname(packagePath));
  if (repositoryRoot === undefined) {
    return Object.freeze({ targets: Object.freeze([]), unavailable: Object.freeze([{ launcherId: "hson-live", reason: "hson-live package root was not found" }]), invocations: Object.freeze({}) });
  }
  const sources = await source_files(join(repositoryRoot, "tests"));
  const metadata = (await Promise.all(sources.map(async source => parse_hson_live_test_metadata_source(await readFile(source, "utf8"), relative(repositoryRoot, source))))).filter((entry): entry is HsonLiveSourceMetadata => entry !== undefined);
  const ids = new Set<string>(); for (const entry of metadata) { if (ids.has(entry.id)) throw new Error(`HSON_LIVE_TEST_METADATA_DUPLICATE_ID:${entry.id}`); ids.add(entry.id); }
  const targets: ExternalLibraryLauncherTarget[] = [];
  const invocations: Record<string, ExternalLibraryLauncherInvocation> = {};
  for (const [order, entry] of metadata.sort((a, b) => a.id.localeCompare(b.id)).entries()) { const selectedTarget = target(entry, order); targets.push(selectedTarget); invocations[selectedTarget.id] = tsx_invocation(selectedTarget); }
  return Object.freeze({
    repositoryRoot,
    targets: Object.freeze(targets),
    unavailable: Object.freeze([]),
    invocations: Object.freeze(invocations),
  });
}

export function resolve_external_launcher_binding(
  availability: ExternalLibraryLauncherAvailability,
  descriptor: TestSuiteDescriptor,
): ExternalLibraryLauncherTarget {
  if (descriptor.executionShape !== "cases" || descriptor.provenance !== "hson-live"
    || descriptor.sourceRef === undefined || !descriptor.sourceRef.startsWith("hson-live:")) {
    throw new Error(`EXTERNAL_LAUNCHER_DESCRIPTOR_INVALID: ${descriptor.id} has no valid hson-live sourceRef binding.`);
  }
  const matches = availability.targets.filter((target) => target.sourceRef === descriptor.sourceRef);
  if (matches.length !== 1) {
    throw new Error(
      `EXTERNAL_LAUNCHER_BINDING_INVALID: ${descriptor.id} sourceRef "${descriptor.sourceRef}" resolved to ${matches.length} launchers.`,
    );
  }
  const target = matches[0]!;
  if (target.id !== descriptor.id || target.displayName !== descriptor.title
    || target.subject !== descriptor.subject) {
    throw new Error(`EXTERNAL_LAUNCHER_BINDING_MISMATCH: ${descriptor.id} binding disagrees with executable metadata.`);
  }
  return target;
}

type ExternalTestEventScan = Readonly<{
  events?: readonly ExternalLibraryChildEvent[];
  ordinaryStdout: string;
  error?: string;
}>;

function child_status(value: unknown): ExternalChildStatus | undefined {
  return value === "pass" || value === "fail" || value === "skip" || value === "unsupported" || value === "cancelled" || value === "error"
    ? value
    : undefined;
}

function derived_child_status(statuses: readonly ExternalChildStatus[]): ExternalChildStatus | undefined {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("cancelled")) return "cancelled";
  if (statuses.includes("pass")) return "pass";
  if (statuses.length > 0 && statuses.every((status) => status === "skip")) return "skip";
  if (statuses.includes("unsupported")) return "unsupported";
  return undefined;
}

class ExternalTestEventScanner {
  readonly #decoder = new StringDecoder("utf8");
  readonly #events: ExternalLibraryChildEvent[] = [];
  readonly #active = new Map<string, string>();
  readonly #completed = new Map<string, ExternalChildStatus>();
  readonly #ordinary = new BoundedOutputCapture(EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES, EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER);
  #pending = "";
  #discardingLongLine = false;
  #terminal: ExternalChildStatus | undefined;
  #error: string | undefined;

  constructor(readonly target: ExternalLibraryLauncherTarget) {}

  add(chunk: Buffer): void { this.#consume(this.#decoder.write(chunk)); }

  snapshot(): ExternalTestEventScan { return this.#result(false); }

  finish(): ExternalTestEventScan {
    this.#consume(this.#decoder.end());
    if (!this.#discardingLongLine && this.#pending.length > 0) {
      if (this.#pending.startsWith(HSON_LIVE_TEST_EVENT_PREFIX)) this.#fail("External launcher emitted a truncated control frame.");
      else this.#ordinary.add(Buffer.from(this.#pending, "utf8"));
    }
    this.#pending = "";
    return this.#result(true);
  }

  #result(final: boolean): ExternalTestEventScan {
    const error = this.#error ?? (final && this.#terminal === undefined ? "External launcher emitted no terminal test event." : undefined);
    return Object.freeze({
      ...(error === undefined && this.#terminal !== undefined ? { events: Object.freeze([...this.#events]) } : {}),
      ordinaryStdout: this.#ordinary.snapshot().text,
      ...(error === undefined ? {} : { error }),
    });
  }

  #fail(message: string): void { this.#error ??= message; }

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
        if (this.#pending.length > CONTROL_LINE_LIMIT) {
          if (this.#pending.startsWith(HSON_LIVE_TEST_EVENT_PREFIX)) this.#fail("External launcher emitted an oversized or truncated control frame.");
          else this.#ordinary.add(Buffer.from(this.#pending, "utf8"));
          this.#pending = "";
          this.#discardingLongLine = true;
        }
        return;
      }
      this.#pending += remaining.slice(0, newline);
      this.#line(this.#pending.replace(/\r$/, ""));
      this.#pending = "";
      remaining = remaining.slice(newline + 1);
    }
  }

  #line(line: string): void {
    if (!line.startsWith(HSON_LIVE_TEST_EVENT_PREFIX)) {
      this.#ordinary.add(Buffer.from(`${line}\n`, "utf8"));
      return;
    }
    if (this.#error !== undefined) return;
    if (this.#terminal !== undefined) { this.#fail("External launcher emitted control data after terminal."); return; }
    let value: Record<string, unknown>;
    try {
      const parsed = JSON.parse(line.slice(HSON_LIVE_TEST_EVENT_PREFIX.length)) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
      value = parsed as Record<string, unknown>;
    } catch { this.#fail("External launcher emitted malformed test event JSON/control frame."); return; }
    const caseId = typeof value.caseId === "string" && value.caseId.length > 0 ? value.caseId : undefined;
    if (value.t === "case_begin") {
      if (caseId === undefined || typeof value.title !== "string" || value.title.length === 0) { this.#fail("External launcher emitted invalid case_begin."); return; }
      if (this.#active.has(caseId) || this.#completed.has(caseId)) { this.#fail(`External launcher emitted duplicate case ID: ${caseId}.`); return; }
      this.#active.set(caseId, value.title); this.#events.push(Object.freeze({ t: "case_begin", caseId, name: value.title })); return;
    }
    if (value.t === "diagnostic") {
      if (caseId === undefined || !this.#active.has(caseId) || typeof value.kind !== "string" || value.kind.length === 0 || typeof value.message !== "string" || value.message.length === 0) { this.#fail("External launcher emitted diagnostic for an impossible case identity."); return; }
      this.#events.push(Object.freeze({ t: "diagnostic", caseId, kind: value.kind, message: value.message })); return;
    }
    if (value.t === "case_end") {
      const status = child_status(value.status);
      if (caseId !== undefined && this.#completed.has(caseId)) { this.#fail(`External launcher emitted duplicate case_end: ${caseId}.`); return; }
      const name = caseId === undefined ? undefined : this.#active.get(caseId);
      if (caseId === undefined || name === undefined || status === undefined) { this.#fail("External launcher emitted case_end without a matching case_begin."); return; }
      this.#active.delete(caseId); this.#completed.set(caseId, status); this.#events.push(Object.freeze({ t: "case_end", caseId, name, status })); return;
    }
    if (value.t === "terminal") {
      const status = child_status(value.status);
      if (value.suiteId !== this.target.launcherId) { this.#fail(`External launcher terminal suite ID mismatch: received ${String(value.suiteId)}, expected ${this.target.launcherId}.`); return; }
      if (status === undefined || this.#active.size > 0) { this.#fail("External launcher emitted invalid terminal with unfinished cases."); return; }
      if (status !== derived_child_status([...this.#completed.values()])) { this.#fail("External launcher terminal status contradicts emitted cases."); return; }
      this.#terminal = status; this.#events.push(Object.freeze({ t: "terminal", suiteId: this.target.launcherId, status })); return;
    }
    this.#fail("External launcher emitted unknown test event discriminator.");
  }
}

/** Validates the child protocol independently of process supervision. */
export function parse_external_test_events(stdout: string, target: ExternalLibraryLauncherTarget): ExternalTestEventScan {
  const scanner = new ExternalTestEventScanner(target);
  scanner.add(Buffer.from(stdout, "utf8"));
  return scanner.finish();
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
  const timeoutMs = options.timeoutMs ?? EXTERNAL_LIBRARY_LAUNCHER_TIMEOUT_MS;
  const active = state.activeLaunchers.get(targetId);
  if (active !== undefined) return active;
  const configuredInvocation = availability.invocations?.[targetId];
  let resolvedInvocation: ExternalLibraryLauncherInvocation;
  if (options.forcePlainNode) {
    resolvedInvocation = Object.freeze({
      kind: "direct",
      command: process.execPath,
      args: Object.freeze([selectedTarget.sourceFile]),
      env: Object.freeze({ TS_NODE_TRANSPILE_ONLY: "true" }),
    });
  } else {
    resolvedInvocation = (
      configuredInvocation
    ) ?? tsx_invocation(selectedTarget);
  }
  const invocation = options.command === undefined
    ? resolvedInvocation
    : Object.freeze({ ...resolvedInvocation, command: options.command });
  state.directLauncherStarts += 1;

  const eventScanner = new ExternalTestEventScanner(selectedTarget);
  let cancelled = false;
  let terminationRequested = false;
  let terminalAcceptedBeforeCancellation = false;
  let eventsAcceptedBeforeCancellation: readonly ExternalLibraryChildEvent[] | undefined;
  const processExecution = state.processSupervisor.start({
    cwd: availability.repositoryRoot,
    command: invocation.command,
    args: invocation.args,
    environment: invocation.env,
    timeoutMs,
  }, {
    observeStdoutChunk(chunk) {
      eventScanner.add(chunk);
      options.observeStdoutChunk?.(chunk.toString("utf8"));
    },
  });
  const abort = (): void => {
    const eventSnapshot = eventScanner.snapshot();
    if (eventSnapshot.error === undefined && eventSnapshot.events !== undefined) {
      eventsAcceptedBeforeCancellation = eventSnapshot.events;
      terminalAcceptedBeforeCancellation = true;
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
    const finishedEvents = eventScanner.finish();
    const eventResult: ExternalTestEventScan = eventsAcceptedBeforeCancellation === undefined
      ? finishedEvents
      : Object.freeze({ events: eventsAcceptedBeforeCancellation, ordinaryStdout: finishedEvents.ordinaryStdout });
    const eventTerminal = eventResult.events?.at(-1);
    const eventFailed = eventResult.events?.some((event) => event.t === "case_end" && (event.status === "fail" || event.status === "error")) === true;
    return Object.freeze({
      target: selectedTarget,
      stdout: processResult.stdout,
      ordinaryStdout: eventResult.ordinaryStdout,
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
      ...(eventResult.events === undefined ? { protocolError: eventResult.error ?? "External launcher protocol rejected." } : { events: eventResult.events }),
      ...(eventTerminal?.t === "terminal" ? { terminalStatus: eventTerminal.status } : {}),
      ...(processResult.outputLimitExceeded ? { protocolError: "External launcher output limit exceeded." } : {}),
      ...(processResult.forceKilled ? { forceKilled: true } : {}),
      ...(cancelled ? { cancelled: true } : {}),
      ...(terminalAcceptedBeforeCancellation ? { terminalAcceptedBeforeCancellation: true } : {}),
      invocationKind: invocation.kind,
      ok: eventResult.events !== undefined
        ? processResult.spawnError === undefined && !processResult.timedOut
          && !processResult.outputLimitExceeded
          && ((eventsAcceptedBeforeCancellation !== undefined) || (processResult.exitCode === 0 && processResult.signal === null && !terminationRequested))
          && !eventFailed && eventTerminal?.t === "terminal"
          && (eventTerminal.status === "pass" || eventTerminal.status === "skip" || eventTerminal.status === "unsupported")
        : false,
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
      state.commandStarts = 0;
    },
    metrics: () => {
      const processMetrics = state.processSupervisor.metrics();
      return Object.freeze({
        activeChildren: processMetrics.activeChildren,
        maximumObservedConcurrentChildren: processMetrics.maximumObservedConcurrentChildren,
        directLauncherStarts: state.directLauncherStarts,
        commandStarts: state.commandStarts,
      });
    },
  });
}
