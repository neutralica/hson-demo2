import { hson } from "hson-live";
import type { JsonValue, HsonNode } from "hson-live/types";
import { make_state_slot } from "./make-state";
import  { assert_json_eq } from "./state-helpers";
import { run_state_smoke } from "./smoke-tests/state-smoke-runner";

type StateSmokeResult = {
  ok: boolean;
  steps: string[];
};


function parse_root_from_json(input: JsonValue): HsonNode {
  const parsed = hson.fromJson(input).toHson().parse();
  const root = Array.isArray(parsed) ? parsed[0] : parsed;

  if (!root) {
    throw new Error("[state smoke] no root node returned from parse");
  }

  return root;
}

// tiny explicit smoke test for path/get/set/remove
export function debug_state_smoke_test(): StateSmokeResult {
  return run_state_smoke("state path/get/set/remove", (t) => {
    const root = parse_root_from_json({
      ui: {
        currentView: null,
        activeWidgets: ["mouse", "parse"],
        aboutTocOpen: false,
      },
    });

    const listeners = new Set<(next: HsonNode, prev: HsonNode) => void>();

    let emitCount = 0;
    listeners.add(() => {
      emitCount += 1;
    });

    const viewSlot = make_state_slot(root, "ui.currentView", listeners);
    const widgetsSlot = make_state_slot(root, "ui.activeWidgets", listeners);
    const widget0Slot = make_state_slot(root, "ui.activeWidgets[0]", listeners);
    const tocSlot = make_state_slot(root, "ui.aboutTocOpen", listeners);

    t.eq("initial currentView", viewSlot.get() as JsonValue, null);
    t.eq("initial activeWidgets", widgetsSlot.get() as JsonValue, ["mouse", "parse"]);
    t.eq("initial widget[0]", widget0Slot.get() as JsonValue, "mouse");
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