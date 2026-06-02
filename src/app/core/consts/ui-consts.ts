// ui-consts.ts


import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { set_alpha } from "../helpers/color-helpers";
import { $gry_, ACID_WASH_RGBA, bckColor, bcklight, deepBack } from "./old-rgb.consts";
import { ACID_WASH_OKLCH, OKLCH_FOREST,/*  OKLCH_MUTED_PASTEL, OKLCH_SOFT_CORE_4, OKLCH_TERMINAL_4, OKLCH_WASHED_NEON_4  */} from "./oklch.consts";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "./oklch.consts";
import type { Fmt } from "../types/core.types";
import type { CssMap } from "hson-live/types";
import { CssManager } from "hson-live";

export const øWATERMARK_FMT_: Record<Fmt, string> = {
  json: "{JSON}",
  hson: "<HSON>",
  html: "<HTML/>",
} as const;

export const øHSON_COL = {
  // h: OKLCH_VIBRANT.blueElecky,
  h: OKLCH_FLEURS.oxidizedSky,
  s: OKLCH_VIBRANT.yellowBrass,
  o: OKLCH_VIBRANT.roseNeon2,
  n: OKLCH_VIBRANT.mossToxic,
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
  sansMain: "16px",
  main: "16px",
} as const;

export const CURRENT_OKLCHname = "oklch-demo-current";
export const CURRENT_OKLCH = CssManager.api().var.key(CURRENT_OKLCHname);

// CHANGED: named editable OKLCH theme vars. CURRENT_OKLCH is only the picker
// preview/current-edit color; these are durable page theme targets. Use `.get()`
// here because CSS maps need a stable `var(--name)` reference at module load.
// Use `CssManager.api().var.value(name)` only at runtime when reading a seeded value.
export const MAIN_OKLCHname = "hson-color-main-text";
export const MAIN_OKLCH = CssManager.api().var.key(MAIN_OKLCHname);

export const MENU_OKLCHname = "hson-color-menu-text";
export const MENU_OKLCH = CssManager.api().var.key(MENU_OKLCHname);

export const GRAF_OKLCHname = "hson-color-graffiti";
export const GRAF_OKLCH = CssManager.api().var.key(GRAF_OKLCHname);

export const MOTE_OKLCHname = "hson-color-motes";
export const MOTE_OKLCH = CssManager.api().var.key(MOTE_OKLCHname);

// CHANGED: concrete color constants remain concrete defaults. Do not point these
// at editable CSS vars; helpers like set_alpha() need real color strings.
// Dynamic page CSS should opt into MAIN_OKLCH / MENU_OKLCH / SUBMENU_OKLCH / BACK_OKLCH.
// export const TXTcol_MENU = OKLCH_VIBRANT.blueCobalt;
export const TXTcol_MENU = OKLCH_FLEURS.greyLilac;
export const TXTcol_MAIN = OKLCH_VIBRANT.yellowSunStaringEyesBright;
export const TXTcol_CODE = OKLCH_VIBRANT.blueCobalt;
export const TXTcol_GREY = OKLCH_NEUTRALS.steel;
// export const TXTcol_GREY = OKLCH_FLEURS.greyLilac;
export const TXTcol_ACTIVE = OKLCH_VIBRANT.redSignal;

export const WIDGETcol = TXTcol_MAIN;

/* markdown highlighting */
export const HEADERcol = OKLCH_FLEURS.greyLilac;
export const TOCcol = TXTcol_CODE;

/* code markdown */
export const CODE_ALTcol = OKLCH_FLEURS.oxidizedSky;
export const CODE_PARENScol =OKLCH_VIBRANT.blueYves;
export const CODE_PARENS_INNERcol = OKLCH_VIBRANT.yellowBrass;
export const CONSTcol = OKLCH_NEUTRALS.violetTint
export const CODE_PUNCTcol = ACID_WASH_OKLCH.ember;
export const CODE_QUOTEcol =  OKLCH_VIBRANT.redInfra;
export const CODE_EQUALScol = OKLCH_FLEURS.limeTint;
export const COMMENTScol = ACID_WASH_OKLCH.fern;
export const CODE_BRACEcol = OKLCH_VIBRANT.violetIon;
export const LISTcol = øHSON_COL.n;


/* misc markdown */
export const COPYRITEcol = TXTcol_GREY;
export const URLcol = øHSON_COL.h;


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

export const GRAFFITIcol = set_alpha(øHSON_COL.o, 0.3);
export const øCOLS = {
  backlo: deepBack,
  backhi: bckColor,
  bcklight,
};
