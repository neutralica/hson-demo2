// ui-consts.ts


import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { set_alpha } from "../helpers/color-helpers";
import { $gry_, ACID_WASH_RGBA, bckColor, bcklight, deepBack } from "./colors.consts";
import { ACID_WASH_OKLCH, OKLCH_SOFT_CORE_4, OKLCH_TERMINAL_4, OKLCH_WASHED_NEON_4 } from "./oklch";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "./oklch";
import type { Fmt } from "../types/core.types";
import type { CssMap } from "hson-live/types";

export const øWATERMARK_FMT_: Record<Fmt, string> = {
  json: "{JSON}",
  hson: "<HSON>",
  html: "<HTML/>",
} as const;

export const øHSON_COL = {
  h: OKLCH_VIBRANT.blueElecky,
  s: OKLCH_VIBRANT.yellowSodium,
  o: OKLCH_VIBRANT.roseNeon,
  n: OKLCH_VIBRANT.mintIce,
};

export const øCOL_FOR_FMT_ = {
  json:øHSON_COL.h,
  html: øHSON_COL.o,
  hson: øHSON_COL.s
};

export const øfontWeight = {
  main: "100",
  fat: "900",
}

export const øfontSize = {
  smol: "12px",
  sansMain: "1rem",
  main: "1rem",
} as const;


// export const TXTcol_MENU = OKLCH_VIBRANT.blueCobalt;
export const TXTcol_MENU = OKLCH_FLEURS.violet;
export const TXTcol_MAIN = OKLCH_VIBRANT.yellowSunStaringEyesBright;
export const TXTcol_CODE = OKLCH_VIBRANT.blueCobalt;
export const TXTcol_ALT = OKLCH_NEUTRALS.steel;
export const TXTcol_REAL = OKLCH_NEUTRALS.steel;



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
export const COPYRITEcol = $gry_.dim;
export const URLcol = OKLCH_VIBRANT.blueHorizon;


export const SYS_SMOLfont = /* "'IBM Plex Sans', sans-serif"; // */ "'DM Mono', Monaco, monospace";
export const SYS_MONOfont = "'DM Mono', Monaco, monospace";
export const SYS_SANSfont =  /*"'IBM Plex Sans', sans-serif"; // */ "'DM Mono', Monaco, monospace";


// export const $CODE_FONT_SIZE = øTXT.main;

export const GRID_GAPstr = "2px";
export const $SIDEBAR_WIDTH = "15vw";
export const $CONTENT_WIDTH = "90ch";

/* queryable consts */
export const ABOUT_ROOT_ID = "about-root";
export const $PANEL_HIDDEN = 'panel-hidden';




export const REDcol = OKLCH_VIBRANT.redSignal;
export const BLUELIKEcol = øHSON_COL.h;
export const GREENLIKEcol = øHSON_COL.n;
export const YELLOWLIKEcol = øHSON_COL.s;
export const PINKLIKEcol = øHSON_COL.o;

export const FADE_1col = OKLCH_NEUTRALS.silver;
export const $MENU_SHADOW = "1px 1px 25px ";
export const GRAFFITIcol = set_alpha(ACID_WASH_RGBA.mutedViolet, 0.2);

export const øCOLS = {
  backlo: deepBack,
  backhi: bckColor,
  bcklight,
};

