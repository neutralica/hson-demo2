// panels.simple.ts

import type { LiveTree } from "hson-live";
import type { CssMap } from "hson-live/types";
import { PANEL_FRAMEcss, PANEL_OUTERcss, PANEL_SURFACEcss } from "../phases/hson-demo-3/demo-panels.css";

export type BuiltPanel = Readonly<{
  panel: LiveTree;
  frame: LiveTree;
  head?: LiveTree | undefined;
  surface: LiveTree;
}>;

export function mount_panel_simple(parent: LiveTree, name: string): BuiltPanel {
  const panel = parent.create.div()
    .id.set(`${name}-panel`)
    .classlist.add("panel", name);

  const frame = panel.create.div()
    .classlist.add("panel-frame", `${name}-frame`)
    .css.setMany(PANEL_FRAMEcss);

  // const head = a.headCss
  //   ? frame.create.div()
  //       .classlist.add("panel-head", `${a.key}-head`)
  //       .css.setMany(PANEL_FRAMEcss)
  //   : undefined;

  const surface = frame.create.div()
    .classlist.add("panel-body", `${name}-body`)
    .css.setMany(PANEL_SURFACEcss);

  return { panel, frame, surface: surface };
}