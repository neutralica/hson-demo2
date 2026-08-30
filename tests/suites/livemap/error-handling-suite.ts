import { hson } from "hson-live";
import { make_livemap_core } from "hson-live/livemap";
import { read_case } from "./handle-helpers";
import type { TestSuite } from "../../harness/core/test-contracts";
import { json_root_node } from "./core-helpers";


const SUITE = "livemap/schema-errors";

function summarize_issue(
  issue: {
    readonly code: string;
    readonly path: readonly (string | number)[];
    readonly message: string;
    readonly expected?: string;
    readonly received?: string;
  } | undefined,
): unknown {
  if (issue === undefined) return undefined;

  return {
    code: issue.code,
    path: issue.path,
    message: issue.message,
    ...(issue.expected !== undefined
      ? { expected: issue.expected }
      : {}),
    ...(issue.received !== undefined
      ? { received: issue.received }
      : {}),
  };
}


export function livemap_error_handling(): TestSuite {
  return {
    suite: SUITE,
    cases: [

    ] as const,
  };
}
