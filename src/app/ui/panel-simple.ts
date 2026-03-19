// panels.simple.ts

import type { LiveTree } from "hson-live";
import { $PANEL_HIDDEN } from "../core/consts/ui-consts";
import { PANEL_FRAMEcss, PANEL_SURFACEcss } from "../phases/phase-3-demo/panels/demo-panels.css";
import { $blu_ } from "../core/consts/colors.consts";
import { MENU_FONT } from "../phases/phase-3-demo/demo.css";

export type BuiltPanel = Readonly<{
  panel: LiveTree;
  head?: LiveTree | undefined;
  surface: LiveTree;
}>;
export function mount_panel_simple(parent: LiveTree, name: string): LiveTree {
  return parent.create.div()
    .id.set(`${name}-panel`)
    .css.setMany({
      width: "100%",
      height: "100%",
      minWidth: "0",
      minHeight: "0",
      borderRadius: "14px",
      padding: "12px",
      boxSizing: "border-box",
      pointerEvents: "all",
      maxHeight: "100%",
      overflow: "hidden", 
      color: $blu_.std,
   fontFamily: MENU_FONT,
    });
}
