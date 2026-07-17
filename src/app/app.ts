// app.ts


import { mount_brand } from "./phases/phase-1-brand/mount-brand";
import { mount_splash } from "./phases/phase-2-splash/mount-splash";
import { STAGE_CSS } from "./phases/phase-2-splash/splash.css";
import { _sleep } from "../app/utils/helpers";
import { mk_div_id } from "../app/utils/makers";
import { make_skip_promise, run_phase } from "../app/utils/skip-promise";
import { PHASE_LINGER } from "./core/consts/config.consts";
import { _colors } from "./core/consts/colors.consts";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "./core/consts/oklch.consts";
import { log_oklch_palette } from "./utils/swatch-logger";
import { mount_demo } from "./phases/phase-3-demo/mount-demo";
import { CssManager, LiveTree } from "hson-live";


const gcss = CssManager.api();

const _shortpause = () => _sleep(PHASE_LINGER * 0.15);
  log_oklch_palette(OKLCH_VIBRANT, "vibrant");
  log_oklch_palette(OKLCH_NEUTRALS, "neutrals");

export async function run_app(root: LiveTree): Promise<void> {
  root.empty();

  const app = mk_div_id(root, "app")
    .classlist.set("app")
    .attr.set("data-testid", "app-root")
    .css.set.backgroundColor(_colors.backlo);

  const stage = mk_div_id(app, "stage")
    .classlist.add("stage")
    .attr.set("data-app-phase", "bootstrap")
    .css.setMany(STAGE_CSS);

  const { skip, cancel } = make_skip_promise(stage);

  const hard_cut = (): void => {
    stage.empty();
  };

  try {
    // --- phase 1: intro ---
    {
      stage.attr.set("data-app-phase", "intro");
      const introP = run_phase(stage, mount_brand, _shortpause);
      const res = await Promise.race([introP, skip]);
      if (res === "skip") {
        hard_cut();
        // continue to next phase (do not return)
      }
    }

    // --- phase 2: splash ---
    {
      stage.attr.set("data-app-phase", "splash");
      const splashP = run_phase(stage, mount_splash, _shortpause);
      const res = await Promise.race([splashP, skip]);
      if (res === "skip") {
        hard_cut();
        // continue to demo
      }
    }

    // once we reach demo, disable skip entirely (avoid lingering listener)
    cancel();

    // --- phase 3: feature demo ---
    {
      stage.attr.set("data-app-phase", "demo-loading");
      await run_phase(stage, mount_demo, _shortpause);
      stage.attr.set("data-app-phase", "demo-ready");
    }

    return;
  } finally {
    // always tear down listener if anything throws/returns early
    cancel();
  }
}
