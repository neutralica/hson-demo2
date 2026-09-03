import { EventEmitter } from "node:events";
import type { TestSuite } from "../../harness/core/test-contracts";
import {
  CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH,
  type CircuitVerificationRequest,
  type CircuitVerificationResult,
} from "../../../src/shared/circuit-verification-contract";
import {
  CircuitVerificationServiceError,
  circuit_source_for_entry,
  create_circuit_verification_service,
  revision_is_current,
  type CircuitVerificationServiceOptions,
} from "../../../src/server/circuit/circuit-verification-service";

const SUITE = "livehost/circuit-worker-service";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`circuit worker service: ${message}`);
}

function request(panelId: string, inputRevision: number, entry: "hson" | "json" | "html" = "json"): CircuitVerificationRequest {
  return Object.freeze({ panelId, inputRevision, entry, source: circuit_source_for_entry(entry) });
}

async function error_code(run: () => Promise<unknown>): Promise<string | undefined> {
  try { await run(); }
  catch (error) { return error instanceof CircuitVerificationServiceError ? error.code : undefined; }
  return undefined;
}

async function with_service<T>(run: (service: ReturnType<typeof create_circuit_verification_service>) => Promise<T>): Promise<T> {
  const service = create_circuit_verification_service();
  try {
    await service.ready();
    return await run(service);
  } finally {
    await service.dispose();
  }
}

function fake_result(requestValue: CircuitVerificationRequest): CircuitVerificationResult {
  return Object.freeze({
    panelId: requestValue.panelId,
    inputRevision: requestValue.inputRevision,
    status: "verified",
    entry: requestValue.entry,
    operationCounts: Object.freeze({ serializations: 24, parses: 25, comparisons: 25, laps: 6, directions: 2 }),
    durationMs: 1,
    baselineHson: "baseline",
    clockwiseFinalHson: "cw",
    counterclockwiseFinalHson: "ccw",
    finalHtml: "<main></main>",
  });
}

type FakeMode = "complete" | "startup-crash" | "run-crash" | "malformed" | "failed";

class FakeWorker extends EventEmitter {
  readonly threadId: number;
  terminated = false;

  constructor(readonly mode: FakeMode, threadId: number) {
    super();
    this.threadId = threadId;
  }

  postMessage(message: unknown): void {
    const value = message as Record<string, unknown>;
    if (value.kind === "initialize") {
      queueMicrotask(() => {
        if (this.mode === "startup-crash") this.emit("error", new Error("fixture startup crash"));
        else this.emit("message", { kind: "initialized", protocolVersion: 1 });
      });
      return;
    }
    if (value.kind !== "run") return;
    const requestValue = value.request as CircuitVerificationRequest;
    queueMicrotask(() => {
      if (this.mode === "run-crash") {
        this.emit("error", new Error("fixture run crash"));
      } else if (this.mode === "malformed") {
        this.emit("message", { kind: "complete", jobId: value.jobId, result: {} });
      } else if (this.mode === "failed") {
        this.emit("message", {
          kind: "failed",
          jobId: value.jobId,
          panelId: requestValue.panelId,
          inputRevision: requestValue.inputRevision,
          entry: requestValue.entry,
          code: "CIRCUIT_WORKER_EXECUTION_FAILED",
          message: "Worker could not execute the universal Transform circuit.",
        });
      } else {
        this.emit("message", {
          kind: "complete",
          jobId: value.jobId,
          panelId: requestValue.panelId,
          inputRevision: requestValue.inputRevision,
          result: fake_result(requestValue),
        });
      }
    });
  }

  terminate(): Promise<number> {
    this.terminated = true;
    return Promise.resolve(0);
  }
}

function fake_options(factory: () => FakeWorker, maxWorkerReplacements = 2): CircuitVerificationServiceOptions {
  return {
    maxWorkerReplacements,
    workerFactory: factory as unknown as NonNullable<CircuitVerificationServiceOptions["workerFactory"]>,
  };
}

