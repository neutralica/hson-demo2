// batch-suite.ts

import { hsonLiveMap, make_livemap_core } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "./test-helpers";
import { hsonTransform } from "hson-live/transform";

export function livemap_suite_batch(): TestSuite {
  const SUITE = "livemap/batch";

  return {
    suite: SUITE,
    cases: [
      make_set_many_pipeline_case({
        suite: SUITE,
        name: "write-op pipeline setMany writes child ops in one commit",
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
        name: "write-op pipeline setMany omits unchanged writes",
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
        name: "write-op pipeline setMany feed emits once with child ops",
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
      make_set_many_feed_case({
        suite: SUITE,
        name: "write-op pipeline setMany path feed receives only overlapping ops",
        input: { user: { name: "Ada", role: "user" }, other: { n: 1 } },
        path: ["user"],
        values: { name: "Grace", role: "admin" },
        feedPath: ["user", "name"],
        expectedCalls: 1,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        ],
        expectedFirstOp: { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        expectedValues: [
          "Grace",
        ],
      }),
      make_set_many_feed_case({
        suite: SUITE,
        name: "write-op pipeline setMany sibling feed ignores non-overlapping ops",
        input: { user: { name: "Ada", role: "user" }, other: { n: 1 } },
        path: ["user"],
        values: { name: "Grace", role: "admin" },
        feedPath: ["other"],
        expectedCalls: 0,
        expectedOps: [],
        expectedFirstOp: undefined,
        expectedValues: [],
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
      make_batch_pipeline_case({
        suite: SUITE,
        name: "batch collects set write and delete into one commit",
        input: { user: { name: "Ada", role: "user", old: true } },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
          { kind: "delete", path: ["user", "old"], prev: true, next: undefined },
        ],
        expectedRoot: { user: { name: "Grace", role: "admin" } },
      }),
      make_batch_feed_case({
        suite: SUITE,
        name: "batch feed emits once with all matching ops",
        input: { user: { name: "Ada", role: "user" }, other: { n: 1 } },
        feedPath: ["user"],
        expectedCalls: 1,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedValues: [
          { name: "Grace", role: "admin" },
        ],
      }),
      make_batch_schema_reject_case({
        suite: SUITE,
        name: "batch schema rejects before any mutation",
        input: { user: { name: "Ada", age: 37 } },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"age\"]:\n- LiveMap schema expected number at [\"user\",\"age\"], received string",
        expectedRoot: { user: { name: "Ada", age: 37 } },
      }),
      make_batch_editor_reject_case({
        suite: SUITE,
        name: "batch editor rejection preserves earlier writes",
        input: { users: [{ name: "Ada" }, { name: "Grace" }], meta: { touched: false } },
        expectedMessage: "LiveMap set path does not resolve: [\"users\", \"first\"]",
        expectedRoot: { users: [{ name: "Ada" }, { name: "Grace" }], meta: { touched: false } },
      }),
      make_batch_closed_tx_case({
        suite: SUITE,
        name: "batch transaction handle cannot write after callback",
        input: { user: { name: "Ada" } },
        expectedMessage: "LiveMap batch transaction is already closed",
        expectedRoot: { user: { name: "Grace" } },
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
        name: "write-op pipeline setMany rejects non-object path before editor",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users"],
        values: { first: { name: "Margaret" } },
        expectedMessage: "LiveMap setMany path is not an object: [\"users\"]",
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

type DeleteOpPreview = Readonly<{
  kind: "delete";
  path: readonly (string | number)[];
  prev: JsonValue | undefined;
  next: undefined;
}>;

type OpPreview = SetOpPreview | DeleteOpPreview;


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
  expectedFirstOp: SetOpPreview | undefined;
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

type BatchPipelineCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  expectedChanged: boolean;
  expectedOps: readonly OpPreview[];
  expectedRoot: JsonValue;
}>;

type BatchFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  feedPath: readonly (string | number)[];
  expectedCalls: number;
  expectedOps: readonly SetOpPreview[];
  expectedValues: readonly JsonValue[];
}>;


type BatchRejectCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  expectedMessage: string;
  expectedRoot: JsonValue;
}>;

type BatchClosedTxCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  expectedMessage: string;
  expectedRoot: JsonValue;
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
          equal_row(`${spec.name}: first op`, seenFirstOps[0] ?? undefined, spec.expectedFirstOp),
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

function make_batch_pipeline_case(spec: BatchPipelineCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const commit = map.batch((tx) => {
        tx.set(["user", "name"], "Grace");
        tx.setMany(["user"], { role: "admin" });
        tx.delete(["user", "old"]);
      });

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

function make_batch_feed_case(spec: BatchFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const seenOps: SetOpPreview[][] = [];
      const seenValues: JsonValue[] = [];

      map.feed(spec.feedPath, (event) => {
        seenOps.push(event.ops as SetOpPreview[]);
        seenValues.push(event.value as JsonValue);
      });

      map.batch((tx) => {
        tx.set(["user", "name"], "Grace");
        tx.set(["user", "role"], "admin");
        tx.set(["other", "n"], 2);
      });

      return {
        assertRows: [
          equal_row(`${spec.name}: feed calls`, seenOps.length, spec.expectedCalls),
          equal_row(`${spec.name}: ops`, seenOps[0] ?? [], spec.expectedOps),
          equal_row(`${spec.name}: values`, seenValues, spec.expectedValues),
        ],
      };
    },
  };
}


function make_batch_schema_reject_case(spec: BatchRejectCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: () => {
      const schema = hsonLiveMap.schema.define((s) =>
        s.exact({
          user: s.exact({
            name: s.string,
            age: s.number,
          }),
        }),
      );
      const map = hsonLiveMap.fromJson(spec.input).schema.use(schema);
      let message = "";

      try {
        map.batch((tx) => {
          tx.set(["user", "name"], "Grace");
          tx.set(["user", "age"], "old" as unknown as number);
        });
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

function make_batch_editor_reject_case(spec: BatchRejectCaseSpec): TestCase {
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
        map.batch((tx) => {
          tx.set(["meta", "touched"], true);
          tx.set(["users", "first"], { name: "Margaret" });
        });
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

function make_batch_closed_tx_case(spec: BatchClosedTxCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      let capturedTx: { set: (path: readonly (string | number)[], value: JsonValue) => unknown } | undefined;
      let message = "";

      map.batch((tx) => {
        capturedTx = tx;
        tx.set(["user", "name"], "Grace");
      });

      try {
        capturedTx?.set(["user", "name"], "Margaret");
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
      const schema = hsonLiveMap.schema.define((s) =>
        s.exact({
          user: s.exact({
            name: s.string,
            age: s.number,
          }),
        }),
      );
      let message = "";

      const map = hsonLiveMap.fromJson(spec.input).schema.use(schema);

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
  return hsonTransform.fromJson(input).toNode();
}
