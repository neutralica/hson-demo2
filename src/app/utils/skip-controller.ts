import type { LiveTree } from "hson-live";
import { outcome, type OutcomeAsync } from "intrastructure";

type SkipController = {
  // resolves exactly once when user skips
  skip: Promise<void>;

  // abort signal to cancel sleeps / async work
  signal: AbortSignal;

  // remove listener + abort
  cleanup: () => void;
};

export function make_skip_controller(stage: LiveTree): SkipController {
  const ac = new AbortController();

  let resolveSkip: (() => void) | undefined;

  const skip = new Promise<void>((resolve) => {
    resolveSkip = resolve;
  });

  const handle = stage.listen.onPointerDown((ev) => {
    // CHANGED: only left click (or touch)
    if ("button" in ev && (ev as any).button !== 0) return;

    // CHANGED: resolve once, then permanently abort
    resolveSkip?.();
    resolveSkip = undefined;

    if (!ac.signal.aborted) ac.abort();
  });

  const cleanup = () => {
    // CHANGED: always remove listener
    handle.off();
    // CHANGED: abort cancels any in-flight waits
    if (!ac.signal.aborted) ac.abort();
    resolveSkip = undefined;
  };

  return { skip, signal: ac.signal, cleanup };
}

// CHANGED: cancellable sleep
export function sleep_ms(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();

    const t = setTimeout(resolve, ms);

    if (!signal) return;

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve(); // treat abort as "wake up"
      },
      { once: true },
    );
  });
}

export async function run_phase2<T>(
  stage: LiveTree,
  mountFn: (s: LiveTree, signal: AbortSignal) => OutcomeAsync<T>,
  holdMs: number,
  signal: AbortSignal,
): OutcomeAsync<T> {
  // CHANGED: mount receives signal so it can self-cancel listeners/loops if you add that later
  const mounted = await mountFn(stage, signal);
  if (outcome.isErr(mounted)) return mounted;

  // CHANGED: cancellable hold
  await sleep_ms(holdMs, signal);

  return mounted;
}