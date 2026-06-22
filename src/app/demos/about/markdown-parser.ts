import type { LiveTree } from "hson-live";
import { _cols } from "../../core/consts/colors.consts";
import { ABOUT_P_TEXTcss, ABOUT_LIST_ROWcss, ANTI_LIST_MARKERcss, ABOUT_LIST_MARKERcss, ANTI_LIST_TEXTcss, LIST_TEXTcss, MD_CODE_PREcss, MD_LINK_LINEcss, MD_COPY_LINEcss, HRcss, ABOUT_HEADERcss, WARNINGcss, FLUSH_LISTcss } from "./about.css";
import { extractUrl, isIndented, parse_list_item, render_line_with_comment } from "./about-helpers";
import type { ListItem, ListKind } from "./about.types";

function code_fence_css(lang: string | null): Record<string, string> {
  const normalized = (lang ?? "").toLowerCase();

  if (normalized === "json") {
    return {
      color: _cols.bluelike,
      boxShadow: `0 0 0.12rem ${_cols.bluelike}`,
    };
  }

  if (normalized === "hson") {
    return {
      color: _cols.yellowlike,
      boxShadow: `0 0 0.12rem ${_cols.yellowlike}`,
    };
  }

  if (normalized === "html") {
    return {
      color: _cols.pinklike,
      boxShadow: `0 0 0.12rem ${_cols.pinklike}`,
    };
  }

  return {};
}

function is_formatted_data_fence(lang: string | null): boolean {
  const normalized = (lang ?? "").toLowerCase();
  return normalized === "json" || normalized === "hson" || normalized === "html";
}

