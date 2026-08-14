import type { LivePath } from "hson-live/livemap";
import type { LiveTree } from "hson-live/livetree";
import type { JsonValue, HsonNode, LiveMapEditResult } from "hson-live/types";
import type { Asserter } from "../../harness/core/test-contracts";
import type { HostedTestGeometryFixture } from "../../harness/runtimes/dom/hosted-test-geometry";


export type LiveMapCaseContext = Readonly<{
  input: JsonValue;
  root: HsonNode;
  snap: (path: LivePath) => JsonValue | undefined;
}>;

export type LiveMapCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;

  // "input" is your fixture JSON for inspector
  input: JsonValue;

  // Optional: label shown in inspector meta
  fixture?: string;
  sub?: string;

  // Arrange/Act: mutate or inspect map context
  act?: (ctx: LiveMapCaseContext) => void | Promise<void>;

  // Assert: use the `t` helper below (pedantic, multi-check)
  assert: (ctx: LiveMapCaseContext, t: Asserter) => void | Promise<void>;

  // Optional: customize what gets shown in preview
  preview?: (ctx: LiveMapCaseContext) => string;
}>;
export type CoreSnapCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path?: LivePath;
  expected: JsonValue | undefined;
}>;
export type CoreSetCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  value: JsonValue;
  expectedChanged: boolean;
  expectedPrev: JsonValue | undefined;
  expectedNext: JsonValue | undefined;
  expectedRoot: JsonValue;
}>;
export type SnapCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  expected: JsonValue | undefined;
}>;

export type SetCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  value: JsonValue;
  expectedChanged: boolean;
  expectedPrev: JsonValue | undefined;
  expectedNext: JsonValue | undefined;
  expectedRoot: JsonValue;
}>;

export type LiveTreeFx = {
  name: string;
  html: string;
  run: (tree: LiveTree) => void | Promise<void>;
  assert: (tree: LiveTree) => void;
  preview?: string; // short inspector snippet
  inputLabel?: string; // optional: “attrs / text / append”
};

export type LiveTreeCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;

  // "input" is your fixture HTML for inspector
  html: string;

  // Optional: label shown in inspector meta
  fixture?: string;
  sub?: string;
  dom?: boolean;
  hostedGeometry?: readonly HostedTestGeometryFixture[];
  // Arrange/Act: mutate tree
  act: (tree: LiveTree) => void | Promise<void>;

  // Assert: use the `t` helper below (pedantic, multi-check)
  assert: (tree: LiveTree, t: Asserter) => void | Promise<void>;

  // Optional: customize what gets shown in preview
  preview?: (tree: LiveTree) => string;
}>;
export type SnapLikeSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path?: LivePath;
  expected: JsonValue | undefined;
}>;
export type SetLikeSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  value: JsonValue;
  expectedChanged: boolean;
  expectedPrev: JsonValue | undefined;
  expectedNext: JsonValue | undefined;
  expectedRoot: JsonValue;
}>;
export type SnapLikeRunner = (root: HsonNode, path: LivePath | undefined) => JsonValue | undefined;
export type SetLikeRunner = (
  root: HsonNode,
  path: LivePath,
  value: JsonValue
) => Readonly<{
  result: LiveMapEditResult;
  rootSnapshot: JsonValue | undefined;
}>;
