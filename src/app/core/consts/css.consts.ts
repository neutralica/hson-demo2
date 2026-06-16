import type { CssMap } from "hson-live/types";
import { øfontSize, SYS_MONOfont,  øfontWeight } from "./ui-consts";

export const FONT_FAM_MONO: CssMap = {
    fontSize: øfontSize.main,
    fontFamily: SYS_MONOfont,
    fontWeight: øfontWeight.main,
    // letterSpacing: "0.5px",
    // letterSpacing: "0.1px",
    // lineHeight: "1.6rem",
};

export const CLICKABLEcss: CssMap = { cursor: "pointer", userSelect: "any" };
