// build.factory.ts

import type { LiveTree } from "hson-live";
import { relay, type Outcome } from "intrastructure";
import { BUILD_BODYcss, BUILD_HTMLBOXcss, BUILD_PANEcss, BUILD_PREVIEWcss, BUILD_ROOTcss,  BUILD_TABcss, BUILD_TEXTAREAcss, BUILD_TEXTWRAPcss, BUILD_TITLEcss, BUILD_TOGGLEcss } from "./build.css";
import { BUILD_STRINGhson } from "./build-hson.consts";
import { mk_div_cls, mk_div_id, mk_section_cls, mk_span_cls } from "../../../utils/makers";
import { UI_2STACKcss, UI_BTNcss, UI_PANEL_HEADcss, UI_STACK_LABELcss, UI_2STACK_VALcss } from "../../../ui/panels/panels.css";
import { UI_PANEL_HEADERcss } from "../../../ui/panels/panels.css";
import { øfontSize } from "../../../core/consts/ui-consts";
import { UI_PANELcss } from "../../../ui/panels/panels.css";

// keep this parallel to pp_factory return shape: root + handles
export type BuildDemo = Readonly<{
  root: LiveTree;

  // two panes
  src: BuildPanel;
  out: BuildPanel;

  // shared controls
  tabs: {
    view: LiveTree;
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
  // spacer: LiveTree;
}>;

type BuildFactoryOpts = Readonly<{
  // default starter HSON
  seed?: string;
}>;

const BUILD_HEADER_BTNcss = {
  ...UI_BTNcss,
  fontSize: øfontSize.smol,
  lineHeight: "1",
  // minHeight: "1.35rem",
  padding: "0.4em 0.5em",
  letterSpacing: "0.04em",
};

const BUILD_HEADER_VALUEcss = {
  ...UI_2STACK_VALcss,
  fontSize: øfontSize.smol,
  lineHeight: "1",
};

const BUILD_HEADER_LABELcss = {
  ...UI_STACK_LABELcss,
  fontSize: øfontSize.smol,
  lineHeight: "1",
};

// IDs / consts
const $BUILD_ROOT = "build-root" as const;

export function bp_factory(hostBody: LiveTree, opts: BuildFactoryOpts = {}): Outcome<BuildDemo> {
  // idempotent remove
  const old = hostBody.find.byId($BUILD_ROOT);
  if (old) old.removeSelf();

  // true two-pane root
  const root = mk_div_id(hostBody, $BUILD_ROOT)
    .classlist.set("build-root")
    .css.setMany(BUILD_ROOTcss);
  const header = mk_div_cls(root, "panel header")
    .text.set("~ BUILD ~")
    .css.setMany({
      ...UI_PANEL_HEADERcss,
      gridColumn: "1 / 3",
    });
  
  
  // pane helper now creates a stable head/body grid
  const makePane = (key: "src" | "out"): BuildPanel => {
    const panel = mk_section_cls(root, `build-pane build-pane--${key}`)
      .css.setMany(UI_PANELcss);

    const head = mk_div_cls(panel, "build-head")
      .css.setMany({
        ...UI_PANEL_HEADcss,
      });

    // const spacer = mk_div_cls(head,"build-spacer")
    //   .css.setMany(BUILD_SPACERcss);

    const body = mk_div_cls(panel, "build-body")
      .css.setMany(BUILD_BODYcss);

    return { panel, head, body, /* spacer */ };
  };

  const src = makePane("src");
  const out = makePane("out");

  // --------------------------------------------------
  // SRC head controls
  // --------------------------------------------------

  const clearBtn = mk_span_cls(src.head, "build-btn build-btn--clear")
    .text.set("clear")
    .css.setMany(BUILD_HEADER_BTNcss)
    .attr.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "clear input",
    });

  const statusBox = mk_span_cls(src.head, "status-box")
    .css.setMany(UI_2STACKcss);

  const status = mk_div_cls(statusBox, "status-number")
    .css.setMany(BUILD_HEADER_VALUEcss);

  mk_div_cls(statusBox, "status-label")
    .text.set("status")
    .css.setMany({
      ...BUILD_HEADER_LABELcss,
      bottom: "0",
    });

  const copyBtn = mk_span_cls(src.head, "build-btn build-btn--copy")
    .text.set("copy")
    .css.setMany(BUILD_HEADER_BTNcss)
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

  // const status = inputWrap.create.div()
  //   .classlist.set("build-status")
  //   .text.set("")
  //   .css.setMany(BUILD_STATUScss);

  const textarea = inputWrap.create.textarea()
    .classlist.set("build-textarea")
    .data.set("input", "hson")
    .css.setMany(BUILD_TEXTAREAcss);

  const seed = opts.seed ?? BUILD_STRINGhson;
  void textarea.form.setValue(seed, { silent: true });

  // --------------------------------------------------
  // OUT head controls
  // --------------------------------------------------

  const toggle = out.head.create.div()
    .classlist.set("build-toggle")
    .css.setMany(BUILD_TOGGLEcss);

  const tabView = toggle.create.div()
    .classlist.set("build-tab build-tab--view")
    .data.set("tab", "render")
    .text.set("render")
    .css.setMany(BUILD_TABcss)
    .attr.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "toggle output view",
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
    tabs: { view: tabView },
    input: {
      wrap: inputWrap,
      textarea,
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