

import { hson, type LiveTree } from "hson-live";
import { MENU_BTNcss, MARQUEEcss, TEST_STATUS_CHIPcss, TEST_TOOLBARcss } from "../app/phases/hson-demo-3/demo-panels.css";
import type { TestRunMode } from "./tests.types";
import { TEST_SELECTcss } from "../app/phases/hson-demo-3/demo-panels";
import { make_toggle_gem } from "../app/widgets/gems/make-gems";
import { type TestGems, create_test_gems } from "./test-gems";
import { type UiLevel } from "./tests.types";
import { PANEL_BRANCHcss, TEST_PANELcss } from "./test-panel.css";
import type { LoopReport } from "../../../hson-live/dist/diagnostics/loop-3.test";

const introText = "3-way loop test: verifies parsing and serialization across JSON, HTML, and HSON by round-tripping an input string through all formats, reparsing to nodes and then reserializing at each step, then diffing final outputs and intermediary stages, esp. node structure."

export type TestPanel = Readonly<{
  branch: LiveTree;
  mount: (hostBody: LiveTree) => void;

  runBtn: LiveTree;
  clearBtn: LiveTree;
  levelBtn: LiveTree;
  suiteSel: LiveTree;

  status: LiveTree;
  marquee: LiveTree;
  gems: TestGems,
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

export function test_panel_factory_offdom(): TestPanel {
  const branch = hson.fromTrustedHtml("<div></div>").liveTree().asBranch().id.set("panel-branch");
  branch.css.setMany(PANEL_BRANCHcss);

  // const toolbar = branch.create.div()
  //   .id.set("test-toolbar")
  //   .css.setMany(TEST_TOOLBARcss);
  // CHANGED: marquee is a viewport + inner moving strip
const marquee = branch.create.tags(["marquee"]).first()!
  .id.set("test-marquee")
  .css.setMany({
    ...MARQUEEcss,
    gridRow: "1",

    // CHANGED: true marquee viewport
    overflow: "hidden",
    position: "relative",
  });

// CHANGED: inner strip we translate left
const marqueeStrip = marquee.create.div()
  .classlist.set("marquee-strip")
  .css.setMany({
    display: "inline-block",
    whiteSpace: "pre",
    willChange: "transform",
  });

  const controlsRow = branch.create.div().id.set("test-controls").css.setMany({
    ...TEST_PANELcss,
    gridRow: "3",
    gridColumn: "1 / 4"
  });


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
      gridColumn: "4 / 5"
    });


  const runGem = make_toggle_gem(controlsRow, "test-run", "run");
  const clearGem = make_toggle_gem(controlsRow, "test-clear", "clear");
  const vGem = make_toggle_gem(controlsRow, "test-v", "--v");
  vGem.setActive(true);
  const runBtn = runGem.node.css.setMany(MENU_BTNcss);
  const clearBtn = clearGem.node.css.setMany(MENU_BTNcss);
  const vBtn = vGem.node.css.setMany({
    ...MENU_BTNcss,
    gridColumn: "3 / 6"
  });
  const gems = create_test_gems(branch);

  let mounted = false;

  // internal UI state (source of truth)
  let level: UiLevel = "normal";
  let mode: TestRunMode = "all";

  const setStatus = (txt: string): void => {
    if (!mounted) return;
    status.setText(txt);
  };
  const setMarquee = (txt: string): void => {
    if (!mounted) return;
    marquee.setText(txt);

    // brief “scroll mode” if long
    const long = txt.length > 48;
    marquee.css.setMany(long ? {
      overflowX: "auto",
      textOverflow: "clip",
    } : {
      overflowX: "hidden",
      textOverflow: "ellipsis",
    });

    // optional: auto-reset after a bit so you don’t keep scrollbars around
    if (long) {
      window.setTimeout(() => {
        if (!mounted) return;
        marquee.css.setMany({ overflowX: "hidden", textOverflow: "ellipsis" });
      }, 4000);
    }
  };

  const clearMarquee = (): void => {
    if (!mounted) return;
    marquee.setText("");
  };

  const renderLevel = (): void => {
    if (!mounted) return;
    vBtn.setText(`--v: ${level}`);
  };

  const renderMode = (): void => {
    // select shows it; nothing else required
    void 0;
  };

  const mount = (hostBody: LiveTree): void => {
    if (mounted) return;
    hostBody.append(branch);
    mounted = true;

    runBtn.setText("run");
    clearBtn.setText("clear");
    renderLevel();            // use helper so it stays consistent
    status.setText("idle");

    // populate select options...
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
      renderMode();
    });

    // re-add verbosity cycling, but ONLY after mount (DOM-backed)
    vBtn.listen.onClick(() => {
      level = level === "normal" ? "quiet" : "normal";
      renderLevel();
    });

    // clear should clear the tiny panel surfaces
    clearBtn.listen.onClick(() => {
      clearMarquee();
      setStatus("idle");
    });
  };

  marquee.setText(introText)

  return {
    branch,
    mount,
    runBtn,
    clearBtn,
    levelBtn: vBtn,
    suiteSel,
    status,
    marquee,

    getLevel: () => level,
    getMode: () => mode,

    gems,
    setStatus,
    setMarquee,
    clearMarquee,
  } as const;
}