
// ---- types ----

import { LiveTree } from "hson-live";

export type MousePanelRig = Readonly<{
    root: LiveTree;
    pointer: LiveTree;
    readout: {
        xy: LiveTree;
        angle: LiveTree;
        rows: ReadonlyArray<{
            label: string;
            x: LiveTree;
            y: LiveTree;
            mag: LiveTree;
        }>;
    };
    dispose: () => void;
}>;

type DerivKey =
    | "pos"
    | "vel"
    | "acc"
    | "jerk"
    | "snap"
    | "crackle"
    | "pop";

type Vec = { x: number; y: number };
type Chain = Record<DerivKey, Vec>;

export const DERIV_LABELS: ReadonlyArray<[DerivKey, string]> = [
    ["pos", "pos"],
    ["vel", "vel"],
    ["acc", "acc"],
    ["jerk", "jerk"],
    ["snap", "snap"],
    ["crackle", "crackle"],
    ["pop", "pop"],
] as const;

// mouse.ts (near your math helpers)

// ADDED: deadbands tuned for pixels / frame-ish units.
// Tweak these by feel.
const DERIV_DEADBAND: Record<DerivKey, number> = {
    pos: 0,          // never clamp pos
    vel: 0.02,       // px / sample
    acc: 0.08,
    jerk: 0.20,
    snap: 0.45,
    crackle: 0.75,
    pop: 1.10,
};
const SMOOTH_BY_KEY: Record<DerivKey, number> = {
  pos: 0.35,
  vel: 0.55,
  acc: 0.70,
  jerk: 0.80,
  snap: 0.86,
  crackle: 0.90,
  pop: 0.93,
};

// ---- tiny math ----

const mag = (v: Vec): number => Math.hypot(v.x, v.y);