export function render_md_doc(host: LiveTree, src: string): void {
  host.empty();
  const lines = src.replace(/\r\n/g, "\n").split("\n");

  let codeLang: string | null = null;
  let inCode = false;
  let codeBuf: string[] = [];

  let paraBuf: string[] = [];

  let listBuf: ListItem[] = [];
  let inList = false;
  let listKind: ListKind | null = null;
  let listStart = 1;

  const appendToLastListItem = (txt: string): void => {
    if (!inList) return;
    const last = listBuf[listBuf.length - 1];
    if (!last) return;

    last.text = `${last.text}\n${txt.trim()}`;
  };

  const flushPara = (): void => {
    const lines = paraBuf.slice();
    paraBuf = [];

    const meaningful = lines.map((s) => s.trim()).filter(Boolean);
    if (meaningful.length === 0) return;

    const p = host.create.div().classlist.add("md-p");
    p.css.setMany(ABOUT_P_TEXTcss);

    for (let i = 0; i < meaningful.length; i += 1) {
      const row = p.create.div().css.setMany({ textIndent: "4ch" });
      render_line_with_comment(row, meaningful[i] ?? "", "prose");
    }
  };

  const flushList = (): void => {
    if (!inList) return;

    const kind = listKind ?? "ul";
    const start = listStart;

    const listClass = kind === "ol" ? "md-ol"
      : kind === "anti" ? "md-anti"
        : "md-ul";

    const list = host.create.div().classlist.add(listClass);

    list.css.setMany(FLUSH_LISTcss);

    for (let i = 0; i < listBuf.length; i += 1) {
      const item = listBuf[i];
      if (!item) continue;

      const li = list.create.div().classlist.add("md-li");
      li.css.setMany(ABOUT_LIST_ROWcss);

      // choose marker text by list kind
      const marker = item.kind === "ol" ? `${start + i})`
        : item.kind === "anti" ? "✗"
          : item.marker;

      // choose marker css by list kind
      const markerCss = item.kind === "anti"
        ? ANTI_LIST_MARKERcss
        : ABOUT_LIST_MARKERcss;

      const block = li.create.span()
        .text.set(marker)
        .css.setMany({
          ...markerCss,
          marginLeft: "1rem",
        });

      // choose body css by list kind
      const bodyCss = item.kind === "anti"
        ? ANTI_LIST_TEXTcss
        : LIST_TEXTcss;
      
      const body = li.create.span()
        .css.setMany(bodyCss);
      
      const lines = item.text.split("\n");
      for (let j = 0; j < lines.length; j += 1) {
        const row = body.create.div();
        render_line_with_comment(row, lines[j] ?? "", "prose");
      }
    }

    listBuf = [];
    inList = false;
    listKind = null;
    listStart = 1;
  };

  const flushCode = (): void => {
    const codeLines = codeBuf.slice();
    codeBuf = [];
    if (codeLines.length === 0) return;

    const lang = codeLang;
    const formattedDataFence = is_formatted_data_fence(lang);

    const pre = host.create.div().classlist.add("md-pre").css.setMany({
      ...MD_CODE_PREcss,
      ...code_fence_css(lang),
    });

    for (const line of codeLines) {
      const row = pre.create.div();
      row.css.setMany({ whiteSpace: "pre" });

      // CHANGED: ts and other ordinary code fences keep the existing code
      // highlighter; json/hson/html fences use the parsing-panel color lanes.
      if (formattedDataFence) row.text.set(line);
      else render_line_with_comment(row, line, "code");
    }

    codeLang = null;
  };

  for (const rawLine of lines) {
    const line = rawLine ?? "";
    // standalone url line → anchor block
    const url = extractUrl(line);
    if (url) {
      flushPara();
      flushList();

      const a = host.create.a()
        .classlist.add("md-link-line")
        .attr.set("href", url)
        .attr.set("target", "_blank")
        .attr.set("rel", "noopener noreferrer");

      a.text.set(url);
      a.css.setMany(MD_LINK_LINEcss);

      continue;
    }

    if (line.trim().startsWith("©")) {
      flushPara();
      flushList();

      const box = host.create.div().classlist.add("md-at-line");
      box.css.setMany(MD_COPY_LINEcss);

      render_line_with_comment(box, line.trim(), "prose");

      continue;
    }

    // fenced code
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        flushPara();
        flushList();
        inCode = true;
        codeLang = line.trim().slice(3).trim() || null;
      } else {
        inCode = false;
        flushCode();
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const t = line.trim();

    if (t === "⸻" ||
      t === "―" ||
      t === "—" ||
      /^-{3,}$/.test(t)) {
      flushPara();
      flushList();

      const hr = host.create.div().classlist.add("md-hr");
      hr.css.setMany(HRcss);

      continue;
    }

    // headings
    const m = /^(#{1,4})\s+(.*)$/.exec(line);
    if (m) {
      flushPara();
      flushList();

      const marks = m[1] ?? "#";
      const level = marks.length as 1 | 2 | 3 | 4;
      const text = (m[2] ?? "").trim();

      const h = host.create.div().classlist.add(`md-h${level}`);
      h.css.setMany(ABOUT_HEADERcss(level));
      h.text.set(text);
      continue;
    }

    // warning/caution
    const warn = /^!!!\s*(.*)$/.exec(line);
    if (warn) {
      flushPara();
      flushList();

      const box = host.create.div().classlist.add("md-warning");
      box.css.setMany(WARNINGcss);

      const body = box.create.div();
      render_line_with_comment(body, warn[1] ?? "", "prose");

      continue;
    }
    // blank line splits
    if (line.trim().length === 0) {
      flushPara();
      flushList();
      continue;
    }

    // list items
    const li = parse_list_item(line);
    if (li) {
      flushPara();

      if (!inList || listKind !== li.kind) {
        flushList();
        inList = true;
        listKind = li.kind;
        if (li.kind === "ol") listStart = (li as { n: number; }).n;
        else listStart = 1;
      }

      listBuf.push(li);
      continue;
    }

    // continuation lines only when indented
    if (inList && isIndented(line)) {
      appendToLastListItem(line);
      continue;
    }

    // leaving list
    if (inList) flushList();

    // paragraph continuation
    paraBuf.push(line.trim());
  }

  flushPara();
  flushList();
  if (inCode) flushCode();
}
