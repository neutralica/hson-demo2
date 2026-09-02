import { spawn, type ChildProcess } from "node:child_process";

export type NodeProcessInvocation = Readonly<{
  cwd: string;
  command: string;
  args: readonly string[];
  environment: Readonly<Record<string, string>>;
  timeoutMs: number;
}>;

export type NodeProcessResult = Readonly<{
  stdout: string;
  stderr: string;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  timedOut: boolean;
  cancelled: boolean;
  /** A configured stream bound was crossed and termination began immediately. */
  outputLimitExceeded: boolean;
  forceKilled: boolean;
  spawnError?: string;
  ok: boolean;
}>;

export type NodeProcessExecution = Readonly<{
  result: Promise<NodeProcessResult>;
  terminate(): void;
}>;

export type NodeProcessSupervisor = Readonly<{
  start(
    invocation: NodeProcessInvocation,
    options?: Readonly<{
      signal?: AbortSignal;
      generation?: number;
      observeStdoutChunk?: (chunk: Buffer) => void;
      observeStderrChunk?: (chunk: Buffer) => void;
    }>,
  ): NodeProcessExecution;
  dispose(): void;
  generation(): number;
  metrics(): Readonly<{
    activeChildren: number;
    maximumObservedConcurrentChildren: number;
  }>;
  resetMetrics(): void;
}>;

type OutputSnapshot = Readonly<{
  text: string;
  totalBytes: number;
  truncated: boolean;
}>;

export class BoundedOutputCapture {
  readonly #headLimit: number;
  readonly #tailLimit: number;
  readonly #full: Buffer[] = [];
  #fullBytes = 0;
  #head = Buffer.alloc(0);
  #tail = Buffer.alloc(0);
  #totalBytes = 0;
  #truncated = false;

  constructor(
    readonly limitBytes: number,
    readonly truncationMarker: string,
  ) {
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
    this.#tail = Buffer.concat([this.#tail, chunk]);
    if (this.#tail.length > this.#tailLimit) {
      this.#tail = this.#tail.subarray(this.#tail.length - this.#tailLimit);
    }
  }

