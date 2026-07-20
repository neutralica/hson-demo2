import { LiveTree, hson } from "hson-live";
import { $BUILD_ROOT, BUILD_STRINGhson } from "./build.consts";
import {
    BUILD_BODYcss,
    BUILD_HEADER_BTNcss,
    BUILD_HEADER_LABELcss,
    BUILD_HEADER_VALUEcss,
    BUILD_HTMLBOXcss,
    BUILD_PREVIEWcss,
    BUILD_ROOTcss,
    BUILD_TABcss,
    BUILD_TEXTAREAcss,
    BUILD_TEXTWRAPcss,
    BUILD_TOGGLEcss,
} from "./build.css";
import { type BuildDemo, type BuildFactoryOpts, type BuildPanel } from "./build.types";
import  { _colors } from "../../core/consts/colors.consts";
import { _fontSize } from "../../core/consts/ui-consts";
import { UI_PANEL_HEADERcss, UI_PANELcss, UI_PANEL_HEADcss, UI_2STACKcss } from "../../ui/panels/panels.css";
import { mk_div_id, mk_div_cls, mk_section_cls, mk_span_cls } from "../../utils/makers";

type StatusKind = "idle" | "typing" | "valid" | "invalid";
type BuildTabKey = "render" | "html";

type BuildControlState = {
    inProgress: boolean;
    activeTab: BuildTabKey;
    touched: boolean;
};

