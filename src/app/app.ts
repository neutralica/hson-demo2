// app.ts

import type { LiveTree } from "hson-live";
import { outcome, relay, void_sync, type Outcome } from "intrastructure";
import { mount_intro } from "./phases/intro/mount-intro";
import { mount_splash } from "./phases/splash/mount-splash";
import { STAGE_CSS } from "./phases/splash/types-consts/css.consts";
import { _sleep } from "../utils/helpers";



// changed to 30000 from 3000 for testing
const phaseLinger = 3000; /* ms */

export async function run_app(root: LiveTree): Promise<boolean> {
    root.empty();

    const app = root.create.div().id.set("app").classlist.set("app");

    const stage = app.create.div()
        .id.set("stage")
        .classlist.add("stage")
        .css.setMany(STAGE_CSS);

    // --- phase 1: intro (placeholder) ---
    const mi = mount_intro(stage);
    if (!mi) {
        console.error('could not mount intro');
        return false;
    };
    await _sleep(phaseLinger);
    // --- phase 2: splash (placeholder) ---
    const splashOc = mount_splash(stage);
    if (!splashOc) {
        console.error('could not mount splash');
        return false;
    };

    // --- phase 3: main stage (placeholder) ---
    // const stageOc = mount_stage(stage);
    // if (outcome.isErr(stageOc)) return stageOc;

    // For now: visible confirmation that stage exists
    stage.create.p().setText("OK").style.setMany(
        { position: "absolute", top: "3rem", left: "3rem" });
    return true;
}