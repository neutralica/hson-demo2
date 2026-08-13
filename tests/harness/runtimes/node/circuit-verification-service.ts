import { Worker } from "node:worker_threads";
import {
  CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH,
  decode_circuit_verification_progress,
  decode_circuit_verification_request,
  decode_circuit_verification_result,
  type CircuitVerificationEntry,
  type CircuitVerificationProgress,
  type CircuitVerificationProgressListener,
  type CircuitVerificationRequest,
  type CircuitVerificationResult,
  type CircuitVerificationSubmitter,
} from "../../../../src/shared/circuit-verification-contract";

const PROTOCOL_VERSION = 1;
const TOTAL_STAGES = 7;
const WORKER_FAILURE_MESSAGES = Object.freeze({
  CIRCUIT_WORKER_EXECUTION_FAILED: "Worker could not execute the universal Transform circuit.",
  CIRCUIT_WORKER_PROTOCOL_VIOLATION: "Worker received an invalid protocol message.",
  CIRCUIT_WORKER_UNAVAILABLE: "Worker is not ready for this circuit job.",
} as const);
const VERIFICATION_FAILURE_CODES = new Set([
  "CIRCUIT_CANCELLED",
  "CIRCUIT_PREPARE_FAILED",
  "CIRCUIT_SERIALIZATION_FAILED",
  "CIRCUIT_PARSE_FAILED",
  "CIRCUIT_STRICT_COMPARISON_FAILED",
  "CIRCUIT_VERIFICATION_FAILED",
  "CIRCUIT_RESULT_INCOMPLETE",
  "CIRCUIT_RESULT_MATERIALIZATION_FAILED",
]);

type WorkerLike = Readonly<{
  threadId: number;
  postMessage(message: unknown): void;
  on(event: "message", listener: (message: unknown) => void): unknown;
  on(event: "messageerror", listener: () => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "exit", listener: (code: number) => void): unknown;
  terminate(): Promise<number>;
}>;

export class CircuitVerificationServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CircuitVerificationServiceError";
    this.code = code;
  }
}

type Job = {
  readonly id: string;
  readonly request: CircuitVerificationRequest;
  readonly cancellation: Int32Array;
  readonly cancellationBuffer: SharedArrayBuffer;
  readonly enqueuedAt: number;
  onProgress: CircuitVerificationProgressListener | undefined;
  obsolete?: "cancelled" | "superseded";
  lastCompleted: number;
  settled: boolean;
  resolve(result: CircuitVerificationResult): void;
  reject(error: CircuitVerificationServiceError): void;
};

export type CircuitVerificationServiceDiagnostics = Readonly<{
  workerStarts: number;
  workerReplacements: number;
  submitted: number;
  completed: number;
  active: boolean;
  pending: number;
  disposed: boolean;
  workerThreadId?: number;
}>;

export type CircuitVerificationService = CircuitVerificationSubmitter & Readonly<{
  ready(): Promise<void>;
  diagnostics(): CircuitVerificationServiceDiagnostics;
}>;

export type CircuitVerificationServiceOptions = Readonly<{
  maxPending?: number;
  maxWorkerReplacements?: number;
  startupTimeoutMs?: number;
  workerFactory?: () => WorkerLike;
  now?: () => number;
}>;

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact_keys(value: Record<string, unknown>, required: readonly string[]): boolean {
  return Object.keys(value).length === required.length
    && required.every((key) => Object.hasOwn(value, key));
}

function safe_job_id(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function safe_code(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z0-9_]{1,80}$/.test(value);
}

function safe_message(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512;
}

type WorkerProgress = Readonly<{
  stage: "cw-lap-complete" | "ccw-lap-complete" | "comparing";
  completed: number;
  total: number;
  direction?: "cw" | "ccw";
  lap?: number;
}>;

