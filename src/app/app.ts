// app.ts

import type { LiveTree } from "hson-live";
import { outcome, relay, void_sync, type Outcome } from "intrastructure";
import { mount_intro } from "./phases/mount-intro";
import { mount_splash } from "./phases/splash/mount-splash";


export function run_app(root: LiveTree): boolean {
    // --- phase 0: wipe + app shell ---
    root.empty();

    const app = root.create.div().id.set("app").classlist.set("app");

    const stage = app.create.div()
        .id.set("stage")
        .classlist.add("stage");

    // --- phase 1: intro (placeholder) ---
    const mi = mount_intro(stage);
    if (!mi) {
        console.error('could not mount intro');
        return false;
    };

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
    stage.create.p().setText("ready");
    return true;
}