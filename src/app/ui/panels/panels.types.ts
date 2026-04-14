// panels.types.ts
import type { LiveTree } from "hson-live";
import type { Fmt } from "../../core/types/core.types";

export type PanelShell = Readonly<{
  fmt: Fmt;
  panel: LiveTree;
  head: LiveTree;
  // chip: LiveTree;
  bytes: LiveTree;
  copyBtn: LiveTree;

  nodeBox: LiveTree
  textBox: LiveTree;
  wmFmt: LiveTree;
  status: LiveTree;
  textarea: LiveTree;
  viewMode: "text" | "node";
}>;

export type Panels = {
  root: LiveTree;
  panels: Record<Fmt, PanelShell>;
  // nodeOut?: LiveTree; // add later if you bring it back
};

export type PanelViewMode = "text" | "node";