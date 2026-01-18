// mount-demo.ts

import type { LiveTree } from "hson-live";
import { makeDivId } from "../../../utils/makers";
import { relay, type OutcomeAsync, type OutcomeVoid } from "intrastructure";
import { build_wordmark } from "../../wordmark/wordmark-factory";
import { style_wordmark_splash, word_keyframes_splash } from "../../wordmark/styles/splash.style-wordmark";
import { style_wordmark_demo } from "../../wordmark/styles/demo.style-wordmark";
import { CELL_CSS_DEMO, DEMO_BACKDROP_CSS, DEMO_CSS, DEMO_LOGOBOX_CSS, FRAME_CSS_DEMO } from "./demo.css";


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
  const screen = makeDivId(demo, "demo-screen").classlist.add("demo-screen"); // inset panel
  const screenFx = makeDivId(screen, "demo-screen-fx").classlist.add("demo-screen-fx"); // corpo stipple layer
  const logoBox = makeDivId(screen, "hson-logo").classlist.add("hson-logo"); 

  const wordMark = build_wordmark(logoBox);
  style_wordmark_demo(wordMark);
  wordMark.frame.css.setMany(FRAME_CSS_DEMO);
  for (const c of wordMark.cellList) c.css.setMany(CELL_CSS_DEMO);
  demo.css.setMany(DEMO_CSS);
  logoBox.css.setMany(DEMO_LOGOBOX_CSS);

  return relay.ok();
}