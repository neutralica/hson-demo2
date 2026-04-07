import type { CssMap } from "hson-live/types";
import { ACID_WASH_RGBA, COLORS_ } from "../../core/consts/colors.consts";
import { MONO_MAINfont, $txt_ } from "../../core/consts/ui-consts";
import { OKLCH_FLEURS } from "../../phases/phase-3-demo/demo-fleurs/fleurs.consts";


export const UI_BUTTON_BORDERcss: CssMap = {
  borderRadius: "18px",
  border: `1px solid ${ACID_WASH_RGBA.fadedMint}`
};

export const UI_CHIP_BORDERcss: CssMap = {
  borderRadius: "18px",
  border: `1px solid ${OKLCH_FLEURS.oliveCore}`
};

export const UI_BUTTONcss: CssMap = {
  ...UI_BUTTON_BORDERcss,
  display: "grid",
  placeItems: "center",
  userSelect: "none",
  cursor: "pointer",
  fontFamily: MONO_MAINfont,
  fontSize: $txt_.unter,
  textTransform: "uppercase",
  background: COLORS_.bckdeep,
} as const;
