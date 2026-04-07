// panels.simple.ts

import type { LiveTree } from "hson-live";
import { $blu_, CYBERPUNK_2060_NEUTRALS } from "../../core/consts/colors.consts";
import { MONO_MAINfont, TXTcol_MAIN } from "../../core/consts/ui-consts";
import { set_alpha } from "../../core/helpers/color-helpers";

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
      padding: "12px",
      boxSizing: "border-box",
      pointerEvents: "all",
      maxHeight: "100%",
      overflow: "hidden",
      color: TXTcol_MAIN,
      fontFamily: MONO_MAINfont,
    });
}
