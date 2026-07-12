import { define_livemap_schema } from "hson-live";
import { read_case } from "./handle-helpers";
import type { TestSuite } from "../../app/demos/test/tests.types";


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
  const SUITE = "livemap/schema";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "schema issue reports type mismatch",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
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
          const schema = define_livemap_schema((s) => ({
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
            message: "LiveMap schema expected string at [\"user\",\"name\"], received undefined",
            expected: "string",
            received: "undefined",
          },
        },
      }),

      read_case({
        suite: SUITE,
        name: "schema issue reports unknown path",
        input: {},
        act: () => {
          const schema = define_livemap_schema((s) => ({
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
          const schema = define_livemap_schema((s) => ({
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
          const schema = define_livemap_schema((s) => ({
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
          const schema = define_livemap_schema((s) => ({
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
          const schema = define_livemap_schema((s) => ({
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
          const schema = define_livemap_schema((s) => ({
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
          const schema = define_livemap_schema((s) => ({
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


    ] as const,
  };
}
