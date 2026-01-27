import type { AnimSpec, KeyframesInput } from "hson-live/types";
import { $MOTE_DIE, $MOTE_RISE, $MOTE_SPIN } from "./motes";


export const KF_MOTE_DIE: KeyframesInput = {
    name: $MOTE_DIE,
    steps: {
        "0%": { "--alpha": "1" },
        "100%": { "--alpha": "0" },
    }
}

export const KF_MOTE_SPIN = {
    name: $MOTE_SPIN,
    steps: {
        "from": { transform: "rotate(0deg)" },
        "to": { transform: "rotate(360deg)" },
    }
}

export const KF_MOTE_RISE = {
    name: $MOTE_RISE,
    steps: {
        "from": { "--ty": "0px" },
        "to": { "--ty": "-110vh" }, // CHANGED: overshoot so end is off-screen
    }
}