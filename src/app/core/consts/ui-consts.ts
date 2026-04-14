// ui-consts.ts

import { hson, LiveTree } from "hson-live";
import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { set_alpha } from "../helpers/color-helpers";
import { $gry_, ACID_WASH_OKLCH, ACID_WASH_RGBA, bckColor, bcklight, deepBack } from "./colors.consts";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "./vibrant-oklch";
import type { CssMap } from "hson-live/types";
import type { Fmt } from "../types/core.types";

export const HSON_COLOR_ = {
  h: ACID_WASH_RGBA.softBlue,
  s: ACID_WASH_OKLCH.amber,
  o: ACID_WASH_OKLCH.smokeRose,
  n: ACID_WASH_OKLCH.fern,
};

export const COLOR_FOR_FMT_ = {
    json: OKLCH_FLEURS.fadedGold,
    html: OKLCH_FLEURS.electricIris,
    hson: OKLCH_FLEURS.orchidAsh
  };

export const _TXT = {
    hsonWordMarkMain: "4.375rem", // 70px
    wordMobile: "2.5rem" /*  "2.5rem" */,         // 40px
    heading: "1.75rem"/*  "1.625rem" */,          // 26px
    subhead: "1.25rem"/*  "1.375rem" */,          // 22px
    main: "1rem"/*  "1.25rem" */,             // 20??px
    mid: "1rem"/*  "1rem" */,                // 16px
    unter: "0.75rem" /*  "0.875rem" */,            // 14px
    reg: "0.75rem" /*  "0.75rem" */,               // 12px
    smol: "0.65rem" /*  "0.625rem" */,             // 10px
    wee: "0.55rem" /*  "0.5rem" */,                // 8px
} as const;


const fullPanelCss: CssMap = { height: "100%", width: "100%", pointerEvent: "none" };


export const CODE_PARENScol = ACID_WASH_OKLCH.straw;
export const CODE_PARENS_INNERcol = ACID_WASH_OKLCH.bruisedPlum;
export const URLcol = ACID_WASH_RGBA.softBlue;
export const COPYRITEcol = $gry_.dimmer;
export const HEADERcol = ACID_WASH_OKLCH.moss;
export const CODE_PUNCTcol = ACID_WASH_OKLCH.ember;
export const TOCcol = ACID_WASH_OKLCH.moss;
export const COMMENTScol = ACID_WASH_OKLCH.fern;
export const CODQ_QUOTEcol = ACID_WASH_OKLCH.smokeRose;
export const CODE_EQUALScol = OKLCH_FLEURS.brass;


// export const TXTcol_MENU = CYBERPUNK_2060_OKLCH.mintIce;
export const TXTcol_MENU = ACID_WASH_RGBA.softBlue;
export const TXTcol_MAIN = OKLCH_NEUTRALS.paper;
export const TXTcol_CODE = OKLCH_VIBRANT.blueGlacier;
export const TXTcol_ALT = OKLCH_NEUTRALS.silver;
export const TXTcol_ALT_ALT = OKLCH_FLEURS.navyCore;

export const GRAFFITIcol = set_alpha(ACID_WASH_RGBA.mutedViolet, 0.2);
export const MONO_MAINfont = "Monaco, monospace";
export const SANS_MAINfont = ""
export const GRID_GAPstr = "2px";
export const $CODE_FONT_SIZE = _TXT.reg;
export const $PANEL_HIDDEN = 'panel-hidden';

// either do this or don't:
export const ABOUT_ROOT_ID = "about-root";

export const WATERMARK_FMT_: Record<Fmt, string> = {
  json: "{JSON}",
  hson: "<HSON>",
  html: "<HTML/>",
} as const;



export const REDLIKEcol = OKLCH_VIBRANT.redSignal;
export const BLUELIKEcol = OKLCH_VIBRANT.blueCobalt;
export const GREENLIKEcol = OKLCH_VIBRANT.mossToxic;
export const YELLOWLIKEcol = ACID_WASH_OKLCH.ember;

export const FADE_1col = OKLCH_NEUTRALS.silver;

export const _COLS = {
  bckgd: bckColor,
  bckdeep: deepBack,
  bcklight,
};

