// panels.types.ts
import type { LiveTree } from "hson-live";
import type { Fmt } from "../../core/types/core.types";

export type PanelShell = Readonly<{
  fmt: Fmt;
  panel: LiveTree;
  head: LiveTree;
  chip: LiveTree;
  bytes: LiveTree;
  copyBtn: LiveTree;

  nodeBox: LiveTree
  wrap: LiveTree;
  wmFmt: LiveTree;
  status: LiveTree;
  textarea: LiveTree;
}>;

export type Panels = {
  root: LiveTree;
  panels: Record<Fmt, PanelShell>;
  // nodeOut?: LiveTree; // add later if you bring it back
};