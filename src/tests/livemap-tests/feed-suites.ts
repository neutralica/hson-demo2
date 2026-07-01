// livemap-suites-feed.ts

import { make_livemap_feed_hub, paths_overlap } from "hson-live";
import type { JsonValue, LiveMapCommit, LiveMapFeedEvent, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";
import type { LiveMapFeedEventPreview } from "./types";
import  { make_feed_emit_case, make_path_overlap_case, set_commit } from "../../app/utils/helpers";



export type FeedEmitCaseSpec = Readonly<{
  suite: string;
  name: string;
  feedPath: LivePath;
  commit: LiveMapCommit;
  snapValue: JsonValue | undefined;
  expectedEvents: readonly LiveMapFeedEventPreview[];
}>;


function make_feed_dispose_case(spec: FeedEmitCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      feedPath: preview_value(spec.feedPath),
      commit: preview_value(spec.commit),
    },
    run: () => {
      const hub = make_livemap_feed_hub();
      const events: LiveMapFeedEventPreview[] = [];

      const dispose = hub.add(spec.feedPath, (event) => {
        events.push(preview_feed_event(event));
      });

      dispose();
      hub.emit(spec.commit, () => spec.snapValue);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

export function preview_feed_event(event: LiveMapFeedEvent): LiveMapFeedEventPreview {
  return {
    path: event.path,
    value: event.value,
    opPath: event.op.path,
    opPrev: event.op.prev,
    opNext: event.op.next,
  };
}

export function livemap_suite_feed(): TestSuite {
  const SUITE = "livemap-feed";

  return {
    suite: SUITE,
    cases: [
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap exact path",
        a: ["user", "name"],
        b: ["user", "name"],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap parent hears child",
        a: ["user"],
        b: ["user", "name"],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap child hears parent",
        a: ["user", "name"],
        b: ["user"],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap sibling paths do not match",
        a: ["user", "name"],
        b: ["user", "role"],
        expected: false,
      }),
      make_feed_emit_case({
        suite: SUITE,
        name: "feed exact path receives matching op",
        feedPath: ["user", "name"],
        commit: set_commit(["user", "name"], "Ada", "Grace"),
        snapValue: "Grace",
        expectedEvents: [
          {
            path: ["user", "name"],
            value: "Grace",
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
      make_feed_emit_case({
        suite: SUITE,
        name: "feed parent receives child op with parent snapshot",
        feedPath: ["user"],
        commit: set_commit(["user", "name"], "Ada", "Grace"),
        snapValue: { name: "Grace" },
        expectedEvents: [
          {
            path: ["user"],
            value: { name: "Grace" },
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
      make_feed_emit_case({
        suite: SUITE,
        name: "feed sibling ignores unrelated op",
        feedPath: ["user", "role"],
        commit: set_commit(["user", "name"], "Ada", "Grace"),
        snapValue: "admin",
        expectedEvents: [],
      }),
      make_feed_emit_case({
        suite: SUITE,
        name: "feed ignores unchanged commit",
        feedPath: ["user", "name"],
        commit: { changed: false, ops: [] },
        snapValue: "Ada",
        expectedEvents: [],
      }),
      make_feed_dispose_case({
        suite: SUITE,
        name: "feed disposer stops later events",
        feedPath: ["user", "name"],
        commit: set_commit(["user", "name"], "Ada", "Grace"),
        snapValue: "Grace",
        expectedEvents: [],
      }),
       make_feed_emit_case({
        suite: SUITE,
        name: "feed exact path receives matching op",
        feedPath: ["user", "name"],
        commit: set_commit(["user", "name"], "Ada", "Grace"),
        snapValue: "Grace",
        expectedEvents: [
          {
            path: ["user", "name"],
            value: "Grace",
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
    ] as const,
  };
}