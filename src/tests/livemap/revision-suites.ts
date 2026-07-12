// livemap/revision-suite.ts

import  { make_livemap_core, define_livemap_schema } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import  { json_root_node } from "./core-helpers";
import  { read_case } from "./handle-helpers";


export function livemap_suite_revision(): TestSuite {
  const SUITE = "livemap/revision";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "first changed commit advances revision from zero",
        input: {},
        act: () => {
          const map = make_livemap_core(json_root_node({
            count: 0,
          }));

          const commit = map.set(["count"], 1);

          return {
            changed: commit.changed,
            previousRevision: commit.previousRevision,
            revision: commit.revision,
            ops: commit.ops.length,
            root: map.snap(),
          };
        },
        expected: {
          changed: true,
          previousRevision: 0,
          revision: 1,
          ops: 1,
          root: {
            count: 1,
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "successive changed commits advance monotonically",
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
              previousRevision: first.previousRevision,
              revision: first.revision,
            },
            second: {
              previousRevision: second.previousRevision,
              revision: second.revision,
            },
            third: {
              previousRevision: third.previousRevision,
              revision: third.revision,
            },
            root: map.snap(),
          };
        },
        expected: {
          first: {
            previousRevision: 0,
            revision: 1,
          },
          second: {
            previousRevision: 1,
            revision: 2,
          },
          third: {
            previousRevision: 2,
            revision: 3,
          },
          root: {
            count: 3,
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "unchanged commit retains current revision",
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
              previousRevision: changed.previousRevision,
              revision: changed.revision,
            },
            unchanged: {
              changed: unchanged.changed,
              previousRevision: unchanged.previousRevision,
              revision: unchanged.revision,
              ops: unchanged.ops.length,
            },
            next: {
              changed: next.changed,
              previousRevision: next.previousRevision,
              revision: next.revision,
            },
          };
        },
        expected: {
          changed: {
            changed: true,
            previousRevision: 0,
            revision: 1,
          },
          unchanged: {
            changed: false,
            previousRevision: 1,
            revision: 1,
            ops: 0,
          },
          next: {
            changed: true,
            previousRevision: 1,
            revision: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "multi operation batch advances revision once",
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
            previousRevision: commit.previousRevision,
            revision: commit.revision,
            opCount: commit.ops.length,
            root: map.snap(),
          };
        },
        expected: {
          changed: true,
          previousRevision: 0,
          revision: 1,
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
        name: "unchanged batch retains current revision",
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
            firstRevision: first.revision,
            unchanged: {
              changed: unchanged.changed,
              previousRevision: unchanged.previousRevision,
              revision: unchanged.revision,
              ops: unchanged.ops.length,
            },
            next: {
              previousRevision: next.previousRevision,
              revision: next.revision,
            },
          };
        },
        expected: {
          firstRevision: 1,
          unchanged: {
            changed: false,
            previousRevision: 1,
            revision: 1,
            ops: 0,
          },
          next: {
            previousRevision: 1,
            revision: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema rejected write does not consume revision",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            count: s.number,
          }));

          const map = make_livemap_core(json_root_node({
            count: 0,
          })).withSchema(schema);

          const first = map.set(["count"], 1);

          let rejected = false;

          try {
            map.set(
              ["count"],
              "invalid" as unknown as number,
            );
          } catch {
            rejected = true;
          }

          const next = map.set(["count"], 2);

          return {
            rejected,
            first: {
              previousRevision: first.previousRevision,
              revision: first.revision,
            },
            next: {
              previousRevision: next.previousRevision,
              revision: next.revision,
            },
            root: map.snap(),
          };
        },
        expected: {
          rejected: true,
          first: {
            previousRevision: 0,
            revision: 1,
          },
          next: {
            previousRevision: 1,
            revision: 2,
          },
          root: {
            count: 2,
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema rejected batch does not consume revision",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
              age: s.number,
            },
          }));

          const map = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
              age: 37,
            },
          })).withSchema(schema);

          const first = map.set(["user", "age"], 38);

          let rejected = false;

          try {
            map.batch((tx) => {
              tx.set(["user", "name"], "Grace");
              tx.set(
                ["user", "age"],
                "invalid" as unknown as number,
              );
            });
          } catch {
            rejected = true;
          }

          const next = map.set(["user", "age"], 39);

          return {
            rejected,
            first: {
              previousRevision: first.previousRevision,
              revision: first.revision,
            },
            next: {
              previousRevision: next.previousRevision,
              revision: next.revision,
            },
            root: map.snap(),
          };
        },
        expected: {
          rejected: true,
          first: {
            previousRevision: 0,
            revision: 1,
          },
          next: {
            previousRevision: 1,
            revision: 2,
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
        name: "semantic splice advances revision once",
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
            "y",
          );

          const op = commit.ops[0];

          return {
            changed: commit.changed,
            previousRevision: commit.previousRevision,
            revision: commit.revision,
            opKind: op?.kind,
            root: map.snap(),
          };
        },
        expected: {
          changed: true,
          previousRevision: 0,
          revision: 1,
          opKind: "splice",
          root: {
            items: [0, "x", "y", 3],
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "changed batch after prior commit advances from current revision",
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
            firstRevision: first.revision,
            batch: {
              previousRevision: batch.previousRevision,
              revision: batch.revision,
              opCount: batch.ops.length,
            },
          };
        },
        expected: {
          firstRevision: 1,
          batch: {
            previousRevision: 1,
            revision: 2,
            opCount: 2,
          },
        },
      }),
    ] as const,
  };
}