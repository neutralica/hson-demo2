import { adjustOklch } from "../../core/helpers/color-helpers";
import { make_rng } from "../../utils/rng";
import type { Rng } from "../test/tests.types";
import { pickStamenColor, fmtNum, jitter_oklch } from "./fleurs-cols";
import { lerp } from "./fleurs-helpers";
import type { FlowerSpec, FlowerPaletteSpec } from "./fleurs.types";

export function renderDefaultRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);
    const isInner = ringIx > 0;
    const ringScale = isInner ? spec.innerScale : 1;

    const count = spec.petalCount;
    const step = 360 / count;

    let baseLength = spec.petalLength * ringScale;
    let baseWidth = spec.petalWidth * (isInner ? 0.92 : 1);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = step * i;
        let length = baseLength;
        let width = baseWidth;

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = makePetalOpacity(spec, rng);

        if (spec.alternateGeometry && i % 2 === 1) {
            length *= lerp(0.82, 0.92, rng());
            width *= lerp(0.86, 0.96, rng());
        }

        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}
export function makeRosettePetal(
    angle: number,
    length: number,
    width: number,
    fill: string,
    opacity: number,
    outline: string,
    offsetRatio: number
): string {
    return `<ellipse cx="0" cy="${fmtNum(-length * offsetRatio, 3)}"
        rx="${fmtNum(width, 3)}"
        ry="${fmtNum(length, 3)}"
        fill="${fill}"
        fill-opacity="${fmtNum(opacity, 3)}"
        ${outline}
        transform="rotate(${fmtNum(angle, 3)})" />`;
}
export function renderRosetteRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);
    const innerness = ringIx / Math.max(1, spec.ringCount - 1);

    const count = Math.max(4, Math.round(lerp(spec.petalCount * 0.62, spec.petalCount * 0.36, innerness)));
    const step = 360 / count;
    const phase = (ringIx * 47) + (step * 0.22 * ringIx);

    const lengthScale = lerp(0.78, 0.36, innerness);
    const widthScale = lerp(1.02, 0.64, innerness);
    const offsetRatio = lerp(0.62, 0.42, innerness);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        const angle = (step * i) + phase + lerp(-14, 14, rng());
        const length = spec.petalLength * lengthScale * lerp(0.90, 1.14, rng());
        const width = spec.petalWidth * widthScale * lerp(0.88, 1.12, rng());

        const fillBase = pickPetalColor(spec.palette, i + (ringIx * 100), rng, true);
        const fill = adjustOklch(fillBase, {
            l: lerp(-0.035, 0.045, rng()) + lerp(-0.025, 0.015, innerness),
        });

        const opacity = lerp(0.82, 0.92, rng());
        const outline = makeOutline(width, rng);

        out += makeRosettePetal(angle, length, width, fill, opacity, outline, offsetRatio);
    }

    return out;
}

export function renderScissorRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    // scissor should be sparse and prominent
    const count = spec.petalCount;
    const step = 360 / count;
    const phase = step * 0.5 * ringIx;

    let baseLength = spec.petalLength * (ringIx === 0 ? 0.82 : 0.42);
    let baseWidth = spec.petalWidth * (ringIx === 0 ? 1.08 : 0.62);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase;

        // blade-like asymmetry
        angle += (i % 2 === 0 ? -4 : 4);

        let length = baseLength * lerp(0.95, 1.08, rng());
        let width = baseWidth * lerp(0.82, 0.94, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.78, 0.90, rng());
        const outline = makeOutline(width, rng);

        out += makeDetachedEllipsePetal(angle, length, width, spec.centerRadius, fill, opacity, outline, width * 0.12);
    }

    return out;
}
export function renderDaisyRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    // daisies should not keep accumulating surprise back-rings
    const count = ringIx === 0
        ? Math.max(8, Math.floor(spec.petalCount * 0.82))
        : Math.max(6, Math.floor(spec.petalCount * 0.42));

    const step = 360 / count;
    const phase = ringIx === 0 ? 0 : step * 0.5;

    let baseLength = spec.petalLength * (ringIx === 0 ? 1.04 : 0.52);
    let baseWidth = spec.petalWidth * (ringIx === 0 ? 0.68 : 0.34);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        const angle = (step * i) + phase;

        let length = baseLength * lerp(0.96, 1.04, rng());
        let width = baseWidth * lerp(0.96, 1.04, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.78, 0.90, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}
