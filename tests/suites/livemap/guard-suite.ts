// guard-suites.ts

import { make_livemap_core } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { json_root_node } from "./json-root-node";
import { preview_value, equal_row } from "./test-helpers";

type GuardThrowCaseSpec = Readonly<{
  caseId: string;
  name: string;
  input?: JsonValue;
  act: (map: ReturnType<typeof make_livemap_core>) => unknown;
  expectedMessage: string;
}>;

const SUITE = "livemap/guard";
export function livemap_suites_guard(): TestSuite {
    return {
        suite: SUITE,
        cases: [
            guardThrowCase({
                caseId: "core.snap-rejects-non-array-path",
            name: "core.snap rejects non-array path",
                act: (map) => map.snap("user" as never),
                expectedMessage: "LiveMap path is not an array",
            }),
            guardThrowCase({
                caseId: "core.set-rejects-invalid-path-part",
            name: "core.set rejects invalid path part",
                act: (map) => map.set(["user", -1], "Ada"),
                expectedMessage: "LiveMap path part is not valid at index 1",
            }),
            guardThrowCase({
                caseId: "core.set-rejects-undefined-value",
            name: "core.set rejects undefined value",
                act: (map) => map.set(["user"], undefined as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\"]",
            }),
            guardThrowCase({
                caseId: "core.set-rejects-function-value",
            name: "core.set rejects function value",
                act: (map) => map.set(["user"], (() => "Ada") as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\"]",
            }),
            guardThrowCase({
                caseId: "core.set-rejects-symbol-value",
            name: "core.set rejects symbol value",
                act: (map) => map.set(["user"], Symbol("user") as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\"]",
            }),
            guardThrowCase({
                caseId: "core.set-rejects-nan-value",
            name: "core.set rejects NaN value",
                act: (map) => map.set(["user"], Number.NaN as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\"]",
            }),
            guardThrowCase({
                caseId: "core.set-rejects-infinity-value",
            name: "core.set rejects Infinity value",
                act: (map) => map.set(["user"], Number.POSITIVE_INFINITY as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\"]",
            }),
            guardThrowCase({
                caseId: "core.setmany-rejects-non-object-value",
            name: "core.setMany rejects non-object value",
                act: (map) => map.setMany(["user"], [] as never),
                expectedMessage: "LiveMap setMany value is not an object at [\"user\"]",
            }),
            guardThrowCase({
                caseId: "core.setmany-rejects-nested-non-json-value",
            name: "core.setMany rejects nested non-JSON value",
                act: (map) => map.setMany(["user"], { name: undefined } as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\", \"name\"]",
            }),
            guardThrowCase({
                caseId: "core.feed-rejects-non-function-listener",
            name: "core.feed rejects non-function listener",
                act: (map) => map.feed(["user"], "listener" as never),
                expectedMessage: "LiveMap feed listener is not a function",
            }),
            guardThrowCase({
                caseId: "handle.set-rejects-non-json-value",
            name: "handle.set rejects non-JSON value",
                act: (map) => map.at(["user"]).set(undefined as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\"]",
            }),
            guardThrowCase({
                caseId: "handle.update-rejects-non-json-return-value",
            name: "handle.update rejects non-JSON return value",
                act: (map) => map.at(["user"]).update(() => undefined as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\"]",
            }),
            guardThrowCase({
                caseId: "handle.setmany-rejects-nested-non-json-value",
            name: "handle.setMany rejects nested non-JSON value",
                act: (map) => map.at(["user"]).setMany({ name: undefined } as never),
                expectedMessage: "LiveMap value is not JSON at [\"user\", \"name\"]",
            }),
            guardThrowCase({
                caseId: "handle.object.setkey-rejects-non-string-key",
            name: "handle.object.setKey rejects non-string key",
                act: (map) => (map.at(["user"]).object.setKey as any)(0, "Ada"),
                expectedMessage: "LiveMap object key is not a string at [\"user\"]",
            }),
        ]
    }
}

function guardThrowCase(spec: GuardThrowCaseSpec): TestCase {
  return {
    suite: SUITE,
    caseId: spec.caseId, name: spec.name,
    meta: {
      input: preview_value(spec.input ?? {}),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input ?? {}));
      let message = "";

      try {
        spec.act(map);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: error`, message, spec.expectedMessage),
        ],
      };
    },
  };
}
