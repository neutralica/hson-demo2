import type { CssMap } from "hson-live/types";
import { MONO_MAINfont } from "./consts/ui-consts";


// reusable monospace baseline

export const MONOcss: CssMap = {
  fontFamily: MONO_MAINfont,
  fontSize: "12px",
  letterSpacing: "0.06em",
  // background: $cols_.bckdeep,
  width: "100%",
  fontWeight: "600"
} as const;
