// pp_factory.ts
import { hson, type LiveTree } from "hson-live";
import type { Fmt, Panels, PanelShell } from "../panels/panels.types";
import { PP_HEADERcss } from "./pp.css";

import { PP_STATUScss, PP_TEXTWRAPcss, PP_WATERMARK_EMPTYcss, PP_WATERMARK_FMTcss } from "./pp.css";
import { outcome, relay, relay_data, type Outcome, type OutcomeData } from "intrastructure";
import { $PARSING_PANELS_ROOT, $PP_HEAD } from "../demo.consts";
import { PP_COPYBTNcss } from "./pp.css";
import { PANEL_TEXTAREAcss, PANELcss, PARSING_PANEL_ROOTcss } from "../panels/demo-panels.css";
import { init_parsing_panels } from "./init.pp";

type PpFactoryOpts = {
  fmts?: readonly Fmt[];
  // includeNodeOutput?: boolean;
};


// const EMPTY_SYNTAX: Record<Fmt, string> = {
//   json: "{}",
//   hson: "<>",
//   html: "<></>",
// } as const;

const WM_LABEL: Record<Fmt, string> = {
  json: "{JSON}",
  hson: "<HSON>",
  html: "<HTML/>",
} as const;



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

  const panels = {} as Record<Fmt, PanelShell>;

  for (const fmt of fmts) {
    const panel = root.create.section()
      .data.set("role", `panel-${fmt}`)
      .css.setMany(PANELcss);


    // keep head handle so we can hide/show focused-only status cleanly
    const head = panel.create.div()
      .data.set("role", $PP_HEAD)
      .css.setMany(PP_HEADERcss);


    const bytes = head.create.span();
    bytes.data.set("field", `${fmt}-bytes`);
    bytes.text.set("0 bytes");

    // div instead of button (avoid browser button styling)
    const copyBtn = head.create.div()
      .classlist.set("pp-copy")
      .text.set("copy")
      .css.setMany(PP_COPYBTNcss)
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
      .text.set(WM_LABEL[fmt])
      .css.setMany(PP_WATERMARK_FMTcss);

    const wmEmpty = wrap.create.div()
      .classlist.set("pp-watermark pp-watermark--empty")
      // .text.set(EMPTY_SYNTAX[fmt])
      .css.setMany(PP_WATERMARK_EMPTYcss);

    // focused-only status overlay (big “invalid/valid/...” in red/green)
    const status = wrap.create.div()
      .classlist.set("pp-status")
      .text.set("")
      .css.setMany(PP_STATUScss);

    const textarea = wrap.create.textarea();
    textarea.data.set("input", fmt);
    textarea.css.setMany(PANEL_TEXTAREAcss);

    const chip = textarea.create.span();
    chip.classlist.add("chip", "validity");
    chip.text.set(""); // focused-only; start empty


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