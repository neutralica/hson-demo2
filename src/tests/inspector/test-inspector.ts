// inspector.ts

import { type LiveTree } from "hson-live";
import { LOG_SCROLLcss, THcss, tdNameCssBase, TDcss, ROW_SUITEcss, ROW_GROUPcss, tdNameChildCss, CLICKABLEcss, TD_PREVIEW_ROWcss, INSPECTOR_ROOTcss, MADE_BUTTONcss, ROW_CASEcss, PREVIEW_METAcss, PREVIEW_META_FAILcss } from "./inspector.css";
import { clear_box, mk_table, mk_tr, mk_th, mk_td } from "./inspector.helpers";
import { render_report_html, open_report_window } from "./render-report";
import { loopreport_to_sections } from "./report-section";
import type { LoopReport } from "../../../../hson-live/dist/diagnostics/loop-3.test";
import { $txt_ } from "../../app/core/consts/ui-consts";
import type { TestLog } from "../test-log";
import { $CHIP_WIDTHstr, _freeze } from "../tests.consts";
import type { CaseKey, CaseMeta } from "../tests.types";
import { mk_div_cls, mk_div_id } from "../../app/utils/makers";
import { MENU_FONT, PANEL_SAFETYcss } from "../../app/phases/phase-3-demo/demo.css";
import { ROW_SUITE_FAILcss, ROW_CASE_FAILcss } from "./inspector.css";
import { $cols_, $red_etc_, ACID_WASH_RGBA } from "../../app/core/consts/colors.consts";


export type InspectorUi = Readonly<{
  render: () => void;
  show: () => void;
  hide: () => void;
  clear: () => void;
}>;



export type CaptureFn = (key: CaseKey) => Promise<LoopReport>; // you’ll tighten to LoopReport
let mainScrollEl: HTMLElement | null = null;

const _stop = (ev: unknown): void => {
  const e = ev as { stopPropagation?: () => void; preventDefault?: () => void };
  e.preventDefault?.();
  e.stopPropagation?.();
};

// Step is { step, ok, error? }.
// Use artifacts for “full chain” capture printing.
export function report_to_text(r: LoopReport, meta?: CaseMeta): string {
  const input = meta?.fixture ?? "";

  const secs = loopreport_to_sections(r);

  // ADDED: inject “input” into Summary (or create a new section if you prefer)
  const withInput = secs.map((s) => {
    if (s.title !== "Summary") return s;

    const block =
      input.length
        ? `\n\n=== input (as-fed) ===\n${input}`
        : `\n\n=== input (as-fed) ===\n—`;

    return _freeze({ ...s, bodyText: `${s.bodyText}${block}` });
  });

  return withInput.map((s) => `## ${s.title}\n${s.bodyText}`).join("\n\n");
}

export function report_to_text_alt(r: LoopReport, meta?: Record<string, string>): string {
  const input = meta?.input ?? "";
  const secs = loopreport_to_sections(r);

  const inputSec = _freeze({
    title: "Input fmt",
    bodyText: input.length ? input : "—",
  });

  return [inputSec, ...secs].map((s) => `## ${s.title}\n${s.bodyText}`).join("\n\n");
}

