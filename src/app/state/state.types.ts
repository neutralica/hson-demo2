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
  get_state(): DemoStateRO;
  get_view(): DemoView;
  get_widgets(): DemoWidget[];
  has_widget(widget: DemoWidget): boolean;
  get_about_toc_open(): boolean;
  get_color_state(): DemoColorState;
  get_color_tokens(): Record<DemoColorPath, DemoColorToken>;
  get_color_token(path: DemoColorPath): DemoColorToken | undefined;
  get_color_active_path(): DemoColorPath | null;
  get_active_color_token(): DemoColorToken | undefined;

  update(mut: (draft: DemoState) => void): void;
  set_view(next: DemoView): void;
  toggle_view(next: Exclude<DemoView, null>): void;

  activate_widget(next: DemoWidget): void;
  deactivate_widget(next: DemoWidget): void;
  toggle_widget(widget: DemoWidget): void;
  set_color_active_path(path: DemoColorPath | null): void;
  set_color_value(path: DemoColorPath, value: string): void;
  reset_color_value(path: DemoColorPath): void;
  reset_color_values(): void;

  // set_about_toc_open(next: boolean): void;
  subscribe(fn: (state: DemoStateRO) => void): () => void;
  subscribe_diff(fn: Listener): () => void;
  subscribe_sel<T>(
    sel: (s: DemoStateRO) => T,
    onChange: (next: T, prev: T, state: DemoStateRO) => void
  ): () => void;

  state_node(): HsonNode;
};
