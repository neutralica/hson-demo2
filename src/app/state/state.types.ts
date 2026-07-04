// state.types.ts

import type { HsonNode } from "hson-live/types";

export type DemoView = null |
  "about" |
  "test" |
  "parse" |
  "build" |
  "bar-bar" |
  "fleurs";

export type DemoWidget =
  "oklch" |
  "point" |
  "motes";

export type DemoUiState = {
  currentView: DemoView;
  activeWidgets: DemoWidget[];
  aboutTocOpen: boolean;

};

export type DemoState = {
  ui: DemoUiState;
};

export type DemoStateRO = Readonly<DemoState>;

export type Listener = (next: DemoStateRO, prev: DemoStateRO) => void;

export type DemoStore = {
  stateSnapshot(): DemoStateRO;
  getView(): DemoView;
  getWidgets(): DemoWidget[];
  hasWidget(widget: DemoWidget): boolean;
  getTocOpen(): boolean;

  setView(next: DemoView): void;
  toggleView(next: Exclude<DemoView, null>): void;

  startWidget(next: DemoWidget): void;
  stopWidget(next: DemoWidget): void;
  toggleWidget(widget: DemoWidget): void;

  // set_about_toc_open(next: boolean): void;
  subscribe(fn: (state: DemoStateRO) => void): () => void;
  subDiff(fn: Listener): () => void;
  subSel<T>(
    sel: (s: DemoStateRO) => T,
    onChange: (next: T, prev: T, state: DemoStateRO) => void
  ): () => void;

  stateNode(): HsonNode;
};
