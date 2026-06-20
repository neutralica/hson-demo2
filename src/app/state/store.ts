import type { JsonValue, HsonNode } from "hson-live/types";
import { make_state } from "./state";
import { define_schema, with_schema } from "./schema";
import { clone_node } from "./clone-node";
import type { DemoColorPath, DemoColorState, DemoColorToken, DemoState, DemoStateRO, DemoStore, DemoView, DemoWidget, Listener } from "./state.types";
import { json_equal } from "./state-helpers";
import { COLOR_VAR_SOURCES, type ColorVarSource } from "../core/consts/colors.consts";

export type DemoColorDiff = Partial<Record<DemoColorPath, string>>;

function isOklchValue(value: string): boolean {
  return value.trim().toLowerCase().startsWith("oklch(");
}

function labelForColorPath(path: string): string {
  return path.replace(/\./g, "-");
}

function makeDemoColorToken(source: ColorVarSource): DemoColorToken {
  if (!isOklchValue(source.value)) {
    throw new Error(`expected OKLCH color token value for path: ${source.path}`);
  }

  return {
    path: source.path,
    label: labelForColorPath(source.path),
    varName: source.varName,
    initial: source.value,
    value: source.value,
    editable: true,
    kind: "oklch",
  };
}

function makeDemoColorTokens(): Record<DemoColorPath, DemoColorToken> {
  const tokens: Record<DemoColorPath, DemoColorToken> = {};

  for (const source of COLOR_VAR_SOURCES) {
    tokens[source.path] = makeDemoColorToken(source);
  }

  return tokens;
}

export function make_initial_demo_state(): DemoState {
  return {
    ui: {
      currentView: null,
      activeWidgets: [],
      aboutTocOpen: false,
    },
    theme: {
      colors: {
        activePath: null,
        tokens: makeDemoColorTokens(),
      },
    },
  };
}

export const INITIAL_DEMO_STATE: DemoState = make_initial_demo_state();

export const DEMO_STATE_SCHEMA = define_schema((scm) => ({
  ui: {
    currentView: scm.string.nullable,
    activeWidgets: scm.string.array,
    aboutTocOpen: scm.boolean,
  },
  theme: {
    colors: {
      activePath: scm.string.nullable,
      tokens: scm.record({
        path: scm.string,
        label: scm.string,
        varName: scm.string,
        initial: scm.oklch,
        value: scm.oklch,
        editable: scm.boolean,
        kind: scm.pick("oklch"),
      }),
    },
  },
}));

