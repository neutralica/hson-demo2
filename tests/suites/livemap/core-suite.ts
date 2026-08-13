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
        name: "core snap root object",
        input: { user: { name: "Ada" } },
        expectedOutput: { user: { name: "Ada" } },
      }),
      make_core_snap_case({
        suite: SUITE,
        name: "core snap nested object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expectedOutput: "Ada",
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set existing object property",
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
        name: "core set missing object property throws",
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
        name: "core set existing object property unchanged",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Ada",
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set existing array item",
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
        name: "core set existing array item property",
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
        name: "core set commit path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        value: "Grace",
        expectedCommitPath: ["user", "name"],
        expectedRoot: { user: { name: "Grace", role: "user" } },
      }),
      make_core_set_many_case({
        suite: SUITE,
        name: "core setMany writes multiple properties as child ops",
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
        name: "core setMany omits unchanged writes from commit",
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
        name: "core setMany unchanged batch produces empty ops",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user"],
        values: { name: "Ada", role: "user" },
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada", role: "user" } },
      }),
      make_core_set_many_feed_case({
        suite: SUITE,
        name: "core setMany feed emits one event with first matching child op",
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
        name: "core setMany commit paths are stable after original path mutates",
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
        name: "core schema returns undefined before attachment",
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
        name: "core schema.use returns core and stores schema",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));
          const returned: unknown = map.schema.use(schema);

          return {
            assertRows: [
              equal_row("core schema.use returns core and stores schema: returned", returned === map, true),
              equal_row("core schema.use returns core and stores schema: schema", map.schema.get() === schema, true),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core replace root object",
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
        name: "core replace unchanged root produces empty ops",
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
        name: "core replace notifies root feed once",
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
        name: "core replace notifies child feed with final child value",
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
      {
        suite: SUITE,
        name: "core schema allows valid replace",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));

          map.schema.use(schema);
          const commit = map.replace({ user: { name: "Grace" } });

          return {
            assertRows: [
              equal_row("core schema allows valid replace: changed", commit.changed, true),
              equal_row("core schema allows valid replace: root", map.snap(), { user: { name: "Grace" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema rejects invalid replace before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));
          let message = "";

          map.schema.use(schema);

          try {
            map.replace({ user: { name: 12 } });
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row(
                "core schema rejects invalid replace before mutation: error",
                message,
                "LiveMap schema rejected value at []:\n- LiveMap schema expected string at [\"user\",\"name\"], received number",
              ),
              equal_row("core schema rejects invalid replace before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema.use rejects invalid current root",
        meta: {
          input: preview_value({ user: { name: 12 } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: 12 } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));
          let message = "";

          try {
            map.schema.use(schema);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row(
                "core schema.use rejects invalid current root: error",
                message,
                "LiveMap schema rejected value at []:\n- LiveMap schema expected string at [\"user\",\"name\"], received number",
              ),
              equal_row("core schema.use rejects invalid current root: schema", map.schema.get(), undefined),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema allows valid set",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));

          map.schema.use(schema);
          const commit = map.set(["user", "name"], "Grace");

          return {
            assertRows: [
              equal_row("core schema allows valid set: changed", commit.changed, true),
              equal_row("core schema allows valid set: root", map.snap(), { user: { name: "Grace" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema rejects invalid set before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));
          let message = "";

          map.schema.use(schema);

          try {
            map.set(["user", "name"], 12);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row(
                "core schema rejects invalid set before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received number",
              ),
              equal_row("core schema rejects invalid set before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema allows valid setMany",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada", age: 37 } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number,
            }),
          }));

          map.schema.use(schema);
          const commit = map.setMany(["user"], { name: "Grace", age: 38 });

          return {
            assertRows: [
              equal_row("core schema allows valid setMany: changed", commit.changed, true),
              equal_row("core schema allows valid setMany: ops", commit.ops, [
                { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
                { kind: "set", path: ["user", "age"], prev: 37, next: 38 },
              ]),
              equal_row("core schema allows valid setMany: root", map.snap(), { user: { name: "Grace", age: 38 } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema rejects invalid setMany before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada", age: 37 } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number,
            }),
          }));
          let message = "";

          map.schema.use(schema);

          try {
            map.setMany(["user"], { name: "Grace", age: "old" });
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row(
                "core schema rejects invalid setMany before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"age\"]:\n- LiveMap schema expected number at [\"user\",\"age\"], received string",
              ),
              equal_row("core schema rejects invalid setMany before mutation: root", map.snap(), { user: { name: "Ada", age: 37 } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema permits set on unknown schema path",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));

          map.schema.use(schema);
          map.setMany([], { meta: { draft: true } });

          return {
            assertRows: [
              equal_row("core schema permits set on unknown schema path: root", map.snap(), {
                user: { name: "Ada" },
                meta: { draft: true },
              }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema rejects delete required field before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada", age: 37 } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number.optional,
            }),
          }));
          let message = "";

          map.schema.use(schema);

          try {
            map.delete(["user", "name"]);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row(
                "core schema rejects delete required field before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received missing",
              ),
              equal_row("core schema rejects delete required field before mutation: root", map.snap(), { user: { name: "Ada", age: 37 } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema allows delete optional field",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada", age: 37 } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number.optional,
            }),
          }));

          map.schema.use(schema);
          const commit = map.delete(["user", "age"]);

          return {
            assertRows: [
              equal_row("core schema allows delete optional field: changed", commit.changed, true),
              equal_row("core schema allows delete optional field: ops", commit.ops, [
                { kind: "delete", path: ["user", "age"], prev: 37, next: undefined },
              ]),
              equal_row("core schema allows delete optional field: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema allows delete unknown field regression coverage",
        meta: {
          input: preview_value({ user: { name: "Ada", role: "admin" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada", role: "admin" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));

          map.schema.use(schema);
          const commit = map.delete(["user", "role"]);

          return {
            assertRows: [
              equal_row("core schema allows delete unknown field: changed", commit.changed, true),
              equal_row("core schema allows delete unknown field: ops", commit.ops, [
                { kind: "delete", path: ["user", "role"], prev: "admin", next: undefined },
              ]),
              equal_row("core schema allows delete unknown field: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema rejects delete required parent regression coverage",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));
          let message = "";

          map.schema.use(schema);

          try {
            map.delete(["user"]);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row(
                "core schema rejects delete required parent before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\"]:\n- LiveMap schema expected object at [\"user\"], received missing",
              ),
              equal_row("core schema rejects delete required parent before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      make_core_delete_case({
        suite: SUITE,
        name: "core delete existing object property",
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
        name: "core delete missing object property throws",
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
        name: "core delete feed exact path hears delete",
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
        name: "core delete feed parent hears child delete",
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
        name: "core delete commit path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        expectedCommitPath: ["user", "name"],
        expectedRoot: { user: { role: "user" } },
      }),
      make_core_delete_throw_case({
        suite: SUITE,
        name: "core delete root throws",
        input: { user: { name: "Ada" } },
        path: [],
        expectedMessage: "LiveMap editor cannot delete the root node yet.",
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_core_delete_throw_case({
        suite: SUITE,
        name: "core delete array index throws",
        input: { users: [{ name: "Ada" }, { name: "Grace" }] },
        path: ["users", 0],
        expectedMessage: "LiveMap editor cannot delete array indexes yet: [\"users\", 0]",
        expectedRoot: { users: [{ name: "Ada" }, { name: "Grace" }] },
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed exact path hears set",
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
        name: "core feed parent hears child set",
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
        name: "core feed array parent hears indexed set",
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
        name: "core feed array index hears nested child set",
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
        name: "core feed sibling ignores set",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user", "role"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed ignores unchanged set",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Ada",
        expectedEvents: [],
      }),
      make_core_feed_dispose_case({
        suite: SUITE,
        name: "core feed disposer stops later events",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [],
      }),
      make_core_at_snap_case({
        suite: SUITE,
        name: "core at snap reads scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expected: "Ada",
      }),
      make_core_at_set_case({
        suite: SUITE,
        name: "core at set writes scoped path",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedCommitChanged: true,
        expectedRoot: { user: { name: "Grace" } },
      }),
      make_core_at_feed_case({
        suite: SUITE,
        name: "core at feed hears scoped path",
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
        name: "core at path returns copy",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        mutateReturnedPathTo: ["user", "role"],
        expectedHandlePath: ["user", "name"],
      }),
      make_core_at_original_path_stability_case({
        suite: SUITE,
        name: "core at path is stable after original path mutates",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        mutateOriginalPathTo: ["user", "role"],
        value: "Grace",
        expectedRoot: { user: { name: "Grace", role: "user" } },
      }),
      {
        suite: SUITE,
        name: "core schema allows delete unknown field",
        meta: {
          input: preview_value({ user: { name: "Ada", role: "admin" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada", role: "admin" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));

          map.schema.use(schema);
          const commit = map.delete(["user", "role"]);

          return {
            assertRows: [
              equal_row("core schema allows delete unknown field: changed", commit.changed, true),
              equal_row("core schema allows delete unknown field: ops", commit.ops, [
                { kind: "delete", path: ["user", "role"], prev: "admin", next: undefined },
              ]),
              equal_row("core schema allows delete unknown field: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core schema rejects delete required parent before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          }));
          let message = "";

          map.schema.use(schema);

          try {
            map.delete(["user"]);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row(
                "core schema rejects delete required parent before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\"]:\n- LiveMap schema expected object at [\"user\"], received missing",
              ),
              equal_row("core schema rejects delete required parent before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core exact schema rejects unknown nested set before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object.exact({
              name: s.string,
            }),
          }));
          let message = "";

          map.schema.use(schema);

          try {
            map.setMany(["user"], { role: "admin" });
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row("core exact schema rejects unknown nested set before mutation: errored", message.length > 0, true),
              equal_row("core exact schema rejects unknown nested set before mutation: mentions key", message.includes("role"), true),
              equal_row("core exact schema rejects unknown nested set before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core exact schema rejects attach with unknown nested field",
        meta: {
          input: preview_value({ user: { name: "Ada", role: "admin" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada", role: "admin" } }));
          const schema = hson.liveMap.schema.define((s) => s.object({
            user: s.object.exact({
              name: s.string,
            }),
          }));
          let message = "";

          try {
            map.schema.use(schema);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row("core exact schema rejects attach with unknown nested field: errored", message.length > 0, true),
              equal_row("core exact schema rejects attach with unknown nested field: mentions key", message.includes("role"), true),
              equal_row("core exact schema rejects attach with unknown nested field: schema", map.schema.get(), undefined),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core exact schema rejects unknown root set before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = hson.liveMap.schema.define((s) => s.object.exact({
            user: s.object({
              name: s.string,
            }),
          }));
          let message = "";

          map.schema.use(schema);

          try {
            map.setMany([], { meta: { draft: true } });
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row("core exact schema rejects unknown root set before mutation: errored", message.length > 0, true),
              equal_row("core exact schema rejects unknown root set before mutation: mentions key", message.includes("meta"), true),
              equal_row("core exact schema rejects unknown root set before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "core setMany preserves unspecified siblings",
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
        name: "core write preserves unspecified siblings",
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
        name: "core rev starts at zero",
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
        name: "core rev advances with changed commits",
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
      {
        suite: SUITE,
        name: "core rev ignores unchanged and rejected writes",
        meta: {
          input: preview_value({ count: 0 }),
        },
        run: () => {
          const schema = hson.liveMap.schema.define((s) => s.object({
            count: s.number,
          }));
          const map = make_livemap_core(
            json_root_node({ count: 0 }),
          ).schema.use(schema);

          const changed = map.set(["count"], 1);
          const unchanged = map.set(["count"], 1);
          let rejected = false;

          try {
            map.set(
              ["count"],
              "invalid" as unknown as number,
            );
          } catch {
            rejected = true;
          }

          return {
            assertRows: [
              equal_row(
                "core rev ignores unchanged and rejected writes: changed commit",
                changed.rev,
                1,
              ),
              equal_row(
                "core rev ignores unchanged and rejected writes: unchanged commit",
                unchanged.rev,
                1,
              ),
              equal_row(
                "core rev ignores unchanged and rejected writes: rejected",
                rejected,
                true,
              ),
              equal_row(
                "core rev ignores unchanged and rejected writes: map",
                map.rev,
                1,
              ),
            ],
          };
        },
      },


    ] as const,
  };
}
