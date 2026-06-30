import type { TestSuite } from "../../app/demos/test/tests.types";
import { make_snap_case, make_set_case } from "./test-helpers";


export function livemap_suite_editor_snap(): TestSuite {
  const SUITE = "livemap-editor:snap";

  return {
    suite: SUITE,
    cases: [
      make_snap_case({
        suite: SUITE,
        name: "snap root object",
        input: { user: { name: "Ada" } },
        path: [],
        expected: { user: { name: "Ada" } },
      }),
      make_snap_case({
        suite: SUITE,
        name: "snap nested object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expected: "Ada",
      }),
      make_snap_case({
        suite: SUITE,
        name: "snap missing property",
        input: { user: { name: "Ada" } },
        path: ["user", "missing"],
        expected: undefined,
      }),
      make_snap_case({
        suite: SUITE,
        name: "snap first array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0, "name"],
        expected: "Ada",
      }),
      make_snap_case({
        suite: SUITE,
        name: "snap second array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 1, "name"],
        expected: "Grace",
      }),
    ] as const,
  };
}
export function livemap_suite_editor_set(): TestSuite {
  const SUITE = "livemap-editor:set";

  return {
    suite: SUITE,
    cases: [
      make_set_case({
        suite: SUITE,
        name: "set existing object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedChanged: true,
        expectedPrev: "Ada",
        expectedNext: "Grace",
        expectedRoot: { user: { name: "Grace" } },
      }),
      make_set_case({
        suite: SUITE,
        name: "set missing object property",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        value: "admin",
        expectedChanged: true,
        expectedPrev: undefined,
        expectedNext: "admin",
        expectedRoot: { user: { name: "Ada", role: "admin" } },
      }),
      make_set_case({
        suite: SUITE,
        name: "set existing object property unchanged",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Ada",
        expectedChanged: false,
        expectedPrev: "Ada",
        expectedNext: "Ada",
        expectedRoot: { user: { name: "Ada" } },
      }),
    ] as const,
  };
}
