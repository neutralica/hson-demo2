// api-suite.ts

import { hson } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { commitCase, readCase, throwCase } from "./handle-helpers";

export type TypeExpect<TValue extends true> = TValue;
export type TypeExtends<TActual, TExpected> = TActual extends TExpected ? true : false;

export function livemap_suites_api(): TestSuite {
  const SUITE = "livemap/api";

  return {
    suite: SUITE,
    cases: [
      readCase({
        suite: SUITE,
        name: "api liveMap schema.define validates matching json",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
              age: s.number.optional,
            },
          }));

          return schema.validateRoot({ user: { name: "Ada", age: 37 } });
        },
        expected: { ok: true, issues: [] },
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap schema.define reports invalid json",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          return schema.validateRoot({ user: { name: 12 } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["user", "name"],
              message: "LiveMap schema expected string at [\"user\",\"name\"], received number",
            },
          ],
        },
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap schema.make accepts token root",
        input: {},
        act: () => hson.liveMap.schema.make(hson.liveMap.schema.string.array).validateRoot(["a", "b"]),
        expected: { ok: true, issues: [] },
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap fromJson string creates projected map",
        input: {},
        act: () => hson.liveMap.fromJson('{"user":{"name":"Ada"}}').snap(),
        expected: { user: { name: "Ada" } },
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap fromJson value creates projected map",
        input: {},
        act: () => hson.liveMap.fromJson({ user: { name: "Ada" } }).snap(),
        expected: { user: { name: "Ada" } },
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap fromHson creates projected map",
        input: {},
        act: () => hson.liveMap.fromHson('<user<name"Ada">>').snap(),
        expected: { user: { name: "Ada" } },
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap fromNode creates projected map",
        input: {},
        act: () => {
          const node = hson.fromJson({ user: { name: "Ada" } }).toHson().parse();
          return hson.liveMap.fromNode(node).snap();
        },
        expected: { user: { name: "Ada" } },
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap typed at reads nested object path",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
              age: s.number.optional,
            },
          }));

          const map = hson.liveMap
            .fromJson({ user: { name: "Ada" } })
            .schema.use(schema);

          return {
            user: map.at(["user"]).snap(),
            name: map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          user: { name: "Ada" },
          name: "Ada",
        },
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap typed at reads nested array path",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            items: s.array({
              id: s.string,
              count: s.number,
              label: s.string.optional,
            }),
          }));

          const map = hson.liveMap
            .fromJson({ items: [{ id: "a", count: 1 }] })
            .schema.use(schema);

          return {
            items: map.at(["items"]).snap(),
            item: map.at(["items", 0]).snap(),
            id: map.at(["items", 0, "id"]).snap(),
            label: map.at(["items", 0, "label"]).snap(),
          };
        },
        expected: {
          items: [{ id: "a", count: 1 }],
          item: { id: "a", count: 1 },
          id: "a",
        },
      }),
      readCase({
        suite: SUITE,
        name: "api map schema namespace reads undefined before use",
        input: {},
        act: () => {
          const map = hson.liveMap.fromJson({ user: { name: "Ada" } });

          return {
            get: map.schema.get(),
            hasUse: typeof map.schema.use === "function",
          };
        },
        expected: { hasUse: true },
      }),
      readCase({
        suite: SUITE,
        name: "api map schema.use returns map and stores schema",
        input: {},
        act: () => {
          const map = hson.liveMap.fromJson({});
          map.set(["user"], { name: "Ada" });
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));
          const returned = map.schema.use(schema);

          return {
            returned: returned === map,
            get: map.schema.get() === schema,
          };
        },
        expected: {
          returned: true,
          get: true,
        },
      }),
      commitCase({
        suite: SUITE,
        name: "api map schema.use allows valid chained set",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          return hson.liveMap
            .fromJson({ user: { name: "Ada" } })
            .schema.use(schema)
            .set(["user", "name"], "Grace");
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        ],
        expectedRoot: { user: { name: "Grace" } },
      }),
      throwCase({
        suite: SUITE,
        name: "api map schema.use rejects invalid chained set before mutation",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          return hson.liveMap
            .fromJson({ user: { name: "Ada" } })
            .schema.use(schema)
            .set(["user", "name"], 12);
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received number",
      }),
      readCase({
        suite: SUITE,
        name: "api map schema.use accepts fromJson object root",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const map = hson.liveMap
            .fromJson({ user: { name: "Ada" } })
            .schema.use(schema);

          return {
            root: map.snap(),
            schema: map.schema.get() === schema,
          };
        },
        expected: {
          root: { user: { name: "Ada" } },
          schema: true,
        },
      }),
      readCase({
        suite: SUITE,
        name: "api map schema.use accepts fromJson string root",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const map = hson.liveMap
            .fromJson('{"user":{"name":"Ada"}}')
            .schema.use(schema);

          return {
            root: map.snap(),
            schema: map.schema.get() === schema,
          };
        },
        expected: {
          root: { user: { name: "Ada" } },
          schema: true,
        },
      }),
      throwCase({
        suite: SUITE,
        name: "api map schema.use rejects invalid fromJson root",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          return hson.liveMap
            .fromJson({ user: { name: 12 } })
            .schema.use(schema);
        },
        expectedMessage: "LiveMap schema rejected value at []:\n- LiveMap schema expected string at [\"user\",\"name\"], received number",
      }),
      throwCase({
        suite: SUITE,
        name: "api map schema.use rejects exact unknown root key",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => s.exact({
            user: {
              name: s.string,
            },
          }));

          return hson.liveMap
            .fromJson({ user: { name: "Ada" }, meta: { draft: true } })
            .schema.use(schema);
        },
        expectedMessage: "LiveMap schema rejected value at []:\n- LiveMap schema does not allow key \"meta\" at [\"meta\"]",
      }),
      readCase({
        suite: SUITE,
        name: "api liveMap schema.make accepts object shape root",
        input: {},
        act: () => hson.liveMap.schema.make({
          user: {
            name: hson.liveMap.schema.string,
          },
        }).validateRoot({ user: { name: "Ada" } }),
        expected: { ok: true, issues: [] },
      }),
      readCase({
        suite: SUITE,
        name: "api map withSchema remains schema.use alias",
        input: {},
        act: () => {
          const map = hson.liveMap.fromJson({ user: { name: "Ada" } });
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));
          const returned = map.withSchema(schema);

          return {
            returned: returned === map,
            get: map.schema.get() === schema,
          };
        },
        expected: {
          returned: true,
          get: true,
        },
      }),
    ],
  };
}
