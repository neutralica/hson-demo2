// build.factory.ts

import type { LiveTree } from "hson-live";
import { relay, type Outcome } from "intrastructure";
import { BUILD_BODYcss, BUILD_BTNcss, BUILD_HEADcss, BUILD_HTMLBOXcss, BUILD_PANEcss, BUILD_PREVIEWcss, BUILD_ROOTcss, BUILD_SPACERcss, BUILD_STATUScss, BUILD_TAB_ACTIVEcss, BUILD_TABcss, BUILD_TEXTAREAcss, BUILD_TEXTWRAPcss, BUILD_TITLEcss, BUILD_TOGGLEcss, BUILD_WATERMARK_EMPTYcss, BUILD_WATERMARK_FMTcss } from "./build.css";
import { DEFAULT_SEED } from "./build-seed.consts";
import { mk_div_cls, mk_section_cls } from "../../../utils/makers";

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

export function bp_factory(hostBody: LiveTree, opts: BuildFactoryOpts = {}): Outcome<BuildDemo> {
  // idempotent remove
  const old = hostBody.find.byId($BUILD_ROOT);
  if (old) old.removeSelf();

  // true two-pane root
  const root = hostBody.create.div()
    .id.set($BUILD_ROOT)
    .classlist.set("build-root")
    .css.setMany(BUILD_ROOTcss);

  // pane helper now creates a stable head/body grid
  const makePane = (key: "src" | "out", titleTxt: string): BuildPanel => {
    const panel = mk_section_cls(root, `build-pane build-pane--${key}`)
      .css.setMany(BUILD_PANEcss);

    const head = mk_div_cls(panel, "build-head")
      .css.setMany(BUILD_HEADcss);

    const title = mk_div_cls(head, "build-title")
      .text.set(titleTxt)
      .css.setMany(BUILD_TITLEcss);

    const spacer = mk_div_cls(head,"build-spacer")
      .css.setMany(BUILD_SPACERcss);

    const body = mk_div_cls(panel, "build-body")
      .css.setMany(BUILD_BODYcss);

    return { panel, head, body, title, spacer };
  };

  const src = makePane("src", "HSON");
  const out = makePane("out", "OUTPUT");

  // --------------------------------------------------
  // SRC head controls
  // --------------------------------------------------

  const clearBtn = src.head.create.div()
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

  // html hidden by default, preview visible
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