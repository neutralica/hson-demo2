export const CIRCUIT_VERIFICATION_HOST_ID = "circuit-verifier";
export const CIRCUIT_VERIFICATION_ACTION = "circuit.verify";
export const CIRCUIT_VERIFICATION_PROGRESS_EVENT = "circuit.verification.progress";
export const CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH = 262_144;
export const CIRCUIT_VERIFICATION_MAX_RESULT_TEXT_LENGTH = 1_048_576;
export const CIRCUIT_VERIFICATION_MAX_PANEL_ID_LENGTH = 128;

export type CircuitVerificationEntry = "hson" | "json" | "html";
export type CircuitVerificationDirection = "cw" | "ccw";

export type CircuitVerificationRequest = Readonly<{
  panelId: string;
  inputRevision: number;
  entry: CircuitVerificationEntry;
  source: string;
}>;

export type CircuitVerificationOperationCounts = Readonly<{
  serializations: number;
  parses: number;
  comparisons: number;
  laps: number;
  directions: number;
}>;

export type CircuitVerificationFailure = Readonly<{
  stage: string;
  direction?: CircuitVerificationDirection;
  lap?: number;
  sourceFormat?: CircuitVerificationEntry;
  targetFormat?: CircuitVerificationEntry;
  code?: string;
  message: string;
  path?: readonly (string | number)[];
}>;

export type CircuitVerificationResult = Readonly<{
  panelId: string;
  inputRevision: number;
  status: "verified" | "failed" | "cancelled" | "superseded";
  entry: CircuitVerificationEntry;
  operationCounts: CircuitVerificationOperationCounts;
  durationMs: number;
  failure?: CircuitVerificationFailure;
  baselineHson?: string;
  clockwiseFinalHson?: string;
  counterclockwiseFinalHson?: string;
  finalHtml?: string;
}>;

export type CircuitVerificationProgressStage =
  | "queued"
  | "started"
  | "cw-lap-complete"
  | "ccw-lap-complete"
  | "comparing"
  | "completed"
  | "cancelled"
  | "failed";

export type CircuitVerificationProgress = Readonly<{
  panelId: string;
  inputRevision: number;
  stage: CircuitVerificationProgressStage;
  completed: number;
  total: number;
  direction?: CircuitVerificationDirection;
  lap?: number;
}>;

export type CircuitVerificationActions = Readonly<{
  "circuit.verify": CircuitVerificationRequest;
}>;

export type CircuitVerificationProgressListener = (progress: CircuitVerificationProgress) => boolean | void;

export type CircuitVerificationSubmitter = Readonly<{
  submit(
    request: CircuitVerificationRequest,
    onProgress?: CircuitVerificationProgressListener,
  ): Promise<CircuitVerificationResult>;
  dispose(): void | Promise<void>;
}>;

type DecodeSuccess<T> = Readonly<{ ok: true; value: T }>;
type DecodeFailure = Readonly<{ ok: false; issues: readonly string[] }>;
export type CircuitDecodeResult<T> = DecodeSuccess<T> | DecodeFailure;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function exact_keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

function is_entry(value: unknown): value is CircuitVerificationEntry {
  return value === "hson" || value === "json" || value === "html";
}

function is_direction(value: unknown): value is CircuitVerificationDirection {
  return value === "cw" || value === "ccw";
}

