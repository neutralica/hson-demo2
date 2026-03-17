
export type DemoView =
  | null
  | "about"
  | "test"
  | "parse"
  | "build"
  | "fleurs";

export type DemoWidget =
  | "oklch"
  | "mouse"
  | "motes";

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
export type Listener = (next: DemoStateRO, prev: DemoStateRO) => void;