export function circuit_worker_service_suite(): TestSuite {
  return Object.freeze({
    suite: SUITE,
    descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript", "node", "worker-threads"] as const) }),
    cases: Object.freeze([
      Object.freeze({ suite: SUITE, caseId: "starts-exactly-one-persistent-worker", name: "starts exactly one persistent worker", run: () => with_service(async (service) => {
        expect(service.diagnostics().workerStarts === 1, "ready service must own one worker");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "reuses-the-warm-worker-across-requests", name: "reuses the warm worker across requests", run: () => with_service(async (service) => {
        const threadId = service.diagnostics().workerThreadId;
        await service.submit(request("warm-a", 1));
        await service.submit(request("warm-b", 1));
        expect(service.diagnostics().workerStarts === 1 && service.diagnostics().workerThreadId === threadId, "two jobs must reuse one thread");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "verifies-explicit-hson", name: "verifies explicit Hson", run: () => with_service(async (service) => {
        expect((await service.submit(request("hson", 1, "hson"))).status === "verified", "Hson must verify");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "verifies-explicit-json", name: "verifies explicit JSON", run: () => with_service(async (service) => {
        expect((await service.submit(request("json", 1, "json"))).status === "verified", "JSON must verify");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "verifies-explicit-html-with-the-universal-parser", name: "verifies explicit HTML with the universal parser", run: () => with_service(async (service) => {
        const result = await service.submit(request("html", 1, "html"));
        expect(result.status === "verified" && result.finalHtml?.includes("main") === true, "HTML must verify universally");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "reports-exact-successful-operation-counts", name: "reports exact successful operation counts", run: () => with_service(async (service) => {
        const counts = (await service.submit(request("counts", 1))).operationCounts;
        expect(JSON.stringify(counts) === JSON.stringify({ serializations: 24, parses: 25, comparisons: 25, laps: 6, directions: 2 }), "counts must be 24/25/25/6/2");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "returns-malformed-source-as-a-structured-verification-failure", name: "returns malformed source as a structured verification failure", run: () => with_service(async (service) => {
        const result = await service.submit({ ...request("malformed", 1), source: "{" });
        expect(result.status === "failed" && result.failure?.code === "CIRCUIT_PREPARE_FAILED", "malformed source must not reject infrastructure");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "naturally-bounds-progress-events", name: "naturally bounds progress events", run: () => with_service(async (service) => {
        const stages: string[] = [];
        await service.submit(request("progress", 1), (progress) => { stages.push(progress.stage); });
        expect(stages.length === 10 && stages[0] === "queued" && stages.at(-1) === "completed", "progress must contain queue/start, seven semantic stages, and terminal completion");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "omits-source-from-every-progress-event", name: "omits source from every progress event", run: () => with_service(async (service) => {
        const source = '{"private":"do-not-emit"}';
        const events: unknown[] = [];
        await service.submit({ ...request("safe-progress", 1), source }, (progress) => { events.push(progress); });
        expect(!JSON.stringify(events).includes(source) && !JSON.stringify(events).includes("private"), "progress must contain no source evidence");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "same-panel-newer-revision-supersedes-active-work", name: "same-panel newer revision supersedes active work", run: () => with_service(async (service) => {
        const first = service.submit(request("same-panel", 1));
        const second = service.submit(request("same-panel", 2));
        const [oldResult, currentResult] = await Promise.all([first, second]);
        expect(oldResult.status === "superseded" && currentResult.status === "verified", "newer revision must supersede only its predecessor");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "different-panels-retain-fifo-execution", name: "different panels retain FIFO execution", run: () => with_service(async (service) => {
        const starts: string[] = [];
        const first = service.submit(request("fifo-a", 1), (progress) => { if (progress.stage === "started") starts.push(progress.panelId); });
        const second = service.submit(request("fifo-b", 1), (progress) => { if (progress.stage === "started") starts.push(progress.panelId); });
        await Promise.all([first, second]);
        expect(starts.join(",") === "fifo-a,fifo-b", "distinct panels must start in FIFO order");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "pending-same-panel-replacements-collapse-to-latest", name: "pending same-panel replacements collapse to latest", run: () => with_service(async (service) => {
        const first = service.submit(request("collapse", 1));
        const second = service.submit(request("collapse", 2));
        const third = service.submit(request("collapse", 3));
        const results = await Promise.all([first, second, third]);
        expect(results.map((result) => result.status).join(",") === "superseded,superseded,verified", "only latest replacement may execute");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "lower-or-equal-in-flight-revision-is-fenced-as-stale", name: "lower or equal in-flight revision is fenced as stale", run: () => with_service(async (service) => {
        const current = service.submit(request("stale", 3));
        const stale = service.submit(request("stale", 2));
        const staleResult = await stale;
        await current;
        expect(staleResult.status === "superseded" && staleResult.inputRevision === 2, "stale revision must never become current");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "listener-closure-cancels-at-a-real-worker-checkpoint", name: "listener closure cancels at a real worker checkpoint", run: () => with_service(async (service) => {
        const result = await service.submit(request("cancel", 1), (progress) => progress.stage === "started" ? false : undefined);
        expect(result.status === "cancelled" && result.operationCounts.parses <= 1, "closed listener must flip the atomic cancellation flag");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "post-lap-cancellation-preserves-completed-operation-evidence", name: "post-lap cancellation preserves completed operation evidence", run: () => with_service(async (service) => {
        let completedEvidenceObserved = false;
        const result = await service.submit(request("cancel-lap", 1), (progress) => {
          if (progress.stage !== "cw-lap-complete") return undefined;
          completedEvidenceObserved = progress.lap === 1 && progress.completed === 1;
          return false;
        });
        expect(
          completedEvidenceObserved
            && result.status === "cancelled"
            && result.operationCounts.laps === 1
            && result.operationCounts.serializations >= 4
            && result.operationCounts.serializations <= 8,
          "cancellation must retain actual completed work within one bounded lap",
        );
      }) }),
      Object.freeze({ suite: SUITE, caseId: "global-pending-capacity-rejects-independent-overflow", name: "global pending capacity rejects independent overflow", run: async () => {
        const service = create_circuit_verification_service({ maxPending: 1 });
        try {
          await service.ready();
          const active = service.submit(request("capacity-a", 1));
          const pending = service.submit(request("capacity-b", 1));
          const code = await error_code(() => service.submit(request("capacity-c", 1)));
          await Promise.all([active, pending]);
          expect(code === "CIRCUIT_QUEUE_CAPACITY", "third independent job must reject at capacity");
        } finally { await service.dispose(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "direct-source-limit-rejects-before-dispatch", name: "direct source limit rejects before dispatch", run: () => with_service(async (service) => {
        const code = await error_code(() => service.submit({ ...request("large", 1), source: "x".repeat(CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH + 1) }));
        expect(code === "CIRCUIT_SOURCE_TOO_LARGE" && service.diagnostics().submitted === 0, "oversized source must not reach worker queue");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "worker-startup-failure-rejects-cleanly", name: "worker startup failure rejects cleanly", run: async () => {
        let id = 0;
        const service = create_circuit_verification_service(fake_options(() => new FakeWorker("startup-crash", ++id), 0));
        try {
          const code = await error_code(service.ready);
          expect(code === "CIRCUIT_WORKER_STARTUP_FAILED", "startup failure must be machine distinguishable");
        } finally { await service.dispose(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "worker-crash-fails-the-owning-active-job", name: "worker crash fails the owning active job", run: async () => {
        let id = 0;
        const service = create_circuit_verification_service(fake_options(() => new FakeWorker("run-crash", ++id)));
        try {
          await service.ready();
          const code = await error_code(() => service.submit(request("crash", 1)));
          expect(code === "CIRCUIT_WORKER_CRASH", "active crash must reject its owning job");
        } finally { await service.dispose(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "crashed-worker-is-replaced-once-and-service-recovers", name: "crashed worker is replaced once and service recovers", run: async () => {
        let starts = 0;
        const service = create_circuit_verification_service(fake_options(() => new FakeWorker(starts++ === 0 ? "run-crash" : "complete", starts)));
        try {
          await service.ready();
          await error_code(() => service.submit(request("replace-a", 1)));
          while (service.diagnostics().workerStarts < 2) await new Promise((resolve) => setTimeout(resolve, 0));
          await service.ready();
          const result = await service.submit(request("replace-b", 1));
          expect(result.status === "verified" && service.diagnostics().workerReplacements === 1, "bounded replacement must restore service");
        } finally { await service.dispose(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "malformed-worker-reply-fails-the-owner-and-replaces-worker", name: "malformed worker reply fails the owner and replaces worker", run: async () => {
        let starts = 0;
        const service = create_circuit_verification_service(fake_options(() => new FakeWorker(starts++ === 0 ? "malformed" : "complete", starts)));
        try {
          await service.ready();
          const code = await error_code(() => service.submit(request("protocol", 1)));
          expect(code === "CIRCUIT_WORKER_PROTOCOL_VIOLATION", "malformed reply must not be trusted");
        } finally { await service.dispose(); }
      } }),
      Object.freeze({ suite: SUITE, caseId: "disposal-rejects-active-work-and-prevents-later-execution", name: "disposal rejects active work and prevents later execution", run: async () => {
        const service = create_circuit_verification_service();
        await service.ready();
        const pending = service.submit(request("dispose-active", 1)).then(
          () => undefined,
          (error: unknown) => error instanceof CircuitVerificationServiceError ? error.code : undefined,
        );
        await service.dispose();
        const [activeCode, laterCode] = await Promise.all([
          pending,
          error_code(() => service.submit(request("dispose-later", 1))),
        ]);
        expect(activeCode === "CIRCUIT_SERVICE_DISPOSED" && laterCode === "CIRCUIT_SERVICE_DISPOSED", "disposal must settle ownership and fence future jobs");
      } }),
      Object.freeze({ suite: SUITE, caseId: "revision-fencing-accepts-only-the-latest-panel-result", name: "revision fencing accepts only the latest panel result", run: () => with_service(async (service) => {
        const result = await service.submit(request("fence", 4));
        const latest = new Map([["fence", 5]]);
        expect(!revision_is_current(result, latest) && revision_is_current({ ...result, inputRevision: 5 }, latest), "coordinator equality fence must reject stale completion");
      }) }),
      Object.freeze({ suite: SUITE, caseId: "one-jobs-detached-result-cannot-leak-into-the-next", name: "one job's detached result cannot leak into the next", run: () => with_service(async (service) => {
        const first = await service.submit({ ...request("isolation-a", 1), source: '{"value":"first"}' });
        const second = await service.submit({ ...request("isolation-b", 1), source: '{"value":"second"}' });
        expect(first.baselineHson?.includes("first") === true && second.baselineHson?.includes("first") === false, "worker state must remain job-local");
      }) }),
    ]),
  });
}
