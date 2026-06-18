import type { LiveTree } from "hson-live";
import type { HsonNode } from "hson-live/types";
import type { JsonValue } from "../../../../hson-live/dist/types/core.types";

export type StateRootInput = HsonNode | LiveTree | JsonValue;

export interface NodeState {
  root(): HsonNode;
  get(): JsonValue;
  update(mut: (root: HsonNode) => void): void;
  replace(next: JsonValue): void;
  at(path: string | readonly (string | number)[]): NodeStateSlot;
  subscribe(fn: (next: HsonNode, prev: HsonNode) => void): () => void;
  subscribe_sel<T>(
    sel: (root: HsonNode) => T,
    onChange: (next: T, prev: T) => void,
  ): () => void;
}

export interface NodeStateSlot {
  node(): HsonNode | undefined;
  get(): JsonValue | undefined;
  set(next: JsonValue): void;
  remove(): void;
  //   push?(next: JsonValue): void;
  //   subscribe(fn: (next: JsonValue | undefined, prev: JsonValue | undefined) => void): () => void;
}
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

export type DemoColorKind = "oklch" | "css";

export type DemoColorPath = string;

export type DemoColorToken = {
  path: DemoColorPath;
  label: string;
  varName: string;
  initial: string;
  value: string;
  editable: boolean;
  kind: DemoColorKind;
};

export type DemoColorState = {
  activePath: DemoColorPath | null;
  tokens: Record<DemoColorPath, DemoColorToken>;
};

export type DemoThemeState = {
  colors: DemoColorState;
};

export type DemoUiState = {
  currentView: DemoView;
  activeWidgets: DemoWidget[];
  aboutTocOpen: boolean;

};

export type DemoState = {
  ui: DemoUiState;
  theme: DemoThemeState;
};

export type DemoStateRO = Readonly<DemoState>;
//  listeners receive (next, prev) so they can diff

export type Listener = (next: DemoStateRO, prev: DemoStateRO) => void; export type StateSmokeResult = {
  ok: boolean;
  steps: string[];
};
export type DemoStore = {
  stateSnapshot(): DemoStateRO;
  getView(): DemoView;
  getWidgets(): DemoWidget[];
  hasWidget(widget: DemoWidget): boolean;
  getTocOpen(): boolean;
  getColorState(): DemoColorState;
  getColorTokens(): Record<DemoColorPath, DemoColorToken>;
  getColTkn(path: DemoColorPath): DemoColorToken | undefined;
  getColorActivePath(): DemoColorPath | null;
  getColorActiveToken(): DemoColorToken | undefined;

  update(mut: (draft: DemoState) => void): void;
  setView(next: DemoView): void;
  toggleView(next: Exclude<DemoView, null>): void;

  startWidget(next: DemoWidget): void;
  stopWidget(next: DemoWidget): void;
  toggleWidget(widget: DemoWidget): void;
  setColorActivePath(path: DemoColorPath | null): void;
  setColorValue(path: DemoColorPath, value: string): void;
  resetColVal(path: DemoColorPath): void;
  resetColorValues(): void;

  // set_about_toc_open(next: boolean): void;
  subscribe(fn: (state: DemoStateRO) => void): () => void;
  subDiff(fn: Listener): () => void;
  subSel<T>(
    sel: (s: DemoStateRO) => T,
    onChange: (next: T, prev: T, state: DemoStateRO) => void
  ): () => void;

  stateNode(): HsonNode;
};
