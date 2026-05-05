// ui-consts.ts


import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { set_alpha } from "../helpers/color-helpers";
import { $gry_, ACID_WASH_OKLCH, ACID_WASH_RGBA, bckColor, bcklight, deepBack, OKLCH_SOFT_CORE_4, OKLCH_TERMINAL_4, OKLCH_WASHED_NEON_4 } from "./colors.consts";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "./vibrant-oklch";
import type { Fmt } from "../types/core.types";

export const HSON_COLOR_ = {
  h: OKLCH_VIBRANT.blueElecky,
  s: OKLCH_VIBRANT.yellowSodium,
  o: OKLCH_VIBRANT.roseNeon,
  n: OKLCH_VIBRANT.mintIce,
};

export const COLOR_FOR_FMT_ = {
  json: OKLCH_FLEURS.fadedGold,
  html: OKLCH_FLEURS.electricIris,
  hson: OKLCH_FLEURS.orchidAsh
};

export const _TXT = {
  hsonWordMarkMain: "4.375rem", 
  wordMobile: "2.5rem",
  heading: "1.75rem",
  subhead: "1.25rem",
  main: "1rem",
  mid: "1rem",
  unter: "0.75rem",
  reg: "0.75rem" ,
  smol: "0.65rem",
  wee: "0.55rem" ,
} as const;


// export const TXTcol_MENU = OKLCH_VIBRANT.blueCobalt;
export const TXTcol_MENU = HSON_COLOR_.h;
export const TXTcol_MAIN = OKLCH_NEUTRALS.paper;
export const TXTcol_CODE = OKLCH_VIBRANT.blueGlacier;
export const TXTcol_ALT = OKLCH_FLEURS.fadedGold;
export const TXTcol_ALT_ALT = OKLCH_FLEURS.navyCore;

export const CODE_PARENScol = ACID_WASH_OKLCH.straw;
export const CODE_PARENS_INNERcol = ACID_WASH_OKLCH.bruisedPlum;
export const URLcol = ACID_WASH_RGBA.softBlue;
export const COPYRITEcol = $gry_.dimmer;
export const HEADERcol = OKLCH_VIBRANT.mintIce;
export const CODE_PUNCTcol = ACID_WASH_OKLCH.ember;
export const TOCcol = OKLCH_VIBRANT.mintIce;
export const COMMENTScol = ACID_WASH_OKLCH.fern;
export const CODQ_QUOTEcol = ACID_WASH_OKLCH.smokeRose;
export const CODE_EQUALScol = OKLCH_FLEURS.brass;



export const GRAFFITIcol = set_alpha(ACID_WASH_RGBA.mutedViolet, 0.2);
export const MONO_MAINfont = "'Inconsolata', Monaco, monospace";
export const SANS_MAINfont = ""
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



export const REDLIKEcol = OKLCH_VIBRANT.redSignal;
export const BLUELIKEcol = HSON_COLOR_.h;
export const GREENLIKEcol = OKLCH_VIBRANT.mossToxic;
export const YELLOWLIKEcol = ACID_WASH_OKLCH.ember;

export const FADE_1col = OKLCH_NEUTRALS.silver;

export const _COLS = {
  backlo: deepBack,
  backhi: bckColor,
  bcklight,
};

