

import { MOTE_VAR } from "../../core/consts/ui-consts";
import type { MotesRig } from "./make-mote";
import type { MotesOpts, MoteStyle } from "./make-mote";
import { make_mote } from "./make-mote";
import { relay, type Outcome } from "intrastructure";

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const randi = (a: number, b: number): number => Math.floor(rand(a, b + 1));


const pickRange = (r: readonly [number, number]): number => rand(r[0], r[1]);
const pickRangeInt = (r: readonly [number, number]): number => randi(r[0], r[1]);

export function config_mote(
    xPx: number,
    opts: Readonly<MotesOpts>,
): MoteStyle {
    return {
        xPx,
        // yPx,
        swayAmpPx: pickRange(opts.swayAmpPx),
        color: MOTE_VAR,
        // correct key is sizePx (not fontSizePx)
        sizePx: pickRange(opts.sizePx),

        opacity: pickRange(opts.opacity),
        // blurPx: pickRange(opts.blurPx),

        riseMs: pickRangeInt(opts.riseDurMs),
        riseDelayMs: -pickRangeInt(opts.riseDurMs),

        swayMs: pickRangeInt(opts.swayDurMs),
        swayDelayMs: -pickRangeInt(opts.swayDurMs),
    };
}

export function motes_init(rig: MotesRig, opts: MotesOpts): Outcome<void> {
    rig.layer.css.keyframes.setMany(MOTESkf);

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
        const pad = (w * opts.spawnPadVw) / 100;

        // CHANGED: motes occupy a wider field than the viewport. This preserves
        // the old zoom-out/resize behavior without requiring runtime x resets.
        const xPx = rand(-pad, w + pad);
        const style = config_mote(xPx, opts);

        make_mote(rig.layer, opts.char, style);
    };

    const want = wantCount();
    for (let i = 0; i < want; i += 1) {
        spawnOne();
    }

    // CHANGED: no pointer listener, no 60fps runtime loop, no bbox reads, and
    // no per-frame stylesheet writes. CSS animations own all continuous motion.
    (rig as unknown as { dispose: () => void }).dispose = (): void => {
        rig.root.removeSelf();
    };

    return relay.ok();
}

export const MOTESkf = [
    {
        name: "mote-rise",
        steps: {
            "0%": { transform: "translateY(110vh)" },
            "100%": { transform: "translateY(-15vh)" },
        },
    },
    // sway (wrapper)
    {
        name: "mote-sway",
        steps: {
            "0%": { transform: "translateX(calc(var(--mote-sway-amp, 24px) * -0.5))" },
            "50%": { transform: "translateX(var(--mote-sway-amp, 24px))" },
            "100%": { transform: "translateX(calc(var(--mote-sway-amp, 24px) * -0.35))" },
        },
    },
];
