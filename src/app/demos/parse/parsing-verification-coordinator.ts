import {
  CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH,
  type CircuitVerificationEntry,
  type CircuitVerificationFailure,
  type CircuitVerificationOperationCounts,
  type CircuitVerificationProgress,
  type CircuitVerificationRequest,
  type CircuitVerificationResult,
} from "../../../shared/circuit-verification-contract";

export const PARSING_VERIFICATION_DEBOUNCE_MS = 300;

export type ParsingVerificationFailureCategory = "immediate" | "universal" | "browser-boundary" | "service";

export type ParsingVerificationFailure = Readonly<{
  category: ParsingVerificationFailureCategory;
  code: string;
  message: string;
  stage?: string;
}>;

export type ParsingBrowserCertificate = Readonly<{
  entry: CircuitVerificationEntry;
  inputRevision: number;
  operationCounts: CircuitVerificationOperationCounts;
  workerDurationMs: number;
  browserCheckDurationMs: number;
  browserFinalMatchesBaseline: true;
  browserOriginMatchesBaseline: true;
}>;

export type ParsingVerificationState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "invalid"; entry: CircuitVerificationEntry; inputRevision: number; diagnostic: ParsingVerificationFailure }>
  | Readonly<{ status: "parsed"; entry: CircuitVerificationEntry; inputRevision: number }>
  | Readonly<{ status: "queued"; entry: CircuitVerificationEntry; inputRevision: number }>
  | Readonly<{ status: "verifying"; entry: CircuitVerificationEntry; inputRevision: number; progress?: CircuitVerificationProgress }>
  | Readonly<{ status: "browser-check"; entry: CircuitVerificationEntry; inputRevision: number }>
  | Readonly<{ status: "verified"; entry: CircuitVerificationEntry; inputRevision: number; certificate: ParsingBrowserCertificate }>
  | Readonly<{ status: "failed"; entry: CircuitVerificationEntry; inputRevision: number; failure: ParsingVerificationFailure }>
  | Readonly<{ status: "unavailable"; entry: CircuitVerificationEntry; inputRevision: number; failure: ParsingVerificationFailure }>;

export type ParsingImmediateAdmission<TAdmission> =
  | Readonly<{ ok: true; admission: TAdmission }>
  | Readonly<{ ok: false; diagnostic: ParsingVerificationFailure }>;

export type ParsingBrowserCertificateResult =
  | Readonly<{ ok: true; certificate: ParsingBrowserCertificate }>
  | Readonly<{ ok: false; stale: true }>
  | Readonly<{ ok: false; stale?: false; failure: ParsingVerificationFailure }>;

export type ParsingVerificationTransport = Readonly<{
  submit(
    request: CircuitVerificationRequest,
    onProgress: (progress: CircuitVerificationProgress) => void,
  ): Promise<CircuitVerificationResult>;
  dispose(): void;
}>;

export type ParsingVerificationScheduler = Readonly<{
  set(delayMs: number, callback: () => void): unknown;
  clear(handle: unknown): void;
}>;

export type ParsingVerificationCoordinatorOptions<TAdmission> = Readonly<{
  panelId: string;
  debounceMs?: number;
  scheduler?: ParsingVerificationScheduler;
  transport: ParsingVerificationTransport;
  admit(entry: CircuitVerificationEntry, source: string): ParsingImmediateAdmission<TAdmission>;
  certify(input: Readonly<{
    entry: CircuitVerificationEntry;
    inputRevision: number;
    immediateAdmission: TAdmission;
    workerResult: CircuitVerificationResult;
    isCurrent(): boolean;
  }>): ParsingBrowserCertificateResult | Promise<ParsingBrowserCertificateResult>;
  onState?(state: ParsingVerificationState): void;
}>;

export type ParsingVerificationCoordinator = Readonly<{
  edit(entry: CircuitVerificationEntry, source: string): number;
  flush(): void;
  snapshot(): ParsingVerificationState;
  revision(): number;
  dispose(): void;
}>;

type PendingAdmission<TAdmission> = Readonly<{
  entry: CircuitVerificationEntry;
  inputRevision: number;
  source: string;
  admission: TAdmission;
}>;

function default_scheduler(): ParsingVerificationScheduler {
  return Object.freeze({
    set: (delayMs, callback) => globalThis.setTimeout(callback, delayMs),
    clear: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  });
}

function safe_failure(error: unknown): ParsingVerificationFailure {
  const candidate = error as { code?: unknown };
  const code = typeof candidate?.code === "string" && /^[A-Z0-9_]{1,80}$/.test(candidate.code)
    ? candidate.code
    : "CIRCUIT_VERIFICATION_UNAVAILABLE";
  return Object.freeze({
    category: "service",
    code,
    message: "Remote circuit verification is currently unavailable.",
  });
}

function universal_failure(failure?: CircuitVerificationFailure): ParsingVerificationFailure {
  return Object.freeze({
    category: "universal",
    code: failure?.code ?? "CIRCUIT_UNIVERSAL_VERIFICATION_FAILED",
    message: failure?.message ?? "The universal Transform circuit did not close strictly.",
    ...(failure?.stage === undefined ? {} : { stage: failure.stage }),
  });
}

