import { hson } from "hson-live";
import type { LiveTree } from "../../../../../../hson-live/dist/api/livetree/livetree";
import type { UiLevel, TestRunMode, TestEvent, CaseKey } from "../../../../tests/tests.types";
import { $PANEL_HIDDEN, $txt_ } from "../../../consts/ui-consts";
import { make_btn } from "../../../widgets/gems-deprecate/make-gems";
import { PANEL_FRAMEcss, PANEL_SURFACEcss, PANEL_BRANCHcss, LOG_BOXcss, TEST_LOGGERcss, CLEAR_BTNcss, TEST_PANELcss } from "../panels/demo-panels.css";
import { type ChipDisplay, create_test_chips } from "./test-chips";
import { relay, relay_data, type Outcome, type OutcomeData, type OutcomeMaybeData } from "intrastructure";
import { _test_full_loop } from "hson-live/diagnostics";
import type { LoopReport } from "../../../../../../hson-live/dist/diagnostics/loop-3.test";
import { build_suites_for_mode } from "../../../../tests/build-test-suites";
import { create_test_log } from "../../../../tests/test-log";
import { run_test_suites } from "../../../../tests/test-runner";
import { create_inspector, type InspectorUi } from "../../../../tests/inspector/test-inspector";
import { PANEL_SAFETYcss } from "../demo.css";
import type { CssMap } from "hson-live/types";
import { $grn_, $cols_ } from "../../../consts/colors.consts";
import { $CHIP_WIDTHstr } from "../../../../tests/tests.consts";


export type TestPanelDeps = Readonly<{
  onRun: (mode: TestRunMode) => Promise<void>;
  onClear: () => void;
  onEvent: (e: TestEvent) => void; // optional if you want
}>;

const introText = "TRANSFORMER LOOP TEST: parses & serializes an input string through JSON->HSON->HTML->JSON (and the opposite direction) over n iterations, diffs steps (expect 8 errors from invalid HTML)"
const liveTreeText = "LIVETREE TESTS: confirms successful LiveTree operations and expected final node shape";
export type TestPanel = Readonly<{
  branch: LiveTree;
  mount: (hostBody: LiveTree) => void;
  init: (deps: TestPanelDeps) => void;
  runBtn: LiveTree;
  clearBtn: LiveTree;
  // levelBtn: LiveTree;
  suiteSel: LiveTree;

  // status: LiveTree;
  marquee: LiveTree;
  chips: ChipDisplay,
  // state accessors (so callsite doesn’t poke DOM attrs directly)
  getLevel: () => UiLevel;
  getMode: () => TestRunMode;

  // setStatus: (txt: string) => void;
  setMarquee: (txt: string) => void;
  clearMarquee: () => void;
}>;

const MODES: readonly Readonly<{ key: TestRunMode; label: string }>[] = [
  { key: "all", label: "all" },
  // { key: "generated", label: "generated" },
  { key: "transform", label: "transform" },
  { key: "livetree", label: "livetree" },
  { key: "legacy", label: "legacy" },
  { key: "dev", label: "dev" },
] as const;


export type TestPanelWidget = ReturnType<typeof test_panel_factory>;

