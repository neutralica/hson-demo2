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
  "fleurs";

export type DemoWidget = "oklch" |
  "mouse" |
  "motes";
// Readonly type alias used everywhere 

export type DemoUiState = {
  currentView: DemoView;
  activeWidgets: DemoWidget[];
  aboutTocOpen: boolean;

};

export type DemoState = {
  ui: DemoUiState;
};

export type DemoStateRO = Readonly<DemoState>;
//  listeners receive (next, prev) so they can diff

export type Listener = (next: DemoStateRO, prev: DemoStateRO) => void;export type StateSmokeResult = {
    ok: boolean;
    steps: string[];
};

