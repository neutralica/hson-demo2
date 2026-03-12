import type { LiveTree } from "hson-live";
import type { OKLCH_FLEURS } from "./fleurs.consts";
import { make_rng } from "../../../utils/rng";

export type FlowerSpec = {
    seed?: number;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    petalCount: number;
    petalLength: number;
    petalWidth: number;
    centerRadius: number;
    opacity: number;
    palette: FlowerPaletteSpec;
};

export type FlowerScene = {
    root: LiveTree;
    field: LiveTree;
    layer: LiveTree;
    spawnAt(x: number, y: number): void;
    clear(): void;
};


export type PetalColorName = keyof typeof OKLCH_FLEURS.petal;
export type CenterColorName = keyof typeof OKLCH_FLEURS.center;

export type FlowerColorBank =
    | "rust-warm"
    | "cool-terminal"
    | "sickly-garden"
    | "violet-cyan"
    | "mixed-acid";

export const FLOWER_BANKS: Record<FlowerColorBank, readonly PetalColorName[]> = {
    "rust-warm": [
        "fadedGold",
        "brass",
        "rustPink",
        "roseDust",
        "clayCoral",
        "pollen",
    ],

    "cool-terminal": [
        "cyanDust",
        "seaGlass",
        "oxidizedSky",
        "violet",
        "electricIris",
        "indigoWash",
    ],

    "sickly-garden": [
        "limeTint",
        "sourSage",
        "mossGlow",
        "pollen",
        "orchidAsh",
        "fadedGold",
    ],

    "violet-cyan": [
        "violet",
        "electricIris",
        "indigoWash",
        "cyanDust",
        "seaGlass",
        "orchidAsh",
    ],

    "mixed-acid": [
        "fadedGold",
        "rustPink",
        "mauve",
        "cyanDust",
        "limeTint",
        "seaGlass",
    ],
} as const;


export type OklchColor = {
    l: number;
    c: number;
    h: number;
};


export type JitterOpts = {
    l: number;
    c: number;
    h: number;
};

export type FlowerPaletteSpec = {
  primaryPetal: string;
  secondaryPetal: string | null;
  center: string;
  useAlternatingPetals: boolean;
};

type FlowerCultivar =
  | "daisy"
  | "sunburst"
  | "pinwheel"
  | "scissor"
    | "rosette";
  
   export type HueBand = {
  min: number
  max: number
  weight: number
}