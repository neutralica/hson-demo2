import { hson, snap_live_path } from "hson-live";
import type { HsonNode, JsonValue, LivePath } from "hson-live/types";
import type { Asserter } from "../../app/demos/test/tests.types";


export type LiveMapCaseContext = Readonly<{
  input: JsonValue;
  root: HsonNode;
  snap: (path: LivePath) => JsonValue | undefined;
}>;

export type LiveMapCaseExpected = "ok" | "fail";

export type LiveMapExpectedError = Readonly<{
  message?: string;
  includes?: string;
}>;

export type LiveMapCaseSpec = Readonly<{
  suite: string;
  name: string;

  input: JsonValue;

  expected?: LiveMapCaseExpected;
  expectedError?: LiveMapExpectedError;

  fixture?: string;
  sub?: string;

  act?: (ctx: LiveMapCaseContext) => void | Promise<void>;
  assert: (ctx: LiveMapCaseContext, t: Asserter) => void | Promise<void>;

  preview?: (ctx: LiveMapCaseContext) => string;
}>;

export function json_root_node(input: JsonValue): HsonNode {
  return hson.fromJson(input).toHson().parse();
}

export function make_livemap_case_context(input: JsonValue, root: HsonNode): LiveMapCaseContext {
  return {
    input,
    root,
    snap: (path) => snap_live_path(root, path),
  };
}

export function preview_livemap_case(ctx: LiveMapCaseContext): string {
  return JSON.stringify(ctx.snap([]), null, 2);
}