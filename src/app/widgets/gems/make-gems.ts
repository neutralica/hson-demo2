import type { LiveTree } from "hson-live";

export type ToggleGem = Readonly<{
  node: LiveTree;
  setActive: (on: boolean) => void;
  setText: (t: string) => void;
}>;


  export const makeGem = (lt: LiveTree, label: string) => {
    const g = lt.create.div().css.setMany({
      minWidth: "44px",
      padding: "6px 8px",
      borderRadius: "6px",
      background: "rgba(255,255,255,0.08)",
      display: "grid",
      gridTemplateRows: "auto auto",
      justifyItems: "center",
      fontFamily: "ui-monospace, monospace",
      fontSize: "12px",
    });

    const val = g.create.div().setText("—").css.setMany({
      fontSize: "14px",
      fontWeight: "600",
    });

    const lbl = g.create.div().setText(label).css.setMany({
      opacity: "0.6",
      fontSize: "10px",
    });

    return {
      set: (v: string | number) => val.setText(String(v)),
      clear: () => val.setText("—"),
    };
  };


export function make_toggle_gem(parent: LiveTree, id: string, label: string): ToggleGem {
  const node = parent.create.div().id.set(id);
  node.setText(label);

  const base: Record<string, string> = {
    padding: "6px 8px",
    borderRadius: "10px",
    userSelect: "none",
    cursor: "pointer",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "12px",
    letterSpacing: "0.02em",
    textAlign: "center",
    whiteSpace: "nowrap",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
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
    setText: (t) => node.setText(t),
  };
}