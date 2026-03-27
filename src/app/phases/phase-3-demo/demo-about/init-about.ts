// src/app/phases/hson-demo-3/about/about-init.ts

import type { LiveTree } from "hson-live";
import type { AboutDocKey, AboutDocs, AboutDocSpec } from "./about.types";
import { $blu_, $cols_, $grn_, $HSON_COLORS, $pnk_, ACID_WASH_OKLCH, ACID_WASH_RGBA } from "../../../core/consts/colors.consts";
import { TOC_BTN_ACTIVEcss, TOC_BTN_IDLEcss, TOC_BTNcss, ABOUT_LIST_MARKERcss, ABOUT_LIST_ROWcss, LIST_TEXTcss, ABOUT_P_TEXTcss, INLINE_CODEcss, CODE_PARENcss, CODE_PAREN_INNERcss, CODE_COMMENTScss, CODE_EQUALSscss, CODE_PUNCTcss, CODE_QUOTEcss, ANTI_LIST_MARKERcss, ANTI_LIST_TEXTcss, HRcss, WARNINGcss, ABOUT_TOC_TITLEcss, ABOUT_HEADERcss, MD_LINK_LINEcss, MD_COPY_LINEcss } from "./about.css";
import type { CssMap } from "hson-live/types";
import { $HSON } from "../../../../../../hson-live/dist/consts/constants";
import { MENU_FONT } from "../demo.css";
import { MD_CODE_PREcss } from "./about.css";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { demo_subscribe, get_about_toc_open, set_about_toc_open } from "../state";


/**
 * Markdown extensions
 * 
 * This renderer supports a small set of custom constructs:
 *    -! "anti list" items
 *    !!! warning blocks
 *    --- horizontal rule
 *    ⸻ horizontal rule 
 *  
 * Fenced code blocks also support limited syntax highlighting 
 * for certain punctuation marks (WIP)
 **/


// -----------------------------
// Types
// -----------------------------

type AboutInitDeps = Readonly<{
  docs: AboutDocs;
  initialDocKey?: AboutDocKey;
}>;

type AboutInitTargets = Readonly<{
  toc: LiveTree;
  doc: LiveTree;
}>;

type ListKind = "ul" | "ol" | "anti";
type ListItem =
  | { kind: "ul"; depth: number; marker: string; text: string }
  | { kind: "ol"; depth: number; n: number; text: string }
  | { kind: "anti"; depth: number; marker: string; text: string };

// -----------------------------
// Inline rendering (single entrypoint)
// - backticks are always code
// - parens highlighting only happens inside code segments
// -----------------------------
type InlineSeg = { kind: "text" | "code"; s: string };

function split_inline_backticks(src: string): InlineSeg[] {
  const out: InlineSeg[] = [];
  let buf = "";
  let inCode = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i] ?? "";
    if (ch === "`") {
      if (buf.length > 0) out.push({ kind: inCode ? "code" : "text", s: buf });
      buf = "";
      inCode = !inCode;
      continue;
    }
    buf += ch;
  }

  if (buf.length > 0) out.push({ kind: inCode ? "code" : "text", s: buf });
  return out;
}

