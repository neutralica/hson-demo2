// demo-state.ts

import type { DemoState, Listener, DemoStateRO, DemoView, DemoWidget } from "./state/state.types";

// ---- types ----

// ---- private singleton state ----

const state: DemoState = {
  ui: {
    currentView: null,
    activeWidgets: [],
    aboutTocOpen: false, // CHANGED

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
  ui: {
    ...state.ui,
    activeWidgets: [...state.ui.activeWidgets], 
  },
});

// ---- public API ----

export function demo_get_state(): DemoStateRO {
  return state;
}

export function get_view(): DemoView {
  return state.ui.currentView;
}
export function get_widgets(): DemoWidget[] | undefined {
  return state.ui.activeWidgets
}

export function has_widget(widget: DemoWidget): boolean {
  return state.ui.activeWidgets.includes(widget);
}

export function demo_update(mut: (draft: DemoState) => void): void {
  const prev = snapshot();
  mut(state);

  const sameView = prev.ui.currentView === state.ui.currentView;
  const sameToc = prev.ui.aboutTocOpen === state.ui.aboutTocOpen;

  const prevWidgets = prev.ui.activeWidgets;
  const nextWidgets = state.ui.activeWidgets;

  const sameWidgets =
    prevWidgets.length === nextWidgets.length &&
    prevWidgets.every((w, i) => w === nextWidgets[i]);

  if (sameView && sameToc && sameWidgets) return;

  emit(prev);
}

export function set_view(next: DemoView): void {
  // implement via demo_update() so all mutations funnel through one path
  demo_update((s) => {
    s.ui.currentView = next;
  });
}

export function activate_widget(next: DemoWidget): void {
  demo_update((s) => {
    if (!s.ui.activeWidgets.includes(next)) {
      s.ui.activeWidgets.push(next);
    }
  });
}

export function deactivate_widget(next: DemoWidget): void {
  demo_update((s) => {
    const idx = s.ui.activeWidgets.indexOf(next);
    if (idx >= 0) {
      s.ui.activeWidgets.splice(idx, 1);
    }
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

export function toggle_view(next: Exclude<DemoView, null>): void {
  const current = get_view();
  set_view(current === next ? null : next);
}

export function toggle_widget(widget: DemoWidget): void {
  if (has_widget(widget)) {
    deactivate_widget(widget);
  } else {
    activate_widget(widget);
  }
}


export function get_about_toc_open(): boolean {
  return state.ui.aboutTocOpen;
}

export function set_about_toc_open(next: boolean): void {
  demo_update((s) => {
    s.ui.aboutTocOpen = next;
  });
}

export function toggle_about_toc(): void {
  set_about_toc_open(!get_about_toc_open());
}
export function change_toc_button_label(key: string){

}