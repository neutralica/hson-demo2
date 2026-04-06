// ui-consts.ts

import { hson, LiveTree } from "hson-live";
import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";
import { set_alpha } from "../helpers/color-helpers";
import { $gry_, ACID_WASH_OKLCH, ACID_WASH_RGBA, CYBERPUNK_2060_NEUTRALS, CYBERPUNK_2060_OKLCH } from "./colors.consts";
import type { CssMap } from "hson-live/types";
import type { Fmt } from "../types/core.types";

export const HSON_COLOR_ = {
  h: ACID_WASH_RGBA.softBlue,
  s: ACID_WASH_OKLCH.amber,
  o: ACID_WASH_OKLCH.smokeRose,
  n: ACID_WASH_OKLCH.fern,
};


export const REDLIKEcol = CYBERPUNK_2060_OKLCH.redSignal;
export const BLUELIKEcol = CYBERPUNK_2060_OKLCH.blueCobalt;
export const GREENLIKEcol = CYBERPUNK_2060_OKLCH.mossToxic;
export const YELLOWLIKEcol = ACID_WASH_OKLCH.ember;

export const FADE_1col = CYBERPUNK_2060_NEUTRALS.silver;


const fullPanelCss: CssMap = { height: "100%", width: "100%", pointerEvent: "none" };


export const CODE_PARENScol = "ACID_WASH_OKLCH.straw";
export const CODE_PARENS_INNERcol = "ACID_WASH_OKLCH.bruisedPlum";
export const URLcol = ACID_WASH_RGBA.softBlue;
export const COPYRITEcol = $gry_.dim;
export const HEADERcol = OKLCH_FLEURS.clayCoral;
export const CODE_PUNCTcol = ACID_WASH_OKLCH.ember;
export const TOCcol = OKLCH_FLEURS.clayCoral;
export const COMMENTScol = ACID_WASH_OKLCH.fern;
export const CODQ_QUOTEcol = ACID_WASH_OKLCH.bruisedPlum;
export const CODE_EQUALScol = ACID_WASH_OKLCH.smokeRose;


// export const TXTcol_MENU = CYBERPUNK_2060_OKLCH.mintIce;
export const TXTcol_MENU = ACID_WASH_RGBA.softBlue;
export const TXTcol_MENU1 ="oklch(0.65 0.03 240 / 1)"

export const TXTcol_MAIN = CYBERPUNK_2060_NEUTRALS.paper;
export const TXTcol_ALT = CYBERPUNK_2060_NEUTRALS.silver;
export const TXTcol_ALT_ALT = OKLCH_FLEURS.navyCore;

export const GRAFFITIcol = set_alpha(ACID_WASH_RGBA.mutedViolet, 0.2);
export const MENU_FONT = "Monaco, monospace";

export const GRID_GAPstr = "2px";

export const $PANEL_HIDDEN = 'panel-hidden';

// either do this or don't:
export const ABOUT_ROOT_ID = "about-root";

export const $txt_ = {
    hsonWordMarkMain: "4.375rem", // 70px
    wordMobile: "2.5rem" /*  "2.5rem" */,         // 40px
    heading: "1.75rem"/*  "1.625rem" */,          // 26px
    subhead: "1.25rem"/*  "1.375rem" */,          // 22px
    main: "1rem"/*  "1.25rem" */,             // 20??px
    mid: "1rem"/*  "1rem" */,                // 16px
    unter: "1rem" /*  "0.875rem" */,            // 14px
    reg: "1rem" /*  "0.75rem" */,               // 12px
    smol: "0.75rem" /*  "0.625rem" */,             // 10px
    wee: "0.75rem" /*  "0.5rem" */,                // 8px
} as const;

export const make_test_swatch = (): LiveTree => {
    const baseGrid = hson.liveTree.create.div().css.setMany({
        top: "5rem",
        left: "5rem",
        height: "80%",
        width: "80%",
        zIndex: "100",
        display: "grid",
        gridTemplateColumns: "4fr 1fr",
        gridTemplateRows: "1.7fr 1fr",
        pointerEvents: "all",
    });
    const baseBlue = baseGrid.create.div().css.setMany({...fullPanelCss, background: BLUELIKEcol});
    const baseGreen = baseGrid.create.div().css.setMany({...fullPanelCss, background: GREENLIKEcol});
    const baseRed = baseGrid.create.div().css.setMany({...fullPanelCss, background: REDLIKEcol});
    const baseYellow = baseGrid.create.div().css.setMany({ ...fullPanelCss, background: YELLOWLIKEcol });
    baseGreen.listen.onClick(() => { console.error("hi");  baseGrid.removeSelf()})
    return baseGrid;
};

export const WATERMARK_FMT_: Record<Fmt, string> = {
  json: "{JSON}",
  hson: "<HSON>",
  html: "<HTML/>",
} as const;

