

// CHANGED: background-position MUST be a comma-separated list matching layer count.

import type { KeyframesInput } from "../../../../hson-live/dist/types-consts/keyframes.types";

// CHANGED: use exact multiples of each layer’s backgroundSize to avoid “jump seams”.
export const KF_STIPPLE_BGPOS_ALL: KeyframesInput = {
  name: "stipple_bgpos_all",
  steps: {
    "0%": {
      backgroundPosition: [
        "0px 0px", // layer 0 (53x19)
        "0px 0px", // layer 1 (41x37)
        "0px 0px", // layer 2 (49x41)
      ].join(", "),
    },
    "100%": {
      backgroundPosition: [
        "-530px 190px",  // 10 * (53,19)
        "-369px -296px", // 9 * 41, 8 * 37
        "-343px 205px",  // 7 * 49, 5 * 41
      ].join(", "),
    },
  },
} as const;