const fmt = (n: number, d = 2): string => {
  if (!Number.isFinite(n)) return "—";

  // ADDED: normalize -0 to +0 (after rounding decision)
  const p = Math.pow(10, d);
  const rounded = Math.round(n * p) / p;
  const clean = Object.is(rounded, -0) ? 0 : rounded;

  return clean.toFixed(d);
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Small EMA smoothing. t near 1 = heavy smoothing, near 0 = raw.
const smoothVec = (prev: Vec, next: Vec, t: number): Vec => ({
    x: lerp(next.x, prev.x, t),
    y: lerp(next.y, prev.y, t),
});

// ---- init (behavior) ----

export function mouse_init(rig: MousePanelRig): void {
    // Local state; no demo-global state required.
    let raf = 0;
    let mounted = true;

    // We track mouse position in viewport coords.
    let lastT = performance.now();
    let lastPos: Vec = { x: 0, y: 0 };

    // Derivative chain (smoothed).
    let chain: Chain = {
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        acc: { x: 0, y: 0 },
        jerk: { x: 0, y: 0 },
        snap: { x: 0, y: 0 },
        crackle: { x: 0, y: 0 },
        pop: { x: 0, y: 0 },
    };

    // Smoothing: 0.0 = raw, 0.7 = quite smooth.
    const SMOOTH = 0.85;

    // Use a stable origin for the pointer: center of the pointer stage.
    const getStageCenter = (): Vec => {
        const el = rig.pointer.asDomElement()?.parentElement;
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };


    // Prefer pointer events.
    // ADDED: keep a true previous raw pos for finite differences
    let prevPosRaw: Vec = { x: 0, y: 0 };
    
    // ADDED: detect “no movement”
    let lastMoveT = performance.now();
    
    // CHANGED: onMove updates lastMoveT when there is actual motion
    const onMove = (ev: PointerEvent): void => {
        const nx = ev.clientX;
        const ny = ev.clientY;
        
        if (nx !== lastPos.x || ny !== lastPos.y) lastMoveT = performance.now();
        lastPos = { x: nx, y: ny };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    
    const IDLE_MS = 90;          // tune: 60–140 feels good
    const DT_MIN_MS = 8;         // avoid insane spikes
    const DT_MAX_MS = 34;        // cap dt so tab-switch / hiccup doesn’t explode derivatives

    const tick = (): void => {
        if (!mounted) return;

        const t = performance.now();
        const dtMsRaw = t - lastT;
        const dtMs = Math.min(DT_MAX_MS, Math.max(DT_MIN_MS, dtMsRaw));
        const dt = dtMs / 1000;

        const posRaw = lastPos;

        // CHANGED: raw vel from raw prev pos, not smoothed chain.pos
        const velRaw: Vec = {
            x: (posRaw.x - prevPosRaw.x) / dt,
            y: (posRaw.y - prevPosRaw.y) / dt,
        };

        // CHANGED: higher derivs based on prior RAW (not smoothed) values
        const accRaw: Vec = { x: (velRaw.x - chain.vel.x) / dt, y: (velRaw.y - chain.vel.y) / dt };
        const jerkRaw: Vec = { x: (accRaw.x - chain.acc.x) / dt, y: (accRaw.y - chain.acc.y) / dt };
        const snapRaw: Vec = { x: (jerkRaw.x - chain.jerk.x) / dt, y: (jerkRaw.y - chain.jerk.y) / dt };
        const crackleRaw: Vec = { x: (snapRaw.x - chain.snap.x) / dt, y: (snapRaw.y - chain.snap.y) / dt };
        const popRaw: Vec = { x: (crackleRaw.x - chain.crackle.x) / dt, y: (crackleRaw.y - chain.crackle.y) / dt };

        // ADDED: idle snap-to-zero to kill numerical noise
        const idle = (t - lastMoveT) > IDLE_MS;

        const nextRaw: Chain = idle
            ? {
                pos: posRaw,
                vel: { x: 0, y: 0 },
                acc: { x: 0, y: 0 },
                jerk: { x: 0, y: 0 },
                snap: { x: 0, y: 0 },
                crackle: { x: 0, y: 0 },
                pop: { x: 0, y: 0 },
            }
            : {
                pos: posRaw,
                vel: velRaw,
                acc: accRaw,
                jerk: jerkRaw,
                snap: snapRaw,
                crackle: crackleRaw,
                pop: popRaw,
            };

        // CHANGED: smooth display only (optional)
        chain = {
            pos: smoothVec(chain.pos, nextRaw.pos, SMOOTH_BY_KEY.pos),
            vel: smoothVec(chain.vel, nextRaw.vel, SMOOTH_BY_KEY.vel),
            acc: smoothVec(chain.acc, nextRaw.acc, SMOOTH_BY_KEY.acc),
            jerk: smoothVec(chain.jerk, nextRaw.jerk, SMOOTH_BY_KEY.jerk),
            snap: smoothVec(chain.snap, nextRaw.snap, SMOOTH_BY_KEY.snap),
            crackle: smoothVec(chain.crackle, nextRaw.crackle, SMOOTH_BY_KEY.crackle),
            pop: smoothVec(chain.pop, nextRaw.pop, SMOOTH_BY_KEY.pop),
        };

        prevPosRaw = posRaw;
        lastT = t;

        // ---- UI updates ----

        // coords
        rig.readout.xy.text.set(`x: ${fmt(chain.pos.x, 0)}   y: ${fmt(chain.pos.y, 0)}`);

        // pointer angle: from stage center -> mouse
        const c = getStageCenter();
        const dx = lastPos.x - c.x;
        const dy = lastPos.y - c.y;
        const theta = Math.atan2(dy, dx); // radians
        const deg = (theta * 180) / Math.PI;

        rig.readout.angle.text.set(`θ: ${fmt(deg, 1)}°`);
        rig.pointer.css.setMany({
            transform: `translate(0, -50%) rotate(${deg}deg)`,
        });
        for (let i = 0; i < DERIV_LABELS.length; i++) {
            const label = DERIV_LABELS[i];
            if (label) {
                const key = label[0];       // DerivKey (not undefined)

                const row = rig.readout.rows[i];
                if (!row) continue;                   // safety if someone edits labels/rows later

                const v = chain[key];

                const d = key === "pos" ? 0 : 2;
                row.x.text.set(fmt(v.x, d));
                row.y.text.set(fmt(v.y, d));
                row.mag.text.set(fmt(mag(v), d));
            }
        }

        raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // Patch dispose onto rig (mutation is fine; it’s internal lifetime control)
    (rig as any).dispose = (): void => {
        mounted = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
    };
}