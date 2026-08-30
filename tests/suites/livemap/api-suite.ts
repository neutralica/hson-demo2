// api-suite.ts

import { hson } from "hson-live";
import type { TestSuite } from "../../harness/core/test-contracts";
import { commitCase, read_case, throwCase } from "./handle-helpers";

export type TypeExpect<TValue extends true> = TValue;
export type TypeExtends<TActual, TExpected> = TActual extends TExpected ? true : false;

export function livemap_suites_api(): TestSuite {
  const SUITE = "livemap/api";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "api-livemap-fromjson-string-creates-data-map", name: "api liveMap fromJson string creates data map",
        input: {},
        act: () => hson.liveMap.fromJson('{"user":{"name":"Ada"}}').snap(),
        expected: { user: { name: "Ada" } },
      }),
      read_case({
        suite: SUITE,
        caseId: "api-livemap-fromjson-value-creates-data-map", name: "api liveMap fromJson value creates data map",
        input: {},
        act: () => hson.liveMap.fromJson({ user: { name: "Ada" } }).snap(),
        expected: { user: { name: "Ada" } },
      }),
      read_case({
        suite: SUITE,
        caseId: "api-livemap-fromhson-creates-data-map", name: "api liveMap fromHson creates data map",
        input: {},
        act: () => {
          const map = hson.liveMap.fromHson('<user <name "Ada">>');
          if (map.mode !== "data-object" && map.mode !== "data-array") {
            throw new Error(`Expected data LiveMap; observed ${map.mode}.`);
          }
          return map.snap();
        },
        expected: { user: { name: "Ada" } },
      }),
      read_case({
        suite: SUITE,
        caseId: "api-livemap-fromnode-creates-data-map", name: "api liveMap fromNode creates data map",
        input: {},
        act: () => {
          const node = hson.fromJson({ user: { name: "Ada" } }).toNode();
          const map = hson.liveMap.fromNode(node);
          if (map.mode !== "data-object" && map.mode !== "data-array") {
            throw new Error(`Expected data LiveMap; observed ${map.mode}.`);
          }
          return map.snap();
        },
        expected: { user: { name: "Ada" } },
      }),
      read_case({
        suite: SUITE,
        caseId: "api-map-schema-namespace-reads-undefined-before-use", name: "api map schema namespace reads undefined before use",
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
    ],
  };
}
