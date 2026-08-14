import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row } from "./assert-helpers";

const SUITE = "livemap/exact-transport-rejection";

function test(caseId: string, name: string, run: TestCase["run"]): TestCase {
  return { suite: SUITE, caseId, name, run };
}

function own_data(entries: readonly (readonly [string, JsonValue])[]): Record<string, JsonValue> {
  const value: Record<string, JsonValue> = {};
  for (const [key, child] of entries) {
    Object.defineProperty(value, key, { value: child, enumerable: true, writable: true, configurable: true });
  }
  return value;
}

function failure(run: () => unknown) {
  try {
    run();
    return { code: "NO_ERROR" };
  } catch (error) {
    const rejected = error as { code?: unknown; context?: unknown; reason?: unknown; opIndex?: unknown };
    return {
      code: rejected.code,
      context: rejected.context,
      reason: rejected.reason,
      opIndex: rejected.opIndex,
    };
  }
}

export function livemap_exact_transport_rejection_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("legacy-restore-uses-javascript-observable-integer-key-order", "legacy restore uses JavaScript-observable integer-key order", () => {
        const target = hson.liveMap.fromJson({ old: true });
        target.restore({ rev: 4, value: own_data([["10", 10], ["2", 2], ["1", 1]]) });
        const expected = hson.liveMap.fromJson('{"1":1,"2":2,"10":10}');
        return { assertRows: [
          equal_row("legacy observable order", target.capture().payload, expected.capture().payload),
          equal_row("revision", target.rev, 4),
        ] };
      }),
      test("legacy-materialization-cannot-recover-overwritten-duplicate-history", "legacy materialization cannot recover overwritten duplicate history", () => {
        const target = hson.liveMap.fromJson({ old: true });
        target.restore({ rev: 1, value: JSON.parse('{"a":1,"a":2}') as JsonValue });
        return { assertRows: [
          equal_row("one key remains", Reflect.ownKeys(target.snap() as object), ["a"]),
          equal_row("last value remains", target.snap(["a"]), 2),
        ] };
      }),
      test("legacy-replay-is-distinct-and-remains-readable", "legacy replay is distinct and remains readable", () => {
        const target = hson.liveMap.fromJson({ value: 0 });
        const commit = target.replay({ prevRev: 0, ops: [{ kind: "set", path: ["value"], prev: 0, next: 1 }] });
        return { assertRows: [
          equal_row("legacy changed", commit.changed, true),
          equal_row("exact output added", commit.format, "structural-json"),
        ] };
      }),
      test("restore-rejects-an-unsupported-exact-format", "restore rejects an unsupported exact format", () => {
        const target = hson.liveMap.fromJson({ value: 0 });
        const result = failure(() => target.restore({ rev: 0, format: "other", formatVersion: 1, payload: "{}" } as never));
        return { assertRows: [
          equal_row("code", result.code, "INVALID_PROJECTED_TRANSPORT"),
          equal_row("context", result.context, "restore"),
          equal_row("reason", result.reason, "format is not supported"),
          equal_row("revision unchanged", target.rev, 0),
        ] };
      }),
      test("restore-rejects-an-unsupported-exact-version", "restore rejects an unsupported exact version", () => {
        const target = hson.liveMap.fromJson({ value: 0 });
        const result = failure(() => target.restore({ rev: 0, format: "structural-json", formatVersion: 2, payload: "{}" } as never));
        return { assertRows: [equal_row("reason", result.reason, "formatVersion is not supported")] };
      }),
      test("apply-rejects-a-non-string-exact-payload", "apply rejects a non-string exact payload", () => {
        const target = hson.liveMap.fromJson({ value: 0 });
        const result = failure(() => target.apply({ prevRev: 0, format: "structural-json", formatVersion: 1, payload: 1 } as never));
        return { assertRows: [
          equal_row("context", result.context, "apply"),
          equal_row("reason", result.reason, "payload is not a string"),
        ] };
      }),
      test("restore-rejects-malformed-structural-json", "restore rejects malformed structural JSON", () => {
        const target = hson.liveMap.fromJson({ value: 0 });
        const result = failure(() => target.restore({ rev: 0, format: "structural-json", formatVersion: 1, payload: "{" }));
        return { assertRows: [equal_row("reason", result.reason, "payload is not valid structural JSON")] };
      }),
      test("partial-exact-replay-never-falls-back-to-legacy-ops", "partial exact replay never falls back to legacy ops", () => {
        const target = hson.liveMap.fromJson({ value: 0 });
        const result = failure(() => target.replay({ prevRev: 0, format: "structural-json", ops: [] } as never));
        return { assertRows: [
          equal_row("code", result.code, "INVALID_REPLAY"),
          equal_row("reason", result.reason, "formatVersion is not supported"),
        ] };
      }),
      test("replay-rejects-a-non-array-structural-payload-root", "replay rejects a non-array structural payload root", () => {
        const target = hson.liveMap.fromJson({ value: 0 });
        const result = failure(() => target.replay({ prevRev: 0, format: "structural-json", formatVersion: 1, payload: "{}" }));
        return { assertRows: [equal_row("reason", result.reason, "payload root is not an operation array")] };
      }),
      test("replay-rejects-malformed-exact-operation-structure-with-an-index", "replay rejects malformed exact operation structure with an index", () => {
        const target = hson.liveMap.fromJson({ value: 0 });
        const result = failure(() => target.replay({
          prevRev: 0,
          format: "structural-json",
          formatVersion: 1,
          payload: '[{"path":["value"],"kind":"set","prev":[0],"next":[1]}]',
        }));
        return { assertRows: [
          equal_row("reason", result.reason, "operation fields are missing, unknown, or out of order"),
          equal_row("operation index", result.opIndex, 0),
        ] };
      }),
    ],
  };
}
