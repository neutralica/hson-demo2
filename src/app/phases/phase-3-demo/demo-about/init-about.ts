// src/app/phases/hson-demo-3/about/about-init.ts

import type { LiveTree } from "hson-live";
import type { AboutDocKey, AboutDocs, AboutDocSpec } from "./about.types";
import { $blu_, $grn_ } from "../../../consts/colors.consts";
import { DOC_BTN_ACTIVEcss, DOC_BTN_IDLEcss, DOC_BTNcss, ABOUT_LIST_MARKERcss, ABOUT_LIST_ROWcss, LIST_TEXTcss, ABOUT_CSS, ABOUT_P_TEXTcss, MD_CODEcss, MD_PARENcss, MD_TICKcss, INLINE_TICKcss, INLINE_CODEcss, CODE_PARENcss, CODE_PAREN_INNERcss, CODE_COMMENTScss, CODE_EQUALSscss, CODE_PUNCTcss, CODE_QUOTEcss } from "./about.css";
import type { CssMap } from "hson-live/types";

// -----------------------------
// Types
// -----------------------------

type AboutInitDeps = Readonly<{
  docs: AboutDocs;
  initialDocKey?: AboutDocKey;
}>;

type CodeChunk =
  | { kind: "plain"; text: string }
  | { kind: "paren"; text: string };

type AboutInitTargets = Readonly<{
  toc: LiveTree;
  doc: LiveTree;
  title: LiveTree;
}>;

