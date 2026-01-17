// mount-demo.ts

import type { LiveTree } from "hson-live";
import { makeDivId } from "../../../utils/makers";
import { relay, type OutcomeAsync, type OutcomeVoid } from "intrastructure";
import { build_wordmark } from "../../wordmark/wordmark-factory";
import { style_wordmark_splash, word_keyframes_splash } from "../../wordmark/styles/splash.style-wordmark";
import { style_wordmark_demo } from "../../wordmark/styles/demo.style-wordmark";


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
  console.log(stage.content.count())
  const demo = makeDivId(stage, "demo").classlist.add("demo");
  const backdrop = makeDivId(demo, "demo-backdrop").classlist.add("demo-backdrop");
  const scene = makeDivId(demo, "demo-scene").classlist.add("demo-scene");
  const wordMark = build_wordmark(scene);
  const styledWord = style_wordmark_demo(wordMark);
  console.log(scene.content.count())
  // const keyedWord = word(scene);
  return relay.ok();
}