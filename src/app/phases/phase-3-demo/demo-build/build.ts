// build.factory.ts

import type { LiveTree } from "hson-live";
import { relay, type Outcome } from "intrastructure";
import { BUILD_BODYcss, BUILD_BTNcss, BUILD_HEADcss, BUILD_HTMLBOXcss, BUILD_PANEcss, BUILD_PREVIEWcss, BUILD_ROOTcss, BUILD_SPACERcss, BUILD_STATUScss, BUILD_TAB_ACTIVEcss, BUILD_TABcss, BUILD_TEXTAREAcss, BUILD_TEXTWRAPcss, BUILD_TITLEcss, BUILD_TOGGLEcss, BUILD_WATERMARK_EMPTYcss, BUILD_WATERMARK_FMTcss } from "./build.css";
import { PANELcss } from "../panels/demo-panels.css";
import { $blu_, $cols_, $grn_, $ylw_ } from "../../../core/consts/colors.consts";

// keep this parallel to pp_factory return shape: root + handles
export type BuildDemo = Readonly<{
  root: LiveTree;

  // two panes
  src: BuildPanel;
  out: BuildPanel;

  // shared controls
  tabs: {
    render: LiveTree;
    html: LiveTree;
  };

  // content handles
  input: {
    wrap: LiveTree;
    textarea: LiveTree;
    // wmFmt: LiveTree;
    // wmEmpty: LiveTree;
    status: LiveTree;
    // chip: LiveTree;
    copyBtn: LiveTree;
    clearBtn: LiveTree;
    // testBtn: LiveTree;
  };

  output: {
    wrap: LiveTree;
    previewHost: LiveTree;
    htmlBox: LiveTree;
  };
}>;

