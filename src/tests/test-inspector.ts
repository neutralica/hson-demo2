// inspector.ts

import { type LiveTree } from "hson-live";
import type { TestLog } from "./test-log";
import type { CaseKey, SuiteLog } from "./tests.types";
import type { InspectorUi, TestFailure, UiLevel } from "./tests.types";
import { ROW_CASE_FAILcss, ROW_GROUP_FAILcss, ROW_SUITE_FAILcss } from "./test-panel.css";
import { $cols } from "../app/consts/colors.consts";
import { _test_full_loop, type LoopReport } from "../../../hson-live/dist/diagnostics/loop-3.test";
import { open_report_window, render_report_html } from "./render-report";

export type CaptureFn = (key: CaseKey) => Promise<LoopReport>; // you’ll tighten to LoopReport


export function report_to_text(r: LoopReport): string {
  const lines: string[] = [];

  lines.push(`ok: ${r.ok}`);
  lines.push(`entry: ${r.entry}`);
  lines.push(`dir: ${r.dir}`);
  lines.push(`times: ${r.times}`);
  lines.push(`failures: ${r.failures.length}`);
  lines.push("");

  const pushBlock = (label: string, fmt: string, text: string): void => {
    lines.push(`=== ${label} (${fmt}) ===`);
    lines.push(text);              // CHANGED: raw text, no JSON encoding
    lines.push("");
  };

  // 1) Prefer trace-based printing (full chain).
  const trace = r.trace ?? [];
  let printedAny = false;

  for (const step of trace) {
    // ADAPT: rename these fields to your actual Step shape
    const fmt = (step as any).fmt as string | undefined;
    const text = (step as any).text as string | undefined;
    const tag = (step as any).tag as string | undefined;
    const dir = (step as any).dir as string | undefined;
    const iter = (step as any).iter as number | undefined;

    if (!fmt || text === undefined) continue;

    const labelParts = [
      dir ? `${dir}` : "",
      iter !== undefined ? `iter ${iter}` : "",
      tag ?? "step",
    ].filter(Boolean);

    const label = labelParts.join(" / ") || "step";
    pushBlock(label, fmt, text);
    printedAny = true;
  }

  // 2) Fall back to finals if trace didn’t include printable strings.
  if (!printedAny) {
    if (r.final) pushBlock("final", r.final.fmt, r.final.text);
    if (r.dualFinals?.cw) pushBlock("cw final", r.dualFinals.cw.fmt, r.dualFinals.cw.text);
    if (r.dualFinals?.ccw) pushBlock("ccw final", r.dualFinals.ccw.fmt, r.dualFinals.ccw.text);
  }

  // 3) Failures (helpful even when ok=false)
  if (r.failures.length) {
    lines.push(`=== failures (${r.failures.length}) ===`);
    for (const f of r.failures) {
      // ADAPT: same field names caveat
      lines.push(String((f as any).tag ?? "failure"));
      lines.push(String((f as any).msg ?? ""));
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function create_inspector(
  host: LiveTree,
  tlog: TestLog,
  getLevel: () => UiLevel,
  opts?: { hideClass?: string },
  capture?: CaptureFn,                 // CHANGED: optional
): InspectorUi {
  const hideClass = opts?.hideClass ?? "panel-hidden";

  const root = host.create.div().classlist.set("inspector");
  const header = root.create.div().classlist.set("insp-header");
  const body = root.create.div().classlist.set("insp-body");

  // dynamic 1-col / 2-col
  const cols = body.create.div().classlist.set("insp-cols");
  const main = cols.create.div().classlist.set("insp-main");
  const side = cols.create.div().classlist.set("insp-side");

  // main table host
  const tableHost = main.create.div().classlist.set("insp-table-host");

  // failure side
  const failsBox = side.create.div().classlist.set("insp-fails");
  const detailBox = side.create.div().classlist.set("insp-detail");

  header.setText("inspector");
  detailBox.setText("—");

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
  // tiny “table” helpers
  // ---------------------------
  const clearBox = (box: LiveTree): LiveTree => box.empty();

  const mkTable = (parent: LiveTree, cls: string): { table: LiveTree; thead: LiveTree; tbody: LiveTree } => {
    const table = parent.create.table().classlist.set(`insp-table ${cls}`);
    const thead = table.create.thead();
    const tbody = table.create.tbody();
    table.css.setMany({ width: "100%", borderCollapse: "collapse" });
    return { table, thead, tbody };
  };

  const mkTr = (parent: LiveTree, cls: string): LiveTree => parent.create.tr().classlist.set(cls);

  const mkTh = (row: LiveTree, cls: string, txt: string): LiveTree => {
    const th = row.create.th().classlist.set(cls);
    th.setText(txt);
    return th;
  };

  const mkTd = (row: LiveTree, cls: string, txt: string): LiveTree => {
    const td = row.create.td().classlist.set(cls);
    td.setText(txt);
    return td;
  };

  // ---------------------------
  // component styles (no selectors)
  // ---------------------------
  const SCROLL_WRAPcss: Record<string, string> = {
    overflowX: "auto",
    overflowY: "auto",
    width: "100%",
    maxHeight: "70vh",
  };

  const THcss: Record<string, string> = {
    padding: "6px 8px",
    textAlign: "left",
    fontWeight: "600",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    whiteSpace: "nowrap",
    opacity: "0.85",
  };

  const TDcss: Record<string, string> = {
    padding: "6px 8px",
    verticalAlign: "top",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
  };

  const TD_PREVIEW_ROWcss: Record<string, string> = {
    padding: "8px 12px",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    background: "rgba(255,255,255,0.02)",
    opacity: "0.95",
  };

  const CLICKABLEcss: Record<string, string> = { cursor: "pointer", userSelect: "none" };

  const ROW_SUITEcss: Record<string, string> = {
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
  };

  const ROW_GROUPcss: Record<string, string> = {
    background: "rgba(255,255,255,0.025)",
    cursor: "pointer",
  };

  const ROW_FAILcss: Record<string, string> = {
    background: "rgba(255,0,0,0.06)",
  };

  const NAME_WIDTH = "38ch"; // standardize width so it doesn’t jump

  const tdNameCssBase: Record<string, string> = {
    width: NAME_WIDTH,
    maxWidth: NAME_WIDTH,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const tdNameChildCss: Record<string, string> = {
    ...tdNameCssBase,
    paddingLeft: "18px",
    opacity: "0.95",
  };

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
  // side panel: failures list + detail
  // ---------------------------
  const renderFailures = (fails: readonly TestFailure[]): void => {
    clearBox(failsBox);

    const head = failsBox.create.div().classlist.set("insp-fails-head");
    head.setText(fails.length ? "failures" : "no failures");
    head.css.setMany({
      padding: "6px 8px",
      borderBottom: "1px solid rgba(255,255,255,0.12)",
      opacity: "0.8",
      fontFamily: "ui-monospace, monospace",
    });

    if (!fails.length) return;

    for (const f of fails) {
      const row = failsBox.create.div().classlist.set("insp-fail-row");
      row.setText(`${f.suite} :: ${f.name}`);
      row.css.setMany({
        padding: "6px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        fontFamily: "ui-monospace, monospace",
      });

      row.listen.onClick(() => renderDetail(f));
    }
  };

  const renderDetail = (f: TestFailure): void => {
    const snip = f.err.length > 3000 ? `${f.err.slice(0, 3000)}…` : f.err;
    const meta = f.meta ? `\nmeta: ${JSON.stringify(f.meta)}` : "";
    detailBox.setText(`${f.suite} :: ${f.name}\n${snip}${meta}\n(${f.ms.toFixed(1)}ms)`);
    detailBox.css.setMany({
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      padding: "8px",
      fontFamily: "ui-monospace, monospace",
      borderTop: "1px solid rgba(255,255,255,0.12)",
    });
  };

  // ---------------------------
  // main table: suite->group->case
  // ---------------------------
  const renderAll = (): void => {
    clearBox(tableHost);

    const level = getLevel();
    const suites = tlog.listSuites();
    const fails = tlog.listFailures();

    // layout is 1 column when no fails, 2 columns when fails exist
    cols.css.setMany({
      display: "grid",
      gap: "10px",
      gridTemplateColumns: fails.length ? "1fr 360px" : "1fr",
      alignItems: "start",
    });

    // hide side entirely when empty
    side.css.setMany({ display: fails.length ? "grid" : "none", gap: "8px" });
    if (fails.length) {
      renderFailures(fails);
      renderDetail(fails[0]!);
    } else {
      detailBox.setText("—");
      clearBox(failsBox);
    }

    const wrap = tableHost.create.div().classlist.set("insp-scroll main-scroll");
    wrap.css.setMany(SCROLL_WRAPcss);

    const { thead, tbody } = mkTable(wrap, "insp-main");

    // header columns are stable
    const hr = mkTr(thead, "insp-head-row");
    mkTh(hr, "c-res", "res").css.setMany({ ...THcss, width: "7ch", maxWidth: "7ch" });
    mkTh(hr, "c-name", "suite / group / case").css.setMany({ ...THcss, ...tdNameCssBase });
    mkTh(hr, "c-kb", "kb").css.setMany({ ...THcss, width: "7ch", maxWidth: "7ch" });
    mkTh(hr, "c-ms", "ms").css.setMany({ ...THcss, width: "7ch", maxWidth: "7ch" });

    if (!suites.length) {
      const r = mkTr(tbody, "insp-empty");
      mkTd(r, "c-empty", "no suites").css.setMany(TDcss);
      return;
    }

    for (const s of suites) {
      const suiteName = s.suite;
      const suiteIsOpen = expandedSuites.has(suiteName);
      const caret = suiteIsOpen ? "▼" : "▶";

      // suite row
      const sr = mkTr(tbody, "insp-suite-row");
      sr.css.setMany(ROW_SUITEcss);

      if (s.fail > 0) sr.css.setMany(ROW_SUITE_FAILcss); // CHANGED

      mkTd(sr, "c-res", caret).css.setMany(TDcss);
      mkTd(sr, "c-name", `${suiteName}  (${s.pass}/${s.fail}/${s.skip})`).css.setMany({ ...TDcss, ...tdNameCssBase });
      mkTd(sr, "c-kb", "—").css.setMany(TDcss);
      mkTd(sr, "c-ms", s.ms !== undefined ? s.ms.toFixed(1) : "—").css.setMany(TDcss);

      sr.listen.onClick((ev) => {
        ev.stopPropagation?.();
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

          const prev = c.meta?.preview ?? "";
          if (prev) bytesTotal += new TextEncoder().encode(prev).length;
        }

        // group row
        const gr = mkTr(tbody, "insp-group-row");
        gr.css.setMany(ROW_GROUPcss);

        if (fail > 0) gr.css.setMany(ROW_GROUP_FAILcss); // CHANGED

        mkTd(gr, "c-res", gCaret).css.setMany(TDcss);
        mkTd(gr, "c-name", `${gk}  (${pass}/${fail}/${skip})`).css.setMany({ ...TDcss, ...tdNameCssBase });
        mkTd(gr, "c-kb", bytesTotal ? (bytesTotal / 1024).toFixed(1) : "—").css.setMany(TDcss);
        mkTd(gr, "c-ms", msTotal ? msTotal.toFixed(1) : "—").css.setMany(TDcss);

        gr.listen.onClick((ev) => {
          ev.stopPropagation?.();
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
          const cr = mkTr(tbody, "insp-case-row");
          if (res === "fail") cr.css.setMany(ROW_CASE_FAILcss); // CHANGED

          mkTd(cr, "c-res", res).css.setMany(TDcss);

          const nameCell = mkTd(cr, "c-name", c.name);
          nameCell.css.setMany({ ...TDcss, ...tdNameChildCss, ...CLICKABLEcss });

          mkTd(cr, "c-kb", preview ? kbOf(preview) : "—").css.setMany(TDcss);
          mkTd(cr, "c-ms", ms).css.setMany(TDcss);

          // click case name toggles “preview row below”
          nameCell.listen.onClick((ev) => {
            ev.stopPropagation?.();
            if (expandedCases.has(c.key)) expandedCases.delete(c.key);
            else expandedCases.add(c.key);
            renderAll();
          });

          // preview row below (snipped preview only)
          if (expandedCases.has(c.key)) {
            const pr = mkTr(tbody, "insp-case-preview-row");
            const cell = pr.create.td().classlist.set("insp-case-preview-cell");

            // CHANGED: this preview row is a container; do NOT call cell.setText() afterwards.
            cell.setAttrs("colspan", "4");
            cell.css.setMany(TD_PREVIEW_ROWcss);

            // CHANGED: clear then build UI
            cell.empty();

            // CHANGED: collapse preview if you click the empty background area
            // (buttons and pre will stop propagation)
            cell.css.setMany(CLICKABLEcss);
            cell.listen.onClick((ev) => {
              ev.stopPropagation?.();
              expandedCases.delete(c.key);
              renderAll();
            });

            // ---- top row: meta + buttons
            const topRow = cell.create.div().classlist.set("insp-cap-row");
            topRow.css.setMany({
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
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
            metaBox.setText(`${c.suite} :: ${c.name}`);

            const mkBtn = (label: string): LiveTree => {
              const b = topRow.create.div().classlist.set("insp-cap-btn");
              b.setText(label);
              b.css.setMany({
                padding: "4px 8px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                userSelect: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              });
              return b;
            };

            // ---- the snipped preview (always shown)
            const pre = cell.create.pre().classlist.set("insp-preview-pre");
            pre.css.setMany({
              margin: "0",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.35)",
              overflow: "auto",
              maxHeight: "18vh",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            });
            pre.setText(preview || "—");

            // stop bubbling helper
            const stop = (ev: unknown): void => {
              const e = ev as { stopPropagation?: () => void; preventDefault?: () => void };
              e.stopPropagation?.();
              e.preventDefault?.();
            };

            // prevent clicks on preview text from collapsing the row
            pre.listen.onClick((ev) => stop(ev));

            // ---- buttons
            // If capture isn't wired, still show placeholders but disabled-looking.
            const copyBtn = mkBtn("copy");
            const viewBtn = mkBtn("view");

            const setDisabledLook = (b: LiveTree): void => {
              b.css.setMany({ opacity: "0.4", cursor: "default" });
            };

            if (!capture) {
              setDisabledLook(copyBtn);
              setDisabledLook(viewBtn);
              return;
            }

            copyBtn.listen.onClick(async (ev) => {
              stop(ev);
              copyBtn.setText("…");
              try {
                // NOTE: capture(key) should already run with { verbose:true, capture:true }
                const report = await capture(c.key);
                const txt = report_to_text(report);
                await navigator.clipboard.writeText(txt);
                copyBtn.setText("copied");
                window.setTimeout(() => copyBtn.setText("copy"), 900);
              } catch {
                copyBtn.setText("fail");
                window.setTimeout(() => copyBtn.setText("copy"), 900);
              }
            });

            viewBtn.listen.onClick(async (ev) => {
              stop(ev);
              if (!capture) return;

              const report = await capture(c.key);
              const htmlDoc = render_report_html(c.key, c.name, c.suite, report); // must return FULL HTML doc string

              open_report_window(htmlDoc.html);
            });
          }
        }
      }
    }
  };

  const clear = (): void => {
    tableHost.empty();
    failsBox.empty();
    detailBox.setText("—");
    expandedSuites.clear();
    expandedGroupsBySuite.clear();
    expandedCasesBySuite.clear();
  };

  const render = (): void => renderAll();

  const show = (): LiveTree => root.classlist.remove(hideClass);
  const hide = (): LiveTree => root.classlist.add(hideClass);

  // baseline
  root.css.setMany({
    display: "grid",
    gap: "8px",
    padding: "10px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "12px",
    lineHeight: "1.35",
  });

  main.css.setMany({ display: "grid", gap: "6px" });
  side.css.setMany({ display: "none" });

  return Object.freeze({ render, show, hide, clear });
}