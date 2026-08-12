import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, own_value_row, same_value_row } from "./assert-helpers";

const SUITE = "livemap/equivalence-schema-helper-matrix";
const test = (name: string, run: TestCase["run"]): TestCase => ({ suite: SUITE, name, run });

function own_record(entries: readonly (readonly [string, JsonValue])[], prototype: object | null = Object.prototype): Record<string, JsonValue> {
  const value = Object.create(prototype) as Record<string, JsonValue>;
  for (const [key, child] of entries) Object.defineProperty(value, key, { value: child, enumerable: true, writable: true, configurable: true });
  return value;
}

export function livemap_equivalence_schema_helper_matrix_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("direct and attached schemas admit the same finite number", () => {
        const schema = hson.liveMap.schema.define((s) => s.object({ value: s.number })); const map = hson.liveMap.fromJson({ value: 1 }); map.schema.use(schema);
        return { assertRows: [equal_row("direct", schema.validateRoot({ value: 2 }).ok, true), equal_row("attached", map.set(["value"], 2).changed, true)] };
      }),
      test("schema literals distinguish negative zero", () => {
        const schema = hson.liveMap.schema.define((s) => s.literal(-0));
        return { assertRows: [equal_row("negative", schema.validateRoot(-0).ok, true), equal_row("positive", schema.validateRoot(0).ok, false)] };
      }),
      test("exact schemas treat dangerous names as own keys", () => {
        const schema = hson.liveMap.schema.define((s) => {
          const shape = own_record([["__proto__", s.number as unknown as JsonValue], ["constructor", s.number as unknown as JsonValue], ["prototype", s.number as unknown as JsonValue]]);
          return s.exact(shape as never);
        }); const value = own_record([["__proto__", 1], ["constructor", 2], ["prototype", 3]]);
        return { assertRows: [equal_row("accepted", schema.validateRoot(value).ok, true)] };
      }),
      test("schema literals retain ordered object entries", () => {
        const schema = hson.liveMap.schema.define((s) => s.literal({ b: 2, a: 1 }));
        return { assertRows: [equal_row("same order", schema.validateRoot({ b: 2, a: 1 }).ok, true), equal_row("different order", schema.validateRoot({ a: 1, b: 2 }).ok, false)] };
      }),
      test("direct and attached schemas admit nested arrays and objects", () => {
        const schema = hson.liveMap.schema.define((s) => s.object({ value: s.unknown })); const value = { nested: [{ ok: true }, -0] }; const map = hson.liveMap.fromJson({ value: {} }); map.schema.use(schema);
        return { assertRows: [equal_row("direct", schema.validateRoot({ value }).ok, true), equal_row("attached", map.replace(["value"], value).changed, true)] };
      }),
      test("direct and attached schemas admit null-prototype records", () => {
        const value = own_record([["field", 1]], null); const schema = hson.liveMap.schema.define((s) => s.object({ value: s.unknown })); const map = hson.liveMap.fromJson({ value: {} }); map.schema.use(schema);
        return { assertRows: [equal_row("direct", schema.validateRoot({ value }).ok, true), equal_row("attached", map.set(["value"], value).changed, true)] };
      }),
      test("schema admission structurally copies repeated references", () => {
        const child = { value: 1 }; const value = { left: child, right: child }; const schema = hson.liveMap.schema.define((s) => s.object({ value: s.unknown })); const map = hson.liveMap.fromJson({ value: {} }); map.schema.use(schema); map.set(["value"], value); child.value = 9;
        return { assertRows: [equal_row("stored left", map.snap(["value", "left", "value"]), 1), equal_row("stored right", map.snap(["value", "right", "value"]), 1)] };
      }),
      test("schema admission accepts frozen objects and sealed dense arrays", () => {
        const value = Object.freeze({ items: Object.seal([1, 2]) }); const schema = hson.liveMap.schema.define((s) => s.unknown);
        return { assertRows: [equal_row("accepted", schema.validateRoot(value).ok, true)] };
      }),
      test("optional means missing while present undefined remains invalid", () => {
        const schema = hson.liveMap.schema.define((s) => s.object({ value: s.number.optional })); const present = own_record([["value", undefined as unknown as JsonValue]]);
        return { assertRows: [equal_row("missing", schema.validateRoot({}).ok, true), equal_row("undefined", schema.validateRoot(present).ok, false)] };
      }),
      test("custom refinements receive fresh detached values", () => {
        const seen: object[] = []; const schema = hson.liveMap.schema.define((s) => s.refine(s.unknown, "detached", (value) => { seen.push(value as object); (value as Record<string, JsonValue>).a = 9; return true; }));
        schema.validateRoot({ a: 1 }); schema.validateRoot({ a: 1 });
        return { assertRows: [equal_row("fresh", Object.is(seen[0], seen[1]), false), equal_row("source retained", (seen[1] as Record<string, JsonValue>).a, 9)] };
      }),
      test("object keys expose canonical integer-like order", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        return { assertRows: [equal_row("keys", map.at(["value"]).object.keys(), ["10", "2", "1"])] };
      }),
      test("object values expose canonical integer-like order", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":"ten","2":"two","1":"one"}}');
        return { assertRows: [equal_row("values", map.at(["value"]).object.values(), ["ten", "two", "one"])] };
      }),
      test("object entries expose dangerous own keys", () => {
        const map = hson.liveMap.fromJson('{"value":{"__proto__":1,"constructor":2,"prototype":3}}');
        return { assertRows: [equal_row("entries", map.at(["value"]).object.entries(), [["__proto__", 1], ["constructor", 2], ["prototype", 3]])] };
      }),
      test("object setKey retains an existing position", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}'); map.at(["value"]).object.setKey("2", 22);
        return { assertRows: [equal_row("keys", map.at(["value"]).object.keys(), ["10", "2", "1"])] };
      }),
      test("object rename retains the source position", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1, b: 2, c: 3 } }); map.at(["value"]).object.renameKey("b", "renamed");
        return { assertRows: [equal_row("keys", map.at(["value"]).object.keys(), ["a", "renamed", "c"])] };
      }),
      test("object helper results are detached and prototype-safe", () => {
        const map = hson.liveMap.fromJson('{"value":{"__proto__":{"count":1}}}'); const first = map.at(["value"]).object.toObject() as Record<string, { count: number }>; first.__proto__!.count = 9; const second = map.at(["value"]).object.toObject();
        return { assertRows: [own_value_row("own key", second, "__proto__", (second as Record<string, unknown>).__proto__), equal_row("state", map.snap(["value", "__proto__", "count"]), 1)] };
      }),
      test("array includes compares ordered nested objects", () => {
        const map = hson.liveMap.fromJson({ items: [{ a: 1, b: 2 }] });
        return { assertRows: [equal_row("same", map.at(["items"]).array.includes({ a: 1, b: 2 }), true), equal_row("reordered", map.at(["items"]).array.includes({ b: 2, a: 1 }), false)] };
      }),
      test("array indexOf distinguishes both zero signs", () => {
        const map = hson.liveMap.fromJson({ items: [0, -0] });
        return { assertRows: [equal_row("positive", map.at(["items"]).array.indexOf(0), 0), equal_row("negative", map.at(["items"]).array.indexOf(-0), 1)] };
      }),
      test("array unique uses ordered SameValue", () => {
        const map = hson.liveMap.fromJson({ items: [0, -0, 0, -0] }); map.at(["items"]).array.unique(); const values = map.at(["items"]).array.toArray();
        return { assertRows: [equal_row("length", values.length, 2), same_value_row("first", values[0], 0), same_value_row("second", values[1], -0)] };
      }),
      test("array removeValue matches dangerous nested data exactly", () => {
        const dangerous = own_record([["__proto__", 1]]); const map = hson.liveMap.fromJson({ items: [dangerous, { keep: true }] }); map.at(["items"]).array.removeValue(dangerous);
        return { assertRows: [equal_row("remaining", map.at(["items"]).array.toArray(), [{ keep: true }])] };
      }),
    ],
  };
}
