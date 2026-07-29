import type { RunOptions, RunResult, TestEvent, TestFailure } from "../app/demos/test/tests.types";
import type { TestExecutorRegistry } from "../test-system/test-executor";
import {
  external_library_launcher_termination_generation,
  run_external_library_launcher,
  type ExternalLibraryLauncherService,
  type ExternalLibraryLauncherAvailability,
  type ExternalLibraryLauncherResult,
  type ExternalLibraryLauncherTarget,
} from "../test-system/external-library-launchers";
import { run_fresh_node_selected_test_ids } from "./run-node-selected-test-suites";

export const EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY = 2;

export type ExternalLibraryLauncherPoolScheduling =
  | number
  | Readonly<{
      initialConcurrency: number;
      maximumConcurrency: number;
      increaseAfter: PromiseLike<unknown>;
    }>;

export type ExternalLibraryLauncherPoolResult<T> = Readonly<{
  results: readonly T[];
  maximumConcurrent: number;
  maximumOrdinaryConcurrent: number;
  maximumSpecialConcurrent: number;
}>;

export type ExternalLibraryLauncherPoolLifecycle<T> = Readonly<{
  started?(target: ExternalLibraryLauncherTarget, index: number): void;
  finished?(target: ExternalLibraryLauncherTarget, result: T, index: number): void;
}>;

export type NodeSelectedVerificationMetrics = Readonly<{
  canonicalPhaseMs: number;
  externalPhaseMs: number;
  overlappedTotalMs: number;
  maximumOrdinaryLauncherConcurrency: number;
  maximumSpecialLauncherConcurrency: number;
}>;

export type NodeSelectedVerificationScheduling =
  | Readonly<{ kind: "fixed"; concurrency: number }>
  | Readonly<{ kind: "adaptive"; lowConcurrency: number; highConcurrency: number }>;

export type NodeSelectedVerificationConfiguration = Readonly<{
  externalScheduling?: NodeSelectedVerificationScheduling;
  externalInvocation?: "verified" | "tsx";
  launcherService?: Pick<ExternalLibraryLauncherService, "run" | "terminationGeneration">;
  recordMetrics?: (metrics: NodeSelectedVerificationMetrics) => void;
}>;

export type NodeSelectedVerificationService = Readonly<{
  run(
    registry: TestExecutorRegistry,
    availability: ExternalLibraryLauncherAvailability,
    selectedIds: readonly string[],
    onEvent?: (event: TestEvent) => void,
    options?: RunOptions,
    configuration?: Omit<NodeSelectedVerificationConfiguration, "launcherService" | "recordMetrics">,
  ): Promise<RunResult>;
  metrics(): NodeSelectedVerificationMetrics;
}>;

const EMPTY_NODE_SELECTED_VERIFICATION_METRICS: NodeSelectedVerificationMetrics = Object.freeze({
  canonicalPhaseMs: 0,
  externalPhaseMs: 0,
  overlappedTotalMs: 0,
  maximumOrdinaryLauncherConcurrency: 0,
  maximumSpecialLauncherConcurrency: 0,
});
// Direct CLI verification exposes its most recent process result through the
// legacy accessor. Node hosted-tests registrations use an instance recorder.
let latestMetrics = EMPTY_NODE_SELECTED_VERIFICATION_METRICS;

export function node_selected_verification_metrics(): NodeSelectedVerificationMetrics {
  return latestMetrics;
}

export function create_node_selected_verification_service(
  launcherService: Pick<ExternalLibraryLauncherService, "run" | "terminationGeneration">,
): NodeSelectedVerificationService {
  let metrics: NodeSelectedVerificationMetrics = EMPTY_NODE_SELECTED_VERIFICATION_METRICS;
  return Object.freeze({
    run(registry, availability, selectedIds, onEvent, options, configuration) {
      return run_node_selected_verifications(
        registry,
        availability,
        selectedIds,
        onEvent,
        options,
        {
          ...configuration,
          launcherService,
          recordMetrics(value) { metrics = value; },
        },
      );
    },
    metrics: () => metrics,
  });
}

