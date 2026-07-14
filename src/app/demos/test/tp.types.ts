import type { LiveTree } from "hson-live";
import type { InspectorUi, make_inspector } from "../../../tests/inspector/make-inspector";
import type { ChipDisplay } from "./test-helpers";
import type { UiLevel, TestRunMode } from "./tests.types";


export type TestPanels = Readonly<{
  root: LiveTree;
  testSurface: LiveTree;
  inspectorSurface: LiveTree;
  // Expose these if you want to poke them elsewhere; otherwise delete.
  tp: TestPanel;
  inspector: InspectorUi;
  dispose: () => void;
}>;export type TestPanel = Readonly<{
  branch: LiveTree;
  mount: (hostBody: LiveTree) => void;
  runBtn: LiveTree;
  clearBtn: LiveTree;
  // levelBtn: LiveTree;
  suiteSel: LiveTree;

  // status: LiveTree;
  logger: LiveTree;
  chips: ChipDisplay;
  // state accessors (so callsite doesn’t poke DOM attrs directly)
  getLevel: () => UiLevel;
  getMode: () => TestRunMode;

  // setStatus: (txt: string) => void;
  setLog: (txt: string) => void;
  clearLogs: () => void;
  dispose: () => void;
  inspector: ReturnType<typeof make_inspector>;
  inspectorSurface: LiveTree;
}>;
