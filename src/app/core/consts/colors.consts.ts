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
const TXTcol_MENU = OKLCH_FLEURS.greyLilac;
export const TXTcol_MAIN = OKLCH_VIBRANT.yellowSunStaringEyesBright;
const TXTcol_CODE = OKLCH_NEUTRALS.white;
export const TXTcol_GREY = OKLCH_NEUTRALS.steel;
// export const TXTcol_GREY = OKLCH_FLEURS.greyLilac;
export const TXTcol_ACTIVE = OKLCH_VIBRANT.redSignal;

export const WIDGETcol = TXTcol_MAIN;
/* markdown highlighting */

 const HEADERcol = OKLCH_FLEURS.greyLilac;
 const TOCcol = TXTcol_CODE;
 const CODE_ALTcol = OKLCH_NEUTRALS.frost;
 const CODE_PARENScol = OKLCH_VIBRANT.blueYves;
 const CODE_PARENS_INNERcol = OKLCH_VIBRANT.yellowBrass;
 const CONSTcol = OKLCH_FLEURS.oxidizedSky;
 const CODE_PUNCTcol = OKLCH_VIBRANT.violetIon;
 const CODE_QUOTEcol = OKLCH_VIBRANT.redInfra;
 const CODE_EQUALScol = OKLCH_FLEURS.limeTint;
 const COMMENTScol = ACID_WASH_OKLCH.fern;
 const CODE_BRACEcol = OKLCH_VIBRANT.violetIon;
const LISTcol = øHSON_COL.h;
/* misc markdown */


 const COPYRITEcol = TXTcol_GREY;
const URLcol = OKLCH_VIBRANT.blueYves;
 const COLONcol = OKLCH_FLEURS.blazeOrange;






const FADE_1col = OKLCH_NEUTRALS.silver;

 const GRAFFITIcol = set_alpha(TXTcol_MENU, 0.3);
 const REDcol = OKLCH_VIBRANT.redSignal;

export const _col_fmt = {
  json: øHSON_COL.h,
  html: øHSON_COL.o,
  hson: øHSON_COL.s
};





export const _cols = {
  backlo: deepBack,
  backhi: bckColor,
  graffiti: GRAFFITIcol,
  red: REDcol,
  fade: FADE_1col,
  toc: TOCcol,
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
    header: HEADERcol,
    widget: WIDGETcol,
    copyright: COPYRITEcol,
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
    url: URLcol,
    parensInner: CODE_PARENS_INNERcol,
    colon: COLONcol,
    const: CONSTcol,
    
  }
};