function is_count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function is_duration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function decode_circuit_verification_request(value: unknown): CircuitDecodeResult<CircuitVerificationRequest> {
  const candidate = record(value);
  if (candidate === undefined || !exact_keys(candidate, ["panelId", "inputRevision", "entry", "source"])) {
    return { ok: false, issues: ["circuit.verify requires exactly panelId, inputRevision, entry, and source."] };
  }
  if (
    typeof candidate.panelId !== "string"
    || candidate.panelId.length === 0
    || candidate.panelId.length > CIRCUIT_VERIFICATION_MAX_PANEL_ID_LENGTH
  ) {
    return { ok: false, issues: [`panelId must be a non-empty string of at most ${CIRCUIT_VERIFICATION_MAX_PANEL_ID_LENGTH} characters.`] };
  }
  if (!is_count(candidate.inputRevision)) {
    return { ok: false, issues: ["inputRevision must be a nonnegative safe integer."] };
  }
  if (!is_entry(candidate.entry)) {
    return { ok: false, issues: ["entry must be exactly hson, json, or html; auto is not accepted."] };
  }
  if (typeof candidate.source !== "string") {
    return { ok: false, issues: ["source must be a string."] };
  }
  if (candidate.source.length > CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH) {
    return { ok: false, issues: [`source exceeds the ${CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH}-character application limit.`] };
  }
  return {
    ok: true,
    value: Object.freeze({
      panelId: candidate.panelId,
      inputRevision: candidate.inputRevision,
      entry: candidate.entry,
      source: candidate.source,
    }),
  };
}

function decode_counts(value: unknown): CircuitVerificationOperationCounts | undefined {
  const candidate = record(value);
  if (
    candidate === undefined
    || !exact_keys(candidate, ["serializations", "parses", "comparisons", "laps", "directions"])
    || !is_count(candidate.serializations)
    || !is_count(candidate.parses)
    || !is_count(candidate.comparisons)
    || !is_count(candidate.laps)
    || !is_count(candidate.directions)
  ) return undefined;
  return Object.freeze({
    serializations: candidate.serializations,
    parses: candidate.parses,
    comparisons: candidate.comparisons,
    laps: candidate.laps,
    directions: candidate.directions,
  });
}

function decode_path(value: unknown): readonly (string | number)[] | undefined {
  if (!Array.isArray(value) || value.length > 64) return undefined;
  if (!value.every((part) =>
    (typeof part === "string" && part.length <= 256)
    || (typeof part === "number" && Number.isSafeInteger(part)))) return undefined;
  return Object.freeze(value.slice()) as readonly (string | number)[];
}

function decode_failure(value: unknown): CircuitVerificationFailure | undefined {
  const candidate = record(value);
  if (
    candidate === undefined
    || !exact_keys(
      candidate,
      ["stage", "message"],
      ["direction", "lap", "sourceFormat", "targetFormat", "code", "path"],
    )
    || typeof candidate.stage !== "string"
    || candidate.stage.length === 0
    || candidate.stage.length > 64
    || typeof candidate.message !== "string"
    || candidate.message.length === 0
    || candidate.message.length > 512
    || (candidate.direction !== undefined && !is_direction(candidate.direction))
    || (candidate.lap !== undefined && !is_count(candidate.lap))
    || (candidate.sourceFormat !== undefined && !is_entry(candidate.sourceFormat))
    || (candidate.targetFormat !== undefined && !is_entry(candidate.targetFormat))
    || (candidate.code !== undefined && (typeof candidate.code !== "string" || !/^[A-Z0-9_]{1,80}$/.test(candidate.code)))
  ) return undefined;
  const path = candidate.path === undefined ? undefined : decode_path(candidate.path);
  if (candidate.path !== undefined && path === undefined) return undefined;
  return Object.freeze({
    stage: candidate.stage,
    message: candidate.message,
    ...(candidate.direction === undefined ? {} : { direction: candidate.direction }),
    ...(candidate.lap === undefined ? {} : { lap: candidate.lap }),
    ...(candidate.sourceFormat === undefined ? {} : { sourceFormat: candidate.sourceFormat }),
    ...(candidate.targetFormat === undefined ? {} : { targetFormat: candidate.targetFormat }),
    ...(candidate.code === undefined ? {} : { code: candidate.code }),
    ...(path === undefined ? {} : { path }),
  });
}

function optional_bounded_text(candidate: Record<string, unknown>, key: string): string | undefined | false {
  const value = candidate[key];
  if (value === undefined) return undefined;
  return typeof value === "string" && value.length <= CIRCUIT_VERIFICATION_MAX_RESULT_TEXT_LENGTH
    ? value
    : false;
}

