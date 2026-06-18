// import type { HsonNode, JsonValue } from "hson-live/types";
// import type { DemoColorPath, DemoColorToken, DemoStateRO, DemoView, DemoWidget, DemoState } from "./state.types";
// import { clone_node } from "./clone-node";
// import { make_state, jsonify } from "./make-state";
// import { json_equal } from "./state-helpers";
// import { COLOR_VAR_SOURCES, type ColorVarSource } from "../core/consts/colors.consts";

// function is_oklch_value(value: string): boolean {
//   return value.trim().startsWith("oklch(");
// }

// function label_for_color_path(path: string): string {
//   return path.replace(/\./g, "-");
// }

// function make_demo_color_token(source: ColorVarSource): DemoColorToken {
//   const isOklch = is_oklch_value(source.value);

//   return {
//     path: source.path,
//     label: label_for_color_path(source.path),
//     varName: source.varName,
//     initial: source.value,
//     value: source.value,
//     editable: isOklch,
//     kind: isOklch ? "oklch" : "css",
//   };
// }

// function make_demo_color_tokens(): Record<DemoColorPath, DemoColorToken> {
//   const tokens: Record<DemoColorPath, DemoColorToken> = {};

//   for (const source of COLOR_VAR_SOURCES) {
//     tokens[source.path] = make_demo_color_token(source);
//   }

//   return tokens;
// }

// export function make_initial_demo_state(): DemoState {
//   return {
//     ui: {
//       currentView: null,
//       activeWidgets: [],
//       aboutTocOpen: false,
//     },
//     theme: {
//       colors: {
//         activePath: null,
//         tokens: make_demo_color_tokens(),
//       },
//     },
//   };
// }

// export type DemoStore = {
//   get_state(): DemoStateRO;
//   get_view(): DemoView;
//   get_widgets(): DemoWidget[];
//   has_widget(widget: DemoWidget): boolean;
//   get_about_toc_open(): boolean;

//   update(mut: (draft: DemoState) => void): void;
//   set_view(next: DemoView): void;
//   toggle_view(next: Exclude<DemoView, null>): void;

//   activate_widget(next: DemoWidget): void;
//   deactivate_widget(next: DemoWidget): void;
//   toggle_widget(widget: DemoWidget): void;

//   set_about_toc_open(next: boolean): void;

//   subscribe(fn: (state: DemoStateRO) => void): () => void;
//   subscribe_diff(fn: (next: DemoStateRO, prev: DemoStateRO) => void): () => void;
//   subscribe_sel<T>(
//     sel: (s: DemoStateRO) => T,
//     onChange: (next: T, prev: T, state: DemoStateRO) => void,
//   ): () => void;

//   state_node(): HsonNode;
// };

// function create_demo_store(
//   initial: DemoState = make_initial_demo_state(),
// ): DemoStore {
//   const state = make_state(initial);
//   const listeners = new Set<(next: DemoStateRO, prev: DemoStateRO) => void>();

//   const emit = (prev: DemoStateRO): void => {
//     const next = get_state();
//     for (const fn of listeners) fn(next, prev);
//   };

//   const snapshot = (): DemoStateRO => {
//     return jsonify(state.root()) as DemoStateRO;
//   };

//   const get_state = (): DemoStateRO => {
//     return snapshot();
//   };

//   const get_view = (): DemoView => {
//     return state.at(["ui", "currentView"]).get() as DemoView;
//   };

//   const get_widgets = (): DemoWidget[] => {
//     return state.at(["ui", "activeWidgets"]).get() as DemoWidget[];
//   };

//   const has_widget = (widget: DemoWidget): boolean => {
//     return get_widgets().includes(widget);
//   };

//   const get_about_toc_open = (): boolean => {
//     return state.at(["ui", "aboutTocOpen"]).get() as boolean;
//   };

//   const update = (mut: (draft: DemoState) => void): void => {
//     const prev = snapshot();
//     const draft = clone_node(prev) as DemoState;

//     mut(draft);

//     if (json_equal(prev as JsonValue, draft as JsonValue)) return;

//     state.replace(draft);
//     emit(prev);
//   };

//   const set_view = (next: DemoView): void => {
//     update((s) => {
//       s.ui.currentView = next;
//     });
//   };

//   const toggle_view = (next: Exclude<DemoView, null>): void => {
//     const current = get_view();
//     set_view(current === next ? null : next);
//   };

//   const activate_widget = (next: DemoWidget): void => {
//     update((s) => {
//       if (!s.ui.activeWidgets.includes(next)) {
//         s.ui.activeWidgets.push(next);
//       }
//     });
//   };

//   const deactivate_widget = (next: DemoWidget): void => {
//     update((s) => {
//       const ix = s.ui.activeWidgets.indexOf(next);
//       if (ix >= 0) s.ui.activeWidgets.splice(ix, 1);
//     });
//   };

//   const toggle_widget = (widget: DemoWidget): void => {
//     if (has_widget(widget)) deactivate_widget(widget);
//     else activate_widget(widget);
//   };

//   const set_about_toc_open = (next: boolean): void => {
//     update((s) => {
//       s.ui.aboutTocOpen = next;
//     });
//   };

//   const subscribe = (fn: (state: DemoStateRO) => void): (() => void) => {
//     const wrapped = (next: DemoStateRO) => fn(next);
//     listeners.add(wrapped);
//     return () => listeners.delete(wrapped);
//   };

//   const subscribe_diff = (
//     fn: (next: DemoStateRO, prev: DemoStateRO) => void,
//   ): (() => void) => {
//     listeners.add(fn);
//     return () => listeners.delete(fn);
//   };

//   const subscribe_sel = <T>(
//     sel: (s: DemoStateRO) => T,
//     onChange: (next: T, prev: T, state: DemoStateRO) => void,
//   ): (() => void) => {
//     let prevVal = sel(get_state());

//     const wrapped = (next: DemoStateRO): void => {
//       const nextVal = sel(next);
//       if (Object.is(nextVal, prevVal)) return;

//       const old = prevVal;
//       prevVal = nextVal;
//       onChange(nextVal, old, next);
//     };

//     listeners.add(wrapped);
//     return () => listeners.delete(wrapped);
//   };

//   return {
//     get_state,
//     get_view,
//     get_widgets,
//     has_widget,
//     get_about_toc_open,

//     update,
//     set_view,
//     toggle_view,
//     activate_widget,
//     deactivate_widget,
//     toggle_widget,
//     set_about_toc_open,

//     subscribe,
//     subscribe_diff,
//     subscribe_sel,

//     state_node: () => state.root(),
//   };
// }