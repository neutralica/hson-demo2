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

export function create_node_process_supervisor(configuration: Readonly<{
  stdoutLimitBytes: number;
  stderrLimitBytes: number;
  truncationMarker: string;
  terminationGraceMs: number;
  /** Existing launchers inherit; H2 uses an allow-list environment. */
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
      const child = spawn(invocation.command, invocation.args, {
        cwd: invocation.cwd,
        env: configuration.environmentMode === "replace"
          ? { ...invocation.environment, FORCE_COLOR: "0", NO_COLOR: "1" }
          : { ...process.env, ...invocation.environment, FORCE_COLOR: "0", NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      });
      const terminate = (): void => {
        if (terminationRequested || settled) return;
        terminationRequested = true;
        terminate_process_tree(child, "SIGTERM");
        forceTimer = setTimeout(() => {
          if (settled) return;
          forceKilled = true;
          terminate_process_tree(child, "SIGKILL");
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

      const result = new Promise<NodeProcessResult>((resolve) => {
        child.once("error", (error) => { spawnError = error.message; });
        child.once("close", (exitCode, signal) => {
          if (settled) return;
          settled = true;
          activeChildren.delete(child);
          clearTimeout(timeoutTimer);
          if (forceTimer !== undefined) clearTimeout(forceTimer);
          options.signal?.removeEventListener("abort", abort);
          const stdout = stdoutCapture.snapshot();
          const stderr = stderrCapture.snapshot();
          resolve(Object.freeze({
            stdout: stdout.text,
            stderr: stderr.text,
            stdoutBytes: stdout.totalBytes,
            stderrBytes: stderr.totalBytes,
            stdoutTruncated: stdout.truncated,
            stderrTruncated: stderr.truncated,
            exitCode,
            signal,
            durationMs: performance.now() - startedAt,
            timedOut,
            cancelled,
            outputLimitExceeded,
            forceKilled,
            ...(spawnError === undefined ? {} : { spawnError }),
            ok: exitCode === 0 && signal === null && spawnError === undefined && !timedOut && !cancelled && !terminationRequested,
          }));
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
