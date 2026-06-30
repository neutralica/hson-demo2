import type { TestSuite } from "../../app/demos/test/tests.types";
import { make_snap_case, make_set_case } from "./test-helpers";


export function livemap_suite_editor(): TestSuite {
  const SUITE = "livemap-editor";

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
      make_set_case({
        suite: SUITE,
        name: "set existing array item",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0],
        value: { name: "Margaret" },
        expectedChanged: true,
        expectedPrev: { name: "Ada" },
        expectedNext: { name: "Margaret" },
        expectedRoot: { users: [{ name: "Margaret" }, { name: "Grace" }] },
      }),
      make_set_case({
        suite: SUITE,
        name: "set existing array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 1, "name"],
        value: "Margaret",
        expectedChanged: true,
        expectedPrev: "Grace",
        expectedNext: "Margaret",
        expectedRoot: { users: [{ name: "Ada" }, { name: "Margaret" }] },
      }),
      make_set_case({
        suite: SUITE,
        name: "set existing array item unchanged",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0],
        value: { name: "Ada" },
        expectedChanged: false,
        expectedPrev: { name: "Ada" },
        expectedNext: { name: "Ada" },
        expectedRoot: { users: [{ name: "Ada" }, { name: "Grace" }] },
      }),
    ] as const,
  };
}
