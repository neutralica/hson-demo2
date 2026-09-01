import WebSocket from "ws";
import { create_echo, type Echo } from "hson-live/echo";
import {
  create_browser_locus_socket,
  type BrowserWebSocketConstructor,
} from "hson-live/locus";
import { start_node_application_host } from "hson-live/livehost/node";
import type { JsonValue, LiveMap, LocusSocketLike } from "hson-live/types";
import type { TestSuite } from "../../harness/core/test-contracts";
import {
  CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH,
  CIRCUIT_VERIFICATION_PROGRESS_EVENT,
  decode_circuit_verification_progress,
  type CircuitVerificationActions,
  type CircuitVerificationProgress,
  type CircuitVerificationProgressListener,
  type CircuitVerificationRequest,
  type CircuitVerificationResult,
  type CircuitVerificationSubmitter,
} from "../../../src/shared/circuit-verification-contract";
import { create_circuit_verification_livehost } from "../../harness/hosted/circuit-verification-livehost";
import {
  CircuitVerificationServiceError,
  create_circuit_verification_service,
  revision_is_current,
} from "../../harness/runtimes/node/circuit-verification-service";
import { create_node_circuit_verification_application } from "../../harness/runtimes/node/server/node-circuit-verification-application";

const SUITE = "livehost/circuit-worker-action";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`circuit Locus action: ${message}`);
}

type PairSocket = LocusSocketLike & Readonly<{ sent(): readonly unknown[]; listenerCount(): number }>;

