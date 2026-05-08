import type { CssMap } from "hson-live/types";
import { _TXT, SYS_MONOfont } from "./consts/ui-consts";


// reusable monospace baseline

export const MONOcss: CssMap = {
  fontFamily: SYS_MONOfont,
  fontSize: _TXT.main,
  letterSpacing: "0.06em",
  // background: $cols_.bckdeep,
  width: "100%",
  fontWeight: "600"
} as const;
