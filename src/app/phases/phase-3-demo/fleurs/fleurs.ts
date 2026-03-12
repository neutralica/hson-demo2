// fleurs.ts

import { hson, type LiveTree } from "hson-live";
import type { Rng } from "../../../../tests/tests.types";
import { _clamp01, _lerp } from "../../../utils/helpers";
import { make_rng } from "../../../utils/rng";
import { CENTER_BY_BANK, OKLCH_FLEURS } from "./fleurs.consts";
import { FLOWER_BANKS, type FlowerColorBank, type FlowerPaletteSpec, type FlowerSpec, type HueBand, type JitterOpts, type OklchColor } from "./fleurs.types";


/**
 *  ### AGENTS PLEASE NOTE - the convention is: 
 * - exported functions are snake_cased
 * - locally scoped functions are camelCased. 
 *      - they are snake_cased if exported at any point
 * - exported variables are FORTRAN_CASED (I think that's right??)
 **/

function pickOne<T>(arr: readonly T[], rng: Rng): T { // dead?
    const ix = Math.floor(rng() * arr.length);
    const v = arr[ix];
    if (v === undefined) {
        throw new Error("pick_one: empty array");
    }
    return v;
}

type FlowerColorOpts = {
    lMin: number
    lMax: number
    cMin: number
    cMax: number
    hSpread: number
    lightnessBias?: number
}

function sampleFlowerColor( //dead
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

    return formatOklch({ l, c, h })
}

function parseOklch(src: string): OklchColor {
    const m = /oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i.exec(src);
    if (!m) {
        throw new Error(`parse_oklch: invalid OKLCH string: ${src}`);
    }

    return {
        l: Number(m[1]),
        c: Number(m[2]),
        h: Number(m[3]),
    };
}

function formatOklch(color: OklchColor): string {
    const l = _clamp01(color.l);
    const c = Math.max(0, color.c);
    const h = normalizeHue(color.h);

    return `oklch(${trimNum(l, 3)} ${trimNum(c, 3)} ${trimNum(h, 1)})`;
}


function jitterOklch(base: string, rng: Rng, opts: Partial<JitterOpts> = {}): string {
    const src = parseOklch(base);

    const jl = opts.l ?? 0.03;
    const jc = opts.c ?? 0.015;
    const jh = opts.h ?? 10;

    const next: OklchColor = {
        l: clamp(src.l + randSigned(rng) * jl, 0.52, 0.88),
        c: clamp(src.c + randSigned(rng) * jc, 0.04, 0.16),
        h: normalizeHue(src.h + randSigned(rng) * jh),
    };

    return formatOklch(next);
}

function pickPetalColor( // dead
    palette: FlowerPaletteSpec,
    petalIx: number,
    rng: Rng,
): string {
    const base =
        palette.useAlternatingPetals &&
            palette.secondaryPetal !== null &&
            petalIx % 2 === 1
            ? palette.secondaryPetal
            : palette.primaryPetal;

    return jitterOklch(base, rng, { l: 0.015, c: 0.015, h: 8 });
}

export function pickCenterColor(
    palette: FlowerPaletteSpec,
    rng: Rng,
): string {
    return jitterOklch(palette.center, rng, { l: 0.01, c: 0.008, h: 5 });
}

// ---------------------------------------------
// HELPERS
// ---------------------------------------------

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

function randSigned(rng: Rng): number {
    return (rng() * 2) - 1
}

function sampleHueBand(min: number, max: number, rng: Rng): number { // dead
    if (min <= max) return lerp(min, max, rng())

    const spanA = 360 - min
    const spanB = max
    const total = spanA + spanB
    const pick = rng() * total

    return pick < spanA ? min + pick : pick - spanA
}

function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}

function normalizeHue(h: number): number {
    let out = h % 360;
    if (out < 0) out += 360;
    return out;
}

function trimNum(n: number, places: number): string {
    return Number(n.toFixed(places)).toString();
}
function pick_weighted_band(
    arr: readonly HueBand[],
    rng: Rng
): HueBand {
    const total = arr.reduce((sum, x) => sum + x.weight, 0)
    let pick = rng() * total

    for (const band of arr) {
        pick -= band.weight
        if (pick <= 0) return band
    }

    return arr[arr.length - 1]!
}
export function make_flower_spec(x: number, y: number, seed: number): FlowerSpec {
    const rng = make_rng(seed);

    return {
        seed,
        x,
        y,
        scale: _lerp(1, 1.95, rng()),
        rotation: _lerp(0, 360, rng()),
        petalCount: randInt(rng, 6, 11),
        petalLength: _lerp(18, 42, rng()),
        petalWidth: _lerp(8, 18, rng()),
        centerRadius: _lerp(7, 15, rng()),
        opacity: 1,
        palette: pickFlowerPalette(seed),
    };
}

