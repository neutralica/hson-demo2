import type { PropertyRegistration } from "../../../../../hson-live/dist/types/at-property.types";

export const CLOUD_TILE_W = 400;
export const sunColor = "rgb(255, 196, 84)";
export const sunFade = "rgba(255, 196, 84, 0.55)";
export const SKY_GRADIENT = "linear-gradient(30deg, transparent 0%,transparent 10%, white 100%)";

export const CLOUD_BAND_LOOPstr = "cloud-band-loop";
export const CLOUD_FADE_ONCEstr = "all-fade-once";
export const CLOUD_SUN_KISSstr = "cloud-sun-kiss";
export const CLOUD_LAYER_FADEstr = "cloud-layer-fade";
export const SUN_KISS_PROPstr = "--sun-kiss";


export const SHORT_FLASHnum = 700; //ms
export const SHORT_FLASHstr = `${SHORT_FLASHnum}ms`;

export const SKY_DURnum = 20000;
export const SKY_DURstr = `${SKY_DURnum}ms`;

export const CLOUD_DURnum = 8000;
export const CLOUD_DURstr = `${CLOUD_DURnum}ms`;

export const SUN_DELnum = CLOUD_DURnum * 0.6
export const SUN_DURnum = SKY_DURnum - SUN_DELnum;
export const SUN_TIMEstr = `${SUN_DURnum}ms`;

export const STAR_DURnum = 300;
export const STAR_DURstr = `${STAR_DURnum}ms`;

export const STAR_DELnum = SKY_DURnum * 0.46;
export const STAR_DELstr = `${STAR_DELnum}ms`;

const flareAt = 0.4659;
const flareLengthNum = 320;
export const flareDelayNum = Math.round(SUN_DURnum * flareAt);
export const flareDurStr = `${flareLengthNum}ms`;



export const CLOUD_CONFIG = {
    layers: 10,
    seed: 1211,
    w: CLOUD_TILE_W,
    circlesMin: 10,
    circlesMax: 30,
};

export const AT_LAYER_FADE: PropertyRegistration = {
    name: "--layer-fade",
    syn: "<number>",
    inh: true,
    init: "1",
}

export const AT_LAYER_MAX: PropertyRegistration = {
    name: "--layer-max",
    syn: "<number>",
    inh: true,
    init: "0.1",
};

export const at_SUN_KISS: PropertyRegistration = {
    name: SUN_KISS_PROPstr,
    syn: "<number>",
    inh: true,
    init: "0",
};