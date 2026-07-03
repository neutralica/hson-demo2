import type { JsonValue } from "hson-live/types";
import { state_smoke_test } from "./state-smoke-runner";
import { create_demo_store, DEMO_STATE_SCHEMA } from "../store";
import type { StateSmokeResult } from "../state.types";


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
  });
}
