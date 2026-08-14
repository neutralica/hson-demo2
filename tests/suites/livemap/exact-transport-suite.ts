import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, own_value_row, same_value_row } from "./assert-helpers";

const SUITE = "livemap/exact-transport";

function test(caseId: string, name: string, run: TestCase["run"]): TestCase {
  return { suite: SUITE, caseId, name, run };
}

function exact_input(capture: ReturnType<ReturnType<typeof hson.liveMap.fromJson>["capture"]>) {
  return {
    rev: capture.rev,
    format: capture.format,
    formatVersion: capture.formatVersion,
    payload: capture.payload,
  } as const;
}

function conflict(run: () => unknown) {
  try {
    run();
    return { code: "NO_ERROR" };
  } catch (error) {
    const failure = error as {
      code?: unknown;
      expectedPayload?: unknown;
      actualPayload?: unknown;
    };
    return {
      code: failure.code,
      expectedPayload: failure.expectedPayload,
      actualPayload: failure.actualPayload,
    };
  }
}

export function livemap_exact_transport_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("capture-emits-exact-v1-transport-alongside-the-compatibility-view", "capture emits exact v1 transport alongside the compatibility view", () => {
        const capture = hson.liveMap.fromJson({ value: 1 }).capture();
        return { assertRows: [
          equal_row("format", capture.format, "structural-json"),
          equal_row("version", capture.formatVersion, 1),
          equal_row("payload type", typeof capture.payload, "string"),
          equal_row("compatibility value", capture.value, { value: 1 }),
        ] };
      }),
      test("repeated-captures-are-byte-identical", "repeated captures are byte-identical", () => {
        const map = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}');
        return { assertRows: [equal_row("payload bytes", map.capture().payload, map.capture().payload)] };
      }),
      test("exact-restore-preserves-direct-integer-like-order", "exact restore preserves direct integer-like order", () => {
        const source = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}');
        const target = hson.liveMap.fromJson({ old: true });
        target.restore(source.capture());
        return { assertRows: [equal_row("exact payload closure", target.capture().payload, source.capture().payload)] };
      }),
      test("exact-restore-preserves-mixed-key-classes", "exact restore preserves mixed key classes", () => {
        const source = hson.liveMap.fromJson('{"a":1,"10":10,"2":2,"01":1,"4294967294":4,"4294967295":5,"-1":-1,"b":2}');
        const target = hson.liveMap.fromJson({ old: true });
        target.restore(source.capture());
        return { assertRows: [equal_row("mixed payload closure", target.capture().payload, source.capture().payload)] };
      }),
      test("exact-restore-preserves-nested-ordered-objects", "exact restore preserves nested ordered objects", () => {
        const source = hson.liveMap.fromJson('{"outer":{"10":10,"2":2,"1":1},"tail":true}');
        const target = hson.liveMap.fromJson({ old: true });
        target.restore(source.capture());
        return { assertRows: [equal_row("nested payload closure", target.capture().payload, source.capture().payload)] };
      }),
      test("exact-restore-preserves-an-ordered-object-inside-an-array", "exact restore preserves an ordered object inside an array", () => {
        const source = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}]}');
        const target = hson.liveMap.fromJson({ old: true });
        target.restore(source.capture());
        return { assertRows: [equal_row("object-in-array closure", target.capture().payload, source.capture().payload)] };
      }),
      test("exact-restore-preserves-an-array-inside-an-object", "exact restore preserves an array inside an object", () => {
        const source = hson.liveMap.fromJson('{"z":[1,-0,{"b":2,"a":1}],"a":true}');
        const target = hson.liveMap.fromJson({ old: true });
        target.restore(source.capture());
        return { assertRows: [equal_row("array-in-object closure", target.capture().payload, source.capture().payload)] };
      }),
      test("exact-restore-preserves-dangerous-keys-as-own-data", "exact restore preserves dangerous keys as own data", () => {
        const source = hson.liveMap.fromJson('{"__proto__":1,"constructor":2,"prototype":3}');
        const target = hson.liveMap.fromJson({ old: true });
        target.restore(source.capture());
        const value = target.snap() as object;
        return { assertRows: [
          own_value_row("__proto__", value, "__proto__", 1),
          own_value_row("constructor", value, "constructor", 2),
          own_value_row("prototype", value, "prototype", 3),
          equal_row("ordinary prototype", Object.getPrototypeOf(value) === Object.prototype, true),
        ] };
      }),
      test("exact-restore-preserves-isolated-surrogate-code-units", "exact restore preserves isolated surrogate code units", () => {
        const source = hson.liveMap.fromJson({ text: "\ud800x\udfff" });
        const target = hson.liveMap.fromJson({ old: true });
        target.restore(source.capture());
        return { assertRows: [equal_row("string code units", target.snap(["text"]), "\ud800x\udfff")] };
      }),
      test("exact-restore-preserves-nested-negative-zero", "exact restore preserves nested negative zero", () => {
        const source = hson.liveMap.fromJson({ value: -0 });
        const target = hson.liveMap.fromJson({ value: 0 });
        target.restore(source.capture());
        return { assertRows: [same_value_row("negative zero", target.snap(["value"]), -0)] };
      }),
      test("mutating-the-compatibility-view-cannot-change-exact-capture-bytes", "mutating the compatibility view cannot change exact capture bytes", () => {
        const map = hson.liveMap.fromJson({ nested: { value: 1 } });
        const capture = map.capture();
        ((capture.value as Record<string, JsonValue>).nested as Record<string, JsonValue>).value = 9;
        return { assertRows: [equal_row("payload remains authoritative", map.capture().payload, capture.payload)] };
      }),
      test("restore-accepts-the-minimal-exact-envelope", "restore accepts the minimal exact envelope", () => {
        const source = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}');
        const target = hson.liveMap.fromJson({ old: true });
        target.restore(exact_input(source.capture()));
        return { assertRows: [equal_row("minimal closure", target.capture().payload, source.capture().payload)] };
      }),
      test("exact-restore-ignores-a-divergent-compatibility-value", "exact restore ignores a divergent compatibility value", () => {
        const source = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}');
        const capture = source.capture();
        const target = hson.liveMap.fromJson({ old: true });
        target.restore({ ...capture, value: { degraded: true } });
        return { assertRows: [equal_row("exact payload wins", target.capture().payload, capture.payload)] };
      }),
      test("exact-apply-reconstructs-complete-canonical-order", "exact apply reconstructs complete canonical order", () => {
        const source = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}');
        const capture = source.capture();
        const target = hson.liveMap.fromJson({ old: true });
        target.apply({ prevRev: 0, format: capture.format, formatVersion: capture.formatVersion, payload: capture.payload });
        return { assertRows: [equal_row("apply closure", target.capture().payload, capture.payload)] };
      }),
      test("exact-apply-preserves-negative-zero", "exact apply preserves negative zero", () => {
        const capture = hson.liveMap.fromJson({ value: -0 }).capture();
        const target = hson.liveMap.fromJson({ value: 0 });
        target.apply({ prevRev: 0, format: capture.format, formatVersion: capture.formatVersion, payload: capture.payload });
        return { assertRows: [same_value_row("apply negative zero", target.snap(["value"]), -0)] };
      }),
      test("data-commits-carry-exact-replay-transport", "data commits carry exact replay transport", () => {
        const commit = hson.liveMap.fromJson({ value: 0 }).set(["value"], -0);
        return { assertRows: [
          equal_row("commit format", commit.format, "structural-json"),
          equal_row("commit version", commit.formatVersion, 1),
          equal_row("commit payload", typeof commit.payload, "string"),
          equal_row("legacy ops retained", commit.ops.length, 1),
        ] };
      }),
      test("direct-commit-replay-preserves-an-ordered-object-inside-an-array", "direct commit replay preserves an ordered object inside an array", () => {
        const source = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}]}');
        const target = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}]}');
        target.replay(source.splice(["items"], 1, 0, 4));
        return { assertRows: [equal_row("replay closure", target.capture().payload, source.capture().payload)] };
      }),
      test("exact-replay-supports-later-tail-operations", "exact replay supports later tail operations", () => {
        const source = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}]}');
        const target = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}]}');
        target.replay(source.splice(["items"], 1, 0, 4));
        target.splice(["items"], 2, 0, -0);
        return { assertRows: [same_value_row("tail negative zero", target.snap(["items", 2]), -0)] };
      }),
      test("same-order-exact-replay-succeeds", "same-order exact replay succeeds", () => {
        const source = hson.liveMap.fromJson('{"target":{"a":1,"b":2}}');
        const target = hson.liveMap.fromJson('{"target":{"a":1,"b":2}}');
        const replay = target.replay(source.replace(["target"], { a: 10, b: 20 }));
        return { assertRows: [equal_row("changed", replay.changed, true)] };
      }),
      test("exact-replay-conflicts-when-previous-property-order-differs", "exact replay conflicts when previous property order differs", () => {
        const source = hson.liveMap.fromJson('{"target":{"a":1,"b":2}}');
        const target = hson.liveMap.fromJson('{"target":{"b":2,"a":1}}');
        const result = conflict(() => target.replay(source.replace(["target"], { a: 10, b: 20 })));
        return { assertRows: [
          equal_row("conflict code", result.code, "REPLAY_CONFLICT"),
          equal_row("ordered witnesses differ", result.expectedPayload !== result.actualPayload, true),
          equal_row("revision unchanged", target.rev, 0),
        ] };
      }),
      test("exact-replay-conflicts-when-previous-zero-differs-by-sign", "exact replay conflicts when previous zero differs by sign", () => {
        const source = hson.liveMap.fromJson({ value: 0 });
        const target = hson.liveMap.fromJson({ value: -0 });
        const result = conflict(() => target.replay(source.set(["value"], 1)));
        return { assertRows: [
          equal_row("conflict code", result.code, "REPLAY_CONFLICT"),
          equal_row("expected witness", result.expectedPayload, "0"),
          equal_row("actual witness", result.actualPayload, "-0"),
        ] };
      }),
      test("exact-replay-snapshots-input-before-caller-mutation", "exact replay snapshots input before caller mutation", () => {
        const source = hson.liveMap.fromJson({ value: 0 });
        const target = hson.liveMap.fromJson({ value: 0 });
        const commit = source.set(["value"], -0);
        const input = { prevRev: 0, format: commit.format!, formatVersion: commit.formatVersion!, payload: commit.payload! };
        target.replay(input);
        input.payload = "[]";
        return { assertRows: [same_value_row("state detached", target.snap(["value"]), -0)] };
      }),
      test("exact-outputs-never-silently-downgrade-to-legacy-only-shapes", "exact outputs never silently downgrade to legacy-only shapes", () => {
        const map = hson.liveMap.fromJson({ value: 0 });
        const capture = map.capture();
        const commit = map.set(["value"], 1);
        return { assertRows: [
          equal_row("capture exact fields", Object.hasOwn(capture, "payload"), true),
          equal_row("commit exact fields", Object.hasOwn(commit, "payload"), true),
        ] };
      }),
    ],
  };
}