// CHANGED: one renderer for fenced code lines AND inline code segments.
// - Handles comments, parens, dot, equals, and double quotes.
// - Preserves whitespace (assumes container/row has whiteSpace: "pre"; white-space is inherited).
export function render_inline_code(row: LiveTree, code: string): void {
  // CHANGED: base “ink” so code isn’t dependent on outer containers.
  const BASEcss: CssMap = INLINE_CODEcss; // should include a visible color

  // token css
  const PARENcss: CssMap = CODE_PARENcss;
  const INNERcss: CssMap = CODE_PAREN_INNERcss;     // inside (...)
  const DOTcss: CssMap = CODE_PUNCTcss;               // you define
  const EQcss: CssMap = CODE_EQUALSscss;                 // you define
  const QUOTEcss: CssMap = CODE_QUOTEcss;           // you define
  const COMMENTcss: CssMap = CODE_COMMENTScss;      // already exists

  let buf = "";
  let depth = 0;
  let inDq = false; // inside double quotes

  const flush = (css: CssMap) => {
    if (buf.length === 0) return;
    row.create.span().css.setMany(css).text.set(buf);
    buf = "";
  };

  const emit = (css: CssMap, s: string) => {
    flush(depth > 0 ? INNERcss : BASEcss);
    row.create.span().css.setMany(css).text.set(s);
  };

  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i] ?? "";

    // ---- comment start (only when NOT in double-quote string) ----
    if (!inDq) {
      // // comment
      if (ch === "/" && (code[i + 1] ?? "") === "/") {
        flush(depth > 0 ? INNERcss : BASEcss);
        const rest = code.slice(i); // include the //
        row.create.span().css.setMany(COMMENTcss).text.set(rest);
        return; // done with this line
      }

    }

    // ---- string toggle (very simple; ignores escapes on purpose for now) ----
    if (ch === `"` || ch === `'`) {
      flush(depth > 0 ? INNERcss : BASEcss);
      row.create.span().css.setMany(QUOTEcss).text.set(`"`);
      inDq = !inDq;
      continue;
    }

    // ---- parens (still operate even inside strings; if you don’t want that, gate on !inDq) ----
    if (ch === "(") {
      flush(depth > 0 ? INNERcss : BASEcss);
      row.create.span().css.setMany(PARENcss).text.set("(");
      depth += 1;
      continue;
    }

    if (ch === ")") {
      flush(depth > 0 ? INNERcss : BASEcss);
      row.create.span().css.setMany(PARENcss).text.set(")");
      depth = Math.max(0, depth - 1);
      continue;
    }

    // ---- dot + equals (only when not in strings) ----
    if (!inDq && ch === ".") {
      emit(DOTcss, ".");
      continue;
    }

    if (!inDq && ch === "=") {
      emit(EQcss, "=");
      continue;
    }

    // default
    buf += ch;
  }

  flush(depth > 0 ? INNERcss : BASEcss);
}

export function render_inline(host: LiveTree, src: string): void {
  // CHANGED: the one true inline renderer.
  const segs = split_inline_backticks(src);

  for (const seg of segs) {
    if (!seg.s) continue;

    if (seg.kind === "text") {
      host.create.span().text.set(seg.s);
      continue;
    }

    // seg.kind === "code": render backticks + styled content
    const wrap = host.create.span().classlist.add("md-icode-wrap");
    // wrap.create.span().css.setMany(INLINE_TICKcss).text.set("`");
    render_inline_code(wrap, seg.s);
    // wrap.create.span().css.setMany(INLINE_TICKcss).text.set("`");
  }
}

// -----------------------------
// List parsing helpers
// Rules:
// - top UL: "-", "*", "•"
// - nested UL: "--", "---", "----" (depth >= 1)
// - OL: "1) "
// -----------------------------
const isIndented = (s: string): boolean => /^[\t ]+/.test(s);
function parse_list_item(line: string): ListItem | null {

  // 0️⃣ anti list
  const anti = /^-!\s+(.*)$/.exec(line);
  if (anti) {
    const text = (anti[1] ?? "").trim();

    return {
      kind: "anti",
      depth: 0,
      marker: "x",
      text,
    };
  }

  // 1️⃣ nested UL first
  const ulNested = /^(\s*)(--+)\s+(.*)$/.exec(line);
  if (ulNested) {
    const dashRun = ulNested[2] ?? "--";     
    const depth = Math.max(1, dashRun.length);
    const text = (ulNested[3] ?? "").trim(); 
    return { kind: "ul", depth, marker: "•", text };
  }

  // 2️⃣ then top-level UL
  const ulTop = /^([*\-•])\s+(.*)$/.exec(line);
  if (ulTop) {
    const marker = "•";
    const text = (ulTop[2] ?? "").trim();

    return {
      kind: "ul",
      depth: 0,
      marker,
      text,
    };
  }

  // 3️⃣ ordered list
  const ol = /^(\d+)([.)])\s+(.*)$/.exec(line);
  if (ol) {
    const n = Number.parseInt(ol[1] ?? "1", 10);
    const text = (ol[3] ?? "").trim();

    return {
      kind: "ol",
      n: Number.isFinite(n) ? n : 1,
      depth: 0,
      text,
    };
  }

  return null;
}

