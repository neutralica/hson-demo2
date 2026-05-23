import type { LiveTree } from "hson-live";
import type { create_inspector, InspectorUi } from "../inspector/test-inspector";
import type { UiLevel, TestRunMode } from "../tests.types";
import type { ChipDisplay } from "./test-helpers";


export type TestPanels = Readonly<{
  root: LiveTree;
  testSurface: LiveTree;
  inspectorSurface: LiveTree;
  // Expose these if you want to poke them elsewhere; otherwise delete.
  tp: TestPanel;
  inspector: InspectorUi;
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
  inspector: ReturnType<typeof create_inspector>;
  inspectorSurface: LiveTree;
}>;

