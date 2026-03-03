// src/app/phases/hson-demo-3/about/about-init.ts

import type { LiveTree } from "hson-live";
import type { AboutDocKey, AboutDocs, AboutDocSpec } from "./about.types";
import { $blu_, $grn_ } from "../../../consts/colors.consts";
import { DOC_BTN_ACTIVEcss, DOC_BTN_IDLEcss, DOC_BTNcss, ABOUT_LIST_MARKERcss, ABOUT_LIST_ROWcss, LIST_TEXTcss, ABOUT_LOGOcss, ABOUT_NOT_LOGOcss, ABOUT_P_TEXTcss, MD_CODEcss, MD_PARENcss, MD_TICKcss } from "./about.css";

type ListItem = { depth: number; text: string };
type AboutInitDeps = Readonly<{
  docs: AboutDocs;
  initialDocKey?: AboutDocKey;
}>;

type AboutInitTargets = Readonly<{
  toc: LiveTree;
  doc: LiveTree;
  title: LiveTree;
}>;
type InlineSeg =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }; // text INSIDE the backticks

function split_inline_backticks(src: string): InlineSeg[] {
  // `code` always code. No quotes.
  const out: InlineSeg[] = [];
  let i = 0;

  while (i < src.length) {
    const a = src.indexOf("`", i);
    if (a === -1) {
      const tail = src.slice(i);
      if (tail) out.push({ kind: "text", text: tail });
      break;
    }

    // text before `
    if (a > i) out.push({ kind: "text", text: src.slice(i, a) });

    const b = src.indexOf("`", a + 1);
    if (b === -1) {
      // unmatched ` → treat as literal
      out.push({ kind: "text", text: src.slice(a) });
      break;
    }

    // code contents between ticks
    out.push({ kind: "code", text: src.slice(a + 1, b) });
    i = b + 1;
  }

  return out;
}

type CodeChunk =
  | { kind: "plain"; text: string }
  | { kind: "paren"; text: string };

// paren highlighting ONLY used inside code
function split_code_parens(src: string): CodeChunk[] {
  const out: CodeChunk[] = [];
  let buf = "";
  let depth = 0;
  let parenBuf = "";

  const flushPlain = () => {
    if (buf) out.push({ kind: "plain", text: buf });
    buf = "";
  };
  const flushParen = () => {
    if (parenBuf) out.push({ kind: "paren", text: parenBuf });
    parenBuf = "";
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i] ?? "";

    if (ch === "(") {
      if (depth === 0) {
        flushPlain();
      }
      depth++;
      parenBuf += ch;
      continue;
    }

    if (ch === ")") {
      if (depth > 0) {
        parenBuf += ch;
        depth--;
        if (depth === 0) flushParen();
        continue;
      }
      // stray ')'
      buf += ch;
      continue;
    }

    if (depth > 0) parenBuf += ch;
    else buf += ch;
  }

  // If we ended inside parens, just treat it as plain (safer)
  if (depth > 0) {
    // fold back into plain
    buf += parenBuf;
    parenBuf = "";
  }

  flushPlain();
  return out;
}

/**
 * Render inline text into spans:
 * - normal text → span
 * - `code` → tick span + code span + tick span
 * - inside code: (...) chunk colored
 */
function render_inline_md(line: LiveTree, src: string): void {
  const segs = split_inline_backticks(src);

  for (const seg of segs) {
    if (seg.kind === "text") {
      if (!seg.text) continue;
      line.create.span().text.set(seg.text);
      continue;
    }

    // code segment
    // opening tick
    line.create.span().classlist.add("md-tick").css.setMany(MD_TICKcss).text.set("`");

    const codeWrap = line.create.span().classlist.add("md-code").css.setMany(MD_CODEcss);

    // inner code with paren highlighting
    for (const ch of split_code_parens(seg.text)) {
      if (!ch.text) continue;
      if (ch.kind === "paren") {
        codeWrap.create.span().classlist.add("md-paren").css.setMany(MD_PARENcss).text.set(ch.text);
      } else {
        codeWrap.create.span().text.set(ch.text);
      }
    }

    // closing tick
    line.create.span().classlist.add("md-tick").css.setMany(MD_TICKcss).text.set("`");
  }
}

