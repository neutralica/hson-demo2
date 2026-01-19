// pp.types.ts
import type { LiveTree } from "hson-live";

export type Fmt = "json" | "hson" | "html";

export type PanelParts = {
  fmt: Fmt;
  panel: LiveTree;
  textarea: LiveTree;
  chip: LiveTree;
  bytes: LiveTree;
  copyBtn: LiveTree; // make it required if you always create it
};

export type Panels = {
  root: LiveTree;
  panels: Record<Fmt, PanelParts>;
  // nodeOut?: LiveTree; // add later if you bring it back
};