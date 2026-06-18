// CHANGED: path parsing smoke test

import type { JsonValue } from "hson-live/types";
import { path_to_parts } from "../path-to-parts";
import { run_state_smoke } from "./state-smoke-runner";
import type { StateSmokeResult } from "../state.types";
import { parse_root_from_json, unwrap_value_payload } from "../state-helpers";
import { find_node_at_path } from "../find-node-path";
import { jsonify, make_state } from "../make-state";
import { set_node_at_path } from "../set-node-path";
import { remove_node_at_path } from "../remove-node-path";
import { hson } from "hson-live";
import { create_demo_store } from "../store";


export function debug_state_path_test(): StateSmokeResult {
    return run_state_smoke("state path parsing", (t) => {
        t.eq(
            "dot path",
            path_to_parts("ui.currentView") as unknown as JsonValue,
            ["ui", "currentView"] as unknown as JsonValue,
        );

        t.eq(
            "bracket index path",
            path_to_parts("ui.activeWidgets[0]") as unknown as JsonValue,
            ["ui", "activeWidgets", 0] as unknown as JsonValue,
        );

        t.eq(
            "dot numeric path",
            path_to_parts("ui.activeWidgets.0") as unknown as JsonValue,
            ["ui", "activeWidgets", 0] as unknown as JsonValue,
        );

        t.eq(
            "mixed path",
            path_to_parts("items[2].label") as unknown as JsonValue,
            ["items", 2, "label"] as unknown as JsonValue,
        );

        t.step("malformed path: missing closing bracket", () => {
            let threw = false;

            try {
                path_to_parts("ui.activeWidgets[0");
            } catch {
                threw = true;
            }

            t.ok("throws on missing closing bracket", threw);
        });

        t.step("malformed path: non-numeric bracket index", () => {
            let threw = false;

            try {
                path_to_parts("ui.activeWidgets[foo]");
            } catch {
                threw = true;
            }

            t.ok("throws on non-numeric bracket index", threw);
        });
    });
}

// CHANGED: node lookup smoke test
export function debug_state_find_test(): StateSmokeResult {
    return run_state_smoke("state path lookup", (t) => {
        const root = parse_root_from_json({
            ui: {
                currentView: null,
                activeWidgets: ["point", "parse"],
                aboutTocOpen: false,
            },
            items: [
                { label: "one" },
                { label: "two" },
            ],
        });

        const viewNode = find_node_at_path(root, ["ui", "currentView"]);
        const widgetsNode = find_node_at_path(root, ["ui", "activeWidgets"]);
        const widget0Node = find_node_at_path(root, ["ui", "activeWidgets", 0]);
        const item1LabelNode = find_node_at_path(root, ["items", 1, "label"]);

        t.ok("find currentView node", viewNode !== undefined);
        t.ok("find activeWidgets node", widgetsNode !== undefined);
        t.ok("find activeWidgets[0] node", widget0Node !== undefined);
        t.ok("find items[1].label node", item1LabelNode !== undefined);

        t.eq(
            "currentView semantic value",
            jsonify(unwrap_value_payload(viewNode!)),
            null,
        );

        t.eq(
            "activeWidgets semantic value",
            jsonify(unwrap_value_payload(widgetsNode!)),
            ["point", "parse"],
        );

        t.eq(
            "activeWidgets[0] semantic value",
            jsonify(unwrap_value_payload(widget0Node!)),
            "point",
        );

        t.eq(
            "items[1].label semantic value",
            jsonify(unwrap_value_payload(item1LabelNode!)),
            "two",
        );

        t.ok(
            "missing property returns undefined",
            find_node_at_path(root, ["ui", "doesNotExist"]) === undefined,
        );

        t.ok(
            "out of range array index returns undefined",
            find_node_at_path(root, ["ui", "activeWidgets", 99]) === undefined,
        );

        t.ok(
            "wrong-type descent returns undefined",
            find_node_at_path(root, ["ui", "currentView", "nope"]) === undefined,
        );
    });
}

export function debug_state_intentional_fail_test(): StateSmokeResult {
    return run_state_smoke("state intentional fail", (t) => {
        const root = parse_root_from_json({
            ui: {
                currentView: null,
                activeWidgets: ["point", "parse"],
            },
        });

        const widget0Node = find_node_at_path(root, ["ui", "activeWidgets", 0]);

        t.eq(
            "INTENTIONAL FAIL: widget[0] should not be parse",
            jsonify(unwrap_value_payload(widget0Node!)),
            "parse",
        );
    });
}