function pooled_runtime(target: ExternalLibraryLauncherTarget): boolean {
  return target.runtime === "node" || target.runtime === "node-synthetic-dom";
}

type IndexedTarget = Readonly<{ index: number; target: ExternalLibraryLauncherTarget }>;

async function run_scheduled<T>(
  entries: readonly IndexedTarget[],
  scheduling: ExternalLibraryLauncherPoolScheduling,
  execute: (target: ExternalLibraryLauncherTarget) => Promise<T>,
  results: T[],
  onStarted: (entry: IndexedTarget) => void,
  onFinished: (entry: IndexedTarget, result: T) => void,
): Promise<void> {
  if (entries.length === 0) return;
  const initialConcurrency = typeof scheduling === "number"
    ? scheduling
    : scheduling.initialConcurrency;
  const maximumConcurrency = typeof scheduling === "number"
    ? scheduling
    : scheduling.maximumConcurrency;
  let cursor = 0;
  let active = 0;
  let concurrency = initialConcurrency;
  let settled = false;
  await new Promise<void>((resolve, reject) => {
    const pump = (): void => {
      if (settled) return;
      while (active < concurrency && cursor < entries.length) {
        const entry = entries[cursor];
        cursor += 1;
        if (entry === undefined) break;
        active += 1;
        onStarted(entry);
        void execute(entry.target).then(
          (result) => {
            results[entry.index] = result;
            onFinished(entry, result);
            active -= 1;
            if (cursor === entries.length && active === 0) {
              settled = true;
              resolve();
              return;
            }
            pump();
          },
          (error) => {
            settled = true;
            reject(error);
          },
        );
      }
    };
    if (typeof scheduling !== "number") {
      void Promise.resolve(scheduling.increaseAfter).then(
        () => {
          concurrency = maximumConcurrency;
          pump();
        },
        () => {
          concurrency = maximumConcurrency;
          pump();
        },
      );
    }
    pump();
  });
}

export async function run_external_library_launcher_pool<T>(
  targets: readonly ExternalLibraryLauncherTarget[],
  execute: (target: ExternalLibraryLauncherTarget) => Promise<T>,
  scheduling: ExternalLibraryLauncherPoolScheduling = EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY,
  lifecycle: ExternalLibraryLauncherPoolLifecycle<T> = {},
): Promise<ExternalLibraryLauncherPoolResult<T>> {
  const initialConcurrency = typeof scheduling === "number"
    ? scheduling
    : scheduling.initialConcurrency;
  const maximumConcurrency = typeof scheduling === "number"
    ? scheduling
    : scheduling.maximumConcurrency;
  if (
    !Number.isInteger(initialConcurrency)
    || initialConcurrency < 1
    || !Number.isInteger(maximumConcurrency)
    || maximumConcurrency < initialConcurrency
  ) {
    throw new Error(
      `External launcher concurrency must use positive integer bounds, received ${initialConcurrency} -> ${maximumConcurrency}.`,
    );
  }
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.id)) throw new Error(`Duplicate external launcher execution requested: ${target.id}`);
    seen.add(target.id);
  }
  const indexed = targets.map((target, index) => Object.freeze({ index, target }));
  const ordinary = indexed.filter((entry) => pooled_runtime(entry.target));
  const special = indexed.filter((entry) => !pooled_runtime(entry.target));
  const results: T[] = new Array(targets.length);
  let activeOrdinary = 0;
  let activeSpecial = 0;
  let maximumOrdinaryConcurrent = 0;
  let maximumSpecialConcurrent = 0;
  let maximumConcurrent = 0;
  const started = (lane: "ordinary" | "special", entry: IndexedTarget): void => {
    if (lane === "ordinary") {
      activeOrdinary += 1;
      maximumOrdinaryConcurrent = Math.max(maximumOrdinaryConcurrent, activeOrdinary);
    } else {
      activeSpecial += 1;
      maximumSpecialConcurrent = Math.max(maximumSpecialConcurrent, activeSpecial);
    }
    maximumConcurrent = Math.max(maximumConcurrent, activeOrdinary + activeSpecial);
    lifecycle.started?.(entry.target, entry.index);
  };
  const finished = (lane: "ordinary" | "special", entry: IndexedTarget, result: T): void => {
    lifecycle.finished?.(entry.target, result, entry.index);
    if (lane === "ordinary") activeOrdinary -= 1;
    else activeSpecial -= 1;
  };
  await Promise.all([
    run_scheduled(
      ordinary,
      scheduling,
      execute,
      results,
      (entry) => started("ordinary", entry),
      (entry, result) => finished("ordinary", entry, result),
    ),
    run_scheduled(
      special,
      1,
      execute,
      results,
      (entry) => started("special", entry),
      (entry, result) => finished("special", entry, result),
    ),
  ]);
  return Object.freeze({
    results: Object.freeze(results),
    maximumConcurrent,
    maximumOrdinaryConcurrent,
    maximumSpecialConcurrent,
  });
}

