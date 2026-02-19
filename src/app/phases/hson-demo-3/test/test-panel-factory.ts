import { hson } from "hson-live";
import type { LiveTree } from "../../../../../../hson-live/dist/api/livetree/livetree";
import type { UiLevel, TestRunMode, TestEvent, CaseKey } from "../../../../tests/tests.types";
import { $PANEL_HIDDEN, $txt_ } from "../../../consts/ui-consts";
import { make_btn } from "../../../widgets/gems/make-gems";
import { PANEL_FRAMEcss, PANEL_SURFACEcss, TEST_SELECTcss } from "../panels/demo-panels.css";
import { PANEL_BRANCHcss, MARQUEE_BOXcss, MARQUEEcss, TEST_STATUS_CHIPcss, CONTROL_ROWcss, RUN_BUTTONcss, CLEAR_BTNcss } from "../panels/demo-panels.css";
import { type ChipDisplay, create_test_chips } from "./test-chips";
import { relay, relay_data, type Outcome, type OutcomeData, type OutcomeMaybeData } from "intrastructure";
import { _test_full_loop } from "hson-live/diagnostics";
import type { LoopReport } from "../../../../../../hson-live/dist/diagnostics/loop-3.test";
import { build_suites_for_mode } from "../../../../tests/suite-builder";
import { create_test_log } from "../../../../tests/test-log";
import { run_test_suites } from "../../../../tests/test-runner";
import { create_inspector, type InspectorUi } from "../inspect/test-inspector";


export type TestPanelDeps = Readonly<{
  onRun: (mode: TestRunMode) => Promise<void>;
  onClear: () => void;
  onEvent: (e: TestEvent) => void; // optional if you want
}>;

const introText = "TRANSFORMER LOOP TEST: parses & serializes an input string through JSON->HSON->HTML->JSON (and the opposite direction) over n iterations, diffs steps"

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
  { key: "generated", label: "generated" },
  { key: "legacy", label: "legacy" },
  { key: "dev", label: "dev" },
] as const;


export type TestPanelWidget = ReturnType<typeof test_panel_factory>;

function test_panel_factory(): Outcome<TestPanel> {
  let inited = false;
  const branch = hson.fromTrustedHtml("<div></div>").liveTree().asBranch().id.set("panel-branch");

  // CHANGED: keep your existing panel branch css hook
  branch.css.setMany(PANEL_BRANCHcss);

  // -------------------------
  // MARQUEE (stays!)
  // -------------------------
  // ADDED: viewport box so marquee reads as “embedded terminal glass”
  const marqueeBox = branch.create.div()
    .id.set("test-marquee-box")
    .css.setMany(MARQUEE_BOXcss);

  // CHANGED: marquee is the actual <marquee> tag, no strip / no JS scrolling logic
  const marquee = marqueeBox.create.div()
    .id.set("test-marquee")
    .css.setMany({
      ...MARQUEEcss,
    });

  // -------------------------
  // MODE SELECT + STATUS
  // -------------------------

  // -------------------------
  // state
  // -------------------------
  let mounted = false;
  let level: UiLevel = "normal";
  let mode: TestRunMode = "all";

  // -------------------------
  // BUTTON ROW
  // -------------------------
  const controlsRow = branch.create.div()
    .id.set("test-controls")
    .css.setMany(CONTROL_ROWcss);

  // CHANGED: keep your existing helper (toggle gem), but treat it as a “chip”
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

  // const setStatus = (txt: string): void => {
  //   if (!mounted) return;
  //   status.text.set(txt);
  // };

  // CHANGED: simplest possible marquee writer (no strip, no scrollbars)
  const setMarquee = (txt: string): void => {
    if (!mounted) return;
    marquee.text.set(txt);
  };

  const clearMarquee = (): void => {
    if (!mounted) return;
    marquee.text.set("");
  };

  const mount = (hostBody: LiveTree): void => {
    if (mounted) return;
    hostBody.append(branch);
    mounted = true;

    // populate select
    suiteSel.empty();
    for (const m of MODES) {
      const opt = suiteSel.create.option();
      opt.setAttrs("value", m.key);
      opt.text.set(m.label);
      if (m.key === mode) opt.setAttrs("selected", "selected");
    }

    suiteSel.listen.on("change", () => {
      const v = suiteSel.getFormValue() ?? "all";
      mode = (MODES.find(m => m.key === v)?.key ?? "all");
    });

    // CHANGED: pressed affordance (purely visual, no extra machinery)
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
      clearMarquee();
      // setStatus("idle");
    });
  };

  // CHANGED: set initial marquee before mount so it’s ready
  marquee.text.set(introText);

  return relay.data({
    branch,
    mount,
    init,
    runBtn,
    clearBtn,
    suiteSel,

    // status,
    marquee,
    chips,

    getLevel: () => level,
    getMode: () => mode,

    // setStatus,
    setMarquee,
    clearMarquee,
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
    // CHANGED: widget owns its internal two-up layout; mount_demo no longer does.
    const old = host.find.byId("test-panels-root");
    if (old) old.removeSelf();

    const root = host.create.div()
      .id.set("test-panels-root")
      .css.setMany({
        display: "grid",
        gap: "12px",
        minWidth: "0",
        minHeight: "0",
        // simple 2-row: inspector above, test below (tweak to taste)
        gridTemplateRows: "auto 1fr",
      });

      
      // test chrome
      const testFrame = root.create.div().css.setMany(PANEL_FRAMEcss);
      const testSurface = testFrame.create.div().css.setMany(PANEL_SURFACEcss);
      
      // inspector chrome
      const inspFrame = root.create.div().css.setMany(PANEL_FRAMEcss);
      const inspSurface = inspFrame.create.div().css.setMany({
        ...PANEL_SURFACEcss,
        minHeight: "12rem",
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
      async (key) => {
        const fn = captureMap.get(key);
        if (!fn) {
          // CHANGED: fail visibly inside the inspector, not as a silent “nothing happened”
          // (Assuming inspector has a “marquee/log” or render-able error path)
          throw new Error(`no capture registered for key: ${String(key)}`);
        }
        return fn();
      },
    );

    // local event sink (no mount_demo involvement)
    const onEvent = (e: TestEvent): void => {
      tlog.onEvent(e);
      tp.marquee.text.set(tlog.getLastLine());
    };

    // --- wire buttons inside the widget ---
    tp.runBtn.listen.onClick(async () => {
      // (Optional) show inspector when running
      inspFrame.classlist.remove($PANEL_HIDDEN);

      tlog.clear();
      tp.chips.clear();
      tp.marquee.text.set("running…");

      // IMPORTANT: ensure getMode() returns TestRunMode (not string)
      const mode: TestRunMode = tp.getMode();

      // CHANGED: build suites and also populate captureMap here,
      // so “some fixtures show nothing” can be debugged centrally.
      captureMap.clear();
      const suites = build_suites_for_mode(mode, { _test_full_loop }, captureMap);

      const res = await run_test_suites(suites, onEvent, { bail: false });

      tp.chips.render(res.summary);
      tp.marquee.text.set(tlog.getLastLine());

      // render inspector view of the most recent run
      inspector.show();
      inspector.render();

      // If you only want inspector visible on failures:
      // if (!res.ok) inspFrame.classlist.remove($PANEL_HIDDEN);
    });

    tp.clearBtn.listen.onClick(() => {
      tlog.clear();
      tp.chips.clear();
      tp.marquee.text.set("idle");
      inspector.clear();

      // If you want “clear hides inspector”
      // inspFrame.classlist.add($PANEL_HIDDEN);
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