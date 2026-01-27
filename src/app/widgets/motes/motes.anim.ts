import type { AnimSpec } from "hson-live/types";
import { $MOTE_RISE, $MOTE_SPIN, $MOTE_DIE } from "./motes";

// ADDED: animation specs (single responsibility)
export const ANIM_RISE: AnimSpec = {
    name: $MOTE_RISE,
    duration: "10s", // CHANGED: placeholder; per-mote overrides set inline
    timingFunction: "linear",
    iterationCount: "1", // CHANGED: runs once so animationend fires
    fillMode: "forwards",
    delay: "0s",
};
export const ANIM_SPIN: AnimSpec = {
    name: $MOTE_SPIN,
    duration: "4s", // placeholder; per-mote overrides inline
    timingFunction: "linear",
    iterationCount: "infinite",
    fillMode: "both",
    delay: "0s",
};
const ANIM_DIE: AnimSpec = {
    name: $MOTE_DIE,
    duration: "350ms",
    timingFunction: "linear",
    iterationCount: "1",
    fillMode: "forwards",
    delay: "0s",
};
