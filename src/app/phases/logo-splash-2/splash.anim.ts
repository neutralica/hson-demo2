import type { AnimSpec } from "hson-live/types";
import { skyTimeString, sunTimeString, starTimeString, starDelayString, starTimeNum, shortFlashString, flareDurStr, flareDelayNum, cloudTimeNum, cloudtimeStr } from "./splash.consts";


export const SKY_ANIM = {
  name: "hson_sky",
  duration: skyTimeString,
  timingFunction: "ease-in-out",
  fillMode: "forwards",
};

export const GRADIENT_ANIM = {
  name: "gradient-opacity",
  duration: sunTimeString,
  timingFunction: "ease-in-out",
  fillMode: "forwards",
};

export const STAR_MOVE_ANIM: AnimSpec = {
  name: "hson_star_move",
  delay: "2000ms",
  duration: starTimeString,
  timingFunction: "linear",
  iterationCount: "1",
  fillMode: "forwards",
};

export const STARSHINE_ANIM: AnimSpec = {
  name: "hson_letter_starshine",
  delay: starDelayString,
  duration: `${starTimeNum / 2}ms`,
  timingFunction: "linear",
  iterationCount: "1",
  fillMode: "none",
};

export const VER_ANIM: AnimSpec = {
  name: "hson_ver",
  duration: shortFlashString,
  delay: "2000ms",
  timingFunction: "ease-out",
  fillMode: "forwards",
};

export const NEON_FLASH = {
  name: "hson_letters",
  duration: shortFlashString,
  timingFunction: "ease-in-out",
  fillMode: "forwards",
};

export const SUN_DISK_ANIM = {
  name: "hson_sun_disk",
  duration: sunTimeString,
  timingFunction: "ease-in-out",
  fillMode: "forwards",
};

export const SUN_CARRIER_ANIM = {
  name: "hson_sun_path",
  duration: sunTimeString,
  timingFunction: "linear",
  fillMode: "forwards",
};

export const FLARE_ANIM: AnimSpec = {
  name: "hson_lens_flare",
  duration: flareDurStr,
  timingFunction: "cubic-bezier(0.2, 0.9, 0.2, 1)",
  delay: `${flareDelayNum}ms`,
  iterationCount: "1",
  fillMode: "both", // keep opacity=0 before, return to 0 after
};
const starAnimBase = {
  duration: starTimeString,
  timingFunction: "linear",
  fillMode: "forwards",
  delay: starDelayString,
  iterationCount: "1",
};

export const STAR_CARRIER_ANIM = {
  name: "hson_star_move",
  ...starAnimBase,
};

export const STAR_HEAD_ANIM = {
  name: "hson_star_head",
  ...starAnimBase
};

export const TAIL_A_ANIM = {
  name: "hson_star_tail_a",
  ...starAnimBase,
  duration: `${starTimeNum * 2.5}ms`,
};
export const TAIL_B_ANIM = {
  name: "hson_star_tail_b",
  ...starAnimBase,
  duration: `${starTimeNum * 12.5}ms`,
};

export const TAIL_C_ANIM = {
  name: "hson_star_tail_c",
  ...starAnimBase,
  duration: `${starTimeNum * 23.5}ms`,
};
// Helper: parallax duration that never divides by 0

export const CLOUD_BAND_ANIM = (i: number): AnimSpec => {
  // CHANGED: no Infinity; bottom slower, top faster (tune)
  const duration = cloudTimeNum * (1 + i / 0.18);
  return {
    name: "cloud-band-loop",
    duration: `${Math.round(duration)}ms`,
    timingFunction: "linear",
    iterationCount: "infinite",
    fillMode: "both",
    delay: "0s",
  };
};
export const CLOUD_FADE_ANIM: AnimSpec = {
  name: "cloud-fade-once",
  duration: cloudtimeStr,
  timingFunction: "linear",
  iterationCount: "1",
  fillMode: "forwards",
  delay: "0s",
};
