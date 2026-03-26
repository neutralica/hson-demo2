import type { Rng } from "../../../../tests/tests.types";
import { _lerp } from "../../../utils/helpers";
import type { CultivarShape, FlowerCultivar, HueBand } from "./fleurs.types";


export const OKLCH_FLEURS = {
    fadedGold: "oklch(0.76 0.11 92)",
    brass: "oklch(0.70 0.09 82)",
    pollen: "oklch(0.80 0.12 102)",

    rustPink: "oklch(0.72 0.11 18)",
    roseDust: "oklch(0.69 0.09 8)",
    clayCoral: "oklch(0.67 0.10 28)",

    mauve: "oklch(0.71 0.10 330)",
    bruisedPlum: "oklch(0.64 0.11 315)",
    orchidAsh: "oklch(0.74 0.08 300)",

    violet: "oklch(0.63 0.14 285)",
    electricIris: "oklch(0.68 0.13 275)",
    indigoWash: "oklch(0.59 0.11 255)",

    cyanDust: "oklch(0.76 0.09 210)",
    seaGlass: "oklch(0.73 0.08 190)",
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

export const DAISY_SHAPE = (rng: Rng) => {
    return {
        petalCount: randInt(rng, 12, 20),
        petalLength: _lerp(26, 44, rng()),
        petalWidth: _lerp(10, 18, rng()),
        centerRatio: _lerp(0.38, 0.48, rng()),
        ringCount: 1,
        innerScale: 0.72,
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

export const SUNBURST_SHAPE = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 9, 13),
        petalLength: _lerp(28, 42, rng()),
        petalWidth: _lerp(6, 10, rng()),
        centerRatio: _lerp(0.22, 0.30, rng()),
        ringCount: 1,
        innerScale: 0.68,
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

export const SCISSOR_SHAPE = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 6, 9),
        petalLength: _lerp(24, 48, rng()),
        petalWidth: _lerp(9, 15, rng()),
        centerRatio: _lerp(0.30, 0.40, rng()),
        ringCount: 1,
        innerScale: 0.62,
        stamenCount: randInt(rng, 8, 12),
        stamenRadius: _lerp(0.22, 0.42, rng()),
        alternateGeometry: true,
    }
}

export const WILD_SHAPE = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 6, 10),
        petalLength: _lerp(22, 42, rng()),
        petalWidth: _lerp(6, 10, rng()),
        centerRatio: _lerp(0.16, 0.24, rng()),
        ringCount: 1,
        innerScale: 0.72,
        stamenCount: randInt(rng, 8, 12),
        stamenRadius: _lerp(0.62, 1.42, rng()),
        alternateGeometry: false,
    };
}

export const PINWHEEL_SHAPE = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 14, 22),
        petalLength: _lerp(24, 40, rng()),
        petalWidth: _lerp(8, 14, rng()),
        centerRatio: _lerp(0.30, 0.42, rng()),
        ringCount: randInt(rng, 8, 11),
        innerScale: _lerp(0.82, 0.90, rng()),
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

export const ROSETTE_SHAPE = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 20, 28),
        petalLength: _lerp(26, 38, rng()),
        petalWidth: _lerp(25, 20, rng()),
        centerRatio: _lerp(0.38, 0.44, rng()),
        ringCount: randInt(rng, 5, 7),
        innerScale: _lerp(0.82, 0.88, rng()),
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

export const DANDY_SHAPE = (rng: Rng): CultivarShape => {
    return {
        petalCount: randInt(rng, 20, 28),
        petalLength: _lerp(8, 14, rng()),
        petalWidth: _lerp(10, 16, rng()),
        centerRatio: _lerp(0.18, 0.26, rng()),
        ringCount: randInt(rng, 15, 17),
        innerScale: _lerp(0.82, 0.88, rng()),
        stamenCount: 0,
        stamenRadius: 0,
        alternateGeometry: false,
    }
}

function randInt(rng: Rng, min: number, max: number): number {
    return Math.floor(_lerp(min, max + 1, rng()));
} export const hueBands: readonly HueBand[] = [
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