export async function run_node_verification_phases<A, B>(
  canonical: () => Promise<A>,
  external: () => Promise<B>,
): Promise<readonly [A, B]> {
  const canonicalPromise = Promise.resolve().then(canonical);
  const externalPromise = Promise.resolve().then(external);
  const [canonicalResult, externalResult] = await Promise.allSettled([canonicalPromise, externalPromise]);
  if (canonicalResult.status === "rejected" || externalResult.status === "rejected") {
    const errors = [
      canonicalResult.status === "rejected" ? canonicalResult.reason : undefined,
      externalResult.status === "rejected" ? externalResult.reason : undefined,
    ].filter((error) => error !== undefined);
    throw errors.length === 1 ? errors[0] : new AggregateError(errors, "Both hosted verification phases failed.");
  }
  return Object.freeze([canonicalResult.value, externalResult.value]);
}

function empty_result(): RunResult {
  return Object.freeze({
    ok: true,
    summary: Object.freeze({
      suites: 0,
      cases: 0,
      pass: 0,
      fail: 0,
      skip: 0,
      msTotal: 0,
      failures: Object.freeze([]),
    }),
  });
}

function failed_external_result(
  target: ExternalLibraryLauncherTarget,
  error: unknown,
): ExternalLibraryLauncherResult {
  return Object.freeze({
    target,
    stdout: "",
    stderr: "",
    exitCode: null,
    signal: null,
    durationMs: 0,
    timedOut: false,
    spawnError: error instanceof Error ? error.message : String(error),
    invocationKind: "package-script",
    ok: false,
  });
}

function external_state_event(
  target: ExternalLibraryLauncherTarget,
  status: "queued" | "running",
): TestEvent {
  return Object.freeze({
    t: "external_state",
    id: target.id,
    suite: target.id,
    name: target.displayName,
    subject: target.subject,
    runtime: target.runtime,
    executableChecks: target.executableChecks,
    collections: target.collections,
    status,
  });
}

function external_end_event(result: ExternalLibraryLauncherResult): TestEvent {
  return Object.freeze({
    t: "external_end",
    id: result.target.id,
    suite: result.target.id,
    name: result.target.displayName,
    subject: result.target.subject,
    runtime: result.target.runtime,
    executableChecks: result.target.executableChecks,
    collections: result.target.collections,
    status: result.ok ? "pass" : "fail",
    ms: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    ...(result.spawnError === undefined ? {} : { spawnError: result.spawnError }),
  });
}

