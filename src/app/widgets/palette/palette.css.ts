// palette.css.ts

import type { CssMap } from "hson-live/types";
import { øCOLS } from "../../core/consts/ui-consts";

export const PALETTE_TAB_CSS: CssMap = {
    position: "fixed",
    bottom: "1rem",
    right: "1rem",
    padding: "1.5rem",
    width: "30%",
    minWidth: "300px",
    maxWidth: "2600px",
    height: "100%",
    minHeight: "200px",
    maxHeight: "700px",
    overflowY: "scroll",
    backgroundColor: øCOLS.backlo,

}