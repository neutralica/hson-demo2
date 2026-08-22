import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { _fontSize } from "../../core/consts/ui-consts";
import { deckTransitionMs } from "./mount-deck";
import { ABOUT_P_TEXTcss } from "../about/about.css";
import { set_alpha } from "../../core/helpers/color-helpers";

export const deckHeaderBCss: CssMap = {
  color: _colors.gradient,
  fontSize: "clamp(2.1rem, 5vw, 5rem)",
  lineHeight: "0.95",
  transform: "translateY(-0.22rem)",
  transition: "opacity 220ms ease, transform 220ms ease, text-shadow 220ms ease",
  justifySelf: "center",
  textAlign: "center",
  width: "100%",
  marginBottom: "1.5rem",
};

export const deckHeaderBStackCss: CssMap = {
  display: "grid",
  gap: "0.55rem",
  alignContent: "center",
  justifyContent: "center",
  gridTemplateColumns: "minmax(24rem, 54rem)",
  minHeight: "0",
};


export const deckCoverCss: CssMap = {
  position: "absolute",
  inset: "0",
  zIndex: "0",
  pointerEvents: "all",
  background: _colors.backlo,
  // backdropFilter: "blur(1.5px) brightness(0.18)",
  // CHANGED: leave the top-left logo area untouched while dimming/filtering
  // the menu, graffiti, motes, and the rest of the screen behind the deck.
  clipPath: "polygon(0 7.35rem, 12.75rem 7.35rem, 12.75rem 0, 100% 0, 100% 100%, 0 100%)",
};
export const deckChromeCss: CssMap = {
  position: "absolute",
  top: "0",
  right: "0",
  zIndex: "2",
  display: "flex",
  gap: "0.4rem",
  alignItems: "center",
  fontSize: _fontSize.smol,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: _colors.chrome,
  // opacity: "0.72",
};
export const deckButtonCss: CssMap = {
  border: `1px solid ${_colors.bluelike}`,
  background: _colors.backlo,
  color: _colors.chrome,
  padding: "0.25rem 0.45rem",
  cursor: "pointer",
  userSelect: "none",
};
export const deckStageCss: CssMap = {
  position: "absolute",
  inset: "0",
  display: "grid",
  placeItems: "center",
  background: "radial-gradient( circle at 100%, rgba(0,0,0,0.5) 1%, transparent)",
  zIndex: "1",
  // CHANGED: give the lighthouse mark breathing room and shift slide content
  // into the open stage area instead of starting under the logo/menu rail.
  // padding: "5.75rem 6rem 4.25rem clamp(13.5rem, 14vw, 18rem)",
  padding: "4rem 2rem 0",
  boxSizing: "border-box",
  transition: `opacity ${deckTransitionMs()}ms ease, transform ${deckTransitionMs()}ms ease, filter ${deckTransitionMs()}ms ease, background ${deckTransitionMs()}ms ease`,
};
export const deckSlideCss: CssMap = {
  width: "min(72rem, 100%)",
  maxHeight: "100%",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr) auto",
  // alignContent: "stretch",
  gap: "0.45rem",
  boxSizing: "border-box",
  overflow: "hidden",
  justifyContent: "center",
};

export const deckHeaderCss: CssMap = {
  color: _colors.gradient,
  fontSize: "clamp(2.1rem, 5vw, 5rem)",
  lineHeight: "0.95",
  // CHANGED: a little internal breathing room without changing the fixed rail.
  // padding: "0.12rem 0 0.3rem 0",
  // letterSpacing: "-0.055em",
  // marginTop:"2rem",
  transform: "translateY(-0.22rem)",
  transition: "opacity 220ms ease, transform 220ms ease, text-shadow 220ms ease",
};
export const deckHeaderVisibleCss: CssMap = {
  opacity: "1",
  transform: "translateY(0)",
  // filter: "saturate(110%) contrast(110%) brightness(160%)",
};
export const deckBodyGridCss: CssMap = {
  display: "grid",
  gap: "0.5rem",
  alignContent: "start",
  minHeight: "0",
  // height: "100%",
  marginBottom: "2rem",
  overflow: "hidden",
  // filter: "saturate(120%) contrast(120%) brightness(120%)",
};
export const deckBodyCss: CssMap = {
  minWidth: "0",
  minHeight: "0",
  color: _colors.chrome,
  fontSize: _fontSize.main,
  lineHeight: "1.42",
  whiteSpace: "pre-wrap",
  overflow: "hidden",
};
export const deckSectionStackCss: CssMap = {
  display: "grid",
  gap: "2.2rem",
  alignContent: "center",
  maxWidth: "40rem",
  justifySelf: "center",
};
export const deckSectionCss: CssMap = {
  display: "grid",
  gap: "0.55rem",
};
export const deckSectionHeadingCss: CssMap = {
  color: _colors.yellowlike,
  fontSize: "clamp(1.35rem, 2.15vw, 2rem)",
  lineHeight: "1.08",
  // letterSpacing: "0.02em",
};
export const deckSectionTextCss: CssMap = {
  ...deckBodyCss,
  fontSize: "clamp(0.95rem, 1.18vw, 1.18rem)",
};
export const deckCodeCss: CssMap = {
  ...deckBodyCss,
  color: _colors.fmt.json,
  // fontSize: "clamp(0.68rem, 0.92vw, 0.92rem)",
};
export const deckFooterCss: CssMap = {
  color: _colors.chrome,
  opacity: "0.56",
  fontSize: _fontSize.smol,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  position: "absolute",
  bottom: "1.5rem",
  left: "1.5rem"
};
export const deckRootCss:CssMap = {
  ...FONT_FAM_MONO,
  position: "absolute",
  inset: "0",
  zIndex: "95",
  display: "none",
  height: "100%",
  width: "100%",
  color: _colors.chrome,
  background: "transparent",
  // CHANGED: the deck root itself stays transparent so the hson/livedemo
  // lighthouse mark can remain visually distinct.
  pointerEvents: "all",
  filter: "saturate(140%) contrast(110%) brightness(130%)",
};
export const deckCodeContentCss: CssMap = {
  position: "relative",
  zIndex: "1",
  minWidth: "0",
  minHeight: "0",
  // maxWidth: "40ch",
  // CHANGED: code panels can appear inside text bodies, so the code content
  // needs its own type scale instead of inheriting the parent body font size.
  fontSize: _fontSize.smol,
  lineHeight: "1.12",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  margin: "0.5em",
};

export const DECK_ROW_TXTcss: CssMap = {
  textIndent: "4ch",
  lineHeight: "2",
  minHeight: "1.28em",
  textAlign: "left",
  
};

export const IMGcss: CssMap = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  opacity: "0.88",
};

export const TXT_ROWcss: CssMap = {
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  lineHeight: "1.22",
  minHeight: "1.22em",
  overflow: "hidden",
};

export const DECK_EMPTYHRcss: CssMap = {
  height: "0.9rem",
  margin: "1rem 0 1rem 0",
  opacity: "0",
};

export const DECK_HRcss: CssMap = {
  height: "1.15rem",
  margin: "2rem 0 1rem 0",
  borderTop: `1px solid ${set_alpha(_colors.chrome, 0.25)}`,
  opacity: "0.75",
};
export const P_BLOCKcss:CssMap = {
  ...ABOUT_P_TEXTcss,
  display: "grid",
  gap: "0.28rem",
  lineHeight: "1.28",
  textAlign: "left",
  maxWidth: "80ch"
};