export function create_inspector(
  host: LiveTree,
  tlog: TestLog,
  opts?: { hideClass?: string },
  capture?: CaptureFn,                 // optional
): InspectorUi {
  const hideClass = opts?.hideClass ?? "";

  const root = mk_div_id(host, "inspector").css.setMany({
    ...PANEL_SAFETYcss,
    width: "100%",
    // height: "100%",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    overflow: "hidden",
    background: $cols_.bckdeep
  });
  const header = mk_div_cls(root, "insp-header").css.setMany({
    // header is natural height
    ...PANEL_SAFETYcss,
  });

  const body = mk_div_cls(root, "insp-body").css.setMany({
    // body is the scroll region (or you can put this on tableHost)
    ...PANEL_SAFETYcss,
    overflowY: "scroll",
    overflowX: "auto",
  });


  // main table host
  const tableHost = mk_div_cls(body, "insp-table-host").css.setMany({
    ...PANEL_SAFETYcss
  });

  // ---------------------------
  // UI state (expansion)
  // ---------------------------
  const expandedSuites = new Set<string>();
  const expandedCasesBySuite = new Map<string, Set<CaseKey>>();

  const getExpandedCases = (suite: string): Set<CaseKey> => {
    const s = expandedCasesBySuite.get(suite);
    if (s) return s;
    const ns = new Set<CaseKey>();
    expandedCasesBySuite.set(suite, ns);
    return ns;
  };


  // ---------------------------
  // component styles (no selectors)
  // ---------------------------


  // byte->kb helper (approx, UTF-8)
  const kbOf = (txt: string): string => {
    if (!txt) return "—";
    const bytes = new TextEncoder().encode(txt).length;
    return (bytes / 1024).toFixed(1);
  };

  // grouping: you already have this logic; keep it deterministic
  const groupKeyFor = (name: string): string => {
    const dot = name.indexOf(".");
    if (dot > 0) return name.slice(0, dot);

    const parts = name.split("__").filter(Boolean);
    if (parts.length >= 3) return parts.slice(0, 3).join("__");
    if (parts.length >= 2) return parts.slice(0, 2).join("__");
    return name;
  };

  // ---------------------------
  // main table: suite->group->case
  // ---------------------------

  const renderAll = (): void => {
    const prevScroll = mainScrollEl?.scrollTop ?? 0;
    clear_box(tableHost);

    const suites = tlog.listSuites();

    const scroll = tableHost.create.div().classlist.set("insp-scroll main-scroll");
    scroll.css.setMany(LOG_SCROLLcss);
    mainScrollEl = scroll.asDomElement() as HTMLElement;


    const { table, thead, tbody } = mk_table(scroll, "insp-main");
    table.css.set.overflowY("scroll");
    // header columns are stable
    const hr = mk_tr(thead, "insp-head-row");
    mk_th(hr, "c-res", "res").css.setMany({ ...THcss, width: $CHIP_WIDTHstr, maxWidth: $CHIP_WIDTHstr });
    mk_th(hr, "c-name", "suite / group / case").css.setMany({ ...THcss, ...tdNameCssBase });
    mk_th(hr, "c-ms", "ms").css.setMany({ ...THcss, width: $CHIP_WIDTHstr, maxWidth: $CHIP_WIDTHstr });

    if (!suites.length) {
      const r = mk_tr(tbody, "insp-empty");
      mk_td(r, "c-empty", "no suites").css.setMany(TDcss);
      return;
    }

    for (const s of suites) {
      const suiteName = s.suite;
      const suiteIsOpen = expandedSuites.has(suiteName);
      const caret = suiteIsOpen ? "▼" : "▶";

      // suite row
      const sr = mk_tr(tbody, "insp-suite-row");
      sr.css.setMany(ROW_SUITEcss);

      if (s.fail > 0) sr.css.setMany(ROW_SUITE_FAILcss);

      mk_td(sr, "c-res", caret).css.setMany(TDcss);
      mk_td(sr, "c-name", `${suiteName}  (${s.pass}/${s.fail}/${s.skip})`).css.setMany({ ...TDcss, ...tdNameCssBase });
      // mk_td(sr, "c-kb", "—").css.setMany(TDcss);
      mk_td(sr, "c-ms", s.ms !== undefined ? s.ms.toFixed(1) : "—").css.setMany(TDcss);

      sr.listen.onClick((me) => {
        _stop(me)
        if (suiteIsOpen) expandedSuites.delete(suiteName);
        else expandedSuites.add(suiteName);
        renderAll();
      });

      if (!suiteIsOpen) continue;

      const cases = tlog.listCases(suiteName);
      if (!cases.length) continue;

      // group cases

      // render every case directly; no grouping during debug
      const expandedCases = getExpandedCases(suiteName);

      for (const c of cases) {
        const res = c.status ?? "—";
        const ms = c.ms !== undefined ? c.ms.toFixed(1) : "—";
        const preview = c.meta?.preview ?? "";

        // case row
        const cr = mk_tr(tbody, "insp-case-row");
        cr.css.setMany(ROW_CASEcss);
        if (res === "fail") cr.css.setMany(ROW_CASE_FAILcss);

        mk_td(cr, "c-res", res).css.setMany(TDcss);

        const nameCell = mk_td(cr, "c-name", c.name);
        nameCell.css.setMany({ ...TDcss, ...tdNameChildCss, ...CLICKABLEcss });

        mk_td(cr, "c-ms", ms).css.setMany(TDcss);

        // click case name toggles this exact case
        nameCell.listen.onClick((me) => {
          _stop(me);
          if (expandedCases.has(c.key)) expandedCases.delete(c.key);
          else expandedCases.add(c.key);
          renderAll();
        });

        // preview row below
        if (expandedCases.has(c.key)) {
          const pr = mk_tr(tbody, "insp-case-preview-row");
          const cell = pr.create.td().classlist.set("insp-case-preview-cell");

          cell.attr.set("colspan", "3");
          cell.css.setMany(TD_PREVIEW_ROWcss);

          cell.empty();

          const topRow = cell.create.div().classlist.set("insp-cap-row");
          topRow.css.setMany({
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "8px",
            alignItems: "center",
            marginBottom: "8px",
          });

          const metaBox = topRow.create.div().classlist.set("insp-cap-meta");
          metaBox.css.setMany(PREVIEW_METAcss);
          if (res === "fail") metaBox.css.setMany(PREVIEW_META_FAILcss);
          metaBox.text.set(`${c.suite} :: ${c.name}`);

          const btnBar = topRow.create.div().classlist.set("insp-cap-btnbar");
          btnBar.css.setMany({
            display: "flex",
            gap: "8px",
            alignItems: "center",
            justifyContent: "flex-end",
          });

          const mkBtn = (host: LiveTree, label: string): LiveTree => {
            const b = host.create.div().classlist.set("insp-cap-btn");
            b.text.set(label);
            b.attr.set("role", "button");
            b.css.setMany(MADE_BUTTONcss);
            return b;
          };

          const viewBtn = mkBtn(btnBar, "view");
          const copyBtn = mkBtn(btnBar, "copy");

          // keep fail tint on the actual case row's buttons
          if (res === "fail") {
            viewBtn.css.set.color($red_etc_.heartsBlood);
            copyBtn.css.set.color($red_etc_.heartsBlood);
          }

          const hasCapture = !!capture;
          if (!hasCapture) {
            viewBtn.css.setMany({ opacity: "0.45", cursor: "default" });
            copyBtn.css.setMany({ opacity: "0.45", cursor: "default" });
          }

          copyBtn.listen.onClick(async (me) => {
            _stop(me);
            if (!capture) return;

            copyBtn.text.set("copying…");

            try {
              const report = await capture(c.key);
              const meta = tlog.getCase(c.key)?.meta;
              const txt = report_to_text(report, meta);

              await navigator.clipboard.writeText(txt);
              copyBtn.text.set("copied");
            } catch (e) {
              console.error(e);
              copyBtn.text.set("failed");
            } finally {
              window.setTimeout(() => copyBtn.text.set("copy"), 900);
            }
          });

          viewBtn.listen.onClick(async (me) => {
            _stop(me);
            if (!capture) return;

            viewBtn.text.set("opening…");

            try {
              const report = await capture(c.key);
              const meta = tlog.getCase(c.key)?.meta;
              const render = render_report_html(c.key, c.name, c.suite, report, meta);

              open_report_window(render.html);
              viewBtn.text.set("view");
            } catch (e) {
              console.error(e);
              viewBtn.text.set("failed");
              window.setTimeout(() => viewBtn.text.set("view"), 900);
            }
          });

          const pre = cell.create.pre().classlist.set("insp-preview-pre");
          pre.css.setMany({
            margin: "0",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.35)",
            overflow: "auto",
            maxHeight: "100%",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          });
          pre.text.set(preview || "—");

          pre.css.setMany(CLICKABLEcss);
          pre.listen.onClick((me) => {
            _stop(me);
            expandedCases.delete(c.key);
            renderAll();
          });

          queueMicrotask(() => {
            scroll.asDomElement()!.scrollTop = prevScroll;
          });
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (mainScrollEl) mainScrollEl.scrollTop = prevScroll;
            });
          });
        }
      }
    }
  };

  const clear = (): void => {
    tableHost.empty();
    expandedSuites.clear();
    expandedCasesBySuite.clear();
  };

  const render = (): void => renderAll();

  const show = (): LiveTree => root.classlist.remove(hideClass);
  const hide = (): LiveTree => root.classlist.add(hideClass);

  // baseline
  root.css.setMany(INSPECTOR_ROOTcss);

  body.css.setMany({ display: "grid", gap: "6px" });

  return Object.freeze({ render, show, hide, clear });
}