export function renderSunburstRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    const count = ringIx > 0
        ? Math.max(10, Math.floor(spec.petalCount * 0.88))
        : spec.petalCount;

    const step = 360 / count;
    const phase = step * 0.5 * ringIx;

    let baseLength = spec.petalLength * (ringIx > 0 ? 0.62 : 0.74);
    let baseWidth = spec.petalWidth * (ringIx > 0 ? 0.88 : 1.04);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase;

        const taper = lerp(1, 0.82, i / count);
        const length = baseLength * taper * lerp(0.94, 1.04, rng());
        const width = baseWidth * taper * lerp(0.94, 1.04, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.88, 0.98, rng());
        const outline = makeOutline(width, rng);

        out += makeDetachedEllipsePetal(angle, length, width, spec.centerRadius, fill, opacity, outline, width * 0.08);
    }

    return out;
}
export function renderWildRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    const count = Math.max(4, Math.floor(spec.petalCount * 0.48));
    const step = 360 / count;

    // this is the important bit for wild
    const phase = step * 0.5 * ringIx;

    let baseLength = spec.petalLength * 1.04 * Math.pow(0.88, ringIx);
    let baseWidth = spec.petalWidth * 0.86 * Math.pow(0.92, ringIx);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase + lerp(-10, 10, rng());

        const length = baseLength * lerp(0.82, 1.04, rng());
        const width = baseWidth * lerp(0.76, 0.94, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.88, 0.98, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}
export function renderPinwheelRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    const count = spec.petalCount;
    const step = 360 / count;
    const phase = step * 0.35 * ringIx;

    let baseLength = spec.petalLength * 0.92 * Math.pow(0.90, ringIx);
    let baseWidth = spec.petalWidth * (ringIx > 0 ? 0.76 : 0.92);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase + (i * 2);

        const taper = lerp(1, 0.90, i / count);
        const length = baseLength * taper * lerp(0.95, 1.05, rng());
        const width = baseWidth * taper * lerp(0.95, 1.05, rng());

        const innerness = ringIx / Math.max(1, spec.ringCount - 1);
        const fill = adjustOklch(pickPetalColor(spec.palette, i + (ringIx * 100), rng), {
            l: lerp(0.055, -0.035, innerness),
        });
        const opacity = lerp(0.74, 0.58, innerness) * lerp(0.96, 1.04, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}
