

import { hson, type LiveTree } from "hson-live";
import { MENU_BTNcss, TEST_BODY_OVERRIDEScss, TEST_CONSOLEcss, TEST_STATUS_CHIPcss, TEST_TOOLBARcss } from "./panels.css";
export type TestPanel = Readonly<{
  branch: LiveTree;                 // off-dom root
  mount: (hostBody: LiveTree) => void;

  runBtn: LiveTree;
  clearBtn: LiveTree;
  status: LiveTree;
  console: LiveTree;

  setStatus: (txt: string) => void;
  appendLine: (txt: string) => void;
  clear: () => void;
}>;

export function test_panel_factory_offdom(): TestPanel {
  // Off-DOM branch root.
  const branch = hson.fromTrustedHtml("<div></div>").liveTree().asBranch();

  // Build structure (SAFE: graph ops + css ops).
  const toolbar = branch.create.div()
    .id.set("test-toolbar")
    .css.setMany(TEST_TOOLBARcss);

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

  // Internal mounted flag: we only call setText/listen when true.
  let mounted = false;

  const setStatus = (txt: string): void => {
    if (!mounted) return; // or throw, but returning is less annoying during bring-up
    status.setText(txt);
  };

  const appendLine = (txt: string): void => {
    if (!mounted) return;

    // NOTE: your current setText replaces content; for "append",
    // do minimal concatenation until you add appendText later.
    const prev = consoleEl.getText() ?? "";
    consoleEl.setText(prev.length ? `${prev}\n${txt}` : txt);
  };

  const clear = (): void => {
    if (!mounted) return;
    consoleEl.setText("");
  };

  const mount = (hostBody: LiveTree): void => {
    if (mounted) return; // idempotent

    hostBody.append(branch);
    mounted = true;

    // NOW safe: DOM-backed operations.
    runBtn.setText("run");
    clearBtn.setText("clear");
    status.setText("idle");

    runBtn.listen.onClick(() => {
      setStatus("running");
      appendLine("…tests running…");
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
    status,
    console: consoleEl,
    setStatus,
    appendLine,
    clear,
  } as const;
}