// suites-handle.ts

import { make_livemap_core } from "hson-live";
import type { JsonValue, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import type { LiveMapFeedEventPreview } from "./types";
import { equal_row, preview_value } from "./test-helpers";
import { json_root_node } from "./all-livemap-suites";

type TestLiveMap = ReturnType<typeof make_livemap_core>;
type TestHandle = ReturnType<TestLiveMap["at"]>;

export function livemap_suites_handle(): TestSuite {
  const SUITE = "livemap-handle";

  return {
    suite: SUITE,
    cases: [
      snapCase({
        suite: SUITE,
        name: "handle snap reads scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expected: "Ada",
      }),
      setCase({
        suite: SUITE,
        name: "handle set writes scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedChanged: true,
        expectedRoot: { user: { name: "Grace" } },
      }),
      setManyCase({
        suite: SUITE,
        name: "handle setMany writes multiple scoped properties",
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
      setManyCase({
        suite: SUITE,
        name: "handle setMany omits unchanged properties",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Ada", role: "admin" },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedRoot: { user: { name: "Ada", role: "admin" } },
      }),
      setManyFeedCase({
        suite: SUITE,
        name: "handle setMany emits feed events",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
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
      deleteCase({
        suite: SUITE,
        name: "handle delete removes scoped property",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        expectedChanged: true,
        expectedOps: [
          { kind: "delete", path: ["user", "name"], prev: "Ada", next: undefined },
        ],
        expectedRoot: { user: { role: "user" } },
      }),
      deleteCase({
        suite: SUITE,
        name: "handle delete missing property unchanged",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),
      deleteFeedCase({
        suite: SUITE,
        name: "handle delete emits feed event",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
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
      updateCase({
        suite: SUITE,
        name: "handle update changes primitive",
        input: { count: 1 },
        path: ["count"],
        update: (value) => typeof value === "number" ? value + 1 : 1,
        expectedChanged: true,
        expectedRoot: { count: 2 },
      }),
      updateCase({
        suite: SUITE,
        name: "handle update sees undefined for missing property",
        input: { user: {} },
        path: ["user", "name"],
        update: (value) => value ?? "Ada",
        expectedChanged: true,
        expectedRoot: { user: { name: "Ada" } },
      }),
      updateCase({
        suite: SUITE,
        name: "handle update unchanged produces empty ops",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        update: (value) => value ?? "Grace",
        expectedChanged: false,
        expectedRoot: { user: { name: "Ada" } },
      }),
      updateFeedCase({
        suite: SUITE,
        name: "handle update emits feed event",
        input: { count: 1 },
        path: ["count"],
        update: (value) => typeof value === "number" ? value + 1 : 1,
        expectedEvents: [
          {
            path: ["count"],
            value: 2,
            opPath: ["count"],
            opPrev: 1,
            opNext: 2,
          },
        ],
      }),
      commitCase({
        suite: SUITE,
        name: "handle array.insert writes scoped array",
        input: { items: [0, 1, 3] },
        act: (map) => map.at(["items"]).array.insert(2, 2),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["items"], prev: [0, 1, 3], next: [0, 1, 2, 3] },
        ],
        expectedRoot: { items: [0, 1, 2, 3] },
      }),
      commitCase({
        suite: SUITE,
        name: "handle array.remove writes scoped array",
        input: { items: [0, 1, 2] },
        act: (map) => map.at(["items"]).array.remove(1),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["items"], prev: [0, 1, 2], next: [0, 2] },
        ],
        expectedRoot: { items: [0, 2] },
      }),
      commitCase({
        suite: SUITE,
        name: "handle array.replace writes scoped array",
        input: { items: [0, 1, 2] },
        act: (map) => map.at(["items"]).array.replace(1, 9),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["items"], prev: [0, 1, 2], next: [0, 9, 2] },
        ],
        expectedRoot: { items: [0, 9, 2] },
      }),
      commitCase({
        suite: SUITE,
        name: "handle array.move writes scoped array",
        input: { items: [0, 1, 2, 3, 4, 5] },
        act: (map) => map.at(["items"]).array.move(0, 3),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["items"], prev: [0, 1, 2, 3, 4, 5], next: [1, 2, 3, 0, 4, 5] },
        ],
        expectedRoot: { items: [1, 2, 3, 0, 4, 5] },
      }),
      commitCase({
        suite: SUITE,
        name: "handle array.move moves item backward",
        input: { items: [0, 1, 2, 3, 4, 5] },
        act: (map) => map.at(["items"]).array.move(4, 1),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["items"], prev: [0, 1, 2, 3, 4, 5], next: [0, 4, 1, 2, 3, 5] },
        ],
        expectedRoot: { items: [0, 4, 1, 2, 3, 5] },
      }),
      throwCase({
        suite: SUITE,
        name: "handle array bad index throws",
        input: { items: [0, 1] },
        act: (map) => map.at(["items"]).array.insert(4, 2),
        expectedMessage: "LiveMap array index does not resolve: [\"items\"][4]",
      }),
      throwCase({
        suite: SUITE,
        name: "handle array operation on non-array throws",
        input: { user: { name: "Ada" } },
        act: (map) => map.at(["user"]).array.insert(0, "x"),
        expectedMessage: "LiveMap path is not an array: [\"user\"]",
      }),
      feedCase({
        suite: SUITE,
        name: "handle array.insert emits feed event",
        input: { items: [0, 2] },
        path: ["items"],
        act: (handle) => handle.array.insert(1, 1),
        expectedEvents: [
          {
            path: ["items"],
            value: [0, 1, 2],
            opPath: ["items"],
            opPrev: [0, 2],
            opNext: [0, 1, 2],
          },
        ],
      }),
      linkCase({
        suite: SUITE,
        name: "handle array.move propagates link target",
        input: { source: [0, 1, 2, 3], target: [] },
        sourcePath: ["source"],
        targetPath: ["target"],
        act: (source) => source.array.move(0, 2),
        expectedRoot: { source: [1, 2, 0, 3], target: [1, 2, 0, 3] },
      }),
      commitCase({
        suite: SUITE,
        name: "handle object.setKey adds scoped key",
        input: { user: { name: "Ada" } },
        act: (map) => map.at(["user"]).object.setKey("role", "user"),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: undefined, next: "user" },
        ],
        expectedRoot: { user: { name: "Ada", role: "user" } },
      }),
      commitCase({
        suite: SUITE,
        name: "handle object.setKey replaces scoped key",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => map.at(["user"]).object.setKey("role", "admin"),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedRoot: { user: { name: "Ada", role: "admin" } },
      }),
      feedCase({
        suite: SUITE,
        name: "handle object.setKey emits feed event",
        input: { user: { name: "Ada" } },
        path: ["user"],
        act: (handle) => handle.object.setKey("role", "user"),
        expectedEvents: [
          {
            path: ["user"],
            value: { name: "Ada", role: "user" },
            opPath: ["user", "role"],
            opPrev: undefined,
            opNext: "user",
          },
        ],
      }),
      linkCase({
        suite: SUITE,
        name: "handle object.setKey propagates link target",
        input: { source: { name: "Ada" }, target: {} },
        sourcePath: ["source"],
        targetPath: ["target"],
        act: (source) => source.object.setKey("role", "user"),
        expectedRoot: { source: { name: "Ada", role: "user" }, target: { name: "Ada", role: "user" } },
      }),
      throwCase({
        suite: SUITE,
        name: "handle object.setKey on non-object throws",
        input: { items: [0, 1] },
        act: (map) => map.at(["items"]).object.setKey("role", "user"),
        expectedMessage: "LiveMap path is not an object: [\"items\"]",
      }),
      commitCase({
        suite: SUITE,
        name: "handle object.deleteKey removes scoped key",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => map.at(["user"]).object.deleteKey("role"),
        expectedChanged: true,
        expectedOps: [
          { kind: "delete", path: ["user", "role"], prev: "user", next: undefined },
        ],
        expectedRoot: { user: { name: "Ada" } },
      }),
      commitCase({
        suite: SUITE,
        name: "handle object.deleteKey missing key unchanged",
        input: { user: { name: "Ada" } },
        act: (map) => map.at(["user"]).object.deleteKey("role"),
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),
      feedCase({
        suite: SUITE,
        name: "handle object.deleteKey emits feed event",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        act: (handle) => handle.object.deleteKey("role"),
        expectedEvents: [
          {
            path: ["user"],
            value: { name: "Ada" },
            opPath: ["user", "role"],
            opPrev: "user",
            opNext: undefined,
          },
        ],
      }),
      linkCase({
        suite: SUITE,
        name: "handle object.deleteKey propagates link target",
        input: { source: { name: "Ada", role: "user" }, target: {} },
        sourcePath: ["source"],
        targetPath: ["target"],
        act: (source) => source.object.deleteKey("role"),
        expectedRoot: { source: { name: "Ada" }, target: { name: "Ada" } },
      }),
      throwCase({
        suite: SUITE,
        name: "handle object operation on non-object throws",
        input: { items: [0, 1] },
        act: (map) => map.at(["items"]).object.deleteKey("role"),
        expectedMessage: "LiveMap path is not an object: [\"items\"]",
      }),
      commitCase({
        suite: SUITE,
        name: "handle object.renameKey renames scoped key",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => map.at(["user"]).object.renameKey("role", "kind"),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user"], prev: { name: "Ada", role: "user" }, next: { name: "Ada", kind: "user" } },
        ],
        expectedRoot: { user: { name: "Ada", kind: "user" } },
      }),
      commitCase({
        suite: SUITE,
        name: "handle object.renameKey missing key unchanged",
        input: { user: { name: "Ada" } },
        act: (map) => map.at(["user"]).object.renameKey("role", "kind"),
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),
      commitCase({
        suite: SUITE,
        name: "handle object.renameKey same key unchanged",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => map.at(["user"]).object.renameKey("role", "role"),
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada", role: "user" } },
      }),
      commitCase({
        suite: SUITE,
        name: "handle object.renameKey overwrites existing key",
        input: { user: { name: "Ada", role: "user", kind: "person" } },
        act: (map) => map.at(["user"]).object.renameKey("role", "kind"),
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user"], prev: { name: "Ada", role: "user", kind: "person" }, next: { name: "Ada", kind: "user" } },
        ],
        expectedRoot: { user: { name: "Ada", kind: "user" } },
      }),
      feedCase({
        suite: SUITE,
        name: "handle object.renameKey emits feed event",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        act: (handle) => handle.object.renameKey("role", "kind"),
        expectedEvents: [
          {
            path: ["user"],
            value: { name: "Ada", kind: "user" },
            opPath: ["user"],
            opPrev: { name: "Ada", role: "user" },
            opNext: { name: "Ada", kind: "user" },
          },
        ],
      }),
      linkCase({
        suite: SUITE,
        name: "handle object.renameKey propagates link target",
        input: { source: { name: "Ada", role: "user" }, target: {} },
        sourcePath: ["source"],
        targetPath: ["target"],
        act: (source) => source.object.renameKey("role", "kind"),
        expectedRoot: { source: { name: "Ada", kind: "user" }, target: { name: "Ada", kind: "user" } },
      }),
      throwCase({
        suite: SUITE,
        name: "handle object.renameKey on non-object throws",
        input: { items: [0, 1] },
        act: (map) => map.at(["items"]).object.renameKey("role", "kind"),
        expectedMessage: "LiveMap path is not an object: [\"items\"]",
      }),
      pathCopyCase({
        suite: SUITE,
        name: "handle path returns copy",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        mutateReturnedPathTo: ["user", "role"],
        expectedHandlePath: ["user", "name"],
      }),
      originalPathCase({
        suite: SUITE,
        name: "handle path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        value: "Grace",
        expectedRoot: { user: { name: "Grace", role: "user" } },
      }),
    ] as const,
  };
}

type HandleSnapCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  expected: JsonValue | undefined;
}>;

type HandleSetCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  value: JsonValue;
  expectedChanged: boolean;
  expectedRoot: JsonValue;
}>;

type HandleSetManyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  values: Readonly<Record<string, JsonValue>>;
  expectedChanged: boolean;
  expectedOps: readonly Readonly<{
    kind: "set";
    path: LivePath;
    prev: JsonValue | undefined;
    next: JsonValue | undefined;
  }>[];
  expectedRoot: JsonValue;
}>;

type HandleUpdateCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  update: (value: JsonValue | undefined) => JsonValue;
  expectedChanged: boolean;
  expectedRoot: JsonValue;
}>;


type HandleUpdateFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  update: (value: JsonValue | undefined) => JsonValue;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;







type HandleObjectSetOp = Readonly<{
  kind: "set";
  path: LivePath;
  prev: JsonValue | undefined;
  next: JsonValue | undefined;
}>;




type HandleSetManyFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  values: Readonly<Record<string, JsonValue>>;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

type HandleDeleteCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  expectedChanged: boolean;
  expectedOps: readonly Readonly<{
    kind: "delete";
    path: LivePath;
    prev: JsonValue | undefined;
    next: undefined;
  }>[];
  expectedRoot: JsonValue;
}>;

type HandleDeleteFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

type HandlePathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  mutateReturnedPathTo: LivePath;
  expectedHandlePath: LivePath;
}>;

type HandleOriginalPathStabilityCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  mutateOriginalPathTo: LivePath;
  value: JsonValue;
  expectedRoot: JsonValue;
}>;

// Generic case types and helpers for commit/throw/feed/link
type CommitCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  act: (map: TestLiveMap) => Readonly<{ changed: boolean; ops: readonly unknown[] }>;
  expectedChanged: boolean;
  expectedOps: readonly unknown[];
  expectedRoot: JsonValue;
}>;

type FeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: LivePath;
  act: (handle: TestHandle) => unknown;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

type LinkCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  sourcePath: LivePath;
  targetPath: LivePath;
  act: (source: TestHandle) => unknown;
  expectedRoot: JsonValue;
}>;

type ThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  act: (map: TestLiveMap) => unknown;
  expectedMessage: string;
}>;

function commitCase(spec: CommitCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const commit = spec.act(map);

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

function feedCase(spec: FeedCaseSpec): TestCase {
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
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push({
          path: event.path,
          value: event.value,
          opPath: event.op.path,
          opPrev: event.op.prev,
          opNext: event.op.next,
        });
      });

      spec.act(handle);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function linkCase(spec: LinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      sourcePath: preview_value(spec.sourcePath),
      targetPath: preview_value(spec.targetPath),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const source = map.at(spec.sourcePath);
      const target = map.at(spec.targetPath);

      source.linkTo(target);
      spec.act(source);

      return {
        assertRows: [
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function throwCase(spec: ThrowCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      let message = "";

      try {
        spec.act(map);
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

function snapCase(spec: HandleSnapCaseSpec): TestCase {
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

function setCase(spec: HandleSetCaseSpec): TestCase {
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
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function setManyCase(spec: HandleSetManyCaseSpec): TestCase {
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
      const handle = map.at(spec.path);
      const commit = handle.setMany(spec.values);

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


function setManyFeedCase(spec: HandleSetManyFeedCaseSpec): TestCase {
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
      const handle = map.at(spec.path);
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push({
          path: event.path,
          value: event.value,
          opPath: event.op.path,
          opPrev: event.op.prev,
          opNext: event.op.next,
        });
      });

      handle.setMany(spec.values);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function deleteCase(spec: HandleDeleteCaseSpec): TestCase {
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
      const commit = handle.delete();

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

function deleteFeedCase(spec: HandleDeleteFeedCaseSpec): TestCase {
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
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push({
          path: event.path,
          value: event.value,
          opPath: event.op.path,
          opPrev: event.op.prev,
          opNext: event.op.next,
        });
      });

      handle.delete();

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function updateCase(spec: HandleUpdateCaseSpec): TestCase {
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
      const commit = handle.update(spec.update);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: root`, map.snap(), spec.expectedRoot),
        ],
      };
    },
  };
}

function updateFeedCase(spec: HandleUpdateFeedCaseSpec): TestCase {
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
      const events: LiveMapFeedEventPreview[] = [];

      handle.feed((event) => {
        events.push({
          path: event.path,
          value: event.value,
          opPath: event.op.path,
          opPrev: event.op.prev,
          opNext: event.op.next,
        });
      });

      handle.update(spec.update);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}


function pathCopyCase(spec: HandlePathCopyCaseSpec): TestCase {
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

function originalPathCase(spec: HandleOriginalPathStabilityCaseSpec): TestCase {
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