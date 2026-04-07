// src/app/phases/hson-demo-3/about/about-init.ts

import type { LiveTree } from "hson-live";
import type { AboutDocKey, AboutDocs, AboutDocSpec } from "./about.types";
import { INLINE_CODEcss, CODE_PARENcss, CODE_PAREN_INNERcss, CODE_COMMENTScss, CODE_EQUALSscss, CODE_PUNCTcss, CODE_QUOTEcss,  SPECIAL_WORDScss } from "./about.css";
import type { CssMap } from "hson-live/types";
import { MD_TERM_RE } from "./about.consts";



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

export type AboutInitDeps = Readonly<{
  docs: AboutDocs;
  initialDocKey?: AboutDocKey;
}>;

export type AboutInitTargets = Readonly<{
  toc: LiveTree;
  doc: LiveTree;
}>;

export type ListKind = "ul" | "ol" | "anti";
export type ListItem =
  | { kind: "ul"; depth: number; marker: string; text: string }
  | { kind: "ol"; depth: number; n: number; text: string }
  | { kind: "anti"; depth: number; marker: string; text: string };

// -----------------------------
// Inline rendering (single entrypoint)
// - backticks are always code
// - parens highlighting only happens inside code segments
// -----------------------------
type InlineSeg = { kind: "text" | "code"; s: string };

export function split_inline_backticks(src: string): InlineSeg[] {
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

// one renderer for fenced code lines AND inline code segments.
// - Handles comments, parens, dot, equals, and double quotes.
// - Preserves whitespace (assumes container/row has whiteSpace: "pre"; white-space is inherited).
export function render_inline_code(row: LiveTree, code: string): void {
  // base “ink” so code isn’t dependent on outer containers.
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
  // the one true inline renderer.
  const segs = split_inline_backticks(src);

  for (const seg of segs) {
    if (!seg.s) continue;

    if (seg.kind === "text") {
      // host.create.span().text.set(seg.s);
      render_prose_text(host, seg.s);
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
export const isIndented = (s: string): boolean => /^[\t ]+/.test(s);
export function parse_list_item(line: string): ListItem | null {

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

export function find_doc(docs: AboutDocs, key: AboutDocKey): AboutDocSpec | undefined {
  return docs.find((d) => d.key === key);
}


export function split_trailing_comment(line: string): { body: string; comment: string } | null {
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

export function render_line_with_comment(
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

export function extractUrl(line: string): string | null {
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

function render_prose_text(host: LiveTree, text: string): void {
  let lastIx = 0;
  MD_TERM_RE.lastIndex = 0;

  for (const m of text.matchAll(MD_TERM_RE)) {
    const hit = m[0];
    const ix = m.index ?? 0;

    if (ix > lastIx) {
      host.create.span().text.set(text.slice(lastIx, ix));
    }

    host.create.span()
      .classlist.add("md-term")
      .css.setMany(SPECIAL_WORDScss)
      .text.set(hit);

    lastIx = ix + hit.length;
  }

  if (lastIx < text.length) {
    host.create.span().text.set(text.slice(lastIx));
  }
}


