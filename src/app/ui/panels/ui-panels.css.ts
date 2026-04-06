import type { CssMap } from "hson-live/types";
import { ACID_WASH_RGBA, COLORS } from "../../core/consts/colors.consts";
import { MENU_FONT, $txt_ } from "../../core/consts/ui-consts";
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
  fontFamily: MENU_FONT,
  fontSize: $txt_.unter,
  textTransform: "uppercase",
  background: COLORS.bckdeep,
} as const;
