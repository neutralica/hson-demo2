// batch-suite.ts

import { hson, make_livemap_core } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";

export function livemap_suite_batch(): TestSuite {
  const SUITE = "livemap/batch";

  return {
    suite: SUITE,
    cases: [
      make_set_many_pipeline_case({
        suite: SUITE,
        name: "write-op pipeline setMany writes multiple properties in one commit",
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
      make_set_many_pipeline_case({
        suite: SUITE,
        name: "write-op pipeline setMany omits unchanged writes from commit",
        input: { user: { name: "Ada", role: "user", active: true } },
        path: ["user"],
        values: { name: "Ada", role: "admin", active: true },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedRoot: { user: { name: "Ada", role: "admin", active: true } },
      }),
      make_set_many_feed_case({
        suite: SUITE,
        name: "write-op pipeline setMany feed emits once with all matching ops",
        input: { user: { name: "Ada", role: "user" }, other: { n: 1 } },
        path: ["user"],
        values: { name: "Grace", role: "admin" },
        feedPath: ["user"],
        expectedCalls: 1,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedFirstOp: { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        expectedValues: [
          { name: "Grace", role: "admin" },
        ],
      }),
      make_set_many_sub_path_case({
        suite: SUITE,
        name: "write-op pipeline setMany sub.path observes final value once",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Grace", role: "admin" },
        subPath: ["user", "name"],
        expectedCalls: [
          { next: "Grace", prev: "Ada" },
        ],
      }),
      make_set_many_schema_reject_case({
        suite: SUITE,
        name: "write-op pipeline setMany schema rejects before any mutation",
        input: { user: { name: "Ada", age: 37 } },
        path: ["user"],
        values: { name: "Grace", age: "old" },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"age\"]:\n- LiveMap schema expected number at [\"user\",\"age\"], received string",
        expectedRoot: { user: { name: "Ada", age: 37 } },
      }),
      make_set_many_editor_reject_case({
        suite: SUITE,
        name: "write-op pipeline setMany editor rejection preserves earlier properties",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users"],
        values: { first: { name: "Margaret" } },
        expectedMessage: "LiveMap editor cannot set object property on array at [\"users\", \"first\"]",
        expectedRoot: { users: [{ name: "Ada" }, { name: "Grace" }] },
      }),
    ] as const,
  };
}

type SetOpPreview = Readonly<{
  kind: "set";
  path: readonly (string | number)[];
  prev: JsonValue | undefined;
  next: JsonValue | undefined;
}>;


type SetManyPipelineCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: readonly (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  expectedChanged: boolean;
  expectedOps: readonly SetOpPreview[];
  expectedRoot: JsonValue;
}>;

type SetManyFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: readonly (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  feedPath: readonly (string | number)[];
  expectedCalls: number;
  expectedOps: readonly SetOpPreview[];
  expectedFirstOp: SetOpPreview;
  expectedValues: readonly JsonValue[];
}>;

type SubPathCall = Readonly<{
  next: JsonValue | undefined;
  prev: JsonValue | undefined;
}>;

type SetManySubPathCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: readonly (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  subPath: readonly (string | number)[];
  expectedCalls: readonly SubPathCall[];
}>;

type SetManyRejectCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: readonly (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  expectedMessage: string;
  expectedRoot: JsonValue;
}>;


function make_set_many_pipeline_case(spec: SetManyPipelineCaseSpec): TestCase {
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

function make_set_many_feed_case(spec: SetManyFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      values: preview_value(spec.values),
      feedPath: preview_value(spec.feedPath),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const seenOps: SetOpPreview[][] = [];
      const seenFirstOps: SetOpPreview[] = [];
      const seenValues: JsonValue[] = [];

      map.feed(spec.feedPath, (event) => {
        seenOps.push(event.ops as SetOpPreview[]);
        seenFirstOps.push(event.op as SetOpPreview);
        seenValues.push(event.value as JsonValue);
      });

      map.setMany(spec.path, spec.values);

      return {
        assertRows: [
          equal_row(`${spec.name}: feed calls`, seenOps.length, spec.expectedCalls),
          equal_row(`${spec.name}: ops`, seenOps[0] ?? [], spec.expectedOps),
          equal_row(`${spec.name}: first op`, seenFirstOps[0], spec.expectedFirstOp),
          equal_row(`${spec.name}: values`, seenValues, spec.expectedValues),
        ],
      };
    },
  };
}

function make_set_many_sub_path_case(spec: SetManySubPathCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      values: preview_value(spec.values),
      subPath: preview_value(spec.subPath),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const calls: SubPathCall[] = [];

      map.sub.path(spec.subPath, (next, prev) => {
        calls.push({ next: next as JsonValue | undefined, prev: prev as JsonValue | undefined });
      });

      map.setMany(spec.path, spec.values);

      return {
        assertRows: [
          equal_row(`${spec.name}: calls`, calls, spec.expectedCalls),
        ],
      };
    },
  };
}

function make_set_many_schema_reject_case(spec: SetManyRejectCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      values: preview_value(spec.values),
    },
    run: () => {
      const schema = hson.liveMap.schema.define((s) =>
        s.exact({
          user: s.exact({
            name: s.string,
            age: s.number,
          }),
        }),
      );
      let message = "";

      const map = hson.liveMap.fromJson(spec.input).schema.use(schema);

      try {
        map.setMany(spec.path, spec.values);
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

function make_set_many_editor_reject_case(spec: SetManyRejectCaseSpec): TestCase {
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
      let message = "";

      try {
        map.setMany(spec.path, spec.values);
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

function json_root_node(input: JsonValue) {
  return hson.fromJson(input).toHson().parse();
}