// stipple.kf.ts

import type { KeyframesInput } from "../../../../hson-live/dist/types-consts/keyframes.types";

export const KF_STIPPLE_BGPOS_ALL: KeyframesInput = {
  name: "stipple_bgpos_all",
  steps: {
    "0%": {
      backgroundPosition: [
        "0px 0px", // 53x19
        "0px 0px", // 41x37
        "0px 0px", // 49x41
        "0px 0px", // 53x67
      ].join(", "),
    },
    "100%": {
      // tile-aligned => seamless
      backgroundPosition: [
        "-530px 190px",   // 53*10, 19*10
        "-369px -296px",  // 41*9,  37*8
        "-343px 205px",   // 49*7,  41*5
        "-318px -201px",  // 53*6,  67*3
      ].join(", "),
    },
  },
} as const;

export const KF_STIPPLE_DRIFT_0 = {
  name: "stipple_drift_0",
  steps: {
    "0%": { backgroundPosition: "0px 0px" },
    // bgSize: 53px 19px  ->  10x = 530px, 10x = 190px
    "100%": { backgroundPosition: "530px 190px" }, // left + down
  },
} as const;

export const KF_STIPPLE_DRIFT_1 = {
  name: "stipple_drift_1",
  steps: {
    "0%": { backgroundPosition: "0px 0px" },
    // bgSize: 41px 37px  ->  9x = 369px, 8x = 296px
    "100%": { backgroundPosition: "-369px -296px" }, // left + up
  },
} as const;

export const KF_STIPPLE_DRIFT_2 = {
  name: "stipple_drift_2",
  steps: {
    "0%": { backgroundPosition: "0px 0px" },
    // bgSize: 49px 41px  ->  7x = 343px, 5x = 205px
    "100%": { backgroundPosition: "343px 205px" }, // left + down
  },
} as const;

export const KF_STIPPLE_DRIFT_3 = {
  name: "stipple_drift_3",
  steps: {
    "0%": { backgroundPosition: "0px 0px" },
    // bgSize: 53px 67px  ->  6x = 318px, 3x = 201px
    "100%": { backgroundPosition: "-318px -201px" }, // left + up
  },
} as const;

export const KF_STIPPLE_ROTATE_SLOW: KeyframesInput = {
  name: "stipple_rotate_slow",
  steps: {
    "0%":   { transform: "rotate(0deg) scale(1.02)" },
    "100%": { transform: "rotate(360deg) scale(1.02)" },
  },
} as const;