// -----------------------------
// Markdown-ish renderer (only touch: flushPara + flushList use render_inline)
// -----------------------------
function render_doc_md(host: LiveTree, src: string): void {
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

    const listClass =
      kind === "ol" ? "md-ol"
        : kind === "anti" ? "md-anti"
          : "md-ul";

    const list = host.create.div().classlist.add(listClass);

    list.css.setMany({
      display: "grid",
      gap: "1rem",
      margin: "20px 0",
      minWidth: "0",
    });

    for (let i = 0; i < listBuf.length; i += 1) {
      const item = listBuf[i];
      if (!item) continue;

      const li = list.create.div().classlist.add("md-li");
      li.css.setMany(ABOUT_LIST_ROWcss);

      // CHANGED: choose marker text by list kind
      const marker =
        item.kind === "ol" ? `${start + i})`
          : item.kind === "anti" ? "✗"
            : item.marker;

      // CHANGED: choose marker css by list kind
      const markerCss =
        item.kind === "anti"
          ? ANTI_LIST_MARKERcss
          : ABOUT_LIST_MARKERcss;

      li.create.div()
        .text.set(marker)
        .css.setMany({
          ...markerCss,
          // CHANGED: indent marker for nested UL only
          marginLeft: "1rem",
        });

      // CHANGED: choose body css by list kind
      const bodyCss =
        item.kind === "anti"
          ? ANTI_LIST_TEXTcss
          : LIST_TEXTcss;

      const body = li.create.div().css.setMany({
        ...bodyCss,
        paddingLeft: `${item.depth * 14}px`,
      });

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

    const isLogo = (codeLang ?? "").toLowerCase() === "hson";

    const pre = host.create.div().classlist.add("md-pre").css.setMany(MD_CODE_PREcss);
    if (isLogo) return;

    for (const line of codeLines) {
      const row = pre.create.div();
      row.css.setMany({ whiteSpace: "pre" });

      render_line_with_comment(row, line, "code");
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

    if (
      t === "⸻" ||
      t === "―" ||
      t === "—" ||
      /^-{3,}$/.test(t)
    ) {
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
        if (li.kind === "ol") listStart = (li as { n: number }).n;
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

function find_doc(docs: AboutDocs, key: AboutDocKey): AboutDocSpec | undefined {
  return docs.find((d) => d.key === key);
}


export function about_init(t: AboutInitTargets, deps: AboutInitDeps): void {
  const { docs } = deps;
  const initialKey: AboutDocKey =
    (deps.initialDocKey ?? docs[0]?.key ?? "readme") as AboutDocKey;

  let activeKey: AboutDocKey = initialKey;

  const tocButtons: Array<{ key: AboutDocKey; btn: LiveTree }> = [];

  const applyTocOpen = (): void => {
    t.toc.data.set("toc-open", get_about_toc_open() ? "true" : null);
  };

  t.toc.empty();

  t.toc.create.div()
    .classlist.add("about-nav-title")
    .css.setMany(ABOUT_TOC_TITLEcss)
    .text.set("docs");

  for (const d of docs) {
    const btn = t.toc.create.div()
      .classlist.add("about-doc-btn")
      .data.set("doc-key", d.key)
      .css.setMany(TOC_BTNcss);

    btn.text.set(d.title);
    btn.listen.onClick(() => setActive(d.key));

    tocButtons.push({ key: d.key, btn });
  }

  const setActive = (key: AboutDocKey): void => {
    const docSpec = find_doc(docs, key);
    if (!docSpec) return;

    activeKey = key;

    render_doc_md(t.doc, docSpec.body);

    for (const x of tocButtons) {
      x.btn.css.setMany(x.key === activeKey ? TOC_BTN_ACTIVEcss : TOC_BTN_IDLEcss);
    }
    // CHANGED: collapse TOC after selection)
    set_about_toc_open(false);
    applyTocOpen();
  };

  // CHANGED: keep root data attr in sync with state
  applyTocOpen();
  demo_subscribe(applyTocOpen);

  setActive(activeKey);
}


function split_trailing_comment(line: string): { body: string; comment: string } | null {
  if (line.startsWith("//")) {
    return { body: "", comment: line };
  }

  const ix = line.indexOf(" //");
  if (ix < 0) return null;

  return {
    body: line.slice(0, ix),
    comment: line.slice(ix + 1), // keep the leading //
  };
}

function render_line_with_comment(
  host: LiveTree,
  line: string,
  mode: "prose" | "code",
): void {
  const split = split_trailing_comment(line);

  if (!split) {
    if (mode === "code") render_inline_code(host, line);
    else render_inline(host, line);
    return;
  }

  const { body, comment } = split;

  if (body.length > 0) {
    if (mode === "code") render_inline_code(host, body);
    else render_inline(host, body);
  }

  host.create.span()
    .classlist.add("md-comment")
    .css.setMany(CODE_COMMENTScss)
    .text.set(comment);
}

function extractUrl(line: string): string | null {
  const t = line.trim();

  // strip surrounding backticks if present
  const unwrapped =
    (t.startsWith("`") && t.endsWith("`"))
      ? t.slice(1, -1).trim()
      : t;

  if (/^https?:\/\/\S+$/i.test(unwrapped)) {
    return unwrapped;
  }

  return null;
}