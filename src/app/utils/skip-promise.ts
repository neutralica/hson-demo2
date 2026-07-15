import type { LiveTree } from "hson-live";

//  add a tiny sentinel type so Promise.race() is unambiguous
export type PhaseResult = "ok" | "fail";
export type RaceResult = "skip" | void | LiveTree;
type SkipPromise = {
    skip: Promise<"skip">;
    cancel: () => void; // CHANGE: unified teardown (off + abort)
}

//  helper that runs (mount + pause) as a single cancellable chunk
export async function run_phase<T>(
  stage: LiveTree,
  mountFn: (s: LiveTree) => Promise<T> | T,
  pauseFn: () => Promise<void>,
): Promise<T> {
  const mounted = await mountFn(stage);
  await pauseFn();
  return mounted;
}

// build a single skip Promise (resolves once) for the entire run

export function make_skip_promise(stage: LiveTree): SkipPromise {
    const ac = new AbortController();

    let resolveSkip: ((v: "skip") => void) | undefined;

    const skip: Promise<"skip"> = new Promise((resolve) => {
        resolveSkip = resolve;
    });

    const handle = stage.listen.onPointerDown((ev) => {
        if ("button" in ev && (ev as any).button !== 0) return;

        resolveSkip?.("skip");
        resolveSkip = undefined;

        if (!ac.signal.aborted) ac.abort();
    });

    const cancel = () => {
        handle.off();
        if (!ac.signal.aborted) ac.abort();
        resolveSkip = undefined;
    };

    return { skip, cancel };
}
