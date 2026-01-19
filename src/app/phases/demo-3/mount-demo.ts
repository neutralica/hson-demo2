// mount-demo.ts

import type { LiveTree } from "hson-live";
import { makeDivId } from "../../../utils/makers";
import { relay, type OutcomeAsync } from "intrastructure";
import { build_wordmark } from "../../wordmark/wordmark-factory";
import { style_wordmark_demo } from "../../wordmark/styles/demo.style-wordmark";
import { CELL_CSS_DEMO, DEMO_CSS, DEMO_LOGOBOX_CSS, DEMO_SCREEN_CSS, DEMO_SCREEN_FX_CSS, DEMO_SCREEN_INSET_CSS, DEMO_WALL_CSS, DEMO_WALL_FX_CSS, FRAME_CSS_DEMO, STIPPLE_PLANE_CSS } from "./demo.css";
import { $COL } from "../../consts/colors.consts";
import { pp_factory } from "../../parse-panel/pp-factory";
import { style_parsing_panels } from "../../parse-panel/style-pp";
import { init_parsing_panels } from "../../parse-panel/init.pp";
import { KF_STIPPLE_BGPOS_ALL, KF_STIPPLE_DRIFT_0, KF_STIPPLE_DRIFT_1, KF_STIPPLE_DRIFT_2, KF_STIPPLE_DRIFT_3 } from "../../stipple/stipple.anim-keys";
import { attach_stipple_layers } from "../../stipple/make-stipple";


/**
 * Mount the demo phase.
 *
 * Responsibilities:
 * - create demo container(s)
 * - append the persisted wordmark into the scene
 * - establish layout ownership from this point forward
 *
 * This function does NOT:
 * - clear the stage
 * - manage skipping
 * - return Outcomes
 */
export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();
  // demo.mount.ts (PATCH)
  // CHANGE: add a dedicated wall FX overlay *inside* demo-wall, so you’re not relying on
  // the tiny visible rim area / stacking quirks to “see” wall styling.
  const demo = makeDivId(stage, "demo").classlist.add("demo");
  const wall = makeDivId(demo, "demo-wall").classlist.add("demo-wall");
  const wallFx = makeDivId(wall, "demo-wall-fx").classlist.add("demo-wall-fx");
  const screeninset = makeDivId(wall, "screen-inset").classlist.add("screen-inset");
  const screen = makeDivId(screeninset, "demo-screen").classlist.add("demo-screen");
  const screenFx = makeDivId(screen, "demo-screen-fx").classlist.add("demo-screen-fx");
  
  const logoBox = makeDivId(demo, "hson-logo").classlist.add("hson-logo");
  const wordMark = build_wordmark(logoBox);
  style_wordmark_demo(wordMark);
  wordMark.frame.css.setMany(FRAME_CSS_DEMO);
  for (const c of wordMark.cellList) c.css.setMany(CELL_CSS_DEMO);
  screen.css.keyframes.setMany([KF_STIPPLE_DRIFT_0, KF_STIPPLE_DRIFT_1, KF_STIPPLE_DRIFT_2, KF_STIPPLE_DRIFT_3]);
  demo.css.setMany(DEMO_CSS);
  logoBox.css.setMany(DEMO_LOGOBOX_CSS);
  demo.css.keyframes.set(KF_STIPPLE_BGPOS_ALL)
  
  attach_stipple_layers(demo);
  // existing
  wall.css.setMany(DEMO_WALL_CSS);
  
  // ADDED
  wallFx.css.setMany(DEMO_WALL_FX_CSS);
  
  const insetFx = makeDivId(screeninset, "screen-inset-fx").classlist.add("screen-inset-fx");
  // insetFx.css.setMany(don't have);
  screeninset.css.setMany(DEMO_SCREEN_INSET_CSS);
  screen.css.setMany(DEMO_SCREEN_CSS);
  screenFx.css.setMany(DEMO_SCREEN_FX_CSS);
  
  const stipPLane = makeDivId(screenFx, "stipple-plane").css.setMany(STIPPLE_PLANE_CSS);
  
  const menuBox = makeDivId(screen, 'menu-box').classlist.add('ui menu box');
  menuBox.css.setMany({
    position: "absolute",
    left: "500px",
    height: "max-content",
    width: "max-content",
    zIndex: "60",
    color: $COL.skyBlue,
    filter: "blur(0.35px)",
    margin: "2rem",
    fontFamily: "monospace",
    border: "1px solid aquamarine",
    pointerEvents: "any",
    padding: "1rem",
  })
  menuBox.setText("parsing panels")

  menuBox.listen.onClick(ev => {
    const pp = pp_factory(screen);
    init_parsing_panels(pp);
    style_parsing_panels(pp);

  })


  return relay.ok();


}