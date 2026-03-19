import type { CssMap } from "hson-live/types";
import { $red_etc_, $cols_, ACID_WASH_RGBA, $ylw_, $gry_ } from "../../../consts/colors.consts";
import { $txt_ } from "../../../consts/ui-consts";
import { MENU_FONT } from "../demo.css";
import { $CHIP_WIDTHstr } from "../../../../tests/tests.consts";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";

export const TEST_BUTTON_BORDER: CssMap = {
  borderRadius: "18px",
  border: `4px solid ${OKLCH_FLEURS.violet}`
}

export const TEST_ACTION_BTN: CssMap = {
  ...TEST_BUTTON_BORDER,
  display: "grid",
  placeItems: "center",
  userSelect: "none",
  cursor: "pointer",

  fontFamily: MENU_FONT,
  fontSize: $txt_.unter,
  textTransform: "uppercase",
  background: $cols_.bckdeep,
} as const;

export const CONTROL_ROWcss: CssMap = {
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "1fr 2fr 1fr",
  gap: "10px",
  padding: "0",
  gridColumn: "1 / 2",
  gridRow: "2",
  // background: "transparent",
  border: "none",
  boxShadow: "none",
};

export const RUN_BUTTONcss: CssMap = {
  ...TEST_ACTION_BTN,
  _hover: {
    background: ACID_WASH_RGBA.fadedMint,
    color: $cols_.bckdeep
  }
};

export const TEST_SELECTcss = {
  minWidth: "20ch",
  padding: "10px 8px",
  borderRadius: "12px",
  boxSizing: "border-box",

  fontFamily: MENU_FONT,
  fontSize: $txt_.main,

  // background: $cols_.backdeep,
  color: ACID_WASH_RGBA.fadedMint,
  border: "1px solid rgba(255,255,255,0.2)",
  outline: "none",
} as const;

export const TEST_LOGGERcss: CssMap = {
  borderRadius: "18px",
  padding: "10px",
  boxSizing: "border-box",
  // background: $cols_.backdeep,
  fontFamily: MENU_FONT,
  fontSize: $txt_.unter,
  height: "100%",
  width: "100%",
  minHeight: "15rem",
  maxHeight: "15rem",
  overflowY: "scroll",
  overflowX: "hidden",
  overflowWrap: "anywhere",
  minWidth: "100%",
  color: $gry_.mid,
  whiteSpace: "pre-wrap",
  letterSpacing: "0.14em",
  lineHeight: "1.85rem",
} as const;

export const LOG_BOXcss: CssMap = {
  gridRow: "1",
  gridColumn: "1 / 3",
  overflow: "auto",
  width: "100%",
  height: "100%",
  display: "grid",
  background: $cols_.bckdeep,
};

export const TEST_PANELcss: CssMap = {
  display: "grid",
  gap: "6px",
  gridTemplateColumns: $CHIP_WIDTHstr + $CHIP_WIDTHstr + $CHIP_WIDTHstr,
  width: "100%",
  boxSizing: "border-box",
};

export const TEST_CHIP_ROWcss = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: "8px",
  gridRow: "2",
  gridColumn: "2 / 3",
  padding: "0",
}

export const MAKE_CHIP_DEFAULTcss = {
  padding: "8px 8px",
  ...TEST_BUTTON_BORDER,
  display: "grid",
  gridTemplateRows: "auto auto",
  justifyItems: "center",
  alignContent: "center",
  minHeight: "44px",
  minWidth: "44px",
  boxSizing: "border-box",
  overflow: "hidden",
  background: $cols_.bckdeep,
  transition: "transform 90ms ease, filter 140ms ease",
};