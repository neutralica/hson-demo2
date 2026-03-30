// CHANGED: old store replaced with node-backed state facade

import type { JsonValue } from "hson-live/types";
import { make_state } from "./make-state";

export type DemoView = "about" | "parse" | "test" | "build" | "fleurs" | null;
export type DemoWidget = "mouse";

export type DemoState = {
  ui: {
    currentView: DemoView;
    activeWidgets: DemoWidget[];
    aboutTocOpen: boolean;
  };
};

export type DemoStateRO = Readonly<DemoState>;

type Listener = (next: DemoStateRO, prev: DemoStateRO) => void;

// CHANGED: canonical initial state now feeds node-backed make_state
const INITIAL_DEMO_STATE: DemoState = {
  ui: {
    currentView: null,
    activeWidgets: [],
    aboutTocOpen: false,
  },
};

// CHANGED: one canonical backing store
const demoState = make_state(INITIAL_DEMO_STATE);

// CHANGED: local listener layer keeps old ergonomics
const listeners = new Set<Listener>();

function clone_json<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emit(prev: DemoStateRO): void {
  const next = demo_get_state();
  for (const fn of listeners) fn(next, prev);
}

function snapshot(): DemoStateRO {
  return clone_json(demoState.get() as DemoState);
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
  const nextSnap = demo_get_state();

  if (JSON.stringify(prev) === JSON.stringify(nextSnap)) return;
  emit(prev);
}

function state_remove(
  path: string | readonly (string | number)[],
): void {
  const prev = snapshot();
  demoState.at(path).remove();
  const nextSnap = demo_get_state();

  if (JSON.stringify(prev) === JSON.stringify(nextSnap)) return;
  emit(prev);
}

// -------------------------
// public API
// -------------------------

export function demo_get_state(): DemoStateRO {
  return clone_json(demoState.get() as DemoState);
}

export function get_view(): DemoView {
  return state_get<DemoView>(["ui", "currentView"]);
}

export function get_widgets(): DemoWidget[] {
  return state_get<DemoWidget[]>(["ui", "activeWidgets"]);
}

export function has_widget(widget: DemoWidget): boolean {
  return get_widgets().includes(widget);
}

export function get_about_toc_open(): boolean {
  return state_get<boolean>(["ui", "aboutTocOpen"]);
}

// CHANGED: central update now mutates the node-backed graph
export function demo_update(mut: (draft: DemoState) => void): void {
  const prev = snapshot();
  const draft = clone_json(prev);

  mut(draft);

  if (JSON.stringify(prev) === JSON.stringify(draft)) return;

  // CHANGED: replace whole root state in one shot for now
  demoState.replace(draft);

  emit(prev);
}

export function set_view(next: DemoView): void {
  state_set(["ui", "currentView"], next);
}

export function toggle_view(next: Exclude<DemoView, null>): void {
  const current = get_view();
  set_view(current === next ? null : next);
}

export function activate_widget(next: DemoWidget): void {
  const widgets = get_widgets();
  if (widgets.includes(next)) return;

  state_set(["ui", "activeWidgets"], [...widgets, next]);
}

export function deactivate_widget(next: DemoWidget): void {
  const widgets = get_widgets();
  const filtered = widgets.filter((w) => w !== next);

  if (filtered.length === widgets.length) return;
  state_set(["ui", "activeWidgets"], filtered);
}

export function toggle_widget(widget: DemoWidget): void {
  if (has_widget(widget)) {
    deactivate_widget(widget);
  } else {
    activate_widget(widget);
  }
}

export function set_about_toc_open(next: boolean): void {
  state_set(["ui", "aboutTocOpen"], next);
}

// -------------------------
// subscriptions
// -------------------------

export function demo_subscribe(fn: (state: DemoStateRO) => void): () => void {
  const wrapped: Listener = (next) => fn(next);
  listeners.add(wrapped);
  return () => listeners.delete(wrapped);
}

export function demo_subscribe_diff(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function demo_subscribe_sel<T>(
  sel: (s: DemoStateRO) => T,
  onChange: (next: T, prev: T, state: DemoStateRO) => void,
): () => void {
  let prevVal = sel(demo_get_state());

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

// CHANGED: optional escape hatch while iterating on the new state layer
export function demo_state_node() {
  return demoState.root();
}