import type { Mote } from "./motes.types";


function read_translateY_px(el: Element): number {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return 0;

  // matrix(a,b,c,d,tx,ty)
  const m2 = /^matrix\(([^)]+)\)$/.exec(t);
  if (m2) {
    const parts = m2[1]!.split(",").map(s => Number(s.trim()));
    const ty = parts[5];
    return Number.isFinite(ty) ? ty! : 0;
  }

  // matrix3d(..., ty at index 13)
  const m3 = /^matrix3d\(([^)]+)\)$/.exec(t);
  if (m3) {
    const parts = m3[1]!.split(",").map(s => Number(s.trim()));
    const ty = parts[13];
    return Number.isFinite(ty) ? ty! : 0;
  }

  return 0;
}

// ADDED: read numeric px from inline/computed top
function read_top_px(el: HTMLElement): number {
  const top = getComputedStyle(el).top;
  const n = Number.parseFloat(top);
  return Number.isFinite(n) ? n : 0;
}
export function kill_mote(m: Mote): void {
  if (m.dead) return;
  (m as unknown as { dead: boolean }).dead = true;

  // freeze motion in-place (don’t clear transforms)
  m.rise.css.anim.pause();
  m.sway.css.anim.pause();

  // Optional: stop spin so “death” feels dead.
  m.ink.css.anim.end("clear-all");

  // run fade/dim on ink (no transform here)
  m.ink.css.anim.begin({
    name: "ink-die",
    duration: "6000ms",
    timingFunction: "ease-out",
    iterationCount: "1",
    fillMode: "forwards",
  });

  // run drop on fall wrapper (starts from current position)
  m.fall.css.anim.begin({
    name: "wrap-die",
    duration: "6000ms",
    timingFunction: "ease-out",
    iterationCount: "1",
    fillMode: "forwards",
  });
}