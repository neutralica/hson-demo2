// panels.simple.ts

import type { LiveTree } from "hson-live";
import { $PANEL_HIDDEN } from "../consts/ui-consts";
import { PANEL_FRAMEcss, PANEL_SURFACEcss } from "../phases/phase-3-demo/panels/demo-panels.css";

export type BuiltPanel = Readonly<{
  panel: LiveTree;
  frame: LiveTree;
  head?: LiveTree | undefined;
  surface: LiveTree;
}>;

export function mount_panel_simple(parent: LiveTree, name: string): BuiltPanel {
  const panel = parent.create.div()
    .id.set(`${name}-panel`)
    .classlist.add("panel", name, $PANEL_HIDDEN)
    .css.setMany({
      position: "absolute",
      inset: "0",
      minHeight: "0",
      minWidth: "0",
      display: "grid",
      pointerEvents: "auto",
    });

  const frame = panel.create.div()
    .classlist.add("panel-frame", `${name}-frame`)
    .css.setMany({
      ...PANEL_FRAMEcss,
      minHeight: "0",
      minWidth: "0",
      display: "grid",
    });

  const surface = frame.create.div()
    .classlist.add("panel-body", `${name}-body`)
    .css.setMany({
      ...PANEL_SURFACEcss,
      minHeight: "0",
      minWidth: "0",
    });
  

  return { panel, frame,  surface };
}