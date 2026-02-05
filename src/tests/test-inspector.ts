// inspector.ts

import type { LiveTree } from "hson-live";
import type { ConsoleLevel } from "../app/console/console";
import type { CaseKey, CaseLog, SuiteLog, TestLog } from "./test-log";
import type { TestFailure } from "./tests.types";

export type InspectorUi = Readonly<{
  render: () => void;
  show: () => void;
  hide: () => void;
  clear: () => void;
}>;

// CHANGED: reuse encoder to avoid alloc spam
const _ENC = new TextEncoder();

const bytes_of = (txt: string): number => {
  if (!txt) return 0;
  return _ENC.encode(txt).length;
};

const kb_str = (bytes: number): string => {
  if (!bytes) return "—";
  return (bytes / 1024).toFixed(1);
};

export function create_inspector(
  host: LiveTree,
  tlog: TestLog,
  getLevel: () => ConsoleLevel,
  opts?: { hideClass?: string },
): InspectorUi {
  const hideClass = opts?.hideClass ?? "panel-hidden";

  const root = host.create.div().classlist.set("inspector");
  const header = root.create.div().classlist.set("insp-header");
  const body = root.create.div().classlist.set("insp-body");

  const cols = body.create.div().classlist.set("insp-cols");
  const left = cols.create.div().classlist.set("insp-left");
  const right = cols.create.div().classlist.set("insp-right");

  const suitesBox = left.create.div().classlist.set("insp-suites");
  const casesBox = left.create.div().classlist.set("insp-cases");
  const failsBox = right.create.div().classlist.set("insp-fails");
  const detailBox = right.create.div().classlist.set("insp-detail");

  let selectedSuite: string | undefined;

  // CHANGED: separate expansion state for groups vs cases (avoid key collisions)
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

  header.setText("inspector");
  detailBox.setText("—");

  // ---------------------------
  // table helpers
  // ---------------------------
  const clearBox = (box: LiveTree): void => {
    box.empty();
  };

  const mkTable = (
    parent: LiveTree,
    cls: string,
  ): { table: LiveTree; thead: LiveTree; tbody: LiveTree } => {
    const table = parent.create.table().classlist.set(`insp-table ${cls}`);
    const thead = table.create.thead();
    const tbody = table.create.tbody();

    table.style.setMany({
      width: "100%",
      "border-collapse": "collapse",
    });

    return { table, thead, tbody };
  };

  const mkTr = (parent: LiveTree, cls: string): LiveTree =>
    parent.create.tr().classlist.set(cls);

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
  // CHANGED: component styles (no selectors)
  // ---------------------------
  const SCROLL_WRAPcss: Record<string, string> = {
    overflowX: "auto",
    overflowY: "auto",
    width: "100%",
    maxHeight: "60vh",
  };

  const THcss: Record<string, string> = {
    padding: "6px 8px",
    textAlign: "left",
    fontWeight: "600",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    whiteSpace: "nowrap",
    border: "1px solid hotpink"
  };

  const TDcss: Record<string, string> = {
    padding: "6px 8px",
    verticalAlign: "top",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
  };

  const TD_NAME_CHILDcss: Record<string, string> = {
    paddingLeft: "18px",
    opacity: "0.95",
  };

  const TD_PREVcss: Record<string, string> = {
    whiteSpace: "pre",
    maxWidth: "60ch",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const ROW_GROUPcss: Record<string, string> = {
    cursor: "pointer",
    userSelect: "none",
    background: "rgba(255,255,255,0.03)",
  };

  const ROW_FAILcss: Record<string, string> = {
    background: "rgba(255,0,0,0.06)",
  };

  const CLICKABLE_CELLcss: Record<string, string> = {
    cursor: "pointer",
  };

  // CHANGED: utf-8-ish kb helper (byte-aware)
  const kbOf = (txt: string): string => {
    if (!txt) return "—";
    const bytes = new TextEncoder().encode(txt).length;
    return (bytes / 1024).toFixed(1);
  };

  // CHANGED: deterministic grouping (basic + generated)
  const groupKeyFor = (name: string): string => {
    // basic: json__Samples.primitives
    const dot = name.indexOf(".");
    if (dot > 0) return name.slice(0, dot);

    // generated: html__p__none__unicode__siblings_h2_p
    const parts = name.split("__").filter(Boolean);
    if (parts.length >= 3) return parts.slice(0, 3).join("__");
    if (parts.length >= 2) return parts.slice(0, 2).join("__");
    return name;
  };

  // ---------------------------
  // suites table
  // ---------------------------
  const renderSuites = (suites: readonly SuiteLog[]): void => {
    clearBox(suitesBox);

    const wrap = suitesBox.create.div().classlist.set("insp-scroll suites-scroll");
    wrap.style.setMany({ overflowX: "auto", overflowY: "hidden", width: "100%" });

    const { table, thead, tbody } = mkTable(wrap, "insp-suites");
    table.style.setMany({
      width: "100%",
      "border-collapse": "collapse",
      // CHANGED: stabilize column widths
      "table-layout": "fixed",
    });

    const hr = mkTr(thead, "insp-head-row");
    mkTh(hr, "c-suite", "suite");
    mkTh(hr, "c-pfs", "p/f/s");
    mkTh(hr, "c-ms", "ms");
    mkTh(hr, "c-kb", "kb"); // CHANGED

    if (!suites.length) {
      const r = mkTr(tbody, "insp-empty-row");
      mkTd(r, "c-empty", "no suites");
      return;
    }

    for (const s of suites) {
      // CHANGED: compute suite kb from case previews
      const suiteCases = tlog.listCases(s.suite);
      let bytes = 0;
      for (const c of suiteCases) bytes += bytes_of(c.meta?.preview ?? "");

      const r = mkTr(
        tbody,
        `insp-suite-row ${selectedSuite === s.suite ? "is-selected" : ""}`,
      );

      mkTd(r, "c-suite", s.suite);
      mkTd(r, "c-pfs", `${s.pass}/${s.fail}/${s.skip}`);
      mkTd(r, "c-ms", s.ms !== undefined ? s.ms.toFixed(1) : "—");
      mkTd(r, "c-kb", kb_str(bytes)); // CHANGED

      r.listen.onClick((ev) => {
        // CHANGED: avoid weird propagation if nested
        (ev as { stopPropagation?: () => void }).stopPropagation?.();
        selectedSuite = s.suite;
        render();
      });
    }
  };

  // ---------------------------
  // cases table (grouped + expandable)
  // ---------------------------
  const renderCases = (suite: string): void => {
    clearBox(casesBox);

    const level = getLevel();

    // CHANGED: wrapper + table
    const wrap = casesBox.create.div().classlist.set("insp-scroll cases-scroll");
    wrap.style.setMany(SCROLL_WRAPcss);

    const { thead, tbody } = mkTable(wrap, "insp-cases");

    // header row
    const head = mkTr(thead, "insp-cases-head");
    const thSt = mkTh(head, "c-st", "st"); thSt.style.setMany(THcss);
    const thName = mkTh(head, "c-name", "case/group");
    thName.style.setMany({
      ...THcss,
      width: "42ch",        // CHANGED: pick your standard
      maxWidth: "42ch",
    });

    const thKb = mkTh(head, "c-kb", "kb");
    thKb.style.setMany({ ...THcss, width: "6ch", maxWidth: "6ch" });

    const thMs = mkTh(head, "c-ms", "ms");
    thMs.style.setMany({ ...THcss, width: "7ch", maxWidth: "7ch" });

    thSt.style.setMany({ ...THcss, width: "6ch", maxWidth: "6ch" });

    // CHANGED: preview column always exists (so columns don't jump),
    // but content is usually blank unless expanded / v2 / fail
    const thPrev = mkTh(head, "c-prev", "p/f/s"); thPrev.style.setMany(THcss);

    const cases = tlog.listCases(suite);
    if (!cases.length) {
      const r = mkTr(tbody, "insp-empty");
      const td = mkTd(r, "c-empty", "[no cases]");
      td.style.setMany(TDcss);
      return;
    }

    // grouping (fix readonly push)
    type CaseRow = (typeof cases)[number];
    const groups = new Map<string, CaseRow[]>();
    const groupOrder: string[] = [];

    for (const c of cases) {
      const gk = groupKeyFor(c.name);
      let arr = groups.get(gk);
      if (!arr) {
        arr = [];
        groups.set(gk, arr);
        groupOrder.push(gk);
      }
      arr.push(c);
    }

    const expandedGroups = getExpandedGroups(suite);
    const expandedCases = getExpandedCases(suite);

    for (const gk of groupOrder) {
      const members = groups.get(gk)!;
      const isOpen = expandedGroups.has(gk);
      const caret = isOpen ? "▼" : "▶";

      // aggregate group stats
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
      const gr = mkTr(tbody, "insp-group");
      gr.style.setMany(ROW_GROUPcss);

      const gSt = mkTd(gr, "c-st", caret); gSt.style.setMany(TDcss);
      const gName = mkTd(gr, "c-name", `${gk}  (${members.length})`); gName.style.setMany(TDcss);
      const gMs = mkTd(gr, "c-ms", msTotal ? msTotal.toFixed(1) : "—"); gMs.style.setMany(TDcss);
      const gKb = mkTd(gr, "c-kb", bytesTotal ? (bytesTotal / 1024).toFixed(1) : "—"); gKb.style.setMany(TDcss);

      // CHANGED: group “preview” cell shows counts only
      const gPrev = mkTd(gr, "c-prev", `${pass}/${fail}/${skip}`);
      gPrev.style.setMany({ ...TDcss, ...TD_PREVcss });

      gr.listen.onClick((ev) => {
        ev.stopPropagation?.(); // CHANGED
        if (expandedGroups.has(gk)) expandedGroups.delete(gk);
        else expandedGroups.add(gk);
        renderCases(suite);
      });

      // CHANGED: quiet only shows groups unless opened (still quiet)
      if (!isOpen) continue;

      // member rows (only when group open)
      for (const c of members) {
        // CHANGED: quiet can still show member rows when group is open;
        // if you want *only failing members* in quiet, uncomment next lines.
        // if (level === "quiet" && c.status !== "fail") continue;

        const k = c.key;
        const st = c.status ?? "—";
        const ms = c.ms !== undefined ? c.ms.toFixed(1) : "—";
        const full = c.meta?.preview ?? "";

        // main case row
        const r = mkTr(tbody, "insp-case");
        if (st === "fail") r.style.setMany(ROW_FAILcss);

        const tdSt = mkTd(r, "c-st", st); tdSt.style.setMany(TDcss);

        const tdName = mkTd(r, "c-name", c.name);
        tdName.style.setMany({
          ...TDcss,
          ...TD_NAME_CHILDcss,
          width: "42ch",        // CHANGED
          maxWidth: "42ch",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        });

        const tdMs = mkTd(r, "c-ms", ms); tdMs.style.setMany(TDcss);

        const tdKb = mkTd(r, "c-kb", full ? kbOf(full) : "—"); tdKb.style.setMany(TDcss);

        // CHANGED: keep the "preview" column minimal/empty (no big inline payload)
        // const tdPrev = mkTd(r, "c-prev", "");
        // tdPrev.style.setMany({ ...TDcss, ...TD_PREVcss });

        // toggle expansion by clicking name (and optionally the blank preview cell)
        if (full) {
          tdName.style.setMany({ ...TDcss, ...TD_NAME_CHILDcss, ...CLICKABLE_CELLcss });
          // tdPrev.style.setMany({ ...TDcss, ...TD_PREVcss, ...CLICKABLE_CELLcss });

          const toggle = (ev: unknown): void => {
            // CHANGED: stop row/group click bubbling if available
            const e = ev as { stopPropagation?: () => void };
            e.stopPropagation?.();

            if (expandedCases.has(k)) expandedCases.delete(k);
            else expandedCases.add(k);
            renderCases(suite);
          };

          tdName.listen.onClick(toggle);
          // tdPrev.listen.onClick(toggle);
        }

        // CHANGED: if expanded, add a row BELOW that spans all columns
        const isExpanded = expandedCases.has(k);
        const showBelow = isExpanded || level === "v2" || (st === "fail" && level !== "quiet");

        if (showBelow && full) {
          const rr = mkTr(tbody, "insp-case-preview-row");

          // create TD directly so we can set colspan
          const cell = rr.create.td().classlist.set("insp-case-preview-cell");
          cell.setAttrs("colspan", "5"); // CHANGED: st/name/ms/kb/preview = 5 columns

          // style: make it readable and wrap
          cell.style.setMany({
            ...TDcss,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            opacity: "0.95",
            background: "rgba(255,255,255,0.02)",
          });

          // indent a bit so it feels “attached” to the case row
          cell.style.setMany({ paddingLeft: "28px" });

          cell.setText(full);

          // optional: click the expanded preview to collapse
          cell.style.setMany(CLICKABLE_CELLcss);
          cell.listen.onClick((ev) => {
            const e = ev as { stopPropagation?: () => void };
            e.stopPropagation?.();
            expandedCases.delete(k);
            renderCases(suite);
          });
        }
        // CHANGED: in quiet, you may want to *hide* member previews entirely
        // (already blank unless fail/expanded, so you're safe)
      }
    }
  };

  // failures list (kept simple; could table-ify later)
  const renderFailures = (fails: readonly TestFailure[]): void => {
    clearBox(failsBox);

    const head = mkTr(failsBox, "insp-fails-head");
    mkTd(head, "c-fail", "failures");

    if (!fails.length) {
      const r = mkTr(failsBox, "insp-empty");
      mkTd(r, "c-empty", "no failures");
      return;
    }

    for (const f of fails) {
      const r = mkTr(failsBox, "insp-fail");
      mkTd(r, "c-fail", `${f.suite} :: ${f.name}`);

      r.listen.onClick((ev) => {
        ev.stopPropagation?.(); // CHANGED
        selectedSuite = f.suite;
        renderDetail(f);
        render();
      });
    }
  };

  const renderDetail = (f: TestFailure): void => {
    const snip = f.err.length > 2000 ? `${f.err.slice(0, 2000)}…` : f.err;
    const meta = f.meta ? `\nmeta: ${JSON.stringify(f.meta)}` : "";
    detailBox.setText(`${f.suite} :: ${f.name}\n${snip}${meta}\n(${f.ms.toFixed(1)}ms)`);
  };

  const clear = (): void => {
    suitesBox.empty();
    casesBox.empty();
    failsBox.empty();
    detailBox.setText("—");
    selectedSuite = undefined;

    // CHANGED: clear *all* expansion state
    expandedGroupsBySuite.clear();
    expandedCasesBySuite.clear();
  };

  const render = (): void => {
    const suites = tlog.listSuites();
    const fails = tlog.listFailures();

    // CHANGED: collapse the right column when empty
    if (fails.length === 0) {
      right.style.setMany({ display: "none" });
      cols.style.setMany({ display: "grid", gap: "10px", "grid-template-columns": "1fr" });
    } else {
      right.style.setMany({ display: "block" });
      cols.style.setMany({ display: "grid", gap: "10px", "grid-template-columns": "1fr 1fr" });
    }

    renderSuites(suites);
    renderFailures(fails);

    const suiteNames = new Set(suites.map(s => s.suite));
    if (selectedSuite && !suiteNames.has(selectedSuite)) selectedSuite = undefined;

    const suiteToShow = selectedSuite ?? suites[0]?.suite;
    if (suiteToShow) {
      selectedSuite = suiteToShow;
      renderCases(suiteToShow);
    } else {
      clearBox(casesBox);
      const r = mkTr(casesBox, "insp-empty");
      mkTd(r, "c-empty", "[no suite]");
    }

    if (fails.length) renderDetail(fails[0]!);
  };

  const show = (): void => { root.classlist.remove(hideClass); };
  const hide = (): void => { root.classlist.add(hideClass); };

  // baseline styling
  root.style.setMany({
    display: "grid",
    gap: "8px",
    padding: "10px",
    "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
    "font-size": "12px",
    "line-height": "1.35",
  });

  cols.style.setMany({
    display: "grid",
    gap: "10px",
    "grid-template-columns": "1fr 1fr",
  });

  suitesBox.style.setMany({ display: "grid", gap: "4px" });
  casesBox.style.setMany({ display: "grid", gap: "4px" });
  failsBox.style.setMany({ display: "grid", gap: "4px" });

  return Object.freeze({ render, show, hide, clear });
}
