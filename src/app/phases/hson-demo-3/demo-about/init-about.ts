// src/app/phases/hson-demo-3/about/about-init.ts

import type { LiveTree } from "hson-live";
import type { AboutDocKey, AboutDocs, AboutDocSpec } from "./about.types";
import { $grn_ } from "../../../consts/colors.consts";
import { DOC_BTN_ACTIVEcss, DOC_BTN_IDLEcss, DOC_BTNcss, ABOUT_LIST_MARKERcss, ABOUT_LIST_ROWcss, LIST_TEXTcss, ABOUT_LOGOcss, ABOUT_NOT_LOGOcss, ABOUT_P_TEXTcss } from "./about.css";

type AboutInitDeps = Readonly<{
  docs: AboutDocs;
  initialDocKey?: AboutDocKey;
}>;

type AboutInitTargets = Readonly<{
  toc: LiveTree;
  doc: LiveTree;
  title: LiveTree;
}>;

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

  // ADDED: detect list continuation lines ONLY when indented (tabs/spaces)
  const isIndented = (s: string): boolean => /^[\t ]+/.test(s);

  // CHANGED: only append continuation lines when indented
  const appendToLastListItem = (txt: string): void => {
    if (!inList) return;
    if (listBuf.length === 0) return;

    // keep a newline so “label” and “explanation” stay visually separate
    const last = listBuf[listBuf.length - 1] ?? "";
    listBuf[listBuf.length - 1] = `${last}\n${txt.trim()}`;
  };

  const flushPara = (): void => {
    const text = paraBuf.join(" ").trim();
    paraBuf = [];
    if (!text) return;

    const p = host.create.div().classlist.add("md-p");
    p.css.setMany(ABOUT_P_TEXTcss).text.set(text);
  };

  const flushList = (): void => {
    if (!inList) return;

    const kind = listKind ?? "ul";
    const start = listStart;

    const list = host.create.div().classlist.add(kind === "ul" ? "md-ul" : "md-ol");

    // CHANGED: remove color from container to prevent inheriting/bleed
    list.css.setMany({
      display: "grid",
      gap: "6px",
      marginBottom: "10px",
      minWidth: "0",
    });

    for (let i = 0; i < listBuf.length; i++) {
      const item = (listBuf[i] ?? "").trim();
      const li = list.create.div().classlist.add("md-li");
      li.css.setMany(ABOUT_LIST_ROWcss);

      const marker = kind === "ul" ? "•" : `${start + i})`;

      li.create.div().text.set(marker).css.setMany(ABOUT_LIST_MARKERcss);
      li.create.div().text.set(item).css.setMany(LIST_TEXTcss);
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
      const ul = /^([*\-+•])\s+(.*)$/.exec(line); // CHANGED: requires at least one space
      const ol = /^(\d+)\)\s+(.*)$/.exec(line);

      if (ul) {
        flushPara();

        // start or continue UL
        if (!inList || listKind !== "ul") {
          flushList(); // if we were in a different list kind
          inList = true;
          listKind = "ul";
          listStart = 1;
        }

        listBuf.push((ul[2] ?? "").trim());
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

        listBuf.push((ol[2] ?? "").trim());
        continue;
      }

      // CHANGED: continuation lines only when indented
      if (inList && isIndented(line)) {
        appendToLastListItem(line);
        continue;
      }

      // CHANGED: if we're in a list and hit normal (non-indented) text,
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