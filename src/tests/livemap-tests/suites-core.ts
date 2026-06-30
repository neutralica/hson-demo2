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
