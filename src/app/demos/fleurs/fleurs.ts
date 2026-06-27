// fleurs.ts

import type { SvgLiveTree } from "hson-live/types";
import { make_rng } from "../../utils/rng";
import { pickFlowerPalette, pick_center_color, fmtNum } from "./fleurs-cols";
import { pick_cultivar, sampleCultivarShape } from "./fleurs-cultivars";
import { lerp } from "./fleurs-helpers";
import type { FlowerSpec } from "./fleurs.types";
import { appendDaisySpotsMarkup, appendPetalRingMarkup, appendStamensMarkup } from "./render-fleurs";


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

        randomColor: false,
        bitmap: true,
        bitmapSize: 128,

        alternateGeometry: shape.alternateGeometry,
    };
}

async function renderFlower(host: SvgLiveTree, spec: FlowerSpec): Promise<SvgLiveTree> {
    const rng = make_rng(spec.seed);
    const daisySpots = appendDaisySpotsMarkup(spec);

    let petals = "";
    for (let ringIx = 0; ringIx < spec.ringCount; ringIx += 1) {
        petals += appendPetalRingMarkup(spec, ringIx);
    }

    const stamens = appendStamensMarkup(spec);
    const centerFill = pick_center_color(spec.palette, rng, spec.cultivar);

    const g = host.create.g()
        .attr.setMany({
            transform: `translate(${fmtNum(spec.x, 3)} ${fmtNum(spec.y, 3)}) rotate(${fmtNum(spec.rotation, 3)}) scale(${fmtNum(spec.scale, 4)})`,
            opacity: fmtNum(spec.opacity, 4),
        });

    if (petals.trim()) {
        g.create.g(`<g>${petals}</g>`);
    }

    g.create.circle().attr.setMany({
        cx: "0",
        cy: "0",
        r: fmtNum(spec.centerRadius, 3),
        fill: centerFill,
    });

    if (daisySpots.trim()) {
        g.create.g(`<g>${daisySpots}</g>`);
    }

    if (stamens.trim()) {
        g.create.g(`<g>${stamens}</g>`);
    }

    if (spec.bitmap) {
        return await make_bitmapped_effect(g, spec);
    }

    return g;
}

export async function spawn_flower(layer: SvgLiveTree, x: number, y: number): Promise<SvgLiveTree> {
    const seed = Date.now() ^ ((x * 73856093) | 0) ^ ((y * 19349663) | 0);
    const spec = makeFlowerSpec(seed, x, y);
    return renderFlower(layer, spec);
}

async function make_bitmapped_effect(
    flower: SvgLiveTree,
    spec: FlowerSpec,
): Promise<SvgLiveTree> {
    // const el = flower.dom.el() as SVGGElement | undefined;
    // if (!el) return flower;
    // const bbox = el.getBBox();

    const el2 = flower.cloneBranch();
    const bb2 = flower.svg.must.bbox();

    const w2 = Math.max(1, bb2.width);
    const h2 = Math.max(1, bb2.height);
    const x2 = bb2.x;
    const y2 = bb2.y;

    // const w = Math.max(1, bbox.width);
    // const h = Math.max(1, bbox.height);
    // const x = bbox.x;
    // const y = bbox.y;

    // const clone = el.cloneNode(true) as SVGGElement;

    const clone2 = el2.cloneBranch();

    // strip transform/opacity from the cloned root because the live outer <g>
    // will keep those; otherwise they get applied twice inside the bitmap
    // clone.removeAttribute("transform");
    // clone.removeAttribute("opacity");
    clone2.attr.drop("transform");
    clone2.attr.drop("opacity");

    // const standaloneSvg =
    //     `<svg xmlns="http://www.w3.org/2000/svg"
    //           width="${fmtNum(w, 3)}"
    //           height="${fmtNum(h, 3)}"
    //           viewBox="${fmtNum(x, 3)} ${fmtNum(y, 3)} ${fmtNum(w, 3)} ${fmtNum(h, 3)}">
    //         ${clone.outerHTML}
    //     </svg>`;

    const standaloneSvg2 =
        `<svg xmlns="http://www.w3.org/2000/svg"
              width="${fmtNum(w2, 3)}"
              height="${fmtNum(h2, 3)}"
              viewBox="${fmtNum(x2, 3)} ${fmtNum(y2, 3)} ${fmtNum(w2, 3)} ${fmtNum(h2, 3)}">
            ${clone2.content.markup.outerHTML}
        </svg>`;

    const href = svg_to_data_url(standaloneSvg2);

    // keep the outer flower <g>; only replace its children
    el2.removeChildren();
    // while (el.firstChild) {
    //     el.removeChild(el.firstChild);
    // }
    const imageEl2 = el2.create.image()
        .attr.setMany({
            x: fmtNum(x2, 3),
            y: fmtNum(y2, 3),
            width: fmtNum(w2, 3),
            height: fmtNum(h2, 3),
            preserveAspectRatio: "none",
            href: href
        });
    // const imageEl = document.createElementNS("http://www.w3.org/2000/svg", "image");
    // imageEl.setAttribute("x", fmtNum(x, 3));
    // imageEl.setAttribute("y", fmtNum(y, 3));
    // imageEl.setAttribute("width", fmtNum(w, 3));
    // imageEl.setAttribute("height", fmtNum(h, 3));
    // imageEl.setAttribute("preserveAspectRatio", "none");
    // imageEl.setAttribute("href", href);

    // el.appendChild(imageEl);

    return el2;
}

function svg_to_data_url(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}