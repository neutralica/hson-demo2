import { hson } from "hson-live";
import { make_livemap_core } from "hson-live/livemap";
import type { TestSuite } from "../../harness/core/test-contracts";
import { json_root_node } from "./core-helpers";
import { read_case } from "./handle-helpers";
import { apply_fixture, replay_fixture } from "./replay-test-helper";



export function livemap_suite_rev(): TestSuite {
  const SUITE = "livemap/rev";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "first-changed-commit-advances-rev-from-zero", name: "first changed commit advances rev from zero",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const commit = map.set(["count"], 1);

          return {
            changed: commit.changed,
            prevRev: commit.prevRev,
            rev: commit.rev,
            ops: commit.ops.length,
            root: map.snap(),
          };
        },
        expected: {
          changed: true,
          prevRev: 0,
          rev: 1,
          ops: 1,
          root: {
            count: 1,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "successive-changed-commits-advance-monotonically", name: "successive changed commits advance monotonically",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const first = map.set(["count"], 1);
          const second = map.set(["count"], 2);
          const third = map.set(["count"], 3);

          return {
            first: {
              prevRev: first.prevRev,
              rev: first.rev,
            },
            second: {
              prevRev: second.prevRev,
              rev: second.rev,
            },
            third: {
              prevRev: third.prevRev,
              rev: third.rev,
            },
            root: map.snap(),
          };
        },
        expected: {
          first: {
            prevRev: 0,
            rev: 1,
          },
          second: {
            prevRev: 1,
            rev: 2,
          },
          third: {
            prevRev: 2,
            rev: 3,
          },
          root: {
            count: 3,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "unchanged-commit-retains-current-rev", name: "unchanged commit retains current rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const changed = map.set(["count"], 1);
          const unchanged = map.set(["count"], 1);
          const next = map.set(["count"], 2);

          return {
            changed: {
              changed: changed.changed,
              prevRev: changed.prevRev,
              rev: changed.rev,
            },
            unchanged: {
              changed: unchanged.changed,
              prevRev: unchanged.prevRev,
              rev: unchanged.rev,
              ops: unchanged.ops.length,
            },
            next: {
              changed: next.changed,
              prevRev: next.prevRev,
              rev: next.rev,
            },
          };
        },
        expected: {
          changed: {
            changed: true,
            prevRev: 0,
            rev: 1,
          },
          unchanged: {
            changed: false,
            prevRev: 1,
            rev: 1,
            ops: 0,
          },
          next: {
            changed: true,
            prevRev: 1,
            rev: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "multi-operation-batch-advances-rev-once", name: "multi operation batch advances rev once",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
              age: 37,
            },
          }));

          const commit = map.batch((tx) => {
            tx.set(["user", "name"], "Grace");
            tx.set(["user", "age"], 38);
          });

          return {
            changed: commit.changed,
            prevRev: commit.prevRev,
            rev: commit.rev,
            opCount: commit.ops.length,
            root: map.snap(),
          };
        },
        expected: {
          changed: true,
          prevRev: 0,
          rev: 1,
          opCount: 2,
          root: {
            user: {
              name: "Grace",
              age: 38,
            },
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "unchanged-batch-retains-current-rev", name: "unchanged batch retains current rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const first = map.set(["count"], 1);

          const unchanged = map.batch((tx) => {
            tx.set(["count"], 1);
          });

          const next = map.set(["count"], 2);

          return {
            firstrev: first.rev,
            unchanged: {
              changed: unchanged.changed,
              prevRev: unchanged.prevRev,
              rev: unchanged.rev,
              ops: unchanged.ops.length,
            },
            next: {
              prevRev: next.prevRev,
              rev: next.rev,
            },
          };
        },
        expected: {
          firstrev: 1,
          unchanged: {
            changed: false,
            prevRev: 1,
            rev: 1,
            ops: 0,
          },
          next: {
            prevRev: 1,
            rev: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "schema-rejected-write-does-not-consume-rev", name: "schema rejected write does not consume rev",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => s.object({
            count: s.number,
          }));

          const map = make_livemap_core(json_root_node({
            count: 0,
          })).schema.use(schema);

          const first = map.set(["count"], 1);

          let rejected = false;

          try {
            map.set(
              ["count"],
              "invalid" as unknown as number
            );
          } catch {
            rejected = true;
          }

          const next = map.set(["count"], 2);

          return {
            rejected,
            first: {
              prevRev: first.prevRev,
              rev: first.rev,
            },
            next: {
              prevRev: next.prevRev,
              rev: next.rev,
            },
            root: map.snap(),
          };
        },
        expected: {
          rejected: true,
          first: {
            prevRev: 0,
            rev: 1,
          },
          next: {
            prevRev: 1,
            rev: 2,
          },
          root: {
            count: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "schema-rejected-batch-does-not-consume-rev", name: "schema rejected batch does not consume rev",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number,
            }),
          }));

          const map = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
              age: 37,
            },
          })).schema.use(schema);

          const first = map.set(["user", "age"], 38);

          let rejected = false;

          try {
            map.batch((tx) => {
              tx.set(["user", "name"], "Grace");
              tx.set(
                ["user", "age"],
                "invalid" as unknown as number
              );
            });
          } catch {
            rejected = true;
          }

          const next = map.set(["user", "age"], 39);

          return {
            rejected,
            first: {
              prevRev: first.prevRev,
              rev: first.rev,
            },
            next: {
              prevRev: next.prevRev,
              rev: next.rev,
            },
            root: map.snap(),
          };
        },
        expected: {
          rejected: true,
          first: {
            prevRev: 0,
            rev: 1,
          },
          next: {
            prevRev: 1,
            rev: 2,
          },
          root: {
            user: {
              name: "Ada",
              age: 39,
            },
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "semantic-splice-advances-rev-once", name: "semantic splice advances rev once",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            items: [0, 1, 2, 3],
          }));

          const commit = map.splice(
            ["items"],
            1,
            2,
            "x",
            "y"
          );

          const op = commit.ops[0];

          return {
            changed: commit.changed,
            prevRev: commit.prevRev,
            rev: commit.rev,
            opKind: op?.kind,
            root: map.snap(),
          };
        },
        expected: {
          changed: true,
          prevRev: 0,
          rev: 1,
          opKind: "splice",
          root: {
            items: [0, "x", "y", 3],
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "changed-batch-after-prior-commit-advances-from-current-rev", name: "changed batch after prior commit advances from current rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
            label: "zero",
          }));

          const first = map.set(["count"], 1);

          const batch = map.batch((tx) => {
            tx.set(["count"], 2);
            tx.set(["label"], "two");
          });

          return {
            firstrev: first.rev,
            batch: {
              prevRev: batch.prevRev,
              rev: batch.rev,
              opCount: batch.ops.length,
            },
          };
        },
        expected: {
          firstrev: 1,
          batch: {
            prevRev: 1,
            rev: 2,
            opCount: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "capture-returns-initial-rev-and-value", name: "capture returns initial rev and value",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const capture = map.capture();

          return {
            rev: capture.rev,
            value: map.snap(),
            mapRev: map.rev,
            frozen: Object.isFrozen(capture),
          };
        },
        expected: {
          rev: 0,
          value: {
            count: 0,
          },
          mapRev: 0,
          frozen: true,
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "capture-reflects-current-committed-rev", name: "capture reflects current committed rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const commit = map.set(["count"], 1);
          const capture = map.capture();

          return {
            commitRev: commit.rev,
            captureRev: capture.rev,
            mapRev: map.rev,
            value: map.snap(),
          };
        },
        expected: {
          commitRev: 1,
          captureRev: 1,
          mapRev: 1,
          value: {
            count: 1,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "capture-remains-stable-after-later-writes", name: "capture remains stable after later writes",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
              age: 37,
            },
          }));

          const before = map.capture();

          map.set(["user", "name"], "Grace");
          map.set(["user", "age"], 38);

          const after = map.capture();

          return {
            before,
            after,
            mapRev: map.rev,
          };
        },
        expected: {
          before: {
            rev: 0,
            format: "structural-json",
            payload: "{\n  \"user\": {\n    \"name\": \"Ada\",\n    \"age\": 37\n  }\n}",
          },
          after: {
            rev: 2,
            format: "structural-json",
            payload: "{\n  \"user\": {\n    \"name\": \"Grace\",\n    \"age\": 38\n  }\n}",
          },
          mapRev: 2,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "apply-replaces-root-from-current-rev", name: "apply replaces root from current rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
            label: "zero",
          }));
          const incoming = hson.liveMap.fromJson({ count: 1, label: "one" }).capture();

          const commit = apply_fixture(map, {
            prevRev: 0,
            format: incoming.format,
            payload: incoming.payload,
          });

          const op = commit.ops[0];

          return {
            changed: commit.changed,
            prevRev: commit.prevRev,
            rev: commit.rev,
            mapRev: map.rev,
            opCount: commit.ops.length,
            opKind: op?.kind,
            opPath: op?.path,
            root: map.snap(),
          };
        },
        expected: {
          changed: true,
          prevRev: 0,
          rev: 1,
          mapRev: 1,
          opCount: 1,
          opKind: "replace",
          opPath: [],
          root: {
            count: 1,
            label: "one",
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "apply-accepts-a-current-capture-rev", name: "apply accepts a current capture rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          map.set(["count"], 1);

          const capture = map.capture();
          const incoming = hson.liveMap.fromJson({ count: 2 }).capture();

          const commit = apply_fixture(map, {
            prevRev: capture.rev,
            format: incoming.format,
            payload: incoming.payload,
          });

          return {
            captureRev: capture.rev,
            commit: {
              changed: commit.changed,
              prevRev: commit.prevRev,
              rev: commit.rev,
            },
            mapRev: map.rev,
            root: map.snap(),
          };
        },
        expected: {
          captureRev: 1,
          commit: {
            changed: true,
            prevRev: 1,
            rev: 2,
          },
          mapRev: 2,
          root: {
            count: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "apply-rejects-stale-rev-without-changing-state", name: "apply rejects stale rev without changing state",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const staleCapture = map.capture();
          const incoming = hson.liveMap.fromJson({ count: 2 }).capture();

          map.set(["count"], 1);

          let errorResult: {
            threw: boolean;
            name?: string;
            code?: string;
            message?: string;
            expectedRev?: number;
            actualRev?: number;
          } = {
            threw: false,
          };

          try {
            apply_fixture(map, {
              prevRev: staleCapture.rev,
              format: incoming.format,
              payload: incoming.payload,
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
              message: revError.message,
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
            mapRev: map.rev,
            root: map.snap(),
          };
        },
        expected: {
          error: {
            threw: true,
            name: "LiveMapRevError",
            code: "STALE_REV",
            message: "LiveMap revision mismatch: expected 0, actual 1",
            expectedRev: 0,
            actualRev: 1,
          },
          mapRev: 1,
          root: {
            count: 1,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "unchanged-apply-retains-current-rev", name: "unchanged apply retains current rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const first = map.set(["count"], 1);
          const incoming = hson.liveMap.fromJson({ count: 1 }).capture();

          const commit = apply_fixture(map, {
            prevRev: map.rev,
            format: incoming.format,
            payload: incoming.payload,
          });

          return {
            firstRev: first.rev,
            commit: {
              changed: commit.changed,
              prevRev: commit.prevRev,
              rev: commit.rev,
              ops: commit.ops.length,
            },
            mapRev: map.rev,
            root: map.snap(),
          };
        },
        expected: {
          firstRev: 1,
          commit: {
            changed: false,
            prevRev: 1,
            rev: 1,
            ops: 0,
          },
          mapRev: 1,
          root: {
            count: 1,
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "schema-rejected-apply-does-not-consume-rev", name: "schema rejected apply does not consume rev",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number,
            }),
          }));

          const map = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
              age: 37,
            },
          })).schema.use(schema);

          const first = map.set(["user", "age"], 38);
          const incoming = hson.liveMap.fromJson({
            user: {
              name: "Grace",
              age: "invalid",
            },
          }).capture();

          let rejected = false;
          let errorName: string | undefined;
          let issueCode: string | undefined;

          try {
            apply_fixture(map, {
              prevRev: map.rev,
              format: incoming.format,
              payload: incoming.payload,
            });
          } catch (error) {
            rejected = true;

            const schemaError = error as Error & {
              readonly issues?: readonly {
                readonly code: string;
              }[];
            };

            errorName = schemaError.name;
            issueCode = schemaError.issues?.[0]?.code;
          }

          const next = map.set(["user", "age"], 39);

          return {
            rejected,
            errorName,
            issueCode,
            first: {
              prevRev: first.prevRev,
              rev: first.rev,
            },
            next: {
              prevRev: next.prevRev,
              rev: next.rev,
            },
            mapRev: map.rev,
            root: map.snap(),
          };
        },
        expected: {
          rejected: true,
          errorName: "LiveMapSchemaError",
          issueCode: "TYPE_MISMATCH",
          first: {
            prevRev: 0,
            rev: 1,
          },
          next: {
            prevRev: 1,
            rev: 2,
          },
          mapRev: 2,
          root: {
            user: {
              name: "Ada",
              age: 39,
            },
          },
        },
      }),

      read_case({
        suite: SUITE,
        caseId: "apply-rejects-invalid-expected-rev-before-mutation", name: "apply rejects invalid expected rev before mutation",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));
          const incoming = hson.liveMap.fromJson({ count: 1 }).capture();

          let threw = false;
          let message: string | undefined;

          try {
            apply_fixture(map, {
              prevRev: -1,
              format: incoming.format,
              payload: incoming.payload,
            });
          } catch (error) {
            threw = true;
            message = error instanceof Error
              ? error.message
              : String(error);
          }

          return {
            threw,
            message,
            mapRev: map.rev,
            root: map.snap(),
          };
        },
        expected: {
          threw: true,
          message: "LiveMap expected revision is not valid: -1",
          mapRev: 0,
          root: {
            count: 0,
          },
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "replay-applies-a-changed-commit-to-a-matching-map", name: "replay applies a changed commit to a matching map",
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

          const replayCommit = replay_fixture(target,{
            prevRev: target.rev,
            format: sourceCommit.format,
            payload: sourceCommit.payload,
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
        caseId: "replay-applies-a-multi-operation-commit-atomically", name: "replay applies a multi operation commit atomically",
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

          const replayCommit = replay_fixture(target,{
            prevRev: 0,
            format: sourceCommit.format,
            payload: sourceCommit.payload,
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
        caseId: "replay-preserves-semantic-splice-operations", name: "replay preserves semantic splice operations",
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

          const replayCommit = replay_fixture(target,{
            prevRev: 0,
            format: sourceCommit.format,
            payload: sourceCommit.payload,
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
        caseId: "empty-replay-retains-current-rev", name: "empty replay retains current rev",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          map.set(["count"], 1);

          const commit = replay_fixture(map,{
            prevRev: map.rev,
            format: "structural-json",
            payload: "[]",
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
        caseId: "replay-rejects-stale-rev-without-changing-state", name: "replay rejects stale rev without changing state",
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
            replay_fixture(target,{
              prevRev: 0,
              format: sourceCommit.format,
              payload: sourceCommit.payload,
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
        caseId: "replay-rejects-conflicting-prev-without-consuming-rev", name: "replay rejects conflicting prev without consuming rev",
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
            replay_fixture(target,{
              prevRev: 0,
              format: sourceCommit.format,
              payload: sourceCommit.payload,
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
        caseId: "schema-rejected-replay-is-atomic-and-does-not-consume-rev", name: "schema rejected replay is atomic and does not consume rev",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number,
            }),
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
          })).schema.use(schema);

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
            replay_fixture(target,{
              prevRev: 0,
              format: sourceCommit.format,
              payload: sourceCommit.payload,
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
    ] as const,
  };
}