type ListKind = "ul" | "ol";
type ListItem =
  | { kind: "ul"; depth: number; marker: string; text: string }
  | { kind: "ol"; depth: number; n: number; text: string };

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

      // # comment
      if (ch === "#") {
        flush(depth > 0 ? INNERcss : BASEcss);
        const rest = code.slice(i);
        row.create.span().css.setMany(COMMENTcss).text.set(rest);
        return;
      }
    }

    // ---- string toggle (very simple; ignores escapes on purpose for now) ----
    if (ch === `"`) {
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

    // ---- dot + equals (only when not in strings is usually nicer) ----
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
    wrap.create.span().css.setMany(INLINE_TICKcss).text.set("`");
    render_inline_code(wrap, seg.s);
    wrap.create.span().css.setMany(INLINE_TICKcss).text.set("`");
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

  // 1️⃣ nested UL first
  const ulNested = /^(\s*)(--+)\s+(.*)$/.exec(line);
  if (ulNested) {
    const dashRun = ulNested[2] ?? "--";      // <-- NOT [1]
    const depth = Math.max(1, dashRun.length); // 
    const text = (ulNested[3] ?? "").trim();  // <-- NOT [2]
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
  const ol = /^(\d+)\)\s+(.*)$/.exec(line);
  if (ol) {
    const n = Number.parseInt(ol[1] ?? "1", 10);
    const text = (ol[2] ?? "").trim();

    return {
      kind: "ol",
      depth: 0,
      n: Number.isFinite(n) ? n : 1,
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
    const text = paraBuf.join(" ").trim();
    paraBuf = [];
    if (!text) return;

    const p = host.create.div().classlist.add("md-p");
    p.css.setMany(ABOUT_P_TEXTcss);
    render_inline(p, text);
  };

  const flushList = (): void => {
    if (!inList) return;

    const kind = listKind ?? "ul";
    const start = listStart;

    const list = host.create.div().classlist.add(kind === "ul" ? "md-ul" : "md-ol");
    list.css.setMany({
      display: "grid",
      gap: "6px",
      marginBottom: "10px",
      minWidth: "0",
    });

    for (let i = 0; i < listBuf.length; i += 1) {
      const item = listBuf[i];
      if (!item) continue;

      const li = list.create.div().classlist.add("md-li");
      li.css.setMany(ABOUT_LIST_ROWcss);

      // marker
      const marker =
        item.kind === "ul" ? item.marker : `${start + i})`;

      li.create.div()
        .text.set(marker)
        .css.setMany({
          ...ABOUT_LIST_MARKERcss,
          // CHANGED: indent marker + body for nested UL
          marginLeft: item.kind === "ul" ? `${item.depth * 14}px` : "0px",
        });

      // body
      const body = li.create.div().css.setMany({
        ...LIST_TEXTcss,
        paddingLeft: `${item.depth * 14}px`,
      });
      render_inline(body, item.text);
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

    const pre = host.create.div().classlist.add("md-pre");
    if (isLogo) return;

    for (const line of codeLines) {
      const row = pre.create.div();
      row.css.setMany({ whiteSpace: "pre" });

      const commentMatch = /(.*?)(\/\/.*|#.*)$/.exec(line);

      if (commentMatch) {
        const codePart = commentMatch[1] ?? "";
        const commentPart = commentMatch[2] ?? "";

        // CHANGED: fenced code is code — render with code highlighter
        if (codePart.length > 0) {
          render_inline_code(row, codePart);
          // or: render_code_parens(row, codePart); (but see note below)
        }

        row.create.span()
          .classlist.add("md-comment")
          .css.setMany(CODE_COMMENTScss)
          .text.set(commentPart);

        continue;
      }

      // CHANGED: whole line is code
      render_inline_code(row, line);
      // or: render_code_parens(row, line)
    }

    codeLang = null;
  };

  for (const rawLine of lines) {
    const line = rawLine ?? "";

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

    // headings
    const m = /^(#{1,4})\s+(.*)$/.exec(line);
    if (m) {
      flushPara();
      flushList();

      const marks = m[1] ?? "#";
      const level = marks.length as 1 | 2 | 3 | 4;
      const text = (m[2] ?? "").trim();

      const h = host.create.div().classlist.add(`md-h${level}`);
      h.css.setMany({
        marginTop: level === 1 ? "6px" : "2rem",
        marginBottom: "8px",
        fontFamily: "Monaco",
        letterSpacing: "0.06em",
        textTransform: level === 1 ? "uppercase" : "none",
        fontSize: level === 1 ? "24px" : level === 2 ? "19px" : level === 3 ? "15px" : "12px",
        fontWeight: level === 4 ? "900" : "400",
      });
      h.text.set(text);
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

  // pick a sane initial key without violating exactOptionalPropertyTypes
  const initialKey: AboutDocKey =
    (deps.initialDocKey ?? docs[0]?.key ?? "readme") as AboutDocKey;

  let activeKey: AboutDocKey = initialKey;

  // build TOC ONCE and keep handles
  const tocButtons: Array<{ key: AboutDocKey; btn: LiveTree }> = [];

  t.toc.empty();
  for (const d of docs) {
    const btn = t.toc.create.div()
      .classlist.add("about-doc-btn")
      .data.set("doc-key", d.key)
      .css.setMany(DOC_BTNcss);

    btn.text.set(d.title);

    // click uses setActive (defined below)
    btn.listen.onClick(() => setActive(d.key));

    tocButtons.push({ key: d.key, btn });
  }

  // single setActive, no nested redefinition, no TOC rebuild
  const setActive = (key: AboutDocKey): void => {
    const docSpec = find_doc(docs, key);
    if (!docSpec) return;

    activeKey = key;

    // title
    t.title.text.set(docSpec.title);

    // doc render
    render_doc_md(t.doc, docSpec.body);

    // highlight
    for (const x of tocButtons) {
      x.btn.css.setMany(x.key === activeKey ? DOC_BTN_ACTIVEcss : DOC_BTN_IDLEcss);
    }
  };

  // apply initial selection after TOC exists
  setActive(activeKey);
}

// ---- inline renderer (safe: text only; creates spans) ----

const INLINE_CODE_WRAPcss = {
  fontFamily: "Monaco",
  fontWeight: "700",
  opacity: "0.95",
} as const;

const INLINE_CODE_INNERcss = {
  color: $blu_.sky,
  fontFamily: "Monaco",
  fontWeight: "200",
  fontSize: "18px",
} as const;

const INLINE_PARENScss = {
  color: $grn_.dragon,
  fontFamily: "Monaco",
  fontWeight: "300",
} as const;

// CHANGED: small declarative rule system.
// “priority” is handled by order: earlier rules win.
type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; wrap: string; inner: string }
  | { kind: "parens"; text: string };

type InlineRule = {
  name: "code" | "parens";
  tryRead: (src: string, i: number) => { token: InlineToken; next: number } | null;
};

// CHANGED: backticks rule (single-line, no escapes, no nesting)
// Includes backticks in output, but exposes inner separately for styling.
const rule_backticks: InlineRule = {
  name: "code",
  tryRead: (src, i) => {
    if (src[i] !== "`") return null;

    const j = src.indexOf("`", i + 1);
    if (j === -1) return null; // unmatched; treat as normal text

    const inner = src.slice(i + 1, j);
    const wrap = src.slice(i, j + 1); // includes both backticks
    return { token: { kind: "code", wrap, inner }, next: j + 1 };
  },
};

// CHANGED: parens rule (simple non-nested)
// Colors "(...)" including the parentheses.
// If you want nesting later, that’s a separate upgrade.
const rule_parens: InlineRule = {
  name: "parens",
  tryRead: (src, i) => {
    if (src[i] !== "(") return null;

    const j = src.indexOf(")", i + 1);
    if (j === -1) return null;

    const text = src.slice(i, j + 1);
    return { token: { kind: "parens", text }, next: j + 1 };
  },
};

// CHANGED: your declarative registry (easy to extend later)
const INLINE_RULES: readonly InlineRule[] = [rule_backticks, rule_parens] as const;

function tokenize_inline(src: string, rules: readonly InlineRule[]): InlineToken[] {
  const out: InlineToken[] = [];

  let i = 0;
  let buf = "";

  const flushText = () => {
    if (!buf) return;
    out.push({ kind: "text", text: buf });
    buf = "";
  };

  while (i < src.length) {
    // Try rules in order (earlier wins).
    let matched: { token: InlineToken; next: number } | null = null;

    for (const r of rules) {
      const m = r.tryRead(src, i);
      if (m) {
        matched = m;
        break;
      }
    }

    if (!matched) {
      buf += src[i] ?? "";
      i += 1;
      continue;
    }

    flushText();
    out.push(matched.token);
    i = matched.next;
  }

  flushText();
  return out;
}

