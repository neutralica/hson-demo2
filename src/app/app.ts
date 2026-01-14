// app.ts

import { type LiveTree } from "hson-live";
import { mount_intro } from "./phases/intro/mount-intro";
import { mount_splash } from "./phases/splash/mount-splash";
import { STAGE_CSS } from "./phases/splash/types-consts/splash-css.consts";
import { _sleep, makeDivId } from "../utils/helpers";
import { PHASE_LINGER } from "./consts/config.consts";
import { run_fireworks } from "./phases/hson-wasm/hson-wasm-fireworks";

const _pause = () => _sleep(PHASE_LINGER);


export async function run_app(root: LiveTree): Promise<boolean> {
    root.empty();

    const app = makeDivId(root, "app").classlist.set("app");
    const stage = makeDivId(app, "stage")
        .classlist.add("stage")
        .css.setMany(STAGE_CSS);
    
    run_fireworks(stage);
    await _sleep(10000);
    //  one skip signal governs all phases
    const { skip, off: offSkip } = make_skip_promise(stage);

    try {
        // --- phase 1: intro ---
        {
            const introP = run_phase(stage, mount_intro, _pause);
            const res: RaceResult = await Promise.race([introP, skip]);

            if (res === "skip") {
                stage.empty(); //  hard cut
                return true;   //  skipping also counts as success
            }
            if (res === "fail") return false;
        }

        // --- phase 2: splash ---
        {
            const splashP = run_phase(stage, mount_splash, _pause);
            const res: RaceResult = await Promise.race([splashP, skip]);

            if (res === "skip") {
                stage.empty(); //  hard cut
                return true;   //  skipping also counts as success
            }
            if (res === "fail") return false;
        }

        // --- demo ---


        return true;
    } finally {
        // tear down the global skip listener (avoid it lingering into demo)
        offSkip();
    }
}


//  add a tiny sentinel type so Promise.race() is unambiguous
type PhaseResult = "ok" | "fail";
type RaceResult = PhaseResult | "skip";

//  helper that runs (mount + pause) as a single cancellable chunk
async function run_phase(
    stage: LiveTree,
    mountFn: (s: LiveTree) => Promise<boolean>,
    pauseFn: () => Promise<void>,
): Promise<PhaseResult> {
    const mounted = await mountFn(stage);
    if (!mounted) return "fail";
    await pauseFn();
    return "ok";
}

// build a single skip Promise (resolves once) for the entire run
function make_skip_promise(stage: LiveTree): {
    skip: Promise<"skip">;
    off: () => void;
} {
    let resolveSkip: ((v: "skip") => void) | undefined;

    const skip = new Promise<"skip">((resolve) => {
        resolveSkip = resolve;
    });

    // NOTE: do NOT use .once() here; we want name-filter footguns nowhere near this.
    const handle = stage.listen.onPointerDown((ev) => {
        //  ignore non-primary button when available
        if ("button" in ev && (ev as any).button !== 0) return;

        //  resolve skip (idempotent is fine; promise ignores subsequent resolves)
        resolveSkip?.("skip");
    });

    return {
        skip,
        off: () => handle.off(),
    };
}
