import type { LiveTree } from "hson-live";
import type { HsonNode } from "hson-live/types";
import type { JsonValue } from "../../../../hson-live/dist/types/core.types";

export type StateRootInput = HsonNode | LiveTree | JsonValue;

export type StatePath = string | readonly (string | number)[];
export type StatePathParts = readonly (string | number)[];

export type StateChangeKind = "set" | "remove" | "replace";

export type StateChange = Readonly<{
  kind: StateChangeKind;
  path: StatePathParts;
  prev: JsonValue | undefined;
  next: JsonValue | undefined;
}>;

export type StateCommit = Readonly<{
  changed: boolean;
  changes: readonly StateChange[];
}>;

export type StateMutation =
  | Readonly<{ kind: "set"; path: StatePath; value: JsonValue }>
  | Readonly<{ kind: "remove"; path: StatePath }>;

export interface NodeState {
  root(): HsonNode;
  get(): JsonValue;
  snapshot(): JsonValue;
  update(mut: (root: HsonNode) => void): void;
  replace(next: JsonValue): void;
  replaceRoot(next: JsonValue): void;
  commit(mutations: readonly StateMutation[]): StateCommit;
  at(path: StatePath): NodeStateSlot;
  subscribe(fn: (next: HsonNode, prev: HsonNode) => void): () => void;
  subscribe_change(fn: (commit: StateCommit) => void): () => void;
  subscribe_sel<T>(
    sel: (root: HsonNode) => T,
    onChange: (next: T, prev: T) => void,
  ): () => void;
}

export interface NodeStateSlot {
  node(): HsonNode | undefined;
  get(): JsonValue | undefined;
  set(next: JsonValue): StateCommit;
  remove(): StateCommit;
  //   push?(next: JsonValue): void;
  //   subscribe(fn: (next: JsonValue | undefined, prev: JsonValue | undefined) => void): () => void;
}
export type DemoView = null |
  "about" |
  "test" |
  "parse" |
  "build" |
  "bar-bar" |
  "render" |
  "fleurs";

export type DemoWidget =
  "oklch" |
  "point" |
  "motes" |
  "monitor";

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

export type Listener = (next: DemoStateRO, prev: DemoStateRO) => void;

export type StateSmokeRow = Readonly<{
  ok: boolean;
  label: string;
  actual?: JsonValue;
  expected?: JsonValue;
  detail?: string;
}>;

export type StateSmokeResult = Readonly<{
  ok: boolean;
  steps: readonly string[];
  rows: readonly StateSmokeRow[];
}>;

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
