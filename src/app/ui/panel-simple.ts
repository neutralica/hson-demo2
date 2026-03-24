// panels.simple.ts

import type { LiveTree } from "hson-live";
import { $blu_ } from "../core/consts/colors.consts";
import { MENU_FONT } from "../phases/phase-3-demo/demo.css";

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
      // minWidth: "0",
      // minHeight: "0",
      borderRadius: "14px",
      padding: "12px",
      boxSizing: "border-box",
      pointerEvents: "all",
      maxHeight: "100%",
      overflow: "hidden",
      color: $blu_.std,
      fontFamily: MENU_FONT,
      // background: "red",
    });
}
