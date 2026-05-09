import type { CssMap } from "hson-live/types";
import { ACID_WASH_RGBA} from "../../../core/consts/colors.consts";
import { ACID_WASH_OKLCH } from "../../../core/consts/oklch";
import { _COLS, _TXT, SYS_SMOLfont } from "../../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";


export const MOUSE_ROOTcss: CssMap = {
  position: "fixed",
  bottom: "0.5rem",
  left: "1rem",
  display: "grid",
  gridTemplateRows: "150px 200px",
  gridTemplateColumns: "2fr 1fr",
  minWidth: "0",
  minHeight: "0",
  width: "20 0px",
  maxWidth: "200px",
  // marginBottom: "1rem",
  overflow: "hidden",
} as const;

export const MOUSE_SLOTcss: CssMap = {
  // space below menu
  height: "400pz",
  display: "flex",
  flexDirection: "column",
  justifyItems: "flex-end",
  width: "100%",
  minWidth: "0",
  minHeight: "0",
};

export const MOUSE_HOSTcss: CssMap = {
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  maxWidth: "40ch",
  color: ACID_WASH_RGBA.softBlue,
  // justifySelf: "flex-end",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
};

export const MOUSE_POINTERcss = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "64px",
  height: "2px",
  background: OKLCH_FLEURS.clayCoral,
  transformOrigin: "0% 50%",
  transform: "translate(0, -50%) rotate(0deg)",
  boxShadow: "0 0 10px rgba(140,210,255,0.20)",
}

export const MOUSE_POINTER_ORIGINcss = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "6px",
  height: "6px",
  borderRadius: "99px",
  background: ACID_WASH_OKLCH.mutedRed,
  transform: "translate(-50%, -50%)",
}


export const MOUSE_COORD_Xcss: CssMap = {
  FontFamily: SYS_SMOLfont,
  fontSize: _TXT.smol,
  color: OKLCH_FLEURS.clayCoral,
  whiteSpace: "pre",
  marginLeft: "1.5rem",
}

export const MOUSE_COORD_Ycss = {
  FontFamily: SYS_SMOLfont,
  fontSize: _TXT.smol,
  color: OKLCH_FLEURS.clayCoral,
  whiteSpace: "pre",
  marginLeft: "1rem",
}

export const MOUSE_THETAcss = {
  FontFamily: SYS_SMOLfont,
  fontSize: _TXT.smol,
  color: OKLCH_FLEURS.clayCoral,
  whiteSpace: "pre",
  marginLeft: "0.1rem",
}

// unify row layout (header + data rows) so columns line up
export const ROW_GRIDcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "4ch 1fr", // 3 columns only (#, element, _QUID)
  columnGap: "2px",
  alignItems: "baseline",
  minWidth: "0",
  FontFamily: SYS_SMOLfont,
  fontSize: _TXT.smol,
} as const;

export const MOUSE_TRACKERcss: CssMap = {
  position: "relative",
  width: "140px",
  height: "140px",
  borderRadius: "999px",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  gridColumn: "1",
  gridRow: "1",
  backgroundColor: _COLS.backlo,
  border: `1px solid ${ACID_WASH_RGBA.fadedMagenta}`,
  alignSelf: "end",
  justifySelf: "start",

} as const;

export const STACK_TABLEcss = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gridColumn: "1 / 3",
  gridRow: "2 / -1",
  gap: "12px",
  minWidth: "0",
  minHeight: "0",
  height: "100%",
  background: _COLS.backlo,

}

export const MOUSE_STACKcss = {
  position: "relative",
  display: "grid",
  gridAutoRows: "auto",
  gap: "6px",
  minWidth: "0",
  minHeight: "0",
  alignContent: "start",

}

export const MOUSE_COORDScss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto auto auto", // CHANGED
  minWidth: "0",
  gridColumn: "2",
  gridRow: "1",
  marginLeft: "-1.5rem",
  alignContent: "end",              // CHANGED
  justifyItems: "start",
  background: _COLS.backlo,
  height: "auto",
} as const;

// grid-cell clamp so long values don't push neighbors
export const CELL_CLAMPcss: CssMap = {
  minWidth: "0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;
