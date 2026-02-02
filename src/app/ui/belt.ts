import type { LiveTree } from "hson-live";
import { _clamp01, _clampLoHi } from "../utils/helpers";

type BeltSpinCtrl = Readonly<{
  destroy: () => void;
}>;

type BeltSpinOpts = Readonly<{
  // how much wheel delta moves the texture
  gain?: number;            // default 0.9
  // wrap period (match your signature size if you want)
  wrapPx?: number;          // default 220
  // max opacity for glint
  glintMax?: number;        // default 0.28
  // how quickly glint fades (ms)
  glintDecayMs?: number;    // default 160
}>;

function wrap(n: number, period: number): number {
  // safe wrap for negative too
  const p = period <= 0 ? 1 : period;
  return ((n % p) + p) % p;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Call this after the belt element exists in DOM.
 * `beltEl` should be the element that has the background + ::after glint.
 */
export function belt_attach_spin(belt: LiveTree, opts: BeltSpinOpts = {}): BeltSpinCtrl {
  const gain = opts.gain ?? 0.9;
  const wrapPx = opts.wrapPx ?? 220;
  const glintMax = opts.glintMax ?? 0.28;
  const glintDecayMs = opts.glintDecayMs ?? 160;

  let scrollPx = 0;
  let rafId: number | null = null;

  // glint pulse state
  let glint0 = 0;
  let glintStartTs = 0;
  let glintDir = 1; // -1 or +1

  const setVars = (): void => {
    const y = wrap(scrollPx, wrapPx);

    belt.style.setProp("--belt-scroll", `${y}px`);

    // glint decay
    if (glint0 > 0) {
      const now = performance.now();
      const t = _clampLoHi((now - glintStartTs) / glintDecayMs, 0, 1);
      const k = 1 - easeOutQuad(t);
      const g = glint0 * k;

      belt.style.setProp("--belt-glint", `${g}`);
      // tiny lateral bias to feel “edge catching”
      belt.style.setProp("--belt-glint-x", `${-6 + glintDir * 2}px`);

      if (t >= 1) {
        glint0 = 0;
        belt.style.setProp("--belt-glint", `0`);
      }
    }
  };

  const tick = (): void => {
    rafId = null;
    setVars();
  };

  const schedule = (): void => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(tick);
  };

  const pulseGlint = (deltaY: number): void => {
    const v = Math.abs(deltaY);

    // Map velocity to 0..glintMax (tune divisor)
    const g = _clampLoHi((v / 180) * glintMax, 0, glintMax);

    // If already mid-pulse, keep the stronger one
    glint0 = Math.max(glint0, g);
    glintStartTs = performance.now();
    glintDir = deltaY >= 0 ? 1 : -1;

    schedule();
  };

  const wheelEv = (ev: WheelEvent): void => {
    // You probably want to prevent page scroll when over belt:
    ev.preventDefault();

    // use deltaY, but give trackpads a little love:
    const dy = ev.deltaY;

    scrollPx += dy * gain;

    pulseGlint(dy);
    schedule();
  };

  const beltWheel = belt.listen.passive().onWheel( wheelEv);

  // initialize vars once
  belt.style.setProp("--belt-scroll", `0px`);
  belt.style.setProp("--belt-glint", `0`);
  belt.style.setProp("--belt-glint-x", `-6px`);

  return {
    destroy: () => {
          beltWheel.off();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    },
  } as const;
}