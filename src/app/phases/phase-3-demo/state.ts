// demo-state.ts

// ---- types ----

export type DemoViews =
  | null
  | "about"
  | "test"
  | "parse"
  | "build"
  | "fleurs";

export type WidgetList =
  | "oklch"
  | "mouse"
  | "motes";

// Readonly type alias used everywhere 
export type DemoUiState = {
  currentView: DemoViews;
  // activeWidget?: WidgetList;
};

export type DemoState = {
  ui: DemoUiState;
};

export type DemoStateRO = Readonly<DemoState>;

//  listeners receive (next, prev) so they can diff
export type Listener = (next: DemoStateRO, prev: DemoStateRO) => void;

// ---- private singleton state ----

const state: DemoState = {
  ui: {
    currentView: null,
  },
};

const listeners = new Set<Listener>();

// tiny helper to notify all listeners
const emit = (prev: DemoStateRO): void => {
  // `state` is mutable; prev is the frozen snapshot reference
  for (const fn of listeners) fn(state, prev);
};

//  minimal snapshot (shallow) so prev/next diffing is meaningful
const snapshot = (): DemoStateRO => ({
  ui: { ...state.ui },
});

// ---- public API ----

export function demo_get_state(): DemoStateRO {
  return state;
}

export function get_view(): DemoViews {
  return state.ui.currentView;
}

// general-purpose update 
export function demo_update(mut: (draft: DemoState) => void): void {
  const prev = snapshot();
  mut(state);

  // avoid emitting when nothing changed 
  if (prev.ui.currentView === state.ui.currentView) return;

  emit(prev);
}

export function set_view(next: DemoViews): void {
  // implement via demo_update() so all mutations funnel through one path
  demo_update((s) => {
    s.ui.currentView = next;
  });
}

// subscribe wraps the old signature by ignoring `prev`
export function demo_subscribe(fn: (state: DemoStateRO) => void): () => void {
  const wrapped: Listener = (next) => fn(next);
  listeners.add(wrapped);
  return () => listeners.delete(wrapped);
}

// subscribe with prev/next (for “what changed” logic)
export function demo_subscribe_diff(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// selector subscription: only fires when selected slice changes
export function demo_subscribe_sel<T>(
  sel: (s: DemoStateRO) => T,
  onChange: (next: T, prev: T, state: DemoStateRO) => void,
): () => void {
  let prevVal = sel(state);

  const wrapped: Listener = (next) => {
    const nextVal = sel(next);
    if (Object.is(nextVal, prevVal)) return;
    const old = prevVal;
    prevVal = nextVal;
    onChange(nextVal, old, next);
  };

  listeners.add(wrapped);
  return () => listeners.delete(wrapped);
}

export function toggle_view(next: Exclude<DemoViews, null>): void {
  const current = get_view();
  set_view(current === next ? null : next);
}