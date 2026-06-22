// ui-consts.ts


import type { Fmt } from "../types/core.types";
import { CssManager } from "hson-live";

export const øWATERMARK_FMT_: Record<Fmt, string> = {
  json: "{JSON}",
  hson: "<HSON>",
  html: "<HTML/>",
} as const;


export const øfontWeight = {
  main: "100",
  fat: "900",
}

export const øfontSize = {
  smol: "14px",
  sansMain: "16px",
  main: "18px",
  header: "24px",
} as const;



export const SYS_MONOfont = "'DM Mono', Monaco, monospace";


// export const $CODE_FONT_SIZE = øTXT.main;

export const GRID_GAPstr = "2px";
export const $SIDEBAR_WIDTH = "15vw";
export const $LOGGER_WIDTH = "23vw"
export const $CONTENT_WIDTH = "90ch";

/* queryable consts */
export const ABOUT_ROOT_ID = "about-root";
export const $PANEL_HIDDEN = 'panel-hidden';

export const CURRENT_OKLCHname = "oklch-demo-current";
export const CURRENT_OKLCH = CssManager.api().var.key(CURRENT_OKLCHname);

// CHANGED: named editable OKLCH theme vars. CURRENT_OKLCH is only the picker
// preview/current-edit color; these are durable page theme targets. Use `.get()`
// here because CSS maps need a stable `var(--name)` reference at module load.
// Use `CssManager.api().var.value(name)` only at runtime when reading a seeded value.
export const MAIN_OKLCHname = "hson-color-main-text";
export const MAIN_OKLCH = CssManager.api().var.key(MAIN_OKLCHname);

export const MENU_OKLCHname = "hson-color-menu-text";
export const MENU_OKLCH = CssManager.api().var.key(MENU_OKLCHname);

export const GRAF_OKLCHname = "hson-color-graffiti";
export const GRAF_OKLCH = CssManager.api().var.key(GRAF_OKLCHname);

export const MOTE_OKLCHname = "hson-color-motes";
export const MOTE_OKLCH = CssManager.api().var.key(MOTE_OKLCHname);
/* code markdown */
export const $MENU_SHADOW = "1px 1px 55px ";



