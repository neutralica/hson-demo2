import { make_livemap_core, set_live_path, snap_live_path } from "hson-live";
import { json_root_node } from "./all-livemap-suites";
import type { HsonNode, JsonValue, LiveMapCommit, LiveMapEditResult, LivePath } from "hson-live/types";
import type { TestAssertRow, TestCase } from "../../app/demos/test/tests.types";
import type {
  LiveMapSetCaseSpec,
  LiveMapSetCommitExpectation,
  LiveMapSetEditExpectation,
  LiveMapSnapCaseSpec,
} from "./types";

export type SnapCaseSpec = LiveMapSnapCaseSpec;
export type CoreSnapCaseSpec = LiveMapSnapCaseSpec;
export type SetCaseSpec = LiveMapSetCaseSpec<LiveMapSetEditExpectation>;
export type CoreSetCaseSpec = LiveMapSetCaseSpec<LiveMapSetCommitExpectation>;

type SnapLikeSpec = LiveMapSnapCaseSpec;
type SetLikeSpec = LiveMapSetCaseSpec<LiveMapSetEditExpectation>;
type CoreSetSpec = LiveMapSetCaseSpec<LiveMapSetCommitExpectation>;

type SnapLikeRunner = (root: HsonNode, path: LivePath | undefined) => JsonValue | undefined;

type SetLikeRunner = (
  root: HsonNode,
  path: LivePath,
  value: JsonValue,
) => Readonly<{
  result: LiveMapEditResult;
  rootSnapshot: JsonValue | undefined;
}>;

type CoreSetRunner = (
  root: HsonNode,
  path: LivePath,
  value: JsonValue,
) => Readonly<{
  commit: LiveMapCommit;
  rootSnapshot: JsonValue | undefined;
}>;

export function equal_row(label: string, actual: unknown, expected: unknown): TestAssertRow {
  const actualText = preview_value(actual);
  const expectedText = preview_value(expected);

  return {
    ok: actualText === expectedText,
    label,
    actual: actualText,
    expected: expectedText,
  };
}

export function preview_value(value: unknown): string {
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

export function make_snap_case(spec: SnapCaseSpec): TestCase {
  return make_snap_like_case(spec, (root, path) => snap_live_path(root, path ?? []));
}

export function make_core_snap_case(spec: CoreSnapCaseSpec): TestCase {
  return make_snap_like_case(spec, (root, path) => {
    const map = make_livemap_core(root);
    return path === undefined ? map.snap() : map.snap(path);
  });
}

export function make_set_case(spec: SetCaseSpec): TestCase {
  return make_set_like_case(spec, (root, path, value) => {
    const result = set_live_path(root, path, value);
    const rootSnapshot = snap_live_path(root, []);
    return { result, rootSnapshot };
  });
}

export function make_core_set_case(spec: CoreSetCaseSpec): TestCase {
  return make_core_set_like_case(spec, (root, path, value) => {
    const map = make_livemap_core(root);
    const commit = map.set(path, value);
    const rootSnapshot = map.snap();
    return { commit, rootSnapshot };
  });
}

function make_snap_like_case(spec: SnapLikeSpec, run_snap: SnapLikeRunner): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path ?? []),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const actual = run_snap(root, spec.path);

      return {
        assertRows: [
          equal_row(spec.name, actual, spec.expectedOutput),
        ],
      };
    },
  };
}

function make_set_like_case(spec: SetLikeSpec, run_set: SetLikeRunner): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      value: preview_value(spec.value),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const { result, rootSnapshot } = run_set(root, spec.path, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, result.changed, spec.expectedChanged),
          equal_row(`${spec.name}: prev`, result.prev, spec.expectedPrev),
          equal_row(`${spec.name}: next`, result.next, spec.expectedNext),
          equal_row(`${spec.name}: root`, rootSnapshot, spec.expectedRoot),
        ],
      };
    },
  };
}

function make_core_set_like_case(spec: CoreSetSpec, run_set: CoreSetRunner): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      value: preview_value(spec.value),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const { commit, rootSnapshot } = run_set(root, spec.path, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedChanged),
          equal_row(`${spec.name}: ops`, commit.ops, spec.expectedOps),
          equal_row(`${spec.name}: root`, rootSnapshot, spec.expectedRoot),
        ],
      };
    },
  };
}