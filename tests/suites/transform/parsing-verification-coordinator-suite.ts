import type { TestSuite } from "../../harness/core/test-contracts";
import {
  CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH,
  type CircuitVerificationEntry,
  type CircuitVerificationProgress,
  type CircuitVerificationRequest,
  type CircuitVerificationResult,
} from "../../../src/shared/circuit-verification-contract";
import {
  create_parsing_verification_coordinator,
  PARSING_VERIFICATION_DEBOUNCE_MS,
  type ParsingBrowserCertificateResult,
  type ParsingVerificationScheduler,
  type ParsingVerificationState,
  type ParsingVerificationTransport,
} from "../../../src/app/demos/parse/parsing-verification-coordinator";

const SUITE = "transform/parsing-verification-coordinator";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`parsing verification coordinator: ${message}`);
}

function scheduler_fixture() {
  let next = 0;
  const retained = new Map<number, Readonly<{ delay: number; callback: () => void }>>();
  const scheduler: ParsingVerificationScheduler = Object.freeze({
    set(delay, callback) {
      next += 1;
      retained.set(next, { delay, callback });
      return next;
    },
    clear(handle) { retained.delete(handle as number); },
  });
  return Object.freeze({
    scheduler,
    count: () => retained.size,
    delays: () => [...retained.values()].map((item) => item.delay),
    runNext() {
      const item = retained.entries().next().value as [number, Readonly<{ callback: () => void }>] | undefined;
      if (item === undefined) return;
      retained.delete(item[0]);
      item[1].callback();
    },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => { resolve = nextResolve; reject = nextReject; });
  return { promise, resolve, reject };
}

function result_for(request: CircuitVerificationRequest, status: CircuitVerificationResult["status"] = "verified"): CircuitVerificationResult {
  return Object.freeze({
    panelId: request.panelId,
    inputRevision: request.inputRevision,
    status,
    entry: request.entry,
    operationCounts: Object.freeze({ serializations: 24, parses: 25, comparisons: 25, laps: 6, directions: 2 }),
    durationMs: 4,
    ...(status === "verified"
      ? { baselineHson: "<ok true>", clockwiseFinalHson: "<ok true>", counterclockwiseFinalHson: "<ok true>", finalHtml: "<ok>true</ok>" }
      : { failure: Object.freeze({ stage: "parse", code: "CIRCUIT_PARSE_FAILED", message: "Circuit parse failed." }) }),
  });
}

function certificate_for(entry: CircuitVerificationEntry, revision: number): ParsingBrowserCertificateResult {
  return Object.freeze({
    ok: true,
    certificate: Object.freeze({
      entry,
      inputRevision: revision,
      operationCounts: Object.freeze({ serializations: 24, parses: 25, comparisons: 25, laps: 6, directions: 2 }),
      workerDurationMs: 4,
      browserCheckDurationMs: 1,
      browserFinalMatchesBaseline: true,
      browserOriginMatchesBaseline: true,
    }),
  });
}

function fixture(input: Readonly<{
  admit?: (entry: CircuitVerificationEntry, source: string) => { ok: true; admission: string } | { ok: false; diagnostic: { category: "immediate"; code: string; message: string } };
  certify?: (entry: CircuitVerificationEntry, revision: number) => ParsingBrowserCertificateResult | Promise<ParsingBrowserCertificateResult>;
}> = {}) {
  const clock = scheduler_fixture();
  const submissions: CircuitVerificationRequest[] = [];
  const completions: ReturnType<typeof deferred<CircuitVerificationResult>>[] = [];
  const progressListeners: Array<(progress: CircuitVerificationProgress) => void> = [];
  const states: ParsingVerificationState[] = [];
  let disposed = false;
  const transport: ParsingVerificationTransport = Object.freeze({
    submit(request, onProgress) {
      submissions.push(request);
      progressListeners.push(onProgress);
      const completion = deferred<CircuitVerificationResult>();
      completions.push(completion);
      return completion.promise;
    },
    dispose() { disposed = true; },
  });
  const coordinator = create_parsing_verification_coordinator({
    panelId: "panel-coordinator",
    scheduler: clock.scheduler,
    transport,
    admit: input.admit ?? ((_entry, source) => source === "bad"
      ? { ok: false, diagnostic: { category: "immediate", code: "IMMEDIATE_PARSE_FAILED", message: "Invalid." } }
      : { ok: true, admission: source }),
    certify: async ({ entry, inputRevision }) => input.certify?.(entry, inputRevision) ?? certificate_for(entry, inputRevision),
    onState: (state) => states.push(state),
  });
  return Object.freeze({ coordinator, clock, submissions, completions, progressListeners, states, disposed: () => disposed });
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export function parsing_verification_coordinator_suite(): TestSuite {
  return Object.freeze({
    suite: SUITE,
    descriptor: Object.freeze({ subject: "transform", requirements: Object.freeze(["javascript"] as const) }),
    cases: Object.freeze([
      Object.freeze({ suite: SUITE, caseId: "begins-in-explicit-idle-state", name: "begins in explicit idle state", run: () => {
        const f = fixture(); expect(f.coordinator.snapshot().status === "idle", "initial state must be idle"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "each-authored-edit-increments-the-local-revision", name: "each authored edit increments the local revision", run: () => {
        const f = fixture(); expect(f.coordinator.edit("hson", "one") === 1 && f.coordinator.edit("hson", "two") === 2, "revisions must increase monotonically"); f.coordinator.dispose();
      } }),
      ...(["hson", "json", "html"] as const).map((entry) => Object.freeze({ suite: SUITE, caseId: `dispatch-preserves-${entry}-origin`, name: `dispatch preserves explicit ${entry} origin`, run: async () => {
        const f = fixture(); f.coordinator.edit(entry, "source"); f.clock.runNext(); await settle(); expect(f.submissions[0]?.entry === entry, "request entry must equal authored origin"); f.coordinator.dispose();
      } })),
      Object.freeze({ suite: SUITE, caseId: "successful-immediate-admission-becomes-parsed-before-debounce", name: "successful immediate admission becomes parsed before debounce", run: () => {
        const f = fixture(); f.coordinator.edit("json", "{}"); expect(f.coordinator.snapshot().status === "parsed" && f.submissions.length === 0, "local parse must be immediate and remote work delayed"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "immediate-parse-failure-is-terminal-without-dispatch", name: "immediate parse failure is terminal without dispatch", run: () => {
        const f = fixture(); f.coordinator.edit("hson", "bad"); expect(f.coordinator.snapshot().status === "invalid" && f.clock.count() === 0 && f.submissions.length === 0, "invalid source must not reach worker"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "rapid-edits-collapse-to-one-latest-debounce", name: "rapid edits collapse to one latest debounce", run: async () => {
        const f = fixture(); f.coordinator.edit("hson", "one"); f.coordinator.edit("hson", "two"); f.coordinator.edit("hson", "three"); expect(f.clock.count() === 1, "only latest timer may remain"); f.clock.runNext(); await settle(); expect(f.submissions.length === 1 && f.submissions[0]?.source === "three", "only latest source may dispatch"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "default-debounce-is-exactly-300-milliseconds", name: "default debounce is exactly 300 milliseconds", run: () => {
        const f = fixture(); f.coordinator.edit("json", "{}"); expect(f.clock.delays()[0] === PARSING_VERIFICATION_DEBOUNCE_MS && PARSING_VERIFICATION_DEBOUNCE_MS === 300, "one reported constant must own debounce"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "flush-bypasses-a-pending-debounce", name: "flush bypasses a pending debounce", run: async () => {
        const f = fixture(); f.coordinator.edit("html", "<p>x</p>"); f.coordinator.flush(); await settle(); expect(f.clock.count() === 0 && f.submissions.length === 1, "flush must launch pending work"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "flush-cannot-duplicate-active-work", name: "flush cannot duplicate active work", run: async () => {
        const f = fixture(); f.coordinator.edit("html", "<p>x</p>"); f.coordinator.flush(); f.coordinator.flush(); await settle(); expect(f.submissions.length === 1, "repeated blur flush must not duplicate action"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "dispatch-transitions-to-queued-before-transport", name: "dispatch transitions to queued before transport", run: async () => {
        const f = fixture(); f.coordinator.edit("hson", "x"); f.clock.runNext(); await settle(); expect(f.coordinator.snapshot().status === "queued", "dispatch must expose queued"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "current-bounded-progress-transitions-to-verifying", name: "current bounded progress transitions to verifying", run: async () => {
        const f = fixture(); f.coordinator.edit("hson", "x"); f.clock.runNext(); await settle(); f.progressListeners[0]?.({ panelId: "panel-coordinator", inputRevision: 1, stage: "cw-lap-complete", completed: 2, total: 7, direction: "cw", lap: 2 }); expect(f.coordinator.snapshot().status === "verifying", "current progress must be visible"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "stale-progress-is-ignored", name: "stale progress is ignored", run: async () => {
        const f = fixture(); f.coordinator.edit("hson", "one"); f.clock.runNext(); await settle(); f.coordinator.edit("hson", "two"); f.progressListeners[0]?.({ panelId: "panel-coordinator", inputRevision: 1, stage: "started", completed: 0, total: 7 }); expect(f.coordinator.snapshot().status === "parsed" && f.coordinator.revision() === 2, "old progress cannot replace newer parsed state"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "wrong-panel-progress-is-ignored", name: "wrong-panel progress is ignored", run: async () => {
        const f = fixture(); f.coordinator.edit("json", "one"); f.clock.runNext(); await settle(); f.progressListeners[0]?.({ panelId: "another", inputRevision: 1, stage: "started", completed: 0, total: 7 }); expect(f.coordinator.snapshot().status === "queued", "foreign progress must not update state"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "stale-completion-cannot-certify-a-newer-edit", name: "stale completion cannot certify a newer edit", run: async () => {
        const f = fixture(); f.coordinator.edit("hson", "one"); f.clock.runNext(); await settle(); f.coordinator.edit("hson", "two"); f.completions[0]?.resolve(result_for(f.submissions[0]!)); await settle(); expect(f.coordinator.snapshot().status === "parsed" && f.coordinator.revision() === 2, "old result must be silent"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "current-superseded-result-is-not-displayed-as-failure", name: "current superseded result is not displayed as failure", run: async () => {
        const f = fixture(); f.coordinator.edit("hson", "one"); f.clock.runNext(); await settle(); f.completions[0]?.resolve(result_for(f.submissions[0]!, "superseded")); await settle(); expect(f.coordinator.snapshot().status === "parsed", "supersession must remain non-error state"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "universal-semantic-failure-is-distinct", name: "universal semantic failure is distinct", run: async () => {
        const f = fixture(); f.coordinator.edit("hson", "one"); f.clock.runNext(); await settle(); f.completions[0]?.resolve(result_for(f.submissions[0]!, "failed")); await settle(); const state = f.coordinator.snapshot(); expect(state.status === "failed" && state.failure.category === "universal", "worker semantic failure needs universal category"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "transport-rejection-becomes-unavailable", name: "transport rejection becomes unavailable", run: async () => {
        const f = fixture(); f.coordinator.edit("json", "{}"); f.clock.runNext(); await settle(); f.completions[0]?.reject(Object.assign(new Error("private"), { code: "CIRCUIT_WORKER_UNAVAILABLE" })); await settle(); const state = f.coordinator.snapshot(); expect(state.status === "unavailable" && state.failure.code === "CIRCUIT_WORKER_UNAVAILABLE", "service outage must not become parse failure"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "oversized-locally-parsed-source-is-not-dispatched", name: "oversized locally parsed source is not dispatched", run: () => {
        const f = fixture(); f.coordinator.edit("hson", "x".repeat(CIRCUIT_VERIFICATION_MAX_SOURCE_LENGTH + 1)); expect(f.coordinator.snapshot().status === "unavailable" && f.clock.count() === 0, "hard source limit must preserve preview without remote action"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "successful-worker-result-enters-browser-check-then-verified", name: "successful worker result enters browser check then verified", run: async () => {
        const certificateGate = deferred<ParsingBrowserCertificateResult>();
        const f = fixture({ certify: () => certificateGate.promise }); f.coordinator.edit("html", "<p>x</p>"); f.clock.runNext(); await settle(); f.completions[0]?.resolve(result_for(f.submissions[0]!)); await settle(); expect(f.coordinator.snapshot().status === "browser-check", "worker success is only provisional"); certificateGate.resolve(certificate_for("html", 1)); await settle(); expect(f.coordinator.snapshot().status === "verified", "browser certificate owns final success"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "stale-browser-check-cannot-publish-certificate", name: "stale browser check cannot publish certificate", run: async () => {
        const certificateGate = deferred<ParsingBrowserCertificateResult>();
        const f = fixture({ certify: () => certificateGate.promise }); f.coordinator.edit("html", "one"); f.clock.runNext(); await settle(); f.completions[0]?.resolve(result_for(f.submissions[0]!)); await settle(); f.coordinator.edit("html", "two"); certificateGate.resolve(certificate_for("html", 1)); await settle(); expect(f.coordinator.snapshot().status === "parsed" && f.coordinator.revision() === 2, "old browser result must be ignored"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "browser-disagreement-has-a-distinct-failure-category", name: "browser disagreement has a distinct failure category", run: async () => {
        const f = fixture({ certify: () => ({ ok: false, failure: { category: "browser-boundary", code: "BROWSER_CERTIFICATE_FINAL_HTML_DIFFERENCE", message: "Different." } }) }); f.coordinator.edit("html", "one"); f.clock.runNext(); await settle(); f.completions[0]?.resolve(result_for(f.submissions[0]!)); await settle(); const state = f.coordinator.snapshot(); expect(state.status === "failed" && state.failure.category === "browser-boundary", "browser boundary failure must remain distinct"); f.coordinator.dispose();
      } }),
      Object.freeze({ suite: SUITE, caseId: "disposal-clears-debounce-and-owns-transport-cleanup", name: "disposal clears debounce and owns transport cleanup", run: () => {
        const f = fixture(); f.coordinator.edit("hson", "one"); f.coordinator.dispose(); expect(f.clock.count() === 0 && f.disposed(), "dispose must clear timer and release transport");
      } }),
      Object.freeze({ suite: SUITE, caseId: "post-disposal-completion-cannot-update-detached-state", name: "post-disposal completion cannot update detached state", run: async () => {
        const f = fixture(); f.coordinator.edit("hson", "one"); f.clock.runNext(); await settle(); const before = f.coordinator.snapshot(); f.coordinator.dispose(); f.completions[0]?.resolve(result_for(f.submissions[0]!)); await settle(); expect(f.coordinator.snapshot() === before, "disposed coordinator must retain its last detached snapshot");
      } }),
    ]),
  });
}
