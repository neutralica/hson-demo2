import { hson } from "hson-live";
import type { JsonValue, LiveMap } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, ordered_keys_row, own_value_row, same_value_row } from "./assert-helpers";
import { replay_fixture } from "./replay-test-helper";

const SUITE = "livemap/projected-equality";

function test(caseId: string, name: string, run: TestCase["run"]): TestCase {
  return { suite: SUITE, caseId, name, run };
}

function own_record(entries: readonly (readonly [string, JsonValue])[]): Record<string, JsonValue> {
  const value: Record<string, JsonValue> = {};
  for (const [key, child] of entries) {
    Object.defineProperty(value, key, {
      value: child,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return value;
}

function number_map(value: number): LiveMap<{ value: number }> {
  return hson.liveMap.fromJson({ value }) as unknown as LiveMap<{ value: number }>;
}

export function livemap_projected_equality_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("mutation-from-positive-zero-to-negative-zero-publishes", "mutation from positive zero to negative zero publishes", () => {
        const map = number_map(0);
        const commit = map.at(["value"]).set(-0);
        return { assertRows: [
          equal_row("transition changed", commit.changed, true),
          equal_row("revision advanced", map.rev, 1),
          same_value_row("stored value is negative zero", map.snap(["value"]), -0),
        ] };
      }),
      test("mutation-from-negative-zero-to-negative-zero-is-a-no-op", "mutation from negative zero to negative zero is a no-op", () => {
        const map = number_map(-0);
        const commit = map.at(["value"]).set(-0);
        return { assertRows: [
          equal_row("transition suppressed", commit.changed, false),
          equal_row("revision retained", map.rev, 0),
          same_value_row("stored value remains negative zero", map.snap(["value"]), -0),
        ] };
      }),
      test("ordinary-object-order-only-replacement-publishes", "ordinary object order-only replacement publishes", () => {
        const map = hson.liveMap.fromJson('{"value":{"a":1,"b":2}}');
        const commit = map.replace(["value"], { b: 2, a: 1 });
        const value = map.snap(["value"]) as object;
        return { assertRows: [
          equal_row("order transition changed", commit.changed, true),
          ordered_keys_row("replacement order retained", value, ["b", "a"]),
        ] };
      }),
      test("identical-ordinary-object-order-is-a-no-op", "identical ordinary object order is a no-op", () => {
        const map = hson.liveMap.fromJson('{"value":{"a":1,"b":2}}');
        const commit = map.replace(["value"], { a: 1, b: 2 });
        return { assertRows: [equal_row("same order suppressed", commit.changed, false)] };
      }),
      test("canonical-integer-like-order-is-compared-before-public-enumeration", "canonical integer-like order is compared before public enumeration", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":"ten","2":"two","1":"one"}}');
        const commit = map.replace(["value"], { "1": "one", "2": "two", "10": "ten" });
        return { assertRows: [equal_row("integer order transition changed", commit.changed, true)] };
      }),
      test("nested-object-order-only-replacement-publishes", "nested object order-only replacement publishes", () => {
        const map = hson.liveMap.fromJson({ value: { nested: { a: 1, b: 2 } } });
        const commit = map.replace(["value"], { nested: { b: 2, a: 1 } });
        return { assertRows: [equal_row("nested order transition changed", commit.changed, true)] };
      }),
      test("reordered-arrays-remain-unequal", "reordered arrays remain unequal", () => {
        const map = hson.liveMap.fromJson({ value: [1, 2] });
        const commit = map.replace(["value"], [2, 1]);
        return { assertRows: [equal_row("array order transition changed", commit.changed, true)] };
      }),
      test("array-item-positive-and-negative-zero-remain-unequal", "array item positive and negative zero remain unequal", () => {
        const map = hson.liveMap.fromJson({ value: [0] });
        const commit = map.replace(["value"], [-0]);
        const value = map.snap(["value"]) as number[];
        return { assertRows: [
          equal_row("array zero transition changed", commit.changed, true),
          same_value_row("array stores negative zero", value[0], -0),
        ] };
      }),
      test("dangerous-key-value-change-publishes-safely", "dangerous-key value change publishes safely", () => {
        const map = hson.liveMap.fromJson('{"value":{"__proto__":1}}');
        const commit = map.replace(["value"], own_record([["__proto__", 2]]));
        const value = map.snap(["value"]) as object;
        return { assertRows: [
          equal_row("dangerous value transition changed", commit.changed, true),
          own_value_row("dangerous value remains own data", value, "__proto__", 2),
          equal_row("prototype remains ordinary", Object.getPrototypeOf(value) === Object.prototype, true),
        ] };
      }),
      test("identical-dangerous-key-entries-are-a-no-op", "identical dangerous-key entries are a no-op", () => {
        const map = hson.liveMap.fromJson('{"value":{"__proto__":1,"constructor":2,"prototype":3}}');
        const commit = map.replace(["value"], own_record([["__proto__", 1], ["constructor", 2], ["prototype", 3]]));
        return { assertRows: [equal_row("dangerous entries suppressed", commit.changed, false)] };
      }),
      test("present-empty-object-differs-from-absence", "present empty object differs from absence", () => {
        const map = hson.liveMap.fromJson({});
        const commit = map.setMany([], { value: {} });
        return { assertRows: [
          equal_row("present empty object changed", commit.changed, true),
          equal_row("empty object is present", Object.hasOwn(map.snap() as object, "value"), true),
        ] };
      }),
      test("empty-object-and-empty-array-remain-unequal", "empty object and empty array remain unequal", () => {
        const map = hson.liveMap.fromJson({ value: {} });
        const commit = map.replace(["value"], []);
        return { assertRows: [equal_row("empty domain transition changed", commit.changed, true)] };
      }),
      test("identical-isolated-surrogate-strings-are-a-no-op", "identical isolated surrogate strings are a no-op", () => {
        const map = hson.liveMap.fromJson({ value: "\ud800" });
        const commit = map.replace(["value"], "\ud800");
        return { assertRows: [equal_row("same code unit suppressed", commit.changed, false)] };
      }),
      test("different-isolated-surrogate-strings-publish", "different isolated surrogate strings publish", () => {
        const map = hson.liveMap.fromJson({ value: "\ud800" });
        const commit = map.replace(["value"], "\ud801");
        return { assertRows: [equal_row("different code unit changed", commit.changed, true)] };
      }),
      test("array-includes-rejects-reordered-object-entries", "array includes rejects reordered object entries", () => {
        const map = hson.liveMap.fromJson({ items: [{ a: 1, b: 2 }] });
        return { assertRows: [equal_row("reordered object absent", map.at(["items"]).array.includes({ b: 2, a: 1 }), false)] };
      }),
      test("array-includes-accepts-identical-object-entry-order", "array includes accepts identical object entry order", () => {
        const map = hson.liveMap.fromJson({ items: [{ a: 1, b: 2 }] });
        return { assertRows: [equal_row("same ordered object present", map.at(["items"]).array.includes({ a: 1, b: 2 }), true)] };
      }),
      test("array-includes-distinguishes-positive-and-negative-zero", "array includes distinguishes positive and negative zero", () => {
        const map = hson.liveMap.fromJson({ items: [0] });
        return { assertRows: [equal_row("negative zero absent", map.at(["items"]).array.includes(-0), false)] };
      }),
      test("array-indexof-rejects-reordered-object-entries", "array indexOf rejects reordered object entries", () => {
        const map = hson.liveMap.fromJson({ items: [{ a: 1, b: 2 }] });
        return { assertRows: [equal_row("reordered object index", map.at(["items"]).array.indexOf({ b: 2, a: 1 }), -1)] };
      }),
      test("array-indexof-accepts-identical-object-entry-order", "array indexOf accepts identical object entry order", () => {
        const map = hson.liveMap.fromJson({ items: [{ a: 1, b: 2 }] });
        return { assertRows: [equal_row("same ordered object index", map.at(["items"]).array.indexOf({ a: 1, b: 2 }), 0)] };
      }),
      test("array-unique-retains-both-positive-and-negative-zero", "array unique retains both positive and negative zero", () => {
        const map = hson.liveMap.fromJson({ items: [0, -0, 0] });
        map.at(["items"]).array.unique();
        const items = map.snap(["items"]) as number[];
        return { assertRows: [
          equal_row("two SameValue items remain", items.length, 2),
          same_value_row("first remains positive zero", items[0], 0),
          same_value_row("second remains negative zero", items[1], -0),
        ] };
      }),
      test("array-removevalue-removes-only-the-samevalue-match", "array removeValue removes only the SameValue match", () => {
        const map = hson.liveMap.fromJson({ items: [0, -0] });
        map.at(["items"]).array.removeValue(-0);
        const items = map.snap(["items"]) as number[];
        return { assertRows: [
          equal_row("one item remains", items.length, 1),
          same_value_row("positive zero remains", items[0], 0),
        ] };
      }),
      test("replay-conflicts-on-differently-ordered-declared-previous-value", "replay conflicts on differently ordered declared previous value", () => {
        const source = hson.liveMap.fromJson('{"user":{"a":1,"b":2}}');
        const commit = source.replace(["user"], { a: 3, b: 4 });
        const target = hson.liveMap.fromJson('{"user":{"b":2,"a":1}}');
        let code = "NO_ERROR";
        try { replay_fixture(target,{ prevRev: 0, ops: commit.ops }); }
        catch (error) { code = String((error as Error & { code?: unknown }).code); }
        return { assertRows: [
          equal_row("replay reports ordered conflict", code, "REPLAY_CONFLICT"),
          equal_row("target revision stays unchanged", target.rev, 0),
        ] };
      }),
      test("replay-accepts-the-same-ordered-declared-previous-value", "replay accepts the same ordered declared previous value", () => {
        const source = hson.liveMap.fromJson('{"user":{"a":1,"b":2}}');
        const commit = source.replace(["user"], { a: 3, b: 4 });
        const target = hson.liveMap.fromJson('{"user":{"a":1,"b":2}}');
        const replayed = replay_fixture(target,{ prevRev: 0, ops: commit.ops });
        return { assertRows: [
          equal_row("same order replay changed", replayed.changed, true),
          equal_row("target revision advanced", target.rev, 1),
        ] };
      }),
      test("store-ordered-equality-publishes-order-and-zero-changes-only", "store ordered equality publishes order and zero changes only", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1, b: 2 }, number: 0 });
        let diffs = 0;
        let numberEvents = 0;
        const stopDiff = map.sub.diff(() => { diffs += 1; });
        const stopNumber = map.sub.path(["number"], () => { numberEvents += 1; });
        map.replace(["value"], { b: 2, a: 1 });
        map.replace(["number"], -0);
        map.replace(["number"], -0);
        stopDiff();
        stopNumber();
        return { assertRows: [
          equal_row("diff publishes order and zero changes", diffs, 2),
          equal_row("path publishes only positive-to-negative zero", numberEvents, 1),
          same_value_row("store route leaves negative zero", map.snap(["number"]), -0),
        ] };
      }),
    ],
  };
}
