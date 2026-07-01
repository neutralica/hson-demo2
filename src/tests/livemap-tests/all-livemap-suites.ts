import { hson, snap_live_path } from "hson-live";
import type { HsonNode, JsonValue, LivePath } from "hson-live/types";
import type { Asserter, TestSuite } from "../../app/demos/test/tests.types";
import { livemap_suites_core } from "./core-suites";
import { livemap_suite_editor as livemap_suites_editor } from "./editor-suites";
import { livemap_suite_feed as livemap_suites_feed } from "./feed-suites";
import { livemap_suites_handle } from "./handle-suites";
import { livemap_suites_link } from "./link-suites";
import { livemap_suites_node } from "./node-suites";
import { livemap_suites_path } from "./path-suites";
import { livemap_suites_guard } from "./guard-suites";
import { livemap_suites_handle_2 } from "./handle-suites-2";


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
export function all_livemap_suites(): readonly TestSuite[] {
  return [
    livemap_suites_editor(),
    livemap_suites_core(),
    livemap_suites_feed(),
    livemap_suites_path(),
    livemap_suites_link(),
    livemap_suites_handle(),
    livemap_suites_node(),
    livemap_suites_guard(),
    livemap_suites_handle_2()
  ] as const;
}
