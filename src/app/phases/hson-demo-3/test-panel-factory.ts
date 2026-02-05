

import { hson, type LiveTree } from "hson-live";
import { MENU_BTNcss, TEST_BODY_OVERRIDEScss, TEST_CONSOLEcss, TEST_STATUS_CHIPcss, TEST_TOOLBARcss } from "./demo-panels.css";
import type { ConsoleLevel } from "../../console/console";
import type { TestRunMode, TestSummary } from "../../../tests/tests.types";
import { TEST_SELECTcss } from "./demo-panels";
import { makeDivId } from "../../utils/makers";

export type TestGems = Readonly<{
  clear: () => void;
  render: (s: TestSummary) => void;
}>;

export function create_test_gems(host: LiveTree): TestGems {
  const box = host.create.div()
    .id.set("test-gems")
    .css.setMany({
      display: "flex",
      gap: "6px",
      flexWrap: "wrap",
      padding: "6px 0",
    });

  const makeGem = (label: string) => {
    const g = box.create.div().css.setMany({
      minWidth: "44px",
      padding: "6px 8px",
      borderRadius: "6px",
      background: "rgba(255,255,255,0.08)",
      display: "grid",
      gridTemplateRows: "auto auto",
      justifyItems: "center",
      fontFamily: "ui-monospace, monospace",
      fontSize: "12px",
    });

    const val = g.create.div().setText("—").css.setMany({
      fontSize: "14px",
      fontWeight: "600",
    });

    const lbl = g.create.div().setText(label).css.setMany({
      opacity: "0.6",
      fontSize: "10px",
    });

    return {
      set: (v: string | number) => val.setText(String(v)),
      clear: () => val.setText("—"),
    };
  };

  const total = makeGem("total");
  const pass = makeGem("pass");
  const fail = makeGem("fail");
  const time = makeGem("ms");

  return {
    clear: () => {
      total.clear();
      pass.clear();
      fail.clear();
      time.clear();
    },

    render: (s) => {
      total.set(s.cases);
      pass.set(s.pass);
      fail.set(s.fail);
      time.set(Math.round(s.msTotal));
    },
  };
}

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
  getLevel: () => ConsoleLevel;
  getMode: () => TestRunMode;

  setStatus: (txt: string) => void;
  setMarquee: (txt: string) => void;
  clearMarquee: () => void;
}>;

const LEVELS: readonly ConsoleLevel[] = ["normal", "verbose", "quiet"] as const;

const MODES: readonly Readonly<{ key: TestRunMode; label: string }>[] = [
  { key: "all", label: "all" },
  { key: "generated", label: "generated" },
  { key: "basic", label: "basic" },
] as const;

export function test_panel_factory_offdom(): TestPanel {
  const branch = hson.fromTrustedHtml("<div></div>").liveTree().asBranch();

  const toolbar = branch.create.div()
    .id.set("test-toolbar")
    .css.setMany(TEST_TOOLBARcss);

  // CHANGED: add suite select + verbosity button
  const suiteSel = toolbar.create.select()
    .id.set("test-suite")
    .css.setMany(TEST_SELECTcss);

  const levelBtn = toolbar.create.div()
    .id.set("test-verbosity")
    .css.setMany(MENU_BTNcss);

  const runBtn = makeDivId(toolbar, "test-run")
    .css.setMany(MENU_BTNcss);

  const clearBtn = toolbar.create.div()
    .id.set("test-clear")
    .css.setMany(MENU_BTNcss);

  const status = toolbar.create.div()
    .id.set("test-status")
    .css.setMany(TEST_STATUS_CHIPcss);

  const marquee = branch.create.div()
    .id.set("test-marquee")
    .css.setMany(TEST_CONSOLEcss);

  const gems = create_test_gems(branch);

  let mounted = false;

  // internal UI state (source of truth)
  let level: ConsoleLevel = "normal";
  let mode: TestRunMode = "all";

  const setStatus = (txt: string): void => {
    if (!mounted) return;
    status.setText(txt);
  };
  const setMarquee = (txt: string): void => {
    if (!mounted) return;
    marquee.setText(txt);
  };

  const clearMarquee = (): void => {
    if (!mounted) return;
    marquee.setText("");
  };

  const renderLevel = (): void => {
    if (!mounted) return;
    levelBtn.setText(`verbosity: ${level}`);
  };

  const renderMode = (): void => {
    // select shows it; nothing else required
    void 0;
  };

  // CHANGED: add near top of file
const LEVELS: readonly ConsoleLevel[] = ["quiet", "normal", "verbose"] as const;

// ...

const mount = (hostBody: LiveTree): void => {
  if (mounted) return;
  hostBody.append(branch);
  mounted = true;

  runBtn.setText("run");
  clearBtn.setText("clear");
  renderLevel();            // CHANGED: use helper so it stays consistent
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

  // CHANGED: re-add verbosity cycling, but ONLY after mount (DOM-backed)
  levelBtn.listen.onClick(() => {
    const idx = LEVELS.indexOf(level);
    level = LEVELS[(idx + 1) % LEVELS.length] ?? "normal";
    renderLevel();
  });

  // CHANGED: clear should clear the tiny panel surfaces
  clearBtn.listen.onClick(() => {
    clearMarquee();
    setStatus("idle");
  });
};

  return {
    branch,
    mount,
    runBtn,
    clearBtn,
    levelBtn,
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