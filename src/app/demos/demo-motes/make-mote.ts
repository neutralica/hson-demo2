import type { LiveTree } from "hson-live";
import  { mk_div_cls } from "../../utils/makers";


export type MotesOpts = Readonly<{
  char: string;

  colors: readonly string[];
  sizePx: readonly [number, number];
  opacity: readonly [number, number];
  // blurPx: readonly [number, number];

  densityPerKpx2: number;
  maxMotes: number;
  spawnBatch: number;

  riseDurMs: readonly [number, number];
  swayDurMs: readonly [number, number];
  spinDurMs: readonly [number, number];

  spinTurns: readonly [number, number];
  swayAmpPx: readonly [number, number];

  /** Extra horizontal spawn padding so resize/zoom-out does not reveal bald edges. */
  spawnPadVw: number;
  pointerEvents: "none" | "auto";
}>;

export type Mote = {
  wrap: LiveTree;
  rise: LiveTree; // owns rise
  sway: LiveTree; // owns l-r
  ink: LiveTree;
};
// You likely already have these types in your motes2 module.
export type MoteStyle = Readonly<{
  xPx: number;
  // yPx: number;
  swayAmpPx: number;
  sizePx: number;
  opacity: number;
  color: string;
  // blurPx: number;

  riseMs: number;
  riseDelayMs: number; // negative allowed (prefill)
  swayMs: number;
  swayDelayMs: number; // negative allowed (prefill)
}>;

export type MotesRig = Readonly<{
  root: LiveTree;
  layer: LiveTree;
  dispose: () => void;
}>;


export function make_mote(host: LiveTree, ch: string, s: MoteStyle): Mote {
  const wrap = mk_div_cls(host, "mote-wrap");
  wrap.style.setMany({
    // CHANGED: wrap owns fixed placement only. Continuous motion is CSS-driven
    // by nested transform animations; JS does not rewrite x/y at runtime.
    position: "absolute",
    top: "0px",
    left: `${s.xPx}px`,
    pointerEvents: "none",
  });

  const rise = mk_div_cls(wrap, "mote-rise");
  rise.style.setMany({
    // willChange: "transform",
    pointerEvents: "none",
  });

  const sway = mk_div_cls(rise, "mote-sway");
  sway.style.setMany({
    // willChange: "transform",
  });
  sway.style.var.set("mote-sway-amp", `${s.swayAmpPx}px`);

  const ink = sway.create.span().classlist.add("mote-ink");
  ink.text.set(ch);
  ink.style.setMany({
    display: "inline-block",
    fontSize: `${s.sizePx}px`,
    opacity: String(s.opacity),
    color: s.color,
    // filter: s.blurPx > 0 ? `blur(${s.blurPx}px)` : "none",
    userSelect: "none",
    pointerEvents: "none",
  });

  // rise on rise
  rise.style.setMany({
    animationName: "mote-rise",
    animationDuration: `${s.riseMs}ms`,
    animationTimingFunction: "linear",
    animationDelay: `${s.riseDelayMs}ms`,
    animationIterationCount: "infinite",
  });

  // sway on sway
  sway.style.setMany({
    animationName: "mote-sway",
    animationDuration: `${s.swayMs}ms`,
    animationTimingFunction: "ease-in-out",
    animationDelay: `${s.swayDelayMs}ms`,
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  });

  return { wrap, rise, sway, ink };
}
