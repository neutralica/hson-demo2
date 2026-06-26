// demo.consts.ts

import type { DemoWidget } from "../../state/state.types";



export const MIN_DESKTOP_WIDTH =1100

export const COPY_TEXTstr ="hson::LiveDemo  |  © 2026 terminal_gothic (Public Parity License 7.0)"

export const $BUILD = "build";
export const $RENDER = "render";
export const $PARSE = "parse";
export const $TEST = "test";
export const $FLEURS = "fleurs";
export const $OKLCH = "oklch";
export const $POINT = "point";
export const $ABOUT = "about";
export const $MOTES = "motes";
export const $MONITOR = "monitor";
export const $BARBAR = "bar-bar";
export const MENU_OPTIONS = [
  $ABOUT,
  $TEST,
  $PARSE,
  $BUILD,
  $RENDER,
  $BARBAR,
  $FLEURS,
  $POINT,
  $OKLCH,
  $MOTES,
  $MONITOR,
] as const;
export const WIDGET_MENU_KEYS: readonly DemoWidget[] = [$POINT, $OKLCH, $MOTES, $MONITOR] as const;

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

