import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, own_value_row, same_value_row } from "./assert-helpers";

const SUITE = "livemap/ordered-object-array-helpers";
const test = (name: string, run: TestCase["run"]): TestCase => ({ suite: SUITE, name, run });

function own_record(entries: readonly (readonly [string, JsonValue])[]): Record<string, JsonValue> {
  const value: Record<string, JsonValue> = {};
  for (const [key, child] of entries) {
    Object.defineProperty(value, key, { value: child, enumerable: true, writable: true, configurable: true });
  }
  return value;
}

function rejected(run: () => unknown): boolean {
  try { run(); return false; } catch { return true; }
}

export function livemap_ordered_object_array_helpers_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("object keys expose canonical integer-like order", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"tail":0}}');
        return { assertRows: [equal_row("keys", map.at(["value"]).object.keys(), ["10", "2", "1", "tail"])] };
      }),
      test("object values expose canonical order", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":"ten","2":"two","1":"one"}}');
        return { assertRows: [equal_row("values", map.at(["value"]).object.values(), ["ten", "two", "one"])] };
      }),
      test("object entries expose canonical order", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        return { assertRows: [equal_row("entries", map.at(["value"]).object.entries(), [["10", 10], ["2", 2], ["1", 1]])] };
      }),
      test("object membership treats dangerous keys as own data", () => {
        const map = hson.liveMap.fromJson('{"value":{"__proto__":1,"constructor":2,"prototype":3}}');
        const object = map.at(["value"]).object;
        return { assertRows: [
          equal_row("__proto__", object.hasKey("__proto__"), true),
          equal_row("constructor", object.hasKey("constructor"), true),
          equal_row("prototype", object.hasKey("prototype"), true),
        ] };
      }),
      test("object getKey materializes dangerous data safely", () => {
        const map = hson.liveMap.fromJson('{"value":{"__proto__":{"nested":1}}}');
        const value = map.at(["value"]).object.getKey("__proto__") as object;
        return { assertRows: [equal_row("nested", (value as Record<string, unknown>).nested, 1)] };
      }),
      test("replacing an existing key retains its position", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        map.at(["value"]).object.setKey("2", 22);
        return { assertRows: [
          equal_row("keys", map.at(["value"]).object.keys(), ["10", "2", "1"]),
          equal_row("value", map.snap(["value", "2"]), 22),
        ] };
      }),
      test("a new key appends", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2}}');
        map.at(["value"]).object.setKey("tail", 3);
        return { assertRows: [equal_row("keys", map.at(["value"]).object.keys(), ["10", "2", "tail"])] };
      }),
      test("setMany appends in admitted order", () => {
        const map = hson.liveMap.fromJson({ value: { first: 1 } });
        map.at(["value"]).object.setMany({ third: 3, second: 2 });
        return { assertRows: [equal_row("keys", map.at(["value"]).object.keys(), ["first", "third", "second"])] };
      }),
      test("rename retains the source position", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1, b: 2, c: 3 } });
        map.at(["value"]).object.renameKey("b", "renamed");
        return { assertRows: [equal_row("keys", map.at(["value"]).object.keys(), ["a", "renamed", "c"])] };
      }),
      test("rename overwrites a destination at the source position", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1, b: 2, c: 3 } });
        map.at(["value"]).object.renameKey("c", "a");
        return { assertRows: [
          equal_row("keys", map.at(["value"]).object.keys(), ["b", "a"]),
          equal_row("value", map.snap(["value", "a"]), 3),
        ] };
      }),
      test("dangerous keys can be deleted", () => {
        const map = hson.liveMap.fromJson('{"value":{"__proto__":1,"tail":2}}');
        map.at(["value"]).object.deleteKey("__proto__");
        return { assertRows: [equal_row("keys", map.at(["value"]).object.keys(), ["tail"])] };
      }),
      test("pick materializes the selected own data", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"tail":0}}');
        const picked = map.at(["value"]).object.pick(["1", "10"]);
        return { assertRows: [own_value_row("ten", picked, "10", 10), own_value_row("one", picked, "1", 1)] };
      }),
      test("omit retains canonical source order", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1, b: 2, c: 3 } });
        return { assertRows: [equal_row("keys", Object.keys(map.at(["value"]).object.omit(["b"])), ["a", "c"])] };
      }),
      test("object helper outputs are detached", () => {
        const map = hson.liveMap.fromJson({ value: { nested: { count: 1 } } });
        const first = map.at(["value"]).object.toObject() as Record<string, { count: number }>;
        if (first.nested === undefined) throw new Error("Expected nested object.");
        first.nested.count = 99;
        const second = map.at(["value"]).object.toObject() as Record<string, { count: number }>;
        if (second.nested === undefined) throw new Error("Expected fresh nested object.");
        return { assertRows: [equal_row("state", map.snap(["value", "nested", "count"]), 1), equal_row("fresh", second.nested.count, 1)] };
      }),
      test("invalid object helper input rejects atomically", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1 } });
        const before = map.capture();
        const didReject = rejected(() => map.at(["value"]).object.setKey("bad", undefined as never));
        return { assertRows: [equal_row("rejected", didReject, true), equal_row("revision", map.rev, 0), equal_row("capture", map.capture(), before)] };
      }),
      test("array includes compares nested object order", () => {
        const map = hson.liveMap.fromJson({ items: [{ a: 1, b: 2 }] });
        return { assertRows: [
          equal_row("same order", map.at(["items"]).array.includes({ a: 1, b: 2 }), true),
          equal_row("different order", map.at(["items"]).array.includes({ b: 2, a: 1 }), false),
        ] };
      }),
      test("array indexOf compares nested object order", () => {
        const map = hson.liveMap.fromJson({ items: [{ a: 1, b: 2 }, { b: 2, a: 1 }] });
        return { assertRows: [equal_row("index", map.at(["items"]).array.indexOf({ b: 2, a: 1 }), 1)] };
      }),
      test("array helpers distinguish positive and negative zero", () => {
        const map = hson.liveMap.fromJson({ items: [0, -0] });
        return { assertRows: [
          equal_row("positive index", map.at(["items"]).array.indexOf(0), 0),
          equal_row("negative index", map.at(["items"]).array.indexOf(-0), 1),
        ] };
      }),
      test("array unique uses ordered SameValue", () => {
        const map = hson.liveMap.fromJson({ items: [0, -0, 0, -0] });
        map.at(["items"]).array.unique();
        const items = map.at(["items"]).array.toArray();
        return { assertRows: [equal_row("length", items.length, 2), same_value_row("first", items[0], 0), same_value_row("second", items[1], -0)] };
      }),
      test("array removeValue uses ordered object equality", () => {
        const map = hson.liveMap.fromJson({ items: [{ a: 1, b: 2 }, { b: 2, a: 1 }] });
        map.at(["items"]).array.removeValue({ b: 2, a: 1 });
        return { assertRows: [equal_row("remaining", map.at(["items"]).array.toArray(), [{ a: 1, b: 2 }])] };
      }),
      test("array removeAll preserves the other zero", () => {
        const map = hson.liveMap.fromJson({ items: [0, -0, -0] });
        map.at(["items"]).array.removeAll(-0);
        const items = map.at(["items"]).array.toArray();
        return { assertRows: [equal_row("length", items.length, 1), same_value_row("remaining", items[0], 0)] };
      }),
      test("array move preserves exact positions", () => {
        const map = hson.liveMap.fromJson({ items: ["a", "b", "c"] });
        map.at(["items"]).array.move(2, 0);
        return { assertRows: [equal_row("items", map.at(["items"]).array.toArray(), ["c", "a", "b"])] };
      }),
      test("array insertion preserves dangerous nested data", () => {
        const map = hson.liveMap.fromJson({ items: [] });
        map.at(["items"]).array.push(own_record([["__proto__", 1], ["constructor", 2]]));
        const value = map.at(["items"]).array.first() as object;
        return { assertRows: [own_value_row("__proto__", value, "__proto__", 1), own_value_row("constructor", value, "constructor", 2)] };
      }),
      test("sparse array helper input rejects atomically", () => {
        const map = hson.liveMap.fromJson({ items: [1] });
        const sparse = new Array(2); sparse[1] = 2;
        const before = map.capture();
        const didReject = rejected(() => map.at(["items"]).array.pushMany(sparse as never));
        return { assertRows: [equal_row("rejected", didReject, true), equal_row("revision", map.rev, 0), equal_row("capture", map.capture(), before)] };
      }),
    ],
  };
}
