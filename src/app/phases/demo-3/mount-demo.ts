// mount-demo.ts

import type { LiveTree } from "hson-live";
import { makeDivId } from "../../../utils/makers";
import { relay, type OutcomeAsync, type OutcomeVoid } from "intrastructure";
import { build_wordmark } from "../../wordmark/wordmark-factory";
import { style_wordmark_splash, word_keyframes_splash } from "../../wordmark/styles/splash.style-wordmark";
import { style_wordmark_demo } from "../../wordmark/styles/demo.style-wordmark";
import { CELL_CSS_DEMO, DEMO_BACKDROP_CSS, DEMO_CSS, DEMO_LOGOBOX_CSS, DEMO_SCREEN_CSS, DEMO_SCREEN_FX_CSS, DEMO_SCREEN_PLUSH_CSS, DEMO_WALL_CSS, FRAME_CSS_DEMO } from "./demo.css";
import { $COLOR } from "../../consts/color.consts";


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

  // mount_demo.ts (shape only)
  const demo = makeDivId(stage, "demo").classlist.add("demo");
  const wall = makeDivId(demo, "demo-wall").classlist.add("demo-wall");      // micro texture
  const screenPlush = makeDivId(wall, "screen-plush").classlist.add("screen-plush");
  const screen = makeDivId(screenPlush, "demo-screen").classlist.add("demo-screen"); // inset panel
  const screenFx = makeDivId(screen, "demo-screen-fx").classlist.add("demo-screen-fx"); // corpo stipple layer
  const logoBox = makeDivId(demo, "hson-logo").classlist.add("hson-logo"); 

  const wordMark = build_wordmark(logoBox);
  style_wordmark_demo(wordMark);
  wordMark.frame.css.setMany(FRAME_CSS_DEMO);
  for (const c of wordMark.cellList) c.css.setMany(CELL_CSS_DEMO);
  demo.css.setMany(DEMO_CSS);
  logoBox.css.setMany(DEMO_LOGOBOX_CSS);
  wall.css.setMany(DEMO_WALL_CSS);
  screenPlush.css.setMany(DEMO_SCREEN_PLUSH_CSS)
  screen.css.setMany(DEMO_SCREEN_CSS)
  screenFx.css.setMany(DEMO_SCREEN_FX_CSS)

  const menuBox = makeDivId(screen, 'menu-box').classlist.add('ui menu box');
  menuBox.css.setMany({
    position: "absolute",
    height: "max-content",
    width: "max-content",
    zIndex: "60",
    color: $COLOR.dragonGreen,
    filter: "blur(0.35px)",
    margin: "2rem",
    fontFamily: "monospace",
  })
  menuBox.setText("TESTING HELLO WORLD GFY")
  return relay.ok();
}