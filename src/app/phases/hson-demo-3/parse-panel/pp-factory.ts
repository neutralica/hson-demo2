// pp_factory.ts
import { hson, type LiveTree } from "hson-live";
import type { Fmt, Panels, PanelShell } from "./pp.types";
import { PP_PANEL_HEADER_TG_CSS } from "./pp.css";

import { PP_STATUScss, PP_TEXTWRAPcss, PP_WATERMARK_EMPTYcss, PP_WATERMARK_FMTcss } from "./pp2.css";
import { outcome, relay, relay_data, type Outcome, type OutcomeData } from "intrastructure";
import { $PARSING_PANELS_ROOT, $PP_HEAD, PP_COPYBTN_CSS } from "./pp.consts";
import { PANEL_TEXTAREAcss, PANELcss, PARSING_PANEL_ROOTcss } from "../demo-panels.css";
import { init_parsing_panels } from "./init.pp";

type PpFactoryOpts = {
  fmts?: readonly Fmt[];
  // includeNodeOutput?: boolean;
};


const EMPTY_SYNTAX: Record<Fmt, string> = {
  json: "{}",
  hson: "<>",
  html: "<></>",
} as const;

const WM_LABEL: Record<Fmt, string> = {
  json: "JSON",
  hson: "HSON",
  html: "HTML",
} as const;



export function mount_parsing_panels(host: LiveTree): Outcome<Panels> {
  const ppO = relay_data(pp_factory(host));
  init_parsing_panels(ppO);
  return relay.data(ppO);
}


// --- pp_factory ---
export function pp_factory(hostBody: LiveTree, opts: PpFactoryOpts = {}): Outcome<Panels> {
  const fmts = opts.fmts ?? (["json", "hson", "html"] as const);

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


    // CHANGED: keep head handle so we can hide/show focused-only status cleanly
    const head = panel.create.div()
      .data.set("role", $PP_HEAD)
      .css.setMany(PP_PANEL_HEADER_TG_CSS);

    const chip = head.create.span();
    chip.classlist.add("chip", "validity");
    chip.setText(""); // CHANGED: focused-only; start empty
    chip.css.setMany({ display: "none" }); // CHANGED

    const bytes = head.create.span();
    bytes.data.set("field", `${fmt}-bytes`);
    bytes.setText("0 bytes");

    // CHANGED: div instead of button (avoid browser button styling)
    const copyBtn = head.create.div()
      .classlist.set("pp-copy")
      .setText("copy")
      .css.setMany(PP_COPYBTN_CSS)
      .setAttrs({
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
      .setText(WM_LABEL[fmt])
      .css.setMany(PP_WATERMARK_FMTcss);

    const wmEmpty = wrap.create.div()
      .classlist.set("pp-watermark pp-watermark--empty")
      .setText(EMPTY_SYNTAX[fmt])
      .css.setMany(PP_WATERMARK_EMPTYcss);

    // focused-only status overlay (big “invalid/valid/...” in red/green)
    const status = wrap.create.div()
      .classlist.set("pp-status")
      .setText("")
      .css.setMany(PP_STATUScss);

    const textarea = wrap.create.textarea();
    textarea.data.set("input", fmt);
    textarea.css.setMany(PANEL_TEXTAREAcss);

    copyBtn.listen.onClick(() => {
      const txt = textarea.getFormValue();

      const clip = globalThis.navigator?.clipboard?.writeText;
      if (!clip) return;

      void clip.call(navigator.clipboard, txt);
    });
    panels[fmt] = { fmt, panel, head, textarea, chip, bytes, copyBtn, wrap, wmFmt, wmEmpty, status };
  }

  return relay.data({ root, panels });
}