export type BuildPanel = Readonly<{
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

const DEFAULT_SEED = `
<div id="build-demo" style="
  background: #02070d;
  border-left: 1px solid rgba(120,180,255,0.28);
  border-right: 1px solid rgba(120,180,255,0.12);
  box-sizing: border-box; color: white; display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  padding: 28px 34px 26px 34px; 
  height: 100%;
  width: 100%"
    <div style="
      display: flex;
      align-items: flex-start;
      justify-content: space-between"
        <div style="
          background: rgba(160,220,255,0.35); 
          height: 1px; 
          margin-top: 22px; 
          width: 120px
        "/>
        <h1 id="build-heading" style="
          color: rgba(175,220,255,0.96); 
          font-family: monospace; 
          font-size: 1.95rem; 
          font-weight: 700; 
          letter-spacing: 0.16em; 
          margin: 0; 
          text-align: center
        "
          "HSON BUILD DEMO"
        />
    <div style="
      background: rgba(160,220,255,0.35); 
      height: 1px; 
      margin-top: 22px; 
      width: 120px
    "/>
  />
  <div style="
    display: flex; 
    justify-content: center; 
    margin-top: 10px
  "
    <div style="
      color: rgba(255,180,40,0.96); 
      font-family: monospace; 
      font-size: 1rem; 
      letter-spacing: 0.08em; 
      text-align: center
    "
      "<- edit the HSON string"
    />
  />
  <div style="
    display: grid; 
    padding: 30px 0 24px 0; 
    place-items: center
  "
    <div style="
      align-items: center; 
      column-gap: 26px; 
      display: grid; 
      grid-template-columns: 1fr auto 1fr; 
      max-width: 980px; 
      width: 100%
    "
      <div style="
        background: linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.32)); 
        height: 1px
      "/>
      <div style="
        background-color: dodgerblue; 
        border: 12px solid navy; 
        box-sizing: border-box; 
        height: 300px; 
        position: relative; 
        width: 300px
      "
        <div style="
          display: grid; 
          inset: 0; 
          place-items: 
          center; position:
          absolute
        "
          <div style="
            color: navy; 
            font-family: Comic Sans MS; 
            font-size: 52px; 
            letter-spacing: -0.04em; 
            line-height: 0.6; 
            text-align: left
          "
            <div "hs"/>
            <div "on"/>
          />
        />
        <div style="
          background: rgba(189,171,92,1);
          border-radius: 999px;
          bottom: 5px; 
          color: navy; 
          display: grid; 
          font-family: monospace; 
          font-size: 26px; 
          height: 60px; 
          left: 5px; 
          place-items: 
          center; 
          position: absolute; 
          transform: rotate(90deg); 
          width: 60px"
            ":)"
        />
      />
      <div style="
      background: linear-gradient(90deg,rgba(255,255,255,0.32),rgba(255,255,255,0)); 
      height: 1px
      "/>
    />
  />
  <div style="
    background: linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.22),rgba(255,255,255,0)); 
    height: 1px
  "/>
  <div style="
    display: flex; 
    justify-content: center; 
    padding-top: 18px
  "
    <div style="
      color: rgba(255,180,40,0.96); 
      font-family: monospace; 
      font-size: 1rem; 
      letter-spacing: 0.08em; 
      text-align: center
    "
      "...change HTML in realtime"
    />
  />

/>
`;

export function bp_factory(hostBody: LiveTree, opts: BuildFactoryOpts = {}): Outcome<BuildDemo> {
  // CHANGED: idempotent remove
  const old = hostBody.find.byId($BUILD_ROOT);
  if (old) old.removeSelf();

  // CHANGED: true two-pane root
  const root = hostBody.create.div()
    .id.set($BUILD_ROOT)
    .classlist.set("build-root")
    .css.setMany(BUILD_ROOTcss);

  // CHANGED: pane helper now creates a stable head/body grid
  const makePane = (key: "src" | "out", titleTxt: string): BuildPanel => {
    const panel = root.create.section()
      .classlist.set(`build-pane build-pane--${key}`)
      .css.setMany(BUILD_PANEcss);

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
      .css.setMany(BUILD_BODYcss);

    return { panel, head, body, title, spacer };
  };

  const src = makePane("src", "HSON");
  const out = makePane("out", "OUTPUT");

  // --------------------------------------------------
  // SRC head controls
  // --------------------------------------------------

  const clearBtn = src.head.create.div
  ()
    .classlist.set("build-btn build-btn--clear")
    .text.set("clear")
    .css.setMany(BUILD_BTNcss)
    .attr.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "clear input",
    });

  const copyBtn = src.head.create.div()
    .classlist.set("build-btn build-btn--copy")
    .text.set("copy")
    .css.setMany(BUILD_BTNcss)
    .attr.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "copy input",
    });

  // --------------------------------------------------
  // SRC body
  // --------------------------------------------------

  const inputWrap = src.body.create.div()
    .classlist.set("build-textwrap")
    .css.setMany(BUILD_TEXTWRAPcss);

  const wmFmt = inputWrap.create.div()
    .classlist.set("build-watermark build-watermark--fmt")
    .text.set("HSON")
    .css.setMany(BUILD_WATERMARK_FMTcss);

  const status = inputWrap.create.div()
    .classlist.set("build-status")
    .text.set("")
    .css.setMany(BUILD_STATUScss);

  const textarea = inputWrap.create.textarea()
    .classlist.set("build-textarea")
    .data.set("input", "hson")
    .css.setMany(BUILD_TEXTAREAcss);

  const seed = opts.seed ?? DEFAULT_SEED;
  void textarea.setFormValue(seed, { silent: true });

  // --------------------------------------------------
  // OUT head controls
  // --------------------------------------------------

  const toggle = out.head.create.div()
    .classlist.set("build-toggle")
    .css.setMany(BUILD_TOGGLEcss);

  const tabRender = toggle.create.div()
    .classlist.set("build-tab build-tab--render")
    .data.set("tab", "render")
    .text.set("render")
    .css.setMany({ ...BUILD_TABcss, ...BUILD_TAB_ACTIVEcss })
    .attr.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "show render preview",
    });

  const tabHtml = toggle.create.div()
    .classlist.set("build-tab build-tab--html")
    .data.set("tab", "html")
    .text.set("html")
    .css.setMany(BUILD_TABcss)
    .attr.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "show html output",
    });

  // --------------------------------------------------
  // OUT body
  // --------------------------------------------------

  const outWrap = out.body.create.div()
    .classlist.set("build-outwrap")
    .css.setMany(BUILD_TEXTWRAPcss);

  const previewHost = outWrap.create.div()
    .classlist.set("build-previewHost")
    .css.setMany(BUILD_PREVIEWcss);

  const htmlBox = outWrap.create.textarea()
    .classlist.set("build-htmlBox")
    .data.set("output", "html")
    .css.setMany(BUILD_HTMLBOXcss);

  // CHANGED: html hidden by default, preview visible
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
      status,
      copyBtn,
      clearBtn,
    },
    output: {
      wrap: outWrap,
      previewHost,
      htmlBox,
    },
  });
}