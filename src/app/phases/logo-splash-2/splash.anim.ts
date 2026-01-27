import type { AnimSpec } from "hson-live/types";
import { SKY_DURstr, SUN_TIMEstr, STAR_DURstr, STAR_DELstr, STAR_DURnum, SHORT_FLASHstr, flareDurStr, flareDelayNum, CLOUD_DURnum, CLOUD_DURstr, CLOUD_BAND_LOOPstr, CLOUD_FADE_ONCEstr, CLOUD_LAYER_FADEstr, CLOUD_SUN_KISSstr } from "./splash.consts";


export const SKYanim = {
  name: "hson_sky",
  duration: SKY_DURstr,
  timingFunction: "linear",
  fillMode: "forwards",
};

export const GRADIENTanim = {
  name: "gradient-opacity",
  duration: SUN_TIMEstr,
  timingFunction: "linear",
  fillMode: "forwards",
};

export const STAR_MOVEanim: AnimSpec = {
  name: "hson_star_move",
  delay: "2000ms",
  duration: STAR_DURstr,
  timingFunction: "linear",
  iterationCount: "1",
  fillMode: "forwards",
};

export const STARSHINEanim: AnimSpec = {
  name: "hson_letter_starshine",
  delay: STAR_DELstr,
  duration: `${STAR_DURnum / 2}ms`,
  timingFunction: "linear",
  iterationCount: "1",
  fillMode: "none",
};

export const VERanim: AnimSpec = {
  name: "hson_ver",
  duration: SHORT_FLASHstr,
  delay: "2000ms",
  timingFunction: "ease-out",
  fillMode: "forwards",
};

export const NEON_FLASHanim = {
  name: "hson_letters",
  duration: SHORT_FLASHstr,
  timingFunction: "ease-in-out",
  fillMode: "forwards",
};

export const SUN_DISKanim = {
  name: "hson_sun_disk",
  duration: SUN_TIMEstr,
  timingFunction: "ease-in-out",
  fillMode: "forwards",
};

export const SUN_CARRIERanim = {
  name: "hson_sun_path",
  duration: SUN_TIMEstr,
  timingFunction: "linear",
  fillMode: "forwards",
};

export const FLAREanim: AnimSpec = {
  name: "hson_lens_flare",
  duration: flareDurStr,
  timingFunction: "cubic-bezier(0.2, 0.9, 0.2, 1)",
  delay: `${flareDelayNum}ms`,
  iterationCount: "1",
  fillMode: "both", // keep opacity=0 before, return to 0 after
};

const starAnimBase = {
  duration: STAR_DURstr,
  timingFunction: "linear",
  fillMode: "forwards",
  delay: STAR_DELstr,
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
  duration: `${STAR_DURnum * 2.5}ms`,
};
export const TAIL_B_ANIM = {
  name: "hson_star_tail_b",
  ...starAnimBase,
  duration: `${STAR_DURnum * 12.5}ms`,
};

export const TAIL_C_ANIM = {
  name: "hson_star_tail_c",
  ...starAnimBase,
  duration: `${STAR_DURnum * 23.5}ms`,
};

/*
 *    cloud animations 
 */

export const anim_CLOUD_LOOP = (i: number): AnimSpec => {
  // CHANGED: no Infinity; bottom slower, top faster (tune)
  const duration = CLOUD_DURnum * (1 + i / 0.18);
  return {
    name: CLOUD_BAND_LOOPstr,
    duration: `${Math.round(duration)}ms`,
    timingFunction: "linear",
    iterationCount: "infinite",
    fillMode: "both",
    delay: "0s",
  };
};

export const anim_CLOUD_FADE: AnimSpec = {
  name: CLOUD_FADE_ONCEstr,
  duration: CLOUD_DURstr,
  timingFunction: "linear",
  iterationCount: "1",
  fillMode: "forwards",
  delay: "0s",
};

export const anim_CLOUD_SUN_KISS = {
  name: CLOUD_SUN_KISSstr,
  duration: `${CLOUD_DURnum}ms`,
  timingFunction: "linear",
  iterationCount: "1",
  fillMode: "both",
}

export const anim_CLOUD_LAYER_FADE = (i = 0) => {
  return {
    name: CLOUD_LAYER_FADEstr,
    duration: CLOUD_DURstr,
    timingFunction: "linear",
    iterationCount: "1",
    fillMode: "forwards",
    delay: `${(i * 120).toFixed(0)}ms`, // tune: 60–180ms per layer
  }
}