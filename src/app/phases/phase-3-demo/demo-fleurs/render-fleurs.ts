import type { Rng } from "../../../../tests/tests.types";
import { make_rng } from "../../../utils/rng";
import { pickStamenColor, fmtNum, jitterOklch } from "./fleurs-cols";
import { getStamenDistance } from "./fleurs-cultivars";
import { lerp } from "./fleurs-helpers";
import type { FlowerPaletteSpec, FlowerSpec } from "./fleurs.types";

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
export function renderRosetteRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    const innerness = ringIx / Math.max(1, spec.ringCount - 1);
const count = Math.max(10, Math.round(lerp(spec.petalCount, spec.petalCount * 0.72, innerness)));
    const step = 360 / count;

    const ringShrink = Math.pow(0.75, ringIx);
    const widthShrink = Math.pow(0.96, ringIx);

    let baseLength = spec.petalLength * 0.78 * ringShrink;
    let baseWidth = spec.petalWidth * 0.72 * widthShrink;

    const phase = step * 0.14 * ringIx;

    let out = "";

    for (let i = 0; i < count; i += 1) {
        const angle = (step * i) + phase + lerp(-3.5, 3.5, rng());

        let length = baseLength * lerp(0.98, 1.04, rng());
        let width = baseWidth * lerp(0.96, 1.04, rng());

        const fillBase = pickPetalColor(spec.palette, i + (ringIx * 100), rng, true);

        // CHANGED: slightly darker inward to suggest puckering/shadow
        const fill = adjustOklch(fillBase, {
            l: lerp(0, -0.155, innerness),
        });

        const opacity = lerp(0.72, 0.90, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}

export function renderScissorRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    // CHANGED: scissor should be sparse and prominent
    const count = Math.random() * spec.petalCount + 3;
    const step = 360 / count;
    const phase = step * 0.5 * ringIx;

    let baseLength = spec.petalLength * (ringIx === 0 ? 1.22 : 0.58);
    let baseWidth = spec.petalWidth * (ringIx === 0 ? 0.52 : 0.34);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase;

        // CHANGED: blade-like asymmetry
        angle += (i % 2 === 0 ? -4 : 4);

        let length = baseLength * lerp(0.95, 1.08, rng());
        let width = baseWidth * lerp(0.82, 0.94, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.78, 0.92, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}
export function renderDaisyRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    // CHANGED: daisies should not keep accumulating surprise back-rings
    const count = ringIx === 0
        ? Math.max(10, spec.petalCount)
        : Math.max(8, Math.floor(spec.petalCount * 0.55));

    const step = 360 / count;
    const phase = ringIx === 0 ? 0 : step * 0.5;

    let baseLength = spec.petalLength * (ringIx === 0 ? 0.98 : 0.52);
    let baseWidth = spec.petalWidth * (ringIx === 0 ? 0.86 : 0.42);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        const angle = (step * i) + phase;

        let length = baseLength * lerp(0.96, 1.04, rng());
        let width = baseWidth * lerp(0.96, 1.04, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.82, 0.98, rng());
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

    let baseLength = spec.petalLength * (ringIx > 0 ? 0.82 : 1);
    let baseWidth = spec.petalWidth * (ringIx > 0 ? 0.68 : 0.78);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase;

        const taper = lerp(1, 0.82, i / count);
        const length = baseLength * taper * lerp(0.94, 1.04, rng());
        const width = baseWidth * taper * lerp(0.94, 1.04, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.78, 0.92, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}
export function renderWildRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    const count = Math.max(5, Math.floor(spec.petalCount * 0.55));
    const step = 360 / count;

    // CHANGED: this is the important bit for wild
    const phase = step * 0.5 * ringIx;

    let baseLength = spec.petalLength * 0.90 * Math.pow(0.88, ringIx);
    let baseWidth = spec.petalWidth * 0.72 * Math.pow(0.92, ringIx);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase + lerp(-10, 10, rng());

        const length = baseLength * lerp(0.82, 1.04, rng());
        const width = baseWidth * lerp(0.62, 0.80, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.78, 0.92, rng());
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

    let baseLength = spec.petalLength * Math.pow(0.90, ringIx);
    let baseWidth = spec.petalWidth * (ringIx > 0 ? 0.82 : 1);

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase + (i * 2);

        const taper = lerp(1, 0.90, i / count);
        const length = baseLength * taper * lerp(0.95, 1.05, rng());
        const width = baseWidth * taper * lerp(0.95, 1.05, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.78, 0.92, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}
export function appendPetalRingMarkup(spec: FlowerSpec, ringIx: number): string {
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

    for (let i = 0; i < spec.stamenCount; i += 1) {
        const angleDeg = step * i;
        const angleRad = (angleDeg * Math.PI) / 180;

        const x = Math.cos(angleRad) * dist;
        const y = Math.sin(angleRad) * dist;

        const fill = pickStamenColor(spec, rng);

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

    const rng = make_rng(spec.seed + 707);
    const spotCount = 14 + Math.floor(rng() * 10);

    let out = "";

    // golden angle in radians
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < spotCount; i += 1) {
        const t = (i + 0.5) / spotCount;

        // CHANGED: even distribution across the head, biased naturally outward
        const r = spec.centerRadius * 0.78 * Math.sqrt(t);
        const ang = i * golden;

        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;

        const dotR = spec.centerRadius * lerp(0.04, 0.07, rng());

        out += `<circle cx="${fmtNum(x, 3)}" cy="${fmtNum(y, 3)}"
            r="${fmtNum(dotR, 3)}"
            fill="rgba(0,0,0,0.20)" />`;
    }

    return out;
}
export function makeRingRng(spec: FlowerSpec, ringIx: number): () => number {
    return make_rng(spec.seed + ((ringIx + 1) * 101));
}

export function makeOutline(width: number, rng: () => number): string {
    return rng() < 0.94
        ? ` stroke="rgba(0,0,0,0.11)" stroke-width="${fmtNum(width * 0.08, 3)}"`
        : "";
}

export function makeEllipsePetal(
    angle: number,
    length: number,
    width: number,
    fill: string,
    opacity: number,
    outline: string
): string {
    return `<ellipse cx="0" cy="${fmtNum(-length * 0.55, 3)}"
        rx="${fmtNum(width, 3)}"
        ry="${fmtNum(length, 3)}"
        fill="${fill}"
        fill-opacity="${fmtNum(opacity, 3)}"
        ${outline}
        transform="rotate(${fmtNum(angle, 3)})" />`;
}

export function makePetalOpacity(spec: FlowerSpec, rng: () => number): number {
    return spec.cultivar === "daisy"
        ? lerp(0.82, 0.98, rng())
        : lerp(0.78, 0.94, rng());
}
export function pickPetalColor(
    palette: FlowerPaletteSpec,
    petalIx: number,
    rng: Rng,
    randomize: boolean = false
): string {
    let base = palette.useAlternatingPetals &&
        palette.secondaryPetal !== null &&
        petalIx % 2 === 1
        ? palette.secondaryPetal
        : palette.primaryPetal;
    if (randomize &&
        palette.secondaryPetal !== null &&
        rng() < 0.78) {
        base = rng() < 0.5
            ? palette.primaryPetal
            : palette.secondaryPetal;
    }

    return jitterOklch(base, rng, { l: 0.015, c: 0.015, h: 8 });
}
export function renderDandyRing(spec: FlowerSpec, ringIx: number): string {
    const rng = makeRingRng(spec, ringIx);

    // CHANGED: dense, compact, many petals
    const count = Math.max(14, spec.petalCount + (ringIx * 2));
    const step = 360 / count;

    // CHANGED: shrink from ring 0, not ring 1
    const ringShrink = Math.pow(0.80, ringIx);
    const widthGrow = Math.pow(1.08, ringIx);

    let baseLength = spec.petalLength * 0.92 * ringShrink;
    let baseWidth = spec.petalWidth * 0.92 * widthGrow;

    // CHANGED: strong per-ring phase so layers interleave
    const phase = step * 0.5 * ringIx;

    let out = "";

    for (let i = 0; i < count; i += 1) {
        const angle = (step * i) + phase;

        let length = baseLength * lerp(0.96, 1.04, rng());
        let width = baseWidth * lerp(0.96, 1.04, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);
        const opacity = lerp(0.72, 0.90, rng());
        const outline = makeOutline(width, rng);

        out += makeEllipsePetal(angle, length, width, fill, opacity, outline);
    }

    return out;
}

// CHANGED: small deterministic OKLCH adjuster for already-OKLCH color strings.
// Supports:
//   oklch(L C H)
//   oklch(L C H / A)
// If parsing fails, returns the original color unchanged.
export function adjustOklch(
    color: string,
    delta: {
        l?: number;
        c?: number;
        h?: number;
        a?: number;
    },
): string {
    const src = color.trim();

    const m = /^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/)]+)(?:\s*\/\s*([^)]+))?\s*\)$/i.exec(src);
    if (!m) return color;

    const l0 = Number.parseFloat(m[1] ?? "");
    const c0 = Number.parseFloat(m[2] ?? "");
    const h0 = Number.parseFloat(m[3] ?? "");
    const a0 = m[4] != null ? Number.parseFloat(m[4]) : undefined;

    if (!Number.isFinite(l0) || !Number.isFinite(c0) || !Number.isFinite(h0)) {
        return color;
    }

    // CHANGED: clamp inline; no external helpers needed
    let l = l0 + (delta.l ?? 0);
    let c = c0 + (delta.c ?? 0);
    let h = h0 + (delta.h ?? 0);
    let a = a0 != null ? a0 + (delta.a ?? 0) : undefined;

    l = Math.max(0, Math.min(1, l));
    c = Math.max(0, c);

    // CHANGED: wrap hue into [0, 360)
    h = ((h % 360) + 360) % 360;

    if (a != null && Number.isFinite(a)) {
        a = Math.max(0, Math.min(1, a));
    }

    const lStr = l.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    const cStr = c.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    const hStr = h.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");

    if (a != null && Number.isFinite(a)) {
        const aStr = a.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
        return `oklch(${lStr} ${cStr} ${hStr} / ${aStr})`;
    }

    return `oklch(${lStr} ${cStr} ${hStr})`;
}