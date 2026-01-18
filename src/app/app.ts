// app.ts

import { type LiveTree } from "hson-live";
import { mount_brand } from "./phases/brand-1/mount-brand";
import { mount_splash } from "./phases/splash-2/mount-splash";
import { STAGE_CSS } from "./phases/splash-2/splash.css";
import { _sleep } from "../utils/helpers";
import { makeDivClass, makeDivId } from "../utils/makers";
import { PHASE_LINGER } from "./consts/config.consts";
import { make_skip_promise, run_phase, type PhaseResult, type RaceResult } from "./skip-promise";
import { outcome, relay, relay_data, type Outcome, type OutcomeAsync } from "intrastructure";
import { mount_demo } from "./phases/demo-3/mount-demo";
import { DEMO_BACKDROP_CSS, FRAME_SHINE_CSS } from "./phases/demo-3/demo.css";

const _pause = () => _sleep(PHASE_LINGER);


export async function run_app(root: LiveTree): OutcomeAsync<void> {
    root.empty();
    const frameShine = makeDivClass(root, "frame-shine").css.setMany(FRAME_SHINE_CSS);
    const app = makeDivId(root, "app").classlist.set("app");
    const stage = makeDivId(app, "stage")
        .classlist.add("stage")
        .css.setMany(STAGE_CSS);

    runTests(stage);
    //  one skip signal governs all phases
    const { skip, cancel } = make_skip_promise(stage);

    try {
        // --- phase 1: intro ---
        {

            const introP = run_phase(stage, mount_brand, _pause); // OutcomeAsync<void>

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
            const splashP = run_phase(stage, mount_splash, _pause);
            const res = await Promise.race([splashP, skip]);
            if (res === "skip") {
                stage.empty(); //  hard cut
                // return relay.ok();   //  (skipping also counts as success)
            }
            // if (outcome.isErr(res)) { return res; }

            // return relay.ok();

        }
        // --- phase 3: feature demo ---
        {
            const demo = run_phase(stage, mount_demo, _pause);
            stage.css.setMany(DEMO_BACKDROP_CSS)


        }

        return relay.ok();
    } finally {
        // tear down the global skip listener (avoid it lingering into demo)
        cancel();
    }
}


function runTests(stage: LiveTree) {
    // on mount
    const onMove = (ev: PointerEvent) => {
        const el = ev.currentTarget as HTMLElement;
        const r = el.getBoundingClientRect();

        const mx = (ev.clientX - r.left) / r.width;   // 0..1
        const my = (ev.clientY - r.top) / r.height;   // 0..1

        stage.style.set.var("--mx", `${mx}`);
        stage.style.set.var("--my", `${my}`);
        stage.style.set.var("--mxp", `${mx * 100}%`);
        stage.style.set.var("--myp", `${my * 100}%`);
    };
    stage.listen.passive().onPointerMove(onMove);
}
function attach_mouse_vars(stage: LiveTree) {
  const el = stage.asDomElement() as HTMLElement; // or however you access the element
  let rect = el.getBoundingClientRect();

  const refreshRect = () => { rect = el.getBoundingClientRect(); };

  // refresh on “events that actually change it”
  window.addEventListener("resize", refreshRect, { passive: true });
  window.addEventListener("scroll", refreshRect, { passive: true, capture: true });

  // refresh when pointer comes back
  el.addEventListener("pointerenter", refreshRect, { passive: true });

  // pointermove just computes
  el.addEventListener("pointermove", (ev) => {
    const mx = (ev.clientX - rect.left) / rect.width;
    const my = (ev.clientY - rect.top) / rect.height;

    // clamp (cheap insurance)
    const x = Math.min(1, Math.max(0, mx));
    const y = Math.min(1, Math.max(0, my));

    // set vars…
  }, { passive: true });
}