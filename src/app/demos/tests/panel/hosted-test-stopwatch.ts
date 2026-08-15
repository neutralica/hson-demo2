import type { HostedTestReport } from "../../../../shared/hosted-tests/hosted-test-report.types";

export type HostedTestStopwatch = Readonly<{
  update(run: HostedTestReport["run"]): void;
  reset(): void;
  dispose(): void;
  active(): boolean;
}>;

export function make_hosted_test_stopwatch(options: Readonly<{
  render(elapsedMs: number | null): void;
  now?: () => number;
  schedule?: (callback: () => void, cadenceMs: number) => unknown;
  cancel?: (handle: unknown) => void;
  cadenceMs?: number;
}>): HostedTestStopwatch {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? ((callback, cadenceMs) => globalThis.setInterval(callback, cadenceMs));
  const cancel = options.cancel ?? ((handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>));
  const cadenceMs = options.cadenceMs ?? 100;
  let handle: unknown;
  let startedAt: number | null = null;
  let disposed = false;

  const stop = (): void => {
    if (handle === undefined) return;
    cancel(handle);
    handle = undefined;
  };
  const tick = (): void => {
    if (disposed || startedAt === null) return;
    options.render(Math.max(0, now() - startedAt));
  };

  return Object.freeze({
    update(run) {
      if (disposed) return;
      if (run.status === "running" && run.startedAt !== null) {
        if (startedAt !== run.startedAt) {
          stop();
          startedAt = run.startedAt;
          tick();
          handle = schedule(tick, cadenceMs);
        }
        return;
      }
      stop();
      startedAt = null;
      if (run.status === "idle") {
        options.render(null);
        return;
      }
      const authoritative = run.timing?.runnerMs
        ?? (run.startedAt !== null && run.completedAt !== null ? run.completedAt - run.startedAt : null);
      options.render(authoritative);
    },
    reset() {
      if (disposed) return;
      stop();
      startedAt = null;
      options.render(null);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      startedAt = null;
    },
    active: () => handle !== undefined,
  });
}