export function create_parsing_verification_coordinator<TAdmission>(
  options: ParsingVerificationCoordinatorOptions<TAdmission>,
): ParsingVerificationCoordinator {
  if (options.panelId.length === 0 || options.panelId.length > 128) {
    throw new Error("Parsing verification panelId must contain 1–128 characters.");
  }
  const debounceMs = options.debounceMs ?? PARSING_VERIFICATION_DEBOUNCE_MS;
  if (!Number.isFinite(debounceMs) || debounceMs < 0) throw new Error("Parsing verification debounce must be nonnegative.");
  const scheduler = options.scheduler ?? default_scheduler();
  let state: ParsingVerificationState = Object.freeze({ status: "idle" });
  let inputRevision = 0;
  let timer: unknown;
  let pending: PendingAdmission<TAdmission> | undefined;
  let disposed = false;

  function publish(next: ParsingVerificationState): void {
    if (disposed) return;
    state = Object.freeze(next);
    options.onState?.(state);
  }

  function clear_timer(): void {
    if (timer === undefined) return;
    scheduler.clear(timer);
    timer = undefined;
  }

  function current(entry: CircuitVerificationEntry, revision: number): boolean {
    return !disposed && inputRevision === revision && pending?.entry === entry && pending?.inputRevision === revision;
  }

  function progress_for(entry: CircuitVerificationEntry, revision: number, progress: CircuitVerificationProgress): void {
    if (!current(entry, revision)) return;
    if (progress.panelId !== options.panelId || progress.inputRevision !== revision) return;
    if (progress.stage === "queued") {
      publish({ status: "queued", entry, inputRevision: revision });
      return;
    }
    if (progress.stage === "started"
      || progress.stage === "cw-lap-complete"
      || progress.stage === "ccw-lap-complete"
      || progress.stage === "comparing") {
      publish({ status: "verifying", entry, inputRevision: revision, progress });
    }
  }

  async function launch(candidate: PendingAdmission<TAdmission>): Promise<void> {
    if (!current(candidate.entry, candidate.inputRevision)) return;
    clear_timer();
    publish({ status: "queued", entry: candidate.entry, inputRevision: candidate.inputRevision });
    let result: CircuitVerificationResult;
    try {
      result = await options.transport.submit({
        panelId: options.panelId,
        inputRevision: candidate.inputRevision,
        entry: candidate.entry,
        source: candidate.source,
      }, (progress) => progress_for(candidate.entry, candidate.inputRevision, progress));
    } catch (error) {
      if (!current(candidate.entry, candidate.inputRevision)) return;
      publish({
        status: "unavailable",
        entry: candidate.entry,
        inputRevision: candidate.inputRevision,
        failure: safe_failure(error),
      });
      return;
    }
    if (!current(candidate.entry, candidate.inputRevision)) return;
    if (result.panelId !== options.panelId || result.inputRevision !== candidate.inputRevision || result.entry !== candidate.entry) return;
    if (result.status === "cancelled" || result.status === "superseded") {
      publish({ status: "parsed", entry: candidate.entry, inputRevision: candidate.inputRevision });
      return;
    }
    if (result.status !== "verified") {
      publish({
        status: "failed",
        entry: candidate.entry,
        inputRevision: candidate.inputRevision,
        failure: universal_failure(result.failure),
      });
      return;
    }
    publish({ status: "browser-check", entry: candidate.entry, inputRevision: candidate.inputRevision });
    const certificate = await options.certify({
      entry: candidate.entry,
      inputRevision: candidate.inputRevision,
      immediateAdmission: candidate.admission,
      workerResult: result,
      isCurrent: () => current(candidate.entry, candidate.inputRevision),
    });
    if (!current(candidate.entry, candidate.inputRevision) || (!certificate.ok && certificate.stale === true)) return;
    if (certificate.ok) {
      publish({
        status: "verified",
        entry: candidate.entry,
        inputRevision: candidate.inputRevision,
        certificate: certificate.certificate,
      });
      return;
    }
    publish({
      status: "failed",
      entry: candidate.entry,
      inputRevision: candidate.inputRevision,
      failure: certificate.failure,
    });
  }

  function schedule(candidate: PendingAdmission<TAdmission>): void {
    clear_timer();
    timer = scheduler.set(debounceMs, () => {
      timer = undefined;
      void launch(candidate);
    });
  }

  return Object.freeze({
    edit(entry, source) {
      if (disposed) return inputRevision;
      inputRevision += 1;
      clear_timer();
      pending = undefined;
      const revision = inputRevision;
      const admitted = options.admit(entry, source);
      if (!admitted.ok) {
        publish({ status: "invalid", entry, inputRevision: revision, diagnostic: admitted.diagnostic });
        return revision;
      }
      const candidate = Object.freeze({ entry, inputRevision: revision, source, admission: admitted.admission });
      pending = candidate;
      if (source.length > CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH) {
        publish({
          status: "unavailable",
          entry,
          inputRevision: revision,
          failure: Object.freeze({
            category: "service",
            code: "CIRCUIT_SOURCE_TOO_LARGE",
            message: "This source exceeds the remote verification limit; local preview remains available.",
          }),
        });
        return revision;
      }
      publish({ status: "parsed", entry, inputRevision: revision });
      schedule(candidate);
      return revision;
    },
    flush() {
      if (disposed || pending === undefined || timer === undefined) return;
      const candidate = pending;
      clear_timer();
      void launch(candidate);
    },
    snapshot: () => state,
    revision: () => inputRevision,
    dispose() {
      if (disposed) return;
      clear_timer();
      disposed = true;
      inputRevision += 1;
      pending = undefined;
      options.transport.dispose();
    },
  });
}
