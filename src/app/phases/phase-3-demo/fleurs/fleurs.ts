// fleurs.ts

import { hson, type LiveTree } from "hson-live";
import type { Rng } from "../../../../tests/tests.types";
import { _clamp01, _lerp } from "../../../utils/helpers";
import { make_rng } from "../../../utils/rng";
import { type CultivarShape, type FlowerCultivar, type FlowerPaletteSpec, type FlowerSpec, type HueBand, type JitterOpts, type OklchColor } from "./fleurs.types";
import { DAISY_SHAPE, hueBands, PINWHEEL_SHAPE, ROSETTE_SHAPE, SCISSOR_SHAPE, SUNBURST_SHAPE } from "./fleurs.consts";

type FlowerColorOpts = {
    lMin: number
    lMax: number
    cMin: number
    cMax: number
    hSpread: number
    lightnessBias?: number
}

function pickOne<T>(arr: readonly T[], rng: Rng): T { // dead?
    const ix = Math.floor(rng() * arr.length);
    const v = arr[ix];
    if (v === undefined) {
        throw new Error("pick_one: empty array");
    }
    return v;
}

function sampleFlowerColor(
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
function pickWeightedBand(
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

function makeFlowerSpec(seed: number, x: number, y: number): FlowerSpec {
    const rng = make_rng(seed);

    const cultivar = pick_cultivar(seed);
    const shape = sampleCultivarShape(cultivar, rng);
    const palette = pickFlowerPalette(seed);

    const centerRadius = shape.petalLength * shape.centerRatio;

    return {
        seed,
        x,
        y,
        scale: lerp(1.32, 1.78, rng()),
        rotation: lerp(0, 360, rng()),
        opacity: 1,

        cultivar,

        petalCount: shape.petalCount,
        petalLength: shape.petalLength,
        petalWidth: shape.petalWidth,
        centerRadius,

        palette,

        ringCount: shape.ringCount,
        innerScale: shape.innerScale,
        stamenCount: shape.stamenCount,
        stamenRadius: shape.stamenRadius,
        alternateGeometry: shape.alternateGeometry,
    };
}

function renderFlower(host: LiveTree, spec: FlowerSpec): LiveTree {
    // CHANGED: stable rng for flower-local variation
    const rng = make_rng(spec.seed);

    // CHANGED: build rings using cultivar-aware helper
    let petals = "";

    for (let ringIx = 0; ringIx < spec.ringCount; ringIx += 1) {
        petals += appendPetalRingMarkup(spec, ringIx);
    }

    // CHANGED: optional stamens for the cultivars that call for them
    const stamens = appendStamensMarkup(spec);

    const centerFill = pickCenterColor(spec.palette, rng);

    // CHANGED: keep the working per-flower SVG wrapper, but use the real spec
    const markup = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="100%"
     height="100%"
     viewbox="0 0 1000 1000"
     preserveAspectRatio="none"
     overflow="visible">
  <g transform="translate(${fmtNum(spec.x, 3)} ${fmtNum(spec.y, 3)}) rotate(${fmtNum(spec.rotation, 3)}) scale(${fmtNum(spec.scale, 4)})"
     opacity="${fmtNum(spec.opacity, 4)}">
    ${petals}
    <circle cx="0" cy="0" r="${fmtNum(spec.centerRadius, 3)}" fill="${centerFill}" />
    ${stamens}
  </g>
</svg>`;

    const branch = hson.fromTrustedHtml(markup).liveTree.asBranch();
    host.append(branch);
    return branch;
}

export function spawn_flower(layer: LiveTree, x: number, y: number): LiveTree {
    const seed = Date.now() ^ ((x * 73856093) | 0) ^ ((y * 19349663) | 0);
    const spec = makeFlowerSpec(seed, x, y);
    return renderFlower(layer, spec);
}


function fmtNum(n: number, places: number): string {
    return Number(n.toFixed(places)).toString();
}
function pickSecondaryBand(primaryBand: HueBand, rng: Rng): HueBand | null {
    // CHANGED: not every flower gets a second hue family
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

    // CHANGED: try a few times not to match the primary band exactly
    for (let i = 0; i < 4; i += 1) {
        const next = pickWeightedBand(hueBands, rng);
        if (next.min !== primaryBand.min || next.max !== primaryBand.max) {
            return next;
        }
    }

    return null;
}
function pickFlowerPalette(seed: number): FlowerPaletteSpec {
    const rng = make_rng(seed);



    const primaryBand = pickWeightedBand(hueBands, rng)
    const secondaryBand = pickSecondaryBand(primaryBand, rng);

    const primaryHue = sampleHueBand(primaryBand.min, primaryBand.max, rng);

    const secondaryHue = secondaryBand
        ? sampleHueBand(secondaryBand.min, secondaryBand.max, rng)
        : null;
    const centerHue = normalizeHue(primaryHue + (rng() * 80 - 140));

    return {
        primaryPetal: sampleFlowerColor(primaryHue, rng, {
            lMin: 0.28,
            lMax: 0.66,
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

export function pick_cultivar(seed: number): FlowerCultivar {
    const rng = make_rng(seed);

    const cultivars: readonly FlowerCultivar[] = [
        "daisy",
        "sunburst",
        "pinwheel",
        "scissor",
        "rosette",
    ];

    return pickOne(cultivars, rng);
}

function sampleCultivarShape(
    cultivar: FlowerCultivar,
    rng: Rng,
): CultivarShape {

    console.log(cultivar);
    if (cultivar === "daisy") { return DAISY_SHAPE(rng); }
    if (cultivar === "sunburst") { return SUNBURST_SHAPE(rng); }
    if (cultivar === "pinwheel") { return PINWHEEL_SHAPE(rng); }
    if (cultivar === "scissor") { return SCISSOR_SHAPE(rng); }
    return ROSETTE_SHAPE(rng);
}

function appendPetalRingMarkup(spec: FlowerSpec, ringIx: number): string {
    const rng = make_rng(spec.seed + ((ringIx + 1) * 101));

    const isInner = ringIx > 0;
    const ringScale = isInner ? spec.innerScale : 1;

    const count =
        spec.cultivar === "wild"
            ? Math.floor(spec.petalCount * 0.55)
            : spec.cultivar === "sunburst" && isInner
                ? Math.max(10, Math.floor(spec.petalCount * 0.9))
                : spec.petalCount;

    const step = 360 / count;

    let phase = 0;

    if (spec.cultivar === "sunburst") {
        phase = step * 0.5 * ringIx;
    }

    if (spec.cultivar === "rosette") {
        phase = step * 0.75 * ringIx;
    }

    let baseLength = spec.petalLength * ringScale;
    let baseWidth = spec.petalWidth * (isInner ? 0.92 : 1);

    if (spec.cultivar === "sunburst") {
        baseLength *= isInner ? 0.82 : 1;
        baseWidth *= isInner ? 0.72 : 0.82;
    }

    if (spec.cultivar === "rosette") {
        const ringShrink = Math.pow(0.82, ringIx);
        const widthGrow = Math.pow(1.04, ringIx);

        baseLength *= ringShrink;
        baseWidth *= widthGrow;
    }

    let out = "";

    for (let i = 0; i < count; i += 1) {
        // CHANGED: angle must be mutable because pinwheel adds twist
        let angle = (step * i) + phase;
        // add just before writing the ellipse
        const petalOpacity =
            spec.cultivar === "daisy"
                ? lerp(0.82, 0.96, rng())
                : lerp(0.78, 0.94, rng())
        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);

        let length = baseLength;
        let width = baseWidth;

        if (spec.alternateGeometry && i % 2 === 1) {
            length *= lerp(0.72, 0.88, rng());
            width *= lerp(0.78, 0.92, rng());
        }

        // CHANGED: pinwheel petals progressively chase each other
        if (spec.cultivar === "pinwheel") {
            angle += i * 4;
        }
        if (spec.cultivar === "wild") {
            width *= 0.75;
            length *= 0.9;
        }
        if (spec.cultivar === "daisy") {
            const spotCount = 5 + Math.floor(rng() * 6);

            for (let i = 0; i < spotCount; i += 1) {
                const angDeg = (360 / spotCount) * i;
                const angRad = (angDeg * Math.PI) / 180;

                const r = spec.centerRadius * lerp(0.4, 0.8, rng());

                const x = Math.cos(angRad) * r;
                const y = Math.sin(angRad) * r;

                out += `<circle cx="${fmtNum(x, 3)}" cy="${fmtNum(y, 3)}"
                 r="${fmtNum(spec.centerRadius * 0.08, 3)}"
                 fill="rgba(0,0,0,0.28)" />`;
            }
        }
        const taper = lerp(1, 0.35, i / count);
        length *= taper;
        width *= taper;

        const outline =
            rng() < 0.14
                ? ` stroke="rgba(0,0,0,0.18)" stroke-width="${fmtNum(width * 0.08, 3)}"`
                : "";
        out += `<ellipse cx="0" cy="${fmtNum(-length * 0.55, 3)}"
            rx="${fmtNum(width, 3)}"
            ry="${fmtNum(length, 3)}"
            fill="${fill}"
            fill-opacity="${fmtNum(petalOpacity, 3)}"
            ${outline}
            transform="rotate(${fmtNum(angle, 3)})" />`;
    }

    return out;
}

function appendStamensMarkup(spec: FlowerSpec): string {
    if (spec.stamenCount <= 0 || spec.stamenRadius <= 0) {
        return "";
    }

    const rng = make_rng(spec.seed + 909);
    const step = 360 / spec.stamenCount;
    const dist = getStamenDistance(spec);

    let out = "";

    for (let i = 0; i < spec.stamenCount; i += 1) {
        const angleDeg = step * i;
        const angleRad = (angleDeg * Math.PI) / 180;

        const x = Math.cos(angleRad) * dist;
        const y = Math.sin(angleRad) * dist;

        const fill = pickStamenColor(spec, rng);

        if (spec.cultivar === "scissor") {

            const innerDist = dist * 0.72;
            const outerDist = dist * 1.18;

            const x1 = Math.cos(angleRad) * innerDist;
            const y1 = Math.sin(angleRad) * innerDist;

            const x2 = Math.cos(angleRad) * outerDist;
            const y2 = Math.sin(angleRad) * outerDist;

            const ctrlDist = dist * 0.96;

            const cx = Math.cos(angleRad) * ctrlDist;

            const sag = spec.stamenRadius * lerp(1.4, 2.1, rng());
            const cy = Math.sin(angleRad) * ctrlDist + sag;

            const strokeW = spec.stamenRadius * lerp(0.25, 0.6, rng());

            out += `<path d="M ${fmtNum(x1, 3)} ${fmtNum(y1, 3)}
             Q ${fmtNum(cx, 3)} ${fmtNum(cy, 3)}
             ${fmtNum(x2, 3)} ${fmtNum(y2, 3)}"
             stroke="${fill}"
             stroke-width="${fmtNum(strokeW, 3)}"
             stroke-linecap="round"
             fill="none" />`;

            continue;
        }

        const r = spec.stamenRadius * lerp(0.85, 1.15, rng());
        out += `<circle cx="${fmtNum(x, 3)}" cy="${fmtNum(y, 3)}" r="${fmtNum(r, 3)}" fill="${fill}" />`;
    }

    return out;
}

function pickStamenColor(spec: FlowerSpec, rng: Rng): string {
    const petal = parseOklch(spec.palette.primaryPetal);

    // darker flowers can take lighter stamens; lighter flowers need darker stamens
    if (petal.l > 0.68) {
        const hue = sampleHueBand(25, 45, rng); // warm brown / ochre
        return sampleFlowerColor(hue, rng, {
            lMin: 0.22,
            lMax: 0.38,
            cMin: 0.03,
            cMax: 0.08,
            hSpread: 8,
            lightnessBias: 1.1,
        });
    }

    if (petal.l > 0.58) {
        const hue = sampleHueBand(260, 320, rng); // soot plum / eggplant
        return sampleFlowerColor(hue, rng, {
            lMin: 0.26,
            lMax: 0.42,
            cMin: 0.03,
            cMax: 0.07,
            hSpread: 10,
            lightnessBias: 1,
        });
    }

    // pale grey / dusty cream for darker petals
    const useWarm = rng() < 0.5;

    if (useWarm) {
        const hue = sampleHueBand(60, 90, rng);
        return sampleFlowerColor(hue, rng, {
            lMin: 0.66,
            lMax: 0.82,
            cMin: 0.015,
            cMax: 0.05,
            hSpread: 8,
            lightnessBias: 0.9,
        });
    }

    const hue = sampleHueBand(220, 280, rng);
    return sampleFlowerColor(hue, rng, {
        lMin: 0.64,
        lMax: 0.80,
        cMin: 0.01,
        cMax: 0.04,
        hSpread: 10,
        lightnessBias: 0.9,
    });
}

function getStamenDistance(spec: FlowerSpec): number {
    if (spec.cultivar === "sunburst") return spec.centerRadius * 1.18;
    if (spec.cultivar === "scissor") return spec.centerRadius * 1.08;
    return spec.centerRadius * 1.02;
}