import type { CssMap } from "hson-live/types";
import { _fontSize, SYS_MONOfont,  _fontWeight } from "./ui-consts";

export const FONT_FAM_MONO: CssMap = {
    fontSize: _fontSize.main,
    fontFamily: SYS_MONOfont,
    fontWeight: _fontWeight.main,
    // letterSpacing: "0.5px",
    // letterSpacing: "0.1px",
    // lineHeight: "1.6rem",
};

export const CLICKABLEcss: CssMap = { cursor: "pointer", userSelect: "any" };
