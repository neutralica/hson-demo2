import { hson } from "hson-live";
import { LiveMapSchemaError, make_livemap_core } from "hson-live/livemap";
import { read_case } from "./handle-helpers";
import type { TestSuite } from "../../harness/core/test-contracts";
import { json_root_node } from "./core-helpers";


const SUITE = "livemap/schema-errors";

function summarize_issue(
  issue: {
    readonly code: string;
    readonly path: readonly (string | number)[];
    readonly message: string;
    readonly expected?: string;
    readonly received?: string;
  } | undefined,
): unknown {
  if (issue === undefined) return undefined;

  return {
    code: issue.code,
    path: issue.path,
    message: issue.message,
    ...(issue.expected !== undefined
      ? { expected: issue.expected }
      : {}),
    ...(issue.received !== undefined
      ? { received: issue.received }
      : {}),
  };
}


export function livemap_error_handling(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "schema issue reports type mismatch",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const result = schema.validateValue(["user", "name"], 42);

          return {
            ok: result.ok,
            issue: summarize_issue(result.issues[0]),
          };
        },
        expected: {
          ok: false,
          issue: {
            code: "TYPE_MISMATCH",
            path: ["user", "name"],
            message: "LiveMap schema expected string at [\"user\",\"name\"], received number",
            expected: "string",
            received: "number",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema issue reports missing required value",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const result = schema.validateRoot({
            user: {},
          });

          return {
            ok: result.ok,
            issue: summarize_issue(result.issues[0]),
          };
        },
        expected: {
          ok: false,
          issue: {
            code: "MISSING_REQUIRED",
            path: ["user", "name"],
            message: "LiveMap schema expected string at [\"user\",\"name\"], received missing",
            expected: "string",
            received: "missing",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema issue reports unknown path",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const result = schema.validateValue(["user", "age"], 37);

          return {
            ok: result.ok,
            issue: summarize_issue(result.issues[0]),
          };
        },
        expected: {
          ok: false,
          issue: {
            code: "UNKNOWN_PATH",
            path: ["user", "age"],
            message: "LiveMap schema has no rule for [\"user\",\"age\"]",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema issue reports unknown exact object key",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: s.exact({
              name: s.string,
            }),
          }));

          const result = schema.validateRoot({
            user: {
              name: "Ada",
              age: 37,
            },
          });

          return {
            ok: result.ok,
            issue: summarize_issue(result.issues[0]),
          };
        },
        expected: {
          ok: false,
          issue: {
            code: "UNKNOWN_KEY",
            path: ["user", "age"],
            message: "LiveMap schema does not allow key \"age\" at [\"user\",\"age\"]",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema issue reports invalid literal",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            status: s.literal("ready"),
          }));

          const result = schema.validateValue(["status"], "waiting");

          return {
            ok: result.ok,
            issue: summarize_issue(result.issues[0]),
          };
        },
        expected: {
          ok: false,
          issue: {
            code: "INVALID_LITERAL",
            path: ["status"],
            message: "LiveMap schema expected \"ready\" at [\"status\"], received \"waiting\"",
            expected: "\"ready\"",
            received: "\"waiting\"",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema issue reports invalid refinement",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            count: s.refine(
              s.number,
              "positive number",
              (value) => value > 0,
            ),
          }));

          const result = schema.validateValue(["count"], -1);

          return {
            ok: result.ok,
            issue: summarize_issue(result.issues[0]),
          };
        },
        expected: {
          ok: false,
          issue: {
            code: "INVALID_REFINEMENT",
            path: ["count"],
            message: "LiveMap schema expected positive number at [\"count\"], received -1",
            expected: "positive number",
            received: "-1",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema issue reports tuple index out of range",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            point: s.tuple(
              s.string,
              s.number,
            ),
          }));

          const result = schema.validateRoot({
            point: ["north", 12, true],
          });

          return {
            ok: result.ok,
            issue: summarize_issue(
              result.issues.find(
                ({ code }) => code === "TUPLE_INDEX_OUT_OF_RANGE",
              ),
            ),
          };
        },
        expected: {
          ok: false,
          issue: {
            code: "TUPLE_INDEX_OUT_OF_RANGE",
            path: ["point", 2],
            message: "LiveMap schema does not allow tuple index 2 at [\"point\",2]",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema validation aggregates structured issues",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
              age: s.number,
            },
            point: s.tuple(
              s.string,
              s.number,
            ),
          }));

          const result = schema.validateRoot({
            user: {
              name: 42,
              age: "old",
            },
            point: ["north", 12, true],
          });

          return {
            ok: result.ok,
            issues: result.issues.map(summarize_issue),
          };
        },
        expected: {
          ok: false,
          issues: [
            {
              code: "TYPE_MISMATCH",
              path: ["user", "name"],
              message: "LiveMap schema expected string at [\"user\",\"name\"], received number",
              expected: "string",
              received: "number",
            },
            {
              code: "TYPE_MISMATCH",
              path: ["user", "age"],
              message: "LiveMap schema expected number at [\"user\",\"age\"], received string",
              expected: "number",
              received: "string",
            },
            {
              code: "TUPLE_INDEX_OUT_OF_RANGE",
              path: ["point", 2],
              message: "LiveMap schema does not allow tuple index 2 at [\"point\",2]",
            },
          ],
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema successful validation returns no issues",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
              age: s.number,
            },
          }));

          const result = schema.validateRoot({
            user: {
              name: "Ada",
              age: 37,
            },
          });

          return {
            ok: result.ok,
            issues: result.issues,
          };
        },
        expected: {
          ok: true,
          issues: [],
        },
      }),
      read_case({
        suite: SUITE,
        name: "schema rejected write throws structured schema error",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const map = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
            },
          })).schema.use(schema);

          try {
            map.set(["user", "name"], 42 as unknown as string);

            return {
              threw: false,
            };
          } catch (error) {
            if (!(error instanceof LiveMapSchemaError)) {
              return {
                threw: true,
                isSchemaError: false,
                errorName: error instanceof Error ? error.name : typeof error,
              };
            }

            return {
              threw: true,
              isSchemaError: true,
              name: error.name,
              code: error.code,
              path: error.path,
              message: error.message,
              issues: error.issues.map((issue) => ({
                code: issue.code,
                path: issue.path,
                message: issue.message,
                ...(issue.expected !== undefined
                  ? { expected: issue.expected }
                  : {}),
                ...(issue.received !== undefined
                  ? { received: issue.received }
                  : {}),
              })),
            };
          }
        },
        expected: {
          threw: true,
          isSchemaError: true,
          name: "LiveMapSchemaError",
          code: "SCHEMA_VALIDATION",
          path: ["user", "name"],
          message: [
            "LiveMap schema rejected value at [\"user\",\"name\"]:",
            "- LiveMap schema expected string at [\"user\",\"name\"], received number",
          ].join("\n"),
          issues: [
            {
              code: "TYPE_MISMATCH",
              path: ["user", "name"],
              message: "LiveMap schema expected string at [\"user\",\"name\"], received number",
              expected: "string",
              received: "number",
            },
          ],
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema rejected write leaves map unchanged",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const map = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
            },
          })).schema.use(schema);

          const before = map.snap();

          try {
            map.set(["user", "name"], 42 as unknown as string);
          } catch {
            // Expected schema rejection.
          }

          return {
            before,
            after: map.snap(),
            name: map.snap(["user", "name"]),
          };
        },
        expected: {
          before: {
            user: {
              name: "Ada",
            },
          },
          after: {
            user: {
              name: "Ada",
            },
          },
          name: "Ada",
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema rejected constructive set uses first issue headline path",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
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
          })).schema.use(schema);

          try {
            map.set(["user"], {
              name: 42 as unknown as string,
              age: "old" as unknown as number,
            });

            return {
              threw: false,
            };
          } catch (error) {
            if (!(error instanceof LiveMapSchemaError)) {
              return {
                threw: true,
                isSchemaError: false,
              };
            }

            return {
              threw: true,
              isSchemaError: true,
              path: error.path,
              issueCodes: error.issues.map(({ code }) => code),
              issuePaths: error.issues.map(({ path }) => path),
              message: error.message,
            };
          }
        },
        expected: {
          threw: true,
          isSchemaError: true,
          path: ["user", "name"],
          issueCodes: [
            "TYPE_MISMATCH",
            "TYPE_MISMATCH",
          ],
          issuePaths: [
            ["user", "name"],
            ["user", "age"],
          ],
          message: [
            "LiveMap schema rejected value at [\"user\",\"name\"]:",
            "- LiveMap schema expected string at [\"user\",\"name\"], received number",
            "- LiveMap schema expected number at [\"user\",\"age\"], received string",
          ].join("\n"),
        },
      }),

      read_case({
        suite: SUITE,
        name: "invalid schema attachment throws structured schema error",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const map = make_livemap_core(json_root_node({
            user: {
              name: 42,
            },
          }));

          try {
            map.schema.use(schema);

            return {
              threw: false,
            };
          } catch (error) {
            if (!(error instanceof LiveMapSchemaError)) {
              return {
                threw: true,
                isSchemaError: false,
              };
            }

            return {
              threw: true,
              isSchemaError: true,
              path: error.path,
              code: error.code,
              issueCode: error.issues[0]?.code,
              issuePath: error.issues[0]?.path,
              schemaAttached: map.schema.get() !== undefined,
            };
          }
        },
        expected: {
          threw: true,
          isSchemaError: true,
          path: [],
          code: "SCHEMA_VALIDATION",
          issueCode: "TYPE_MISMATCH",
          issuePath: ["user", "name"],
          schemaAttached: false,
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema error retains immutable issue collection",
        input: {},
        act: () => {
          const schema = hson.liveMap.schema.define((s) => ({
            user: {
              name: s.string,
            },
          }));

          const map = make_livemap_core(json_root_node({
            user: {
              name: "Ada",
            },
          })).schema.use(schema);

          try {
            map.set(["user", "name"], 42 as unknown as string);

            return {
              threw: false,
            };
          } catch (error) {
            if (!(error instanceof LiveMapSchemaError)) {
              return {
                threw: true,
                isSchemaError: false,
              };
            }

            return {
              threw: true,
              isSchemaError: true,
              issuesFrozen: Object.isFrozen(error.issues),
              firstIssueFrozen: Object.isFrozen(error.issues[0]),
            };
          }
        },
        expected: {
          threw: true,
          isSchemaError: true,
          issuesFrozen: true,
          firstIssueFrozen: true,
        },
      }),

    ] as const,
  };
}
