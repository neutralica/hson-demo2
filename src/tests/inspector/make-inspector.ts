// inspector.ts

import { type LiveTree } from "hson-live";
import { LOG_SCROLLcss, THcss, tdNameCssBase, TDcss, ROW_SUITEcss, tdNameChildCss, TD_PREVIEW_ROWcss, ROW_CASEcss, PREVIEW_METAcss, PREVIEW_META_FAILcss, INSPECTORcss, BUTTON_BARcss, INSP_PREV_PREcss, INSP_CAP_ROWcss, INSP_T_HOSTcss } from "./inspector.css";
import { CLICKABLEcss } from "../../app/core/consts/css.consts";
import { clear_box, mk_table, mk_tr, mk_th, mk_td } from "./inspector.helpers";
import { render_report_html, open_report_window } from "./render-report";
import { loopreport_to_sections, report_to_sections } from "./report-section";
import { _fontSize } from "../../app/core/consts/ui-consts";
import { $CHIP_WIDTHstr, _freeze } from "../../app/demos/test/tests.consts";
import type { CaseKey, CaseMeta, CaseReport, TestAssertRow } from "../../app/demos/test/tests.types";
import { mk_div_cls, mk_div_id } from "../../app/utils/makers";
import { ROW_SUITE_FAILcss, ROW_CASE_FAILcss } from "./inspector.css";
import { $red_etc_, ACID_WASH_RGBA } from "../../app/core/consts/old-rgb.consts";
import { _colors } from "../../app/core/consts/colors.consts";
import { OKLCH_FLEURS } from "../../app/demos/fleurs/fleurs.consts";
import type { LoopReport } from "hson-live/diagnostics";
import { OKLCH_NEUTRALS } from "../../app/core/consts/oklch.consts";
import type { TestLog } from "../../app/demos/test/test-logger";


export type InspectorUi = Readonly<{
  render: () => void;
  show: () => void;
  hide: () => void;
  clear: () => void;
}>;



export type CaptureFn = (key: CaseKey) => Promise<LoopReport>; // you’ll tighten to LoopReport

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

type InspectorCaseWithAssertRows = Partial<CaseReport> & Readonly<{
  suite?: string;
  name?: string;
  status?: string;
  ms?: number;
  assertRows?: readonly TestAssertRow[];
}>;

function sections_to_text(sections: ReturnType<typeof report_to_sections>): string {
  return sections.map((s) => `## ${s.title}\n${s.bodyText}`).join("\n\n");
}

