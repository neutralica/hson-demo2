import type { LiveTree } from "hson-live";

export type ToggleBtn = Readonly<{
  node: LiveTree;
  setActive: (on: boolean) => void;
  setText: (t: string) => void;
}>;


export function make_btn(parent: LiveTree, id: string, label: string): ToggleBtn {
  const node = parent.create.div().id.set(id);
  node.text.set(label);

  const base: Record<string, string> = {
    padding: "6px 8px",
    borderRadius: "10px",
    userSelect: "none",
    cursor: "pointer",
    fontFamily: "monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "20px",
    letterSpacing: "0.02em",
    textAlign: "center",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  };

  const onCss: Record<string, string> = {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
  };

  node.css.setMany(base);

  const setActive = (on: boolean): void => {
    node.css.setMany(on ? { ...base, ...onCss } : base);
  };

  return {
    node,
    setActive,
    setText: (t) => node.text.set(t),
  };
}