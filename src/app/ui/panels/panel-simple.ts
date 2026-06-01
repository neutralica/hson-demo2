// panels.simple.ts

import type { LiveTree } from "hson-live";
import { $blu_ } from "../../core/consts/old-rgb.consts";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { øCOLS, SYS_MONOfont, TXTcol_MAIN, TXTcol_MENU, TXTcol_CODE, TXTcol_GREY } from "../../core/consts/ui-consts";
import { set_alpha } from "../../core/helpers/color-helpers";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";

export function mount_panel_simple(parent: LiveTree, name: string): LiveTree {
  return parent.create.div()
    .id.set(`${name}-panel`)
    .css.setMany({
      position: "absolute",
      inset: "0",
      display: "grid",
      gridTemplateRows: "minmax(0, 1fr)",
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      pointerEvents: "all",
      maxHeight: "100%",
      overflow: "hidden",
      color: TXTcol_GREY,
      ...FONT_FAM_MONO,
      background: øCOLS.backlo
    });
}
