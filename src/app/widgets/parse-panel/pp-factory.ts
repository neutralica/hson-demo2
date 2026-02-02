// pp_factory.ts
import { hson, type LiveTree } from "hson-live";
import type { Fmt, Panels, PanelShell } from "./pp.types";
import { PP_PANEL_HEADER_TG_CSS } from "./pp.css";
import { PANEL_TEXTAREAcss, PANELcss, PARSING_PANEL_ROOTcss } from "../../phases/hson-demo-3/panels.css";
import { $PARSING_PANELS_ROOT, $PP_HEAD } from "./pp.consts";

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
    .id.set($PARSING_PANELS_ROOT)
    .css.setMany(PARSING_PANEL_ROOTcss);

  const panels = {} as Record<Fmt, PanelShell>;

  for (const fmt of fmts) {
    const panel = root.create.section()
      .data.set("role", `panel-${fmt}`)
      .css.setMany(PANELcss);

    const head = panel.create.div()
      .data.set("role", $PP_HEAD)
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
    textarea.css.setMany(PANEL_TEXTAREAcss);

    panels[fmt] = { fmt, panel, textarea, chip, bytes, copyBtn };
  }

  return { root, panels };
}