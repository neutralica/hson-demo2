import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { set_alpha } from "../helpers/color-helpers";
import { OKLCH_VIBRANT, OKLCH_NEUTRALS, ACID_WASH_OKLCH } from "./oklch.consts";
import { deepBack, bckColor } from "./old-rgb.consts";



export const øHSON_COL = {
  // h: OKLCH_VIBRANT.blueElecky,
  h: OKLCH_FLEURS.oxidizedSky,
  s: OKLCH_VIBRANT.yellowBrass,
  o: OKLCH_VIBRANT.roseNeon2,
  n: OKLCH_VIBRANT.mossToxic,
};
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
export const CODE_PARENScol = OKLCH_VIBRANT.blueYves;
export const CODE_PARENS_INNERcol = OKLCH_VIBRANT.yellowBrass;
export const CONSTcol = OKLCH_NEUTRALS.violetTint;
export const CODE_PUNCTcol = ACID_WASH_OKLCH.ember;
export const CODE_QUOTEcol = OKLCH_VIBRANT.redInfra;
export const CODE_EQUALScol = OKLCH_FLEURS.limeTint;
export const COMMENTScol = ACID_WASH_OKLCH.fern;
export const CODE_BRACEcol = OKLCH_VIBRANT.violetIon;
export const LISTcol = øHSON_COL.h;
/* misc markdown */


export const COPYRITEcol = TXTcol_GREY;
export const URLcol = øHSON_COL.h;
export const COLONcol = OKLCH_FLEURS.blazeOrange;






export const FADE_1col = OKLCH_NEUTRALS.silver;
export const $MENU_SHADOW = "1px 1px 25px ";

export const GRAFFITIcol = set_alpha(TXTcol_MENU, 0.3);
export const REDcol = OKLCH_VIBRANT.redSignal;
export const BLUELIKEcol = øHSON_COL.h;
export const GREENLIKEcol = øHSON_COL.n;
export const YELLOWLIKEcol = øHSON_COL.s;
export const PINKLIKEcol = øHSON_COL.o;

export const øCOL_FOR_FMT_ = {
  json: øHSON_COL.h,
  html: øHSON_COL.o,
  hson: øHSON_COL.s
};

export const _COLS = {
  backlo: deepBack,
  backhi: bckColor,
  graffiti: GRAFFITIcol,
  red: REDcol,
  hson: {
    h: øHSON_COL.h,
    s: øHSON_COL.s,
    o: øHSON_COL.o,
    n: øHSON_COL.n,
  },

  txt: {
    main: TXTcol_MAIN,
    menu: TXTcol_MENU,
    grey: TXTcol_GREY,
    active: TXTcol_ACTIVE,
    code: TXTcol_CODE,
    list: LISTcol,
    url: URLcol,
    header: HEADERcol,
  },
  fmt: {
    json: øHSON_COL.h,
    html: øHSON_COL.o,
    hson: øHSON_COL.s
  },
  code: {
    alt: CODE_ALTcol,
    brace: CODE_BRACEcol,
    dot: CODE_PUNCTcol,
    equals: CODE_EQUALScol,
    parens: CODE_PARENScol,
    quotes: CODE_QUOTEcol,
    comment: COMMENTScol,
    colon: COLONcol,
  }
};
