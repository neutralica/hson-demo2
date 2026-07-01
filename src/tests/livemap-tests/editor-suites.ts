// import type { JsonValue } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
// import { delete_live_path } from "hson-live";
import { make_snap_case, make_set_case, preview_value, equal_row } from "./test-helpers";
import { json_root_node } from "./all-livemap-suites";
import { delete_live_path } from "../../../../hson-live/dist/api/livemap/livemap-editor";
// import { equal_row, preview_value, json_root_node } from "./test-kit";


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
        expectedOutput: { user: { name: "Ada" } },
      }),
      make_snap_case({
        suite: SUITE,
        name: "snap nested object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expectedOutput: "Ada",
      }),
      make_snap_case({
        suite: SUITE,
        name: "snap missing property",
        input: { user: { name: "Ada" } },
        path: ["user", "missing"],
        expectedOutput: undefined,
      }),
      make_snap_case({
        suite: SUITE,
        name: "snap first array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0, "name"],
        expectedOutput: "Ada",
      }),
      make_snap_case({
        suite: SUITE,
        name: "snap second array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 1, "name"],
        expectedOutput: "Grace",
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
      make_delete_case({
        suite: SUITE,
        name: "delete existing object property",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        expectedChanged: true,
        expectedPrev: "Ada",
        expectedNext: undefined,
        expectedRoot: { user: { role: "user" } },
      }),
      make_delete_case({
        suite: SUITE,
        name: "delete missing object property unchanged",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        expectedChanged: false,
        expectedPrev: undefined,
        expectedNext: undefined,
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_delete_throw_case({
        suite: SUITE,
        name: "delete root throws",
        input: { user: { name: "Ada" } },
        path: [],
        expectedMessage: "LiveMap editor cannot delete the root node yet.",
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_delete_throw_case({
        suite: SUITE,
        name: "delete array index throws",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0],
        expectedMessage: "LiveMap editor cannot delete array indexes yet: [\"users\", 0]",
        expectedRoot: { users: [{ name: "Ada" }, { name: "Grace" }] },
      }),
    ] as const,
  };
}


type DeleteCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedChanged: boolean;
  expectedPrev: JsonValue | undefined;
  expectedNext: JsonValue | undefined;
  expectedRoot: JsonValue;
}>;

type DeleteThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
  expectedRoot: JsonValue;
}>;

function make_delete_case(spec: DeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const result = delete_live_path(root, spec.path);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, result.changed, spec.expectedChanged),
          equal_row(`${spec.name}: prev`, result.prev, spec.expectedPrev),
          equal_row(`${spec.name}: next`, result.next, spec.expectedNext),
          equal_row(`${spec.name}: root`, delete_live_path(root, ["__never__"]).prev, undefined),
        ],
      };
    },
  };
}

function make_delete_throw_case(spec: DeleteThrowCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const root = json_root_node(spec.input);
      let message = "";

      try {
        delete_live_path(root, spec.path);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: error`, message, spec.expectedMessage),
        ],
      };
    },
  };
}