import type { CssMap } from "hson-live/types";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import { _colors } from "../../core/consts/colors.consts";

export const AMOEBI_ROOTcss: CssMap = {
  position: "absolute",
  left: "15%",
  top: "20%",
  width: "min(760px, 62vw)",
  height: "min(570px, 64vh)",
  pointerEvents: "auto",
  zIndex: "4",
  background: _colors.backlo,
}
export const AMOEBI_TITLEcss: CssMap = {
  position: "absolute",
  left: "10px",
  top: "0",
  fontFamily: "DM Mono, Inconsolata, monospace",
  fontSize: "10px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: set_alpha(OKLCH_NEUTRALS.pearlIvory, 0.72),
  userSelect: "none",
  pointerEvents: "none",
};

export const AMOEBI_SVGcss: CssMap = {
  width: "100%",
  height: "100%",
  overflow: "visible",
  filter: `drop-shadow(0 18px 26px ${set_alpha(OKLCH_NEUTRALS.black, 0.28)})`,
};

export const PATH_BASEcss: CssMap = {
  cursor: "pointer",
  transition: "fill 120ms ease, stroke 120ms ease, stroke-width 120ms ease, filter 120ms ease",
  vectorEffect: "non-scaling-stroke",
};
