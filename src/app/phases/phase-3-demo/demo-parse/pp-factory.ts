// pp_factory.ts
import { hson, type LiveTree } from "hson-live";

import { relay, relay_data, type Outcome } from "intrastructure";
import type { Panels, PanelShell } from "../../../ui/panels/panels.types";
import type { Fmt } from "../../../core/types/core.types";
import { $PARSING_PANELS_ROOT, $PP_HEAD } from "../demo.consts";
import { PARSING_PANEL_ROOTcss, PP_COPYBTNcss, PP_GRIDcss, PP_HEADERcss, PP_STATUScss, PP_TEXTWRAPcss, PP_WATERMARKcss } from "./pp.css";
import { COLOR_FOR_FMT_, WATERMARK_FMT_ } from "../../../core/consts/ui-consts";
import { PANEL_TEXTAREAcss, PANELcss } from "../../../../tests/demo-test/tp-panels.css";
import { set_alpha } from "../../../core/helpers/color-helpers";
import { init_parsing_panels } from "./init-pp";
import { COLORS_ } from "../../../core/consts/colors.consts";

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

    const head = panel.create.div()
      .id.set("fmt-header")
      .data.set("role", $PP_HEAD)
      .css.setMany(PP_HEADERcss);

    const bytes = head.create.span()
      .data.set("field", `${fmt}-bytes`)
      .text.set("0 bytes");

    // NEW: view toggle group
    const modeGroup = head.create.div()
      .classlist.set("pp-mode-group")
      .css.setMany({
        display: "flex",
        gap: "6px",
        alignItems: "center",
      });

    const modeTextBtn = modeGroup.create.div()
      .classlist.set("pp-mode pp-mode--text")
      .text.set("text")
      .css.setMany(PP_COPYBTNcss)
      .attr.setMany({
        "role": "button",
        "tabindex": "0",
        "aria-label": `show ${fmt} text view`,
      });

    const modeNodeBtn = modeGroup.create.div()
      .classlist.set("pp-mode pp-mode--nodes")
      .text.set("nodes")
      .css.setMany(PP_COPYBTNcss)
      .attr.setMany({
        "role": "button",
        "tabindex": "0",
        "aria-label": `show ${fmt} node view`,
      });

    const copyBtn = head.create.div()
      .classlist.set("pp-copy")
      .text.set("copy")
      .css.setMany(PP_COPYBTNcss)
      .attr.setMany({
        "role": "button",
        "tabindex": "0",
        "aria-label": `copy ${fmt}`,
      });

    const wrap = panel.create.div()
      .classlist.set("pp-textwrap")
      .css.setMany({
        ...PP_TEXTWRAPcss(fmt),
        display: "block", 
      });

    const wmFmt = wrap.create.div()
      .classlist.set("pp-watermark pp-watermark--fmt")
      .text.set(WATERMARK_FMT_[fmt])
      .css.setMany(PP_WATERMARKcss);
      

    const status = wrap.create.div()
      .classlist.set("pp-status")
      .text.set("")
      .css.setMany(PP_STATUScss);

    const textarea = wrap.create.textarea()
      .data.set("input", fmt)
      .css.setMany({
        ...PANEL_TEXTAREAcss,
        background: "transparent",
        color: "inherit",
      });

    // NEW: node view box
    const nodeBox = panel.create.pre()
      .classlist.set("pp-nodebox")
      .css.setMany({
        ...PP_TEXTWRAPcss(null),
        display: "none",
        margin: "0",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        background: COLORS_.bckdeep,
        color: "inherit",
      })
      .text.set("");
    
    const nodeText = nodeBox.create.textarea()
      .css.setMany({
        ...PANEL_TEXTAREAcss,
        
    })

    const chip = status.create.span()
      .classlist.add("chip", "validity")
      .text.set("");

    // NEW: simple local toggle helpers
    function showTextView(): void {
      wrap.css.setMany({ display: "block" });
      nodeBox.css.setMany({ display: "none" });
    }

    function showNodeView(): void {
      wrap.css.setMany({ display: "none" });
      nodeBox.css.setMany({ display: "block" });
    }

    modeTextBtn.listen.onClick(() => showTextView());
    modeNodeBtn.listen.onClick(() => showNodeView());

    copyBtn.listen.onClick(() => {
      const clip = globalThis.navigator?.clipboard?.writeText;
      if (!clip) return;

      const textVisible = textarea.css.get.property("display") !== "none";
      const txt = textVisible
        ? (textarea.getFormValue() ?? "")
        : (nodeBox.text.get() ?? "");

      void clip.call(navigator.clipboard, txt);
    });

    panels[fmt] = {
      fmt,
      panel,
      head,
      textarea,
      chip,
      bytes,
      copyBtn,
      wrap,
      wmFmt,
      status,

      // modeTextBtn,
      // modeNodeBtn,
      nodeBox: nodeText,
    };
  }

  return relay.data({ root, panels });
}