import type { LivePath } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TestLiveMap, TestHandle } from "./handle-suite";
import type { LiveMapFeedEventPreview } from "./types";

export type HandleSnapCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  expected: JsonValue | undefined;
}>;
export type HandleSetCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  value: JsonValue;
  expectedChanged: boolean;
  expectedRoot: JsonValue;
}>;
export type HandleSetManyCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
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
export type HandleUpdateCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  update: (value: JsonValue | undefined) => JsonValue;
  expectedChanged: boolean;
  expectedRoot: JsonValue;
}>;
export type HandleUpdateFeedCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
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
export type HandleSetManyFeedCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  values: Readonly<Record<string, JsonValue>>;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;
export type HandleDeleteCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
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
export type HandleDeleteFeedCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;
export type HandlePathCopyCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  mutateReturnedPathTo: LivePath;
  expectedHandlePath: LivePath;
}>;
export type HandleOriginalPathStabilityCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  mutateOriginalPathTo: LivePath;
  value: JsonValue;
  expectedRoot: JsonValue;
}>;
// Generic case types and helpers for commit/throw/feed/link
export type CommitCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  act: (map: TestLiveMap) => Readonly<{ changed: boolean; ops: readonly unknown[]; }>;
  expectedChanged: boolean;
  expectedOps: readonly unknown[];
  expectedRoot: JsonValue;
}>;
export type FeedCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  path: LivePath;
  act: (handle: TestHandle) => unknown;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;
export type LinkCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  sourcePath: LivePath;
  targetPath: LivePath;
  act: (source: TestHandle) => unknown;
  expectedRoot: JsonValue;
}>;
export type ThrowCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  act: (map: TestLiveMap) => unknown;
  expectedMessage: string;
}>;
export type ReadCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: JsonValue;
  act: (map: TestLiveMap) => unknown;
  expected: unknown;
}>;
