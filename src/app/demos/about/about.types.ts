import type { LiveTree } from "hson-live";

export type AboutDocKey = string;

export type AboutDocSpec = Readonly<{
  key: AboutDocKey;
  title: string;
  body: string; // markdown-ish source
}>;

export type AboutDocs = ReadonlyArray<AboutDocSpec>;
export type AboutPanel = Readonly<{
  root: LiveTree;
  toc: LiveTree;
  doc: LiveTree;
}>;
// -----------------------------
// Markdown-ish renderer (only touch: flushPara + flushList use render_inline)
// -----------------------------

export type AboutInitDeps = Readonly<{
  docs: AboutDocs;
  initialDocKey?: AboutDocKey;
}>;

export type AboutInitTargets = Readonly<{
  toc: LiveTree;
  doc: LiveTree;
}>;export type ListKind = "ul" | "ol" | "anti";
export type ListItem = { kind: "ul"; depth: number; marker: string; text: string; } |
{ kind: "ol"; depth: number; n: number; text: string; } |
{ kind: "anti"; depth: number; marker: string; text: string; };

