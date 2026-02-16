import { hson } from "hson-live";
import type { LiveTree } from "../../../../../../hson-live/dist/api/livetree/livetree";
import type { UiLevel, TestRunMode } from "../../../../tests/tests.types";
import { $txt_ } from "../../../consts/ui-consts";
import { make_btn_chip } from "../../../widgets/gems/make-gems";
import { TEST_SELECTcss } from "../demo-panels.css";
import { PANEL_BRANCHcss, MARQUEE_BOXcss, MARQUEEcss, TEST_STATUS_CHIPcss, CONTROL_ROWcss, RUN_BUTTONcss, CLEAR_BTNcss } from "../demo-panels.css";
import { type ChipDisplay, create_test_chips } from "./test-chips";
import { relay, type Outcome, type OutcomeData, type OutcomeMaybeData } from "intrastructure";



const introText = "TRANSFORMER LOOP TEST: parses & seriualizes an input string through JSON->HSON->HTML->JSON (and the opposite direction) over n iterations, diffs steps"

export type TestPanel = Readonly<{
  branch: LiveTree;
  mount: (hostBody: LiveTree) => void;

  runBtn: LiveTree;
  clearBtn: LiveTree;
  // levelBtn: LiveTree;
  suiteSel: LiveTree;

  status: LiveTree;
  marquee: LiveTree;
  chips: ChipDisplay,
  // state accessors (so callsite doesn’t poke DOM attrs directly)
  getLevel: () => UiLevel;
  getMode: () => TestRunMode;

  setStatus: (txt: string) => void;
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

export function mount_test_panel(host: LiveTree): Outcome<TestPanel> {
  try {
    const tp = test_panel_factory();
    tp.mount(host);
    return relay.data(tp);
  } catch (err) {
    return relay.err(err instanceof Error ? err.message : "unknown error");
  }
}

function test_panel_factory(): TestPanel {
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
  const marquee = marqueeBox.create.tags(["marquee"]).first()!
    .id.set("test-marquee")
    .css.setMany({
      ...MARQUEEcss,
    });

  // -------------------------
  // MODE SELECT + STATUS
  // -------------------------
  const suiteSel = branch.create.select()
    .id.set("test-select")
    .css.setMany({
      ...TEST_SELECTcss,
      gridRow: "2",
      gridColumn: "1 / 4",
    });

  const status = branch.create.div()
    .id.set("test-status")
    .css.setMany({
      ...TEST_STATUS_CHIPcss,
      gridRow: "2",
      gridColumn: "4 / 5",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontSize: $txt_.sub,
    });

  // -------------------------
  // BUTTON ROW
  // -------------------------
  const controlsRow = branch.create.div()
    .id.set("test-controls")
    .css.setMany(CONTROL_ROWcss);

  // CHANGED: keep your existing helper (toggle gem), but treat it as a “chip”
  const runChip = make_btn_chip(controlsRow, "test-run", "run");
  const clearChip = make_btn_chip(controlsRow, "test-clear", "clear");

  const runBtn = runChip.node.css.setMany(RUN_BUTTONcss);

  const clearBtn = clearChip.node.css.setMany(CLEAR_BTNcss);

  // -------------------------
  // chips
  // -------------------------
  
  const chips = create_test_chips(branch);

  // -------------------------
  // state
  // -------------------------
  let mounted = false;
  let level: UiLevel = "normal";
  let mode: TestRunMode = "all";

  const setStatus = (txt: string): void => {
    if (!mounted) return;
    status.setText(txt);
  };

  // CHANGED: simplest possible marquee writer (no strip, no scrollbars)
  const setMarquee = (txt: string): void => {
    if (!mounted) return;
    marquee.setText(txt);
  };

  const clearMarquee = (): void => {
    if (!mounted) return;
    marquee.setText("");
  };

  const mount = (hostBody: LiveTree): void => {
    if (mounted) return;
    hostBody.append(branch);
    mounted = true;

    runBtn.setText("run");
    clearBtn.setText("clear");
    status.setText("idle");

    // populate select
    suiteSel.empty();
    for (const m of MODES) {
      const opt = suiteSel.create.option();
      opt.setAttrs("value", m.key);
      opt.setText(m.label);
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
      setStatus("idle");
    });
  };

  // CHANGED: set initial marquee before mount so it’s ready
  marquee.setText(introText);

  return {
    branch,
    mount,

    runBtn,
    clearBtn,
    suiteSel,

    status,
    marquee,
     chips,

    getLevel: () => level,
    getMode: () => mode,

    setStatus,
    setMarquee,
    clearMarquee,
  } as const;
}