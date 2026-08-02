import { parentPort } from "node:worker_threads";
import { verify_universal_circuit } from "hson-live/diagnostics/universal-circuit";

const PROTOCOL_VERSION = 1;
const MAX_SOURCE_LENGTH = 262_144;
const MAX_PANEL_ID_LENGTH = 128;

if (parentPort === null) throw new Error("CIRCUIT_WORKER_PARENT_REQUIRED");

let initialized = false;
let activeJobId;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, required) {
  return Object.keys(value).length === required.length
    && required.every((key) => Object.hasOwn(value, key));
}

function decodeRequest(value) {
  if (!isRecord(value) || !hasExactKeys(value, ["panelId", "inputRevision", "entry", "source"])) return undefined;
  if (
    typeof value.panelId !== "string"
    || value.panelId.length === 0
    || value.panelId.length > MAX_PANEL_ID_LENGTH
    || !Number.isSafeInteger(value.inputRevision)
    || value.inputRevision < 0
    || (value.entry !== "hson" && value.entry !== "json" && value.entry !== "html")
    || typeof value.source !== "string"
    || value.source.length > MAX_SOURCE_LENGTH
  ) return undefined;
  return value;
}

function decodeMessage(value) {
  if (!isRecord(value) || typeof value.kind !== "string") return undefined;
  if (value.kind === "initialize") {
    return hasExactKeys(value, ["kind", "protocolVersion"])
      && value.protocolVersion === PROTOCOL_VERSION ? value : undefined;
  }
  if (value.kind === "run") {
    return hasExactKeys(value, ["kind", "jobId", "request", "cancellation"])
      && typeof value.jobId === "string"
      && value.jobId.length > 0
      && value.jobId.length <= 128
      && decodeRequest(value.request) !== undefined
      && value.cancellation instanceof SharedArrayBuffer
      && value.cancellation.byteLength === Int32Array.BYTES_PER_ELEMENT
      ? value
      : undefined;
  }
  if (value.kind === "cancel") {
    return hasExactKeys(value, ["kind", "jobId"])
      && typeof value.jobId === "string"
      && value.jobId.length > 0
      && value.jobId.length <= 128 ? value : undefined;
  }
  if (value.kind === "dispose") return hasExactKeys(value, ["kind"]) ? value : undefined;
  return undefined;
}

function failed(jobId, code, message, request) {
  parentPort.postMessage({
    kind: "failed",
    jobId,
    ...(request === undefined ? {} : {
      panelId: request.panelId,
      inputRevision: request.inputRevision,
      entry: request.entry,
    }),
    code,
    message,
  });
}

parentPort.on("message", (raw) => {
  const message = decodeMessage(raw);
  if (message === undefined) {
    failed(
      isRecord(raw) && typeof raw.jobId === "string" ? raw.jobId : "protocol",
      "CIRCUIT_WORKER_PROTOCOL_VIOLATION",
      "Worker received an invalid protocol message.",
    );
    return;
  }

  if (message.kind === "initialize") {
    if (initialized) {
      failed("initialize", "CIRCUIT_WORKER_PROTOCOL_VIOLATION", "Worker was initialized more than once.");
      return;
    }
    initialized = true;
    parentPort.postMessage({ kind: "initialized", protocolVersion: PROTOCOL_VERSION });
    return;
  }

  if (message.kind === "dispose") {
    parentPort.postMessage({ kind: "disposed" });
    parentPort.close();
    return;
  }

  if (message.kind === "cancel") {
    // Active interruption is performed through the shared atomic flag. This
    // advisory message is decoded for protocol completeness and is only
    // observable after a synchronous run yields back to the worker event loop.
    return;
  }

  if (!initialized || activeJobId !== undefined) {
    failed(message.jobId, "CIRCUIT_WORKER_UNAVAILABLE", "Worker is not ready for this circuit job.", message.request);
    return;
  }

  const request = decodeRequest(message.request);
  if (request === undefined) {
    failed(message.jobId, "CIRCUIT_WORKER_PROTOCOL_VIOLATION", "Worker run payload is invalid.");
    return;
  }
  const cancellation = new Int32Array(message.cancellation);
  activeJobId = message.jobId;
  try {
    const verification = verify_universal_circuit(
      { entry: request.entry, source: request.source },
      {
        shouldCancel: () => Atomics.load(cancellation, 0) !== 0,
        onProgress(progress) {
          parentPort.postMessage({
            kind: "progress",
            jobId: message.jobId,
            panelId: request.panelId,
            inputRevision: request.inputRevision,
            progress,
          });
        },
      },
    );
    const { boundary: _boundary, ...detached } = verification;
    parentPort.postMessage({
      kind: "complete",
      jobId: message.jobId,
      panelId: request.panelId,
      inputRevision: request.inputRevision,
      result: {
        panelId: request.panelId,
        inputRevision: request.inputRevision,
        ...detached,
      },
    });
  } catch {
    failed(
      message.jobId,
      "CIRCUIT_WORKER_EXECUTION_FAILED",
      "Worker could not execute the universal Transform circuit.",
      request,
    );
  } finally {
    activeJobId = undefined;
  }
});
