import {
  create_splash_run,
  type SplashScheduler,
} from "../../app/phases/phase-2-splash/splash-lifecycle";

type Timer = ReturnType<typeof setTimeout>;

class ControlledScheduler implements SplashScheduler {
  private nextTimer = 1;
  private readonly timers = new Map<Timer, () => void>();
  private readonly microtasks: Array<() => void> = [];

  setTimer(callback: () => void, _delayMs: number): Timer {
    const timer = this.nextTimer as unknown as Timer;
    this.nextTimer += 1;
    this.timers.set(timer, callback);
    return timer;
  }

  clearTimer(timer: Timer): void {
    this.timers.delete(timer);
  }

  queue(callback: () => void): void {
    this.microtasks.push(callback);
  }

  runNextTimer(): void {
    const first = this.timers.entries().next().value as [Timer, () => void] | undefined;
    if (!first) throw new Error("Expected a pending splash timer.");
    this.timers.delete(first[0]);
    first[1]();
  }

  flushMicrotasks(): void {
    for (const callback of this.microtasks.splice(0)) callback();
  }

  get pendingTimers(): number {
    return this.timers.size;
  }

  get pendingMicrotasks(): number {
    return this.microtasks.length;
  }
}

function deferred(): Readonly<{
  promise: Promise<void>;
  resolve(): void;
}> {
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return Object.freeze({ promise, resolve: resolvePromise });
}

let checks = 0;
function expect_lifecycle(condition: unknown, message: string): void {
  checks += 1;
  if (!condition) throw new Error(`splash lifecycle: ${message}`);
}

async function microtask_turn(): Promise<void> {
  await Promise.resolve();
}

{
  let cleanupCount = 0;
  const run = create_splash_run((context) => {
    context.onCleanup(() => { cleanupCount += 1; });
  });
  expect_lifecycle(await run.completion === "completed", "normal completion is terminal");
  expect_lifecycle(cleanupCount === 1, "normal completion cleans up once");
}

{
  const scheduler = new ControlledScheduler();
  let touched = 0;
  const run = create_splash_run(async (context) => {
    await context.wait(10);
    context.throwIfCancelled();
    touched += 1;
  }, scheduler);
  expect_lifecycle(await run.cancel() === "cancelled", "skip before the first async stage cancels");
  expect_lifecycle(touched === 0 && scheduler.pendingTimers === 0, "early skip releases its wait");
}

for (const cancelAtStage of [0, 1, 2] as const) {
  const scheduler = new ControlledScheduler();
  const reached: number[] = [];
  const run = create_splash_run(async (context) => {
    for (let stage = 0; stage < 3; stage += 1) {
      reached.push(stage);
      await context.wait(10);
      context.throwIfCancelled();
    }
  }, scheduler);
  for (let stage = 0; stage < cancelAtStage; stage += 1) {
    scheduler.runNextTimer();
    await microtask_turn();
  }
  await run.cancel();
  expect_lifecycle(
    reached.at(-1) === cancelAtStage && scheduler.pendingTimers === 0,
    `skip during awaited stage ${cancelAtStage + 1} stops the sequence`,
  );
}

{
  const scheduler = new ControlledScheduler();
  const accesses: string[] = [];
  const run = create_splash_run((context) => {
    context.queue(() => accesses.push("microtask"));
    return context.wait(10);
  }, scheduler);
  expect_lifecycle(scheduler.pendingMicrotasks === 1, "animation callback is visibly queued");
  await run.cancel();
  scheduler.flushMicrotasks();
  expect_lifecycle(accesses.length === 0, "queued animation callback is harmless after disposal");
}

{
  const gate = deferred();
  let cssAccesses = 0;
  const run = create_splash_run(async (context) => {
    await gate.promise;
    context.throwIfCancelled();
    cssAccesses += 1;
  });
  gate.resolve();
  const cancelled = run.cancel();
  expect_lifecycle(await cancelled === "cancelled", "cancellation immediately before CSS is terminal");
  expect_lifecycle(cssAccesses === 0, "cancellation immediately before CSS prevents access");
}

{
  const scheduler = new ControlledScheduler();
  let cleanupCount = 0;
  const run = create_splash_run(async (context) => {
    context.onCleanup(() => { cleanupCount += 1; });
    await context.wait(10);
  }, scheduler);
  const first = run.cancel();
  const second = run.cancel();
  expect_lifecycle(first === second, "repeated skip returns the same terminal promise");
  expect_lifecycle(await second === "cancelled" && cleanupCount === 1, "repeated skip cleans once");
}

{
  const scheduler = new ControlledScheduler();
  let cleanupCount = 0;
  const run = create_splash_run(async (context) => {
    context.onCleanup(() => { cleanupCount += 1; });
    await context.wait(10);
  }, scheduler);
  await run.cancel();
  await run.cancel();
  expect_lifecycle(cleanupCount === 1, "skip followed by application disposal is idempotent");
}

{
  const oldScheduler = new ControlledScheduler();
  const newScheduler = new ControlledScheduler();
  const touched: string[] = [];
  const oldRun = create_splash_run((context) => {
    context.queue(() => touched.push("old"));
    return context.wait(10);
  }, oldScheduler);
  await oldRun.cancel();
  const newRun = create_splash_run((context) => {
    context.queue(() => touched.push("new"));
  }, newScheduler);
  oldScheduler.flushMicrotasks();
  newScheduler.flushMicrotasks();
  await newRun.completion;
  expect_lifecycle(touched.join(",") === "new", "replacement cannot inherit an earlier callback");
}

{
  const scheduler = new ControlledScheduler();
  let timerAccesses = 0;
  const run = create_splash_run((context) => {
    context.schedule(() => { timerAccesses += 1; }, 10);
    context.schedule(() => { timerAccesses += 1; }, 20);
    return context.wait(30);
  }, scheduler);
  expect_lifecycle(scheduler.pendingTimers === 3, "run owns its delayed callbacks and wait");
  await run.cancel();
  expect_lifecycle(scheduler.pendingTimers === 0 && timerAccesses === 0, "disposal releases every timer");
}

{
  let cleanupCount = 0;
  const run = create_splash_run((context) => {
    context.onCleanup(() => { cleanupCount += 1; });
    throw new Error("visible splash failure");
  });
  let message = "";
  try {
    await run.completion;
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect_lifecycle(message === "visible splash failure", "genuine pre-cancellation errors remain visible");
  expect_lifecycle(cleanupCount === 1, "genuine failure still cleans exactly once");
}

console.log(`splash lifecycle: ok (${checks} checks)`);
