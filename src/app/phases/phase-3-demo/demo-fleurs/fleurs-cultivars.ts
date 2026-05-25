import type { Rng } from "../demo-test/tests.types";
import { make_rng } from "../../../utils/rng";
import { pickOne } from "./fleurs-helpers";
import { DAISYshape, SUNBURSTshape, PINWHEELshape, SCISSORshape, ROSETTEshape, WILDshape, DANDYshape } from "./fleurs.consts";
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
    if (cultivar === "daisy") { return DAISYshape(rng); }
    if (cultivar === "sunburst") { return SUNBURSTshape(rng); }
    if (cultivar === "pinwheel") { return PINWHEELshape(rng); }
    if (cultivar === "scissor") { return SCISSORshape(rng); }
    if (cultivar === "wild") { return WILDshape(rng); }
    if (cultivar === "dandy") { return DANDYshape(rng); }

    return ROSETTEshape(rng);
}

export function getStamenDistance(spec: FlowerSpec): number {
    if (spec.cultivar === "sunburst") return spec.centerRadius * 1.18;
    if (spec.cultivar === "scissor") return spec.centerRadius * 1.08;
    return spec.centerRadius * 1.02;
}