export function create_demo_store(
  initial: DemoState = INITIAL_DEMO_STATE,
): DemoStore {
  const demoState = with_schema(
    make_state(clone_node(initial)),
    DEMO_STATE_SCHEMA,
  );

  const listeners = new Set<Listener>();

  function cloneJson<T extends JsonValue>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function snapshot(): DemoStateRO {
    return cloneJson(demoState.get() as DemoState);
  }

  function emit(prev: DemoStateRO): void {
    const next = stateSnapshot();
    for (const fn of listeners) {
      fn(next, prev);
    }
  }

  function stateGet<T extends JsonValue>(
    path: string | readonly (string | number)[],
  ): T {
    return demoState.at(path).get() as T;
  }

  function stateSet(
    path: string | readonly (string | number)[],
    next: JsonValue,
  ): void {
    const prev = snapshot();

    demoState.at(path).set(next);

    const nextSnap = stateSnapshot();
    if (json_equal(prev as JsonValue, nextSnap as JsonValue)) return;

    emit(prev);
  }

  // function state_remove(
  //   path: string | readonly (string | number)[],
  // ): void {
  //   const prev = snapshot();

  //   demoState.at(path).remove();

  //   const nextSnap = get_state();
  //   if (json_equal(prev as JsonValue, nextSnap as JsonValue)) return;

  //   emit(prev);
  // }

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

  function getColorState(): DemoColorState {
    return stateGet<DemoColorState>(["theme", "colors"]);
  }

  function getColorTokens(): Record<DemoColorPath, DemoColorToken> {
    return stateGet<Record<DemoColorPath, DemoColorToken>>(["theme", "colors", "tokens"]);
  }

  function getColTkn(path: DemoColorPath): DemoColorToken | undefined {
    return getColorTokens()[path];
  }

  function getColorActivePath(): DemoColorPath | null {
    return stateGet<DemoColorPath | null>(["theme", "colors", "activePath"]);
  }

  function getColorActiveToken(): DemoColorToken | undefined {
    const path = getColorActivePath();
    return path === null ? undefined : getColTkn(path);
  }

  function update(mut: (draft: DemoState) => void): void {
    const prev = snapshot();
    const draft = cloneJson(prev);

    mut(draft);

    if (json_equal(prev as JsonValue, draft as JsonValue)) return;

    demoState.replace(draft);
    emit(prev);
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

  function setColorActivePath(path: DemoColorPath | null): void {
    if (path !== null && !getColTkn(path)) {
      throw new Error(`unknown color token path: ${path}`);
    }

    stateSet(["theme", "colors", "activePath"], path);
  }

  function setColorValue(path: DemoColorPath, value: string): void {
    const token = getColTkn(path);
    if (!token) throw new Error(`unknown color token path: ${path}`);

    stateSet(["theme", "colors", "tokens", path, "value"], value);
  }

  function resetColVal(path: DemoColorPath): void {
    const token = getColTkn(path);
    if (!token) throw new Error(`unknown color token path: ${path}`);

    stateSet(["theme", "colors", "tokens", path, "value"], token.initial);
  }

  function resetColorValues(): void {
    for (const token of Object.values(getColorTokens())) {
      stateSet(["theme", "colors", "tokens", token.path, "value"], token.initial);
    }
  }

  // function set_about_toc_open(next: boolean): void {
  //   state_set(["ui", "aboutTocOpen"], next);
  // }

  // -------------------------
  // subscriptions
  // -------------------------

  function subscribe(fn: (state: DemoStateRO) => void): () => void {
    const wrapped: Listener = (next) => fn(next);
    listeners.add(wrapped);
    return () => listeners.delete(wrapped);
  }

  function subscribeDiff(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function subscribeSel<T>(
    sel: (s: DemoStateRO) => T,
    onChange: (next: T, prev: T, state: DemoStateRO) => void,
  ): () => void {
    let prevVal = sel(stateSnapshot());

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

  function stateNode(): HsonNode {
    return demoState.root();
  }

  return {
    stateSnapshot: stateSnapshot,
    getView,
    getWidgets,
    hasWidget,
    getTocOpen,

    getColorState,
    getColorTokens,
    getColTkn,
    getColorActivePath,
    getColorActiveToken,

    update,
    setView,
    toggleView,
    startWidget,
    stopWidget,
    toggleWidget,

    setColorActivePath,
    setColorValue,
    resetColVal,
    resetColorValues,

    // set_about_toc_open,

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

export const get_color_state = demoStore.getColorState;
export const get_color_tokens = demoStore.getColorTokens;
export const get_color_token = demoStore.getColTkn;
export const get_color_active_path = demoStore.getColorActivePath;
export const get_active_color_token = demoStore.getColorActiveToken;

export const demo_update = demoStore.update;
export const set_view = demoStore.setView;
export const toggle_view = demoStore.toggleView;
export const activate_widget = demoStore.startWidget;
export const deactivate_widget = demoStore.stopWidget;
export const toggle_widget = demoStore.toggleWidget;

export const set_color_active_path = demoStore.setColorActivePath;
export const set_color_value = demoStore.setColorValue;
export const reset_color_value = demoStore.resetColVal;
export const reset_color_values = demoStore.resetColorValues;

export function is_color_changed(path: DemoColorPath): boolean {
  const token = get_color_token(path);
  return !!token && token.value !== token.initial;
}

export function get_changed_color_tokens(): DemoColorToken[] {
  return Object.values(get_color_tokens()).filter((token) => token.value !== token.initial);
}

export function get_color_diff(): DemoColorDiff {
  const diff: DemoColorDiff = {};

  for (const token of get_changed_color_tokens()) {
    diff[token.path] = token.value;
  }

  return diff;
}

export function apply_color_diff(diff: DemoColorDiff): void {
  const entries: [DemoColorPath, string][] = [];

  for (const [path, value] of Object.entries(diff)) {
    if (value === undefined) continue;
    if (typeof value !== "string") throw new Error(`invalid color diff value for path: ${path}`);
    if (!get_color_token(path)) throw new Error(`unknown color token path: ${path}`);

    entries.push([path, value]);
  }

  if (entries.length === 0) return;

  demo_update((draft) => {
    for (const [path, value] of entries) {
      draft.theme.colors.tokens[path]!.value = value;
    }
  });
}

export function reset_changed_color_values(): void {
  for (const token of get_changed_color_tokens()) {
    reset_color_value(token.path);
  }
}

// export const set_about_toc_open = demoStore.set_about_toc_open;

export const demo_subscribe = demoStore.subscribe;
export const demo_subscribe_diff = demoStore.subDiff;
export const demo_subscribe_sel = demoStore.subSel;

export const demo_state_node = demoStore.stateNode;