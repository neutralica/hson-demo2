import type { CssMap } from "hson-live/types";
import { ACID_WASH_RGBA } from "../../../core/consts/old-rgb.consts";
import { ACID_WASH_OKLCH } from "../../../core/consts/oklch.consts";
import { øfontSize, SYS_MONOfont } from "../../../core/consts/ui-consts";
import { _cols } from "../../../core/consts/colors.consts";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";


export const POINT_ROOTcss: CssMap = {
  position: "fixed",
  bottom: "0.5rem",
  left: "1rem",
  display: "grid",
  gridTemplateRows: "200px 100px",
  gridTemplateColumns: "2fr 1fr",
  minWidth: "0",
  minHeight: "0",
  width: "200px",
  maxWidth: "200px",
  // marginBottom: "1rem",
  overflow: "hidden",
} as const;

export const POINT_SLOTcss: CssMap = {
  // space below menu
  height: "400px",
  display: "flex",
  flexDirection: "column",
  justifyItems: "flex-end",
  width: "100%",
  minWidth: "0",
  minHeight: "0",
  zIndex: "-10",
};

export const POINT_HOSTcss: CssMap = {
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
  zIndex: "-10",
};

export const TRACKERcss = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "44px",
  height: "2px",
  background: OKLCH_FLEURS.clayCoral,
  transformOrigin: "0% 50%",
  transform: "translate(0, -50%) rotate(0deg)",
  boxShadow: "0 0 10px rgba(140,210,255,0.20)",
}

export const TRACKER_ORIGINcss = {
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
  FontFamily: SYS_MONOfont,
  fontSize: øfontSize.smol,
  color: OKLCH_FLEURS.clayCoral,
  whiteSpace: "pre",
  marginLeft: "1.5rem",
}

export const MOUSE_COORD_Ycss = {
  FontFamily: SYS_MONOfont,
  fontSize: øfontSize.smol,
  color: OKLCH_FLEURS.clayCoral,
  whiteSpace: "pre",
  marginLeft: "1rem",
}

export const TRACKER_THETAcss = {
  FontFamily: SYS_MONOfont,
  fontSize: øfontSize.smol,
  color: OKLCH_FLEURS.clayCoral,
  whiteSpace: "pre",
  marginLeft: "0.1rem",
}

// unify row layout (header + data rows) so columns line up
export const ROW_GRIDcss: CssMap = {
  display: "grid",
  gridTemplateColumns: "2ch 1fr",
  columnGap: "2px",
  alignItems: "baseline",
  minWidth: "0",
  FontFamily: SYS_MONOfont,
  fontSize: øfontSize.smol,
} as const;

export const POINTER_TRACKERcss: CssMap = {
  position: "relative",
  width: "90px",
  height: "90px",
  borderRadius: "999px",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  gridColumn: "1",
  gridRow: "2",
  backgroundColor: _cols.backlo,
  border: `1px solid ${ACID_WASH_RGBA.fadedMagenta}`,
  alignSelf: "end",
  justifySelf: "start",

} as const;

export const STACK_TABLEcss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto",
  gridColumn: "1 / 3",
  gridRow: "1",
  // gap: "12px",
  minWidth: "0",
  minHeight: "0",
  height: "100%",
  background: _cols.backlo,
  alignContent: "end",

}

export const ELEMENT_STACKcss: CssMap = {
  position: "relative",
  display: "flex",
  gridAutoRows: "auto",
  gap: "6px",
  minWidth: "0",
  minHeight: "0",
  alignContent: "end",
  flexDirection: "column-reverse",

}

export const POINTER_COORDScss: CssMap = {
  display: "grid",
  gridTemplateRows: "auto auto auto", // CHANGED
  minWidth: "0",
  gridColumn: "2",
  gridRow: "2",
  marginLeft: "-1.5rem",
  alignContent: "end",              // CHANGED
  justifyItems: "start",
  height: "auto",
  width: "15ch",
} as const;

// grid-cell clamp so long values don't push neighbors
export const CELL_CLAMPcss: CssMap = {
  minWidth: "0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;
