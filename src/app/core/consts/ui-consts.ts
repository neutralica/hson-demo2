// ui-consts.ts


import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { set_alpha } from "../helpers/color-helpers";
import { $gry_, ACID_WASH_RGBA, bckColor, bcklight, deepBack } from "./colors.consts";
import { ACID_WASH_OKLCH, OKLCH_SOFT_CORE_4, OKLCH_TERMINAL_4, OKLCH_WASHED_NEON_4 } from "./oklch";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "./oklch";
import type { Fmt } from "../types/core.types";
import type { CssMap } from "hson-live/types";

export const HSON_COLOR_ = {
  h: OKLCH_VIBRANT.blueElecky,
  s: OKLCH_VIBRANT.yellowSodium,
  o: OKLCH_VIBRANT.roseNeon,
  n: OKLCH_VIBRANT.mintIce,
};

export const COLOR_FOR_FMT_ = {
  json:HSON_COLOR_.h,
  html: HSON_COLOR_.o,
  hson: HSON_COLOR_.h
};

export const _TXT = {
  // hsonWordMarkMain: "4.375rem", 
  // wordMobile: "2.5rem",
  // heading: "1.75rem",
  // subhead: "1.25rem",
  // main: "1rem",
  // mid: "1rem",
  // unter: "0.75rem",
  // reg: "0.75rem" ,
  // smol: "0.65rem",
  // wee: "0.55rem" ,
  smol: "14px",
  sansMain: "1.1rem",
  main: "1.1rem",
} as const;


// export const TXTcol_MENU = OKLCH_VIBRANT.blueCobalt;
export const TXTcol_MENU = OKLCH_FLEURS.electricCyan;
export const TXTcol_MAIN = OKLCH_VIBRANT.yellowSunStaringEyesBright;
export const TXTcol_CODE = OKLCH_VIBRANT.blueCobalt;
export const TXTcol_ALT = OKLCH_FLEURS.electricCyan;



/* markdown highlighting */
export const HEADERcol = OKLCH_FLEURS.greyLilac;
export const TOCcol = OKLCH_VIBRANT.mintIce;

/* code markdown */
export const CODE_PARENScol = ACID_WASH_OKLCH.amber;
export const CODE_PARENS_INNERcol = OKLCH_VIBRANT.blueHorizon;
export const CODE_PUNCTcol = ACID_WASH_OKLCH.ember;
export const CODE_QUOTEcol = ACID_WASH_OKLCH.smokeRose;
export const CODE_EQUALScol = OKLCH_FLEURS.limeTint;
export const COMMENTScol = ACID_WASH_OKLCH.fern;
export const CODE_BRACEcol = OKLCH_VIBRANT.violetIon;
export const LISTcol = OKLCH_FLEURS.greyLilac;


/* misc markdown */
export const COPYRITEcol = $gry_.dimmer;
export const URLcol = ACID_WASH_RGBA.softBlue;


export const SYS_SMOLfont = "'IBM Plex Sans', sans-serif";
// export const SYS_SMOLfont = "'Tiny5', Trebuchet MS"
export const SYS_MONOfont = "'Inconsolata', Monaco, monospace";
export const SYS_SANSfont = "'IBM Plex Sans', sans-serif";


export const GRID_GAPstr = "2px";
export const $CODE_FONT_SIZE = _TXT.main;
export const $PANEL_HIDDEN = 'panel-hidden';

// either do this or don't:
export const ABOUT_ROOT_ID = "about-root";

export const WATERMARK_FMT_: Record<Fmt, string> = {
  json: "{JSON}",
  hson: "<HSON>",
  html: "<HTML/>",
} as const;



export const REDcol = OKLCH_VIBRANT.redSignal;
export const BLUELIKEcol = HSON_COLOR_.h;
export const GREENLIKEcol = HSON_COLOR_.n;
export const YELLOWLIKEcol = HSON_COLOR_.s;
export const PINKLIKEcol = HSON_COLOR_.o;

export const FADE_1col = OKLCH_NEUTRALS.silver;

export const GRAFFITIcol = set_alpha(ACID_WASH_RGBA.mutedViolet, 0.2);

export const _COLS = {
  backlo: deepBack,
  backhi: bckColor,
  bcklight,
};