  snapshot(): OutputSnapshot {
    if (!this.#truncated) {
      return Object.freeze({
        text: Buffer.concat(this.#full).toString("utf8"),
        totalBytes: this.#totalBytes,
        truncated: false,
      });
    }
    const omitted = Math.max(0, this.#totalBytes - this.#head.length - this.#tail.length);
    return Object.freeze({
      text: `${this.#head.toString("utf8")}\n${this.truncationMarker} ${omitted} bytes omitted\n${this.#tail.toString("utf8")}`,
      totalBytes: this.#totalBytes,
      truncated: true,
    });
  }
}

function terminate_process_tree(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  if (process.platform !== "win32") {
    try { process.kill(-child.pid, signal); } catch { child.kill(signal); }
    return;
  }
  child.kill(signal);
}

/** A detached Unix child leads the process group that this supervisor owns.
 * Signal zero is a non-destructive liveness probe: ESRCH means the group is
 * gone; success and EPERM both mean that it still exists. */
function owned_process_group_exists(child: ChildProcess): boolean {
  if (process.platform === "win32" || child.pid === undefined) return false;
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

export function create_node_process_supervisor(configuration: Readonly<{
  stdoutLimitBytes: number;
  stderrLimitBytes: number;
  truncationMarker: string;
  terminationGraceMs: number;
  /** Existing launchers inherit; isolated commands use an allow-list environment. */
  environmentMode?: "inherit" | "replace";
}>): NodeProcessSupervisor {
  const activeChildren = new Map<ChildProcess, () => void>();
  let maximumObservedConcurrentChildren = 0;
  let generation = 0;

  return Object.freeze({
    start(invocation, options = {}) {
      if (options.generation !== undefined && options.generation !== generation) {
        throw new Error("Node process execution was cancelled before start.");
      }
      const startedAt = performance.now();
      const stdoutCapture = new BoundedOutputCapture(configuration.stdoutLimitBytes, configuration.truncationMarker);
      const stderrCapture = new BoundedOutputCapture(configuration.stderrLimitBytes, configuration.truncationMarker);
      let timedOut = false;
      let cancelled = false;
      let outputLimitExceeded = false;
      let forceKilled = false;
      let spawnError: string | undefined;
      let settled = false;
      let terminationRequested = false;
      let forceTimer: ReturnType<typeof setTimeout> | undefined;
      let groupProbeTimer: ReturnType<typeof setInterval> | undefined;
      let settlementFailureTimer: ReturnType<typeof setTimeout> | undefined;
      let stdioSettlementTimer: ReturnType<typeof setTimeout> | undefined;
      let stdioSettlementCheck: ReturnType<typeof setImmediate> | undefined;
      let parentClosed = false;
      let parentExited = false;
      let stdoutEnded = false;
      let stderrEnded = false;
      let stdioForcedClosed = false;
      let parentExitCode: number | null = null;
      let parentSignal: NodeJS.Signals | null = null;
      const child = spawn(invocation.command, invocation.args, {
        cwd: invocation.cwd,
        env: configuration.environmentMode === "replace"
          ? { ...invocation.environment, FORCE_COLOR: "0", NO_COLOR: "1" }
          : { ...process.env, ...invocation.environment, FORCE_COLOR: "0", NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      });
      stdoutEnded = child.stdout === null;
      stderrEnded = child.stderr === null;
      const stdio_settled = (): boolean => (stdoutEnded && stderrEnded) || stdioForcedClosed;
      const resolve_settlement = (): void => {
        if (settled || (!parentExited && !parentClosed) || !stdio_settled()) return;
        if (owned_process_group_exists(child)) return;
        settled = true;
        activeChildren.delete(child);
        clearTimeout(timeoutTimer);
        if (forceTimer !== undefined) clearTimeout(forceTimer);
        if (groupProbeTimer !== undefined) clearInterval(groupProbeTimer);
        if (settlementFailureTimer !== undefined) clearTimeout(settlementFailureTimer);
        if (stdioSettlementTimer !== undefined) clearTimeout(stdioSettlementTimer);
        if (stdioSettlementCheck !== undefined) clearImmediate(stdioSettlementCheck);
        options.signal?.removeEventListener("abort", abort);
        const stdout = stdoutCapture.snapshot();
        const stderr = stderrCapture.snapshot();
        resolveResult(Object.freeze({
          stdout: stdout.text,
          stderr: stderr.text,
          stdoutBytes: stdout.totalBytes,
          stderrBytes: stderr.totalBytes,
          stdoutTruncated: stdout.truncated,
          stderrTruncated: stderr.truncated,
          exitCode: parentExitCode,
          signal: parentSignal,
          durationMs: performance.now() - startedAt,
          timedOut,
          cancelled,
          outputLimitExceeded,
          forceKilled,
          ...(spawnError === undefined ? {} : { spawnError }),
          ok: parentExitCode === 0 && parentSignal === null && spawnError === undefined && !timedOut && !cancelled && !terminationRequested,
        }));
      };
      const begin_group_probe = (): void => {
        if (process.platform === "win32" || groupProbeTimer !== undefined) return;
        groupProbeTimer = setInterval(resolve_settlement, 25);
      };
      const require_stdio_settlement = (): void => {
        if (settled || stdio_settled() || stdioSettlementTimer !== undefined || stdioSettlementCheck !== undefined) return;
        stdioSettlementTimer = setTimeout(() => {
          stdioSettlementTimer = undefined;
          if (settled || stdio_settled()) return;
          // A heavily loaded event loop can service this overdue timer before
          // polling an EOF that is already ready. Give that poll turn priority;
          // a genuinely inherited open descriptor still has no EOF afterward.
          stdioSettlementCheck = setImmediate(() => {
            stdioSettlementCheck = undefined;
            if (settled || stdio_settled()) {
              resolve_settlement();
              return;
            }
            spawnError ??= "PROCESS_STDIO_SETTLEMENT_FAILED";
            // A descendant outside the owned process group can keep inherited
            // descriptors open after the supervised parent exits. Do not wait
            // for the command timeout or accept the execution as successful.
            child.stdout?.destroy();
            child.stderr?.destroy();
            stdioForcedClosed = true;
            resolve_settlement();
          });
        }, Math.max(1_000, configuration.terminationGraceMs));
      };
      const terminate = (): void => {
        if (terminationRequested || settled) return;
        terminationRequested = true;
        terminate_process_tree(child, "SIGTERM");
        begin_group_probe();
        forceTimer = setTimeout(() => {
          if (settled) return;
          if (owned_process_group_exists(child)) {
            forceKilled = true;
            terminate_process_tree(child, "SIGKILL");
            // SIGKILL delivery is not proof of group settlement.  Leave the
            // result pending until the non-destructive group probe observes it.
            settlementFailureTimer = setTimeout(() => {
              if (settled) return;
              spawnError ??= "PROCESS_TREE_SETTLEMENT_FAILED";
              // This is an explicit non-success terminal failure if the OS
              // cannot confirm disappearance within the bounded wait.
              settled = true;
              activeChildren.delete(child);
              clearTimeout(timeoutTimer);
              if (groupProbeTimer !== undefined) clearInterval(groupProbeTimer);
              if (stdioSettlementTimer !== undefined) clearTimeout(stdioSettlementTimer);
              if (stdioSettlementCheck !== undefined) clearImmediate(stdioSettlementCheck);
              options.signal?.removeEventListener("abort", abort);
              const stdout = stdoutCapture.snapshot();
              const stderr = stderrCapture.snapshot();
              resolveResult(Object.freeze({ stdout: stdout.text, stderr: stderr.text, stdoutBytes: stdout.totalBytes, stderrBytes: stderr.totalBytes, stdoutTruncated: stdout.truncated, stderrTruncated: stderr.truncated, exitCode: parentExitCode, signal: parentSignal, durationMs: performance.now() - startedAt, timedOut, cancelled, outputLimitExceeded, forceKilled, spawnError, ok: false }));
            }, Math.max(1_000, configuration.terminationGraceMs));
          }
          resolve_settlement();
        }, configuration.terminationGraceMs);
      };
      activeChildren.set(child, terminate);
      maximumObservedConcurrentChildren = Math.max(maximumObservedConcurrentChildren, activeChildren.size);
      child.stdout?.on("data", (chunk: Buffer) => {
        stdoutCapture.add(chunk);
        options.observeStdoutChunk?.(chunk);
        if (stdoutCapture.snapshot().truncated) {
          outputLimitExceeded = true;
          terminate();
        }
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderrCapture.add(chunk);
        options.observeStderrChunk?.(chunk);
        if (stderrCapture.snapshot().truncated) {
          outputLimitExceeded = true;
          terminate();
        }
      });
      child.stdout?.once("end", () => {
        stdoutEnded = true;
        resolve_settlement();
      });
      child.stderr?.once("end", () => {
        stderrEnded = true;
        resolve_settlement();
      });
      const timeoutTimer = setTimeout(() => {
        timedOut = true;
        terminate();
      }, invocation.timeoutMs);
      const abort = (): void => {
        cancelled = true;
        terminate();
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      if (options.signal?.aborted) abort();

      let resolveResult!: (result: NodeProcessResult) => void;
      const result = new Promise<NodeProcessResult>((resolve) => {
        resolveResult = resolve;
        child.once("error", (error) => { spawnError = error.message; });
        child.once("exit", (exitCode, signal) => {
          if (settled) return;
          parentExited = true;
          parentExitCode = exitCode;
          parentSignal = signal;
          // `close` aggregates the process handle and stdio close callbacks,
          // but stream EOF is tracked independently. Start the bounded policy
          // as soon as exit is observed so an inherited pipe cannot hang it.
          if (owned_process_group_exists(child) && !terminationRequested) terminate();
          begin_group_probe();
          require_stdio_settlement();
          resolve_settlement();
        });
        child.once("close", (exitCode, signal) => {
          if (settled) return;
          parentClosed = true;
          if (!parentExited) {
            parentExitCode = exitCode;
            parentSignal = signal;
          }
          // A normal parent exit may still leave processes in the owned group.
          // Treat it as a tree termination, not as successful completion.
          if (owned_process_group_exists(child) && !terminationRequested) terminate();
          begin_group_probe();
          resolve_settlement();
        });
      });
      return Object.freeze({ result, terminate });
    },
    dispose() {
      generation += 1;
      for (const terminate of activeChildren.values()) terminate();
    },
    generation: () => generation,
    metrics: () => Object.freeze({ activeChildren: activeChildren.size, maximumObservedConcurrentChildren }),
    resetMetrics() {
      if (activeChildren.size !== 0) throw new Error("Cannot reset process supervisor metrics while children are active.");
      maximumObservedConcurrentChildren = 0;
    },
  });
}
