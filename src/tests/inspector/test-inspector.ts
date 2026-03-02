// inspector.ts

import { type LiveTree } from "hson-live";
import { LOG_WRAPcss, THcss, tdNameCssBase, TDcss, ROW_SUITEcss, ROW_GROUPcss, tdNameChildCss, CLICKABLEcss, TD_PREVIEW_ROWcss } from "./inspector.css";
import { clear_box, mk_table, mk_tr, mk_th, mk_td } from "./inspector.helpers";
import { render_report_html, open_report_window } from "./render-report";
import { loopreport_to_sections } from "./report-section";
import type { LoopReport } from "../../../../hson-live/dist/diagnostics/loop-3.test";
import { $txt_ } from "../../app/consts/ui-consts";
import { ROW_SUITE_FAILcss, ROW_GROUP_FAILcss, ROW_CASE_FAILcss } from "../../app/phases/hson-demo-3/panels/demo-panels.css";
import type { TestLog } from "../test-log";
import { $CHIP_WIDTHstr, _freeze } from "../tests.consts";
import type { CaseKey, CaseMeta } from "../tests.types";
import { make_div_class, make_div_id } from "../../app/utils/makers";
import { PANEL_SAFETYcss } from "../../app/phases/hson-demo-3/demo.css";


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
    title: "Input",
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

  const root = make_div_id(host, "inspector").css.setMany({
    ...PANEL_SAFETYcss,
    width: "100%",
    height: "100%",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    overflow: "hidden",
  });
  const header = make_div_class(root, "insp-header").css.setMany({
    // header is natural height
    ...PANEL_SAFETYcss,
  });

  const body = make_div_class(root, "insp-body").css.setMany({
    // CHANGED: body is the scroll region (or you can put this on tableHost)
    ...PANEL_SAFETYcss,
    overflowY: "auto",
    overflowX: "auto",
  });

  // dynamic 1-col / 2-col
  const cols = make_div_class(body, "insp-cols").css.setMany({
    ...PANEL_SAFETYcss,
    display: "grid",
    // whatever your 1/2 col behavior is, keep it here
  });
  const main = make_div_class(cols, "insp-main").css.setMany({
    ...PANEL_SAFETYcss,
  });

  // main table host
  const tableHost = make_div_class(main, "insp-table-host").css.setMany({
    ...PANEL_SAFETYcss
  });

  // ---------------------------
  // UI state (expansion)
  // ---------------------------
  const expandedSuites = new Set<string>();
  const expandedGroupsBySuite = new Map<string, Set<string>>();
  const expandedCasesBySuite = new Map<string, Set<CaseKey>>();

  const getExpandedGroups = (suite: string): Set<string> => {
    const s = expandedGroupsBySuite.get(suite);
    if (s) return s;
    const ns = new Set<string>();
    expandedGroupsBySuite.set(suite, ns);
    return ns;
  };

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
    const fails = tlog.listFailures();
    const failKeys = new Set<CaseKey>();
    const failGroupsBySuite = new Map<string, Set<string>>();
    const failSuites = new Set<string>();

    for (const f of fails) {
      const key = `${f.suite}::${f.name}` as CaseKey;
      failKeys.add(key);
      failSuites.add(f.suite);

      const gk = groupKeyFor(f.name);
      let gs = failGroupsBySuite.get(f.suite);
      if (!gs) { gs = new Set<string>(); failGroupsBySuite.set(f.suite, gs); }
      gs.add(gk);
    }

    const wrap = tableHost.create.div().classlist.set("insp-scroll main-scroll");
    wrap.css.setMany(LOG_WRAPcss);
    mainScrollEl = wrap.asDomElement() as HTMLElement;


    const { thead, tbody } = mk_table(wrap, "insp-main");

    // header columns are stable
    const hr = mk_tr(thead, "insp-head-row");
    mk_th(hr, "c-res", "res").css.setMany({ ...THcss, width: $CHIP_WIDTHstr, maxWidth: $CHIP_WIDTHstr });
    mk_th(hr, "c-name", "suite / group / case").css.setMany({ ...THcss, ...tdNameCssBase });
    mk_th(hr, "c-kb", "kb").css.setMany({ ...THcss, width: $CHIP_WIDTHstr, maxWidth: $CHIP_WIDTHstr });
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
      mk_td(sr, "c-kb", "—").css.setMany(TDcss);
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
      type CaseRow = (typeof cases)[number];
      const groups = new Map<string, CaseRow[]>();
      const order: string[] = [];

      for (const c of cases) {
        const gk = groupKeyFor(c.name);
        let arr = groups.get(gk);
        if (!arr) {
          arr = [];
          groups.set(gk, arr);
          order.push(gk);
        }
        arr.push(c);
      }

      const expandedGroups = getExpandedGroups(suiteName);
      const expandedCases = getExpandedCases(suiteName);

      for (const gk of order) {
        const members = groups.get(gk)!;
        const groupIsOpen = expandedGroups.has(gk);
        const gCaret = groupIsOpen ? "▼" : "▶";

        // group stats + kb sum (based on *snipped previews*, not full reports)
        let pass = 0, fail = 0, skip = 0;
        let msTotal = 0;
        let bytesTotal = 0;

        for (const c of members) {
          if (c.status === "pass") pass += 1;
          else if (c.status === "fail") fail += 1;
          else if (c.status === "skip") skip += 1;

          if (c.ms !== undefined) msTotal += c.ms;

          const string = c.meta?.fixture ?? "";
          if (string) bytesTotal += new TextEncoder().encode(string).length;
        }

        // group row
        const gr = mk_tr(tbody, "insp-group-row");
        gr.css.setMany(ROW_GROUPcss);

        if (fail > 0) gr.css.setMany(ROW_GROUP_FAILcss);

        mk_td(gr, "c-res", gCaret).css.setMany(TDcss);
        mk_td(gr, "c-name", `${gk}  (${pass}/${fail}/${skip})`).css.setMany({ ...TDcss, ...tdNameCssBase });
        mk_td(gr, "c-kb", bytesTotal ? (bytesTotal / 1024).toFixed(1) : "—").css.setMany(TDcss);
        mk_td(gr, "c-ms", msTotal ? msTotal.toFixed(1) : "—").css.setMany(TDcss);

        gr.listen.onClick((ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (groupIsOpen) expandedGroups.delete(gk);
          else expandedGroups.add(gk);
          renderAll();
        });

        if (!groupIsOpen) continue;
        for (const c of members) {

          const res = c.status ?? "—";
          const ms = c.ms !== undefined ? c.ms.toFixed(1) : "—";
          const preview = c.meta?.preview ?? "";

          // case row
          const cr = mk_tr(tbody, "insp-case-row");
          if (res === "fail") cr.css.setMany(ROW_CASE_FAILcss);

          mk_td(cr, "c-res", res).css.setMany(TDcss);

          const nameCell = mk_td(cr, "c-name", c.name);
          nameCell.css.setMany({ ...TDcss, ...tdNameChildCss, ...CLICKABLEcss });

          mk_td(cr, "c-kb", preview ? kbOf(preview) : "—").css.setMany(TDcss);
          mk_td(cr, "c-ms", ms).css.setMany(TDcss);

          // click case name toggles “preview row below”
          nameCell.listen.onClick((me) => {
            _stop(me);
            if (expandedCases.has(c.key)) expandedCases.delete(c.key);
            else expandedCases.add(c.key);
            renderAll();
          });

          // preview row below (snipped preview only)
          if (expandedCases.has(c.key)) {
            const pr = mk_tr(tbody, "insp-case-preview-row");
            const cell = pr.create.td().classlist.set("insp-case-preview-cell");
            cell.setAttrs("colspan", "4");
            cell.css.setMany(TD_PREVIEW_ROWcss);

            // build composite content; never call cell.text.set after this
            cell.empty();

            // header row
            const topRow = cell.create.div().classlist.set("insp-cap-row");
            topRow.css.setMany({
              display: "grid",
              gridTemplateColumns: "auto 12ch 12ch",
              gap: "8px",
              alignItems: "center",
              marginBottom: "8px",
            });

            const metaBox = topRow.create.div().classlist.set("insp-cap-meta");
            metaBox.css.setMany({
              opacity: "0.85",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            });
            metaBox.text.set(`${c.suite} :: ${c.name}`);

            // use div-buttons to avoid focus scroll + default button behavior
            const mkBtn = (label: string): LiveTree => {
              const b = topRow.create.div().classlist.set("insp-cap-btn");
              b.text.set(label);
              b.setAttrs("role", "button");
              b.css.setMany({
                maxWidth: "10ch",
                padding: "4px 8px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                userSelect: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                margin: "auto"
              });
              return b;
            };

            const copyBtn = mkBtn("copy");
            const viewBtn = mkBtn("view");

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

            // collapse affordance: click the PREVIEW TEXT, not the whole cell
            pre.css.setMany(CLICKABLEcss);
            pre.listen.onClick((me) => {
              _stop(me);
              expandedCases.delete(c.key);
              renderAll();
            });

            queueMicrotask(() => {
              wrap.asDomElement()!.scrollTop = prevScroll;
            });
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (mainScrollEl) mainScrollEl.scrollTop = prevScroll;
              });
            });

            // wire buttons; always stop propagation; show errors
            copyBtn.listen.onClick(async (me) => {
              _stop(me);
              if (!capture) return;

              copyBtn.text.set("copying…");
              try {
                const report = await capture(c.key);

                // ADDED: pull stored meta (includes metaPatch.input from your suite builders)
                const meta = tlog.getCase(c.key)?.meta;

                // pass meta so the report can show input
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

                // ADDED
                const meta = tlog.getCase(c.key)?.meta;

                // pass meta into HTML renderer
                const render = render_report_html(c.key, c.name, c.suite, report, meta);

                open_report_window(render.html);
                viewBtn.text.set("view");
              } catch (e) {
                console.error(e);
                viewBtn.text.set("failed");
                window.setTimeout(() => viewBtn.text.set("view"), 900);
              }
            });
          }
        }
      }
    }
  };

  const clear = (): void => {
    tableHost.empty();
    expandedSuites.clear();
    expandedGroupsBySuite.clear();
    expandedCasesBySuite.clear();
  };

  const render = (): void => renderAll();

  const show = (): LiveTree => root.classlist.remove(hideClass);
  const hide = (): LiveTree => root.classlist.add(hideClass);

  // baseline
  root.css.setMany({
    padding: "10px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: $txt_.main,
    lineHeight: "1.35",
  });

  main.css.setMany({ display: "grid", gap: "6px" });

  return Object.freeze({ render, show, hide, clear });
}
