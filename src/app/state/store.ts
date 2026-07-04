import { hson } from "hson-live";
import type { JsonValue, HsonNode } from "hson-live/types";
import type { DemoState, DemoStateRO, DemoStore, DemoView, DemoWidget, Listener } from "./state.types";

export function make_initial_demo_state(): DemoState {
  return {
    ui: {
      currentView: null,
      activeWidgets: [],
      aboutTocOpen: false,
    },
  };
}

export const INITIAL_DEMO_STATE: DemoState = make_initial_demo_state();


export const DEMO_LIVEMAP_SCHEMA = hson.liveMap.schema.define((scm) => {
  return scm.exact({
    ui: scm.exact({
      currentView: scm.string.nullable,
      activeWidgets: scm.array(scm.string),
      aboutTocOpen: scm.boolean,
    }),
  });
});

export function create_demo_store(
  initial: DemoState = INITIAL_DEMO_STATE,
): DemoStore {
  const demoState = hson.liveMap
    .fromJson(cloneJson(initial))
    .schema.use(DEMO_LIVEMAP_SCHEMA);

  function cloneJson<T extends JsonValue>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function snapshot(): DemoStateRO {
    return cloneJson(demoState.snap() as DemoState);
  }

  function stateGet<T extends JsonValue>(
    path: string | readonly (string | number)[],
  ): T {
    return demoState.at(typeof path === "string" ? [path] : path).snap() as T;
  }

  function stateSet(
    path: string | readonly (string | number)[],
    next: JsonValue,
  ): void {
    demoState.at(typeof path === "string" ? [path] : path).set(next as never);
  }


  // -------------------------
  // public API
  // -------------------------

  function stateSnapshot(): DemoStateRO {
    return snapshot();
  }

  function getView(): DemoView {
    return stateGet<DemoView>(["ui", "currentView"]);
  }

  function getWidgets(): DemoWidget[] {
    return stateGet<DemoWidget[]>(["ui", "activeWidgets"]);
  }

  function hasWidget(widget: DemoWidget): boolean {
    return getWidgets().includes(widget);
  }

  function getTocOpen(): boolean {
    return stateGet<boolean>(["ui", "aboutTocOpen"]);
  }

  function setView(next: DemoView): void {
    stateSet(["ui", "currentView"], next);
  }

  function toggleView(next: Exclude<DemoView, null>): void {
    const current = getView();
    setView(current === next ? null : next);
  }

  function startWidget(next: DemoWidget): void {
    const widgets = getWidgets();
    if (widgets.includes(next)) return;

    stateSet(["ui", "activeWidgets"], [...widgets, next]);
  }

  function stopWidget(next: DemoWidget): void {
    const widgets = getWidgets();
    const filtered = widgets.filter((w) => w !== next);

    if (filtered.length === widgets.length) return;
    stateSet(["ui", "activeWidgets"], filtered);
  }

  function toggleWidget(widget: DemoWidget): void {
    if (hasWidget(widget)) {
      stopWidget(widget);
      return;
    }
    
    startWidget(widget);
  }

  // -------------------------
  // subscriptions
  // -------------------------

  function subscribe(fn: (state: DemoStateRO) => void): () => void {
    return demoState.sub((state) => fn(cloneJson(state as DemoState)));
  }

  function subscribeDiff(fn: Listener): () => void {
    return demoState.sub.diff((next, prev) => {
      fn(cloneJson(next as DemoState), cloneJson(prev as DemoState));
    });
  }

  function subscribeSel<T>(
    sel: (s: DemoStateRO) => T,
    onChange: (next: T, prev: T, state: DemoStateRO) => void,
  ): () => void {
    return demoState.sub.sel(
      (state) => sel(state as DemoStateRO),
      (next, prev, state) => onChange(next, prev, cloneJson(state as DemoState)),
    );
  }

  function stateNode(): HsonNode {
    return demoState.root();
  }

  return {
    stateSnapshot: stateSnapshot,
    getView,
    getWidgets,
    hasWidget,
    getTocOpen,

    setView,
    toggleView,
    startWidget,
    stopWidget,
    toggleWidget,

    subscribe,
    subDiff: subscribeDiff,
    subSel: subscribeSel,

    stateNode: stateNode,
  };
}

const demoStore = create_demo_store();

export const demo_get_state = demoStore.stateSnapshot;
export const get_view = demoStore.getView;
export const get_widgets = demoStore.getWidgets;
export const has_widget = demoStore.hasWidget;
export const get_about_toc_open = demoStore.getTocOpen;

export const set_view = demoStore.setView;
export const toggle_view = demoStore.toggleView;
export const activate_widget = demoStore.startWidget;
export const deactivate_widget = demoStore.stopWidget;
export const toggle_widget = demoStore.toggleWidget;

export const demo_subscribe = demoStore.subscribe;
export const demo_subscribe_sel = demoStore.subSel;

function stop_all(stops: readonly (() => void)[]): () => void {
  return () => {
    for (const stop of stops) stop();
  };
}

function state_path_value(state: DemoStateRO, path: readonly (string | number)[]): JsonValue | undefined {
  let value: JsonValue | undefined = state as JsonValue;

  for (const part of path) {
    if (value === null || typeof value !== "object") return undefined;

    if (Array.isArray(value)) {
      if (typeof part !== "number") return undefined;
      value = value[part];
      continue;
    }

    if (typeof part !== "string") return undefined;
    value = value[part];
  }

  return value;
}

function state_path_signature(state: DemoStateRO, path: readonly (string | number)[]): string {
  return JSON.stringify(state_path_value(state, path));
}

function demo_subscribe_path(path: readonly (string | number)[], fn: () => void): () => void {
  return demo_subscribe_sel((state) => state_path_signature(state, path), fn);
}

export function demo_subscribe_view_state(fn: () => void): () => void {
  return stop_all([
    demo_subscribe_path(["ui", "currentView"], fn),
    demo_subscribe_sel((state) => state.ui.activeWidgets.join("\u001f"), fn),
  ]);
}

export const demo_state_node = demoStore.stateNode;