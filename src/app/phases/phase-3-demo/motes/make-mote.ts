import type { LiveTree } from "hson-live";
import { mk_div_cls } from "../../../utils/makers";
import type { Mote, MoteStyle } from "./motes.types";


export function make_mote(host: LiveTree, ch: string, s: MoteStyle): Mote {
  const wrap = mk_div_cls(host, "mote-wrap");
  const rise = mk_div_cls(wrap, "mote-rise");
  rise.css.setMany({
    position: "absolute",
    top: "0px",
    left: `${s.xPx}px`,
    willChange: "transform",
    pointerEvents: "auto",
  });

  const sway = mk_div_cls(rise, "mote-sway");
  sway.css.setMany({
    willChange: "transform",
  });

  const fall = mk_div_cls(sway, "mote-fall");
  fall.css.setMany({
    willChange: "transform",
  });

  const ink = fall.create.span().classlist.add("mote-ink");
  ink.text.set(ch);
  ink.css.setMany({
    display: "inline-block",
    fontSize: `${s.sizePx}px`,
    opacity: String(s.opacity),
    color: s.color,
    filter: s.blurPx > 0 ? `blur(${s.blurPx}px)` : "none",
    willChange: "transform, opacity, filter",
    userSelect: "none",
  });

  // rise on rise
  rise.css.anim.begin({
    name: "mote-rise",
    duration: `${s.riseMs}ms`,
    timingFunction: "linear",
    delay: `${s.riseDelayMs}ms`,
    iterationCount: "infinite",
  });

  // sway on sway
  sway.css.anim.begin({
    name: "mote-sway",
    duration: `${s.swayMs}ms`,
    timingFunction: "ease-in-out",
    delay: `${s.swayDelayMs}ms`,
    iterationCount: "infinite",
    direction: "alternate",
  });

  // spin on ink
  ink.css.anim.begin({
    name: s.spinDir === "cw" ? "mote-spin-cw" : "mote-spin-ccw",
    duration: `${s.spinMs}ms`,
    timingFunction: "linear",
    iterationCount: "infinite",
  });

  return {wrap,  rise, sway, fall, ink, dead: false };
}