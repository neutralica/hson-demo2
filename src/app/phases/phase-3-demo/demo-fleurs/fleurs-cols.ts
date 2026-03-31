import type { Rng } from "../../../../tests/tests.types";
import { format_oklch, parse_oklch } from "../../../core/helpers/color-helpers";
import { make_rng } from "../../../utils/rng";
import { clamp, lerp } from "./fleurs-helpers";
import { randSigned } from "./fleurs-helpers";
import { hueBands } from "./fleurs.consts";
import type { OklchColor, JitterOpts, FlowerPaletteSpec, HueBand, FlowerSpec, FlowerColorOpts, FlowerCultivar } from "./fleurs.types";

export function jitter_oklch(base: string, rng: Rng, opts: Partial<JitterOpts> = {}): string {
    const src = parse_oklch(base);

    const jl = opts.l ?? 0.03;
    const jc = opts.c ?? 0.015;
    const jh = opts.h ?? 10;

    const next: OklchColor = {
        l: clamp(src.l + randSigned(rng) * jl, 0.52, 0.88),
        c: clamp(src.c + randSigned(rng) * jc, 0.04, 0.16),
        h: normalizeHue(src.h + randSigned(rng) * jh),
    };

    return format_oklch(next);
}
function pickSecondaryBand(primaryBand: HueBand, rng: Rng): HueBand | null {
    // not every flower gets a second hue family
    if (rng() >= 0.95) return null;

    const hueBands: readonly HueBand[] = [
        { min: 18, max: 34, weight: 1.3 },
        { min: 35, max: 55, weight: 1.35 },
        { min: 56, max: 74, weight: 1.15 },
        { min: 75, max: 95, weight: 0.85 },
        { min: 96, max: 118, weight: 0.8 },
        { min: 119, max: 142, weight: 0.7 },
        { min: 160, max: 182, weight: 0.55 },
        { min: 183, max: 198, weight: 0.65 },
        { min: 199, max: 216, weight: 0.8 },
        { min: 217, max: 236, weight: 0.9 },
        { min: 237, max: 252, weight: 1.0 },
        { min: 253, max: 270, weight: 1.05 },
        { min: 271, max: 292, weight: 1.0 },
        { min: 293, max: 314, weight: 0.85 },
        { min: 315, max: 334, weight: 0.95 },
        { min: 335, max: 350, weight: 1.1 },
        { min: 351, max: 12, weight: 1.2 },
    ];

    // try a few times not to match the primary band exactly
    for (let i = 0; i < 4; i += 1) {
        const next = pickWeightedBand(hueBands, rng);
        if (next.min !== primaryBand.min || next.max !== primaryBand.max) {
            return next;
        }
    }

    return null;
}
export function pickFlowerPalette(seed: number): FlowerPaletteSpec {
    const rng = make_rng(seed);
    const primaryBand = pickWeightedBand(hueBands, make_rng(seed * Math.random()));
    const secondaryBand = pickSecondaryBand(primaryBand, make_rng(seed * Math.random()));

    const primaryHue = sampleHueBand(primaryBand.min, primaryBand.max, make_rng(seed * Math.random()));

    const secondaryHue = secondaryBand
        ? sampleHueBand(secondaryBand.min, secondaryBand.max, make_rng(seed * Math.random()))
        : null;
    const centerHue = normalizeHue(primaryHue + (rng() * 80 - 140));

    return {
        primaryPetal: sampleFlowerColor(primaryHue, make_rng(seed * Math.random()), {
            lMin: 0.38,
            lMax: 0.86,
            cMin: 0.10,
            cMax: 0.22,
            hSpread: 16,
            lightnessBias: 0.65,
        }),

        secondaryPetal: secondaryHue === null
            ? null
            : sampleFlowerColor(secondaryHue, rng, {
                lMin: 0.18,
                lMax: 0.66,
                cMin: 0.10,
                cMax: 0.22,
                hSpread: 16,
                lightnessBias: 0.65,
            }),

        center: sampleFlowerColor(centerHue, rng, {
            lMin: 0.26,
            lMax: 0.44,
            cMin: 0.06,
            cMax: 0.12,
            hSpread: 10,
            lightnessBias: 1,
        }),

        useAlternatingPetals: secondaryHue !== null && rng() < 0.55,
    };
}
export function fmtNum(n: number, places: number): string {
    return Number(n.toFixed(places)).toString();
}
export function pickWeightedBand(
    arr: readonly HueBand[],
    rng: Rng
): HueBand {
    const total = arr.reduce((sum, x) => sum + x.weight, 0);
    let pick = rng() * total;

    for (const band of arr) {
        pick -= band.weight;
        if (pick <= 0) return band;
    }

    return arr[arr.length - 1]!;
}
export function sampleHueBand(min: number, max: number, rng: Rng): number {
    if (min <= max) return lerp(min, max, rng());

    const spanA = 360 - min;
    const spanB = max;
    const total = spanA + spanB;
    const pick = rng() * total;

    return pick < spanA ? min + pick : pick - spanA;
}
export function normalizeHue(h: number): number {
    let out = h % 360;
    if (out < 0) out += 360;
    return out;
}
export function pickStamenColor(spec: FlowerSpec, rng: Rng): string {
    const petal = parse_oklch(spec.palette.primaryPetal);

    // darker flowers can take lighter stamens; lighter flowers need darker stamens
    if (petal.l > 0.68) {
        const hue = sampleHueBand(25, 45, make_rng(Math.random())); // warm brown / ochre
        return sampleFlowerColor(hue, make_rng(Math.random()), {
            lMin: 0.22,
            lMax: 0.38,
            cMin: 0.03,
            cMax: 0.08,
            hSpread: 8,
            lightnessBias: 1.1,
        });
    }

    if (petal.l > 0.58) {
        const hue = sampleHueBand(260, 320, make_rng(Math.random())); // soot plum / eggplant
        return sampleFlowerColor(hue, make_rng(Math.random()), {
            lMin: 0.26,
            lMax: 0.42,
            cMin: 0.03,
            cMax: 0.07,
            hSpread: 10,
            lightnessBias: 1,
        });
    }

    // pale grey / dusty cream for darker petals
    const useWarm = make_rng(Math.random())() < 0.5;

    if (useWarm) {
        const hue = sampleHueBand(60, 90, make_rng(Math.random()));
        return sampleFlowerColor(hue, make_rng(Math.random()), {
            lMin: 0.66,
            lMax: 0.82,
            cMin: 0.015,
            cMax: 0.05,
            hSpread: 8,
            lightnessBias: 0.9,
        });
    }

    const hue = sampleHueBand(220, 280, make_rng(Math.random()));
    return sampleFlowerColor(hue, make_rng(Math.random()), {
        lMin: 0.64,
        lMax: 0.80,
        cMin: 0.01,
        cMax: 0.04,
        hSpread: 10,
        lightnessBias: 0.9,
    });
}
export function pickCenterColor(
    palette: FlowerPaletteSpec,
    rng: Rng,
    cultivar?: FlowerCultivar,
): string {
    if (cultivar === "rosette") {
        const src = parse_oklch(palette.primaryPetal);

        // keep same hue family, but darker and slightly duller
        const h = normalizeHue(src.h + (rng() * 6 - 3));
        const l = clamp(src.l * 0.42, 0.2, 0.26);
        const c = clamp(src.c * 0.55, 0.015, 0.09);

        return format_oklch({ l, c, h });
    }

    return jitter_oklch(palette.center, rng, { l: 0.01, c: 0.008, h: 5 });
}

export function sampleFlowerColor(
    hueCenter: number,
    rng: Rng,
    opts: FlowerColorOpts
): string {

    const {
        lMin,
        lMax,
        cMin,
        cMax,
        hSpread,
        lightnessBias = 1
    } = opts

    const h =
        normalizeHue(
            hueCenter +
            randSigned(rng) * hSpread
        )

    // bias >1 = darker bias
    // bias <1 = brighter bias
    const t = Math.pow(rng(), lightnessBias)

    const l = lerp(lMin, lMax, t)
    const c = lerp(cMin, cMax, rng())

    return format_oklch({ l, c, h })
}