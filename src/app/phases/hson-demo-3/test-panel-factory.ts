

import { hson, type LiveTree } from "hson-live";
import { MENU_BTNcss, TEST_BODY_OVERRIDEScss, TEST_CONSOLEcss, TEST_STATUS_CHIPcss, TEST_TOOLBARcss } from "./panels.css";
import type { ConsoleLevel } from "../../console/console";
import type { TestRunMode } from "../../../tests/tests.types";
import { TEST_SELECTcss } from "./demo-panels";


export type TestPanel = Readonly<{
  branch: LiveTree;
  mount: (hostBody: LiveTree) => void;

  runBtn: LiveTree;
  clearBtn: LiveTree;
  levelBtn: LiveTree;
  suiteSel: LiveTree;

  status: LiveTree;
  console: LiveTree;

  // state accessors (so callsite doesn’t poke DOM attrs directly)
  getLevel: () => ConsoleLevel;
  getMode: () => TestRunMode;

  setStatus: (txt: string) => void;
  appendLine: (txt: string) => void;
  clear: () => void;
}>;

const LEVELS: readonly ConsoleLevel[] = ["normal", "verbose", "quiet"] as const;

const MODES: readonly Readonly<{ key: TestRunMode; label: string }>[] = [
  { key: "all", label: "all" },
  { key: "generated", label: "generated" },
  { key: "full_loop_basic", label: "full loop (basic)" },
  { key: "hero_wikipedia", label: "hero: wikipedia" },
  { key: "hero_gwern", label: "hero: gwern" },
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

  const runBtn = toolbar.create.div()
    .id.set("test-run")
    .css.setMany(MENU_BTNcss);

  const clearBtn = toolbar.create.div()
    .id.set("test-clear")
    .css.setMany(MENU_BTNcss);

  const status = toolbar.create.div()
    .id.set("test-status")
    .css.setMany(TEST_STATUS_CHIPcss);

  const consoleEl = branch.create.div()
    .id.set("test-console")
    .css.setMany(TEST_CONSOLEcss);

  let mounted = false;

  // internal UI state (source of truth)
  let level: ConsoleLevel = "normal";
  let mode: TestRunMode = "all";

  const setStatus = (txt: string): void => {
    if (!mounted) return;
    status.setText(txt);
  };

  const appendLine = (txt: string): void => {
    if (!mounted) return;
    const prev = consoleEl.getText() ?? "";
    consoleEl.setText(prev.length ? `${prev}\n${txt}` : txt);
  };

  const clear = (): void => {
    if (!mounted) return;
    consoleEl.setText("");
  };

  const renderLevel = (): void => {
    if (!mounted) return;
    levelBtn.setText(`verbosity: ${level}`);
  };

  const renderMode = (): void => {
    // select shows it; nothing else required
    void 0;
  };

  const mount = (hostBody: LiveTree): void => {
    if (mounted) return;
    hostBody.append(branch);
    mounted = true;

    // text/DOM-backed ops: only now
    runBtn.setText("run");
    clearBtn.setText("clear");
    levelBtn.setText(`verbosity: ${level}`);
    status.setText("idle");

    // populate select options (now safe)
    suiteSel.empty();
    for (const m of MODES) {
      const opt = suiteSel.create.option();
      opt.setAttrs("value", m.key);
      opt.setText(m.label);
      if (m.key === mode) opt.setAttrs("selected", "selected");
    }

    levelBtn.listen.onClick(() => {
      // cycle: normal -> verbose -> quiet -> normal
      const idx = LEVELS.indexOf(level);
      level = LEVELS[(idx + 1) % LEVELS.length] ?? "normal";
      renderLevel();
    });

    suiteSel.listen.on("change", () => {
      // NOTE: LiveTree select value getter may differ in your API.
      // If you don’t have a getter yet, read from DOM element directly via node->el map,
      // or temporarily encode the chosen mode in data-attrs and read it back.
      const v = suiteSel.getFormValue?.() ?? "all"; // if you have it
      mode = (MODES.find(m => m.key === v)?.key ?? "all");
      renderMode();
    });

    clearBtn.listen.onClick(() => {
      clear();
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
    console: consoleEl,

    getLevel: () => level,
    getMode: () => mode,

    setStatus,
    appendLine,
    clear,
  } as const;
}