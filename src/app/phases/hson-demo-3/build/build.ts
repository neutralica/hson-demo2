// build.factory.ts

import type { LiveTree } from "hson-live";
import { relay, type Outcome } from "intrastructure";
import { BUILD_BTNcss, BUILD_HEADcss, BUILD_HTMLBOXcss, BUILD_PANE_BODYcss, BUILD_PREVIEWHOSTcss, BUILD_ROOTcss, BUILD_SPACERcss, BUILD_STATUScss, BUILD_TAB_ACTIVEcss, BUILD_TABcss, BUILD_TEXTAREAcss, BUILD_TEXTWRAPcss, BUILD_TITLEcss, BUILD_TOGGLEcss, BUILD_WATERMARK_EMPTYcss, BUILD_WATERMARK_FMTcss } from "./build.css";
import { PANELcss } from "../panels/demo-panels.css";

// CHANGED: keep this parallel to pp_factory return shape: root + handles
export type BuildPanel = Readonly<{
  root: LiveTree;

  // two panes
  src: BuildPane;
  out: BuildPane;

  // shared controls
  tabs: {
    render: LiveTree;
    html: LiveTree;
  };

  // content handles
  input: {
    wrap: LiveTree;
    textarea: LiveTree;
    wmFmt: LiveTree;
    wmEmpty: LiveTree;
    status: LiveTree;
    chip: LiveTree;
    copyBtn: LiveTree;
    clearBtn: LiveTree;
    testBtn: LiveTree;
  };

  output: {
    wrap: LiveTree;
    previewHost: LiveTree;
    htmlBox: LiveTree;
  };
}>;

export type BuildPane = Readonly<{
  panel: LiveTree;
  head: LiveTree;
  body: LiveTree;
  title: LiveTree;
  spacer: LiveTree;
}>;

type BuildFactoryOpts = Readonly<{
  // default starter HSON
  seed?: string;
}>;

// IDs / consts
const $BUILD_ROOT = "build-root" as const;

const DEFAULT_SEED = `<div style="display:grid;grid-template-columns:80px 80px 80px;gap:14px;align-items:center;padding:12px;">
  <div style="width:72px;height:72px;background:#7ef0c7;border-radius:10px;"></div>
  <div style="width:72px;height:72px;background:#6fb4ff;border-radius:10px;"></div>
  <div style="width:72px;height:72px;background:#ffb36b;border-radius:999px;"></div>
</div>`;

export function bp_factory(hostBody: LiveTree, opts: BuildFactoryOpts = {}): Outcome<BuildPanel> {
  // CHANGED: idempotent remove like pp_factory
  const old = hostBody.find.byId($BUILD_ROOT);
  if (old) old.removeSelf();

  // root: two columns
  const root = hostBody.create.div()
    .id.set($BUILD_ROOT)
    .classlist.set("build-root")
    .css.setMany(BUILD_ROOTcss);

  // helper: make one pane
  const makePane = (key: "src" | "out", titleTxt: string): BuildPane => {
    const panel = root.create.section()
      .classlist.set(`build-pane build-pane--${key}`)
      .css.setMany(PANELcss); // reuse your standard panel surface if desired

    const head = panel.create.div()
      .classlist.set("build-head")
      .css.setMany(BUILD_HEADcss);

    const title = head.create.div()
      .classlist.set("build-title")
      .text.set(titleTxt)
      .css.setMany(BUILD_TITLEcss);

    const spacer = head.create.div()
      .classlist.set("build-spacer")
      .css.setMany(BUILD_SPACERcss);

    const body = panel.create.div()
      .classlist.set("build-body")
      .css.setMany(BUILD_PANE_BODYcss);

    return { panel, head, body, title, spacer };
  };

  const src = makePane("src", "HSON");
  const out = makePane("out", "OUTPUT");

  // ---- SRC head controls (test + clear + copy) ----

  const testBtn = src.head.create.div()
    .classlist.set("build-btn build-btn--test")
    .text.set("test")
    .css.setMany(BUILD_BTNcss)
    .setAttrs({ role: "button", tabindex: "0", "aria-label": "test build loop" });

  const clearBtn = src.head.create.div()
    .classlist.set("build-btn build-btn--clear")
    .text.set("clear")
    .css.setMany(BUILD_BTNcss)
    .setAttrs({ role: "button", tabindex: "0", "aria-label": "clear input" });

  const copyBtn = src.head.create.div()
    .classlist.set("build-btn build-btn--copy")
    .text.set("copy")
    .css.setMany(BUILD_BTNcss)
    .setAttrs({ role: "button", tabindex: "0", "aria-label": "copy input" });

  // ---- SRC body: wrap + overlays + textarea ----

  const inputWrap = src.body.create.div()
    .classlist.set("build-textwrap")
    .css.setMany(BUILD_TEXTWRAPcss);

  const wmFmt = inputWrap.create.div()
    .classlist.set("build-watermark build-watermark--fmt")
    .text.set("HSON")
    .css.setMany(BUILD_WATERMARK_FMTcss);

  const wmEmpty = inputWrap.create.div()
    .classlist.set("build-watermark build-watermark--empty")
    .text.set("<>")
    .css.setMany(BUILD_WATERMARK_EMPTYcss);

  const status = inputWrap.create.div()
    .classlist.set("build-status")
    .text.set("")
    .css.setMany(BUILD_STATUScss);

  const textarea = inputWrap.create.textarea()
    .classlist.set("build-textarea")
    .data.set("input", "hson")
    .css.setMany(BUILD_TEXTAREAcss);

  // CHANGED: chip is sibling overlay, not a child of textarea (textarea can’t have children)
  const chip = inputWrap.create.div()
    .classlist.set("build-chip validity")
    .text.set("");

  // seed value (optional)
  const seed = opts.seed ?? DEFAULT_SEED;
  void textarea.setFormValue(seed, { silent: true });

  // ---- OUT head: tabs (render/html) ----

  const toggle = out.head.create.div()
    .classlist.set("build-toggle")
    .css.setMany(BUILD_TOGGLEcss);

  const tabRender = toggle.create.div()
    .classlist.set("build-tab build-tab--render")
    .data.set("tab", "render")
    .text.set("render")
    .css.setMany({ ...BUILD_TABcss, ...BUILD_TAB_ACTIVEcss })
    .setAttrs({ role: "button", tabindex: "0", "aria-label": "show render preview" });

  const tabHtml = toggle.create.div()
    .classlist.set("build-tab build-tab--html")
    .data.set("tab", "html")
    .text.set("html")
    .css.setMany(BUILD_TABcss)
    .setAttrs({ role: "button", tabindex: "0", "aria-label": "show html output" });

  // ---- OUT body: preview host + html box ----

  const outWrap = out.body.create.div()
    .classlist.set("build-outwrap")
    .css.setMany(BUILD_TEXTWRAPcss);

  const previewHost = outWrap.create.div()
    .classlist.set("build-previewHost")
    .css.setMany(BUILD_PREVIEWHOSTcss);

  const htmlBox = outWrap.create.textarea()
    .classlist.set("build-htmlBox")
    .data.set("output", "html")
    .css.setMany(BUILD_HTMLBOXcss);

  // default hidden until tab = html
  htmlBox.css.setMany({ display: "none" });

  return relay.data({
    root,
    src,
    out,
    tabs: { render: tabRender, html: tabHtml },
    input: {
      wrap: inputWrap,
      textarea,
      wmFmt,
      wmEmpty,
      status,
      chip,
      copyBtn,
      clearBtn,
      testBtn,
    },
    output: {
      wrap: outWrap,
      previewHost,
      htmlBox,
    },
  });
}