// livemap-suites-feed.ts

import { make_livemap_core, make_livemap_feed_hub, paths_overlap } from "hson-live";
import type { JsonValue, LiveMapCommit, LiveMapFeedEvent, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";
import type { LiveMapFeedEventPreview } from "./types";
import { make_feed_emit_case, make_path_overlap_case, set_commit } from "../../app/utils/helpers";
import { json_root_node } from "./core-helpers";



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
  const SUITE = "livemap/feed";

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
        commit: {
          changed: false,
          prevRev: 0,
          rev: 0,
          ops: [],
        },
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

      {
        suite: SUITE,
        name: "feed event retains commit revs",
        meta: {
          input: preview_value({ count: 0 }),
        },
        run: () => {
          const hub = make_livemap_feed_hub();
          const events: Array<Readonly<{
            prevRev: number;
            rev: number;
            opKind: string;
            opPath: LivePath;
          }>> = [];

          hub.add(["count"], (event) => {
            events.push({
              prevRev: event.commit.prevRev,
              rev: event.commit.rev,
              opKind: event.op.kind,
              opPath: event.op.path,
            });
          });

          hub.emit(
            set_commit(["count"], 0, 1),
            () => 1,
          );

          return {
            assertRows: [
              equal_row(
                "feed event retains commit revs: events",
                events,
                [
                  {
                    prevRev: 0,
                    rev: 1,
                    opKind: "set",
                    opPath: ["count"],
                  },
                ],
              ),
            ],
          };
        },
      }, {
        suite: SUITE,
        name: "feed emits once with all overlapping batch ops",
        meta: {
          input: preview_value({
            user: {
              name: "Ada",
              age: 37,
            },
          }),
        },
        run: () => {
          const hub = make_livemap_feed_hub();

          const events: Array<Readonly<{
            opPath: LivePath;
            opPaths: readonly LivePath[];
            value: JsonValue | undefined;
            rev: number;
          }>> = [];

          hub.add(["user"], (event) => {
            events.push({
              opPath: event.op.path,
              opPaths: event.ops.map((op) => op.path),
              value: event.value,
              rev: event.commit.rev,
            });
          });

          const commit: LiveMapCommit = {
            changed: true,
            prevRev: 4,
            rev: 5,
            ops: [
              {
                kind: "set",
                path: ["user", "name"],
                prev: "Ada",
                next: "Grace",
              },
              {
                kind: "set",
                path: ["user", "age"],
                prev: 37,
                next: 38,
              },
            ],
          };

          hub.emit(
            commit,
            () => ({
              name: "Grace",
              age: 38,
            }),
          );

          return {
            assertRows: [
              equal_row(
                "feed emits once with all overlapping batch ops: events",
                events,
                [
                  {
                    opPath: ["user", "name"],
                    opPaths: [
                      ["user", "name"],
                      ["user", "age"],
                    ],
                    value: {
                      name: "Grace",
                      age: 38,
                    },
                    rev: 5,
                  },
                ],
              ),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "feed preserves semantic splice op",
        meta: {
          input: preview_value({
            items: ["a", "b"],
          }),
        },
        run: () => {
          const hub = make_livemap_feed_hub();
          const events: unknown[] = [];

          hub.add(["items"], (event) => {
            const op = event.op;

            events.push(
              op.kind === "splice"
                ? {
                  kind: op.kind,
                  path: op.path,
                  start: op.start,
                  removed: op.removed,
                  inserted: op.inserted,
                  prev: op.prev,
                  next: op.next,
                  rev: event.commit.rev,
                }
                : {
                  kind: op.kind,
                },
            );
          });

          const commit: LiveMapCommit = {
            changed: true,
            prevRev: 0,
            rev: 1,
            ops: [
              {
                kind: "splice",
                path: ["items"],
                start: 2,
                removed: [],
                inserted: ["c"],
                prev: ["a", "b"],
                next: ["a", "b", "c"],
              },
            ],
          };

          hub.emit(
            commit,
            () => ["a", "b", "c"],
          );

          return {
            assertRows: [
              equal_row(
                "feed preserves semantic splice op: events",
                events,
                [
                  {
                    kind: "splice",
                    path: ["items"],
                    start: 2,
                    removed: [],
                    inserted: ["c"],
                    prev: ["a", "b"],
                    next: ["a", "b", "c"],
                    rev: 1,
                  },
                ],
              ),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core feed receives changed commit rev",
        meta: {
          input: preview_value({ count: 0 }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const events: Array<Readonly<{
            prevRev: number;
            rev: number;
            value: JsonValue | undefined;
          }>> = [];

          map.feed(["count"], (event) => {
            events.push({
              prevRev: event.commit.prevRev,
              rev: event.commit.rev,
              value: event.value,
            });
          });

          const commit = map.set(["count"], 1);

          return {
            assertRows: [
              equal_row(
                "core feed receives changed commit rev: commit",
                {
                  prevRev: commit.prevRev,
                  rev: commit.rev,
                },
                {
                  prevRev: 0,
                  rev: 1,
                },
              ),
              equal_row(
                "core feed receives changed commit rev: events",
                events,
                [
                  {
                    prevRev: 0,
                    rev: 1,
                    value: 1,
                  },
                ],
              ),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core feed ignores unchanged writes",
        meta: {
          input: preview_value({ count: 0 }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const events: LiveMapFeedEvent[] = [];

          map.feed(["count"], (event) => {
            events.push(event);
          });

          const commit = map.set(["count"], 0);

          return {
            assertRows: [
              equal_row(
                "core feed ignores unchanged writes: commit",
                {
                  changed: commit.changed,
                  prevRev: commit.prevRev,
                  rev: commit.rev,
                  opCount: commit.ops.length,
                },
                {
                  changed: false,
                  prevRev: 0,
                  rev: 0,
                  opCount: 0,
                },
              ),
              equal_row(
                "core feed ignores unchanged writes: events",
                events.length,
                0,
              ),
            ],
          };
        },
      },
{
  suite: SUITE,
  name: "successful replay emits one revisioned feed event",
  meta: {
    input: preview_value({
      user: {
        name: "Ada",
        age: 37,
      },
    }),
  },
  run: () => {
    const source = make_livemap_core(json_root_node({
      user: {
        name: "Ada",
        age: 37,
      },
    }));

    const target = make_livemap_core(json_root_node({
      user: {
        name: "Ada",
        age: 37,
      },
    }));

    const events: Array<Readonly<{
      prevRev: number;
      rev: number;
      opPath: LivePath;
      opPaths: readonly LivePath[];
      value: JsonValue | undefined;
    }>> = [];

    target.feed(["user"], (event) => {
      events.push({
        prevRev: event.commit.prevRev,
        rev: event.commit.rev,
        opPath: event.op.path,
        opPaths: event.ops.map((op) => op.path),
        value: event.value,
      });
    });

    const sourceCommit = source.batch((tx) => {
      tx.set(["user", "name"], "Grace");
      tx.set(["user", "age"], 38);
    });

    target.replay({
      prevRev: 0,
      ops: sourceCommit.ops,
    });

    return {
      assertRows: [
        equal_row(
          "successful replay emits one revisioned feed event: events",
          events,
          [
            {
              prevRev: 0,
              rev: 1,
              opPath: ["user", "name"],
              opPaths: [
                ["user", "name"],
                ["user", "age"],
              ],
              value: {
                name: "Grace",
                age: 38,
              },
            },
          ],
        ),
      ],
    };
  },
},

{
  suite: SUITE,
  name: "rejected replay emits no feed event",
  meta: {
    input: preview_value({
      count: 5,
    }),
  },
  run: () => {
    const source = make_livemap_core(json_root_node({
      count: 0,
    }));

    const target = make_livemap_core(json_root_node({
      count: 5,
    }));

    const events: LiveMapFeedEvent[] = [];

    target.feed(["count"], (event) => {
      events.push(event);
    });

    const sourceCommit = source.set(["count"], 1);

    let rejected = false;

    try {
      target.replay({
        prevRev: 0,
        ops: sourceCommit.ops,
      });
    } catch {
      rejected = true;
    }

    return {
      assertRows: [
        equal_row(
          "rejected replay emits no feed event: rejected",
          rejected,
          true,
        ),
        equal_row(
          "rejected replay emits no feed event: events",
          events.length,
          0,
        ),
        equal_row(
          "rejected replay emits no feed event: rev",
          target.rev,
          0,
        ),
        equal_row(
          "rejected replay emits no feed event: root",
          target.snap(),
          {
            count: 5,
          },
        ),
      ],
    };
  },
      },
{
  suite: SUITE,
  name: "second op replay conflict emits no partial feed event",
  meta: {
    input: preview_value({
      user: {
        name: "Ada",
        age: 99,
      },
    }),
  },
  run: () => {
    const source = make_livemap_core(json_root_node({
      user: {
        name: "Ada",
        age: 37,
      },
    }));

    const target = make_livemap_core(json_root_node({
      user: {
        name: "Ada",
        age: 99,
      },
    }));

    const events: LiveMapFeedEvent[] = [];

    target.feed(["user"], (event) => {
      events.push(event);
    });

    const sourceCommit = source.batch((tx) => {
      tx.set(["user", "name"], "Grace");
      tx.set(["user", "age"], 38);
    });

    let rejected = false;

    try {
      target.replay({
        prevRev: 0,
        ops: sourceCommit.ops,
      });
    } catch {
      rejected = true;
    }

    return {
      assertRows: [
        equal_row(
          "second op replay conflict emits no partial feed event: rejected",
          rejected,
          true,
        ),
        equal_row(
          "second op replay conflict emits no partial feed event: events",
          events.length,
          0,
        ),
        equal_row(
          "second op replay conflict emits no partial feed event: rev",
          target.rev,
          0,
        ),
        equal_row(
          "second op replay conflict emits no partial feed event: root",
          target.snap(),
          {
            user: {
              name: "Ada",
              age: 99,
            },
          },
        ),
      ],
    };
  },
      },

      {
        suite: SUITE,
        name: "malformed second replay op emits no partial feed event",
        meta: {
          input: preview_value({ count: 0 }),
        },
        run: () => {
          const target = make_livemap_core(json_root_node({ count: 0 }));
          const events: LiveMapFeedEvent[] = [];
          let errorResult: unknown;

          target.feed(["count"], (event) => {
            events.push(event);
          });

          try {
            target.replay({
              prevRev: 0,
              ops: [
                { kind: "set", path: ["count"], prev: 0, next: 1 },
                null,
              ],
            } as unknown as Parameters<typeof target.replay>[0]);
          } catch (error) {
            const replayError = error as Error & Readonly<{
              code?: unknown;
              reason?: unknown;
              opIndex?: unknown;
            }>;
            errorResult = {
              name: replayError.name,
              ...(replayError.code !== undefined ? { code: replayError.code } : {}),
              ...(replayError.reason !== undefined ? { reason: replayError.reason } : {}),
              ...(replayError.opIndex !== undefined ? { opIndex: replayError.opIndex } : {}),
            };
          }

          return {
            assertRows: [
              equal_row(
                "malformed second replay op emits no partial feed event: error",
                errorResult,
                {
                  name: "LiveMapReplayInputError",
                  code: "INVALID_REPLAY",
                  reason: "operation is not an object",
                  opIndex: 1,
                },
              ),
              equal_row(
                "malformed second replay op emits no partial feed event: events",
                events.length,
                0,
              ),
              equal_row(
                "malformed second replay op emits no partial feed event: rev",
                target.rev,
                0,
              ),
              equal_row(
                "malformed second replay op emits no partial feed event: root",
                target.snap(),
                { count: 0 },
              ),
            ],
          };
        },
      },


    ] as const,
  };
}