function escape_html_text(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function text_report_to_html(title: string, text: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escape_html_text(title)}</title>
<style>
  body { margin: 0; padding: 1rem; background: #050808; color: #dce6df; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  pre { white-space: pre-wrap; line-height: 1.45; font-size: 12px; }
</style>
</head>
<body>
<pre>${escape_html_text(text)}</pre>
</body>
</html>`;
}

function local_case_report_to_text(raw: unknown): string | undefined {
  const found = raw as InspectorCaseWithAssertRows | undefined;
  const assertRows = found?.assertRows ?? [];
  if (!assertRows.length) return undefined;

  const report = {
    suite: found?.suite ?? "—",
    name: found?.name ?? "—",
    status: found?.status === "fail" ? "fail" : "pass",
    ms: found?.ms,
    steps: found?.steps ?? [],
    assertRows,
  } as CaseReport;

  return sections_to_text(report_to_sections(report));
}
export function make_inspector(
  host: LiveTree,
  tlog: TestLog,
  opts?: { hideClass?: string },
  capture?: CaptureFn,
): InspectorUi {
  const hideClass = opts?.hideClass ?? "";

  let mainScrollEl: HTMLElement | null = null;

  const root = mk_div_id(host, "inspector-root")
    .css.setMany(INSPECTORcss);

  const tableHost = mk_div_cls(root, "insp-table-host").css.setMany(INSP_T_HOSTcss);

  const expandedSuites = new Set<string>();
  const expandedCasesBySuite = new Map<string, Set<CaseKey>>();

  const getExpandedCases = (suite: string): Set<CaseKey> => {
    const found = expandedCasesBySuite.get(suite);
    if (found) return found;

    const created = new Set<CaseKey>();
    expandedCasesBySuite.set(suite, created);
    return created;
  };

  // changed: one tiny helper keeps pass/fail coloring local to result text
  const applyResultColor = (cell: LiveTree, res: string): void => {
    if (res === "pass") {
      cell.css.set.color(_colors.greenlike);
      return;
    }

    if (res === "fail") {
      cell.css.set.color($red_etc_.heartsBlood);
      return;
    }

    cell.css.set.color(_colors.txt.main);
  };

  // changed: simpler text-button helper
  const mkTextButton = (host: LiveTree, label: string): LiveTree => {
    return host.create.div()
      .classlist.set("insp-text-btn")
      .attr.set("role", "button")
      .text.set(label)
      .css.setMany({
        color: _colors.txt.code,
        cursor: "pointer",
        userSelect: "none",
        padding: "0 0.5ch",
      });
  };

  const renderEmpty = (): void => {
    tableHost.empty();

    tableHost.create.div()
      .classlist.set("insp-empty-message")
      .text.set("choose from test suites or select 'all' to test transformer chain and LiveTree operations")
      .css.setMany({
        alignSelf: "center",
        margin: "auto",
        maxWidth: "72ch",
        padding: "0.75rem 1rem",
        boxSizing: "border-box",
        color: _colors.txt.grey,
        textAlign: "center",
        lineHeight: "1.45",
        border: "1px solid rgba(190, 205, 196, 0.16)",
        background: "rgba(3, 10, 10, 0.28)",
      });
  };

  const renderAll = (): void => {
    const prevScroll = mainScrollEl?.scrollTop ?? 0;

    tableHost.empty();

    const suites = tlog.listSuites();
    if (!suites.length) {
      renderEmpty();
      return;
    }

    const scroll = tableHost.create.div().classlist.set("insp-scroll main-scroll");
    scroll.css.setMany({
      ...LOG_SCROLLcss,
      width: "100%",
      height: "100%",
      flex: "1 1 100%",
      minWidth: "0",
      minHeight: "0",
      overflowY: "auto",
      overflowX: "hidden",
    });

    mainScrollEl = scroll.dom.el() as HTMLElement;

    const { table, thead, tbody } = mk_table(scroll, "insp-main");

    // changed: table owns width; scroll owns scrolling
    table.css.setMany({
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    });

    const hr = mk_tr(thead, "insp-head-row");

    mk_th(hr, "c-res", "res").css.setMany({
      ...THcss,
      width: $CHIP_WIDTHstr,
      maxWidth: $CHIP_WIDTHstr,
      color: _colors.txt.list,
    });

    mk_th(hr, "c-name", "suite / group / case").css.setMany({
      ...THcss,
      ...tdNameCssBase,
      color: _colors.txt.list,
    });

    mk_th(hr, "c-ms", "ms").css.setMany({
      ...THcss,
      width: $CHIP_WIDTHstr,
      maxWidth: $CHIP_WIDTHstr,
      color: _colors.txt.list,
    });

    for (const s of suites) {
      const suiteName = s.suite;
      const suiteIsOpen = expandedSuites.has(suiteName);
      const caret = suiteIsOpen ? "▼" : "▶";

      const sr = mk_tr(tbody, "insp-suite-row");
      sr.css.setMany({
        ...ROW_SUITEcss,
        cursor: "pointer",
      });

      if (s.fail > 0) sr.css.setMany(ROW_SUITE_FAILcss);

      mk_td(sr, "c-res", caret).css.setMany(TDcss);

      mk_td(sr, "c-name", `${suiteName}  (${s.pass}/${s.fail}/${s.skip})`)
        .css.setMany({
          ...TDcss,
          ...tdNameCssBase,
          color: _colors.txt.main,
        });

      mk_td(sr, "c-ms", s.ms !== undefined ? s.ms.toFixed(1) : "—")
        .css.setMany({
          ...TDcss,
          color: _colors.txt.main,
        });

      // changed: whole suite row toggles
      sr.listen.onClick((me) => {
        _stop(me);

        if (suiteIsOpen) expandedSuites.delete(suiteName);
        else expandedSuites.add(suiteName);

        renderAll();
      });

      if (!suiteIsOpen) continue;

      const expandedCases = getExpandedCases(suiteName);

      for (const c of tlog.listCases(suiteName)) {
        const res = c.status ?? "—";
        const ms = c.ms !== undefined ? c.ms.toFixed(1) : "—";
        const preview = c.meta?.preview ?? "";
        const caseIsOpen = expandedCases.has(c.key);
        const isfail = res === "fail";
        const cr = mk_tr(tbody, "insp-case-row");
        cr.css.setMany(
          isfail ? ROW_CASE_FAILcss : ROW_CASEcss,
          // cursor: "pointer",
        );

        const resCell = mk_td(cr, "c-res", res);
        resCell.css.setMany(TDcss);
        applyResultColor(resCell, res);

        mk_td(cr, "c-name", c.name).css.setMany({
          ...TDcss,
          ...tdNameChildCss,
          color: isfail ? "red" : _colors.txt.main,
        });

        mk_td(cr, "c-ms", ms).css.setMany({
          ...TDcss,
          color: _colors.txt.code,
        });

        // changed: whole case row toggles, not only the name cell
        cr.listen.onClick((me) => {
          _stop(me);

          if (caseIsOpen) expandedCases.delete(c.key);
          else expandedCases.add(c.key);

          renderAll();
        });

        if (!caseIsOpen) continue;

        const pr = mk_tr(tbody, "insp-case-preview-row");
        const cell = pr.create.td().classlist.set("insp-case-preview-cell");

        cell.attr.set("colspan", "3");
        cell.css.setMany(TD_PREVIEW_ROWcss);
        cell.empty();

        const topRow = cell.create.div().classlist.set("insp-cap-row");
        topRow.css.setMany(INSP_CAP_ROWcss);

        const metaBox = topRow.create.div().classlist.set("insp-cap-meta");
        metaBox.css.setMany({
          ...PREVIEW_METAcss,
          color: _colors.txt.main,
        });

        if (res === "fail") metaBox.css.setMany(PREVIEW_META_FAILcss);

        metaBox.text.set(`${c.suite} :: ${c.name}`);

        const btnBar = topRow.create.div().classlist.set("insp-cap-btnbar");
        btnBar.css.setMany(BUTTON_BARcss);

        const viewBtn = mkTextButton(btnBar, "view");
        const copyBtn = mkTextButton(btnBar, "copy");

        const hasLocalReport = local_case_report_to_text(tlog.getCase(c.key)) !== undefined;

        if (!capture && !hasLocalReport) {
          viewBtn.css.setMany({ opacity: "0.45", cursor: "default" });
          copyBtn.css.setMany({ opacity: "0.45", cursor: "default" });
        }

        copyBtn.listen.onClick(async (me) => {
          _stop(me);

          copyBtn.text.set("copying");

          try {
            const localText = local_case_report_to_text(tlog.getCase(c.key));
            if (localText !== undefined) {
              await navigator.clipboard.writeText(localText);
              copyBtn.text.set("copied");
              return;
            }

            if (!capture) return;

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

          viewBtn.text.set("opening");

          try {
            const localText = local_case_report_to_text(tlog.getCase(c.key));
            if (localText !== undefined) {
              open_report_window(text_report_to_html(`${c.suite} :: ${c.name}`, localText));
              viewBtn.text.set("view");
              return;
            }

            if (!capture) return;

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
        pre.css.setMany(INSP_PREV_PREcss);

        pre.text.set(preview || "—");

        // changed: preview itself collapses the case, preserving old behavior
        pre.css.setMany(CLICKABLEcss);
        pre.listen.onClick((me) => {
          _stop(me);
          expandedCases.delete(c.key);
          renderAll();
        });
      }
    }

    queueMicrotask(() => {
      scroll.dom.el()!.scrollTop = prevScroll;
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (mainScrollEl) mainScrollEl.scrollTop = prevScroll;
      });
    });
  };

  const clear = (): void => {
    tableHost.empty();
    expandedSuites.clear();
    expandedCasesBySuite.clear();
    renderEmpty();
  };

  const render = (): void => renderAll();

  const show = (): LiveTree => root.classlist.remove(hideClass);
  const hide = (): LiveTree => root.classlist.add(hideClass);

  renderEmpty();

  return Object.freeze({ render, show, hide, clear });
}
