import type { Rng } from "../../../../tests/tests.types";
import { make_rng } from "../../../utils/rng";
import { pickOne } from "./fleurs-helpers";
import { DAISY_SHAPE, SUNBURST_SHAPE, PINWHEEL_SHAPE, SCISSOR_SHAPE, ROSETTE_SHAPE, WILD_SHAPE, DANDY_SHAPE } from "./fleurs.consts";
import type { FlowerCultivar, CultivarShape, FlowerSpec } from "./fleurs.types";

export function pick_cultivar(seed: number): FlowerCultivar {
    const rng = make_rng(seed);

    const cultivars: readonly FlowerCultivar[] = [
        "daisy",
        "sunburst",
        "pinwheel",
        "scissor",
        "rosette",
        "wild",
        "dandy"
    ];

    return pickOne( cultivars, rng);
}
export function sampleCultivarShape(
    cultivar: FlowerCultivar,
    rng: Rng): CultivarShape {

    console.log(cultivar);
    if (cultivar === "daisy") { return DAISY_SHAPE(rng); }
    if (cultivar === "sunburst") { return SUNBURST_SHAPE(rng); }
    if (cultivar === "pinwheel") { return PINWHEEL_SHAPE(rng); }
    if (cultivar === "scissor") { return SCISSOR_SHAPE(rng); }
    if (cultivar === "wild") { return WILD_SHAPE(rng); }
    if (cultivar === "dandy") { return DANDY_SHAPE(rng); }

    return ROSETTE_SHAPE(rng);
}

export function getStamenDistance(spec: FlowerSpec): number {
    if (spec.cultivar === "sunburst") return spec.centerRadius * 1.18;
    if (spec.cultivar === "scissor") return spec.centerRadius * 1.08;
    return spec.centerRadius * 1.02;
}

