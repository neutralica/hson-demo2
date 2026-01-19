// stipple.drift.ts
import type { LiveTree } from "hson-live";
import type { CssMap } from "hson-live/types";
import { STIPPLE_LAYER_0_CSS, STIPPLE_LAYER_1_CSS, STIPPLE_LAYER_2_CSS, STIPPLE_LAYER_3_CSS } from "./stipple.css";
import { makeDivId } from "../../utils/makers";

export function make_stipple_drift_css(opts?: { speed?: number; rotDur?: number }): CssMap {
  const speed = opts?.speed ?? 10;
  const dur = Math.max(40, Math.round(420 / speed)); // slower loop reads “ambient”
  const rotDur = opts?.rotDur ?? 260;                // very slow spin

  return {
    backgroundImage: [
      "radial-gradient(circle at 2px 2px, rgba(56, 100, 144, 0.21) 0 0.6px, transparent 2.8px)",
      "radial-gradient(circle at 6px 5px, rgba(123, 69, 69, 0.20) 0 0.9px, transparent 4.1px)",
      "radial-gradient(circle at 3px 3px, rgba(196, 199, 158, 0.15) 0 0.7px, transparent 4.6px)",
      "radial-gradient(circle at 5px 7px, rgba(53, 86, 136, 0.22) 0 1.1px, transparent 5.4px)",
    ].join(", "),

    backgroundRepeat: "repeat, repeat, repeat, repeat",
    backgroundSize: ["53px 19px", "41px 37px", "49px 41px", "53px 67px"].join(", "),

    // start positions
    backgroundPosition: ["0px 0px", "0px 0px", "0px 0px", "0px 0px"].join(", "),

    // CHANGED: stack both animations
    animation: [
      `stipple_bgpos_all ${dur}s linear infinite`,
      `stipple_rotate_slow ${rotDur}s linear infinite`,
    ].join(", "),
    willChange: "background-position, transform",
  };
}

// NOTE: you said you have makeDivId(parent, id). Reuse your helper here.
export function attach_stipple_layers(parent: LiveTree): void {
  // CHANGED: one div per layer so each can have its own drift vector (including Y)
  const l0 = makeDivId(parent, "stipple-0").classlist.add("stipple-layer");
  l0.css.setMany(STIPPLE_LAYER_0_CSS);

  const l1 = makeDivId(parent, "stipple-1").classlist.add("stipple-layer");
  l1.css.setMany(STIPPLE_LAYER_1_CSS);

  const l2 = makeDivId(parent, "stipple-2").classlist.add("stipple-layer");
  l2.css.setMany(STIPPLE_LAYER_2_CSS);

  const l3 = makeDivId(parent, "stipple-3").classlist.add("stipple-layer");
  l3.css.setMany(STIPPLE_LAYER_3_CSS);
}