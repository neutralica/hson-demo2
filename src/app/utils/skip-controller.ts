import type { LiveTree } from "hson-live/livetree";

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
    // only left click (or touch)
    if ("button" in ev && (ev as any).button !== 0) return;

    // resolve once, then permanently abort
    resolveSkip?.();
    resolveSkip = undefined;

    if (!ac.signal.aborted) ac.abort();
  });

  const cleanup = () => {
    // always remove listener
    handle.off();
    // abort cancels any in-flight waits
    if (!ac.signal.aborted) ac.abort();
    resolveSkip = undefined;
  };

  return { skip, signal: ac.signal, cleanup };
}

// cancellable sleep
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
  mountFn: (s: LiveTree, signal: AbortSignal) => Promise<T> | T,
  holdMs: number,
  signal: AbortSignal,
): Promise<T> {
  // mount receives signal so it can self-cancel listeners/loops if you add that later
  const mounted = await mountFn(stage, signal);
  // cancellable hold
  await sleep_ms(holdMs, signal);

  return mounted;
}
