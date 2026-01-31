// pp_factory.ts
import { hson, type LiveTree } from "hson-live";
import type { Fmt, Panels, PanelParts } from "./pp.types";
import { PP_PANEL_HEADER_TG_CSS } from "./pp.css";

type PpFactoryOpts = {
  fmts?: readonly Fmt[];
  // includeNodeOutput?: boolean;
};

export function pp_factory(hostBody: LiveTree, opts: PpFactoryOpts = {}): Panels {
  const fmts = opts.fmts ?? (["json", "hson", "html"] as const);

  // CHANGED: if a previous PP root exists, remove it (idempotent)
  const old = hostBody.find.byId("parsing-panels-root");
  if (old) old.removeSelf();

  const root = hostBody.create.div()
    .id.set("parsing-panels-root")
    .css.setMany({
      display: "grid",
      gap: "12px",
      minHeight: "0",
      minWidth: "0",
      gridAutoFlow: "row",
    });

  const panels = {} as Record<Fmt, PanelParts>;

  for (const fmt of fmts) {
    const panel = root.create.section()
      .data.set("role", `panel-${fmt}`)
      .css.setMany({
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: "8px",
        minHeight: "0",
        minWidth: "0",
        padding: "10px",
        borderRadius: "12px",
        boxSizing: "border-box",
        background: "rgba(255,255,255,0.03)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
      });

    const head = panel.create.div()
      .data.set("role", "pp-head")
      .css.setMany(PP_PANEL_HEADER_TG_CSS);

    const chip = head.create.span();
    chip.classlist.add("chip", "validity");
    chip.setText("stale");

    const bytes = head.create.span();
    bytes.data.set("field", `${fmt}-bytes`);
    bytes.setText("0 bytes");

    const copyBtn = head.create.button();
    copyBtn.data.set("action", `copy-${fmt}`);
    copyBtn.setText("copy");

    const textarea = panel.create.textarea();
    textarea.data.set("input", fmt);
    textarea.css.setMany({
      minHeight: "0",
      minWidth: "0",
      resize: "none",
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: "12px",
      lineHeight: "1.35",
      background: "rgba(0,0,0,0.18)",
      color: "rgba(255,255,255,0.88)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px",
      padding: "10px",
      outline: "none",
    });

    panels[fmt] = { fmt, panel, textarea, chip, bytes, copyBtn };
  }

  return { root, panels };
}