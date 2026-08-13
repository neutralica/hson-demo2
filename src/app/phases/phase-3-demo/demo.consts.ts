// demo.consts.ts

import { PUBLIC_MAIN_VIEW_IDS, WIDGET_IDS } from "../../state/shell-ids";



export const MIN_DESKTOP_WIDTH =1100

export const COPY_TEXTstr ="hson::LiveDemo  |  © 2026 terminal_gothic (Public Parity License 7.0)"

export const [
  $ABOUT,
  $TEST,
  $PARSE,
  $BUILD,
  $BARBAR,
  $TOWL,
  $CELLS,
  $FLEURS,
] = PUBLIC_MAIN_VIEW_IDS;
export const [$POINT, $OKLCH, $BLING] = WIDGET_IDS;
export const MENU_OPTIONS = [
  ...PUBLIC_MAIN_VIEW_IDS,
  ...WIDGET_IDS,
] as const;
export const WIDGET_MENU_KEYS = WIDGET_IDS;

export const $PARSING_PANELS_ROOT = "parsing-panels-root";

export const $PP_HEAD = "pp-head";

export const shade_class = (l: string) => {
  let shadeClass: string;
  switch (l) {
    case "h":
      return "blue-shade";
    case "s":
      return "yellow-shade";
    case "o":
      return "green-shade";
    case "n":
      return "pink-shade";
  }
  console.warn("shadeClass function failed");
  return "shadeclass-fail";
};