type WorkerCommand =
  | Readonly<{ kind: "initialize"; protocolVersion: 1 }>
  | Readonly<{
      kind: "run";
      jobId: string;
      request: CircuitVerificationRequest;
      cancellation: SharedArrayBuffer;
    }>
  | Readonly<{ kind: "cancel"; jobId: string }>
  | Readonly<{ kind: "dispose" }>;

type WorkerReply =
  | Readonly<{ kind: "initialized"; protocolVersion: 1 }>
  | Readonly<{
      kind: "progress";
      jobId: string;
      panelId: string;
      inputRevision: number;
      progress: WorkerProgress;
    }>
  | Readonly<{
      kind: "complete";
      jobId: string;
      panelId: string;
      inputRevision: number;
      result: CircuitVerificationResult;
    }>
  | Readonly<{
      kind: "failed";
      jobId: string;
      panelId: string;
      inputRevision: number;
      entry: CircuitVerificationEntry;
      code: string;
      message: string;
    }>
  | Readonly<{ kind: "disposed" }>;

function valid_worker_result(result: CircuitVerificationResult): boolean {
  if (result.status === "superseded") return false;
  if (result.status === "verified") {
    return result.failure === undefined
      && typeof result.baselineHson === "string"
      && typeof result.clockwiseFinalHson === "string"
      && typeof result.counterclockwiseFinalHson === "string"
      && typeof result.finalHtml === "string"
      && result.operationCounts.serializations === 24
      && result.operationCounts.parses === 25
      && result.operationCounts.comparisons === 25
      && result.operationCounts.laps === 6
      && result.operationCounts.directions === 2;
  }
  return result.failure !== undefined;
}

function valid_worker_progress(progress: WorkerProgress): boolean {
  if (progress.total !== TOTAL_STAGES) return false;
  if (progress.stage === "comparing") {
    return progress.completed === 6 && progress.direction === undefined && progress.lap === undefined;
  }
  if (progress.direction === undefined || progress.lap === undefined || progress.lap < 1 || progress.lap > 3) return false;
  if (progress.stage === "cw-lap-complete") {
    return progress.direction === "cw" && progress.completed === progress.lap;
  }
  return progress.direction === "ccw" && progress.completed === 3 + progress.lap;
}

