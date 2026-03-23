import { hson } from "hson-live";
import type { LiveTree } from "../../../../../../hson-live/dist/api/livetree/livetree";
import type { UiLevel, TestRunMode, TestEvent, CaseKey } from "../../../../tests/tests.types";
import { $PANEL_HIDDEN } from "../../../core/consts/ui-consts";
import { mk_btn } from "../../../widgets/chips-deprecate/make-btn";
import { PANEL_FRAMEcss, PANEL_SURFACEcss, PANEL_BRANCHcss, CLEAR_BTNcss } from "../panels/demo-panels.css";
import { LOG_BOXcss, ROW_CONTAINERcss, TEST_PANELcss, TP_ROOTcss } from "./tp.css";
import { TEST_LOGGERcss } from "./tp.css";
import { type ChipDisplay, create_test_chips } from "./test-chips";
import { relay, relay_data, type Outcome, type OutcomeData, type OutcomeMaybeData } from "intrastructure";
import { _test_full_loop } from "hson-live/diagnostics";
import type { LoopReport } from "../../../../../../hson-live/dist/diagnostics/loop-3.test";
import { build_suites_for_mode } from "../../../../tests/build-test-suites";
import { create_test_log } from "../../../../tests/test-log";
import { run_test_suites } from "../../../../tests/test-runner";
import { create_inspector, type InspectorUi } from "../../../../tests/inspector/test-inspector";
import { MENU_FONT, PANEL_SAFETYcss } from "../demo.css";
import { $grn_, $cols_, $ylw_ } from "../../../core/consts/colors.consts";
import { $CHIP_WIDTHstr } from "../../../../tests/tests.consts";
import { OKLCH_FLEURS } from "../demo-fleurs/fleurs.consts";
import { CONTROL_ROWcss, TEST_SELECTcss, RUN_BUTTONcss } from "./tp.css";
import { mk_div_id } from "../../../utils/makers";


export type TestPanelDeps = Readonly<{
  onRun: (mode: TestRunMode) => Promise<void>;
  onClear: () => void;
  onEvent: (e: TestEvent) => void; // optional if you want
}>;

const introText = "TRANSFORMER LOOP TEST: parses & serializes an input string through JSON->HSON->HTML->JSON (and the opposite direction) over 3 full iterations, diffs steps ";
const liveTreeText = "LIVETREE TESTS: confirms successful LiveTree operations and expected final node shape";
const errorDisclaimer = "EXPECT ERRORS IN HTML_INVALID (15 fixtures)";

export type TestPanel = Readonly<{
  branch: LiveTree;
  mount: (hostBody: LiveTree) => void;
  init: (deps: TestPanelDeps) => void;
  runBtn: LiveTree;
  clearBtn: LiveTree;
  // levelBtn: LiveTree;
  suiteSel: LiveTree;

  // status: LiveTree;
  logger: LiveTree;
  chips: ChipDisplay,
  // state accessors (so callsite doesn’t poke DOM attrs directly)
  getLevel: () => UiLevel;
  getMode: () => TestRunMode;

  // setStatus: (txt: string) => void;
  setLog: (txt: string) => void;
  clearLogs: () => void;
}>;

const MODES: readonly Readonly<{ key: TestRunMode; label: string }>[] = [
  { key: "all", label: "all" },
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
  const rowContainer = mk_div_id(branch, "row-container").css.setMany(ROW_CONTAINERcss)
  const controlsRow = rowContainer.create.div()
    .id.set("test-controls")
    .css.setMany(CONTROL_ROWcss);

  // keep your existing helper (toggle gem), but treat it as a “chip”
  const runChip = mk_btn(controlsRow, "test-run", "run");
  const suiteSel = controlsRow.create.select()
    .id.set("test-select")
    .css.setMany(TEST_SELECTcss);
  const clearChip = mk_btn(controlsRow, "test-clear", "clear");

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

  const chips = create_test_chips(rowContainer);
  let cache: string[] = []

  const setLog = (txt: string): void => {
    if (mounted) {
      if (cache.length > 0) {
        cache.forEach(c => logger.create.div().text.set(c))
      }
      logger.create.div().text.set(txt);
    }
    else if (!mounted) { cache.push(txt); }
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

  return relay.data({
    branch,
    mount,
    init,
    runBtn,
    clearBtn,
    suiteSel,

    // status,
    logger,
    chips,

    getLevel: () => level,
    getMode: () => mode,

    // setStatus,
    setLog,
    clearLogs
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
      .css.setMany(TP_ROOTcss);


    // test chrome
    const testFrame = mk_div_id(root, "test-frame").css.setMany({ ...PANEL_FRAMEcss, ...PANEL_SAFETYcss });
    const testSurface = mk_div_id(testFrame, "test-surface").css.setMany({ ...PANEL_SURFACEcss, ...PANEL_SAFETYcss, padding: "0", margin: "0" });

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
    // CHANGED: local append-only console writer
    const appendLogLine = (line: string): void => {
      const isFail = /\bFAIL\b|\bERR\b|\berror\b/i.test(line);
      const isPass = /\bPASS\b|\bOK\b/i.test(line);
      const isWarn = /\bSKIP\b|\bWARN\b/i.test(line);

      const row = tp.logger.create.div().css.setMany({
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        minWidth: "0",
        fontFamily: MENU_FONT,
        fontSize: "12px",
        lineHeight: "1.25",
        paddingBottom: "2px",

        color:
          isFail ? "red"
            : isPass ? $grn_.faded
              : isWarn ? $ylw_.faded
                : $cols_.txtmain,
      });

      row.text.set(line);

      const el = tp.logger.dom.el();
      if (el instanceof HTMLElement) {
        el.scrollTop = el.scrollHeight;
      }
    };
    const clearLogLines = (): void => {
      tp.logger.empty();
    };
    tp.mount(testSurface);
    tp.setLog(introText)
    tp.setLog(liveTreeText)
    tp.setLog(errorDisclaimer)
    
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
    const doLogOnEvent = (e: TestEvent): void => {
      tlog.onEvent(e);
      appendLogLine(tlog.getLastLine());
    };

    // --- wire buttons inside the widget ---
    tp.runBtn.listen.onClick(async () => {
      const next_frame = (): Promise<void> =>
        new Promise((r) => requestAnimationFrame(() => r()));

      tp.chips.clear();
      inspFrame.classlist.remove($PANEL_HIDDEN);
      tlog.clear();
      clearLogLines(); // CHANGED

      appendLogLine("running loop test…"); // CHANGED
      await next_frame();

      const mode: TestRunMode = tp.getMode();

      captureMap.clear();
      const suites = build_suites_for_mode(mode, { _test_full_loop }, captureMap);

      const res = await run_test_suites(suites, doLogOnEvent, { bail: false });

      tp.chips.render(res.summary);
      appendLogLine(tlog.getLastLine()); // optional; can remove if redundant

      inspector.show();
      inspector.render();
    });

    tp.clearBtn.listen.onClick(() => {
      tlog.clear();
      tp.chips.clear();
      clearLogLines(); // CHANGED
      appendLogLine("idle"); // CHANGED
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


