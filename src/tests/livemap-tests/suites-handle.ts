// suites-handle.ts

import { make_livemap_core } from "hson-live";
import type { JsonValue, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import type { LiveMapFeedEventPreview } from "./types";
import { equal_row, preview_value } from "./test-helpers";
import { json_root_node } from "./test-kit";

export function livemap_suites_handle(): TestSuite {
  const SUITE = "livemap-handle";

  return {
    suite: SUITE,
    cases: [
      make_handle_snap_case({
        suite: SUITE,
        name: "handle snap reads scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expected: "Ada",
      }),
      make_handle_set_case({
        suite: SUITE,
        name: "handle set writes scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedChanged: true,
        expectedRoot: { user: { name: "Grace" } },
      }),
      make_handle_update_case({
        suite: SUITE,
        name: "handle update changes primitive",
        input: { count: 1 },
        path: ["count"],
        update: (value) => typeof value === "number" ? value + 1 : 1,
        expectedChanged: true,
        expectedRoot: { count: 2 },
      }),
      make_handle_update_case({
        suite: SUITE,
        name: "handle update sees undefined for missing property",
        input: { user: {} },
        path: ["user", "name"],
        update: (value) => value ?? "Ada",
        expectedChanged: true,
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_handle_update_case({
        suite: SUITE,
        name: "handle update unchanged produces empty ops",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        update: (value) => value ?? "Grace",
        expectedChanged: false,
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_handle_update_feed_case({
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
      make_handle_path_copy_case({
        suite: SUITE,
        name: "handle path returns copy",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        mutateReturnedPathTo: ["user", "role"],
        expectedHandlePath: ["user", "name"],
      }),
      make_handle_original_path_stability_case({
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

function make_handle_snap_case(spec: HandleSnapCaseSpec): TestCase {
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

function make_handle_set_case(spec: HandleSetCaseSpec): TestCase {
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

function make_handle_update_case(spec: HandleUpdateCaseSpec): TestCase {
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

function make_handle_update_feed_case(spec: HandleUpdateFeedCaseSpec): TestCase {
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

function make_handle_path_copy_case(spec: HandlePathCopyCaseSpec): TestCase {
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

function make_handle_original_path_stability_case(spec: HandleOriginalPathStabilityCaseSpec): TestCase {
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