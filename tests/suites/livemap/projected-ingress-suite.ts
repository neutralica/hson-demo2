import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row } from "./assert-helpers";

type CaseResult = Readonly<Record<string, unknown>>;

function result_case(
  suite: string,
  name: string,
  run: () => CaseResult,
  expected: CaseResult,
): TestCase {
  return {
    suite,
    name,
    run: () => ({ assertRows: [equal_row(name, run(), expected)] }),
  };
}

function own_data_record(
  entries: readonly (readonly [string, unknown])[],
  prototype: object | null = Object.prototype,
): Record<string, unknown> {
  const record = Object.create(prototype) as Record<string, unknown>;
  for (const [key, value] of entries) {
    Object.defineProperty(record, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return record;
}

function projected_error_reason(error: unknown): string {
  if (!(error instanceof Error)) return "NON_ERROR";
  const reason = (error as Error & { reasonCode?: unknown }).reasonCode;
  return typeof reason === "string" ? reason : "MISSING_REASON";
}

function rejected_mutation(value: unknown): CaseResult {
  const map = hson.liveMap.fromJson({ value: 0 });
  let feeds = 0;
  map.feed([], () => { feeds += 1; });
  let reason = "NO_ERROR";
  try {
    map.replace(["value"], value as JsonValue);
  } catch (error) {
    reason = projected_error_reason(error);
  }
  return { reason, rev: map.rev, feeds, unchanged: JSON.stringify(map.snap()) === '{"value":0}' };
}

export function livemap_projected_ingress_suite(): TestSuite {
  const SUITE = "livemap/projected-ingress";
  return {
    suite: SUITE,
    cases: [
      result_case(SUITE, "plain object admits and detaches", () => {
        const input = { nested: { value: 1 } };
        const map = hson.liveMap.fromJson(input);
        input.nested.value = 2;
        return { snap: map.snap() };
      }, { snap: { nested: { value: 1 } } }),
      result_case(SUITE, "null-prototype object admits to an ordinary public object", () => {
        const map = hson.liveMap.fromJson(own_data_record([["value", 1]], null) as JsonValue);
        const snap = map.snap() as object;
        return { ordinary: Object.getPrototypeOf(snap) === Object.prototype, value: (snap as Record<string, unknown>).value };
      }, { ordinary: true, value: 1 }),
      result_case(SUITE, "dense array admits with every own index", () => {
        const snap = hson.liveMap.fromJson([1, 2, 3]).snap() as JsonValue[];
        return { length: snap.length, dense: [0, 1, 2].every((index) => Object.hasOwn(snap, index)) };
      }, { length: 3, dense: true }),
      result_case(SUITE, "frozen object admits by copied value", () => ({
        snap: hson.liveMap.fromJson(Object.freeze({ value: 1 })).snap(),
      }), { snap: { value: 1 } }),
      result_case(SUITE, "sealed array admits by copied value", () => ({
        snap: hson.liveMap.fromJson(Object.seal([1, 2])).snap(),
      }), { snap: [1, 2] }),
      result_case(SUITE, "empty object remains an ordinary detached object", () => {
        const snap = hson.liveMap.fromJson({}).snap() as object;
        return { keys: Reflect.ownKeys(snap), ordinary: Object.getPrototypeOf(snap) === Object.prototype };
      }, { keys: [], ordinary: true }),
      result_case(SUITE, "empty array remains a dense ordinary array", () => {
        const snap = hson.liveMap.fromJson([]).snap();
        return { array: Array.isArray(snap), length: (snap as JsonValue[]).length };
      }, { array: true, length: 0 }),
      result_case(SUITE, "isolated surrogate code units survive admission", () => {
        const snap = hson.liveMap.fromJson({ value: "\ud800" }).snap(["value"]);
        return { length: (snap as string).length, unit: (snap as string).charCodeAt(0) };
      }, { length: 1, unit: 55296 }),
      result_case(SUITE, "negative zero survives construction and public reads", () => ({
        negativeZero: Object.is(hson.liveMap.fromJson({ value: -0 }).snap(["value"]), -0),
      }), { negativeZero: true }),
      result_case(SUITE, "repeated acyclic references become independent copies", () => {
        const shared = { value: 1 };
        const map = hson.liveMap.fromJson({ left: shared, right: shared });
        shared.value = 2;
        const snap = map.snap() as Record<string, Record<string, number>>;
        return { independent: snap.left !== snap.right, left: snap.left?.value, right: snap.right?.value };
      }, { independent: true, left: 1, right: 1 }),
      result_case(SUITE, "own __proto__ survives as public data", () => {
        const map = hson.liveMap.fromJson(own_data_record([["__proto__", "data"]]) as JsonValue);
        const snap = map.snap() as Record<string, unknown>;
        return { own: Object.hasOwn(snap, "__proto__"), value: snap.__proto__, ordinary: Object.getPrototypeOf(snap) === Object.prototype };
      }, { own: true, value: "data", ordinary: true }),
      result_case(SUITE, "own constructor survives as public data", () => {
        const snap = hson.liveMap.fromJson(own_data_record([["constructor", "data"]]) as JsonValue).snap() as Record<string, unknown>;
        return { own: Object.hasOwn(snap, "constructor"), value: snap.constructor };
      }, { own: true, value: "data" }),
      result_case(SUITE, "own prototype survives as public data", () => {
        const snap = hson.liveMap.fromJson(own_data_record([["prototype", "data"]]) as JsonValue).snap() as Record<string, unknown>;
        return { own: Object.hasOwn(snap, "prototype"), value: snap.prototype };
      }, { own: true, value: "data" }),
      result_case(SUITE, "nested mutation after admission cannot affect canonical state", () => {
        const input = { items: [{ value: 1 }] };
        const map = hson.liveMap.fromJson(input);
        input.items[0]!.value = 9;
        input.items.push({ value: 2 });
        return { snap: map.snap() };
      }, { snap: { items: [{ value: 1 }] } }),
      result_case(SUITE, "separate public snapshots share no nested references", () => {
        const map = hson.liveMap.fromJson({ nested: { value: 1 }, items: [1] });
        const first = map.snap() as Record<string, unknown>;
        const second = map.snap() as Record<string, unknown>;
        return { rootFresh: first !== second, nestedFresh: first.nested !== second.nested, arrayFresh: first.items !== second.items };
      }, { rootFresh: true, nestedFresh: true, arrayFresh: true }),
      result_case(SUITE, "public dangerous-key descriptors are writable enumerable configurable data", () => {
        const snap = hson.liveMap.fromJson('{"__proto__":1}').snap() as Record<string, unknown>;
        const descriptor = Object.getOwnPropertyDescriptor(snap, "__proto__");
        return { data: descriptor !== undefined && "value" in descriptor, enumerable: descriptor?.enumerable, writable: descriptor?.writable, configurable: descriptor?.configurable };
      }, { data: true, enumerable: true, writable: true, configurable: true }),
      result_case(SUITE, "integer-like public enumeration is truthful while graph order remains canonical", () => {
        const map = hson.liveMap.fromJson('{"10":"ten","2":"two","1":"one"}');
        const root = map.root().$_content[0] as { $_content: Array<{ $_tag: string }> };
        return { publicKeys: Object.keys(map.snap() as object), graphKeys: root.$_content.map((node) => node.$_tag) };
      }, { publicKeys: ["1", "2", "10"], graphKeys: ["10", "2", "1"] }),
      result_case(SUITE, "setMany admits an actual own __proto__ key safely", () => {
        const map = hson.liveMap.fromJson({ user: {} });
        map.setMany(["user"], own_data_record([["__proto__", "role"]]) as never);
        const snap = map.snap(["user"]) as Record<string, unknown>;
        return { own: Object.hasOwn(snap, "__proto__"), value: snap.__proto__, ordinary: Object.getPrototypeOf(snap) === Object.prototype };
      }, { own: true, value: "role", ordinary: true }),
      result_case(SUITE, "root replacement admits all three dangerous names safely", () => {
        const map = hson.liveMap.fromJson({ before: true });
        map.replace(own_data_record([["__proto__", 1], ["constructor", 2], ["prototype", 3]]) as JsonValue);
        const snap = map.snap() as Record<string, unknown>;
        return { keys: ["__proto__", "constructor", "prototype"].filter((key) => Object.hasOwn(snap, key)), ordinary: Object.getPrototypeOf(snap) === Object.prototype };
      }, { keys: ["__proto__", "constructor", "prototype"], ordinary: true }),
      result_case(SUITE, "admission preserves caller keys and descriptors", () => {
        const input = own_data_record([["b", 2], ["a", 1]]);
        const before = Object.getOwnPropertyDescriptors(input);
        hson.liveMap.fromJson(input as JsonValue);
        return { keys: Reflect.ownKeys(input), unchanged: JSON.stringify(Object.getOwnPropertyDescriptors(input)) === JSON.stringify(before) };
      }, { keys: ["b", "a"], unchanged: true }),
    ],
  };
}

export function livemap_projected_ingress_rejection_suite(): TestSuite {
  const SUITE = "livemap/projected-ingress-rejection";
  const rejection = (name: string, value: () => unknown, reason: string): TestCase => (
    result_case(SUITE, name, () => rejected_mutation(value()), { reason, rev: 0, feeds: 0, unchanged: true })
  );
  return {
    suite: SUITE,
    cases: [
      result_case(SUITE, "ordinary getter rejects without invocation or mutation", () => {
        let calls = 0;
        const input = {};
        Object.defineProperty(input, "value", { get() { calls += 1; return 1; }, enumerable: true });
        return { ...rejected_mutation(input), calls };
      }, { reason: "ACCESSOR_PROPERTY", rev: 0, feeds: 0, unchanged: true, calls: 0 }),
      result_case(SUITE, "ordinary setter rejects without invocation or mutation", () => {
        let calls = 0;
        const input = {};
        Object.defineProperty(input, "value", { set(_value) { calls += 1; }, enumerable: true });
        return { ...rejected_mutation(input), calls };
      }, { reason: "ACCESSOR_PROPERTY", rev: 0, feeds: 0, unchanged: true, calls: 0 }),
      rejection("nonenumerable own property rejects", () => Object.defineProperty({}, "hidden", { value: 1 }), "NONENUMERABLE_PROPERTY"),
      rejection("symbol-keyed property rejects", () => ({ value: 1, [Symbol("extra")]: 2 }), "SYMBOL_KEY"),
      rejection("custom prototype rejects", () => Object.create({ inherited: true }), "UNSUPPORTED_PROTOTYPE"),
      rejection("class instance rejects", () => new (class Example { value = 1; })(), "UNSUPPORTED_PROTOTYPE"),
      rejection("boxed primitives reject", () => new String("value"), "UNSUPPORTED_PROTOTYPE"),
      rejection("Date rejects", () => new Date(), "UNSUPPORTED_PROTOTYPE"),
      rejection("Map rejects", () => new Map(), "UNSUPPORTED_PROTOTYPE"),
      rejection("Set rejects", () => new Set(), "UNSUPPORTED_PROTOTYPE"),
      rejection("function rejects", () => () => 1, "UNSUPPORTED_TYPE"),
      rejection("Promise rejects", () => Promise.resolve(1), "UNSUPPORTED_PROTOTYPE"),
      rejection("bigint rejects", () => 1n, "UNSUPPORTED_TYPE"),
      rejection("symbol primitive rejects", () => Symbol("value"), "UNSUPPORTED_TYPE"),
      rejection("NaN rejects", () => Number.NaN, "NONFINITE_NUMBER"),
      result_case(SUITE, "both infinities reject", () => ({ positive: rejected_mutation(Infinity).reason, negative: rejected_mutation(-Infinity).reason }), { positive: "NONFINITE_NUMBER", negative: "NONFINITE_NUMBER" }),
      rejection("sparse array rejects", () => new Array(3), "SPARSE_ARRAY"),
      rejection("explicit undefined array item rejects", () => [undefined], "UNDEFINED_VALUE"),
      result_case(SUITE, "extra named and numeric-looking array properties reject", () => {
        const reasons = ["named", "-1", "4294967295"].map((key) => {
          const input = [1] as unknown[] & Record<string, unknown>;
          Object.defineProperty(input, key, { value: 2, enumerable: true });
          return rejected_mutation(input).reason;
        });
        return { reasons };
      }, { reasons: ["EXTRA_ARRAY_PROPERTY", "EXTRA_ARRAY_PROPERTY", "EXTRA_ARRAY_PROPERTY"] }),
      result_case(SUITE, "array accessor index rejects without invocation", () => {
        let calls = 0;
        const input = [1];
        Object.defineProperty(input, "0", { get() { calls += 1; return 1; }, enumerable: true });
        return { ...rejected_mutation(input), calls };
      }, { reason: "ACCESSOR_PROPERTY", rev: 0, feeds: 0, unchanged: true, calls: 0 }),
      rejection("subclassed array rejects", () => new (class Values extends Array<number> {})(1, 2), "UNSUPPORTED_PROTOTYPE"),
      result_case(SUITE, "cycles reject atomically", () => {
        const input: Record<string, unknown> = {};
        input.self = input;
        return rejected_mutation(input);
      }, { reason: "CYCLE", rev: 0, feeds: 0, unchanged: true }),
      result_case(SUITE, "throwing proxy traps become atomic admission failures", () => rejected_mutation(new Proxy({}, { getPrototypeOf() { throw new Error("trap"); } })), { reason: "REFLECTION_FAILED", rev: 0, feeds: 0, unchanged: true }),
    ],
  };
}
