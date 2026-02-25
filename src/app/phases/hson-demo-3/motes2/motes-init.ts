import type { LiveTree } from "hson-live";
import type { MotesRig } from "./motes2.types";
import type { MotesOpts, MoteStyle } from "./motes2.types";
import { kill_mote } from "./kill-mote";
import { type Mote } from "./motes2.types";
import { make_mote } from "./make-mote";
import { relay, type Outcome } from "intrastructure";
import { MOTESkf } from "./motes.keys";

type InitTargets = Readonly<{ layer: LiveTree; wrap: LiveTree }>;

export const DEFAULT_MOTE_COLORS: readonly string[] = [
    "rgba(120, 255, 160, 0.95)",  // terminal-ish green
    "rgba(150, 255, 210, 0.85)",
    "rgba(100, 220, 255, 0.80)",
];


type SpinDir = "cw" | "ccw";

const fps = 60;
const rate = 1000 / fps;
const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const randi = (a: number, b: number): number => Math.floor(rand(a, b + 1));

function pick<T>(xs: readonly T[]): T {
    // CHANGED: strict-safe pick (noUncheckedIndexedAccess)
    if (xs.length === 0) throw new Error("pick(): empty array");
    return xs[randi(0, xs.length - 1)]!;
}

const pickRange = (r: readonly [number, number]): number => rand(r[0], r[1]);
const pickRangeInt = (r: readonly [number, number]): number => randi(r[0], r[1]);

export function config_mote2(
    xPx: number,
    opts: Readonly<MotesOpts>,
): MoteStyle {
    const spinDir: SpinDir = Math.random() < 0.5 ? "cw" : "ccw";

    return {
        xPx,

        // CHANGED: correct key is sizePx (not fontSizePx)
        sizePx: pickRange(opts.sizePx),

        opacity: pickRange(opts.opacity),
        color: pick(opts.colors),
        blurPx: pickRange(opts.blurPx),

        riseMs: pickRangeInt(opts.riseDurMs),
        riseDelayMs: -pickRangeInt(opts.riseDurMs),

        swayMs: pickRangeInt(opts.swayDurMs),
        swayDelayMs: -pickRangeInt(opts.swayDurMs),

        spinMs: pickRangeInt(opts.spinDurMs),
        spinDir,
    };
}
// motes-init.ts

type MoteRt = {
    mote: Mote;
    baseX: number;
    alive: boolean;
};

export function motes_init2(rig: MotesRig, opts: MotesOpts): Outcome<void> {
    let disposed = false;

    // mouse state (updated by pointermove only)
    let mouse = { x: 0, y: 0 };
    const onMove = (ev: PointerEvent): void => {
        mouse = { x: ev.clientX, y: ev.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    rig.layer.css.keyframes.setMany(MOTESkf);


    // runtime list (mutable)
    const motes: MoteRt[] = [];

    // --- helpers ---
    const kpx2 = (w: number, h: number): number => (w * h) / 1_000_000;

    const wantCount = (): number => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const want = Math.floor(opts.densityPerKpx2 * kpx2(w, h));
        return Math.max(0, Math.min(opts.maxMotes, want));
    };

    const spawnOne = (): void => {
        const w = window.innerWidth;
        const h = window.innerHeight;

        const baseX = rand(0, w);

        // HARD MODE: start somewhere already inside the viewport so new area looks “pre-filled”
        const y0 = rand(0, h);

        const style = config_mote2(baseX, opts);
        const mote = make_mote(rig.layer, opts.char, style);

        // place vertical offset on wrapper (rise keyframes translateY from there)
        mote.wrap.css.set.top(`${y0}px`);

        motes.push({ mote, baseX, alive: true });
    };

    const ensure = (): void => {
        const want = wantCount();

        // spawn in batches so a resize doesn’t allocate 300 DOM nodes in one tick
        let budget = opts.spawnBatch;
        while (motes.length < want && budget-- > 0) spawnOne();

        // optional: if too many exist, you can just leave them.
        // If you prefer strict count, kill extras:
        // while (motes.length > want) {
        //   const x = motes.pop();
        //   if (x?.alive) kill_mote(x.mote);
        // }
    };

    let tickId = 0;

    const tick = (): void => {
        if (disposed) return;

        ensure();

        const R = opts.killRadiusPx;
        const R2 = R * R;

        for (let i = 0; i < motes.length; i++) {
            const rt = motes[i];
            if (!rt || !rt.alive) continue;

            const wrapEl = rt.mote.wrap.asDomElement();
            if (!wrapEl) continue;

            const r = wrapEl.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;

            const dx = cx - mouse.x;
            const dy = cy - mouse.y;
            const d2 = dx * dx + dy * dy;

            const below = cy > mouse.y;

            // ---- kill on direct touch ----
            // CHANGED: kill-on-hit uses INK bbox (glyph), not wrap.
            // This avoids “huge wrapper” problems.
            if (opts.killOnHit) {
                const inkEl = rt.mote.ink.asDomElement(); // unavoidable for bbox for now
                if (inkEl) {
                    const r = inkEl.getBoundingClientRect();
                    const cx = r.left + r.width / 2;
                    const cy = r.top + r.height / 2;

                    const dx = cx - mouse.x;
                    const dy = cy - mouse.y;
                    const d2 = dx * dx + dy * dy;

                    // CHANGED: fixed pixel radius (optionally with small size-based bump)
                    const killR = opts.killRadiusPx;
                    if (d2 <= killR * killR) {
                        rt.alive = false;
                        kill_mote(rt.mote);
                        continue;
                    }
                }
            }

            // ---- avoid mouse (x-axis only) ----
            if (d2 < R2 && (!opts.repelOnlyBelowMouse || below)) {
                const dist = Math.max(1, Math.sqrt(d2));
                const t01 = 1 - Math.min(1, dist / R); // 1 near cursor, 0 at edge

                const sign = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx);
                const push = sign * (opts.repelStrengthPx * t01);

                rt.mote.wrap.css.set.left(`${rt.baseX + push}px`);
            } else {
                // relax back to baseX
                rt.mote.wrap.css.set.left(`${rt.baseX}px`);
            }
        }

        tickId = window.setTimeout(tick, rate);
    };

    tickId = window.setTimeout(tick, 0);

    // Patch dispose onto rig
    (rig as unknown as { dispose: () => void }).dispose = (): void => {
        disposed = true;
        window.removeEventListener("pointermove", onMove);
        window.clearTimeout(tickId);

        // optional: remove motes layer entirely on dispose
        rig.root.removeSelf();
    };

    return relay.ok();
}