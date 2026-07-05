import type { JsonValue } from "hson-live/types";
import type { LiveMapFeedEventPreview } from "./types";


export type CoreAtSnapCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expected: JsonValue | undefined;
}>;

export type CoreAtSetCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  value: JsonValue;
  expectedCommitChanged: boolean;
  expectedRoot: JsonValue;
}>;

export type CoreAtFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  value: JsonValue;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

export type CoreAtPathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateReturnedPathTo: (string | number)[];
  expectedHandlePath: (string | number)[];
}>;

export type CoreAtOriginalPathStabilityCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  value: JsonValue;
  expectedRoot: JsonValue;
}>;

export type CoreNodeTagCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedTag: string;
}>;

export type CoreNodeMissingCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
}>;

export type CoreNodePathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateReturnedPathTo: (string | number)[];
  expectedHandlePath: (string | number)[];
}>;

export type CoreNodeOriginalPathStabilityCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  expectedTag: string;
}>;

export type CoreSetPathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  value: JsonValue;
  expectedCommitPath: (string | number)[];
  expectedRoot: JsonValue;
}>;

export type CoreSetManyCaseSpec = Readonly<{
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

export type CoreSetManyFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  feedPath: (string | number)[];
  setPath: (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

export type CoreSetManyPathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  values: Readonly<Record<string, JsonValue>>;
  expectedCommitPaths: readonly (string | number)[][];
  expectedRoot: JsonValue;
}>;

export type CoreDeleteCaseSpec = Readonly<{
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

export type CoreDeleteFeedCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  feedPath: (string | number)[];
  deletePath: (string | number)[];
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

export type CoreDeletePathCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  mutateOriginalPathTo: (string | number)[];
  expectedCommitPath: (string | number)[];
  expectedRoot: JsonValue;
}>;

export type CoreDeleteThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
  expectedRoot: JsonValue;
}>;