function test_panel_factory(): Outcome<TestPanel> {
  let inited = false;
  const branch = hson.fromTrustedHtml("<div></div>").liveTree.asBranch().id.set("panel-branch")
  // keep your existing panel branch css hook
  branch.css.setMany(PANEL_BRANCHcss);

  // -------------------------
  // small log/console
  // -------------------------
  const logBox = branch.create.div()
    .id.set("test-log-box")
    .css.setMany(LOG_BOXcss);

  const logger = logBox.create.div()
    .id.set("test-logger")
    .css.setMany({
      ...TEST_LOGGERcss,
    });


  // -------------------------
  // state
  // -------------------------
  let mounted = false;
  let level: UiLevel = "normal";
  let mode: TestRunMode = "all";

  // -------------------------
  // CHIPS
  // -------------------------

  // -------------------------
  // BUTTON ROW
  // -------------------------
  const controlsRow = branch.create.div()
    .id.set("test-controls")
    .css.setMany(CONTROL_ROWcss);

  // keep your existing helper (toggle gem), but treat it as a “chip”
  const runChip = make_btn(controlsRow, "test-run", "run");
  const suiteSel = controlsRow.create.select()
    .id.set("test-select")
    .css.setMany(TEST_SELECTcss);
  const clearChip = make_btn(controlsRow, "test-clear", "clear");

  const runBtn = runChip.node.css.setMany(RUN_BUTTONcss);

  const clearBtn = clearChip.node.css.setMany(CLEAR_BTNcss);

  const init = (deps: TestPanelDeps): void => {
    if (inited) return;
    inited = true;

    runBtn.listen.onClick(() => void deps.onRun(mode));
    clearBtn.listen.onClick(() => deps.onClear());
  };
  // -------------------------
  // chips
  // -------------------------

  const chips = create_test_chips(branch);

  const setLog = (txt: string): void => {
    if (!mounted) return;
    logger.text.add(txt);
  };

  const clearLogs = (): void => {
    if (!mounted) return;
    logger.text.set("");
  };

  const mount = (hostBody: LiveTree): void => {
    if (mounted) return;
    hostBody.append(branch);
    mounted = true;

    // populate select
    suiteSel.empty();
    for (const m of MODES) {
      const opt = suiteSel.create.option();
      opt.attr.set("value", m.key);
      opt.text.set(m.label);
      if (m.key === mode) opt.flag.set("selected");
    }

    suiteSel.listen.on("change", () => {
      const v = suiteSel.getFormValue() ?? "all";
      mode = (MODES.find(m => m.key === v)?.key ?? "all");
    });

    // pressed affordance (purely visual, no extra machinery)
    const press = (b: LiveTree, on: boolean): void => {
      b.css.setMany(on
        ? { transform: "translateY(1px)", filter: "brightness(0.98)" }
        : { transform: "translateY(0px)", filter: "brightness(1.0)" });
    };

    runBtn.listen.onPointerDown(() => press(runBtn, true));
    runBtn.listen.onPointerUp(() => press(runBtn, false));
    runBtn.listen.onPointerLeave(() => press(runBtn, false));

    clearBtn.listen.onPointerDown(() => press(clearBtn, true));
    clearBtn.listen.onPointerUp(() => press(clearBtn, false));
    clearBtn.listen.onPointerLeave(() => press(clearBtn, false));

    // clear should clear the tiny panel surfaces
    clearBtn.listen.onClick(() => {
      clearLogs();
      setLog("idle");
    });
  };

  // set initial marquee before mount so it’s ready
  logger.text.set(introText);
  logger.text.add(liveTreeText);

  return relay.data({
    branch,
    mount,
    init,
    runBtn,
    clearBtn,
    suiteSel,

    // status,
    marquee: logger,
    chips,

    getLevel: () => level,
    getMode: () => mode,

    // setStatus,
    setMarquee: setLog,
    clearMarquee: clearLogs,
  } as const);
}


export type TestPanels = Readonly<{
  root: LiveTree;
  testSurface: LiveTree;
  inspectorSurface: LiveTree;
  // Expose these if you want to poke them elsewhere; otherwise delete.
  tp: TestPanel;
  inspector: InspectorUi;
}>;

/**
 * Build + wire the test panel AND inspector as one cohesive widget.
 * This replaces mount_demo wiring, captureMap ownership, and onEvent plumbing.
 */