// CHANGED: direct set-node smoke test
export function debug_state_set_test(): StateSmokeResult {
    return run_state_smoke("state set_node_at_path", (t) => {
        const root = parse_root_from_json({
            ui: {
                currentView: null,
                activeWidgets: ["point", "parse"],
                aboutTocOpen: false,
            },
        });

        t.step("set primitive property", () => {
            set_node_at_path(root, ["ui", "currentView"], "about");

            t.eq(
                "currentView set",
                jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "currentView"])!)),
                "about",
            );
        });

        t.step("set array item", () => {
            set_node_at_path(root, ["ui", "activeWidgets", 0], "build");

            t.eq(
                "activeWidgets[0] set",
                jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "activeWidgets"])!)),
                "build",
            );

            t.eq(
                "array reflects item set",
                jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "activeWidgets"])!)),
                ["build", "parse"],
            );
        });

        t.step("append array item at length", () => {
            set_node_at_path(root, ["ui", "activeWidgets", 2], "about");

            t.eq(
                "array append at length",
                jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "activeWidgets"])!)),
                ["build", "parse", "about"],
            );
        });

        t.step("create missing object property", () => {
            set_node_at_path(root, ["ui", "newFlag"], true);

            t.eq(
                "newFlag created",
                jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "activeWidgets"])!)),
                true,
            );
        });

        t.step("reject sparse array write", () => {
            let threw = false;

            try {
                set_node_at_path(root, ["ui", "activeWidgets", 9], "nope");
            } catch {
                threw = true;
            }

            t.ok("sparse array write throws", threw);
        });

        t.step("reject wrong-type descent", () => {
            let threw = false;

            try {
                set_node_at_path(root, ["ui", "currentView", "nope"], "bad");
            } catch {
                threw = true;
            }

            t.ok("wrong-type set throws", threw);
        });
    });
}

// CHANGED: direct remove-node smoke test
export function debug_state_remove_test(): StateSmokeResult {
    return run_state_smoke("state remove_node_at_path", (t) => {
        const root = parse_root_from_json({
            ui: {
                currentView: "about",
                activeWidgets: ["point", "parse"],
                aboutTocOpen: false,
            },
        });

        t.step("remove object property", () => {
            remove_node_at_path(root, ["ui", "aboutTocOpen"]);

            t.eq(
                "aboutTocOpen removed",
                jsonify(root),
                {
                    ui: {
                        currentView: "about",
                        activeWidgets: ["point", "parse"],
                    },
                },
            );
        });

        t.step("remove array item", () => {
            remove_node_at_path(root, ["ui", "activeWidgets", 0]);

            t.eq(
                "activeWidgets[0] removed",
                jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "activeWidgets"])!)),
                ["parse"],
            );
        });

        t.step("remove missing property is harmless", () => {
            remove_node_at_path(root, ["ui", "doesNotExist"]);

            t.eq(
                "root unchanged after missing property remove",
                hson.fromNode(root).toJson().parse() as JsonValue,
                {
                    ui: {
                        currentView: "about",
                        activeWidgets: ["parse"],
                    },
                },
            );
        });

        t.step("remove out-of-range array index is harmless", () => {
            remove_node_at_path(root, ["ui", "activeWidgets", 99]);

            t.eq(
                "array unchanged after bad index remove",
                jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "activeWidgets"])!)),
                ["parse"],
            );
        });
    });
}

// CHANGED: root replace smoke test
export function debug_state_replace_test(): StateSmokeResult {
    return run_state_smoke("state replace()", (t) => {
        const state = make_state({
            ui: {
                currentView: null,
                activeWidgets: [],
                aboutTocOpen: false,
            },
        });

        let emitCount = 0;
        state.subscribe(() => {
            emitCount += 1;
        });

        t.step("replace whole root object", () => {
            state.replace({
                ui: {
                    currentView: "about",
                    activeWidgets: ["point"],
                    aboutTocOpen: true,
                },
            });

            t.eq(
                "root object replaced",
                state.get(),
                {
                    ui: {
                        currentView: "about",
                        activeWidgets: ["point"],
                        aboutTocOpen: true,
                    },
                },
            );
        });

        t.step("replace with primitive root throws", () => {
            let threw = false;

            try {
                state.replace("hello");
            } catch {
                threw = true;
            }

            t.ok("primitive root replace throws", threw);
        });

        t.step("replace primitive with object", () => {
            state.replace({
                ui: {
                    currentView: "test",
                    activeWidgets: ["parse"],
                    aboutTocOpen: false,
                },
            });

            t.eq(
                "primitive replaced by object",
                state.get(),
                {
                    ui: {
                        currentView: "test",
                        activeWidgets: ["parse"],
                        aboutTocOpen: false,
                    },
                },
            );
        });

        t.ok(
            "replace emitted listeners",
            emitCount === 2,
            `expected exactly 2 emissions, got ${String(emitCount)}`,
        );
    });
}// CHANGED: facade/store sequence smoke test
export function debug_store_facade_test(): StateSmokeResult {
    return run_state_smoke("demo store facade sequence", (t) => {
        const store = create_demo_store();

        store.setView("test");
        store.startWidget("point");
        store.startWidget("point"); // no-op
        store.stopWidget("point");
        store.toggleView("test"); // back to null

        const finalState = store.stateSnapshot();

        t.eq(
            "final facade ui state",
            finalState.ui as unknown as JsonValue,
            {
                currentView: null,
                activeWidgets: [],
                aboutTocOpen: false,
            } as unknown as JsonValue,
        );

        t.ok(
            "facade state seeds color tokens",
            Object.keys(finalState.theme.colors.tokens).length > 0,
        );

        t.eq(
            "facade color active path starts null",
            finalState.theme.colors.activePath as unknown as JsonValue,
            null,
        );
    });
}