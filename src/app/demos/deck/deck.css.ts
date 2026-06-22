import type { CssMap } from "hson-live/types";
import { _cols } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { øfontSize } from "../../core/consts/ui-consts";
import { deckTransitionMs } from "./mount-deck";

export const deckHeaderBCss = {
  color: _cols.yellowlike,
  fontSize: "clamp(1.65rem, 2.8vw, 3rem)",
  lineHeight: "1.02",
  // CHANGED: a little internal breathing room without recreating large gaps.
  padding: "0.1rem 0 0.2rem 0",
  letterSpacing: "-0.025em",
  textShadow: `0 0 0.12rem ${_cols.yellowlike}`,
  // CHANGED: align secondary deck headers with the main slide header/body rail.
  justifySelf: "stretch",
  textAlign: "left",
  // CHANGED: separate headerB from the previous body while keeping its own
  // following body close enough to read as a unit.
  marginTop: "2.15rem",
  marginBottom: "0.25rem",
};
export const deckHeaderBStackCss = {
  display: "grid",
  gap: "0.55rem",
  alignContent: "start",
  justifyContent: "stretch",
  gridTemplateColumns: "1fr",
  minHeight: "0",
};

export const deckVeilCss = {
  position: "absolute",
  inset: "0",
  zIndex: "0",
  pointerEvents: "all",
  background: "color-mix(in oklch, black 34%, transparent)",
  backdropFilter: "blur(1.5px) brightness(0.78)",
  // CHANGED: leave the top-left logo area untouched while dimming/filtering
  // the menu, graffiti, motes, and the rest of the screen behind the deck.
  clipPath: "polygon(0 7.35rem, 12.75rem 7.35rem, 12.75rem 0, 100% 0, 100% 100%, 0 100%)",
};
export const deckChromeCss = {
  position: "absolute",
  top: "0.85rem",
  right: "0.85rem",
  zIndex: "2",
  display: "flex",
  gap: "0.4rem",
  alignItems: "center",
  fontSize: øfontSize.smol,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: _cols.fade,
  opacity: "0.72",
};
export const deckButtonCss = {
  border: `1px solid ${_cols.bluelike}`,
  background: "color-mix(in oklch, black 42%, transparent)",
  color: _cols.fade,
  padding: "0.25rem 0.45rem",
  cursor: "pointer",
  userSelect: "none",
};
export const deckStageCss: CssMap = {
  position: "absolute",
  inset: "0",
  display: "grid",
  placeItems: "center",
  zIndex: "1",
  // CHANGED: give the lighthouse mark breathing room and shift slide content
  // into the open stage area instead of starting under the logo/menu rail.
  // padding: "5.75rem 6rem 4.25rem clamp(13.5rem, 14vw, 18rem)",
  paddingLeft: "2rem",
  boxSizing: "border-box",
  transition: `opacity ${deckTransitionMs}ms ease, transform ${deckTransitionMs}ms ease, filter ${deckTransitionMs}ms ease`,
};
export const deckSlideCss = {
  width: "min(72rem, 100%)",
  height: "min(38rem, calc(100vh - 10rem))",
  maxHeight: "100%",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr) auto",
  alignContent: "stretch",
  gap: "0.55rem",
  boxSizing: "border-box",
  overflow: "hidden",
};
export const deckHeaderCss = {
  color: _cols.yellowlike,
  fontSize: "clamp(2.1rem, 5vw, 5rem)",
  lineHeight: "0.95",
  // CHANGED: a little internal breathing room without changing the fixed rail.
  padding: "0.12rem 0 0.3rem 0",
  letterSpacing: "-0.055em",
  textShadow: `0 0 0.18rem ${_cols.yellowlike}`,
  opacity: "0",
  transform: "translateY(-0.22rem)",
  transition: "opacity 220ms ease, transform 220ms ease, text-shadow 220ms ease",
};
export const deckHeaderVisibleCss = {
  opacity: "1",
  transform: "translateY(0)",
};
export const deckBodyGridCss = {
  display: "grid",
  gap: "1.25rem",
  alignContent: "start",
  minHeight: "0",
  height: "100%",
  overflow: "hidden",
};
export const deckBodyCss = {
  minWidth: "0",
  minHeight: "0",
  color: _cols.fade,
  fontSize: "clamp(1rem, 1.4vw, 1.38rem)",
  // lineHeight: "1.42",
  whiteSpace: "pre-wrap",
  overflow: "hidden",
};
export const deckSectionStackCss = {
  display: "grid",
  gap: "2.2rem",
  alignContent: "center",
  maxWidth: "48rem",
  justifySelf: "center",
};
export const deckSectionCss = {
  display: "grid",
  gap: "0.55rem",
};
export const deckSectionHeadingCss = {
  color: _cols.yellowlike,
  fontSize: "clamp(1.35rem, 2.15vw, 2rem)",
  lineHeight: "1.08",
  letterSpacing: "0.02em",
  textShadow: `0 0 0.1rem ${_cols.yellowlike}`,
};
export const deckSectionTextCss = {
  ...deckBodyCss,
  fontSize: "clamp(0.95rem, 1.18vw, 1.18rem)",
  // lineHeight: "1.38",
};
export const deckCodeCss = {
  ...deckBodyCss,
  color: _cols.fmt.json,
  fontSize: "clamp(0.68rem, 0.92vw, 0.92rem)",
};
export const deckFooterCss = {
  color: _cols.fade,
  opacity: "0.56",
  fontSize: øfontSize.smol,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  position: "absolute",
  bottom: "3rem",
  left: "3rem"
};
export const deckCodeKeywordCss = {
  color: _cols.yellowlike,
  textShadow: `0 0 0.08rem ${_cols.yellowlike}`,
};
export const deckCodeMethodCss = {
  color: _cols.bluelike,
};
export const deckCodeStringCss = {
  color: _cols.yellowlike,
};
export const deckCodeMutedCss = {
  color: _cols.bluelike,
  opacity: "0.78",
};
export const deckCodeCommentCss = {
  color: _cols.fade,
  opacity: "0.68",
};
export const deckRootCss:CssMap = {
  ...FONT_FAM_MONO,
  position: "absolute",
  inset: "0",
  zIndex: "95",
  display: "none",
  color: _cols.fade,
  // CHANGED: the deck root itself stays transparent so the hson/livedemo
  // lighthouse mark can remain visually distinct.
  background: "transparent",
  pointerEvents: "all",
};
export const deckCodeContentCss = {
  position: "relative",
  zIndex: "1",
  minWidth: "0",
  minHeight: "0",
  // CHANGED: code panels can appear inside text bodies, so the code content
  // needs its own type scale instead of inheriting the parent body font size.
  fontSize: øfontSize.smol,
  lineHeight: "1.12",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};
export const deckCodeSyntaxCss = {
  color: _cols.bluelike,
};

