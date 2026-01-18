// core-css.ts

import type { CssMap } from "hson-live/types";
import { bckColor } from "../phases/splash-2/splash.consts";


export const FRAME_CSS: CssMap = {
    position: "fixed",
    left: "50%",
    top: "32%",
    borderRadius: "22px",
    transform: "translate(-50%, -50%)",
    // use the shared var
    width: "max-content",
    height: "max-content",
    // background: bckColor,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    padding: "56px 64px",
    willChange: "",
}