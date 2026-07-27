// panels.types.ts
import type { LiveTree } from "hson-live/livetree";
import type { Fmt } from "../../core/types/core.types";

export type PanelViewMode = "text" | "node";

export type PanelShell = Readonly<{
  fmt: Fmt;
  panel: LiveTree;
  head: LiveTree;
  bytes: LiveTree;
  copyBtn: LiveTree;
  textBox: LiveTree;
  nodeText: LiveTree;
  wmFmt: LiveTree;
  status: LiveTree;
  textarea: LiveTree;
}>;

export type Panels = Readonly<{
  root: LiveTree;
  panels: Record<Fmt, PanelShell>;
}>;