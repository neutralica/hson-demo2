import type { JsonValue, LiveMapOp, LivePath } from "hson-live/types";

export type LiveMapCaseExpected = "ok" | "fail";

export type LiveMapExpectedError = Readonly<{
  message?: string;
  includes?: string;
}>;

export type LiveMapTestCaseBase = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  willFail?: LiveMapCaseExpected;
  expectedError?: LiveMapExpectedError;
}>;

export type LiveMapSnapCaseSpec = LiveMapTestCaseBase & Readonly<{
  path?: LivePath;
  expectedOutput: JsonValue | undefined;
}>;

export type LiveMapSetCaseSpec<TExpected extends object> = LiveMapTestCaseBase & Readonly<{
  path: LivePath;
  value: JsonValue;
}> & TExpected;

export type LiveMapSetEditExpectation = Readonly<{
  expectedChanged: boolean;
  expectedPrev: JsonValue | undefined;
  expectedNext: JsonValue | undefined;
  expectedRoot: JsonValue;
}>;

export type LiveMapSetCommitExpectation = Readonly<{
  expectedChanged: boolean;
  expectedOps: readonly LiveMapOp[];
  expectedRoot: JsonValue;
}>;

export type LiveMapFeedCaseSpec = LiveMapTestCaseBase & Readonly<{
  feedPath: LivePath;
  setPath: LivePath;
  value: JsonValue;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

export type LiveMapFeedEventPreview = Readonly<{
  path: LivePath;
  value: JsonValue | undefined;
  opPath: LivePath;
  opPrev: JsonValue | undefined;
  opNext: JsonValue | undefined;
}>;
