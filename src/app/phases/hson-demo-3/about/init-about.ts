// src/app/phases/hson-demo-3/about/about-init.ts

import type { LiveTree } from "hson-live";
import type { AboutDocKey, AboutDocs, AboutDocSpec } from "./about.types";
// import README from "../../../../../../hson-live";

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

// ---- markdown-ish renderer (safe: text only) ----

function render_doc_md(host: LiveTree, src: string): void {
  host.empty();

  const lines = src.replace(/\r\n/g, "\n").split("\n");

  let inCode = false;
  let codeBuf: string[] = [];

  let paraBuf: string[] = [];
  let listBuf: string[] = [];
  let inList = false;

  const flushPara = (): void => {
    const text = paraBuf.join(" ").trim();
    paraBuf = [];
    if (!text) return;

    const p = host.create.div().classlist.add("md-p");
    p.css.setMany({
      whiteSpace: "pre-wrap",
      lineHeight: "1.55",
      opacity: "0.92",
      marginBottom: "10px",
    });
    p.text.set(text);
  };

  const flushList = (): void => {
    if (!inList) return;
    inList = false;

    const ul = host.create.div().classlist.add("md-ul");
    ul.css.setMany({ display: "grid", gap: "6px", marginBottom: "10px" });

    for (const item of listBuf) {
      const li = ul.create.div().classlist.add("md-li");
      li.css.setMany({ display: "grid", gridTemplateColumns: "14px 1fr", gap: "8px" });

      li.create.div().text.set("•").css.setMany({ opacity: "0.7" });
      li.create.div().text.set(item).css.setMany({ whiteSpace: "pre-wrap", lineHeight: "1.55" });
    }

    listBuf = [];
  };

  const flushCode = (): void => {
    const text = codeBuf.join("\n");
    codeBuf = [];
    if (!text) return;

    const pre = host.create.div().classlist.add("md-pre");
    pre.css.setMany({
      whiteSpace: "pre",
      overflowX: "hidden",
      padding: "10px 12px",
      borderRadius: "12px",
      background: "rgba(0,0,0,0.35)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
      marginBottom: "12px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: "12px",
      lineHeight: "1.45",
    });
    pre.text.set(text);
  };

  for (const rawLine of lines) {
    const line = rawLine ?? "";

    // fenced code
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        flushPara();
        flushList();
        inCode = true;
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
        marginTop: level === 1 ? "6px" : "10px",
        marginBottom: "8px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        letterSpacing: "0.06em",
        textTransform: level === 1 ? "uppercase" : "none",
        opacity: "0.95",
        fontSize: level === 1 ? "16px" : level === 2 ? "14px" : "13px",
      });
      h.text.set(text);
      continue;
    }

    // list item
    const li = /^-\s+(.*)$/.exec(line);
    if (li) {
      flushPara();
      inList = true;
      listBuf.push((li[1] ?? "").trim());
      continue;
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
  const initialKey = deps.initialDocKey ?? docs[0]?.key ?? "readme";

  let activeKey: AboutDocKey = initialKey;

  const setActive = (key: AboutDocKey): void => {
    const docSpec = find_doc(docs, key);
    if (!docSpec) return;

    activeKey = key;

    // title
    t.title.text.set(docSpec.title);

    // doc render
    render_doc_md(t.doc, docSpec.body);

    const tocButtons: Array<{ key: AboutDocKey; btn: LiveTree }> = [];

    t.toc.empty();
    for (const d of docs) {
      const btn = t.toc.create.div()
        .classlist.add("about-doc-btn")
        .data.set("doc-key", d.key)
        .css.setMany(DOC_BTNcss);

      btn.text.set(d.title);
      btn.listen.onClick(() => setActive(d.key));

      tocButtons.push({ key: d.key, btn });
    }

    const setActive = (key: AboutDocKey): void => {
      const docSpec = find_doc(docs, key);
      if (!docSpec) return;

      activeKey = key;
      t.title.text.set(docSpec.title);
      render_doc_md(t.doc, docSpec.body);

      // CHANGED: highlight via tracked handles (no DOM traversal, no LiveTree.children)
      for (const x of tocButtons) {
        x.btn.css.setMany(x.key === activeKey ? DOC_BTN_ACTIVEcss : DOC_BTN_IDLEcss);
      }
    };
  };

  // build TOC (doc list)
  t.toc.empty();
  for (const d of docs) {
    const b = t.toc.create.div()
      .classlist.add("about-doc-btn")
      .data.set("doc-key", d.key)
      .css.setMany(DOC_BTNcss);

    b.text.set(d.title);

    b.listen.onClick(() => setActive(d.key));
  }

  setActive(activeKey);
}