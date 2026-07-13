// replay-suite.ts

import { define_livemap_schema, make_livemap_core } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { read_case } from "./handle-helpers";
import { json_root_node } from "./core-helpers";




export function livemap_suite_replay(): TestSuite {
  const SUITE = "livemap/replay";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "replay applies a changed commit to a matching map",
        input: {},
        act: () => {
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

          const sourceCommit = source.set(
            ["user", "name"],
            "Grace"
          );

          const replayCommit = target.replay({
            prevRev: target.rev,
            ops: sourceCommit.ops,
          });

          return {
            replay: {
              changed: replayCommit.changed,
              prevRev: replayCommit.prevRev,
              rev: replayCommit.rev,
              ops: replayCommit.ops,
            },
            targetRev: target.rev,
            targetRoot: target.snap(),
          };
        },
        expected: {
          replay: {
            changed: true,
            prevRev: 0,
            rev: 1,
            ops: [
              {
                kind: "set",
                path: ["user", "name"],
                prev: "Ada",
                next: "Grace",
              },
            ],
          },
          targetRev: 1,
          targetRoot: {
            user: {
              name: "Grace",
              age: 37,
            },
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "replay applies a multi operation commit atomically",
        input: {},
        act: () => {
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

          const sourceCommit = source.batch((tx) => {
            tx.set(["user", "name"], "Grace");
            tx.set(["user", "age"], 38);
          });

          const replayCommit = target.replay({
            prevRev: 0,
            ops: sourceCommit.ops,
          });

          return {
            changed: replayCommit.changed,
            prevRev: replayCommit.prevRev,
            rev: replayCommit.rev,
            opCount: replayCommit.ops.length,
            targetRev: target.rev,
            targetRoot: target.snap(),
          };
        },
        expected: {
          changed: true,
          prevRev: 0,
          rev: 1,
          opCount: 2,
          targetRev: 1,
          targetRoot: {
            user: {
              name: "Grace",
              age: 38,
            },
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "replay preserves semantic splice operations",
        input: {},
        act: () => {
          const source = make_livemap_core(json_root_node({
            items: ["a", "b", "c"],
          }));

          const target = make_livemap_core(json_root_node({
            items: ["a", "b", "c"],
          }));

          const sourceCommit = source.splice(
            ["items"],
            1,
            1,
            "x",
            "y"
          );

          const replayCommit = target.replay({
            prevRev: 0,
            ops: sourceCommit.ops,
          });

          const op = replayCommit.ops[0];

          return {
            changed: replayCommit.changed,
            prevRev: replayCommit.prevRev,
            rev: replayCommit.rev,
            op: op?.kind === "splice"
              ? {
                kind: op.kind,
                path: op.path,
                start: op.start,
                removed: op.removed,
                inserted: op.inserted,
                prev: op.prev,
                next: op.next,
              }
              : undefined,
            targetRoot: target.snap(),
          };
        },
        expected: {
          changed: true,
          prevRev: 0,
          rev: 1,
          op: {
            kind: "splice",
            path: ["items"],
            start: 1,
            removed: ["b"],
            inserted: ["x", "y"],
            prev: ["a", "b", "c"],
            next: ["a", "x", "y", "c"],
          },
          targetRoot: {
            items: ["a", "x", "y", "c"],
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "empty replay retains current rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          map.set(["count"], 1);

          const commit = map.replay({
            prevRev: map.rev,
            ops: [],
          });

          return {
            changed: commit.changed,
            prevRev: commit.prevRev,
            rev: commit.rev,
            opCount: commit.ops.length,
            mapRev: map.rev,
            root: map.snap(),
          };
        },
        expected: {
          changed: false,
          prevRev: 1,
          rev: 1,
          opCount: 0,
          mapRev: 1,
          root: {
            count: 1,
          },
        },
      }),
      read_case({
        suite: SUITE,
        name: "replay rejects stale rev without changing state",
        input: {},
        act: () => {
          const source = make_livemap_core(json_root_node({
            count: 0,
          }));

          const target = make_livemap_core(json_root_node({
            count: 0,
          }));

          const sourceCommit = source.set(["count"], 1);

          target.set(["count"], 2);

          let errorResult: {
            threw: boolean;
            name?: string;
            code?: string;
            expectedRev?: number;
            actualRev?: number;
          } = {
            threw: false,
          };

          try {
            target.replay({
              prevRev: 0,
              ops: sourceCommit.ops,
            });
          } catch (error) {
            const revError = error as Error & {
              readonly code?: string;
              readonly expectedRev?: number;
              readonly actualRev?: number;
            };

            errorResult = {
              threw: true,
              name: revError.name,
              ...(revError.code !== undefined
                ? { code: revError.code }
                : {}),
              ...(revError.expectedRev !== undefined
                ? { expectedRev: revError.expectedRev }
                : {}),
              ...(revError.actualRev !== undefined
                ? { actualRev: revError.actualRev }
                : {}),
            };
          }

          return {
            error: errorResult,
            targetRev: target.rev,
            targetRoot: target.snap(),
          };
        },
        expected: {
          error: {
            threw: true,
            name: "LiveMapRevError",
            code: "STALE_REV",
            expectedRev: 0,
            actualRev: 1,
          },
          targetRev: 1,
          targetRoot: {
            count: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "replay rejects conflicting prev without consuming rev",
        input: {},
        act: () => {
          const source = make_livemap_core(json_root_node({
            count: 0,
          }));

          const target = make_livemap_core(json_root_node({
            count: 5,
          }));

          const sourceCommit = source.set(["count"], 1);

          let errorResult: {
            threw: boolean;
            name?: string;
            code?: string;
            path?: readonly (string | number)[];
            expected?: unknown;
            actual?: unknown;
          } = {
            threw: false,
          };

          try {
            target.replay({
              prevRev: 0,
              ops: sourceCommit.ops,
            });
          } catch (error) {
            const replayError = error as Error & {
              readonly code?: string;
              readonly path?: readonly (string | number)[];
              readonly expected?: unknown;
              readonly actual?: unknown;
            };

            errorResult = {
              threw: true,
              name: replayError.name,
              ...(replayError.code !== undefined
                ? { code: replayError.code }
                : {}),
              ...(replayError.path !== undefined
                ? { path: replayError.path }
                : {}),
              ...(replayError.expected !== undefined
                ? { expected: replayError.expected }
                : {}),
              ...(replayError.actual !== undefined
                ? { actual: replayError.actual }
                : {}),
            };
          }

          const next = target.set(["count"], 6);

          return {
            error: errorResult,
            next: {
              prevRev: next.prevRev,
              rev: next.rev,
            },
            targetRev: target.rev,
            targetRoot: target.snap(),
          };
        },
        expected: {
          error: {
            threw: true,
            name: "LiveMapReplayError",
            code: "REPLAY_CONFLICT",
            path: ["count"],
            expected: 0,
            actual: 5,
          },
          next: {
            prevRev: 0,
            rev: 1,
          },
          targetRev: 1,
          targetRoot: {
            count: 6,
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema rejected replay is atomic and does not consume rev",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
              age: s.number,
            },
          }));

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
          })).withSchema(schema);

          const sourceCommit = source.batch((tx) => {
            tx.set(["user", "name"], "Grace");
            tx.set(
              ["user", "age"],
              "invalid" as unknown as number
            );
          });

          let rejected = false;
          let errorName: string | undefined;

          try {
            target.replay({
              prevRev: 0,
              ops: sourceCommit.ops,
            });
          } catch (error) {
            rejected = true;
            errorName = error instanceof Error
              ? error.name
              : undefined;
          }

          const next = target.set(["user", "age"], 38);

          return {
            rejected,
            errorName,
            next: {
              prevRev: next.prevRev,
              rev: next.rev,
            },
            targetRev: target.rev,
            targetRoot: target.snap(),
          };
        },
        expected: {
          rejected: true,
          errorName: "LiveMapSchemaError",
          next: {
            prevRev: 0,
            rev: 1,
          },
          targetRev: 1,
          targetRoot: {
            user: {
              name: "Ada",
              age: 38,
            },
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "conflict in second replay op is fully atomic",
        input: {},
        act: () => {
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

          const sourceCommit = source.batch((tx) => {
            tx.set(["user", "name"], "Grace");
            tx.set(["user", "age"], 38);
          });

          let errorResult: {
            threw: boolean;
            name?: string;
            code?: string;
            path?: readonly (string | number)[];
            expected?: unknown;
            actual?: unknown;
          } = {
            threw: false,
          };

          try {
            target.replay({
              prevRev: 0,
              ops: sourceCommit.ops,
            });
          } catch (error) {
            const replayError = error as Error & {
              readonly code?: string;
              readonly path?: readonly (string | number)[];
              readonly expected?: unknown;
              readonly actual?: unknown;
            };

            errorResult = {
              threw: true,
              name: replayError.name,
              ...(replayError.code !== undefined
                ? { code: replayError.code }
                : {}),
              ...(replayError.path !== undefined
                ? { path: replayError.path }
                : {}),
              ...(replayError.expected !== undefined
                ? { expected: replayError.expected }
                : {}),
              ...(replayError.actual !== undefined
                ? { actual: replayError.actual }
                : {}),
            };
          }

          return {
            error: errorResult,
            targetRev: target.rev,
            targetRoot: target.snap(),
          };
        },
        expected: {
          error: {
            threw: true,
            name: "LiveMapReplayError",
            code: "REPLAY_CONFLICT",
            path: ["user", "age"],
            expected: 37,
            actual: 99,
          },
          targetRev: 0,
          targetRoot: {
            user: {
              name: "Ada",
              age: 99,
            },
          },
        },
      }),
      read_case({
        suite: SUITE,
        name: "replay rejects a declared next value that does not match",
        input: {},
        act: () => {
          const target = make_livemap_core(json_root_node({
            items: ["a", "b"],
          }));

          const mismatchedOp: Parameters<
            typeof target.replay
          >[0]["ops"][number] = {
            kind: "splice",
            path: ["items"],
            start: 1,
            removed: ["b"],
            inserted: ["x"],
            prev: ["a", "b"],
            next: ["a", "wrong"],
          };

          let errorResult: {
            threw: boolean;
            name?: string;
            code?: string;
            path?: readonly (string | number)[];
            expected?: unknown;
            actual?: unknown;
          } = {
            threw: false,
          };

          try {
            target.replay({
              prevRev: 0,
              ops: [mismatchedOp],
            });
          } catch (error) {
            const replayError = error as Error & {
              readonly code?: string;
              readonly path?: readonly (string | number)[];
              readonly expected?: unknown;
              readonly actual?: unknown;
            };

            errorResult = {
              threw: true,
              name: replayError.name,
              ...(replayError.code !== undefined
                ? { code: replayError.code }
                : {}),
              ...(replayError.path !== undefined
                ? { path: replayError.path }
                : {}),
              ...(replayError.expected !== undefined
                ? { expected: replayError.expected }
                : {}),
              ...(replayError.actual !== undefined
                ? { actual: replayError.actual }
                : {}),
            };
          }

          return {
            error: errorResult,
            targetRev: target.rev,
            targetRoot: target.snap(),
          };
        },
        expected: {
          error: {
            threw: true,
            name: "LiveMapReplayError",
            code: "REPLAY_CONFLICT",
            path: ["items"],
            expected: ["a", "wrong"],
            actual: ["a", "x"],
          },
          targetRev: 0,
          targetRoot: {
            items: ["a", "b"],
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "replay structural equality ignores object key order",
        input: {},
        act: () => {
          const source = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
              age: 37,
            },
          }));

          const target = make_livemap_core(json_root_node({
            user: {
              age: 37,
              name: "Ada",
            },
          }));

          const sourceCommit = source.set(
            ["user"],
            {
              name: "Grace",
              age: 38,
            },
          );

          const replayCommit = target.replay({
            prevRev: 0,
            ops: sourceCommit.ops,
          });

          return {
            changed: replayCommit.changed,
            prevRev: replayCommit.prevRev,
            rev: replayCommit.rev,
            targetRev: target.rev,
            targetUser: target.snap(["user"]),
          };
        },
        expected: {
          changed: true,
          prevRev: 0,
          rev: 1,
          targetRev: 1,
          targetUser: {
            age: 38,
            name: "Grace",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "replay defensively copies incoming splice data",
        input: {},
        act: () => {
          const target = make_livemap_core(json_root_node({
            items: ["a", "b"],
          }));

          const path: (string | number)[] = ["items"];
          const removed = ["b"];
          const inserted = ["x"];
          const prev = ["a", "b"];
          const next = ["a", "x"];

          const input = {
            prevRev: 0,
            ops: [
              {
                kind: "splice",
                path,
                start: 1,
                removed,
                inserted,
                prev,
                next,
              },
            ],
          } as unknown as Parameters<typeof target.replay>[0];

          const commit = target.replay(input);

          path[0] = "changed";
          removed[0] = "changed";
          inserted[0] = "changed";
          prev[0] = "changed";
          next[0] = "changed";

          const op = commit.ops[0];

          return {
            op: op?.kind === "splice"
              ? {
                path: op.path,
                removed: op.removed,
                inserted: op.inserted,
                prev: op.prev,
                next: op.next,
              }
              : undefined,
            targetRoot: target.snap(),
          };
        },
        expected: {
          op: {
            path: ["items"],
            removed: ["b"],
            inserted: ["x"],
            prev: ["a", "b"],
            next: ["a", "x"],
          },
          targetRoot: {
            items: ["a", "x"],
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "replay preserves delete operation semantics",
        input: {},
        act: () => {
          const source = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
              role: "admin",
            },
          }));

          const target = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
              role: "admin",
            },
          }));

          const sourceCommit = source.delete([
            "user",
            "role",
          ]);

          const replayCommit = target.replay({
            prevRev: 0,
            ops: sourceCommit.ops,
          });

          return {
            commit: {
              changed: replayCommit.changed,
              prevRev: replayCommit.prevRev,
              rev: replayCommit.rev,
              ops: replayCommit.ops,
            },
            targetRoot: target.snap(),
          };
        },
        expected: {
          commit: {
            changed: true,
            prevRev: 0,
            rev: 1,
            ops: [
              {
                kind: "delete",
                path: ["user", "role"],
                prev: "admin",
                next: undefined,
              },
            ],
          },
          targetRoot: {
            user: {
              name: "Ada",
            },
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "replay preserves root replace operation semantics",
        input: {},
        act: () => {
          const source = make_livemap_core(json_root_node({
            count: 0,
          }));

          const target = make_livemap_core(json_root_node({
            count: 0,
          }));

          const sourceCommit = source.replace(
            [],
            {
              count: 1,
              ready: true,
            },
          );

          const replayCommit = target.replay({
            prevRev: 0,
            ops: sourceCommit.ops,
          });

          return {
            commit: {
              changed: replayCommit.changed,
              prevRev: replayCommit.prevRev,
              rev: replayCommit.rev,
              ops: replayCommit.ops,
            },
            targetRoot: target.snap(),
          };
        },
        expected: {
          commit: {
            changed: true,
            prevRev: 0,
            rev: 1,
            ops: [
              {
                kind: "replace",
                path: [],
                prev: {
                  count: 0,
                },
                next: {
                  count: 1,
                  ready: true,
                },
              },
            ],
          },
          targetRoot: {
            count: 1,
            ready: true,
          },
        },
      }),
    ] as const,
  };
}


