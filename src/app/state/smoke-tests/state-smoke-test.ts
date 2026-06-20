import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import { make_state } from "../state";
import  { assert_json_eq, parse_root_from_json } from "../state-helpers";
import { run_state_smoke } from "./state-smoke-runner";

type StateSmokeResult = {
  ok: boolean;
  steps: string[];
};


// tiny explicit smoke test for path/get/set/remove
export function debug_state_smoke_test(): StateSmokeResult {
  return run_state_smoke("state path/get/set/remove", (t) => {
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
        },
      );
    });

    t.ok(
      "listener emissions",
      emitCount >= 3,
      `expected at least 3 emissions, got ${String(emitCount)}`,
    );
  });
}