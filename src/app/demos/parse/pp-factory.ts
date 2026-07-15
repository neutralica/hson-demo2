// pp_factory.ts

import type { LiveTree } from "hson-live";
import { _colors } from "../../core/consts/colors.consts";
import { _fontSize, øWATERMARK_FMT_ } from "../../core/consts/ui-consts";
import type { Fmt } from "../../core/types/core.types";
import { $PARSING_PANELS_ROOT, $PP_HEAD } from "../../phases/phase-3-demo/demo.consts";
import { UI_BTNcss, UI_2STACK_VALcss, UI_STACK_LABELcss, UI_PANEL_HEADERcss, UI_PANELcss, UI_PANEL_HEADcss, UI_2STACKcss, UI_TEXTcss, UI_BTN_HOVERcss } from "../../ui/panels/panels.css";
import type { Panels, PanelViewMode, PanelShell } from "../../ui/panels/panels.types";
import { mk_div_id, mk_div_cls, mk_span_cls } from "../../utils/makers";
import { init_parsing_panels } from "./init-pp";
import { PP_ROOTcss, PP_GRIDcss, PP_TEXTWRAPcss, PP_WATERMARKcss } from "./pp.css";


export type PpFactoryOpts = {
  fmts?: readonly Fmt[];
};

const PP_HEADER_BTNcss = {
  ...UI_BTNcss,
  fontSize: _fontSize.smol,
  padding: "0.4rem 0.5rem",
  letterSpacing: "0.04em",
  height: "fit-content",
};

const PP_HEADER_VALUEcss = {
  ...UI_2STACK_VALcss,
  fontSize: _fontSize.smol,
  lineHeight: "1",
};

const PP_HEADER_LABELcss = {
  ...UI_STACK_LABELcss,
  fontSize: _fontSize.smol,
  lineHeight: "1",
};


export function mount_parsing_panels(host: LiveTree): Panels {
  const pp = pp_factory(host);
  init_parsing_panels(pp);
  return pp;
}


export function pp_factory(hostBody: LiveTree, opts: PpFactoryOpts = {}): Panels {
  const fmts = opts.fmts ?? (["json", "hson", "html"] as const);
  let viewMode: PanelViewMode = "text";
  const old = hostBody.find.byId($PARSING_PANELS_ROOT);
  if (old) old.remove();

  const root = hostBody.create.div()
    .id.set($PARSING_PANELS_ROOT)
    .css.setMany(PP_ROOTcss);

  root.create.div()
    .css.setMany(UI_PANEL_HEADERcss)
    .text.set("~ parsing panels ~");

  const panelGrid = root.create.div()
    .css.setMany({
      ...PP_GRIDcss,
    });

  const panels = {} as Record<Fmt, PanelShell>;
  const syncPanelViewModeFns: Array<() => void> = [];

  function setPanelViewMode(next: PanelViewMode): void {
    viewMode = next;

    for (const sync of syncPanelViewModeFns) {
      sync();
    }
  }

  for (const fmt of fmts) {
    const panel = panelGrid.create.section()
      .data.set("role", `panel-${fmt}`)
      .css.setMany(UI_PANELcss);

    const head = mk_div_id(panel, fmt + "-head")
      .data.set("role", $PP_HEAD)
      .css.setMany(UI_PANEL_HEADcss);

    const copyBtn = mk_div_cls(head, "pp-copy")
      .text.set("copy")
      .css.setMany(PP_HEADER_BTNcss)
      .attr.setMany({
        "role": "button",
        "tabindex": "0",
        "aria-label": `copy ${fmt}`,
      });

    const bytesBox = mk_span_cls(head, "bytes-box")
      .css.setMany({
        ...UI_2STACKcss,
      });

    const bytesNum = bytesBox.create.div()
      .data.set("field", `${fmt}-bytes`)
      .css.setMany(PP_HEADER_VALUEcss)
      .text.set("0");

    bytesBox.create.div()
      .data.set("field", `${fmt}-label`)
      .css.setMany(PP_HEADER_LABELcss)
      .text.set("bytes");

    const statusBox = mk_span_cls(head, "status-box")
      .css.setMany({
        ...UI_2STACKcss,
      });

    const status = mk_div_cls(statusBox, "status-number")
      .css.setMany(PP_HEADER_VALUEcss)
      .text.set("--");

    mk_div_cls(statusBox, "status-label")
      .text.set("status")
      .css.setMany(PP_HEADER_LABELcss);

    const wrap = panel.create.div()
      .classlist.set("pp-textwrap")
      .css.setMany({
        ...PP_TEXTWRAPcss(fmt),
        display: "block",
      })
      .css.selector("&:hover > div.pp-watermark").setMany({
        color: _colors.greenlike,
      });

    const wmFmt = wrap.create.div()
      .classlist.set("pp-watermark pp-watermark--fmt")
      .text.set(øWATERMARK_FMT_[fmt])
      .css.setMany({
        ...PP_WATERMARKcss
      });

    const textarea = wrap.create.textarea()
      .data.set("input", fmt)
      .css.setMany({
        ...UI_TEXTcss,
        background: "transparent",
        color: _colors.fmt[fmt],
      });

    const nodeBox = panel.create.pre()
      .classlist.set("pp-nodebox")
      .css.setMany({
        ...PP_TEXTWRAPcss(null),
        display: "none",
        margin: "0",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        background: _colors.backhi,
        color: _colors.fmt[fmt],
      });

    const nodeText = nodeBox.create.div()
      .css.setMany({ ...UI_TEXTcss });

    const toggleBtn = head.create.div()
      .classlist.set("pp-toggle")
      .text.set("text")
      .css.setMany({
        ...PP_HEADER_BTNcss,
        ...UI_BTN_HOVERcss(_colors.txt.code),
      })
      .attr.setMany({
        "role": "button",
        "tabindex": "0",
        "aria-label": `toggle ${fmt} panel view mode`,
      });

    toggleBtn.listen.onClick(() => {
      const nextView: PanelViewMode = viewMode !== "text" ? "text" : "node";
      setPanelViewMode(nextView);
    });
    function syncPanelViewMode(): void {
      const isText = viewMode === "text";

      toggleBtn.data.set("mode", viewMode)
        .text.set(viewMode);

      wrap.css.setMany({ display: isText ? "block" : "none" });
      nodeBox.css.setMany({ display: isText ? "none" : "block" });
    }

    copyBtn.listen.onClick(() => {
      const clip = globalThis.navigator?.clipboard?.writeText;
      if (!clip) return;

      const textVisible = wrap.css.get.property("display") !== "none";
      const txt = textVisible
        ? (textarea.form.getValue() ?? "")
        : (nodeText.text.get() ?? "");

      void clip.call(navigator.clipboard, txt);
    });

    panels[fmt] = {
      fmt,
      panel,
      head,
      textarea,
      bytes: bytesNum,
      copyBtn,
      textBox: wrap,
      nodeText,
      wmFmt,
      status,
    };

    syncPanelViewModeFns.push(syncPanelViewMode);
    syncPanelViewMode();
  }

  return { root, panels };
}
