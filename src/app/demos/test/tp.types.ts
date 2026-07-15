import type { LiveTree } from "hson-live";
import type { ChipDisplay } from "./test-helpers";
import type { UiLevel } from "./tests.types";
import type { HostedTestSuiteId } from "../../hosted-test/hosted-test-suite";


export type TestPanels = Readonly<{
  root: LiveTree;
  testSurface: LiveTree;
  // Expose these if you want to poke them elsewhere; otherwise delete.
  tp: TestPanel;
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
  getMode: () => HostedTestSuiteId;

  // setStatus: (txt: string) => void;
  setLog: (txt: string) => void;
  clearLogs: () => void;
  dispose: () => void;
}>;
