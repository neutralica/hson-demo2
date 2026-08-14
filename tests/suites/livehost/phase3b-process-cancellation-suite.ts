import { fileURLToPath } from "node:url";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import type { ExternalLibraryLauncherTarget } from "../../../src/shared/testing/external-launcher-contract";
import {
  create_external_library_launcher_service,
  EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS,
  HSON_LIVE_TEST_COMPLETION_PREFIX,
  resolve_external_library_launchers,
  type ExternalLibraryLauncherAvailability,
  type ExternalLibraryLauncherResult,
} from "../../harness/runtimes/node/external-library-launchers";
import { run_external_library_launcher_pool } from "../../harness/runtimes/node/run-node-selected-verifications";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 3B process cancellation: ${message}`);
}

function test_case(suite: string, caseId: string, name: string, run: TestCase["run"]): TestCase {
  return Object.freeze({ suite, caseId, name, run });
}

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function eventually(condition: () => boolean, message: string): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (condition()) return;
    await tick();
  }
  throw new Error(`Phase 3B process cancellation did not observe ${message}.`);
}

const fixturePath = fileURLToPath(new URL("../../fixtures/protocol/external-launcher-protocol-fixture.mjs", import.meta.url));

let targetPromise: Promise<ExternalLibraryLauncherTarget> | undefined;
async function target(): Promise<ExternalLibraryLauncherTarget> {
  targetPromise ??= resolve_external_library_launchers().then((availability) => {
    const selected = availability.targets.find((entry) => entry.launcherId === "transform.hson-tokenizer");
    if (selected === undefined) throw new Error("Phase 3B process fixture requires the manifested tokenizer launcher.");
    return selected;
  });
  return targetPromise;
}

function availability_for(
  selected: ExternalLibraryLauncherTarget,
  scenario: string,
): ExternalLibraryLauncherAvailability {
  return Object.freeze({
    repositoryRoot: process.cwd(),
    targets: Object.freeze([selected]),
    unavailable: Object.freeze([]),
    invocations: Object.freeze({
      [selected.id]: Object.freeze({
        kind: "direct" as const,
        command: process.execPath,
        args: Object.freeze([fixturePath, scenario, selected.launcherId, String(selected.executableChecks)]),
        env: Object.freeze({}),
      }),
    }),
  });
}

async function cancelled_scenario(
  scenario: "graceful-timeout" | "resistant-timeout",
  duplicate = false,
): Promise<Readonly<{ result: ExternalLibraryLauncherResult; activeChildren: number; elapsedMs: number }>> {
  const selected = await target();
  const service = create_external_library_launcher_service();
  const controller = new AbortController();
  const startedAt = performance.now();
  let readyResolve = (): void => undefined;
  const ready = new Promise<void>((resolve) => { readyResolve = resolve; });
  const running = service.run(availability_for(selected, scenario), selected.id, {
    timeoutMs: 10_000,
    signal: controller.signal,
    observeStdoutChunk(text) { if (text.includes("ready")) readyResolve(); },
  });
  await eventually(() => service.metrics().activeChildren === 1, "one active child");
  await ready;
  controller.abort();
  if (duplicate) controller.abort();
  const result = await running;
  return Object.freeze({
    result,
    activeChildren: service.metrics().activeChildren,
    elapsedMs: performance.now() - startedAt,
  });
}

let gracefulEvidence: Promise<Awaited<ReturnType<typeof cancelled_scenario>>> | undefined;
const graceful = () => (gracefulEvidence ??= cancelled_scenario("graceful-timeout"));
let resistantEvidence: Promise<Awaited<ReturnType<typeof cancelled_scenario>>> | undefined;
const resistant = () => (resistantEvidence ??= cancelled_scenario("resistant-timeout"));

export function phase3b_process_cancellation_suite(): TestSuite {
  const suite = "livehost/cancellation-process";
  return Object.freeze({
    suite,
    descriptor: Object.freeze({ subject: "livehost" as const, requirements: Object.freeze(["javascript", "node"] as const) }),
    cases: Object.freeze([
      test_case(suite, "graceful-termination", "running child receives graceful cancellation", async () => {
        const evidence = await graceful();
        expect(evidence.result.cancelled === true && evidence.result.forceKilled !== true, "cooperative child exits during grace period");
        expect(evidence.activeChildren === 0, "graceful child handle is released");
      }),
      test_case(suite, "forced-termination", "resistant child receives bounded force termination", async () => {
        const evidence = await resistant();
        expect(evidence.result.cancelled === true && evidence.result.forceKilled === true && evidence.result.signal === "SIGKILL", "resistant child is force-killed truthfully");
        expect(evidence.elapsedMs >= EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS, "force kill waits for the established grace bound");
        expect(evidence.activeChildren === 0, "force-killed child handle is released");
      }),
      test_case(suite, "duplicate-abort", "duplicate abort does not duplicate termination", async () => {
        const evidence = await cancelled_scenario("graceful-timeout", true);
        expect(evidence.result.cancelled === true && evidence.activeChildren === 0, "AbortSignal one-shot delivery remains idempotent");
      }),
      test_case(suite, "completion-before-cancel", "valid completion before cancellation preserves counts", async () => {
        const selected = await target();
        const service = create_external_library_launcher_service();
        const controller = new AbortController();
        let stdout = "";
        let completionResolve = (): void => undefined;
        const completionObserved = new Promise<void>((resolve) => { completionResolve = resolve; });
        const running = service.run(availability_for(selected, "completed-then-wait"), selected.id, {
          timeoutMs: 10_000,
          signal: controller.signal,
          observeStdoutChunk(text) {
            stdout += text;
            if (stdout.includes(HSON_LIVE_TEST_COMPLETION_PREFIX)) completionResolve();
          },
        });
        await completionObserved;
        controller.abort();
        const result = await running;
        expect(result.completionAcceptedBeforeCancellation === true && result.cancelled !== true, "pre-fence completion control frame wins authority ordering");
        expect(result.completion?.executed === selected.executableChecks && result.ok, "actual aggregate counts are preserved");
        expect(service.metrics().activeChildren === 0, "post-completion cancellation still releases the lingering process");
      }),
      test_case(suite, "queued-launchers-fenced", "queued launcher does not spawn after cancellation", async () => {
        const base = await target();
        const targets = Object.freeze(Array.from({ length: 3 }, (_, index) => Object.freeze({
          ...base,
          id: `${base.id}/phase3b-${index}`,
        })));
        const invocations = Object.fromEntries(targets.map((entry) => [entry.id, Object.freeze({
          kind: "direct" as const,
          command: process.execPath,
          args: Object.freeze([fixturePath, "graceful-timeout", entry.launcherId, String(entry.executableChecks)]),
          env: Object.freeze({}),
        })]));
        const availability: ExternalLibraryLauncherAvailability = Object.freeze({
          repositoryRoot: process.cwd(),
          targets,
          unavailable: Object.freeze([]),
          invocations: Object.freeze(invocations),
        });
        const service = create_external_library_launcher_service();
        const controller = new AbortController();
        let started = 0;
        const pooled = run_external_library_launcher_pool(
          targets,
          (entry) => service.run(availability, entry.id, { timeoutMs: 10_000, signal: controller.signal }),
          1,
          { started() { started += 1; } },
          controller.signal,
        );
        await eventually(() => service.metrics().activeChildren === 1, "first pooled child");
        controller.abort();
        await pooled;
        expect(started === 1 && service.metrics().activeChildren === 0, "pool fence prevents both queued launchers from spawning");
      }),
    ]),
  });
}