// ---- markdown-ish renderer (safe: text only) ----
function render_doc_md(host: LiveTree, src: string): void {
  host.empty();

  const lines = src.replace(/\r\n/g, "\n").split("\n");

  let codeLang: string | null = null;
  let inCode = false;
  let codeBuf: string[] = [];

  let paraBuf: string[] = [];

  let listBuf: ListItem[] = [];
  let inList = false;
  let listKind: "ul" | "ol" | null = null;
  let listStart = 1;

  // ADDED: detect list continuation lines ONLY when indented (tabs/spaces)
  const isIndented = (s: string): boolean => /^[\t ]+/.test(s);

  // only append continuation lines when indented
  const appendToLastListItem = (txt: string): void => {
    if (!inList) return;
    if (listBuf.length === 0) return;

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

    // remove color from container to prevent inheriting/bleed
    list.css.setMany({
      display: "grid",
      gap: "6px",
      marginBottom: "10px",
      minWidth: "0",
    });
    for (let i = 0; i < listBuf.length; i++) {
      const it = listBuf[i];
      const item = (it?.text ?? "").trim(); // CHANGED

      const li = list.create.div().classlist.add("md-li");
      li.css.setMany(ABOUT_LIST_ROWcss);

      const marker = kind === "ul" ? "•" : `${start + i})`;

      li.create.div().text.set(marker).css.setMany(ABOUT_LIST_MARKERcss);
      const body = li.create.div().css.setMany(LIST_TEXTcss);
      render_inline(body, item);
    }

    // reset
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
    if (isLogo) pre.classlist.add("md-logo");

    pre.css.setMany(isLogo ? ABOUT_LOGOcss : ABOUT_NOT_LOGOcss);

    for (const line of codeLines) {
      const row = pre.create.div();
      row.css.setMany({ whiteSpace: "pre" });

      // simple comment detection
      const commentMatch = /(.*?)(\/\/.*|#.*)$/.exec(line);

      if (commentMatch) {
        const codePart = commentMatch[1] ?? "";
        const commentPart = commentMatch[2] ?? "";

        if (codePart.length > 0) {
          row.create.span().text.set(codePart);
        }

        row.create.span()
          .classlist.add("md-comment")
          .css.set.color($grn_.std)
          .text.set(commentPart);
      } else {
        row.text.set(line);
      }
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
        continue;
      } else {
        inCode = false;
        flushCode();
        continue;
      }
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
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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

    // list item (supports -, *, +, • and 1) style)
    {
      const ul = /^([*\-+•])\s+(.*)$/.exec(line); // requires at least one space
      const ol = /^(\d+)\)\s+(.*)$/.exec(line);
      // UL depth>=1: must be dashes: --, ---, ---- ...
      const ulNested = /^(--+)\s+(.*)$/.exec(line);

      // UL depth 0: -, *, • (and you can keep + if you want, but you said dots+asterisks+dashes)
      const ulTop = /^([*\-•])\s+(.*)$/.exec(line);

      if (ulNested) {
        flushPara();

        if (!inList || listKind !== "ul") {
          flushList();
          inList = true;
          listKind = "ul";
          listStart = 1;
        }

        const dashRun = ulNested[1] ?? "--";
        const depth = Math.max(1, dashRun.length - 1); // "--" => 1, "---" => 2
        listBuf.push({ depth, text: (ulNested[2] ?? "").trim() });
        continue;
      }

      if (ulTop) {
        flushPara();

        if (!inList || listKind !== "ul") {
          flushList();
          inList = true;
          listKind = "ul";
          listStart = 1;
        }

        listBuf.push({ depth: 0, text: (ulTop[2] ?? "").trim() });
        continue;
      }

      if (ol) {
        flushPara();

        const n = Number.parseInt(ol[1] ?? "1", 10);
        const start = Number.isFinite(n) ? n : 1;

        // start or continue OL
        if (!inList || listKind !== "ol") {
          flushList();
          inList = true;
          listKind = "ol";
          listStart = start;
        }

        listBuf.push({ depth: 0, text: (ol[2] ?? "").trim() }); // CHANGED
        continue;
      }

      // continuation lines only when indented
      if (inList && isIndented(line)) {
        appendToLastListItem(line);
        continue;
      }

      // if we're in a list and hit normal (non-indented) text,
      // close the list FIRST so we don't "swap" lines or leak list styling/structure.
      if (inList) {
        flushList();
      }
    }

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

// CHANGED: keep these styles near your existing ABOUT_*css objects.
// Use whatever palette vars you already have.
const INLINE_CODE_WRAPcss = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontWeight: "700",
  opacity: "0.95",
} as const;

const INLINE_CODE_INNERcss = {
  color: $blu_.sky,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontWeight: "200",
  fontSize: "18px",
} as const;

const INLINE_PARENScss = {
  color: $grn_.dragon,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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

// CHANGED: render tokens into a container.
// This container should be an element you already created (p/li/etc).
function render_inline(container: LiveTree, src: string): void {
  // important: don’t container.empty() unless you want to blow away other structure.
  // In your usage below, you’ll call it on a fresh div, so it’s fine either way.
  // container.empty();

  const tokens = tokenize_inline(src, INLINE_RULES);

  for (const tok of tokens) {
    if (tok.kind === "text") {
      container.create.span().text.set(tok.text);
      continue;
    }

    if (tok.kind === "code") {
      // render: `foo` with the wrap and inner styled differently
      const wrap = container.create.span().css.setMany(INLINE_CODE_WRAPcss);

      // include the backticks, but style inner separately
      wrap.create.span().text.set("`");
      wrap.create.span().css.setMany(INLINE_CODE_INNERcss).text.set(tok.inner);
      wrap.create.span().text.set("`");
      continue;
    }

    if (tok.kind === "parens") {
      container.create.span().css.setMany(INLINE_PARENScss).text.set(tok.text);
      continue;
    }
  }
}