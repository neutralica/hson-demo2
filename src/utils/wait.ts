// wait.ts

import type { LiveTree } from "hson-live";
import type { AnimSpec } from "hson-live/types";

export type WaitOpts = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

type WaitPointerOpts = WaitOpts & {
  leftOnly?: boolean;
};

function abortErr(): DOMException {
  return new DOMException("aborted", "AbortError");
}

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortErr();
}

/**
 * Wrap a promise with:
 *  - optional timeout
 *  - optional AbortSignal cancellation
 *
 * NOTE: if the inner promise doesn't support cancellation, abort only rejects
 * this wrapper; it won't "stop time" inside the inner operation.
 */
function withControls<T>(p: Promise<T>, opts?: WaitOpts): Promise<T> {
  const timeoutMs = opts?.timeoutMs;
  const signal = opts?.signal;

  if (!timeoutMs && !signal) return p;

  return new Promise<T>((resolve, reject) => {
    let done = false;
    let to: number | undefined;

    const finish_ok = (v: T) => {
      if (done) return;
      done = true;
      if (to !== undefined) window.clearTimeout(to);
      resolve(v);
    };

    const finishErr = (e: unknown) => {
      if (done) return;
      done = true;
      if (to !== undefined) window.clearTimeout(to);
      reject(e);
    };

    if (timeoutMs !== undefined && timeoutMs > 0) {
      to = window.setTimeout(() => {
        finishErr(new Error(`wait timeout (${timeoutMs}ms)`));
      }, timeoutMs);
    }

    if (signal) {
      // explicit early abort check
      if (signal.aborted) {
        finishErr(abortErr());
        return;
      }

      const onAbort = () => finishErr(abortErr());
      signal.addEventListener("abort", onAbort, { once: true });
    }

    p.then(finish_ok).catch(finishErr);
  });
}

function timer(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

function waitAnimEvent(
  lt: LiveTree,
  kind: "start" | "end",
  name: string,
  opts?: WaitOpts,
): Promise<AnimationEvent> {
  const signal = opts?.signal;

  const p = new Promise<AnimationEvent>((resolve, reject) => {
    try {
      //  fail fast if already aborted
      ensureNotAborted(signal);
    } catch (e) {
      reject(e);
      return;
    }

    // capture the subscription so we can .off() on match/abort
    const sub =
      kind === "start"
        ? lt.listen.onAnimationStart((ev) => {
          if (ev.animationName !== name) return;
          sub.off();
          resolve(ev);
        })
        : lt.listen.onAnimationEnd((ev) => {
          if (ev.animationName !== name) return;
          sub.off();
          resolve(ev);
        });

    if (signal) {
      const onAbort = () => {
        sub.off();
        reject(abortErr());
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });

  // timeout/abort controls
  return withControls(p, opts);
}

function waitPointerDown(lt: LiveTree, opts?: WaitPointerOpts): Promise<PointerEvent> {
  const signal = opts?.signal;

  const p = new Promise<PointerEvent>((resolve, reject) => {
    try {
      // fail fast if already aborted
      ensureNotAborted(signal);
    } catch (e) {
      reject(e);
      return;
    }

    const sub = lt.listen.onPointerDown((ev) => {
      if (opts?.leftOnly && "button" in ev && (ev as PointerEvent).button !== 0) return;
      sub.off();
      resolve(ev as PointerEvent);
    });

    if (signal) {
      const onAbort = () => {
        sub.off();
        reject(abortErr());
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });

  return withControls(p, opts);
}

function sleep(ms: number, opts?: { signal?: AbortSignal }): Promise<void> {
  const signal = opts?.signal;

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }

    const id = window.setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));

    function onAbort() {
      window.clearTimeout(id);
      reject(new DOMException("aborted", "AbortError"));
    }

    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}

export const nextPhase = (lt: LiveTree) => {
  return {
    anim(anim: string | AnimSpec) {
      let n: string;
      if (typeof anim === 'string') {
        n = anim;
      } else {
        n = anim.name;
      }

      return {
        begin: (opts?: WaitOpts) => waitAnimEvent(lt, "start", n, opts),
        end: (opts?: WaitOpts) => waitAnimEvent(lt, "end", n, opts),
      };
    },

    pointerDown: (opts?: WaitPointerOpts) => waitPointerDown(lt, opts),

    sleep: (ms: number, opts?: WaitOpts) => sleep(ms, opts),
  };
};

export const race = <T>(promises: readonly Promise<T>[]): Promise<T> => {
  return Promise.race(promises);
};
/**
 * A small builder to avoid "doThing(tree, ...)" call sites.
 * Usage:
 *   await wait.for(stage).anim("hson_sun_disk").end({ signal });
 *   await wait.for(stage).pointerDown({ leftOnly: true, signal });
 */
export const wait = {
timer,
  for: nextPhase,
  // keep race as a plain function (no builder needed)
  race: race,
} as const;

