// src/app/phases/hson-demo-3/about/about-init.ts

import type { LiveTree } from "hson-live";
import type { AboutDocKey, AboutDocs, AboutDocSpec } from "./about.types";
import { $cols_, $grn_, $gry_, $red_etc_, $ylw_ } from "../../../consts/colors.consts";

type AboutInitDeps = Readonly<{
  docs: AboutDocs;
  initialDocKey?: AboutDocKey;
}>;

type AboutInitTargets = Readonly<{
  toc: LiveTree;
  doc: LiveTree;
  title: LiveTree;
}>;

const DOC_BTNcss = {
  display: "grid",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: "10px",
  cursor: "pointer",
  userSelect: "none",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  letterSpacing: "0.06em",
  background: "rgba(0,0,0,0.18)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

const DOC_BTN_ACTIVEcss = {
  background: "rgba(120,255,210,0.10)",
  boxShadow: "inset 0 0 0 1px rgba(120,255,210,0.22)",
} as const;

const DOC_BTN_IDLEcss = {
  background: "rgba(0,0,0,0.18)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

const P_TEXTcss = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.55",
  marginBottom: "10px",
  color: $cols_.txtmain,
  textIndent: "4ch",
}

const LI_TEXTcss = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.55",
}


const LOGOcss = {
  // ASCII logo: preserve spacing, tighter leading, allow horizontal scroll
  whiteSpace: "pre",
  overflowX: "hidden",
  // overflowY: "auto",
  padding: "12px 12px",
  background: $cols_.backdeep,
  color: $ylw_.candy,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  marginBottom: "12px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "12px",
  lineHeight: "1.1",
  margin: "auto auto",
  letterSpacing: "0",
}

const NOT_LOGOcss = {
  // normal code blocks
  whiteSpace: "pre-line",
  overflowX: "auto",
  padding: "10px 12px",
  background: $cols_.backdeep,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  marginBottom: "12px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "16px",
  lineHeight: "1.45",
}
// ---- markdown-ish renderer (safe: text only) ----

function render_doc_md(host: LiveTree, src: string): void {
  host.empty();

  const lines = src.replace(/\r\n/g, "\n").split("\n");

  let codeLang: string | null = null;
  let inCode = false;
  let codeBuf: string[] = [];

  let paraBuf: string[] = [];
  let listBuf: string[] = [];
  let inList = false;
  let listKind: "ul" | "ol" | null = null;
  let listStart = 1;

  const flushPara = (): void => {
    const text = paraBuf.join(" ").trim();
    paraBuf = [];
    if (!text) return;

    const p = host.create.div().classlist.add("md-p");
    p.css.setMany(P_TEXTcss)
      .text.set(text);
  };

  const flushList = (): void => {
    if (!inList) return;
    inList = false;

    const kind = listKind ?? "ul";
    const start = listStart;

    const list = host.create.div().classlist.add(kind === "ul" ? "md-ul" : "md-ol");
    list.css.setMany({ display: "grid", gap: "6px", marginBottom: "10px", color: $grn_.easter });

    for (let i = 0; i < listBuf.length; i++) {
      const item = listBuf[i] ?? "";
      const li = list.create.div().classlist.add("md-li");
      li.css.setMany({ display: "grid", gridTemplateColumns: "22px 1fr", gap: "8px", textIndent: "2rem" });

      const marker =
        kind === "ul" ? "•" : `${start + i})`;

      li.create.div().text.set(marker);
      li.create.div().text.set(item).css.setMany(LI_TEXTcss);
    }

    listBuf = [];
    listKind = null;
    listStart = 1;
  };

  const flushCode = (): void => {
    const lines = codeBuf.slice();
    codeBuf = [];
    if (lines.length === 0) return;

    const isLogo = (codeLang ?? "").toLowerCase() === "hson";

    const pre = host.create.div().classlist.add("md-pre");
    if (isLogo) pre.classlist.add("md-logo");

    pre.css.setMany(
      isLogo
        ? LOGOcss
        : NOT_LOGOcss,
    );
    for (const line of lines) {
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
          .css.set.color( $grn_.std)
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
    const m = /^(#{1,3})\s+(.*)$/.exec(line);
    if (m) {
      flushPara();
      flushList();

      // CHANGED: make TS happy + keep logic obvious
      const marks = m[1] ?? "#";
      const level = marks.length as 1 | 2 | 3;
      const text = (m[2] ?? "").trim();

      const h = host.create.div().classlist.add(`md-h${level}`);
      h.css.setMany({
        marginTop: level === 1 ? "6px" : "2rem",
        marginBottom: "8px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        letterSpacing: "0.06em",
        textTransform: level === 1 ? "uppercase" : "none",
        fontSize: level === 1 ? "24px" : level === 2 ? "19px" : "15px",
      });
      h.text.set(text);
      continue;
    }

    // list item
    // list item (supports -, *, +, and 1) style)
    {
      const ul = /^([*\-+])\s+(.*)$/.exec(line);
      const ol = /^(\d+)\)\s+(.*)$/.exec(line);

      if (ul) {
        flushPara();

        // start or continue UL
        if (!inList || listKind !== "ul") {
          flushList(); // if we were in a different list kind
          inList = true;
          listKind = "ul";
        }

        listBuf.push((ul[2] ?? "").trim());
        continue;
      }

      if (ol) {
        flushPara();

        const n = Number.parseInt(ol[1] ?? "1", 10);
        const item = (ol[2] ?? "").trim();

        // start or continue OL (but reset if numbering jumps backwards)
        if (!inList || listKind !== "ol") {
          flushList();
          inList = true;
          listKind = "ol";
          listStart = Number.isFinite(n) ? n : 1;
        } else if (Number.isFinite(n) && n < listStart) {
          // defensive: weird numbering, treat as a new list
          flushList();
          inList = true;
          listKind = "ol";
          listStart = n;
        }

        listBuf.push(item);
        continue;
      }
    }

    // blank line splits
    if (line.trim().length === 0) {
      flushPara();
      flushList();
      continue;
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

  // CHANGED: pick a sane initial key without violating exactOptionalPropertyTypes
  const initialKey: AboutDocKey =
    (deps.initialDocKey ?? docs[0]?.key ?? "readme") as AboutDocKey;

  let activeKey: AboutDocKey = initialKey;

  // CHANGED: build TOC ONCE and keep handles
  const tocButtons: Array<{ key: AboutDocKey; btn: LiveTree }> = [];

  t.toc.empty();
  for (const d of docs) {
    const btn = t.toc.create.div()
      .classlist.add("about-doc-btn")
      .data.set("doc-key", d.key)
      .css.setMany(DOC_BTNcss);

    btn.text.set(d.title);

    // CHANGED: click uses setActive (defined below)
    btn.listen.onClick(() => setActive(d.key));

    tocButtons.push({ key: d.key, btn });
  }

  // CHANGED: single setActive, no nested redefinition, no TOC rebuild
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

  // CHANGED: apply initial selection after TOC exists
  setActive(activeKey);
}