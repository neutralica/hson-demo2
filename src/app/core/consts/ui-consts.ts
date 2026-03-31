// ui-consts.ts

import { set_alpha } from "../helpers/color-helpers";
import { ACID_WASH_OKLCH, ACID_WASH_RGBA } from "./colors.consts";


export const MENU_TEXT_COL = ACID_WASH_OKLCH.bruisedPlum;
export const GRAFFITI_COLOR = set_alpha(ACID_WASH_RGBA.mutedViolet, 0.4);
export const MENU_FONT = "Monaco, monospace";

export const $GRID_GAPstr = "2px";

export const $PANEL_HIDDEN = 'panel-hidden';
export const ABOUT_ROOT_ID = "about-root";

export const $txt_ = {
    hsonWordMarkMain: "4.375rem", // 70px
    wordMobile: "2.5rem" /*  "2.5rem" */,         // 40px
    heading: "2.5rem"/*  "1.625rem" */,          // 26px
    subhead: "1.5rem"/*  "1.375rem" */,          // 22px
    main: "1.25rem"/*  "1.25rem" */,             // 20??px
    mid: "1rem"/*  "1rem" */,                // 16px
    unter: "1rem" /*  "0.875rem" */,            // 14px
    reg: "1rem" /*  "0.75rem" */,               // 12px
    smol: "0.75rem" /*  "0.625rem" */,             // 10px
    wee: "0.75rem" /*  "0.5rem" */,                // 8px
} as const;