export function appendPetalRingMarkup(spec: FlowerSpec, ringIx: number): string {
    console.log(spec.cultivar);
    switch (spec.cultivar) {
        case "rosette":
            return renderRosetteRing(spec, ringIx);

        case "scissor":
            return renderScissorRing(spec, ringIx);

        case "daisy":
            return renderDaisyRing(spec, ringIx);

        case "sunburst":
            return renderSunburstRing(spec, ringIx);

        case "wild":
            return renderWildRing(spec, ringIx);

        case "pinwheel":
            return renderPinwheelRing(spec, ringIx);

        case "dandy":
            return renderDandyRing(spec, ringIx);

        default:
            return renderDefaultRing(spec, ringIx);
    }
}
export function appendStamensMarkup(spec: FlowerSpec): string {
    if (spec.stamenCount <= 0 || spec.stamenRadius <= 0) {
        return "";
    }

    const rng = make_rng(spec.seed + 909);
    const step = 360 / spec.stamenCount;
    const dist = getStamenDistance(spec);

    let out = "";
    const fill = pickStamenColor(spec, rng);

    for (let i = 0; i < spec.stamenCount; i += 1) {
        const angleDeg = step * i;
        const angleRad = (angleDeg * Math.PI) / 180;

        const x = Math.cos(angleRad) * dist;
        const y = Math.sin(angleRad) * dist;

        
        if (spec.cultivar === "scissor") {
            
            const innerDist = dist * 0.82;
            const outerDist = dist * 1.94;
            const ctrlDist = dist * 1.08;

            const x1 = Math.cos(angleRad) * innerDist;
            const y1 = Math.sin(angleRad) * innerDist;

            const x2 = Math.cos(angleRad) * outerDist;
            const y2 = Math.sin(angleRad) * outerDist;

            const sag = spec.stamenRadius * lerp(1.4, 2.1, rng());
            const cx = Math.cos(angleRad) * ctrlDist;
            const cy = Math.sin(angleRad) * ctrlDist + sag;

            const strokeW = spec.stamenRadius * lerp(1.05, 1.55, rng());

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
export function appendDaisySpotsMarkup(spec: FlowerSpec): string {
    if (spec.cultivar !== "daisy") {
        return "";
    }

    return "";
}
export function makeRingRng(spec: FlowerSpec, ringIx: number): () => number {
    return make_rng(spec.seed + ((ringIx + 1) * 101));
}

export function makeOutline(_width: number, _rng: () => number): string {
    return "";
}

export function makeEllipsePetal(
    angle: number,
    length: number,
    width: number,
    fill: string,
    opacity: number,
    outline: string
): string {
    return `<ellipse cx="0" cy="${fmtNum(-length * 0.78, 3)}"
        rx="${fmtNum(width, 3)}"
        ry="${fmtNum(length, 3)}"
        fill="${fill}"
        fill-opacity="${fmtNum(opacity, 3)}"
        ${outline}
        transform="rotate(${fmtNum(angle, 3)})" />`;
}
export function makeDetachedEllipsePetal(
    angle: number,
    length: number,
    width: number,
    centerRadius: number,
    fill: string,
    opacity: number,
    outline: string,
    gap: number
): string {
    return `<ellipse cx="0" cy="${fmtNum(-(length + centerRadius + gap), 3)}"
        rx="${fmtNum(width, 3)}"
        ry="${fmtNum(length, 3)}"
        fill="${fill}"
        fill-opacity="${fmtNum(opacity, 3)}"
        ${outline}
        transform="rotate(${fmtNum(angle, 3)})" />`;
}

export function makePetalOpacity(spec: FlowerSpec, rng: () => number): number {
    return spec.cultivar === "daisy"
        ? lerp(0.58, 0.90, rng())
        : lerp(0.78, 0.88, rng());
}
export function pickPetalColor(
    palette: FlowerPaletteSpec,
    _petalIx: number,
    rng: Rng,
    _randomize: boolean = false
): string {
    return jitter_oklch(palette.primaryPetal, rng, { l: 0.006, c: 0.006, h: 3 });
}
export function renderDandyRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    // dense, compact, many petals
    const count = Math.max(14, spec.petalCount + (ringIx * 2));
    const step = 360 / count;

    // shrink from ring 0, not ring 1
    const ringShrink = Math.pow(0.80, ringIx);
    const widthGrow = Math.pow(1.08, ringIx);

    let baseLength = spec.petalLength * 1.02 * ringShrink;
    let baseWidth = spec.petalWidth * 0.48 * widthGrow;

    // strong per-ring phase so layers interleave
    const phase = step * 0.5 * ringIx;

    let out = "";

    for (let i = 0; i < count; i += 1) {
        const angle = (step * i) + phase;

        let length = baseLength * lerp(0.96, 1.04, rng());
        let width = baseWidth * lerp(0.96, 1.04, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.74, 0.86, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}export function getStamenDistance(spec: FlowerSpec): number {
    if (spec.cultivar === "sunburst") return spec.centerRadius * 1.18;
    if (spec.cultivar === "scissor") return spec.centerRadius * 1.08;
    return spec.centerRadius * 1.02;
}