export function mount_test_panels(host: LiveTree): Outcome<TestPanels> {
  try {
    // --- layout owned by the widget ---
    // widget owns its internal two-up layout; mount_demo no longer does.
    const old = host.find.byId("test-panels-root");
    if (old) old.removeSelf();

    const root = host.create.div()
      .id.set("test-panels-root")
      .css.setMany({
        ...PANEL_SAFETYcss,
        width: "100%",
        height: "100%",

        display: "grid",
        gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)", // test + inspector
        gap: "12px",

        // CHANGED: if you want scrolling, do it inside, not on this root
        overflow: "hidden",
      });


    // test chrome
    const testFrame = root.create.div().css.setMany({ ...PANEL_FRAMEcss, ...PANEL_SAFETYcss });
    const testSurface = testFrame.create.div().css.setMany({ ...PANEL_SURFACEcss, ...PANEL_SAFETYcss });

    // inspector chrome
    const inspFrame = root.create.div().css.setMany({ ...PANEL_FRAMEcss, ...PANEL_SAFETYcss });
    const inspSurface = inspFrame.create.div().css.setMany({
      ...PANEL_SURFACEcss,
      ...PANEL_SAFETYcss,
      // CHANGED: inspector surface becomes a 2-row grid: header + scroll body
      display: "grid",
      gridTemplateRows: "auto minmax(0, 1fr)",

      // CHANGED: critical for scroll inside nested grids
      height: "100%",

      // CHANGED: prevent outer surface from scrolling; inner area will
      overflow: "hidden",
    });

    // --- owned dependencies ---
    const tp = relay_data(test_panel_factory());
    tp.mount(testSurface);

    const tlog = create_test_log();
    const captureMap = new Map<CaseKey, () => Promise<LoopReport>>();

    // The inspector *is part of the test widget* now.
    const inspector = create_inspector(
      inspSurface,
      tlog,
      { hideClass: $PANEL_HIDDEN },

      // CHANGED: fallback to metaPatch when no capture is registered
      async (key) => {
        const fn = captureMap.get(key);
        if (fn) return fn();

        // LiveTree suites don't have LoopReports; use case meta instead.
        const c = tlog.getCase(key);
        const m = c?.meta;

        // Return a minimal LoopReport-like object that your section builder can read.
        // It already uses permissive access (casts / optional fields).
        return {
          ok: c?.status === "pass",
          entry: key,
          dir: "livetree",
          times: 1,
          failures: c?.status === "fail" ? [{ ok: false, step: "assert", error: c.err ?? "fail" }] : [],
          trace: [
            { ok: true, step: "setup" },
            { ok: c?.status !== "fail", step: "assert", error: c?.err },
          ],
          artifacts: [
            m?.fixture ? { lap: 0, fmt: "json", label: "fixture", text: m.fixture } : undefined,
            m?.sub ? { lap: 0, fmt: "json", label: "sub", text: m.sub } : undefined,
            m?.preview ? { lap: 0, fmt: "html", label: "preview", text: m.preview } : undefined,
            m?.input ? { lap: 0, fmt: "html", label: "input", text: m.input } : undefined,
          ].filter(Boolean),
        } as unknown as LoopReport;
      },
    );

    // local event sink (no mount_demo involvement)
    const onEvent = (e: TestEvent): void => {
      tlog.onEvent(e);
      tp.marquee.text.set(tlog.getLastLine());
    };

    // --- wire buttons inside the widget ---
    tp.runBtn.listen.onClick(async () => {
      const next_frame = (): Promise<void> =>
        new Promise((r) => requestAnimationFrame(() => r()));

      tp.chips.clear();
      inspFrame.classlist.remove($PANEL_HIDDEN);
      tlog.clear();

      // 1) set it first
      tp.marquee.text.set("running loop test…");

      // 2) yield AFTER setting it so it can paint
      await next_frame();

      // 3) prevent immediate clobber by onEvent for a moment
      let allowMarquee = false;
      const onEvent = (e: TestEvent): void => {
        tlog.onEvent(e);
        if (!allowMarquee) return;
        tp.marquee.text.set(tlog.getLastLine());
      };

      // allow event-driven marquee after a paint tick
      await next_frame();
      allowMarquee = true;

      const mode: TestRunMode = tp.getMode();

      captureMap.clear();
      const suites = build_suites_for_mode(mode, { _test_full_loop }, captureMap);

      const res = await run_test_suites(suites, onEvent, { bail: false });

      tp.chips.render(res.summary);
      tp.marquee.text.set(tlog.getLastLine());

      inspector.show();
      inspector.render();
    });

    tp.clearBtn.listen.onClick(() => {
      tlog.clear();
      tp.chips.clear();
      tp.marquee.text.set("idle");
      inspector.clear();
      inspFrame.classlist.add($PANEL_HIDDEN);

    });

    return relay.data({
      root,
      testSurface,
      inspectorSurface: inspSurface,
      tp,
      inspector,
    });
  } catch (err) {
    return relay.err(err instanceof Error ? err.message : "unknown error:", err);
  }
}
export const TEST_ACTION_BTN = {
  display: "grid",
  placeItems: "center",
  borderRadius: "12px",
  userSelect: "none",
  cursor: "pointer",

  fontFamily: "monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: $txt_.sub,
  textTransform: "uppercase",

  // neutral default
  // background: $cols_.backdeep,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
} as const;

export const CONTROL_ROWcss: CssMap = {
  width: "100%",
  boxSizing: "border-box",
  // gridRow: "3",
  gridColumn: "1 / 5",
  display: "grid",
  gridTemplateColumns: "1fr 2fr 1fr",
  gap: "10px",
  padding: "0",
  // background: "transparent",
  border: "none",
  boxShadow: "none",
};

export const RUN_BUTTONcss: CssMap = {
  ...TEST_ACTION_BTN,
  borderRadius: "18px",
  background: "rgba(0,0,0,0.18)",
  transition: "transform 90ms ease, filter 140ms ease",
  _hover: {
    background: $grn_.faded,
    color: $cols_.backdeep
  }
};

export const TEST_SELECTcss = {
  minWidth: "12ch",
  padding: "10px 8px",
  borderRadius: "12px",
  boxSizing: "border-box",

  fontFamily: "monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: $txt_.sub,

  // background: $cols_.backdeep,
  color: $grn_.std,
  border: "1px solid rgba(255,255,255,0.10)",
  outline: "none",
} as const;

