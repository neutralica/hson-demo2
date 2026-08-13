import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { _fontSize, _fontWeight } from "../../core/consts/ui-consts";
import { set_alpha } from "../../core/helpers/color-helpers";

export const TOWL_ROOT_CSS: CssMap = {
  ...FONT_FAM_MONO,
  width: "100%",
  height: "100%",
  minWidth: "0",
  minHeight: "0",
  boxSizing: "border-box",
  padding: "clamp(1rem, 4vw, 3rem)",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  overflowY: "auto",
  background: set_alpha(_colors.backlo, 0.92),
  color: _colors.txt.grey,
};

export const TOWL_CARD_CSS: CssMap = {
  width: "min(52rem, 100%)",
  display: "grid",
  gap: "1.25rem",
  padding: "clamp(1rem, 3vw, 2rem)",
  boxSizing: "border-box",
  border: `1px solid ${_colors.txt.grey}`,
  background: _colors.backhi,
};

export const TOWL_HEADER_CSS: CssMap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
};

export const TOWL_TITLE_CSS: CssMap = {
  margin: "0",
  color: _colors.txt.main,
  fontSize: "clamp(1.5rem, 5vw, 3rem)",
  fontWeight: _fontWeight.fat,
  letterSpacing: "0.2em",
};

export const TOWL_META_CSS: CssMap = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
  gap: "0.5rem 1rem",
  fontSize: _fontSize.smol,
};

export const TOWL_ROOM_CSS: CssMap = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.5rem 1rem",
  color: _colors.txt.menu,
  fontSize: _fontSize.smol,
};

export const TOWL_SHARE_STATUS_CSS: CssMap = {
  minWidth: "5rem",
  color: _colors.greenlike,
};

export const TOWL_SEATS_CSS: CssMap = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "1rem",
};

export const TOWL_SEAT_CSS: CssMap = {
  minWidth: "0",
  padding: "1rem",
  border: `1px solid ${_colors.txt.grey}`,
  borderColor: _colors.txt.grey,
  display: "grid",
  gap: "0.35rem",
  whiteSpace: "pre-line",
};

export const TOWL_SEAT_LOCAL_CSS: CssMap = {
  borderColor: _colors.bluelike,
  color: _colors.txt.main,
};

export const TOWL_ROPE_CSS: CssMap = {
  display: "grid",
  gap: "0.5rem",
};

export const TOWL_TRACK_CSS: CssMap = {
  position: "relative",
  height: "0.75rem",
  background: _colors.backlo,
  border: `1px solid ${_colors.txt.grey}`,
};

export const TOWL_MARKER_CSS: CssMap = {
  position: "absolute",
  top: "-0.4rem",
  width: "0.45rem",
  height: "1.45rem",
  marginLeft: "-0.225rem",
  background: _colors.pinklike,
};

export const TOWL_ACTIONS_CSS: CssMap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
};

export const TOWL_BUTTON_CSS: CssMap = {
  ...FONT_FAM_MONO,
  minWidth: "7rem",
  minHeight: "2.75rem",
  padding: "0.65rem 1rem",
  border: `1px solid ${_colors.bluelike}`,
  background: _colors.backlo,
  color: _colors.txt.main,
  cursor: "pointer",
  touchAction: "manipulation",
  userSelect: "none",
  _hover: {
    background: _colors.bluelike,
    color: _colors.backlo,
  },
  _disabled: {
    opacity: "0.4",
    cursor: "not-allowed",
  },
  _focusVisible: {
    outline: `3px solid ${_colors.yellowlike}`,
    outlineOffset: "3px",
  },
};

export const TOWL_PRIMARY_BUTTON_CSS: CssMap = {
  minHeight: "3.25rem",
  borderWidth: "2px",
  borderColor: _colors.pinklike,
  color: _colors.pinklike,
  fontWeight: _fontWeight.fat,
};

export const TOWL_BACK_BUTTON_CSS: CssMap = {
  minWidth: "5.5rem",
  flex: "0 0 auto",
};

export const TOWL_DANGER_BUTTON_CSS: CssMap = {
  borderColor: _colors.red,
  color: _colors.red,
};

export const TOWL_RECONNECT_BUTTON_CSS: CssMap = {
  display: "none",
  justifySelf: "start",
  minWidth: "7rem",
};

export const TOWL_RESULT_CSS: CssMap = {
  minHeight: "1.5em",
  color: _colors.greenlike,
  fontWeight: _fontWeight.fat,
};

export const TOWL_ERROR_CSS: CssMap = {
  minHeight: "1.5em",
  color: _colors.red,
  whiteSpace: "pre-wrap",
};

export const TOWL_INVALID_CSS: CssMap = {
  display: "grid",
  gap: "1rem",
  alignContent: "start",
};

export const TOWL_INVALID_ACTIONS_CSS: CssMap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
};
