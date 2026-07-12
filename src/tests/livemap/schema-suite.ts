// schema-suites.ts

import {
  define_livemap_schema,
  LIVEMAP_SCHEMA,
  make_livemap_core,
  make_livemap_schema,
} from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { read_case } from "./handle-helpers";
import type {
  LiveMapSchemaInput,
} from "hson-live";
import { equal_row, preview_value } from "./test-helpers";
import { json_root_node } from "./core-helpers";



export function livemap_suites_schema(): TestSuite {
  const SUITE = "livemap/schema";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "schema validates a string root",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.string).validateRoot("Ada"),
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema rejects wrong primitive type",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.string).validateRoot(12),
        expected: {
          ok: false,
          issues: [
            {
              path: [],
              message: "LiveMap schema expected string at [], received number",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema validates object literal shape",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
              active: s.boolean,
            },
          }));

          return schema.validateRoot({ user: { name: "Ada", active: true } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema reports missing required object key",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
          }));

          return schema.validateRoot({ user: {} });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["user", "name"],
              message: "LiveMap schema expected string at [\"user\",\"name\"], received undefined",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema optional object key can be absent",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
              role: s.string.optional,
            },
          }));

          return schema.validateRoot({ user: { name: "Ada" } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema nullable accepts null",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string.nullable,
            },
          }));

          return schema.validateRoot({ user: { name: null } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema pick validates literal union",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              role: s.pick("admin", "user"),
            },
          }));

          return schema.validateRoot({ user: { role: "admin" } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema pick rejects unlisted literal",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              role: s.pick("admin", "user"),
            },
          }));

          return schema.validateRoot({ user: { role: "guest" } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["user", "role"],
              message: "LiveMap schema expected \"admin\" | \"user\" at [\"user\",\"role\"], received string",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema array builder validates array of objects",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            items: s.array({
              label: s.string,
              done: s.boolean.optional,
            }),
          }));

          return schema.validateRoot({ items: [{ label: "first" }, { label: "second", done: true }] });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema array reports indexed child issue",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            items: s.array({
              label: s.string,
            }),
          }));

          return schema.validateRoot({ items: [{ label: "first" }, { label: 12 }] });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["items", 1, "label"],
              message: "LiveMap schema expected string at [\"items\",1,\"label\"], received number",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema token array shorthand validates primitive array",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            tags: s.string.array,
          }));

          return schema.validateRoot({ tags: ["a", "b"] });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema record validates each string key value",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            colors: s.record(s.string),
          }));

          return schema.validateRoot({ colors: { main: "red", accent: "blue" } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema record reports key path issue",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            colors: s.record(s.string),
          }));

          return schema.validateRoot({ colors: { main: "red", accent: 12 } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["colors", "accent"],
              message: "LiveMap schema expected string at [\"colors\",\"accent\"], received number",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema non-exact object allows extra keys",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: s.object({
              name: s.string,
            }),
          }));

          return schema.validateRoot({ user: { name: "Ada", role: "user" } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema exact object rejects extra keys",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: s.exact({
              name: s.string,
            }),
          }));

          return schema.validateRoot({ user: { name: "Ada", role: "user" } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["user", "role"],
              message: "LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema validateValue validates nested path",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
          }));

          return schema.validateValue(["user", "name"], "Ada");
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema validateValue reports missing rule",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
          }));

          return schema.validateValue(["user", "role"], "admin");
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["user", "role"],
              message: "LiveMap schema has no rule for [\"user\",\"role\"]",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema match returns deepest object property rule",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
          }));
          const rule = schema.match(["user", "name"]);

          return rule === undefined ? undefined : { kind: rule.kind, path: rule.path };
        },
        expected: { kind: "string", path: ["user", "name"] },
      }),
      read_case({
        suite: SUITE,
        name: "schema array rule matches only numeric path parts",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            items: s.array({
              label: s.string,
            }),
          }));

          return {
            numericMatch: schema.match(["items", 3, "label"])?.kind,
            stringMatch: schema.match(["items", "3", "label"])?.kind,
            numericValidation: schema.validateValue(["items", 3, "label"], "third"),
            stringValidation: schema.validateValue(["items", "3", "label"], "third"),
          };
        },
        expected: {
          numericMatch: "string",
          stringMatch: undefined,
          numericValidation: {
            ok: true,
            issues: [],
          },
          stringValidation: {
            ok: false,
            issues: [
              {
                path: ["items", "3", "label"],
                message: "LiveMap schema has no rule for [\"items\",\"3\",\"label\"]",
              },
            ],
          },
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema record rule matches only string path parts",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            colors: s.record(s.string),
          }));

          return {
            stringMatch: schema.match(["colors", "accent"])?.kind,
            numericMatch: schema.match(["colors", 0])?.kind,
            stringValidation: schema.validateValue(["colors", "accent"], "blue"),
            numericValidation: schema.validateValue(["colors", 0], "blue"),
          };
        },
        expected: {
          stringMatch: "string",
          numericMatch: undefined,
          stringValidation: {
            ok: true,
            issues: [],
          },
          numericValidation: {
            ok: false,
            issues: [
              {
                path: ["colors", 0],
                message: "LiveMap schema has no rule for [\"colors\",0]",
              },
            ],
          },
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema unknown accepts any JSON value",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.unknown).validateRoot({ any: ["json", 1, true, null] }),
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema null validates null root",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.null).validateRoot(null),
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema null rejects non-null root",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.null).validateRoot("nope"),
        expected: {
          ok: false,
          issues: [
            {
              path: [],
              message: "LiveMap schema expected null at [], received string",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema nullable rejects wrong non-null type",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.string.nullable).validateRoot(12),
        expected: {
          ok: false,
          issues: [
            {
              path: [],
              message: "LiveMap schema expected string | null at [], received number",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema literal validates number literal",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.literal(1, 2, 3)).validateRoot(2),
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema literal validates boolean literal",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.literal(true)).validateRoot(true),
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema readonly flag appears in matched rule",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              id: s.string.readonly,
            },
          }));
          const rule = schema.match(["user", "id"]);

          return rule?.readonly;
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        name: "schema optional flag appears in matched rule",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              role: s.string.optional,
            },
          }));
          const rule = schema.match(["user", "role"]);

          return rule?.optional;
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        name: "schema nullable flag appears in matched rule",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string.nullable,
            },
          }));
          const rule = schema.match(["user", "name"]);

          return rule?.nullable;
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        name: "schema array rejects non-array value",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            items: s.array(s.string),
          }));

          return schema.validateRoot({ items: "not array" });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["items"],
              message: "LiveMap schema expected array at [\"items\"], received string",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema object rejects array value",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
          }));

          return schema.validateRoot({ user: [] });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["user"],
              message: "LiveMap schema expected object at [\"user\"], received array",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema record rejects array value",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            colors: s.record(s.string),
          }));

          return schema.validateRoot({ colors: [] });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["colors"],
              message: "LiveMap schema expected record at [\"colors\"], received array",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema tuple validates fixed items",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            point: s.tuple(s.number, s.number),
          }));

          return schema.validateRoot({ point: [10, 20] });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema tuple reports indexed item issue",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            point: s.tuple(s.number, s.number),
          }));

          return schema.validateRoot({ point: [10, "20"] });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["point", 1],
              message: "LiveMap schema expected number at [\"point\",1], received string",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema tuple reports missing required item",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            point: s.tuple(s.number, s.number),
          }));

          return schema.validateRoot({ point: [10] });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["point", 1],
              message: "LiveMap schema expected number at [\"point\",1], received undefined",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema tuple allows missing optional item",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            range: s.tuple(s.number, s.number.optional),
          }));

          return schema.validateRoot({ range: [10] });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema tuple rejects extra item",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            point: s.tuple(s.number, s.number),
          }));

          return schema.validateRoot({ point: [10, 20, 30] });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["point", 2],
              message: "LiveMap schema does not allow tuple index 2 at [\"point\",2]",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema tuple rejects non-array value",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            point: s.tuple(s.number, s.number),
          }));

          return schema.validateRoot({ point: { x: 10, y: 20 } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["point"],
              message: "LiveMap schema expected tuple at [\"point\"], received object",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema match returns tuple index rule",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            point: s.tuple(s.number, s.number),
          }));
          const rule = schema.match(["point", 1]);

          return rule === undefined ? undefined : { kind: rule.kind, path: rule.path };
        },
        expected: { kind: "number", path: ["point", 1] },
      }),
      read_case({
        suite: SUITE,
        name: "schema match returns pick rule for schema choices",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            id: s.pick(s.string, s.number),
          }));
          const rule = schema.match(["id"]);

          return rule === undefined ? undefined : { kind: rule.kind, path: rule.path };
        },
        expected: { kind: "pick", path: ["id"] },
      }),
      read_case({
        suite: SUITE,
        name: "schema pick validates first schema choice",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            id: s.pick(s.string, s.number),
          }));

          return schema.validateRoot({ id: "abc" });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema pick validates later schema choice",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            id: s.pick(s.string, s.number),
          }));

          return schema.validateRoot({ id: 12 });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema pick rejects non-matching schema choice",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            id: s.pick(s.string, s.number),
          }));

          return schema.validateRoot({ id: true });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["id"],
              message: "LiveMap schema expected string | number at [\"id\"], received boolean",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema pick validates mixed literal and schema choices",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            mode: s.pick("auto", "manual", s.boolean),
          }));

          return schema.validateRoot({ mode: true });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema pick validates object schema choice",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            result: s.pick(
              { ok: s.pick(true), value: s.string },
              { ok: s.pick(false), error: s.string },
            ),
          }));

          return schema.validateRoot({ result: { ok: false, error: "Nope" } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema match returns pick rule",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            id: s.pick(s.string, s.number),
          }));
          const rule = schema.match(["id"]);

          return rule === undefined ? undefined : { kind: rule.kind, path: rule.path };
        },
        expected: { kind: "pick", path: ["id"] },
      }),
      read_case({
        suite: SUITE,
        name: "schema partial allows missing listed keys",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.partial({
              name: s.string,
              active: s.boolean,
            }),
          }));

          return schema.validateRoot({ patch: {} });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema partial validates present listed key",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.partial({
              name: s.string,
              active: s.boolean,
            }),
          }));

          return schema.validateRoot({ patch: { active: true } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema partial rejects wrong present key type",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.partial({
              name: s.string,
              active: s.boolean,
            }),
          }));

          return schema.validateRoot({ patch: { active: "yes" } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["patch", "active"],
              message: "LiveMap schema expected boolean at [\"patch\",\"active\"], received string",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema partial makes nested object property optional",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.partial({
              profile: {
                displayName: s.string,
              },
            }),
          }));

          return schema.validateRoot({ patch: {} });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema partial keeps nested object fields required when object is present",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.partial({
              profile: {
                displayName: s.string,
              },
            }),
          }));

          return schema.validateRoot({ patch: { profile: {} } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["patch", "profile", "displayName"],
              message: "LiveMap schema expected string at [\"patch\",\"profile\",\"displayName\"], received undefined",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema tagged validates matching variant",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            result: s.tagged("kind", {
              success: { value: s.string },
              failure: { error: s.string },
            }),
          }));

          return schema.validateRoot({ result: { kind: "success", value: "OK" } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema tagged validates later matching variant",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            result: s.tagged("kind", {
              success: { value: s.string },
              failure: { error: s.string },
            }),
          }));

          return schema.validateRoot({ result: { kind: "failure", error: "Nope" } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema tagged rejects unknown discriminator value",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            result: s.tagged("kind", {
              success: { value: s.string },
              failure: { error: s.string },
            }),
          }));

          return schema.validateRoot({ result: { kind: "pending", value: "Wait" } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["result", "kind"],
              message: "LiveMap schema expected \"success\" at [\"result\",\"kind\"], received \"pending\"",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema tagged rejects missing variant payload",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            result: s.tagged("kind", {
              success: { value: s.string },
              failure: { error: s.string },
            }),
          }));

          return schema.validateRoot({ result: { kind: "success" } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["result", "value"],
              message: "LiveMap schema expected string at [\"result\",\"value\"], received undefined",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema lazy validates recursive tree",
        input: {},
        act: () => {
          let tree: LiveMapSchemaInput = LIVEMAP_SCHEMA.unknown;

          const schema = define_livemap_schema((s) => {
            tree = s.lazy(() => s.object({
              label: s.string,
              children: s.array(tree).optional,
            }));

            return { tree };
          });

          return schema.validateRoot({
            tree: {
              label: "root",
              children: [
                { label: "child" },
                { label: "branch", children: [{ label: "leaf" }] },
              ],
            },
          });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema lazy reports recursive child issue",
        input: {},
        act: () => {
          let tree: LiveMapSchemaInput = LIVEMAP_SCHEMA.unknown;

          const schema = define_livemap_schema((s) => {
            tree = s.lazy(() => s.object({
              label: s.string,
              children: s.array(tree).optional,
            }));

            return { tree };
          });

          return schema.validateRoot({
            tree: {
              label: "root",
              children: [
                { label: 12 },
              ],
            },
          });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["tree", "children", 0, "label"],
              message: "LiveMap schema expected string at [\"tree\",\"children\",0,\"label\"], received number",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema lazy validateValue descends through recursive path",
        input: {},
        act: () => {
          let tree: LiveMapSchemaInput = LIVEMAP_SCHEMA.unknown;

          const schema = define_livemap_schema((s) => {
            tree = s.lazy(() => s.object({
              label: s.string,
              children: s.array(tree).optional,
            }));

            return { tree };
          });

          return schema.validateValue(["tree", "children", 0, "label"], "leaf");
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema match keeps lazy rule shallow",
        input: {},
        act: () => {
          let tree: LiveMapSchemaInput = LIVEMAP_SCHEMA.unknown;

          const schema = define_livemap_schema((s) => {
            tree = s.lazy(() => s.object({
              label: s.string,
              children: s.array(tree).optional,
            }));

            return { tree };
          });

          const rule = schema.match(["tree"]);
          return rule === undefined ? undefined : { kind: rule.kind, path: rule.path };
        },
        expected: { kind: "lazy", path: ["tree"] },
      }),
      read_case({
        suite: SUITE,
        name: "schema refine validates accepted value",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            color: s.refine(s.string, "oklch string", (value) => typeof value === "string" && value.startsWith("oklch(")),
          }));

          return schema.validateRoot({ color: "oklch(70% 0.1 120)" });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema refine rejects failed predicate",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            color: s.refine(s.string, "oklch string", (value) => typeof value === "string" && value.startsWith("oklch(")),
          }));

          return schema.validateRoot({ color: "red" });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["color"],
              message: "LiveMap schema expected oklch string at [\"color\"], received \"red\"",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema refine returns base validation first",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            color: s.refine(s.string, "oklch string", (value) => typeof value === "string" && value.startsWith("oklch(")),
          }));

          return schema.validateRoot({ color: 12 });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["color"],
              message: "LiveMap schema expected string at [\"color\"], received number",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema match returns refine rule",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            color: s.refine(s.string, "oklch string", (value) => typeof value === "string" && value.startsWith("oklch(")),
          }));
          const rule = schema.match(["color"]);

          return rule === undefined ? undefined : { kind: rule.kind, path: rule.path };
        },
        expected: { kind: "refine", path: ["color"] },
      }),
      read_case({
        suite: SUITE,
        name: "schema deepPartial allows missing nested object field",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.deepPartial({
              profile: {
                displayName: s.string,
              },
            }),
          }));

          return schema.validateRoot({ patch: { profile: {} } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema deepPartial validates present nested object field",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.deepPartial({
              profile: {
                displayName: s.string,
              },
            }),
          }));

          return schema.validateRoot({ patch: { profile: { displayName: "Ada" } } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema deepPartial rejects wrong present nested field type",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.deepPartial({
              profile: {
                displayName: s.string,
              },
            }),
          }));

          return schema.validateRoot({ patch: { profile: { displayName: 12 } } });
        },
        expected: {
          ok: false,
          issues: [
            {
              path: ["patch", "profile", "displayName"],
              message: "LiveMap schema expected string at [\"patch\",\"profile\",\"displayName\"], received number",
            },
          ],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema deepPartial makes array item object fields optional",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.deepPartial({
              links: s.array({
                label: s.string,
                href: s.string,
              }),
            }),
          }));

          return schema.validateRoot({ patch: { links: [{}] } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema deepPartial makes record value object fields optional",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            patch: s.deepPartial({
              users: s.record({
                name: s.string,
                active: s.boolean,
              }),
            }),
          }));

          return schema.validateRoot({ patch: { users: { ada: {} } } });
        },
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema define returns reusable schema instance",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
          }));

          return [
            schema.validateRoot({ user: { name: "Ada" } }),
            schema.validateRoot({ user: { name: 12 } }),
          ];
        },
        expected: [
          { ok: true, issues: [] },
          {
            ok: false,
            issues: [
              {
                path: ["user", "name"],
                message: "LiveMap schema expected string at [\"user\",\"name\"], received number",
              },
            ],
          },
        ],
      }),
      read_case({
        suite: SUITE,
        name: "schema make accepts token root",
        input: {},
        act: () => make_livemap_schema(LIVEMAP_SCHEMA.string.array).validateRoot(["a", "b"]),
        expected: { ok: true, issues: [] },
      }),
      read_case({
        suite: SUITE,
        name: "schema make accepts object shape root",
        input: {},
        act: () => make_livemap_schema({
          user: {
            name: LIVEMAP_SCHEMA.string,
          },
        }).validateRoot({ user: { name: "Ada" } }),
        expected: { ok: true, issues: [] },
      }),
      {
        suite: SUITE,
        name: "core withSchema accepts direct nested json root",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({ user: { name: "Ada" } }));
          const schema = define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
          }));
          let message = "";

          try {
            map.withSchema(schema);
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }

          return {
            assertRows: [
              equal_row("core withSchema accepts direct nested json root: error", message, ""),
              equal_row("core withSchema accepts direct nested json root: schema", map.schema.get() === schema, true),
              equal_row("core withSchema accepts direct nested json root: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "handle setMany and write preserve siblings",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37, role: "admin" } }),
        },
        run: () => {
          const map = make_livemap_core(json_root_node({
            user: { name: "Ada", age: 37, role: "admin" },
          }));
          const user = map.at(["user"]);

          user.setMany({ name: "Grace" });
          const afterWrite = map.snap();

          user.setMany({ name: "Mina" });
          const afterSetMany = map.snap();

          return {
            assertRows: [
              equal_row("handle setMany and write preserve siblings: after write", afterWrite, {
                user: { name: "Grace", age: 37, role: "admin" },
              }),
              equal_row("handle setMany and write preserve siblings: after setMany", afterSetMany, {
                user: { name: "Mina", age: 37, role: "admin" },
              }),
            ],
          };
        },
      },
      read_case({
        suite: SUITE,
        name: "schema preserves literal star object key",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
            "*": s.string,
            other: s.number,
          }));

          return {
            starMatch: schema.match(["*"])?.kind,
            otherMatch: schema.match(["other"])?.kind,
            validStar: schema.validateValue(["*"], "literal star"),
            invalidStar: schema.validateValue(["*"], 12),
            validOther: schema.validateValue(["other"], 12),
            invalidOther: schema.validateValue(["other"], "twelve"),
          };
        },
        expected: {
          starMatch: "string",
          otherMatch: "number",
          validStar: {
            ok: true,
            issues: [],
          },
          invalidStar: {
            ok: false,
            issues: [
              {
                path: ["*"],
                message: "LiveMap schema expected string at [\"*\"], received number",
              },
            ],
          },
          validOther: {
            ok: true,
            issues: [],
          },
          invalidOther: {
            ok: false,
            issues: [
              {
                path: ["other"],
                message: "LiveMap schema expected number at [\"other\"], received string",
              },
            ],
          },
        },
      }),
      read_case({
  suite: SUITE,
  name: "schema rules keep public wildcard paths",
  input: {},
  act: () => {
    const schema = define_livemap_schema((s) => ({
      items: s.array({
        label: s.string,
      }),
      colors: s.record(s.string),
    }));

    return schema.rules
      .filter((rule) => rule.path.includes("*"))
      .map((rule) => ({
        kind: rule.kind,
        path: rule.path,
      }));
  },
  expected: [
    {
      kind: "object",
      path: ["items", "*"],
    },
    {
      kind: "string",
      path: ["items", "*", "label"],
    },
    {
      kind: "string",
      path: ["colors", "*"],
    },
  ],
      }),
      read_case({
  suite: SUITE,
  name: "schema rules keep public wildcard paths",
  input: {},
  act: () => {
    const schema = define_livemap_schema((s) => ({
      items: s.array({
        label: s.string,
      }),
      colors: s.record(s.string),
    }));

    return {
      arrayItem: schema.rules.some((rule) =>
        rule.kind === "object"
        && JSON.stringify(rule.path) === JSON.stringify(["items", "*"])
      ),
      arrayLabel: schema.rules.some((rule) =>
        rule.kind === "string"
        && JSON.stringify(rule.path) === JSON.stringify(["items", "*", "label"])
      ),
      recordValue: schema.rules.some((rule) =>
        rule.kind === "string"
        && JSON.stringify(rule.path) === JSON.stringify(["colors", "*"])
      ),
    };
  },
  expected: {
    arrayItem: true,
    arrayLabel: true,
    recordValue: true,
  },
      }),
      read_case({
  suite: SUITE,
  name: "schema literal star and record wildcard remain distinct",
  input: {},
  act: () => {
    const schema = define_livemap_schema((s) => ({
      "*": s.number,
      values: s.record(s.string),
    }));

    return {
      literalStar: schema.match(["*"])?.kind,
      recordStarKey: schema.match(["values", "*"])?.kind,
      recordNamedKey: schema.match(["values", "label"])?.kind,
      invalidLiteralStar: schema.validateValue(["*"], "wrong"),
      invalidRecordValue: schema.validateValue(["values", "*"], 12),
    };
  },
  expected: {
    literalStar: "number",
    recordStarKey: "string",
    recordNamedKey: "string",
    invalidLiteralStar: {
      ok: false,
      issues: [
        {
          path: ["*"],
          message: "LiveMap schema expected number at [\"*\"], received string",
        },
      ],
    },
    invalidRecordValue: {
      ok: false,
      issues: [
        {
          path: ["values", "*"],
          message: "LiveMap schema expected string at [\"values\",\"*\"], received number",
        },
      ],
    },
  },
      }),
      read_case({
  suite: SUITE,
  name: "schema tuple literal index does not behave like array wildcard",
  input: {},
  act: () => {
    const schema = define_livemap_schema((s) => ({
      point: s.tuple(s.string, s.number),
      items: s.array(s.boolean),
    }));

    return {
      tupleZero: schema.match(["point", 0])?.kind,
      tupleStringZero: schema.match(["point", "0"])?.kind,
      arrayZero: schema.match(["items", 0])?.kind,
      arrayStringZero: schema.match(["items", "0"])?.kind,
    };
  },
  expected: {
    tupleZero: "string",
    tupleStringZero: undefined,
    arrayZero: "boolean",
    arrayStringZero: undefined,
  },
      }),
      

    ] as const,
  };
}