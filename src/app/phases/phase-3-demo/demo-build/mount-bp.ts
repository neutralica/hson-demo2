import { LiveTree, hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import { outcome, relay, relay_data, type Outcome } from "intrastructure";
import { type BuildFactoryOpts, type BuildPanel, type BuildDemo } from "./build.types";
import { BUILD_HEADER_BTNcss, BUILD_HEADER_LABELcss, BUILD_HEADER_VALUEcss } from "./build.css";
import { $BUILD_ROOT } from "./build.consts";
import { øfontSize } from "../../../core/consts/ui-consts";
import { _cols } from "../../../core/consts/colors.consts";
import { UI_PANEL_HEADERcss, UI_PANELcss, UI_PANEL_HEADcss, UI_2STACKcss } from "../../../ui/panels/panels.css";
import { mk_div_id, mk_div_cls, mk_section_cls, mk_span_cls } from "../../../utils/makers";
import { BUILD_STRINGhson } from "./build.consts";
import { BUILD_ROOTcss, BUILD_BODYcss, BUILD_TEXTWRAPcss, BUILD_TEXTAREAcss, BUILD_TOGGLEcss, BUILD_TABcss, BUILD_PREVIEWcss, BUILD_HTMLBOXcss } from "./build.css";

import { define_schema, with_schema } from "../../../state/schema";
import { make_state } from "../../../state/state";

type StatusKind = "idle" | "typing" | "valid" | "invalid";
type BuildTabKey = "render" | "html";

type BuildControlState = {
    inProgress: boolean;
    activeTab: BuildTabKey;
    touched: boolean;
};

const BUILD_CONTROL_SCHEMA = define_schema((scm) => ({
    inProgress: scm.boolean,
    activeTab: scm.pick("render", "html"),
    touched: scm.boolean,
}));

function makeInitialBuildControlState(): BuildControlState {
    return {
        inProgress: false,
        activeTab: "render",
        touched: false,
    };
}

export function mount_build_panels(host: LiveTree): Outcome<BuildDemo> {
    const bp = relay_data(bp_factory(host));

    initBuild(bp);
    return relay.data(bp);
}

function initBuild(bp: BuildDemo): void {
    const buildState = with_schema(
        make_state(makeInitialBuildControlState() as unknown as JsonValue),
        BUILD_CONTROL_SCHEMA,
    );

    function getBuildState(): BuildControlState {
        return buildState.get() as BuildControlState;
    }

    function getInProgress(): boolean {
        return getBuildState().inProgress;
    }

    function setInProgress(next: boolean): void {
        buildState.at("inProgress").set(next);
    }

    function getActiveTab(): BuildTabKey {
        return getBuildState().activeTab;
    }

    function setActiveTab(next: BuildTabKey): void {
        buildState.at("activeTab").set(next);
    }

    function getTouched(): boolean {
        return getBuildState().touched;
    }

    function setTouched(next: boolean): void {
        buildState.at("touched").set(next);
    }

    const getSrc = (): string => bp.input.textarea.form.getValue() ?? "";
    const setSrc = (v: string): void => void bp.input.textarea.form.setValue(v, { silent: true });

    const setStatus = (k: StatusKind): void => {
        // keep this tiny + predictable
        if (k === "idle") {
            bp.input.status.text.set("");
            bp.input.status.css.setMany({ opacity: "0" });
            return;
        }
        if (k === "typing") {
            bp.input.status.text.set("...");
            bp.input.status.css.setMany({ color: _cols.txt.grey, opacity: "1", fontSize: øfontSize.main });
            return;
        }
        if (k === "valid") {
            bp.input.status.text.set("OK")
            bp.input.status.css.setMany({
                color: _cols.greenlike,
                opacity: "1"
            });
            return;
        }
        bp.input.status.text.set("XX");
        bp.input.status.css.setMany({ color: "red", opacity: "1" });
    };

    const syncTabs = (): void => {
        const showRender = getActiveTab() === "render";
        bp.output.previewHost.css.setMany({ display: showRender ? "block" : "none" });
        bp.output.htmlBox.css.setMany({ display: showRender ? "none" : "block" });

        bp.tabs.view.data.set("tab", getActiveTab());
        bp.tabs.view.data.set("active", "true");
        bp.tabs.view.text.set(getActiveTab());
        bp.tabs.view.attr.set("aria-label", getActiveTab() === "render" ? "show html output" : "show render preview");
    };

    const render = (raw: string): void => {
        // NOTE: do not overwrite anything if invalid; just mark invalid.
        const t = raw.trim();
        const empty = t.length === 0;

        // update watermark-ish state if you want
        // bp.input.wmEmpty.css.setMany({ opacity: empty ? "0.25" : "0" });

        if (!getTouched()) {
            // don’t scream until first input
            setStatus("idle");
        } else if (empty) {
            setStatus("invalid");
        } else {
            setStatus("typing");
        }

        if (empty) return;

        // Parse HSON → build preview + html
        try {
            // IMPORTANT: this must throw on invalid input
            const doc = hson.fromHson(raw);

            // 1) output html string
            const htmlTxt = doc.toHtml().serialize();

            // 2) output preview tree
            // Prefer LiveTree path (no DOM string parse). If your API differs, swap this line.
            const branch = hson.liveTree.fromHson(raw);

            // Update output panes
            bp.output.previewHost.empty();
            bp.output.previewHost.append(branch);

            bp.output.htmlBox.text.set(htmlTxt);

            setStatus("valid");
        } catch {
            setStatus("invalid");
            // keep last valid output; do not mutate preview/htmlBox
        }
    };

    // --- events ---

    // View toggle: label is the currently shown view.
    bp.tabs.view.listen.onClick(() => {
        setActiveTab(getActiveTab() === "render" ? "html" : "render");
        syncTabs();
    });

    // Input
    bp.input.textarea.listen.onInput(() => {
        if (getInProgress()) return;
        setInProgress(true);
        try {
            setTouched(true);
            render(getSrc());
        } finally {
            setInProgress(false);
        }
    });
    // Buttons

    bp.input.clearBtn.listen.onClick(() => {
        setTouched(false);
        setSrc("");
        bp.output.previewHost.empty();
        bp.output.htmlBox.text.set("");
        setStatus("idle");
        // bp.input.wmEmpty.css.setMany({ opacity: "0.25" });
    });

    bp.input.copyBtn.listen.onClick(() => {
        // Copy current tab by default; easy to change
        const clip = globalThis.navigator?.clipboard?.writeText;
        if (!clip) return;

        const txt =
            getActiveTab() === "html"
                ? (bp.output.htmlBox.text.get() ?? "") // if you have .getText; else store htmlTxt elsewhere
                : getSrc();

        void clip.call(navigator.clipboard, txt);
    });

    // Initial paint
    syncTabs();
    render(getSrc());

}
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