function make_socket_pair(): readonly [PairSocket, PairSocket] {
  function side(): {
    sent: string[];
    messages: Set<(message: string) => void>;
    closes: Set<() => void>;
  } {
    return { sent: [], messages: new Set(), closes: new Set() };
  }
  const first = side();
  const second = side();
  function socket(own: ReturnType<typeof side>, peer: ReturnType<typeof side>): PairSocket {
    return Object.freeze({
      send(message: string) {
        own.sent.push(message);
        queueMicrotask(() => { for (const listener of [...peer.messages]) listener(message); });
      },
      close() {
        queueMicrotask(() => { for (const listener of [...peer.closes]) listener(); });
      },
      onMessage(listener: (message: string) => void) {
        own.messages.add(listener);
        return () => { own.messages.delete(listener); };
      },
      onClose(listener: () => void) {
        own.closes.add(listener);
        return () => { own.closes.delete(listener); };
      },
      sent: () => own.sent.map((message) => JSON.parse(message) as unknown),
      listenerCount: () => own.messages.size + own.closes.size,
    });
  }
  return [socket(first, second), socket(second, first)] as const;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

function request(panelId = "panel-a", inputRevision = 1): CircuitVerificationRequest {
  return Object.freeze({ panelId, inputRevision, entry: "json", source: '{"phase":2,"worker":true}' });
}

function result_for(value: CircuitVerificationRequest, status: CircuitVerificationResult["status"] = "verified"): CircuitVerificationResult {
  return Object.freeze({
    panelId: value.panelId,
    inputRevision: value.inputRevision,
    status,
    entry: value.entry,
    operationCounts: Object.freeze({ serializations: status === "verified" ? 24 : 0, parses: status === "verified" ? 25 : 1, comparisons: status === "verified" ? 25 : 0, laps: status === "verified" ? 6 : 0, directions: status === "verified" ? 2 : 0 }),
    durationMs: 2,
    ...(status === "verified" ? {
      baselineHson: "baseline",
      clockwiseFinalHson: "cw",
      counterclockwiseFinalHson: "ccw",
      finalHtml: "<main></main>",
    } : {
      failure: Object.freeze({ stage: "prepare", code: "CIRCUIT_PREPARE_FAILED", message: "Circuit input could not be parsed as the explicit entry format." }),
    }),
  });
}

type MockService = CircuitVerificationSubmitter & Readonly<{
  calls(): number;
  captured(): CircuitVerificationRequest | undefined;
  listener(): CircuitVerificationProgressListener | undefined;
  disposed(): boolean;
}>;

function mock_service(options: Readonly<{
  status?: CircuitVerificationResult["status"];
  gate?: Promise<void>;
  failure?: CircuitVerificationServiceError;
  progress?: readonly Omit<CircuitVerificationProgress, "panelId" | "inputRevision">[];
}> = {}): MockService {
  let calls = 0;
  let captured: CircuitVerificationRequest | undefined;
  let listener: CircuitVerificationProgressListener | undefined;
  let disposed = false;
  return Object.freeze({
    async submit(value, onProgress) {
      calls += 1;
      captured = value;
      listener = onProgress;
      for (const progress of options.progress ?? []) onProgress?.({ panelId: value.panelId, inputRevision: value.inputRevision, ...progress });
      await options.gate;
      if (options.failure !== undefined) throw options.failure;
      const result = result_for(value, options.status);
      listener = undefined;
      return result;
    },
    dispose() { disposed = true; listener = undefined; },
    calls: () => calls,
    captured: () => captured,
    listener: () => listener,
    disposed: () => disposed,
  });
}

type Pair = Readonly<{
  host: ReturnType<typeof create_circuit_verification_livehost>;
  client: Echo<LiveMap<undefined>, CircuitVerificationActions>;
  clientSocket: PairSocket;
  hostSocket: PairSocket;
  disconnectHost(): void;
  close(): void;
}>;

async function pair(service: CircuitVerificationSubmitter): Promise<Pair> {
  const [clientSocket, hostSocket] = make_socket_pair();
  const host = create_circuit_verification_livehost(service);
  const client = create_echo<undefined, CircuitVerificationActions>({
    socket: clientSocket,
  });
  const disconnectHost = host.connect(hostSocket);
  client.connect();
  await settle();
  return Object.freeze({
    host,
    client,
    clientSocket,
    hostSocket,
    disconnectHost,
    close() {
      client.disconnect();
      disconnectHost();
      host.dispose();
    },
  });
}

async function invalid_payload(payload: unknown): Promise<Readonly<{ type: string; code?: string }>> {
  const service = mock_service();
  const connected = await pair(service);
  try {
    const response = await connected.client.action("circuit.verify", payload as never);
    return { type: response.type, ...(response.type === "error" ? { code: response.error.code } : {}) };
  } finally { connected.close(); }
}

export function circuit_locus_integration_suite(): TestSuite {
  return Object.freeze({
    suite: SUITE,
    descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript", "node", "worker-threads"] as const) }),
    cases: Object.freeze([
      Object.freeze({ suite: SUITE, caseId: "typed-action-returns-a-detached-verification-result", name: "typed action returns a detached verification result", run: async () => {
        const service = mock_service(); const connected = await pair(service);
        try {
          const response = await connected.client.action("circuit.verify", request());
          expect(response.type === "ack" && (response.result as { status?: unknown })?.status === "verified", "valid action must acknowledge a detached result");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "schema-decoder-detaches-and-freezes-payload-before-dispatch", name: "schema decoder detaches and freezes payload before dispatch", run: async () => {
        const service = mock_service(); const connected = await pair(service);
        const original = request();
        try {
          await connected.client.action("circuit.verify", original);
          expect(service.captured() !== original && Object.isFrozen(service.captured()), "handler must receive decoder-owned payload");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "extra-action-fields-reject-before-worker-dispatch", name: "extra action fields reject before worker dispatch", run: async () => {
        const response = await invalid_payload({ ...request(), extra: true });
        expect(response.code === "LOCUS_SCHEMA_INVALID_PAYLOAD", "extra field must be a schema error");
      } }),
      Object.freeze({ suite: SUITE, caseId: "auto-entry-rejects-before-worker-dispatch", name: "auto entry rejects before worker dispatch", run: async () => {
        const response = await invalid_payload({ ...request(), entry: "auto" });
        expect(response.code === "LOCUS_SCHEMA_INVALID_PAYLOAD", "auto must not cross action boundary");
      } }),
      Object.freeze({ suite: SUITE, caseId: "negative-revision-rejects-before-worker-dispatch", name: "negative revision rejects before worker dispatch", run: async () => {
        const response = await invalid_payload({ ...request(), inputRevision: -1 });
        expect(response.code === "LOCUS_SCHEMA_INVALID_PAYLOAD", "negative revision must reject");
      } }),
      Object.freeze({ suite: SUITE, caseId: "fractional-revision-rejects-before-worker-dispatch", name: "fractional revision rejects before worker dispatch", run: async () => {
        const response = await invalid_payload({ ...request(), inputRevision: 1.5 });
        expect(response.code === "LOCUS_SCHEMA_INVALID_PAYLOAD", "fractional revision must reject");
      } }),
      Object.freeze({ suite: SUITE, caseId: "empty-panel-correlation-key-rejects-before-dispatch", name: "empty panel correlation key rejects before dispatch", run: async () => {
        const response = await invalid_payload({ ...request(), panelId: "" });
        expect(response.code === "LOCUS_SCHEMA_INVALID_PAYLOAD", "empty panel key must reject");
      } }),
      Object.freeze({ suite: SUITE, caseId: "source-size-limit-is-enforced-by-the-action-schema", name: "source-size limit is enforced by the action schema", run: async () => {
        const response = await invalid_payload({ ...request(), source: "x".repeat(CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH + 1) });
        expect(response.code === "LOCUS_SCHEMA_INVALID_PAYLOAD", "oversized action source must reject before service");
      } }),
      Object.freeze({ suite: SUITE, caseId: "progress-events-are-connection-scoped-and-ordered-before-ack", name: "progress events are connection scoped and ordered before ack", run: async () => {
        const service = mock_service({ progress: [
          { stage: "queued", completed: 0, total: 7 },
          { stage: "started", completed: 0, total: 7 },
          { stage: "completed", completed: 7, total: 7 },
        ] });
        const first = await pair(service); const second = await pair(service);
        const firstEvents: string[] = []; const secondEvents: string[] = [];
        first.client.onEvent((event) => firstEvents.push(event.event));
        second.client.onEvent((event) => secondEvents.push(event.event));
        try {
          await first.client.action("circuit.verify", request());
          expect(firstEvents.length === 3 && firstEvents.every((event) => event === CIRCUIT_VERIFICATION_PROGRESS_EVENT) && secondEvents.length === 0, "only invoking connection may receive progress");
        } finally { first.close(); second.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "progress-payloads-have-the-bounded-public-shape", name: "progress payloads have the bounded public shape", run: async () => {
        const service = mock_service({ progress: [{ stage: "cw-lap-complete", completed: 1, total: 7, direction: "cw", lap: 1 }] });
        const connected = await pair(service); const payloads: unknown[] = [];
        connected.client.onEvent((event) => payloads.push(event.payload));
        try {
          await connected.client.action("circuit.verify", request());
          expect(payloads.length === 1 && decode_circuit_verification_progress(payloads[0]).ok, "forwarded progress must satisfy its exact decoder");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "source-is-omitted-from-progress-and-transport-result", name: "source is omitted from progress and transport result", run: async () => {
        const source = '{"credential":"never-forward-this-source"}';
        const service = mock_service({ progress: [{ stage: "started", completed: 0, total: 7 }] });
        const connected = await pair(service); const events: unknown[] = [];
        connected.client.onEvent((event) => events.push(event));
        try {
          const response = await connected.client.action("circuit.verify", { ...request(), source });
          expect(!JSON.stringify(events).includes(source) && !JSON.stringify(response).includes(source), "source must not be echoed as protocol evidence");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "verification-failure-remains-a-structured-successful-action-result", name: "verification failure remains a structured successful action result", run: async () => {
        const service = mock_service({ status: "failed" }); const connected = await pair(service);
        try {
          const response = await connected.client.action("circuit.verify", request());
          expect(response.type === "ack" && (response.result as { status?: unknown })?.status === "failed", "semantic failure must not become infrastructure error");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "service-failure-retains-its-stable-livehost-error-code", name: "service failure retains its stable Locus error code", run: async () => {
        const service = mock_service({ failure: new CircuitVerificationServiceError("CIRCUIT_WORKER_UNAVAILABLE", "Circuit verification worker is unavailable.") });
        const connected = await pair(service);
        try {
          const response = await connected.client.action("circuit.verify", request());
          expect(response.type === "error" && response.error.code === "CIRCUIT_WORKER_UNAVAILABLE", "service code must survive Locus normalization");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "ephemeral-verification-leaves-livemap-revision-unchanged", name: "ephemeral verification leaves LiveMap revision unchanged", run: async () => {
        const service = mock_service(); const connected = await pair(service);
        const before = connected.host.map.rev;
        try {
          await connected.client.action("circuit.verify", request());
          expect(connected.host.map.rev === before, "action must not mutate authoritative state");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "ephemeral-verification-emits-no-canonical-commit", name: "ephemeral verification emits no canonical commit", run: async () => {
        const service = mock_service(); const connected = await pair(service);
        try {
          await connected.client.action("circuit.verify", request());
          const messages = connected.hostSocket.sent() as readonly Record<string, unknown>[];
          expect(!messages.some((message) => message.type === "canonical-commit" || message.type === "patch"), "job lifecycle must remain outside LiveMap history");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "pending-logical-retry-shares-one-worker-submission", name: "pending logical retry shares one worker submission", run: async () => {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const service = mock_service({ gate }); const connected = await pair(service);
        try {
          const first = connected.client.action("circuit.verify", request());
          await settle();
          const retry = connected.client.retryAction(first.request);
          await settle();
          release();
          const responses = await Promise.all([first, retry]);
          expect(service.calls() === 1 && responses.every((response) => response.type === "ack"), "pending retry must share the deduped action promise");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "completed-logical-retry-returns-cached-outcome", name: "completed logical retry returns cached outcome", run: async () => {
        const service = mock_service(); const connected = await pair(service);
        try {
          const first = connected.client.action("circuit.verify", request());
          await first;
          const retry = await connected.client.retryAction(first.request);
          expect(service.calls() === 1 && retry.type === "ack" && retry.delivery === "cached", "completed retry must use cached terminal result");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "conflicting-logical-request-reuse-rejects-without-redispatch", name: "conflicting logical request reuse rejects without redispatch", run: async () => {
        const service = mock_service(); const connected = await pair(service);
        try {
          const first = connected.client.action("circuit.verify", request());
          await first;
          const conflicting = await connected.client.retryAction({
            ...first.request,
            payload: { ...request(), inputRevision: 2 } as unknown as JsonValue,
          } as never);
          expect(service.calls() === 1 && conflicting.type === "error" && conflicting.error.code === "LOCUS_ACTION_REQUEST_ID_CONFLICT", "request identity cannot be rebound to a new revision");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "connection-disposal-suppresses-stale-progress", name: "connection disposal suppresses stale progress", run: async () => {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const service = mock_service({ gate }); const connected = await pair(service);
        const action = connected.client.action("circuit.verify", request()).catch(() => undefined);
        await settle();
        connected.client.disconnect(); connected.clientSocket.close(); await settle();
        const accepted = service.listener()?.({ panelId: "panel-a", inputRevision: 1, stage: "started", completed: 0, total: 7 });
        release(); await action;
        connected.disconnectHost(); connected.host.dispose();
        expect(accepted === false, "expired action context emitter must reject stale progress");
      } }),
      Object.freeze({ suite: SUITE, caseId: "action-result-always-carries-panel-and-revision-fencing-keys", name: "action result always carries panel and revision fencing keys", run: async () => {
        const service = mock_service(); const connected = await pair(service);
        try {
          const response = await connected.client.action("circuit.verify", request("panel-fence", 9));
          const result = response.type === "ack" ? response.result as unknown as CircuitVerificationResult : undefined;
          expect(result?.panelId === "panel-fence" && result.inputRevision === 9, "result correlation must match validated request");
        } finally { connected.close(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "coordinator-accepts-only-its-latest-revision", name: "coordinator accepts only its latest revision", run: () => {
        const latest = new Map([["panel-fence", 10]]);
        expect(!revision_is_current(result_for(request("panel-fence", 9)), latest) && revision_is_current(result_for(request("panel-fence", 10)), latest), "strict equality fence must reject stale result");
      } }),
      Object.freeze({ suite: SUITE, caseId: "real-worker-result-traverses-typed-livehost-action", name: "real worker result traverses typed Locus action", run: async () => {
        const service = create_circuit_verification_service(); await service.ready();
        const connected = await pair(service);
        try {
          const response = await connected.client.action("circuit.verify", request("real", 1));
          const result = response.type === "ack" ? response.result as unknown as CircuitVerificationResult : undefined;
          expect(result?.status === "verified" && result.operationCounts.serializations === 24 && result.operationCounts.comparisons === 25, "actual worker certificate must cross Locus intact");
        } finally { connected.close(); await service.dispose(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "node-application-disposal-owns-verifier-service-disposal", name: "Node application disposal owns verifier service disposal", run: async () => {
        const base = mock_service();
        const service = Object.freeze({
          ...base,
          ready: () => Promise.resolve(),
          diagnostics: () => Object.freeze({ workerStarts: 0, workerReplacements: 0, submitted: 0, completed: 0, active: false, pending: 0, disposed: base.disposed() }),
        });
        const application = await create_node_circuit_verification_application({ service });
        await application.registration.dispose();
        expect(base.disposed(), "application disposal must release persistent service");
      } }),
      Object.freeze({ suite: SUITE, caseId: "localhost-node-route-completes-the-worker-backed-livehost-action", name: "localhost Node route completes the worker-backed Locus action", run: async () => {
        const application = await create_node_circuit_verification_application();
        const host = await start_node_application_host({ port: 0, applications: [application.registration] });
        const transport = create_browser_locus_socket(
          `${host.url}/circuit-verification?locus=circuit-verifier`,
          WebSocket as unknown as BrowserWebSocketConstructor,
        );
        let client: Echo<LiveMap<undefined>, CircuitVerificationActions> | undefined;
        try {
          await transport.ready;
          client = create_echo<undefined, CircuitVerificationActions>({ socket: transport.socket });
          client.connect();
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
          const response = await client.action("circuit.verify", request("localhost", 1));
          const result = response.type === "ack" ? response.result as unknown as CircuitVerificationResult : undefined;
          expect(result?.status === "verified" && result.operationCounts.parses === 25, "localhost route must return the universal worker certificate");
        } finally {
          client?.disconnect();
          client?.session.dispose();
          client?.recovery.dispose();
          transport.dispose();
          await host.dispose();
        }
      } }),
    ]),
  });
}
