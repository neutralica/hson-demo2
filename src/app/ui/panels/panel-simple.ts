// panels.simple.ts

import type { LiveTree } from "hson-live";
import { _cols } from "../../core/consts/colors.consts";
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
      color: _cols.txt.grey,
      ...FONT_FAM_MONO,
      background: _cols.backlo
    });
}
