
export const CLOUD_TILE_W = 400;

export const sunColor = "rgb(255, 196, 84)";
export const sunFade = "rgba(255, 196, 84, 0.55)";
export const skyGradient = "linear-gradient(30deg, transparent 0%,transparent 10%, white 100%)";

export const shortFlash = 700; //ms
export const shortFlashString = `${shortFlash}ms`;

export const skyTimeNum = 20000;
export const skyTimeString = `${skyTimeNum}ms`;

export const cloudTimeNum = 8000;
export const cloudtimeStr = `${cloudTimeNum}ms`;

export const sunDelay = cloudTimeNum * 0.6
export const sunTimeNum = skyTimeNum - sunDelay;
export const sunTimeString = `${sunTimeNum}ms`;

export const starTimeNum = 300;
export const starTimeString = `${starTimeNum}ms`;

export const starDelayNum = skyTimeNum * 0.46;
export const starDelayString = `${starDelayNum}ms`;

export const flareAt = 0.4659; 
export const flareDelayNum = Math.round(sunTimeNum * flareAt);
const flareLengthNum = 320;
export const flareDurStr = `${flareLengthNum}ms`;
