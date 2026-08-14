import { make_livemap_core } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { make_snap_case, make_set_case, preview_value, equal_row } from "./test-helpers";
import { json_root_node } from "./json-root-node";


export function livemap_suite_editor(): TestSuite {
  const SUITE = "livemap/editor";

  return {
    suite: SUITE,
    cases: [
      make_snap_case({
        suite: SUITE,
        caseId: "snap-root-object", name: "snap root object",
        input: { user: { name: "Ada" } },
        path: [],
        expectedOutput: { user: { name: "Ada" } },
      }),
      make_snap_case({
        suite: SUITE,
        caseId: "snap-nested-object-property", name: "snap nested object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expectedOutput: "Ada",
      }),
      make_snap_case({
        suite: SUITE,
        caseId: "snap-missing-property", name: "snap missing property",
        input: { user: { name: "Ada" } },
        path: ["user", "missing"],
        expectedOutput: undefined,
      }),
      make_snap_case({
        suite: SUITE,
        caseId: "snap-first-array-item-property", name: "snap first array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0, "name"],
        expectedOutput: "Ada",
      }),
      make_snap_case({
        suite: SUITE,
        caseId: "snap-second-array-item-property", name: "snap second array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 1, "name"],
        expectedOutput: "Grace",
      }),
      make_set_case({
        suite: SUITE,
        caseId: "set-existing-object-property", name: "set existing object property",
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
        caseId: "set-missing-object-property", name: "set missing object property",
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
        caseId: "set-existing-object-property-unchanged", name: "set existing object property unchanged",
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
        caseId: "set-existing-array-item", name: "set existing array item",
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
        caseId: "set-existing-array-item-property", name: "set existing array item property",
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
        caseId: "set-existing-array-item-unchanged", name: "set existing array item unchanged",
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
        caseId: "delete-existing-object-property", name: "delete existing object property",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        expectedChanged: true,
        expectedPrev: "Ada",
        expectedNext: undefined,
        expectedRoot: { user: { role: "user" } },
      }),
      make_delete_throw_case({
        suite: SUITE,
        caseId: "delete-missing-object-property-throws", name: "delete missing object property throws",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        expectedMessage: "LiveMap delete path does not resolve: [\"user\", \"role\"]",
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_delete_throw_case({
        suite: SUITE,
        caseId: "delete-root-throws", name: "delete root throws",
        input: { user: { name: "Ada" } },
        path: [],
        expectedMessage: "LiveMap editor cannot delete the root node yet.",
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_delete_throw_case({
        suite: SUITE,
        caseId: "delete-array-index-throws", name: "delete array index throws",
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
  caseId: string; name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedChanged: boolean;
  expectedPrev: JsonValue | undefined;
  expectedNext: JsonValue | undefined;
  expectedRoot: JsonValue;
}>;

type DeleteThrowCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
  expectedRoot: JsonValue;
}>;

function make_delete_case(spec: DeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    caseId: spec.caseId, name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const map = make_livemap_core(root);
      const prev = map.snap(spec.path);
      const commit = map.delete(spec.path);
      const next = map.snap(spec.path);
      const rootSnapshot = map.snap();

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: prev`, prev, spec.expectedPrev),
          equal_row(`${spec.name}: next`, next, spec.expectedNext),
          equal_row(`${spec.name}: root`, rootSnapshot, spec.expectedRoot),
        ],
      };
    },
  };
}

function make_delete_throw_case(spec: DeleteThrowCaseSpec): TestCase {
  return {
    suite: spec.suite,
    caseId: spec.caseId, name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const map = make_livemap_core(root);
      let message = "";

      try {
        map.delete(spec.path);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: error`, message, spec.expectedMessage),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}
