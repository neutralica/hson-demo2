import type { JsonValue } from "hson-live/types";
import { path_to_parts } from "../path-to-parts";
import { state_smoke_test } from "./state-smoke-runner";
import { parse_root_from_json, unwrap_value_payload } from "../state-helpers";
import { find_node_at_path } from "../find-node-path";
import { jsonify, make_state } from "../state";
import { set_node_at_path } from "../set-node-path";
import { remove_node_at_path } from "../remove-node-path";
import { hson } from "hson-live";
import { create_demo_store, DEMO_STATE_SCHEMA } from "../store";
import { define_schema, with_schema, make_schema, SCM, SCHEMA_CONTEXT } from "../schema";
import { type InferSchema } from "../schema.types";


export function smoke_path(): StateSmokeResult {
  return state_smoke_test("state path parsing", (t) => {
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

export function smoke_find(): StateSmokeResult {
  return state_smoke_test("state path lookup", (t) => {
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

export function smoke_intentional_fail(): StateSmokeResult {
  return state_smoke_test("state intentional fail", (t) => {
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

export function smoke_set(): StateSmokeResult {
  return state_smoke_test("state set_node_at_path", (t) => {
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
        jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "activeWidgets", 0])!)),
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
        jsonify(unwrap_value_payload(find_node_at_path(root, ["ui", "newFlag"])!)),
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

export function smoke_remove(): StateSmokeResult {
  return state_smoke_test("state remove_node_at_path", (t) => {
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

export function smoke_state_replace(): StateSmokeResult {
  return state_smoke_test("state replace()", (t) => {
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
}

export function smoke_public_path(): StateSmokeResult {
  return state_smoke_test("state public path api", (t) => {
    t.step("slot get/set/remove with string paths", () => {
      const state = make_state({
        ui: {
          currentView: null,
          activeWidgets: ["point", "parse"],
          aboutTocOpen: false,
        },
        items: [
          { label: "one" },
        ],
      });

      t.eq(
        "slot reads nested primitive",
        state.at("ui.currentView").get() as JsonValue,
        null,
      );

      const setCommit = state.at("ui.currentView").set("about");

      t.ok("slot set changed", setCommit.changed);
      t.eq(
        "slot set records normalized path",
        setCommit.changes[0]?.path as unknown as JsonValue,
        ["ui", "currentView"] as unknown as JsonValue,
      );
      t.eq("slot set records prev", setCommit.changes[0]?.prev as JsonValue, null);
      t.eq("slot set records next", setCommit.changes[0]?.next as JsonValue, "about");
      t.eq("slot set applied", state.at("ui.currentView").get() as JsonValue, "about");

      state.at("ui.activeWidgets[1]").set("build");

      t.eq(
        "slot set updates array item",
        state.at("ui.activeWidgets").get() as JsonValue,
        ["point", "build"] as unknown as JsonValue,
      );

      const removeCommit = state.at("items[0].label").remove();

      t.ok("slot remove changed", removeCommit.changed);
      t.eq(
        "slot remove records normalized path",
        removeCommit.changes[0]?.path as unknown as JsonValue,
        ["items", 0, "label"] as unknown as JsonValue,
      );
      t.eq("slot remove records prev", removeCommit.changes[0]?.prev as JsonValue, "one");
      t.eq("slot remove records next undefined", removeCommit.changes[0]?.next as JsonValue, undefined as unknown as JsonValue);
      t.eq("slot remove applied", state.at("items[0]").get() as JsonValue, {} as JsonValue);
    });

    t.step("commit reports path-level changes", () => {
      const state = make_state({
        ui: {
          currentView: null,
          aboutTocOpen: false,
        },
      });

      const commit = state.commit([
        { kind: "set", path: "ui.currentView", value: "about" },
        { kind: "set", path: ["ui", "aboutTocOpen"], value: true },
      ]);

      t.ok("batch commit changed", commit.changed);
      t.eq("batch commit change count", commit.changes.length as unknown as JsonValue, 2 as unknown as JsonValue);
      t.eq("batch commit first path", commit.changes[0]?.path as unknown as JsonValue, ["ui", "currentView"] as unknown as JsonValue);
      t.eq("batch commit second path", commit.changes[1]?.path as unknown as JsonValue, ["ui", "aboutTocOpen"] as unknown as JsonValue);
      t.eq("batch commit applied view", state.at("ui.currentView").get() as JsonValue, "about");
      t.eq("batch commit applied toc", state.at("ui.aboutTocOpen").get() as JsonValue, true);

      const noopCommit = state.commit([
        { kind: "set", path: "ui.currentView", value: "about" },
      ]);

      t.ok("unchanged set returns unchanged commit", !noopCommit.changed);
      t.eq("unchanged set has no changes", noopCommit.changes.length as unknown as JsonValue, 0 as unknown as JsonValue);
    });

    t.step("change listeners receive path commits only on change", () => {
      const state = make_state({
        ui: {
          currentView: null,
          aboutTocOpen: false,
        },
      });

      const commits: JsonValue[] = [];

      state.subscribe_change((commit) => {
        commits.push({
          changed: commit.changed,
          paths: commit.changes.map((change) => change.path),
        } as unknown as JsonValue);
      });

      state.at("ui.currentView").set(null);
      t.eq("no-op set does not emit", commits.length as unknown as JsonValue, 0 as unknown as JsonValue);

      state.at("ui.currentView").set("about");
      t.eq("changed set emits once", commits.length as unknown as JsonValue, 1 as unknown as JsonValue);
      t.eq(
        "change listener receives normalized path",
        commits[0]!,
        { changed: true, paths: [["ui", "currentView"]] } as unknown as JsonValue,
      );

      state.at("ui.aboutTocOpen").remove();
      t.eq("remove emits second commit", commits.length as unknown as JsonValue, 2 as unknown as JsonValue);
      t.eq(
        "remove listener receives normalized path",
        commits[1]!,
        { changed: true, paths: [["ui", "aboutTocOpen"]] } as unknown as JsonValue,
      );
    });
  });
}

export function smoke_store_facade(): StateSmokeResult {
  return state_smoke_test("demo store facade sequence", (t) => {
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
type StateSmokeResult = {
  ok: boolean;
  steps: string[];
};
// tiny explicit smoke test for path/get/set/remove


export function smoke_state(): StateSmokeResult {
  return state_smoke_test("state path/get/set/remove", (t) => {
    const root = parse_root_from_json({
      ui: {
        currentView: null,
        activeWidgets: ["point", "parse"],
        aboutTocOpen: false,
      },
    });

    const state = make_state(root);

    let emitCount = 0;
    state.subscribe_change(() => {
      emitCount += 1;
    });

    const viewSlot = state.at("ui.currentView");
    const widgetsSlot = state.at("ui.activeWidgets");
    const widget0Slot = state.at("ui.activeWidgets[0]");
    const tocSlot = state.at("ui.aboutTocOpen");

    t.eq("initial currentView", viewSlot.get() as JsonValue, null);
    t.eq("initial activeWidgets", widgetsSlot.get() as JsonValue, ["point", "parse"]);
    t.eq("initial widget[0]", widget0Slot.get() as JsonValue, "point");
    t.eq("initial aboutTocOpen", tocSlot.get() as JsonValue, false);

    t.step("set currentView", () => {
      viewSlot.set("about");
      t.eq("currentView updated", viewSlot.get() as JsonValue, "about");
    });

    t.step("set widget[0]", () => {
      widget0Slot.set("build");
      t.eq("widget[0] updated", widget0Slot.get() as JsonValue, "build");
      t.eq("array reflects updated item", widgetsSlot.get() as JsonValue, ["build", "parse"]);
    });

    t.step("remove widget[0]", () => {
      widget0Slot.remove();
      t.eq("array after remove", widgetsSlot.get() as JsonValue, ["parse"]);
    });

    t.step("remove aboutTocOpen property", () => {
      tocSlot.remove();
      t.eq(
        "root after property remove",
        hson.fromNode(root).toJson().parse() as JsonValue,
        {
          ui: {
            currentView: "about",
            activeWidgets: ["parse"],
          },
        }
      );
    });

    t.ok(
      "listener emissions",
      emitCount >= 3,
      `expected at least 3 emissions, got ${String(emitCount)}`
    );
  });
}

export function smoke_schema(): StateSmokeResult {
  return state_smoke_test("schema validation", (t) => {
    const UserSchema = define_schema((scm) => ({
      name: scm.string,
      age: scm.number.optional,
      role: scm.pick("admin", "user"),
      tags: scm.string.array,
    }));

    type User = InferSchema<typeof UserSchema>;

    const inferredUser: User = {
      name: "x",
      role: "admin",
      tags: ["a", "b"],
    };

    void inferredUser;

    const expectThrow = (label: string, fn: () => void): void => {
      let threw = false;

      try {
        fn();
      } catch {
        threw = true;
      }

      t.ok(label, threw, "expected schema validation to throw");
    };

    t.step("direct value validation", () => {
      t.ok("name string passes", UserSchema.validateValue(["name"], "x").ok);
      t.ok("name number fails", !UserSchema.validateValue(["name"], 1).ok);
      t.ok("role admin passes", UserSchema.validateValue(["role"], "admin").ok);
      t.ok("role bogus fails", !UserSchema.validateValue(["role"], "bogus").ok);
      t.ok("tags string array passes", UserSchema.validateValue(["tags"], ["a", "b"]).ok);
      t.ok("tags mixed array fails", !UserSchema.validateValue(["tags"], ["a", 1]).ok);
    });

    t.step("optional remove validation", () => {
      t.ok("age can be removed", UserSchema.validateMutation({ kind: "remove", path: ["age"] }).ok);
    });

    t.step("with_schema slot validation", () => {
      const state = with_schema(
        make_state({ name: "x", age: 1, role: "user", tags: ["a"] }),
        UserSchema
      );

      state.at("name").set("y");
      t.eq("valid slot write applied", state.at("name").get() as JsonValue, "y");

      expectThrow("invalid slot write throws", () => {
        state.at("name").set(1);
      });

      t.eq("invalid slot write did not apply", state.at("name").get() as JsonValue, "y");
    });

    t.step("with_schema commit validates before applying", () => {
      const state = with_schema(
        make_state({ name: "x", age: 1, role: "user", tags: ["a"] }),
        UserSchema
      );

      expectThrow("invalid commit throws", () => {
        state.commit([
          { kind: "set", path: ["name"], value: "z" },
          { kind: "set", path: ["role"], value: "bogus" },
        ]);
      });

      t.eq("invalid commit did not apply name", state.at("name").get() as JsonValue, "x");
      t.eq("invalid commit did not apply role", state.at("role").get() as JsonValue, "user");

      state.commit([
        { kind: "set", path: ["name"], value: "z" },
        { kind: "set", path: ["role"], value: "admin" },
      ]);

      t.eq("valid commit applied name", state.at("name").get() as JsonValue, "z");
      t.eq("valid commit applied role", state.at("role").get() as JsonValue, "admin");
    });
  });
}

export function smoke_schema_path(): StateSmokeResult {
  return state_smoke_test("schema path validation", (t) => {
    const schema = make_schema();

    schema.set(["profile", "name"], { type: "string" });
    schema.set(["settings", "*"], { type: "boolean" });
    schema.set(["tags"], { type: "array", items: { type: "string" } });

    const expectThrow = (label: string, fn: () => void): void => {
      let threw = false;

      try {
        fn();
      } catch {
        threw = true;
      }

      t.ok(label, threw, "expected schema path validation to throw");
    };

    t.step("direct path matching", () => {
      t.ok("exact path string passes", schema.validateValue("profile.name", "Ada").ok);
      t.ok("exact path wrong type fails", !schema.validateValue("profile.name", 1).ok);
      t.ok("wildcard path passes", schema.validateValue("settings.darkMode", true).ok);
      t.ok("wildcard path wrong type fails", !schema.validateValue("settings.darkMode", "yes").ok);
      t.ok("array item rule passes", schema.validateValue("tags", ["alpha", "beta"]).ok);
      t.ok("array item rule fails", !schema.validateValue("tags", ["alpha", 1]).ok);
    });

    t.step("with_schema path string writes", () => {
      const state = with_schema(
        make_state({
          profile: { name: "Ada" },
          settings: { darkMode: false },
          tags: ["alpha"],
        }),
        schema
      );

      state.at("profile.name").set("Grace");
      t.eq("exact path write applied", state.at("profile.name").get() as JsonValue, "Grace");

      state.at("settings.darkMode").set(true);
      t.eq("wildcard path write applied", state.at("settings.darkMode").get() as JsonValue, true);

      expectThrow("exact path invalid write throws", () => {
        state.at("profile.name").set(1);
      });

      expectThrow("wildcard path invalid write throws", () => {
        state.at("settings.darkMode").set("yes");
      });

      t.eq("invalid exact path write did not apply", state.at("profile.name").get() as JsonValue, "Grace");
      t.eq("invalid wildcard path write did not apply", state.at("settings.darkMode").get() as JsonValue, true);
    });

    t.step("commit validates paths before applying", () => {
      const state = with_schema(
        make_state({
          profile: { name: "Ada" },
          settings: { darkMode: false },
          tags: ["alpha"],
        }),
        schema
      );

      expectThrow("invalid path commit throws", () => {
        state.commit([
          { kind: "set", path: "profile.name", value: "Grace" },
          { kind: "set", path: "settings.darkMode", value: "yes" },
        ]);
      });

      t.eq("invalid path commit did not apply exact change", state.at("profile.name").get() as JsonValue, "Ada");
      t.eq("invalid path commit did not apply wildcard change", state.at("settings.darkMode").get() as JsonValue, false);

      state.commit([
        { kind: "set", path: "profile.name", value: "Grace" },
        { kind: "set", path: "settings.darkMode", value: true },
      ]);

      t.eq("valid path commit applied exact change", state.at("profile.name").get() as JsonValue, "Grace");
      t.eq("valid path commit applied wildcard change", state.at("settings.darkMode").get() as JsonValue, true);
    });
  });
}


export function smoke_public_path_edges(): StateSmokeResult {
  return state_smoke_test("state public path edges", (t) => {
    t.step("public array append and remove", () => {
      const state = make_state({
        ui: {
          activeWidgets: ["point", "parse"],
        },
      });

      const appendCommit = state.at("ui.activeWidgets[2]").set("about");

      t.ok("array append changed", appendCommit.changed);
      t.eq(
        "array append records normalized path",
        appendCommit.changes[0]?.path as unknown as JsonValue,
        ["ui", "activeWidgets", 2] as unknown as JsonValue,
      );
      t.eq(
        "array append applied",
        state.at("ui.activeWidgets").get() as JsonValue,
        ["point", "parse", "about"] as unknown as JsonValue,
      );

      const removeCommit = state.at("ui.activeWidgets[0]").remove();

      t.ok("array remove changed", removeCommit.changed);
      t.eq(
        "array remove records normalized path",
        removeCommit.changes[0]?.path as unknown as JsonValue,
        ["ui", "activeWidgets", 0] as unknown as JsonValue,
      );
      t.eq(
        "array remove reindexes serialized array",
        state.at("ui.activeWidgets").get() as JsonValue,
        ["parse", "about"] as unknown as JsonValue,
      );
    });

    t.step("missing remove is unchanged and does not emit", () => {
      const state = make_state({
        ui: {
          currentView: null,
        },
      });

      let emits = 0;

      state.subscribe_change(() => {
        emits += 1;
      });

      const commit = state.at("ui.missing").remove();

      t.ok("missing remove unchanged", !commit.changed);
      t.eq("missing remove has no changes", commit.changes.length as unknown as JsonValue, 0 as unknown as JsonValue);
      t.eq("missing remove does not emit", emits as unknown as JsonValue, 0 as unknown as JsonValue);
    });

    t.step("selector subscription only emits selected changes", () => {
      const state = make_state({
        ui: {
          currentView: null,
          aboutTocOpen: false,
        },
      });

      const seen: JsonValue[] = [];

      state.subscribe_sel(
        (root) => state.at("ui.currentView").get() as JsonValue,
        (next, prev) => {
          seen.push({ next, prev } as unknown as JsonValue);
        },
      );

      state.at("ui.aboutTocOpen").set(true);
      t.eq("unrelated path does not emit selector", seen.length as unknown as JsonValue, 0 as unknown as JsonValue);

      state.at("ui.currentView").set(null);
      t.eq("same selected value does not emit selector", seen.length as unknown as JsonValue, 0 as unknown as JsonValue);

      state.at("ui.currentView").set("about");
      t.eq("selected value change emits once", seen.length as unknown as JsonValue, 1 as unknown as JsonValue);
      t.eq(
        "selector records prev and next",
        seen[0]!,
        { next: "about", prev: null } as unknown as JsonValue,
      );
    });
  });
}

export function smoke_schema_context_exports(): StateSmokeResult {
  return state_smoke_test("schema context exports", (t) => {
    t.step("SCM aliases SCHEMA_CONTEXT", () => {
      t.eq(
        "SCM is SCHEMA_CONTEXT",
        SCM as unknown as JsonValue,
        SCHEMA_CONTEXT as unknown as JsonValue,
      );
    });

    t.step("SCM works as schema context", () => {
      const UserSchema = define_schema((scm) => ({
        name: scm.string,
        role: SCM.pick("admin", "user"),
        tags: SCM.string.array,
      }));

      t.ok("SCM string validates", UserSchema.validateValue("name", "Ada").ok);
      t.ok("SCM pick validates allowed literal", UserSchema.validateValue("role", "admin").ok);
      t.ok("SCM pick rejects disallowed literal", !UserSchema.validateValue("role", "bogus").ok);
      t.ok("SCM array validates items", UserSchema.validateValue("tags", ["a", "b"]).ok);
      t.ok("SCM array rejects bad item", !UserSchema.validateValue("tags", ["a", 1]).ok);
    });

    t.step("schema wrapper uses SCM-authored rules", () => {
      const UserSchema = define_schema((scm) => ({
        name: SCM.string,
        role: scm.pick("admin", "user"),
        tags: scm.string.array,
      }));

      const state = with_schema(
        make_state({
          name: "Ada",
          role: "user",
          tags: ["alpha"],
        }),
        UserSchema,
      );

      state.at("name").set("Grace");
      t.eq("valid SCM-authored write applies", state.at("name").get() as JsonValue, "Grace");

      let threw = false;

      try {
        state.at("role").set("bogus");
      } catch {
        threw = true;
      }

      t.ok("invalid SCM-authored write throws", threw);
      t.eq("invalid SCM-authored write did not apply", state.at("role").get() as JsonValue, "user");
    });
  });
}
export function smoke_store_schema_impl(): StateSmokeResult {
  return state_smoke_test("demo store schema", (t) => {
    const store = create_demo_store();
    const token = Object.values(store.getColorTokens())[0];

    if (!token) {
      t.step("color token setup", () => {
        t.ok("has at least one color token", false);
      });
      return;
    }

    const tokenValuePath = ["theme", "colors", "tokens", token.path, "value"] as const;
    const validColor = "oklch(50% 0.1 120)";

    t.step("demo schema validates color token value path", () => {
      t.ok(
        "actual demo schema matches token value path",
        !!DEMO_STATE_SCHEMA.match(tokenValuePath),
      );

      t.ok(
        "actual demo schema rejects number at token value path",
        !DEMO_STATE_SCHEMA.validateValue(tokenValuePath, 1).ok,
      );
    });

    t.step("valid color string applies", () => {
      store.setColorValue(token.path, validColor);
      t.eq(
        "valid color string applies",
        store.getColTkn(token.path)?.value as JsonValue,
        validColor,
      );
    });

    t.step("invalid color path set throws and does not apply", () => {
      let threw = false;

      try {
        store.setColorValue(token.path, 1 as unknown as string);
      } catch {
        threw = true;
      }

      t.ok("invalid color token value throws through schema path set", threw);
      t.eq(
        "invalid path set did not apply",
        store.getColTkn(token.path)?.value as JsonValue,
        validColor,
      );
    });

    t.step("invalid color update throws and does not apply", () => {
      let threw = false;

      try {
        store.update((draft) => {
          draft.theme.colors.tokens[token.path]!.value = 1 as unknown as string;
        });
      } catch {
        threw = true;
      }

      t.ok("invalid color token value throws through schema replace", threw);
      t.eq(
        "invalid color token value did not apply",
        store.getColTkn(token.path)?.value as JsonValue,
        validColor,
      );
    });
  });
}
