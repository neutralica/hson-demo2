export type SplashTerminalState = "completed" | "cancelled";

type SplashCleanup = () => void | Promise<void>;
type SplashTimer = ReturnType<typeof setTimeout>;

export type SplashScheduler = Readonly<{
  setTimer(callback: () => void, delayMs: number): SplashTimer;
  clearTimer(timer: SplashTimer): void;
  queue(callback: () => void): void;
}>;

export type SplashRunContext = Readonly<{
  signal: AbortSignal;
  throwIfCancelled(): void;
  wait(ms: number): Promise<void>;
  queue(callback: () => void): void;
  schedule(callback: () => void, delayMs: number): void;
  onCleanup(cleanup: SplashCleanup): void;
}>;

export type SplashRun = Readonly<{
  signal: AbortSignal;
  completion: Promise<SplashTerminalState>;
  cancel(): Promise<SplashTerminalState>;
}>;

const DEFAULT_SPLASH_SCHEDULER: SplashScheduler = Object.freeze({
  setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer: (timer) => clearTimeout(timer),
  queue: (callback) => queueMicrotask(callback),
});

function abort_error(): DOMException {
  return new DOMException("Splash run cancelled.", "AbortError");
}

function is_abort_error(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function create_splash_run(
  execute: (context: SplashRunContext) => unknown | Promise<unknown>,
  scheduler: SplashScheduler = DEFAULT_SPLASH_SCHEDULER,
): SplashRun {
  const controller = new AbortController();
  const timers = new Set<SplashTimer>();
  const cleanups: SplashCleanup[] = [];
  let acceptingCleanup = true;

  const throwIfCancelled = (): void => {
    if (controller.signal.aborted) throw abort_error();
  };

  const wait = (ms: number): Promise<void> => new Promise((resolve, reject) => {
    throwIfCancelled();
    const timer = scheduler.setTimer(() => {
      timers.delete(timer);
      controller.signal.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));
    timers.add(timer);

    function onAbort(): void {
      scheduler.clearTimer(timer);
      timers.delete(timer);
      reject(abort_error());
    }

    controller.signal.addEventListener("abort", onAbort, { once: true });
  });

  const queue = (callback: () => void): void => {
    throwIfCancelled();
    scheduler.queue(() => {
      if (controller.signal.aborted) return;
      callback();
    });
  };

  const schedule = (callback: () => void, delayMs: number): void => {
    throwIfCancelled();
    const timer = scheduler.setTimer(() => {
      timers.delete(timer);
      if (controller.signal.aborted) return;
      callback();
    }, Math.max(0, delayMs));
    timers.add(timer);
  };

  const onCleanup = (cleanup: SplashCleanup): void => {
    if (!acceptingCleanup) {
      throw new Error("Cannot register splash cleanup after terminal cleanup began.");
    }
    cleanups.push(cleanup);
  };

  const context: SplashRunContext = Object.freeze({
    signal: controller.signal,
    throwIfCancelled,
    wait,
    queue,
    schedule,
    onCleanup,
  });

  const completion = (async (): Promise<SplashTerminalState> => {
    let terminal: SplashTerminalState = "completed";
    let executionError: unknown;
    try {
      await execute(context);
      throwIfCancelled();
    } catch (error) {
      if (controller.signal.aborted && is_abort_error(error)) terminal = "cancelled";
      else executionError = error;
    } finally {
      acceptingCleanup = false;
      if (!controller.signal.aborted) controller.abort();
      for (const timer of timers) scheduler.clearTimer(timer);
      timers.clear();

      let cleanupError: unknown;
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        try {
          await cleanups[index]!();
        } catch (error) {
          cleanupError ??= error;
        }
      }
      cleanups.length = 0;
      if (executionError !== undefined) throw executionError;
      if (cleanupError !== undefined) throw cleanupError;
    }
    return terminal;
  })();

  const cancel = (): Promise<SplashTerminalState> => {
    if (!controller.signal.aborted) controller.abort();
    return completion;
  };

  return Object.freeze({
    signal: controller.signal,
    completion,
    cancel,
  });
}
