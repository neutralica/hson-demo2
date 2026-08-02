import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, own_value_row, same_value_row } from "./assert-helpers";

const SUITE = "livemap/equivalence-mutation-matrix";
const test = (name: string, run: TestCase["run"]): TestCase => ({ suite: SUITE, name, run });

function own_record(entries: readonly (readonly [string, JsonValue])[], prototype: object | null = Object.prototype): Record<string, JsonValue> {
  const value = Object.create(prototype) as Record<string, JsonValue>;
  for (const [key, child] of entries) Object.defineProperty(value, key, { value: child, enumerable: true, writable: true, configurable: true });
  return value;
}

function transform_payload(value: JsonValue | string): string {
  const map = hson.liveMap.fromNode(hson.fromJson(value).toNode());
  if (map.mode !== "data-object" && map.mode !== "data-array") throw new Error(`Expected a data map, observed ${map.mode}.`);
  return map.capture().payload;
}

export function livemap_equivalence_mutation_matrix_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("construction matches Transform for a plain object", () => {
        const value = { a: 1, nested: { ok: true } };
        return { assertRows: [equal_row("canonical payload", hson.liveMap.fromJson(value).capture().payload, transform_payload(value))] };
      }),
      test("construction matches Transform for a null-prototype object", () => {
        const value = own_record([["a", 1], ["b", "two"]], null);
        return { assertRows: [equal_row("canonical payload", hson.liveMap.fromJson(value).capture().payload, transform_payload(value))] };
      }),
      test("construction matches Transform for frozen nested values", () => {
        const value = Object.freeze({ nested: Object.freeze({ value: 1 }) });
        return { assertRows: [equal_row("canonical payload", hson.liveMap.fromJson(value).capture().payload, transform_payload(value))] };
      }),
      test("set closes positive zero to negative zero", () => {
        const map = hson.liveMap.fromJson({ value: 0 }); map.set(["value"], -0);
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value: -0 })), same_value_row("snapshot", map.snap(["value"]), -0)] };
      }),
      test("set closes empty strings without absence coercion", () => {
        const map = hson.liveMap.fromJson({ value: "old" }); map.set(["value"], "");
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value: "" }))] };
      }),
      test("set closes isolated surrogate code units", () => {
        const map = hson.liveMap.fromJson({ value: "old" }); map.set(["value"], "\ud800x\udfff");
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value: "\ud800x\udfff" }))] };
      }),
      test("set closes nested object and array values", () => {
        const value = { nested: [{ a: 1 }, [true, null]] }; const map = hson.liveMap.fromJson({ value: null }); map.set(["value"], value);
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value }))] };
      }),
      test("set preserves dangerous own data properties", () => {
        const value = own_record([["__proto__", 1], ["constructor", 2], ["prototype", 3]]); const map = hson.liveMap.fromJson({ value: null }); map.set(["value"], value);
        const publicValue = map.snap(["value"]) as object;
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value })), own_value_row("__proto__", publicValue, "__proto__", 1)] };
      }),
      test("setMany retains integer-like positions and appends admitted order", () => {
        const map = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}'); map.setMany([], { tail: -0, after: 4 });
        const expected = hson.liveMap.fromJson('{"10":10,"2":2,"1":1,"tail":-0,"after":4}');
        return { assertRows: [equal_row("canonical payload", map.capture().payload, expected.capture().payload)] };
      }),
      test("setMany preserves dangerous keys as own data", () => {
        const additions = own_record([["__proto__", "data"], ["constructor", false], ["prototype", null]]); const map = hson.liveMap.fromJson({ kept: true }); map.setMany([], additions);
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload(own_record([["kept", true], ...Reflect.ownKeys(additions).map((key) => [key as string, additions[key as string]!] as const)])))] };
      }),
      test("whole replacement adopts the complete admitted order", () => {
        const value = own_record([["z", 1], ["a", 2], ["m", 3]]); const map = hson.liveMap.fromJson({ old: true }); map.replace(value);
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload(value))] };
      }),
      test("nested replacement closes against Transform", () => {
        const value = own_record([["z", [1, -0]], ["a", { child: true }]]); const map = hson.liveMap.fromJson({ target: { old: true } }); map.replace(["target"], value);
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ target: value }))] };
      }),
      test("path update consumes one admitted result", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1 } }); map.at(["value"]).update(() => ({ b: 2, a: -0 }));
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value: { a: -0, b: 2 } }))] };
      }),
      test("batch closes its staged candidate once", () => {
        const map = hson.liveMap.fromJson({ value: 0, items: [1] }); map.batch((tx) => { tx.set(["value"], -0); tx.splice(["items"], 1, 0, { nested: true }); });
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value: -0, items: [1, { nested: true }] }))] };
      }),
      test("object helper writes close through the shared constructor", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1 } }); map.at(["value"]).object.setKey("b", { nested: [-0] });
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value: { a: 1, b: { nested: [-0] } } }))] };
      }),
      test("array helper insertion closes objects inside arrays", () => {
        const map = hson.liveMap.fromJson({ items: [] }); map.at(["items"]).array.push({ a: 1, b: -0 });
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ items: [{ a: 1, b: -0 }] }))] };
      }),
      test("array helper replacement retains negative zero", () => {
        const map = hson.liveMap.fromJson({ items: [0] }); map.at(["items"]).array.replace(0, -0);
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ items: [-0] })), same_value_row("item", map.snap(["items", 0]), -0)] };
      }),
      test("repeated references become equal detached occurrences", () => {
        const child = { value: 1 }; const map = hson.liveMap.fromJson({ left: child, right: child }); const snap = map.snap() as Record<string, { value: number }>;
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ left: { value: 1 }, right: { value: 1 } })), equal_row("detached occurrences", Object.is(snap.left, snap.right), false)] };
      }),
      test("caller mutation after admission cannot alter a mutation", () => {
        const input = { nested: { value: 1 }, items: [1, 2] }; const map = hson.liveMap.fromJson({ value: null }); map.replace(["value"], input); input.nested.value = 9; input.items.push(3);
        return { assertRows: [equal_row("canonical payload", map.capture().payload, transform_payload({ value: { nested: { value: 1 }, items: [1, 2] } }))] };
      }),
      test("repeated accepted execution is byte deterministic", () => {
        const value = own_record([["danger", own_record([["__proto__", -0]])], ["items", ["\ud800", null]]]);
        return { assertRows: [equal_row("repeat payload", hson.liveMap.fromJson(value).capture().payload, hson.liveMap.fromJson(value).capture().payload)] };
      }),
    ],
  };
}