export async function run_node_selected_verifications(
  registry: TestExecutorRegistry,
  availability: ExternalLibraryLauncherAvailability,
  selectedIds: readonly string[],
  onEvent: (event: TestEvent) => void = () => undefined,
  options: RunOptions = {},
  configuration: NodeSelectedVerificationConfiguration = {},
): Promise<RunResult> {
  const overallStartedAt = performance.now();
  const canonicalIds = selectedIds.filter((id) => !id.startsWith("library::"));
  const externalIds = selectedIds.filter((id) => id.startsWith("library::"));
  const externalTargets = externalIds.map((id) => {
    const selected = availability.targets.find((target) => target.id === id);
    if (selected === undefined) throw new Error(`External library launcher is unavailable: ${id}`);
    return selected;
  });
  for (const target of externalTargets) onEvent(external_state_event(target, "queued"));

  let canonicalPhaseMs = 0;
  let externalPhaseMs = 0;
  let externalPass = 0;
  let externalFail = 0;
  const externalFailures: TestFailure[] = [];
  const terminationGeneration = configuration.launcherService?.terminationGeneration()
    ?? external_library_launcher_termination_generation();
  let releaseCanonicalTerminal = (): void => undefined;
  const canonicalTerminal = new Promise<void>((resolve) => {
    releaseCanonicalTerminal = resolve;
  });
  const requestedScheduling = configuration.externalScheduling
    ?? Object.freeze({ kind: "fixed" as const, concurrency: EXTERNAL_LIBRARY_LAUNCHER_CONCURRENCY });
  const externalScheduling: ExternalLibraryLauncherPoolScheduling =
    requestedScheduling.kind === "fixed"
      ? requestedScheduling.concurrency
      : Object.freeze({
          initialConcurrency: requestedScheduling.lowConcurrency,
          maximumConcurrency: requestedScheduling.highConcurrency,
          increaseAfter: canonicalTerminal,
        });

  const [canonical, external] = await run_node_verification_phases(
    async () => {
      const startedAt = performance.now();
      try {
        return canonicalIds.length === 0
          ? empty_result()
          : await run_fresh_node_selected_test_ids(registry, canonicalIds, onEvent, options);
      } finally {
        canonicalPhaseMs = performance.now() - startedAt;
        releaseCanonicalTerminal();
      }
    },
    async () => {
      const startedAt = performance.now();
      const result = await run_external_library_launcher_pool(
        externalTargets,
        async (target) => {
          try {
            return await (configuration.launcherService?.run ?? run_external_library_launcher)(availability, target.id, {
              terminationGeneration,
              forceTsx: configuration.externalInvocation === "tsx",
              forceVerifiedDirect: configuration.externalInvocation === "verified",
            });
          } catch (error) {
            return failed_external_result(target, error);
          }
        },
        externalScheduling,
        {
          started(target) {
            onEvent(Object.freeze({ t: "suite_begin", suite: target.id, totalPlanned: 1 }));
            onEvent(external_state_event(target, "running"));
          },
          finished(target, launcherResult) {
            if (launcherResult.ok) externalPass += 1;
            else {
              externalFail += 1;
              externalFailures.push(Object.freeze({
                suite: launcherResult.target.id,
                name: launcherResult.target.displayName,
                err: [
                  launcherResult.timedOut ? "External library launcher timed out." : "",
                  launcherResult.spawnError ?? "",
                  launcherResult.stderr,
                ].filter(Boolean).join("\n"),
                ms: launcherResult.durationMs,
              }));
            }
            onEvent(external_end_event(launcherResult));
            onEvent(Object.freeze({ t: "suite_end", suite: target.id, ms: launcherResult.durationMs }));
          },
        },
      );
      externalPhaseMs = performance.now() - startedAt;
      return result;
    },
  );

  const overlappedTotalMs = performance.now() - overallStartedAt;
  const completedMetrics = Object.freeze({
    canonicalPhaseMs,
    externalPhaseMs,
    overlappedTotalMs,
    maximumOrdinaryLauncherConcurrency: external.maximumOrdinaryConcurrent,
    maximumSpecialLauncherConcurrency: external.maximumSpecialConcurrent,
  });
  if (configuration.recordMetrics === undefined) latestMetrics = completedMetrics;
  else configuration.recordMetrics(completedMetrics);
  const fail = canonical.summary.fail + externalFail;
  return Object.freeze({
    ok: fail === 0,
    summary: Object.freeze({
      suites: canonical.summary.suites + externalTargets.length,
      cases: canonical.summary.cases + externalTargets.length,
      pass: canonical.summary.pass + externalPass,
      fail,
      skip: canonical.summary.skip,
      msTotal: overlappedTotalMs,
      failures: Object.freeze([...canonical.summary.failures, ...externalFailures]),
    }),
  });
}
