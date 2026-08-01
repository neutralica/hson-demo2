import { make_livemap_feed_hub, paths_overlap, type LiveMapCommit, type LiveMapFeedEvent, type LivePath } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TestCase } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./assert-helpers";
import type { LiveMapFeedEventPreview } from "./types";

export type FeedEmitCaseSpec = Readonly<{
  suite: string;
  name: string;
  feedPath: LivePath;
  commit: LiveMapCommit;
  snapValue: JsonValue | undefined;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;

export function preview_feed_event(event: LiveMapFeedEvent): LiveMapFeedEventPreview {
  return {
    path: event.path,
    value: event.value,
    opPath: event.op.path,
    opPrev: event.op.prev,
    opNext: event.op.next,
  };
}

type PathOverlapCaseSpec = Readonly<{
  suite: string;
  name: string;
  a: LivePath;
  b: LivePath;
  expected: boolean;
}>;

export function make_path_overlap_case(spec: PathOverlapCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: { a: preview_value(spec.a), b: preview_value(spec.b) },
    run: () => ({
      assertRows: [equal_row(spec.name, paths_overlap(spec.a, spec.b), spec.expected)],
    }),
  };
}

export function make_feed_emit_case(spec: FeedEmitCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: { feedPath: preview_value(spec.feedPath), commit: preview_value(spec.commit) },
    run: () => {
      const hub = make_livemap_feed_hub();
      const events: LiveMapFeedEventPreview[] = [];
      hub.add(spec.feedPath, (event) => events.push(preview_feed_event(event)));
      hub.emit(spec.commit, () => spec.snapValue);
      return { assertRows: [equal_row(`${spec.name}: events`, events, spec.expectedEvents)] };
    },
  };
}

export function set_commit(
  path: LivePath,
  prev: JsonValue | undefined,
  next: JsonValue | undefined,
): LiveMapCommit {
  return {
    changed: true,
    prevRev: 0,
    rev: 1,
    ops: [{ kind: "set", path, prev, next }],
  };
}
