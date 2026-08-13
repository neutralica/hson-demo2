import  { parse_oklch, format_oklch } from "../../core/helpers/color-helpers";
import { make_flower_rng, type Rng } from "./fleurs-rng";
import { clamp, lerp } from "./fleurs-helpers";
import { randSigned } from "./fleurs-helpers";
import { HUE_BANDS } from "./fleurs.consts";
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
    const rng = make_flower_rng(seed, 1);
    const primaryBand = pickWeightedBand(HUE_BANDS, make_flower_rng(seed, 2));
    const secondaryBand = pickSecondaryBand(primaryBand, make_flower_rng(seed, 3));

    const primaryHue = sampleHueBand(primaryBand.min, primaryBand.max, make_flower_rng(seed, 4));

    const secondaryHue = secondaryBand
        ? sampleHueBand(secondaryBand.min, secondaryBand.max, make_flower_rng(seed, 5))
        : null;
    const centerHue = normalizeHue(primaryHue + (rng() < 0.5
        ? lerp(115, 155, rng())
        : -lerp(115, 155, rng())));

    return {
        primaryPetal: sampleFlowerColor(primaryHue, make_flower_rng(seed, 6), {
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
            lMin: 0.34,
            lMax: 0.62,
            cMin: 0.08,
            cMax: 0.18,
            hSpread: 8,
            lightnessBias: 0.92,
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
    const pick = rng();

    if (pick < 0.52) {
        return jitter_oklch(spec.palette.center, rng, { l: 0.018, c: 0.018, h: 8 });
    }

    if (pick < 0.84) {
        const petal = parse_oklch(spec.palette.primaryPetal);
        const l = clamp(petal.l + (petal.l > 0.62 ? -0.20 : 0.20), 0.30, 0.74);
        const c = clamp(petal.c * 0.85, 0.06, 0.18);
        const h = normalizeHue(petal.h + (rng() * 24 - 12));

        return format_oklch({ l, c, h });
    }

    if (spec.palette.secondaryPetal !== null) {
        return jitter_oklch(spec.palette.secondaryPetal, rng, { l: 0.018, c: 0.018, h: 8 });
    }

    return jitter_oklch(spec.palette.primaryPetal, rng, { l: 0.018, c: 0.018, h: 8 });
}
export function pick_center_color(
    palette: FlowerPaletteSpec,
    rng: Rng,
    cultivar?: FlowerCultivar,
): string {
    if (cultivar === "rosette") {
        const src = parse_oklch(palette.primaryPetal);

        // keep the center related, but avoid the black-hole/funnel effect
        const h = normalizeHue(src.h + (rng() * 14 - 7));
        const l = clamp(src.l * 0.62, 0.32, 0.48);
        const c = clamp(src.c * 0.72, 0.045, 0.14);

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
