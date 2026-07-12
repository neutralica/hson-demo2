// livemap/rev-suite.ts

import  { make_livemap_core, define_livemap_schema } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import  { json_root_node } from "./core-helpers";
import  { read_case } from "./handle-helpers";


export function livemap_suite_rev(): TestSuite {
  const SUITE = "livemap/rev";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "first changed commit advances rev from zero",
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
        name: "unchanged commit retains current rev",
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
        name: "multi operation batch advances rev once",
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
        name: "unchanged batch retains current rev",
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
        name: "schema rejected write does not consume rev",
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
        name: "schema rejected batch does not consume rev",
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
        name: "semantic splice advances rev once",
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
        name: "changed batch after prior commit advances from current rev",
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
    ] as const,
  };
}