import type { CssMap } from "hson-live/types";
import { _TXT, SYS_MONOfont, SYS_SANSfont } from "./ui-consts";

export const FONT_FAM_MONO: CssMap = {
    fontFamily: SYS_MONOfont,
    fontSize: _TXT.main,
    fontWeight: "200",
    letterSpacing: "0.5px",
    lineHeight: "1.6rem",
}
export const FONT_FAM_SANS: CssMap = {
    fontFamily: SYS_SANSfont,
    fontSize: _TXT.sansMain,
    fontWeight: "200",
    letterSpacing: "0.2px",
    lineHeight: "2em",
}