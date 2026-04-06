// pp_factory.ts
import { hson, type LiveTree } from "hson-live";

import {  relay, relay_data, type Outcome } from "intrastructure";
import { init_parsing_panels } from "./init-pp";
import type { Panels, PanelShell } from "../../../ui/panels/panels.types";
import type { Fmt } from "../../../core/types/core.types";
import { $PARSING_PANELS_ROOT, $PP_HEAD } from "../demo.consts";
import { PARSING_PANEL_ROOTcss, PP_COPYBTNcss, PP_GRIDcss, PP_HEADERcss, PP_STATUScss, PP_TEXTWRAPcss, PP_WATERMARKcss } from "./pp.css";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { PANEL_TEXTAREAcss, PANELcss } from "../../../ui/panels/tp-panels.css";
import { COLOR_FOR_FMT_, WATERMARK_FMT_ } from "../../../core/consts/ui-consts";
import { set_alpha } from "../../../core/helpers/color-helpers";

export type PpFactoryOpts = {
  fmts?: readonly Fmt[];
  // includeNodeOutput?: boolean;
};

export function mount_parsing_panels(host: LiveTree): Outcome<Panels> {
  const pp = relay_data(pp_factory(host));
  init_parsing_panels(pp);
  return relay.data(pp);
}



// --- pp_factory ---


export function pp_factory(hostBody: LiveTree, opts: PpFactoryOpts = {}): Outcome<Panels> {
  const fmts = opts.fmts ?? (["json", "hson", "html"] as const);

  const old = hostBody.find.byId($PARSING_PANELS_ROOT);
  if (old) old.removeSelf();

  const root = hostBody.create.div()
    .id.set($PARSING_PANELS_ROOT)
    .css.setMany(PARSING_PANEL_ROOTcss);

  const header = root.create.div()
    .css.setMany(PP_HEADERcss)
    .text.set("~parsing panels~");

  const panelGrid = root.create.div()
    .css.setMany({
      ...PP_GRIDcss,
    });

  const panels = {} as Record<Fmt, PanelShell>;

  for (const fmt of fmts) {
    const panel = panelGrid.create.section()
      .data.set("role", `panel-${fmt}`)
      .css.setMany(PANELcss);


    // keep head handle so we can hide/show focused-only status cleanly
    const head = panel.create.div()
      .id.set("fmt-header")
      .data.set("role", $PP_HEAD)
      .css.setMany(PP_HEADERcss);


    const bytes = head.create.span()
      .data.set("field", `${fmt}-bytes`)
      .text.set("0 bytes");

    // div instead of button (avoid browser button styling)
    const copyBtn = head.create.div()
      .classlist.set("pp-copy")
      .text.set("copy")
      .css.setMany(PP_COPYBTNcss)
      .attr.setMany({
        "role": "button",
        "tabindex": "0",
        "aria-label": `copy ${fmt}`,
      });
    // ADDED: wrapper + overlays
    const wrap = panel.create.div()
      .classlist.set("pp-textwrap")
      .css.setMany(PP_TEXTWRAPcss);

    const wmFmt = wrap.create.div()
      .classlist.set("pp-watermark pp-watermark--fmt")
      .text.set(WATERMARK_FMT_[fmt])
      .css.setMany(PP_WATERMARKcss);

    // focused-only status overlay (big “invalid/valid/...” in red/green)
    const status = wrap.create.div()
      .classlist.set("pp-status")
      .text.set("")
      .css.setMany(PP_STATUScss);

    const textarea = wrap.create.textarea()
      .data.set("input", fmt)
      .css.setMany({
        ...PANEL_TEXTAREAcss,
        color: COLOR_FOR_FMT_[fmt],
      });


    const chip = status.create.span()
      .classlist.add("chip", "validity")
      .text.set(""); // focused-only; start empty


    copyBtn.listen.onClick(() => {
      const txt = textarea.getFormValue();

      const clip = globalThis.navigator?.clipboard?.writeText;
      if (!clip) return;

      void clip.call(navigator.clipboard, txt);
    });
    panels[fmt] = { fmt, panel, head, textarea, chip, bytes, copyBtn, wrap, wmFmt, status };
  }

  return relay.data({ root, panels });
}