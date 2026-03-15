// fleurs.ts

import { hson, type LiveTree } from "hson-live";
import type { Rng } from "../../../../tests/tests.types";
import { _lerp } from "../../../utils/helpers";
import { make_rng } from "../../../utils/rng";
import { type FlowerPaletteSpec, type FlowerSpec } from "./fleurs.types";
import { lerp, randSigned } from "./fleurs-helpers";
import { normalizeHue, pickCenterColor, pickStamenColor } from "./fleurs-cols";
import { fmtNum, pickFlowerPalette } from "./fleurs-cols";
import { getStamenDistance, pick_cultivar, sampleCultivarShape } from "./fleurs-cultivars";
import { formatOklch, jitterOklch } from "./fleurs-cols";

function pickPetalColor(
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
    const daisySpots = appendDaisySpotsMarkup(spec);
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
    ${daisySpots}
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
function appendPetalRingMarkup(spec: FlowerSpec, ringIx: number): string {
    const rng = make_rng(spec.seed + ((ringIx + 1) * 101));
    const isInner = ringIx > 0;
    const ringScale = isInner ? spec.innerScale : 1;

    const count = spec.cultivar === "wild"
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
        const t = ringIx / Math.max(1, spec.ringCount - 1);
        const eased = t * t; // CHANGED: delayed acceleration
        phase = step * 0.48 * eased;

    }

    let baseLength = spec.petalLength * ringScale;
    let baseWidth = spec.petalWidth * (isInner ? 0.92 : 1);

    if (spec.cultivar === "sunburst") {
        baseLength *= isInner ? 0.82 : 1;
        baseWidth *= isInner ? 0.72 : 0.82;
    }

    if (spec.cultivar === "rosette") {
        const innerIx = Math.max(0, ringIx - 1);
        const ringShrink = Math.pow(0.84, innerIx);
        const widthGrow = Math.pow(1.013, innerIx);

        baseLength *= ringShrink;
        baseWidth *= widthGrow;
    }

    let out = "";

    for (let i = 0; i < count; i += 1) {
        let angle = (step * i) + phase;

        const petalOpacity =
            spec.cultivar === "daisy"
                ? lerp(0.82, 0.98, rng())
                : lerp(0.78, 0.94, rng());

        const fill = pickPetalColor(spec.palette, i + (ringIx * 100), rng);

        let length = baseLength;
        let width = baseWidth;

        if (spec.alternateGeometry && i % 2 === 1) {
            length *= lerp(0.82, 0.92, rng());
            width *= lerp(0.86, 0.96, rng());
        }

        if (spec.cultivar === "pinwheel") {
            angle += i * 2;
            const taper = lerp(1, 0.92, i / count);
            length *= taper;
            width *= taper;
        }

        if (spec.cultivar === "wild") {
            width *= 0.75;
            length *= 0.9;
        }

        if (spec.cultivar === "rosette") {
            const innerness = ringIx / Math.max(1, spec.ringCount - 1);
            const fade = lerp(1, 0.74, innerness);

            // CHANGED: soften the inner rings a bit
            if (ringIx > 0) {
                length *= fade;
                width *= fade;
            }
        }

        if (spec.cultivar === "sunburst") {
            const taper = lerp(1, 0.82, i / count);
            length *= taper;
            width *= taper;
        }

        const outline =
            rng() < 0.94
                ? ` stroke="rgba(0,0,0,0.11)" stroke-width="${fmtNum(width * 0.08, 3)}"`
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

function appendDaisySpotsMarkup(spec: FlowerSpec): string {
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