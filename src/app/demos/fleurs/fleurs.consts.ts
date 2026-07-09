import { _lerp } from "../../utils/helpers";
import type { Rng } from "../test/tests.types";
import type { CultivarShape, FlowerCultivar, HueBand } from "./fleurs.types";


export const OKLCH_FLEURS = {
    greyLilac: "oklch(0.75 0.06 300)",
    darkGrotto: "oklch(0.55 0.3 300)",
    electricCyan: "oklch(0.80 0.08 220)",
    
    fadedGold: "oklch(0.76 0.11 92)",
    brass: "oklch(0.70 0.09 82)",
    pollen: "oklch(0.80 0.12 102)",

    rustPink: "oklch(0.72 0.11 18)",
    roseDust: "oklch(0.69 0.09 8)",
    clayCoral: "oklch(0.67 0.10 28)",

    mauve: "oklch(0.71 0.10 330)",
    bruisedPlum: "oklch(0.64 0.11 315)",
    orchidAsh: "oklch(0.74 0.08 300)",

    violet: "oklch(0.63 0.14 315)",
    electricIris: "oklch(0.68 0.13 275)",
    indigoWash: "oklch(0.59 0.11 255)",

    cyanDust: "oklch(0.76 0.09 210)",
    seaGlass: "oklch(0.73 0.08 190)",
    baySky: "oklch(0.69 0.39 230)",
    oxidizedSky: "oklch(0.69 0.09 230)",

    limeTint: "oklch(0.79 0.13 125)",
    sourSage: "oklch(0.74 0.10 138)",
    mossGlow: "oklch(0.68 0.09 145)",
    oliveCore: "oklch(0.44 0.09 110)",
    plumCore: "oklch(0.38 0.10 315)",
    emberCore: "oklch(0.46 0.11 28)",
    navyCore: "oklch(0.33 0.09 255)",
    barkCore: "oklch(0.40 0.07 55)",
    greenCore: "oklch(0.41 0.10 135)",
    dustyLeaf: "oklch(0.60 0.08 145)",
    sageLeaf: "oklch(0.66 0.07 155)",
    dimFern: "oklch(0.54 0.08 150)",
    blazeOrange: "oklch(0.7 0.3 080)",

};

export const DAISYshape = (rng: Rng) => {
    return {
        petalCount: randInt(rng, 12, 20),
        petalLength: _lerp(24, 38, rng()),
        petalWidth: _lerp(10, 16, rng()),
        centerRatio: _lerp(0.38, 0.48, rng()),
        ringCount: 1,
        innerScale: 0.72,
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

export const SUNBURSTshape = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 8, 11),
        petalLength: _lerp(20, 30, rng()),
        petalWidth: _lerp(7, 11, rng()),
        centerRatio: _lerp(0.28, 0.36, rng()),
        ringCount: 2,
        innerScale: 0.68,
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: true,
    }
}

export const SCISSORshape = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 15, 17),
        petalLength: _lerp(20, 32, rng()),
        petalWidth: _lerp(8, 13, rng()),
        centerRatio: _lerp(0.38, 0.58, rng()),
        ringCount: 1,
        innerScale: 0.12,
        stamenCount: randInt(rng, 20, 34),
        stamenRadius: _lerp(0.54, 1.24, rng()),
        alternateGeometry: false,
    }
}

export const WILDshape = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 8, 14),
        petalLength: _lerp(22, 36, rng()),
        petalWidth: _lerp(8, 12, rng()),
        centerRatio: _lerp(0.20, 0.30, rng()),
        ringCount: 1,
        innerScale: 0.32,
        stamenCount: randInt(rng, 8, 12),
        stamenRadius: _lerp(2.62, 3.92, rng()),
        alternateGeometry: false,
    };
}

export const PINWHEELshape = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 14, 22),
        petalLength: _lerp(20, 30, rng()),
        petalWidth: _lerp(8, 12, rng()),
        centerRatio: _lerp(0.34, 0.46, rng()),
        ringCount: randInt(rng, 8, 11),
        innerScale: _lerp(0.82, 0.90, rng()),
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

export const ROSETTEshape = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 10, 16),
        petalLength: _lerp(18, 28, rng()),
        petalWidth: _lerp(18, 26, rng()),
        centerRatio: _lerp(0.18, 0.26, rng()),
        ringCount: randInt(rng, 3, 5),
        innerScale: _lerp(0.76, 0.84, rng()),
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

export const DANDYshape = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 20, 28),
        petalLength: _lerp(16, 22, rng()),
        petalWidth: _lerp(2, 3, rng()),
        centerRatio: _lerp(0.16, 0.23, rng()),
        ringCount: randInt(rng, 15, 17),
        innerScale: _lerp(0.82, 0.88, rng()),
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

function randInt(rng: Rng, min: number, max: number): number {
    return Math.floor(_lerp(min, max + 1, rng()));
}

export const HUE_BANDS: readonly HueBand[] = [
    { min: 18, max: 34, weight: 1.3 }, // rust orange
    { min: 35, max: 55, weight: 1.35 }, // acid gold
    { min: 56, max: 74, weight: 1.15 }, // chartreuse yellow
    { min: 75, max: 95, weight: 0.85 }, // yellow-green
    { min: 96, max: 118, weight: 0.8 }, // sour green
    { min: 119, max: 142, weight: 0.7 }, // moss green
    { min: 160, max: 182, weight: 0.55 }, // seafoam
    { min: 183, max: 198, weight: 0.65 }, // aqua
    { min: 199, max: 216, weight: 0.8 }, // cyan
    { min: 217, max: 236, weight: 0.9 }, // sky blue
    { min: 237, max: 252, weight: 1.0 }, // cornflower
    { min: 253, max: 270, weight: 1.05 }, // periwinkle
    { min: 271, max: 292, weight: 1.0 }, // violet
    { min: 293, max: 314, weight: 0.85 }, // orchid
    { min: 315, max: 334, weight: 0.95 }, // magenta-pink
    { min: 335, max: 350, weight: 1.1 }, // bruised pink
    { min: 351, max: 12, weight: 1.2 }, // salmon / coral
];
