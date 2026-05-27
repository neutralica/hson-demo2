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
import { øCOLS } from "./core/consts/ui-consts";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "./core/consts/oklch";
import { _test_full_loop } from "hson-live/diagnostics";
import { mount_demo } from "./phases/phase-3-demo/mount/mount-demo";
import { debug_state_smoke_test } from "./state/smoke-tests/state-smoke-test";
import { log_oklch_palette } from "./utils/swatch-logger";


const _pause = () => _sleep(PHASE_LINGER);
const _shortpause = () => _sleep(PHASE_LINGER * 0.15);

export async function run_app(root: LiveTree): OutcomeAsync<void> {
  root.empty();

  const app = mk_div_id(root, "app")
    .classlist.set("app")
    .css.set.backgroundColor(øCOLS.backlo);

  const stage = mk_div_id(app, "stage")
    .classlist.add("stage")
    .css.setMany(STAGE_CSS);

  const { skip, cancel } = make_skip_promise(stage);

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
