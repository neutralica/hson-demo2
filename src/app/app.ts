// app.ts

import { type LiveTree } from "hson-live";
import { mount_brand } from "./phases/phase-1-brand/mount-brand";
import { mount_splash } from "./phases/phase-2-splash/mount-splash";
import { STAGE_CSS } from "./phases/phase-2-splash/splash.css";
import { _sleep } from "../app/utils/helpers";
import { mk_div_id } from "../app/utils/makers";
import { make_skip_promise, run_phase, type PhaseResult, type RaceResult } from "../app/utils/skip-promise";
import { outcome, relay, relay_data, type Outcome, type OutcomeAsync } from "intrastructure";

import { PHASE_LINGER } from "./core/consts/config.consts";
import { $cols_ } from "./core/consts/colors.consts";
import { _test_full_loop } from "hson-live/diagnostics";
import { mount_demo } from "./phases/phase-3-demo/mount-demo";


const _pause = () => _sleep(PHASE_LINGER);
const _shortpause = () => _sleep(PHASE_LINGER * 0.15);

export async function run_app(root: LiveTree): OutcomeAsync<void> {
  root.empty();

  const app = mk_div_id(root, "app")
    .classlist.set("app")
    .css.set.backgroundColor($cols_.bckgd);

  const stage = mk_div_id(app, "stage")
    .classlist.add("stage")
    .css.setMany(STAGE_CSS);

  // one skip promise for the whole pre-demo sequence
  const { skip, cancel } = make_skip_promise(stage);

  // local helper — hard cut stage, but DO NOT exit the app
  const hard_cut = (): void => {
    stage.empty();
  };

  try {
    // --- phase 1: intro ---
    {
      const introP = run_phase(stage, mount_brand, _shortpause);
      const res = await Promise.race([introP, skip]); // Outcome<void> | "skip"
      if (res === "skip") {
        hard_cut();
        // continue to next phase (do not return)
      } else {
        if (outcome.isErr(res)) return res;
      }
    }

    // --- phase 2: splash ---
    {
      const splashP = run_phase(stage, mount_splash, _shortpause);
      const res = await Promise.race([splashP, skip]); // Outcome<void> | "skip"
      if (res === "skip") {
        hard_cut();
        // continue to demo
      } else {
        if (outcome.isErr(res)) return res;
      }
    }

    // once we reach demo, disable skip entirely (avoid lingering listener)
    cancel();

    // --- phase 3: feature demo ---
    {
      const demoRes = await run_phase(stage, mount_demo, _shortpause);
      if (outcome.isErr(demoRes)) return demoRes;
    }

    return relay.ok();
  } finally {
    // always tear down listener if anything throws/returns early
    cancel();
  }
}

// export async function run_app(root: LiveTree): OutcomeAsync<void> {
//     root.empty();
//     const app = make_div_id(root, "app").classlist.set("app").css.set.backgroundColor($cols_.bckgd);
//     const stage = make_div_id(app, "stage")
//         .classlist.add("stage")
//         .css.setMany(STAGE_CSS);


//     const { skip, cancel } = make_skip_promise(stage);

//     try {
//         // --- phase 1: intro ---
//         {
//             const introP = run_phase(stage, mount_brand, _shortpause); // OutcomeAsync<void>
//             const res = await Promise.race([introP, skip]);       // "skip" | Outcome<void>
//             cancel();
//             if (res === "skip") {
//                 stage.empty();
//             }

//         }
//         // --- phase 2: splash ---
//         let wordMark: LiveTree | undefined = undefined;
//         {
//             const splashP = run_phase(stage, mount_splash, _shortpause);
//             const res = await Promise.race([splashP, skip]);
//             if (res === "skip") {
//                 stage.empty(); //  hard cut
//             }
//         }
//         // --- phase 3: feature demo ---
//         {
//             const demo = run_phase(stage, mount_demo, _shortpause);
//         }

//         return relay.ok();
//     } finally {
//         // tear down the global skip listener (avoid it lingering into demo)
//         cancel();
//     }
// }