export function decode_circuit_verification_result(value: unknown): CircuitDecodeResult<CircuitVerificationResult> {
  const candidate = record(value);
  if (candidate === undefined || !exact_keys(
    candidate,
    ["panelId", "inputRevision", "status", "entry", "operationCounts", "durationMs"],
    ["failure", "baselineHson", "clockwiseFinalHson", "counterclockwiseFinalHson", "finalHtml"],
  )) return { ok: false, issues: ["Circuit verification result has an invalid shape."] };
  const counts = decode_counts(candidate.operationCounts);
  const failure = candidate.failure === undefined ? undefined : decode_failure(candidate.failure);
  const baselineHson = optional_bounded_text(candidate, "baselineHson");
  const clockwiseFinalHson = optional_bounded_text(candidate, "clockwiseFinalHson");
  const counterclockwiseFinalHson = optional_bounded_text(candidate, "counterclockwiseFinalHson");
  const finalHtml = optional_bounded_text(candidate, "finalHtml");
  if (
    typeof candidate.panelId !== "string"
    || candidate.panelId.length === 0
    || candidate.panelId.length > CIRCUIT_VERIFICATION_MAX_PANEL_ID_LENGTH
    || !is_count(candidate.inputRevision)
    || !["verified", "failed", "cancelled", "superseded"].includes(String(candidate.status))
    || !is_entry(candidate.entry)
    || counts === undefined
    || !is_duration(candidate.durationMs)
    || (candidate.failure !== undefined && failure === undefined)
    || baselineHson === false
    || clockwiseFinalHson === false
    || counterclockwiseFinalHson === false
    || finalHtml === false
  ) return { ok: false, issues: ["Circuit verification result contains invalid fields."] };
  return {
    ok: true,
    value: Object.freeze({
      panelId: candidate.panelId,
      inputRevision: candidate.inputRevision,
      status: candidate.status as CircuitVerificationResult["status"],
      entry: candidate.entry,
      operationCounts: counts,
      durationMs: candidate.durationMs,
      ...(failure === undefined ? {} : { failure }),
      ...(baselineHson === undefined ? {} : { baselineHson }),
      ...(clockwiseFinalHson === undefined ? {} : { clockwiseFinalHson }),
      ...(counterclockwiseFinalHson === undefined ? {} : { counterclockwiseFinalHson }),
      ...(finalHtml === undefined ? {} : { finalHtml }),
    }),
  };
}

const PROGRESS_STAGES: readonly CircuitVerificationProgressStage[] = Object.freeze([
  "queued", "started", "cw-lap-complete", "ccw-lap-complete", "comparing", "completed", "cancelled", "failed",
]);

export function decode_circuit_verification_progress(value: unknown): CircuitDecodeResult<CircuitVerificationProgress> {
  const candidate = record(value);
  if (candidate === undefined || !exact_keys(
    candidate,
    ["panelId", "inputRevision", "stage", "completed", "total"],
    ["direction", "lap"],
  )) return { ok: false, issues: ["Circuit verification progress has an invalid shape."] };
  if (
    typeof candidate.panelId !== "string"
    || candidate.panelId.length === 0
    || candidate.panelId.length > CIRCUIT_VERIFICATION_MAX_PANEL_ID_LENGTH
    || !is_count(candidate.inputRevision)
    || !PROGRESS_STAGES.includes(candidate.stage as CircuitVerificationProgressStage)
    || !is_count(candidate.completed)
    || !is_count(candidate.total)
    || candidate.completed > candidate.total
    || (candidate.direction !== undefined && !is_direction(candidate.direction))
    || (candidate.lap !== undefined && !is_count(candidate.lap))
  ) return { ok: false, issues: ["Circuit verification progress contains invalid fields."] };
  return {
    ok: true,
    value: Object.freeze({
      panelId: candidate.panelId,
      inputRevision: candidate.inputRevision,
      stage: candidate.stage as CircuitVerificationProgressStage,
      completed: candidate.completed,
      total: candidate.total,
      ...(candidate.direction === undefined ? {} : { direction: candidate.direction }),
      ...(candidate.lap === undefined ? {} : { lap: candidate.lap }),
    }),
  };
}

