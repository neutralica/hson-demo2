// mount-demo.ts

import type { LiveTree } from "hson-live";
import { makeDivId } from "../../../utils/makers";
import { relay, type OutcomeVoid } from "intrastructure";

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
export function mount_demo(stage: LiveTree, wordmark: LiveTree): OutcomeVoid {
  const demo = makeDivId(stage, "demo").classlist.add("demo");
  const backdrop = makeDivId(demo, "demo-backdrop").classlist.add("demo-backdrop");
  const scene = makeDivId(demo, "demo-scene").classlist.add("demo-scene");

  scene.append(wordmark);
  return relay.ok();
}