function decode_worker_reply(value: unknown): WorkerReply | undefined {
  if (!is_record(value) || typeof value.kind !== "string") return undefined;
  if (value.kind === "initialized") {
    return exact_keys(value, ["kind", "protocolVersion"]) && value.protocolVersion === PROTOCOL_VERSION
      ? { kind: "initialized", protocolVersion: PROTOCOL_VERSION }
      : undefined;
  }
  if (value.kind === "disposed") return exact_keys(value, ["kind"]) ? { kind: "disposed" } : undefined;
  if (value.kind === "failed") {
    const valid = exact_keys(value, ["kind", "jobId", "panelId", "inputRevision", "entry", "code", "message"])
      && safe_job_id(value.jobId)
      && typeof value.panelId === "string"
      && value.panelId.length > 0
      && value.panelId.length <= 128
      && typeof value.inputRevision === "number"
      && Number.isSafeInteger(value.inputRevision)
      && value.inputRevision >= 0
      && (value.entry === "hson" || value.entry === "json" || value.entry === "html")
      && safe_code(value.code)
      && safe_message(value.message);
    if (!valid) return undefined;
    const code = value.code as keyof typeof WORKER_FAILURE_MESSAGES;
    return WORKER_FAILURE_MESSAGES[code] === value.message
      ? {
          kind: "failed",
          jobId: value.jobId as string,
          panelId: value.panelId as string,
          inputRevision: value.inputRevision as number,
          entry: value.entry as CircuitVerificationEntry,
          code,
          message: value.message as string,
        }
      : undefined;
  }
  if (value.kind === "complete") {
    if (
      !exact_keys(value, ["kind", "jobId", "panelId", "inputRevision", "result"])
      || !safe_job_id(value.jobId)
      || typeof value.panelId !== "string"
      || typeof value.inputRevision !== "number"
      || !Number.isSafeInteger(value.inputRevision)
      || value.inputRevision < 0
    ) return undefined;
    const result = decode_circuit_verification_result(value.result);
    if (result.ok && (
      !valid_worker_result(result.value)
      || (result.value.failure?.code !== undefined && !VERIFICATION_FAILURE_CODES.has(result.value.failure.code))
    )) {
      return undefined;
    }
    return result.ok
      ? {
          kind: "complete",
          jobId: value.jobId,
          panelId: value.panelId,
          inputRevision: value.inputRevision,
          result: result.value,
        }
      : undefined;
  }
  if (value.kind === "progress") {
    if (
      !exact_keys(value, ["kind", "jobId", "panelId", "inputRevision", "progress"])
      || !safe_job_id(value.jobId)
      || typeof value.panelId !== "string"
      || typeof value.inputRevision !== "number"
      || !Number.isSafeInteger(value.inputRevision)
      || value.inputRevision < 0
      || !is_record(value.progress)
    ) return undefined;
    if (!exact_keys(value.progress, ["stage", "completed", "total"])
      && !exact_keys(value.progress, ["stage", "completed", "total", "direction"])
      && !exact_keys(value.progress, ["stage", "completed", "total", "lap"])
      && !exact_keys(value.progress, ["stage", "completed", "total", "direction", "lap"])) return undefined;
    const decoded = decode_circuit_verification_progress({
      panelId: value.panelId,
      inputRevision: value.inputRevision,
      ...value.progress,
    });
    if (!decoded.ok || ![
      "cw-lap-complete", "ccw-lap-complete", "comparing",
    ].includes(decoded.value.stage)) return undefined;
    const progress: WorkerProgress = Object.freeze({
      stage: decoded.value.stage as WorkerProgress["stage"],
      completed: decoded.value.completed,
      total: decoded.value.total,
      ...(decoded.value.direction === undefined ? {} : { direction: decoded.value.direction }),
      ...(decoded.value.lap === undefined ? {} : { lap: decoded.value.lap }),
    });
    if (!valid_worker_progress(progress)) return undefined;
    return {
      kind: "progress",
      jobId: value.jobId,
      panelId: value.panelId,
      inputRevision: value.inputRevision,
      progress,
    };
  }
  return undefined;
}

function send_worker(worker: WorkerLike, command: WorkerCommand): void {
  worker.postMessage(command);
}

function zero_counts(): CircuitVerificationResult["operationCounts"] {
  return Object.freeze({ serializations: 0, parses: 0, comparisons: 0, laps: 0, directions: 0 });
}

function obsolete_result(
  job: Job,
  status: "cancelled" | "superseded",
  now: () => number,
  basis?: CircuitVerificationResult,
): CircuitVerificationResult {
  return Object.freeze({
    panelId: job.request.panelId,
    inputRevision: job.request.inputRevision,
    status,
    entry: job.request.entry,
    operationCounts: basis?.operationCounts ?? zero_counts(),
    durationMs: basis?.durationMs ?? Math.max(0, now() - job.enqueuedAt),
    failure: Object.freeze({
      stage: status,
      code: status === "superseded" ? "CIRCUIT_VERIFICATION_SUPERSEDED" : "CIRCUIT_VERIFICATION_CANCELLED",
      message: status === "superseded"
        ? "Circuit verification was superseded by a newer panel revision."
        : "Circuit verification was cancelled after its connection closed.",
    }),
  });
}

function direct_request_error(request: unknown): CircuitVerificationServiceError {
  if (is_record(request) && typeof request.source === "string" && request.source.length > CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH) {
    return new CircuitVerificationServiceError(
      "CIRCUIT_SOURCE_TOO_LARGE",
      `Circuit source exceeds the ${CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH}-character application limit.`,
    );
  }
  return new CircuitVerificationServiceError("CIRCUIT_REQUEST_INVALID", "Circuit verification request is invalid.");
}