function renderFlower(host: LiveTree, spec: FlowerSpec): LiveTree {
    const rng = make_rng(spec.seed ?? 0);

    const petals: string[] = [];

    for (let i = 0; i < spec.petalCount; i += 1) {
        const angle = (360 / spec.petalCount) * i;
        const fill = pickPetalColor(spec.palette, i, rng);

        petals.push(
            `<ellipse cx="0" cy="${fmtNum(-spec.petalLength * 0.55, 3)}" rx="${fmtNum(spec.petalWidth, 3)}" ry="${fmtNum(spec.petalLength, 3)}" fill="${fill}" transform="rotate(${fmtNum(angle, 3)})" />`
        );
    }

    const centerFill = pickCenterColor(spec.palette, rng);
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewbox="0 0 1000 1000" preserveAspectRatio="none" overflow="visible"><g transform="translate(${fmtNum(spec.x, 3)} ${fmtNum(spec.y, 3)}) rotate(${fmtNum(spec.rotation, 3)}) scale(${fmtNum(spec.scale, 4)})" opacity="${fmtNum(spec.opacity, 4)}">${petals.join("")}<circle cx="0" cy="0" r="${fmtNum(spec.centerRadius, 3)}" fill="${centerFill}" /></g></svg>`;

    const branch = hson.fromTrustedHtml(markup).liveTree.asBranch();
    host.append(branch);
    return branch;
}

export function spawn_flower(layer: LiveTree, x: number, y: number): LiveTree {
    const seed = Date.now() ^ ((x * 73856093) | 0) ^ ((y * 19349663) | 0);
    const spec = make_flower_spec(x, y, seed);
    return renderFlower(layer, spec);
}


function randInt(rng: Rng, min: number, max: number): number {
    return Math.floor(_lerp(min, max + 1, rng()));
}

function fmtNum(n: number, places: number): string {
    return Number(n.toFixed(places)).toString();
}

function pickFlowerPalette(seed: number): FlowerPaletteSpec {
    const rng = make_rng(seed);


    const hueBands: readonly HueBand[] = [
        { min: 18, max: 34, weight: 1.3 }, // rust orange
        { min: 35, max: 55, weight: 1.35 }, // acid gold
        { min: 56, max: 74, weight: 1.15 }, // chartreuse yellow
        { min: 75, max: 95, weight: 0.85 }, // yellow-green
        { min: 96, max: 118, weight: 0.8 },  // sour green
        { min: 119, max: 142, weight: 0.7 },  // moss green
        { min: 160, max: 182, weight: 0.55 }, // seafoam
        { min: 183, max: 198, weight: 0.65 }, // aqua
        { min: 199, max: 216, weight: 0.8 },  // cyan
        { min: 217, max: 236, weight: 0.9 },  // sky blue
        { min: 237, max: 252, weight: 1.0 },  // cornflower
        { min: 253, max: 270, weight: 1.05 }, // periwinkle
        { min: 271, max: 292, weight: 1.0 },  // violet
        { min: 293, max: 314, weight: 0.85 }, // orchid
        { min: 315, max: 334, weight: 0.95 }, // magenta-pink
        { min: 335, max: 350, weight: 1.1 },  // bruised pink
        { min: 351, max: 12, weight: 1.2 },  // salmon / coral
    ]

    const primaryBand = pick_weighted_band(hueBands, rng)
    const secondaryBand = rng() < 0.45 ? pick_weighted_band(hueBands, rng) : null;

    const primaryHue = sampleHueBand(primaryBand.min, primaryBand.max, rng);

    const secondaryHue = secondaryBand
        ? sampleHueBand(secondaryBand.min, secondaryBand.max, rng)
        : null;
    const centerHue = normalizeHue(primaryHue + (rng() * 80 - 40));

    return {
        primaryPetal: sampleFlowerColor(primaryHue, rng, {
            lMin: 0.48,
            lMax: 0.76,
            cMin: 0.10,
            cMax: 0.22,
            hSpread: 16,
            lightnessBias: 0.65,
        }),

        secondaryPetal: secondaryHue === null
            ? null
            : sampleFlowerColor(secondaryHue, rng, {
                lMin: 0.48,
                lMax: 0.76,
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