const BUILD_CONTROL_SCHEMA = hson.liveMap.schema.define((scm) => ({
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

export function mount_build_panels(host: LiveTree): BuildDemo {
    const bp = bp_factory(host);

    initBuild(bp);
    return bp;
}

function initBuild(bp: BuildDemo): void {
    const buildState = hson.liveMap
        .fromJson(makeInitialBuildControlState())
        .schema.use(BUILD_CONTROL_SCHEMA);

    function getBuildState(): BuildControlState {
        return buildState.snap() as BuildControlState;
    }

    function getInProgress(): boolean {
        return getBuildState().inProgress;
    }

    function setInProgress(next: boolean): void {
        buildState.at(["inProgress"]).set(next);
    }

    function getActiveTab(): BuildTabKey {
        return getBuildState().activeTab;
    }

    function setActiveTab(next: BuildTabKey): void {
        buildState.at(["activeTab"]).set(next);
    }

    function getTouched(): boolean {
        return getBuildState().touched;
    }

    function setTouched(next: boolean): void {
        buildState.at(["touched"]).set(next);
    }

    const getSrc = (): string => bp.input.textarea.form.getValue() ?? "";
    const setSrc = (v: string): void => void bp.input.textarea.form.setValue(v, { silent: true });

    const setStatus = (k: StatusKind): void => {
        if (k === "idle") {
            bp.input.status.text.set("");
            bp.input.status.css.setMany({ opacity: "0" });
            return;
        }
        if (k === "typing") {
            bp.input.status.text.set("...");
            bp.input.status.css.setMany({ color: _colors.txt.grey, opacity: "1", fontSize: _fontSize.main });
            return;
        }
        if (k === "valid") {
            bp.input.status.text.set("OK");
            bp.input.status.css.setMany({
                color: _colors.greenlike,
                opacity: "1",
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
        bp.tabs.view.attrs.set("aria-label", getActiveTab() === "render" ? "show html output" : "show render preview");
    };

    const render = (raw: string): void => {
        const t = raw.trim();
        const empty = t.length === 0;

        if (!getTouched()) {
            setStatus("idle");
        } else if (empty) {
            setStatus("invalid");
        } else {
            setStatus("typing");
        }

        if (empty) return;

        try {
            const doc = hson.fromHson(raw);

            const htmlTxt = doc.toHtml().serialize();

            const branch = hson.liveTree.fromHson(raw);

            bp.output.previewHost.empty();
            bp.output.previewHost.append(branch);

            bp.output.htmlBox.text.set(htmlTxt);

            setStatus("valid");
        } catch {
            setStatus("invalid");
        }
    };

    bp.tabs.view.listen.onClick(() => {
        setActiveTab(getActiveTab() === "render" ? "html" : "render");
        syncTabs();
    });

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

    bp.input.clearBtn.listen.onClick(() => {
        setTouched(false);
        setSrc("");
        bp.output.previewHost.empty();
        bp.output.htmlBox.text.set("");
        setStatus("idle");
    });

    bp.input.copyBtn.listen.onClick(() => {
        const clip = globalThis.navigator?.clipboard?.writeText;
        if (!clip) return;

        const txt =
            getActiveTab() === "html"
                ? (bp.output.htmlBox.text.get() ?? "")
                : getSrc();

        void clip.call(navigator.clipboard, txt);
    });

    syncTabs();
    render(getSrc());

}
export function bp_factory(hostBody: LiveTree, opts: BuildFactoryOpts = {}): BuildDemo {
  const old = hostBody.find.byId($BUILD_ROOT);
  if (old) old.remove();

  const root = mk_div_id(hostBody, $BUILD_ROOT)
    .classlist.set("build-root")
    .attrs.set("data-testid", "build-root")
    .css.setMany(BUILD_ROOTcss);
  mk_div_cls(root, "panel header")
    .text.set("~ BUILD ~")
    .css.setMany({
      ...UI_PANEL_HEADERcss,
      gridColumn: "1 / 3",
    });

  const makePane = (key: "src" | "out"): BuildPanel => {
    const panel = mk_section_cls(root, `build-pane build-pane--${key}`)
      .css.setMany(UI_PANELcss);

    const head = mk_div_cls(panel, "build-head")
      .css.setMany({
        ...UI_PANEL_HEADcss,
      });

    const body = mk_div_cls(panel, "build-body")
      .css.setMany(BUILD_BODYcss);

    return { panel, head, body };
  };

  const src = makePane("src");
  const out = makePane("out");

  const clearBtn = mk_span_cls(src.head, "build-btn build-btn--clear")
    .text.set("clear")
    .css.setMany(BUILD_HEADER_BTNcss)
    .attrs.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "clear input",
    });

  const statusBox = mk_span_cls(src.head, "status-box")
    .css.setMany(UI_2STACKcss);

  const status = mk_div_cls(statusBox, "status-number")
    .attrs.set("data-testid", "build-status")
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
    .attrs.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "copy input",
    });

  const inputWrap = src.body.create.div()
    .classlist.set("build-textwrap")
    .css.setMany(BUILD_TEXTWRAPcss);

  const textarea = inputWrap.create.textarea()
    .classlist.set("build-textarea")
    .data.set("input", "hson")
    .attrs.setMany({ "data-testid": "build-source-editor", "aria-label": "build HSON source editor" })
    .css.setMany(BUILD_TEXTAREAcss);

  const seed = opts.seed ?? BUILD_STRINGhson;
  void textarea.form.setValue(seed, { silent: true });

  const toggle = out.head.create.div()
    .classlist.set("build-toggle")
    .css.setMany(BUILD_TOGGLEcss);

  const tabView = toggle.create.div()
    .classlist.set("build-tab build-tab--view")
    .data.set("tab", "render")
    .text.set("render")
    .css.setMany(BUILD_TABcss)
    .attrs.setMany({
      role: "button",
      tabindex: "0",
      "aria-label": "toggle output view",
    });

  const outWrap = out.body.create.div()
    .classlist.set("build-outwrap")
    .css.setMany(BUILD_TEXTWRAPcss);

  const previewHost = outWrap.create.div()
    .classlist.set("build-previewHost")
    .attrs.set("data-testid", "build-preview")
    .css.setMany(BUILD_PREVIEWcss);

  const htmlBox = outWrap.create.textarea()
    .classlist.set("build-htmlBox")
    .data.set("output", "html")
    .attrs.setMany({ "data-testid": "build-html-output", "aria-label": "build HTML output" })
    .css.setMany(BUILD_HTMLBOXcss);

  htmlBox.css.setMany({ display: "none" });

  return {
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
  };
}