export function create_circuit_verification_service(
  options: CircuitVerificationServiceOptions = {},
): CircuitVerificationService {
  const maxPending = options.maxPending ?? 16;
  const maxWorkerReplacements = options.maxWorkerReplacements ?? 2;
  const startupTimeoutMs = options.startupTimeoutMs ?? 5_000;
  const now = options.now ?? (() => performance.now());
  if (!Number.isSafeInteger(maxPending) || maxPending <= 0) throw new Error("Circuit verifier maxPending must be positive.");
  if (!Number.isSafeInteger(maxWorkerReplacements) || maxWorkerReplacements < 0) {
    throw new Error("Circuit verifier maxWorkerReplacements must be nonnegative.");
  }
  if (!Number.isFinite(startupTimeoutMs) || startupTimeoutMs <= 0) throw new Error("Circuit verifier startupTimeoutMs must be positive.");

  const workerFactory = options.workerFactory ?? (() => new Worker(
    new URL("./circuit-verification-worker.mjs", import.meta.url),
    { name: "hson-circuit-verifier" },
  ));
  const queue: Job[] = [];
  const latestByPanel = new Map<string, Job>();
  let worker: WorkerLike | undefined;
  let workerReady = false;
  let startupPromise: Promise<void> | undefined;
  let startupResolve: (() => void) | undefined;
  let startupReject: ((error: CircuitVerificationServiceError) => void) | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let active: Job | undefined;
  let disposed = false;
  let unavailable = false;
  let nextJob = 0;
  let workerStarts = 0;
  let workerReplacements = 0;
  let submitted = 0;
  let completed = 0;
  let failuresSinceCompletedJob = 0;

  function emit(job: Job, progress: Omit<CircuitVerificationProgress, "panelId" | "inputRevision">): boolean {
    if (job.settled || (job.obsolete !== undefined && progress.stage !== "cancelled")) return true;
    const event = Object.freeze({
      panelId: job.request.panelId,
      inputRevision: job.request.inputRevision,
      ...progress,
    });
    let accepted: boolean | void;
    try {
      accepted = job.onProgress?.(event);
    } catch {
      accepted = false;
    }
    if (accepted === false && job.obsolete === undefined) {
      cancel_job(job, "cancelled");
      return false;
    }
    return true;
  }

  function cleanup_job(job: Job): void {
    job.onProgress = undefined;
    if (latestByPanel.get(job.request.panelId) === job) latestByPanel.delete(job.request.panelId);
  }

  function settle_result(job: Job, result: CircuitVerificationResult): void {
    if (job.settled) return;
    job.settled = true;
    completed += 1;
    cleanup_job(job);
    job.resolve(result);
  }

  function settle_error(job: Job, error: CircuitVerificationServiceError): void {
    if (job.settled) return;
    emit(job, { stage: "failed", completed: job.lastCompleted, total: TOTAL_STAGES });
    if (job.settled) return;
    job.settled = true;
    cleanup_job(job);
    job.reject(error);
  }

  function remove_pending(job: Job): void {
    const index = queue.indexOf(job);
    if (index >= 0) queue.splice(index, 1);
  }

  function cancel_job(job: Job, reason: "cancelled" | "superseded"): void {
    if (job.settled || job.obsolete !== undefined) return;
    job.obsolete = reason;
    Atomics.store(job.cancellation, 0, 1);
    if (active === job) {
      try { if (worker !== undefined) send_worker(worker, { kind: "cancel", jobId: job.id }); } catch { /* worker loss owns failure */ }
      return;
    }
    remove_pending(job);
    emit(job, { stage: "cancelled", completed: job.lastCompleted, total: TOTAL_STAGES });
    settle_result(job, obsolete_result(job, reason, now));
  }

  function fail_pending(error: CircuitVerificationServiceError): void {
    for (const job of queue.splice(0)) settle_error(job, error);
  }

  function reject_startup(code: string, message: string): void {
    if (startupTimer !== undefined) clearTimeout(startupTimer);
    startupTimer = undefined;
    startupReject?.(new CircuitVerificationServiceError(code, message));
    startupReject = undefined;
    startupResolve = undefined;
  }

  function replace_worker(code: string, message: string, failedWorker: WorkerLike): void {
    if (worker !== failedWorker) return;
    worker = undefined;
    workerReady = false;
    startupPromise = undefined;
    reject_startup(
      active === undefined ? "CIRCUIT_WORKER_STARTUP_FAILED" : code,
      active === undefined ? "Circuit verification worker failed during startup." : message,
    );
    if (active !== undefined) {
      const failed = active;
      active = undefined;
      if (failed.obsolete !== undefined) {
        emit(failed, { stage: "cancelled", completed: failed.lastCompleted, total: TOTAL_STAGES });
        settle_result(failed, obsolete_result(failed, failed.obsolete, now));
      } else {
        settle_error(failed, new CircuitVerificationServiceError(code, message));
      }
    }
    void failedWorker.terminate().catch(() => undefined);
    if (disposed) return;
    failuresSinceCompletedJob += 1;
    if (failuresSinceCompletedJob > maxWorkerReplacements) {
      unavailable = true;
      fail_pending(new CircuitVerificationServiceError(
        "CIRCUIT_WORKER_UNAVAILABLE",
        "Circuit verification worker replacement limit was reached.",
      ));
      return;
    }
    workerReplacements += 1;
    void start_worker().then(dispatch_next, () => undefined);
  }

  function protocol_violation(failedWorker: WorkerLike): void {
    replace_worker(
      "CIRCUIT_WORKER_PROTOCOL_VIOLATION",
      "Circuit verification worker returned an invalid protocol message.",
      failedWorker,
    );
  }

  function handle_reply(failedWorker: WorkerLike, raw: unknown): void {
    if (worker !== failedWorker || disposed) return;
    const reply = decode_worker_reply(raw);
    if (reply === undefined) {
      protocol_violation(failedWorker);
      return;
    }
    if (!workerReady) {
      if (reply.kind !== "initialized") {
        protocol_violation(failedWorker);
        return;
      }
      workerReady = true;
      if (startupTimer !== undefined) clearTimeout(startupTimer);
      startupTimer = undefined;
      startupResolve?.();
      startupResolve = undefined;
      startupReject = undefined;
      dispatch_next();
      return;
    }
    if (reply.kind === "initialized" || reply.kind === "disposed") {
      protocol_violation(failedWorker);
      return;
    }
    const job = active;
    if (job === undefined || reply.jobId !== job.id) {
      protocol_violation(failedWorker);
      return;
    }
    if (reply.kind === "failed") {
      if (
        reply.panelId !== job.request.panelId
        || reply.inputRevision !== job.request.inputRevision
        || reply.entry !== job.request.entry
      ) {
        protocol_violation(failedWorker);
        return;
      }
      active = undefined;
      if (job.obsolete !== undefined) {
        emit(job, { stage: "cancelled", completed: job.lastCompleted, total: TOTAL_STAGES });
        settle_result(job, obsolete_result(job, job.obsolete, now));
      } else {
        settle_error(job, new CircuitVerificationServiceError(reply.code, reply.message));
      }
      dispatch_next();
      return;
    }
    if (
      reply.panelId !== job.request.panelId
      || reply.inputRevision !== job.request.inputRevision
    ) {
      protocol_violation(failedWorker);
      return;
    }
    if (reply.kind === "progress") {
      if (job.obsolete !== undefined) return;
      job.lastCompleted = reply.progress.completed;
      emit(job, reply.progress);
      return;
    }
    if (
      reply.result.panelId !== job.request.panelId
      || reply.result.inputRevision !== job.request.inputRevision
      || reply.result.entry !== job.request.entry
    ) {
      protocol_violation(failedWorker);
      return;
    }
    active = undefined;
    failuresSinceCompletedJob = 0;
    if (job.obsolete !== undefined) {
      emit(job, { stage: "cancelled", completed: job.lastCompleted, total: TOTAL_STAGES });
      settle_result(job, obsolete_result(job, job.obsolete, now, reply.result));
    } else {
      const stage = reply.result.status === "verified"
        ? "completed"
        : reply.result.status === "failed"
          ? "failed"
          : "cancelled";
      emit(job, {
        stage,
        completed: reply.result.status === "verified" ? TOTAL_STAGES : job.lastCompleted,
        total: TOTAL_STAGES,
      });
      settle_result(job, reply.result);
    }
    dispatch_next();
  }

  function start_worker(): Promise<void> {
    if (disposed) return Promise.reject(new CircuitVerificationServiceError("CIRCUIT_SERVICE_DISPOSED", "Circuit verifier is disposed."));
    if (unavailable) return Promise.reject(new CircuitVerificationServiceError("CIRCUIT_WORKER_UNAVAILABLE", "Circuit verification worker is unavailable."));
    if (workerReady && worker !== undefined) return Promise.resolve();
    if (startupPromise !== undefined) return startupPromise;
    let nextWorker: WorkerLike;
    try {
      nextWorker = workerFactory();
    } catch {
      unavailable = true;
      return Promise.reject(new CircuitVerificationServiceError(
        "CIRCUIT_WORKER_STARTUP_FAILED",
        "Circuit verification worker could not be created.",
      ));
    }
    worker = nextWorker;
    workerStarts += 1;
    workerReady = false;
    startupPromise = new Promise<void>((resolve, reject) => {
      startupResolve = resolve;
      startupReject = reject;
    });
    nextWorker.on("message", (message: unknown) => handle_reply(nextWorker, message));
    nextWorker.on("messageerror", () => protocol_violation(nextWorker));
    nextWorker.on("error", () => replace_worker(
      "CIRCUIT_WORKER_CRASH",
      "Circuit verification worker crashed.",
      nextWorker,
    ));
    nextWorker.on("exit", (code: number) => {
      if (worker !== nextWorker || disposed) return;
      replace_worker("CIRCUIT_WORKER_CRASH", "Circuit verification worker exited unexpectedly.", nextWorker);
    });
    startupTimer = setTimeout(() => {
      if (worker !== nextWorker || workerReady) return;
      replace_worker(
        "CIRCUIT_WORKER_STARTUP_FAILED",
        "Circuit verification worker did not initialize in time.",
        nextWorker,
      );
    }, startupTimeoutMs);
    try {
      send_worker(nextWorker, { kind: "initialize", protocolVersion: PROTOCOL_VERSION });
    } catch {
      replace_worker(
        "CIRCUIT_WORKER_STARTUP_FAILED",
        "Circuit verification worker initialization could not be sent.",
        nextWorker,
      );
    }
    return startupPromise;
  }

  function dispatch_next(): void {
    if (disposed || unavailable || !workerReady || worker === undefined || active !== undefined) return;
    let job = queue.shift();
    while (job !== undefined && job.settled) job = queue.shift();
    if (job === undefined) return;
    if (job.obsolete !== undefined) {
      settle_result(job, obsolete_result(job, job.obsolete, now));
      dispatch_next();
      return;
    }
    active = job;
    emit(job, { stage: "started", completed: 0, total: TOTAL_STAGES });
    try {
      send_worker(worker, {
        kind: "run",
        jobId: job.id,
        request: job.request,
        cancellation: job.cancellationBuffer,
      });
    } catch {
      replace_worker(
        "CIRCUIT_WORKER_UNAVAILABLE",
        "Circuit verification worker could not accept the job.",
        worker,
      );
    }
  }

  function make_job(
    request: CircuitVerificationRequest,
    onProgress: CircuitVerificationProgressListener | undefined,
  ): Readonly<{ job: Job; promise: Promise<CircuitVerificationResult> }> {
    let resolve!: (result: CircuitVerificationResult) => void;
    let reject!: (error: CircuitVerificationServiceError) => void;
    const promise = new Promise<CircuitVerificationResult>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    nextJob += 1;
    const cancellationBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const cancellation = new Int32Array(cancellationBuffer);
    const job: Job = {
      id: `circuit-${nextJob}`,
      request,
      cancellation,
      cancellationBuffer,
      enqueuedAt: now(),
      onProgress,
      lastCompleted: 0,
      settled: false,
      resolve,
      reject,
    };
    return { job, promise };
  }

  const service: CircuitVerificationService = Object.freeze({
    ready: start_worker,
    submit(request, onProgress) {
      if (disposed) return Promise.reject(new CircuitVerificationServiceError("CIRCUIT_SERVICE_DISPOSED", "Circuit verifier is disposed."));
      if (unavailable) return Promise.reject(new CircuitVerificationServiceError("CIRCUIT_WORKER_UNAVAILABLE", "Circuit verification worker is unavailable."));
      const decoded = decode_circuit_verification_request(request);
      if (!decoded.ok) return Promise.reject(direct_request_error(request));
      const made = make_job(decoded.value, onProgress);
      const { job, promise } = made;
      submitted += 1;
      emit(job, { stage: "queued", completed: 0, total: TOTAL_STAGES });
      if (job.settled) return promise;

      const previous = latestByPanel.get(job.request.panelId);
      if (previous !== undefined && !previous.settled) {
        if (job.request.inputRevision <= previous.request.inputRevision) {
          job.obsolete = "superseded";
          emit(job, { stage: "cancelled", completed: 0, total: TOTAL_STAGES });
          settle_result(job, obsolete_result(job, "superseded", now));
          return promise;
        }
        cancel_job(previous, "superseded");
      }

      if (queue.length >= maxPending) {
        settle_error(job, new CircuitVerificationServiceError(
          "CIRCUIT_QUEUE_CAPACITY",
          "Circuit verification queue capacity was reached.",
        ));
        return promise;
      }
      latestByPanel.set(job.request.panelId, job);
      queue.push(job);
      void start_worker().then(dispatch_next, (error: unknown) => {
        remove_pending(job);
        settle_error(job, error instanceof CircuitVerificationServiceError
          ? error
          : new CircuitVerificationServiceError("CIRCUIT_WORKER_STARTUP_FAILED", "Circuit verification worker could not start."));
      });
      dispatch_next();
      return promise;
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (startupTimer !== undefined) clearTimeout(startupTimer);
      startupTimer = undefined;
      reject_startup("CIRCUIT_SERVICE_DISPOSED", "Circuit verifier was disposed during startup.");
      const error = new CircuitVerificationServiceError("CIRCUIT_SERVICE_DISPOSED", "Circuit verifier is disposed.");
      if (active !== undefined) {
        Atomics.store(active.cancellation, 0, 1);
        settle_error(active, error);
        active = undefined;
      }
      fail_pending(error);
      latestByPanel.clear();
      const current = worker;
      worker = undefined;
      workerReady = false;
      if (current !== undefined) {
        try { send_worker(current, { kind: "dispose" }); } catch { /* termination below is authoritative */ }
        await current.terminate().catch(() => undefined);
      }
    },
    diagnostics() {
      return Object.freeze({
        workerStarts,
        workerReplacements,
        submitted,
        completed,
        active: active !== undefined,
        pending: queue.length,
        disposed,
        ...(worker === undefined ? {} : { workerThreadId: worker.threadId }),
      });
    },
  });

  void start_worker().catch(() => undefined);
  return service;
}

export function revision_is_current(
  result: Pick<CircuitVerificationResult, "panelId" | "inputRevision">,
  latestRevisionForPanel: ReadonlyMap<string, number>,
): boolean {
  return latestRevisionForPanel.get(result.panelId) === result.inputRevision;
}

export function circuit_source_for_entry(entry: CircuitVerificationEntry): string {
  if (entry === "json") return "{\"phase\":2,\"worker\":true}";
  if (entry === "html") return "<main data-phase=\"2\">worker</main>";
  return "<\n  phase 2\n  worker true\n>";
}
