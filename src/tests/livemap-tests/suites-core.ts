import { hson, make_livemap_core } from "hson-live";
import type { JsonValue, LiveMapFeedEvent } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, make_core_set_case, make_core_snap_case, preview_value } from "./test-helpers";
import type { LiveMapFeedCaseSpec, LiveMapFeedEventPreview } from "./types";

export function livemap_suites_core(): TestSuite {
  const SUITE = "livemap-core";

  return {
    suite: SUITE,
    cases: [
      make_core_snap_case({
        suite: SUITE,
        name: "core snap root object",
        input: { user: { name: "Ada" } },
        expected: { user: { name: "Ada" } },
      }),
      make_core_snap_case({
        suite: SUITE,
        name: "core snap nested object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expected: "Ada",
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set existing object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        ],
        expectedRoot: { user: { name: "Grace" } },
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set missing object property",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        value: "admin",
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: undefined, next: "admin" },
        ],
        expectedRoot: { user: { name: "Ada", role: "admin" } },
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set existing object property unchanged",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Ada",
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set existing array item",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0],
        value: { name: "Margaret" },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["users", 0], prev: { name: "Ada" }, next: { name: "Margaret" } },
        ],
        expectedRoot: { users: [{ name: "Margaret" }, { name: "Grace" }] },
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set existing array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 1, "name"],
        value: "Margaret",
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["users", 1, "name"], prev: "Grace", next: "Margaret" },
        ],
        expectedRoot: { users: [{ name: "Ada" }, { name: "Margaret" }] },
      }),
      make_core_set_path_copy_case({
        suite: SUITE,
        name: "core set commit path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        value: "Grace",
        expectedCommitPath: ["user", "name"],
        expectedRoot: { user: { name: "Grace", role: "user" } },
      }),
      make_core_set_many_case({
        suite: SUITE,
        name: "core setMany writes multiple properties as one commit",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Grace", role: "admin" },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedRoot: { user: { name: "Grace", role: "admin" } },
      }),
      make_core_set_many_case({
        suite: SUITE,
        name: "core setMany omits unchanged properties",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Ada", role: "admin" },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedRoot: { user: { name: "Ada", role: "admin" } },
      }),
      make_core_set_many_case({
        suite: SUITE,
        name: "core setMany unchanged batch produces empty ops",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Ada", role: "user" },
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada", role: "user" } },
      }),
      make_core_set_many_feed_case({
        suite: SUITE,
        name: "core setMany feed emits one event per changed op",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user"],
        setPath: ["user"],
        values: { name: "Grace", role: "admin" },
        expectedEvents: [
          {
            path: ["user"],
            value: { name: "Grace", role: "admin" },
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
          {
            path: ["user"],
            value: { name: "Grace", role: "admin" },
            opPath: ["user", "role"],
            opPrev: "user",
            opNext: "admin",
          },
        ],
      }),
      make_core_set_many_path_copy_case({
        suite: SUITE,
        name: "core setMany commit paths are stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        mutateOriginalPathTo: ["profile"],
        values: { name: "Grace", role: "admin" },
        expectedCommitPaths: [
          ["user", "name"],
          ["user", "role"],
        ],
        expectedRoot: { user: { name: "Grace", role: "admin" } },
      }),
      make_core_delete_case({
        suite: SUITE,
        name: "core delete existing object property",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        expectedChanged: true,
        expectedOps: [
          { kind: "delete", path: ["user", "name"], prev: "Ada", next: undefined },
        ],
        expectedRoot: { user: { role: "user" } },
      }),
      make_core_delete_case({
        suite: SUITE,
        name: "core delete missing object property unchanged",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_core_delete_feed_case({
        suite: SUITE,
        name: "core delete feed exact path hears delete",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user", "name"],
        deletePath: ["user", "name"],
        expectedEvents: [
          {
            path: ["user", "name"],
            value: undefined,
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: undefined,
          },
        ],
      }),
      make_core_delete_feed_case({
        suite: SUITE,
        name: "core delete feed parent hears child delete",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user"],
        deletePath: ["user", "name"],
        expectedEvents: [
          {
            path: ["user"],
            value: { role: "user" },
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: undefined,
          },
        ],
      }),
      make_core_delete_path_copy_case({
        suite: SUITE,
        name: "core delete commit path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        expectedCommitPath: ["user", "name"],
        expectedRoot: { user: { role: "user" } },
      }),
      make_core_delete_throw_case({
        suite: SUITE,
        name: "core delete root throws",
        input: { user: { name: "Ada" } },
        path: [],
        expectedMessage: "LiveMap editor cannot delete the root node yet.",
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_core_delete_throw_case({
        suite: SUITE,
        name: "core delete array index throws",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0],
        expectedMessage: "LiveMap editor cannot delete array indexes yet: [\"users\", 0]",
        expectedRoot: { users: [{ name: "Ada" }, { name: "Grace" }] },
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed exact path hears set",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [
          {
            path: ["user", "name"],
            value: "Grace",
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed parent hears child set",
        input: { user: { name: "Ada" } },
        feedPath: ["user"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [
          {
            path: ["user"],
            value: { name: "Grace" },
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed array parent hears indexed set",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        feedPath: ["users"],
        setPath: ["users", 0],
        value: { name: "Margaret" },
        expectedEvents: [
          {
            path: ["users"],
            value: [{ name: "Margaret" }, { name: "Grace" }],
            opPath: ["users", 0],
            opPrev: { name: "Ada" },
            opNext: { name: "Margaret" },
          },
        ],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed array index hears nested child set",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        feedPath: ["users", 1],
        setPath: ["users", 1, "name"],
        value: "Margaret",
        expectedEvents: [
          {
            path: ["users", 1],
            value: { name: "Margaret" },
            opPath: ["users", 1, "name"],
            opPrev: "Grace",
            opNext: "Margaret",
          },
        ],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed sibling ignores set",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user", "role"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed ignores unchanged set",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Ada",
        expectedEvents: [],
      }),
      make_core_feed_dispose_case({
        suite: SUITE,
        name: "core feed disposer stops later events",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [],
      }),
      make_core_at_snap_case({
        suite: SUITE,
        name: "core at snap reads scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expected: "Ada",
      }),
      make_core_at_set_case({
        suite: SUITE,
        name: "core at set writes scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedCommitChanged: true,
        expectedRoot: { user: { name: "Grace" } },
      }),
      make_core_at_feed_case({
        suite: SUITE,
        name: "core at feed hears scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedEvents: [
          {
            path: ["user", "name"],
            value: "Grace",
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
      make_core_at_path_copy_case({
        suite: SUITE,
        name: "core at path returns copy",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        mutateReturnedPathTo: ["user", "role"],
        expectedHandlePath: ["user", "name"],
      }),
      make_core_at_original_path_stability_case({
        suite: SUITE,
        name: "core at path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        value: "Grace",
        expectedRoot: { user: { name: "Grace", role: "user" } },
      }),
    ] as const,
  };
}

type CoreAtSnapCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expected: JsonValue | undefined;
}>;

type CoreAtSetCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  value: JsonValue;
  expectedCommitChanged: boolean;
  expectedRoot: JsonValue;
}>;

type CoreAtFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  value: JsonValue;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

type CoreAtPathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateReturnedPathTo: (string | number)[];
  expectedHandlePath: (string | number)[];
}>;

type CoreAtOriginalPathStabilityCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  value: JsonValue;
  expectedRoot: JsonValue;
}>;

type CoreSetPathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  value: JsonValue;
  expectedCommitPath: (string | number)[];
  expectedRoot: JsonValue;
}>;

type CoreSetManyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  expectedChanged: boolean;
  expectedOps: readonly Readonly<{
    kind: "set";
    path: (string | number)[];
    prev: JsonValue | undefined;
    next: JsonValue | undefined;
  }>[];
  expectedRoot: JsonValue;
}>;

type CoreSetManyFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  feedPath: (string | number)[];
  setPath: (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

type CoreSetManyPathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  expectedCommitPaths: readonly (string | number)[][];
  expectedRoot: JsonValue;
}>;

type CoreDeleteCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedChanged: boolean;
  expectedOps: readonly Readonly<{
    kind: "delete";
    path: (string | number)[];
    prev: JsonValue | undefined;
    next: undefined;
  }>[];
  expectedRoot: JsonValue;
}>;

type CoreDeleteFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  feedPath: (string | number)[];
  deletePath: (string | number)[];
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

type CoreDeletePathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  expectedCommitPath: (string | number)[];
  expectedRoot: JsonValue;
}>;

type CoreDeleteThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
  expectedRoot: JsonValue;
}>;

function make_core_at_snap_case(spec: CoreAtSnapCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.at(spec.path);

      return {
        assertRows: [
          equal_row(`${spec.name}: snap`, handle.snap(), spec.expected),
          equal_row(`${spec.name}: path`, handle.path(), spec.path),
        ],
      };
    },
  };
}

function make_core_at_set_case(spec: CoreAtSetCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.at(spec.path);
      const commit = handle.set(spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedCommitChanged),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function make_core_at_feed_case(spec: CoreAtFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.at(spec.path);
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push(preview_core_feed_event(event));
      });

      handle.set(spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function make_core_at_path_copy_case(spec: CoreAtPathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateReturnedPathTo: preview_value(spec.mutateReturnedPathTo),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.at(spec.path);
      const returnedPath = handle.path() as (string | number)[];

      returnedPath.splice(0, returnedPath.length, ...spec.mutateReturnedPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: returned path mutation`, handle.path(), spec.expectedHandlePath),
        ],
      };
    },
  };
}

function make_core_at_original_path_stability_case(spec: CoreAtOriginalPathStabilityCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const handle = map.at(originalPath);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);
      handle.set(spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
          equal_row(`${spec.name}: handle path`, handle.path(), spec.path),
        ],
      };
    },
  };
}

function make_core_set_path_copy_case(spec: CoreSetPathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const commit = map.set(originalPath, spec.value);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: commit path`, commit.ops[0]?.path, spec.expectedCommitPath),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function make_core_set_many_case(spec: CoreSetManyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      values: preview_value(spec.values),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const commit = map.setMany(spec.path, spec.values);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: ops`, commit.ops, spec.expectedOps),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function make_core_set_many_feed_case(spec: CoreSetManyFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      setPath: preview_value(spec.setPath),
      values: preview_value(spec.values),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const events: LiveMapFeedEventPreview[] = [];

      map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      map.setMany(spec.setPath, spec.values);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function make_core_set_many_path_copy_case(spec: CoreSetManyPathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
      values: preview_value(spec.values),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const commit = map.setMany(originalPath, spec.values);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: commit paths`, commit.ops.map((op) => op.path), spec.expectedCommitPaths),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function make_core_delete_case(spec: CoreDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const commit = map.delete(spec.path);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: ops`, commit.ops, spec.expectedOps),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function make_core_delete_feed_case(spec: CoreDeleteFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const events: LiveMapFeedEventPreview[] = [];

      map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      map.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function make_core_delete_path_copy_case(spec: CoreDeletePathCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      mutateOriginalPathTo: preview_value(spec.mutateOriginalPathTo),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const originalPath = [...spec.path];
      const commit = map.delete(originalPath);

      originalPath.splice(0, originalPath.length, ...spec.mutateOriginalPathTo);

      return {
        assertRows: [
          equal_row(`${spec.name}: commit path`, commit.ops[0]?.path, spec.expectedCommitPath),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function make_core_delete_throw_case(spec: CoreDeleteThrowCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
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

function make_core_feed_case(spec: LiveMapFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const map = make_livemap_core(root);
      const events: LiveMapFeedEventPreview[] = [];

      map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      map.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function make_core_feed_dispose_case(spec: LiveMapFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const map = make_livemap_core(root);
      const events: LiveMapFeedEventPreview[] = [];

      const dispose = map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      dispose();
      map.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function preview_core_feed_event(event: LiveMapFeedEvent): LiveMapFeedEventPreview {
  return {
    path: event.path,
    value: event.value,
    opPath: event.op.path,
    opPrev: event.op.prev,
    opNext: event.op.next,
  };
}

function json_root_node(input: JsonValue) {
  return hson.fromJson(input).toHson().parse();
}
