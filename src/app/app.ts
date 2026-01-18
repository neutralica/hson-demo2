// app.ts

import { type LiveTree } from "hson-live";
import { mount_brand } from "./phases/brand-1/mount-brand";
import { mount_splash } from "./phases/splash-2/mount-splash";
import { STAGE_CSS } from "./phases/splash-2/splash.css";
import { _sleep } from "../utils/helpers";
import { makeDivId } from "../utils/makers";
import { PHASE_LINGER } from "./consts/config.consts";
import { make_skip_promise, run_phase, type PhaseResult, type RaceResult } from "./skip-promise";
import { outcome, relay, relay_data, type Outcome, type OutcomeAsync } from "intrastructure";
import { mount_demo } from "./phases/demo-3/mount-demo";

const _pause = () => _sleep(PHASE_LINGER);
const _shortpause = () => _sleep(PHASE_LINGER * 0.15);


export async function run_app(root: LiveTree): OutcomeAsync<void> {
    root.empty();
    const app = makeDivId(root, "app").classlist.set("app");
    const stage = makeDivId(app, "stage")
        .classlist.add("stage")
        .css.setMany(STAGE_CSS);

    //  one skip signal governs all phases
    const { skip, cancel } = make_skip_promise(stage);

    try {
        // --- phase 1: intro ---
        {

            const introP = run_phase(stage, mount_brand, _shortpause); // OutcomeAsync<void>

            const res = await Promise.race([introP, skip]);       // "skip" | Outcome<void>

            cancel();

            if (res === "skip") {
                stage.empty();
                // return relay.ok();
            }

            // if (outcome.isErr(res)) { return res; }

            // return relay.ok();
        }
        // --- phase 2: splash ---
        let wordMark: LiveTree | undefined = undefined;
        {
            const splashP = run_phase(stage, mount_splash, _shortpause);
            const res = await Promise.race([splashP, skip]);
            if (res === "skip") {
                stage.empty(); //  hard cut
            }

        }
        // --- phase 3: feature demo ---
        {
            const demo = run_phase(stage, mount_demo, _shortpause);


        }

        return relay.ok();
    } finally {
        // tear down the global skip listener (avoid it lingering into demo)
        cancel();
    }
}

