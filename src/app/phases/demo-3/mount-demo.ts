// mount-demo.ts

import type { LiveTree } from "hson-live";
import { makeDivId } from "../../../utils/makers";
import { relay, type OutcomeAsync, type OutcomeVoid } from "intrastructure";
import { build_wordmark } from "../../wordmark/wordmark-factory";
import { style_wordmark_splash, word_keyframes_splash } from "../../wordmark/styles/splash.style-wordmark";
import { style_wordmark_demo } from "../../wordmark/styles/demo.style-wordmark";
import { CELL_CSS_DEMO, DEMO_BACKDROP_CSS, DEMO_CSS, DEMO_LOGOBOX_CSS, DEMO_SCREEN_CSS, DEMO_SCREEN_FX_CSS, DEMO_SCREEN_PLUSH_CSS, DEMO_WALL_CSS, DEMO_WALL_FX_CSS, FRAME_CSS_DEMO } from "./demo.css";
import { $COL } from "../../consts/color.consts";
import { pp_factory } from "../../parse-panel/pp-factory";
import { init_parsing_panels } from "../../parse-panel/parse-panel";
import { style_parsing_panels } from "../../parse-panel/style-pp";


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

  const screenPlush = makeDivId(wall, "screen-plush").classlist.add("screen-plush");
  const screen = makeDivId(screenPlush, "demo-screen").classlist.add("demo-screen");
  const screenFx = makeDivId(screen, "demo-screen-fx").classlist.add("demo-screen-fx");

  const logoBox = makeDivId(demo, "hson-logo").classlist.add("hson-logo");
  const wordMark = build_wordmark(logoBox);
  style_wordmark_demo(wordMark);
  wordMark.frame.css.setMany(FRAME_CSS_DEMO);
  for (const c of wordMark.cellList) c.css.setMany(CELL_CSS_DEMO);

  demo.css.setMany(DEMO_CSS);
  logoBox.css.setMany(DEMO_LOGOBOX_CSS);

  // existing
  wall.css.setMany(DEMO_WALL_CSS);

  // ADDED
  wallFx.css.setMany(DEMO_WALL_FX_CSS);
  const plushFx = makeDivId(screenPlush, "screen-plush-fx").classlist.add("screen-plush-fx");
  // plushFx.css.setMany(don't have);
  screenPlush.css.setMany(DEMO_SCREEN_PLUSH_CSS);
  screen.css.setMany(DEMO_SCREEN_CSS);
  screenFx.css.setMany(DEMO_SCREEN_FX_CSS);
  const menuBox = makeDivId(screen, 'menu-box').classlist.add('ui menu box');
  menuBox.css.setMany({
    position: "absolute",
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