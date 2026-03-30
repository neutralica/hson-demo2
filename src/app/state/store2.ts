// CHANGED: turn the demo store into a factory first, then export a singleton.

import type { JsonValue, HsonNode } from "hson-live/types";
import { make_state } from "./make-state";
import { clone_node } from "./clone-node";
import type { DemoState, DemoStateRO, DemoView, DemoWidget, Listener } from "./state.types";
import { json_equal } from "./state-helpers";

// export type DemoView = "about" | "parse" | "test" | "build" | null;
// export type DemoWidget = "mouse";

// export type DemoState = {
//   ui: {
//     currentView: DemoView;
//     activeWidgets: DemoWidget[];
//     aboutTocOpen: boolean;
//   };
// };

// export type DemoStateRO = Readonly<DemoState>;

// export type Listener = (next: DemoStateRO, prev: DemoStateRO) => void;

export type DemoStore = {
  get_state(): DemoStateRO;
  get_view(): DemoView;
  get_widgets(): DemoWidget[];
  has_widget(widget: DemoWidget): boolean;
  get_about_toc_open(): boolean;

  update(mut: (draft: DemoState) => void): void;
  set_view(next: DemoView): void;
  toggle_view(next: Exclude<DemoView, null>): void;

  activate_widget(next: DemoWidget): void;
  deactivate_widget(next: DemoWidget): void;
  toggle_widget(widget: DemoWidget): void;

  set_about_toc_open(next: boolean): void;

  subscribe(fn: (state: DemoStateRO) => void): () => void;
  subscribe_diff(fn: Listener): () => void;
  subscribe_sel<T>(
    sel: (s: DemoStateRO) => T,
    onChange: (next: T, prev: T, state: DemoStateRO) => void,
  ): () => void;

  state_node(): HsonNode;
};

export const INITIAL_DEMO_STATE: DemoState = {
  ui: {
    currentView: null,
    activeWidgets: [],
    aboutTocOpen: false,
  },
};

export function create_demo_store(
  initial: DemoState = INITIAL_DEMO_STATE,
): DemoStore {
  // CHANGED: one canonical node-backed state instance per store
  const demoState = make_state(clone_node(initial));

  // CHANGED: store-local listeners, not module-global
  const listeners = new Set<Listener>();

  function clone_json<T extends JsonValue>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function snapshot(): DemoStateRO {
    return clone_json(demoState.get() as DemoState);
  }

  function emit(prev: DemoStateRO): void {
    const next = get_state();
    for (const fn of listeners) {
      fn(next, prev);
    }
  }

  function state_get<T extends JsonValue>(
    path: string | readonly (string | number)[],
  ): T {
    return demoState.at(path).get() as T;
  }

  function state_set(
    path: string | readonly (string | number)[],
    next: JsonValue,
  ): void {
    const prev = snapshot();

    demoState.at(path).set(next);

    const nextSnap = get_state();
    if (json_equal(prev as JsonValue, nextSnap as JsonValue)) return;

    emit(prev);
  }

  function state_remove(
    path: string | readonly (string | number)[],
  ): void {
    const prev = snapshot();

    demoState.at(path).remove();

    const nextSnap = get_state();
    if (json_equal(prev as JsonValue, nextSnap as JsonValue)) return;

    emit(prev);
  }

  // -------------------------
  // public API
  // -------------------------

  function get_state(): DemoStateRO {
    return snapshot();
  }

  function get_view(): DemoView {
    return state_get<DemoView>(["ui", "currentView"]);
  }

  function get_widgets(): DemoWidget[] {
    return state_get<DemoWidget[]>(["ui", "activeWidgets"]);
  }

  function has_widget(widget: DemoWidget): boolean {
    return get_widgets().includes(widget);
  }

  function get_about_toc_open(): boolean {
    return state_get<boolean>(["ui", "aboutTocOpen"]);
  }

  // CHANGED: update stays ergonomic, but now replaces the whole node-backed root
  function update(mut: (draft: DemoState) => void): void {
    const prev = snapshot();
    const draft = clone_json(prev);

    mut(draft);

    if (json_equal(prev as JsonValue, draft as JsonValue)) return;

    demoState.replace(draft);
    emit(prev);
  }

  function set_view(next: DemoView): void {
    state_set(["ui", "currentView"], next);
  }

  function toggle_view(next: Exclude<DemoView, null>): void {
    const current = get_view();
    set_view(current === next ? null : next);
  }

  // CHANGED: still using full-array replacement for now; simple and robust
  function activate_widget(next: DemoWidget): void {
    const widgets = get_widgets();
    if (widgets.includes(next)) return;

    state_set(["ui", "activeWidgets"], [...widgets, next]);
  }

  function deactivate_widget(next: DemoWidget): void {
    const widgets = get_widgets();
    const filtered = widgets.filter((w) => w !== next);

    if (filtered.length === widgets.length) return;
    state_set(["ui", "activeWidgets"], filtered);
  }

  function toggle_widget(widget: DemoWidget): void {
    if (has_widget(widget)) {
      deactivate_widget(widget);
      return;
    }

    activate_widget(widget);
  }

  function set_about_toc_open(next: boolean): void {
    state_set(["ui", "aboutTocOpen"], next);
  }

  // -------------------------
  // subscriptions
  // -------------------------

  function subscribe(fn: (state: DemoStateRO) => void): () => void {
    const wrapped: Listener = (next) => fn(next);
    listeners.add(wrapped);
    return () => listeners.delete(wrapped);
  }

  function subscribe_diff(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function subscribe_sel<T>(
    sel: (s: DemoStateRO) => T,
    onChange: (next: T, prev: T, state: DemoStateRO) => void,
  ): () => void {
    let prevVal = sel(get_state());

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

  function state_node(): HsonNode {
    return demoState.root();
  }

  return {
    get_state,
    get_view,
    get_widgets,
    has_widget,
    get_about_toc_open,

    update,
    set_view,
    toggle_view,
    activate_widget,
    deactivate_widget,
    toggle_widget,
    set_about_toc_open,

    subscribe,
    subscribe_diff,
    subscribe_sel,

    state_node,
  };
}

// CHANGED: singleton app store still exists, but now comes from the factory
const demoStore = create_demo_store();

// CHANGED: preserve old module API so the rest of the app does not need to change
export const demo_get_state = demoStore.get_state;
export const get_view = demoStore.get_view;
export const get_widgets = demoStore.get_widgets;
export const has_widget = demoStore.has_widget;
export const get_about_toc_open = demoStore.get_about_toc_open;

export const demo_update = demoStore.update;
export const set_view = demoStore.set_view;
export const toggle_view = demoStore.toggle_view;
export const activate_widget = demoStore.activate_widget;
export const deactivate_widget = demoStore.deactivate_widget;
export const toggle_widget = demoStore.toggle_widget;
export const set_about_toc_open = demoStore.set_about_toc_open;

export const demo_subscribe = demoStore.subscribe;
export const demo_subscribe_diff = demoStore.subscribe_diff;
export const demo_subscribe_sel = demoStore.subscribe_sel;

export const demo_state_node = demoStore.state_node;