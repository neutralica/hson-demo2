// core-suite.ts

import { hson } from "hson-live";
import { make_livemap_core } from "hson-live/livemap";
import type { TestSuite } from "../../harness/core/test-contracts";
import { equal_row, make_core_set_case, make_core_snap_case, preview_value } from "./test-helpers";
import type { LiveMapFeedEventPreview } from "./types";
import { make_core_set_path_copy_case, make_core_set_many_case, make_core_set_many_feed_case, make_core_set_many_path_copy_case, json_root_node, preview_core_feed_event, make_core_delete_case, make_core_delete_feed_case, make_core_delete_path_copy_case, make_core_delete_throw_case, make_core_feed_case, make_core_feed_dispose_case, make_core_at_snap_case, make_core_at_set_case, make_core_at_feed_case, make_core_at_path_copy_case, make_core_at_original_path_stability_case } from "./core-helpers";

export function livemap_suites_core(): TestSuite {
  const SUITE = "livemap/core";

  return {
    suite: SUITE,
    cases: [
      make_core_snap_case({
        suite: SUITE,
        caseId: "core-snap-root-object", name: "core snap root object",
        input: { user: { name: "Ada" } },
        expectedOutput: { user: { name: "Ada" } },
      }),
      make_core_snap_case({
        suite: SUITE,
        caseId: "core-snap-nested-object-property", name: "core snap nested object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expectedOutput: "Ada",
      }),
      make_core_set_case({
        suite: SUITE,
        caseId: "core-set-existing-object-property", name: "core set existing object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        ],
        expectedRoot: { user: { name: "Grace" } },
      }),
      {
        suite: SUITE,
        caseId: "core-set-missing-object-property-throws", name: "core set missing object property throws",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user", "role"]),
          value: preview_value("admin"),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          let message = "";

          try {
            map.set(["user", "role"], "admin");
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row("core set missing object property throws: error", message, "LiveMap set path does not resolve: [\"user\", \"role\"]"),
              equal_row("core set missing object property throws: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      make_core_set_case({
        suite: SUITE,
        caseId: "core-set-existing-object-property-unchanged", name: "core set existing object property unchanged",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Ada",
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_core_set_case({
        suite: SUITE,
        caseId: "core-set-existing-array-item", name: "core set existing array item",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0],
        value: { name: "Margaret" },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["users", 0, "name"], prev: "Ada", next: "Margaret" },
        ],
        expectedRoot: { users: [{ name: "Margaret" }, { name: "Grace" }] },
      }),
      make_core_set_case({
        suite: SUITE,
        caseId: "core-set-existing-array-item-property", name: "core set existing array item property",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 1, "name"],
        value: "Margaret",
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["users", 1, "name"], prev: "Grace", next: "Margaret" },
        ],
        expectedRoot: { users: [{ name: "Ada" }, { name: "Margaret" }] },
      }),
      make_core_set_path_copy_case({
        suite: SUITE,
        caseId: "core-set-commit-path-is-stable-after-original-path-mutates", name: "core set commit path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        value: "Grace",
        expectedCommitPath: ["user", "name"],
        expectedRoot: { user: { name: "Grace", role: "user" } },
      }),
      make_core_set_many_case({
        suite: SUITE,
        caseId: "core-setmany-writes-multiple-properties-as-child-ops", name: "core setMany writes multiple properties as child ops",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Grace", role: "admin" },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedRoot: { user: { name: "Grace", role: "admin" } },
      }),
      make_core_set_many_case({
        suite: SUITE,
        caseId: "core-setmany-omits-unchanged-writes-from-commit", name: "core setMany omits unchanged writes from commit",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Ada", role: "admin" },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: "user", next: "admin" },
        ],
        expectedRoot: { user: { name: "Ada", role: "admin" } },
      }),
      make_core_set_many_case({
        suite: SUITE,
        caseId: "core-setmany-unchanged-batch-produces-empty-ops", name: "core setMany unchanged batch produces empty ops",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Ada", role: "user" },
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada", role: "user" } },
      }),
      make_core_set_many_feed_case({
        suite: SUITE,
        caseId: "core-setmany-feed-emits-one-event-with-first-matching-child-op", name: "core setMany feed emits one event with first matching child op",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user"],
        setPath: ["user"],
        values: { name: "Grace", role: "admin" },
        expectedEvents: [
          {
            path: ["user"],
            value: { name: "Grace", role: "admin" },
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
      make_core_set_many_path_copy_case({
        suite: SUITE,
        caseId: "core-setmany-commit-paths-are-stable-after-original-path-mutates", name: "core setMany commit paths are stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        mutateOriginalPathTo: ["profile"],
        values: { name: "Grace", role: "admin" },
        expectedCommitPaths: [
          ["user", "name"],
          ["user", "role"],
        ],
        expectedRoot: { user: { name: "Grace", role: "admin" } },
      }),
      {
        suite: SUITE,
        caseId: "core-schema-returns-undefined-before-attachment", name: "core schema returns undefined before attachment",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));

          return {
            assertRows: [
              equal_row("core schema returns undefined before attachment: schema", map.schema.get(), undefined),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "core-replace-root-object", name: "core replace root object",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const commit = map.replace({ user: { name: "Grace" }, ready: true });

          return {
            assertRows: [
              equal_row("core replace root object: changed", commit.changed, true),
              equal_row("core replace root object: ops", commit.ops, [
                {
                  kind: "replace",
                  path: [],
                  prev: { user: { name: "Ada" } },
                  next: { user: { name: "Grace" }, ready: true },
                },
              ]),
              equal_row("core replace root object: root", map.snap(), { user: { name: "Grace" }, ready: true }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "core-replace-unchanged-root-produces-empty-ops", name: "core replace unchanged root produces empty ops",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const commit = map.replace({ user: { name: "Ada" } });

          return {
            assertRows: [
              equal_row("core replace unchanged root produces empty ops: changed", commit.changed, false),
              equal_row("core replace unchanged root produces empty ops: ops", commit.ops, []),
              equal_row("core replace unchanged root produces empty ops: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "core-replace-notifies-root-feed-once", name: "core replace notifies root feed once",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const events: LiveMapFeedEventPreview[] = [];

          map.feed([], (event) => {
            events.push(preview_core_feed_event(event));
          });

          map.replace({ user: { name: "Grace" } });

          return {
            assertRows: [
              equal_row("core replace notifies root feed once: events", events, [
                {
                  path: [],
                  value: { user: { name: "Grace" } },
                  opPath: [],
                  opPrev: { user: { name: "Ada" } },
                  opNext: { user: { name: "Grace" } },
                },
              ]),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "core-replace-notifies-child-feed-with-final-child-value", name: "core replace notifies child feed with final child value",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const events: LiveMapFeedEventPreview[] = [];

          map.feed(["user", "name"], (event) => {
            events.push(preview_core_feed_event(event));
          });

          map.replace({ user: { name: "Grace" } });

          return {
            assertRows: [
              equal_row("core replace notifies child feed with final child value: events", events, [
                {
                  path: ["user", "name"],
                  value: "Grace",
                  opPath: [],
                  opPrev: { user: { name: "Ada" } },
                  opNext: { user: { name: "Grace" } },
                },
              ]),
            ],
          };
        },
      },
      make_core_delete_case({
        suite: SUITE,
        caseId: "core-delete-existing-object-property", name: "core delete existing object property",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        expectedChanged: true,
        expectedOps: [
          { kind: "delete", path: ["user", "name"], prev: "Ada", next: undefined },
        ],
        expectedRoot: { user: { role: "user" } },
      }),
      {
        suite: SUITE,
        caseId: "core-delete-missing-object-property-throws", name: "core delete missing object property throws",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user", "role"]),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          let message = "";

          try {
            map.delete(["user", "role"]);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row("core delete missing object property throws: error", message, "LiveMap delete path does not resolve: [\"user\", \"role\"]"),
              equal_row("core delete missing object property throws: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      make_core_delete_feed_case({
        suite: SUITE,
        caseId: "core-delete-feed-exact-path-hears-delete", name: "core delete feed exact path hears delete",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user", "name"],
        deletePath: ["user", "name"],
        expectedEvents: [
          {
            path: ["user", "name"],
            value: undefined,
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: undefined,
          },
        ],
      }),
      make_core_delete_feed_case({
        suite: SUITE,
        caseId: "core-delete-feed-parent-hears-child-delete", name: "core delete feed parent hears child delete",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user"],
        deletePath: ["user", "name"],
        expectedEvents: [
          {
            path: ["user"],
            value: { role: "user" },
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: undefined,
          },
        ],
      }),
      make_core_delete_path_copy_case({
        suite: SUITE,
        caseId: "core-delete-commit-path-is-stable-after-original-path-mutates", name: "core delete commit path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        expectedCommitPath: ["user", "name"],
        expectedRoot: { user: { role: "user" } },
      }),
      make_core_delete_throw_case({
        suite: SUITE,
        caseId: "core-delete-root-throws", name: "core delete root throws",
        input: { user: { name: "Ada" } },
        path: [],
        expectedMessage: "LiveMap editor cannot delete the root node yet.",
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_core_delete_throw_case({
        suite: SUITE,
        caseId: "core-delete-array-index-throws", name: "core delete array index throws",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0],
        expectedMessage: "LiveMap editor cannot delete array indexes yet: [\"users\", 0]",
        expectedRoot: { users: [{ name: "Ada" }, { name: "Grace" }] },
      }),
      make_core_feed_case({
        suite: SUITE,
        caseId: "core-feed-exact-path-hears-set", name: "core feed exact path hears set",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
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
      make_core_feed_case({
        suite: SUITE,
        caseId: "core-feed-parent-hears-child-set", name: "core feed parent hears child set",
        input: { user: { name: "Ada" } },
        feedPath: ["user"],
        setPath: ["user", "name"],
        value: "Grace",
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
      make_core_feed_case({
        suite: SUITE,
        caseId: "core-feed-array-parent-hears-indexed-set", name: "core feed array parent hears indexed set",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        feedPath: ["users"],
        setPath: ["users", 0],
        value: { name: "Margaret" },
        expectedEvents: [
          {
            path: ["users"],
            value: [{ name: "Margaret" }, { name: "Grace" }],
            opPath: ["users", 0, "name"],
            opPrev: "Ada",
            opNext: "Margaret",
          },
        ],
      }),
      make_core_feed_case({
        suite: SUITE,
        caseId: "core-feed-array-index-hears-nested-child-set", name: "core feed array index hears nested child set",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        feedPath: ["users", 1],
        setPath: ["users", 1, "name"],
        value: "Margaret",
        expectedEvents: [
          {
            path: ["users", 1],
            value: { name: "Margaret" },
            opPath: ["users", 1, "name"],
            opPrev: "Grace",
            opNext: "Margaret",
          },
        ],
      }),
      make_core_feed_case({
        suite: SUITE,
        caseId: "core-feed-sibling-ignores-set", name: "core feed sibling ignores set",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user", "role"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [],
      }),
      make_core_feed_case({
        suite: SUITE,
        caseId: "core-feed-ignores-unchanged-set", name: "core feed ignores unchanged set",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Ada",
        expectedEvents: [],
      }),
      make_core_feed_dispose_case({
        suite: SUITE,
        caseId: "core-feed-disposer-stops-later-events", name: "core feed disposer stops later events",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [],
      }),
      make_core_at_snap_case({
        suite: SUITE,
        caseId: "core-at-snap-reads-scoped-path", name: "core at snap reads scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expected: "Ada",
      }),
      make_core_at_set_case({
        suite: SUITE,
        caseId: "core-at-set-writes-scoped-path", name: "core at set writes scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedCommitChanged: true,
        expectedRoot: { user: { name: "Grace" } },
      }),
      make_core_at_feed_case({
        suite: SUITE,
        caseId: "core-at-feed-hears-scoped-path", name: "core at feed hears scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
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
      make_core_at_path_copy_case({
        suite: SUITE,
        caseId: "core-at-path-returns-copy", name: "core at path returns copy",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        mutateReturnedPathTo: ["user", "role"],
        expectedHandlePath: ["user", "name"],
      }),
      make_core_at_original_path_stability_case({
        suite: SUITE,
        caseId: "core-at-path-is-stable-after-original-path-mutates", name: "core at path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        value: "Grace",
        expectedRoot: { user: { name: "Grace", role: "user" } },
      }),
      {
        suite: SUITE,
        caseId: "core-setmany-preserves-unspecified-siblings", name: "core setMany preserves unspecified siblings",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37, role: "admin" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({
            user: { name: "Ada", age: 37, role: "admin" },
          }));

          const commit = map.setMany(["user"], { name: "Grace" });

          return {
            assertRows: [
              equal_row("core setMany preserves unspecified siblings: changed", commit.changed, true),
              equal_row("core setMany preserves unspecified siblings: root", map.snap(), {
                user: { name: "Grace", age: 37, role: "admin" },
              }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "core-write-preserves-unspecified-siblings", name: "core write preserves unspecified siblings",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37, role: "admin" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({
            user: { name: "Ada", age: 37, role: "admin" },
          }));

          const commit = map.setMany(["user"], { name: "Grace" });

          return {
            assertRows: [
              equal_row("core write preserves unspecified siblings: changed", commit.changed, true),
              equal_row("core write preserves unspecified siblings: root", map.snap(), {
                user: { name: "Grace", age: 37, role: "admin" },
              }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "core-rev-starts-at-zero", name: "core rev starts at zero",
        meta: {
          input: preview_value({ count: 0 }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ count: 0 }));

          return {
            assertRows: [
              equal_row("core rev starts at zero: rev", map.rev, 0),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "core-rev-advances-with-changed-commits", name: "core rev advances with changed commits",
        meta: {
          input: preview_value({ count: 0 }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ count: 0 }));
          const first = map.set(["count"], 1);
          const second = map.set(["count"], 2);

          return {
            assertRows: [
              equal_row(
                "core rev advances with changed commits: first commit",
                first.rev,
                1,
              ),
              equal_row(
                "core rev advances with changed commits: second commit",
                second.rev,
                2,
              ),
              equal_row(
                "core rev advances with changed commits: map",
                map.rev,
                2,
              ),
            ],
          };
        },
      },


    ] as const,
  };
}
