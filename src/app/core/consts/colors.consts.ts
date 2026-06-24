
import { OKLCH_FLEURS } from "../../demos/fleurs/fleurs.consts";
import { set_alpha } from "../helpers/color-helpers";
import { OKLCH_VIBRANT, OKLCH_NEUTRALS, ACID_WASH_OKLCH, OKLCH_ACID_WASHED } from "./oklch.consts";
// import { GRAF_COLname, MAIN_COLname, MENU_COLname, MOTE_COLname } from "./ui-consts";

export type ColorVarSource = Readonly<{
  path: string;
  varName: string;
  value: string;
}>;

type ColorTree = string | ColorTreeBranch;

interface ColorTreeBranch {
  readonly [key: string]: ColorTree;
}

type ColorVarRefs<T> = T extends string
  ? string
  : T extends Readonly<Record<string, unknown>>
  ? { readonly [K in keyof T]: ColorVarRefs<T[K]> }
  : never;

// const COLOR_VAR_NAME_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
//   "txt.main": MAIN_COLname,
//   "txt.menu": MENU_COLname,
//   graffiti: GRAF_COLname,
//   motes: MOTE_COLname,
// });

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function color_var_name_for_path(path: string): string {
  return `--hson-color-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}
function css_var_ref_name(varName: string): string {
  return varName.startsWith("--") ? varName : `--${varName}`;
}

function color_var_ref_for_path(path: string, fallback: string): string {
  return `var(${css_var_ref_name(color_var_name_for_path(path))}, ${fallback})`;
}

function make_color_var_refs<T extends ColorTree>(value: T, prefix = ""): ColorVarRefs<T> {
  if (typeof value === "string") return color_var_ref_for_path(prefix, value) as ColorVarRefs<T>;

  const out: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out[key] = make_color_var_refs(child as ColorTree, path);
  }

  return out as ColorVarRefs<T>;
}

function collect_color_var_sources(value: unknown, prefix = ""): ColorVarSource[] {
  if (typeof value === "string") {
    return [{ path: prefix, varName: color_var_name_for_path(prefix), value }];
  }

  if (!isRecord(value)) return [];

  const sources: ColorVarSource[] = [];

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    sources.push(...collect_color_var_sources(child, path));
  }

  return sources;
}
// oklch(0.1831 0.018 248.84)
const backgroundL = .183;
const backgroundC = 0.018;
const backgroundH = 249;
export const bcklight = `oklch(0.2238 0.0256 249.03)`;
export const bckColor = bcklight;
export const deepBack = "oklch(0.1303 0.0073 285.34)";

export const backgroundLCH = {
  l: backgroundL,
  c: backgroundC,
  h: backgroundH,
};
export const CLOUDcol = `oklch( ${backgroundLCH.l}${backgroundLCH.c}${backgroundLCH.h} / 1)`;

const _HSON_COL = {
  // h: OKLCH_VIBRANT.blueElecky,
  h: OKLCH_FLEURS.oxidizedSky,
  s: OKLCH_VIBRANT.yellowBrass,
  o: OKLCH_VIBRANT.roseNeon2,
  n: OKLCH_VIBRANT.mintIce,
};
const TOCcol = _HSON_COL.h;
const TXTcol_MENU = OKLCH_FLEURS.greyLilac;
const TXTcol_MAIN = OKLCH_VIBRANT.yellowSunStaringEyesBright;
const TXTcol_CODE = OKLCH_NEUTRALS.white;
const TXTcol_GREY = OKLCH_NEUTRALS.steel;
const COPYRITEcol = TXTcol_GREY;
const TXTcol_ACTIVE = OKLCH_VIBRANT.redSignal;
const WIDGETcol = TXTcol_MAIN;
const HEADERcol = OKLCH_FLEURS.greyLilac;
// export const TXTcol_GREY = OKLCH_FLEURS.greyLilac;

/* markdown highlighting */

const CODE_ALTcol = OKLCH_NEUTRALS.frost2;
const CODE_PARENScol = OKLCH_ACID_WASHED.orchid;
const CODE_PARENS_INNERcol = OKLCH_VIBRANT.yellowBrass;
const CONSTcol = OKLCH_FLEURS.oxidizedSky;
const CODE_PUNCTcol = OKLCH_VIBRANT.roseNeon2;
const CODE_QUOTEcol = OKLCH_VIBRANT.orangeEmber;
const CODE_EQUALScol = OKLCH_FLEURS.limeTint;
const COMMENTScol = ACID_WASH_OKLCH.fern;
const CODE_BRACEcol = OKLCH_VIBRANT.violetIon;
const LISTcol = _HSON_COL.h;
/* misc markdown */


const URLcol = OKLCH_VIBRANT.blueYves;
const COLONcol = OKLCH_VIBRANT.yellowBrass;
const GRADIENTcol = OKLCH_VIBRANT.redBrick;
const GRAFFITIcol = OKLCH_VIBRANT.royalBlueGraffiti;
const REDcol = OKLCH_VIBRANT.redSignal;
const FADE_1col = OKLCH_NEUTRALS.silver;

const MOTEScol = set_alpha(OKLCH_VIBRANT.orangeEmber, 1);

export const _colorVals = {
  backlo: deepBack,
  backhi: bckColor,
  graffiti: GRAFFITIcol,
  gradient: GRADIENTcol,
  motes: MOTEScol,
  chrome: FADE_1col,
  hson: {
    h: _HSON_COL.h,
    s: _HSON_COL.s,
    o: _HSON_COL.o,
    n: _HSON_COL.n,
  },
  toc: TOCcol,
  bluelike: _HSON_COL.h,
  yellowlike: _HSON_COL.s,
  pinklike: _HSON_COL.o,
  greenlike: _HSON_COL.n,
  red: REDcol,

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
    json: _HSON_COL.h,
    html: _HSON_COL.o,
    hson: _HSON_COL.s
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

export const COLOR_VAR_SOURCES: readonly ColorVarSource[] = Object.freeze(
  collect_color_var_sources(_colorVals),
);

export const _colors = make_color_var_refs(_colorVals); 



