import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, same_value_row } from "./assert-helpers";

const SUITE = "livemap/schema-value-boundary";
const test = (caseId: string, name: string, run: TestCase["run"]): TestCase => ({ suite: SUITE, caseId, name, run });

function own_record(
  entries: readonly (readonly [string, unknown])[],
  prototype: object | null = Object.prototype,
): Record<string, unknown> {
  const value = Object.create(prototype) as Record<string, unknown>;
  for (const [key, child] of entries) {
    Object.defineProperty(value, key, { value: child, enumerable: true, writable: true, configurable: true });
  }
  return value;
}

function rejected(run: () => unknown): boolean {
  try { run(); return false; } catch { return true; }
}

export function livemap_schema_value_boundary_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("direct-validation-admits-a-plain-object", "direct validation admits a plain object", () => {
        const result = hson.liveMap.schema.define((s) => s.object({ value: s.number })).validateRoot({ value: 1 });
        return { assertRows: [equal_row("accepted", result.ok, true)] };
      }),
      test("direct-validation-admits-a-null-prototype-object", "direct validation admits a null-prototype object", () => {
        const value = own_record([["value", "ok"]], null) as JsonValue;
        const result = hson.liveMap.schema.define((s) => s.object({ value: s.string })).validateRoot(value);
        return { assertRows: [equal_row("accepted", result.ok, true)] };
      }),
      test("direct-and-attached-validation-accept-the-same-finite-number", "direct and attached validation accept the same finite number", () => {
        const schema = hson.liveMap.schema.define((s) => s.object({ value: s.number }));
        const map = hson.liveMap.fromJson({ value: 1 });
        map.schema.use(schema);
        return { assertRows: [
          equal_row("direct", schema.validateRoot({ value: 2 }).ok, true),
          equal_row("attached", map.set(["value"], 2).changed, true),
        ] };
      }),
      test("direct-and-attached-validation-reject-nan", "direct and attached validation reject NaN", () => {
        const schema = hson.liveMap.schema.define((s) => s.object({ value: s.number }));
        const map = hson.liveMap.fromJson({ value: 1 });
        map.schema.use(schema);
        return { assertRows: [
          equal_row("direct", schema.validateRoot({ value: Number.NaN } as JsonValue).ok, false),
          equal_row("attached", rejected(() => map.set(["value"], Number.NaN)), true),
        ] };
      }),
      test("both-infinities-reject", "both infinities reject", () => {
        const schema = hson.liveMap.schema.define((s) => s.number);
        return { assertRows: [
          equal_row("positive", schema.validateRoot(Infinity).ok, false),
          equal_row("negative", schema.validateRoot(-Infinity).ok, false),
        ] };
      }),
      test("literal-comparison-distinguishes-positive-and-negative-zero", "literal comparison distinguishes positive and negative zero", () => {
        const schema = hson.liveMap.schema.define((s) => s.literal(-0));
        return { assertRows: [
          equal_row("negative zero", schema.validateRoot(-0).ok, true),
          equal_row("positive zero", schema.validateRoot(0).ok, false),
        ] };
      }),
      test("optional-means-missing-is-accepted", "optional means missing is accepted", () => {
        const schema = hson.liveMap.schema.define((s) => s.object({ value: s.number.optional }));
        return { assertRows: [equal_row("missing accepted", schema.validateRoot({}).ok, true)] };
      }),
      test("present-undefined-is-not-missing", "present undefined is not missing", () => {
        const schema = hson.liveMap.schema.define((s) => s.object({ value: s.number.optional }));
        const result = schema.validateRoot(own_record([["value", undefined]]) as JsonValue);
        return { assertRows: [
          equal_row("rejected", result.ok, false),
          equal_row("received", result.issues[0]?.received, "undefined"),
        ] };
      }),
      test("required-missing-fields-report-missing", "required missing fields report missing", () => {
        const result = hson.liveMap.schema.define((s) => s.object({ value: s.number })).validateRoot({});
        return { assertRows: [equal_row("received", result.issues[0]?.received, "missing")] };
      }),
      test("sparse-arrays-reject-before-schema-traversal", "sparse arrays reject before schema traversal", () => {
        const sparse = new Array(2); sparse[1] = 1;
        const result = hson.liveMap.schema.define((s) => s.array(s.number)).validateRoot(sparse as JsonValue);
        return { assertRows: [equal_row("rejected", result.ok, false)] };
      }),
      test("ordinary-getters-reject-without-executing", "ordinary getters reject without executing", () => {
        let calls = 0;
        const value = {};
        Object.defineProperty(value, "field", { enumerable: true, get: () => { calls += 1; return 1; } });
        const result = hson.liveMap.schema.define((s) => s.unknown).validateRoot(value as JsonValue);
        return { assertRows: [equal_row("rejected", result.ok, false), equal_row("calls", calls, 0)] };
      }),
      test("custom-prototypes-reject", "custom prototypes reject", () => {
        const value = Object.create({ inherited: true }) as JsonValue;
        return { assertRows: [equal_row("rejected", hson.liveMap.schema.define((s) => s.unknown).validateRoot(value).ok, false)] };
      }),
      test("exotic-objects-reject", "exotic objects reject", () => {
        const schema = hson.liveMap.schema.define((s) => s.unknown);
        return { assertRows: [
          equal_row("date", schema.validateRoot(new Date() as unknown as JsonValue).ok, false),
          equal_row("map", schema.validateRoot(new Map() as unknown as JsonValue).ok, false),
        ] };
      }),
      test("symbol-keyed-properties-reject", "symbol-keyed properties reject", () => {
        const value = { field: 1 } as Record<PropertyKey, unknown>; value[Symbol("hidden")] = 2;
        return { assertRows: [equal_row("rejected", hson.liveMap.schema.define((s) => s.unknown).validateRoot(value as JsonValue).ok, false)] };
      }),
      test("nonenumerable-properties-reject", "nonenumerable properties reject", () => {
        const value = {}; Object.defineProperty(value, "hidden", { value: 1, enumerable: false });
        return { assertRows: [equal_row("rejected", hson.liveMap.schema.define((s) => s.unknown).validateRoot(value as JsonValue).ok, false)] };
      }),
      test("cycles-reject-deterministically", "cycles reject deterministically", () => {
        const value: Record<string, unknown> = {}; value.self = value;
        const schema = hson.liveMap.schema.define((s) => s.unknown);
        return { assertRows: [
          equal_row("first", schema.validateRoot(value as JsonValue).ok, false),
          equal_row("second", schema.validateRoot(value as JsonValue).ok, false),
        ] };
      }),
      test("repeated-acyclic-references-admit-structurally", "repeated acyclic references admit structurally", () => {
        const child = { value: 1 };
        const result = hson.liveMap.schema.define((s) => s.unknown).validateRoot({ left: child, right: child });
        return { assertRows: [equal_row("accepted", result.ok, true)] };
      }),
      test("exact-shapes-use-own-dangerous-key-membership", "exact shapes use own dangerous-key membership", () => {
        const value = own_record([["__proto__", 1], ["constructor", 2], ["prototype", 3]]) as JsonValue;
        const schema = hson.liveMap.schema.define((s) => {
          const shape = own_record([["__proto__", s.number], ["constructor", s.number], ["prototype", s.number]]);
          return s.object.exact(shape as never);
        });
        return { assertRows: [equal_row("accepted", schema.validateRoot(value).ok, true)] };
      }),
      test("inherited-constructor-cannot-satisfy-an-exact-shape", "inherited constructor cannot satisfy an exact shape", () => {
        const schema = hson.liveMap.schema.define((s) => {
          const shape = own_record([["constructor", s.number]]);
          return s.object.exact(shape as never);
        });
        return { assertRows: [equal_row("rejected", schema.validateRoot({}).ok, false)] };
      }),
      test("ordered-literals-distinguish-object-entry-order", "ordered literals distinguish object entry order", () => {
        const literal = { b: 2, a: 1 };
        const schema = hson.liveMap.schema.define((s) => s.literal(literal));
        return { assertRows: [equal_row("reordered rejected", schema.validateRoot({ a: 1, b: 2 }).ok, false)] };
      }),
      test("schema-literals-detach-from-their-source", "schema literals detach from their source", () => {
        const literal = { nested: { value: 1 } };
        const schema = hson.liveMap.schema.define((s) => s.literal(literal));
        literal.nested.value = 2;
        return { assertRows: [
          equal_row("original accepted", schema.validateRoot({ nested: { value: 1 } }).ok, true),
          equal_row("mutation rejected", schema.validateRoot(literal).ok, false),
        ] };
      }),
      test("constraints-receive-detached-values", "constraints receive detached values", () => {
        const seen: unknown[] = [];
        const before: unknown[] = [];
        const schema = hson.liveMap.schema.define((s) => s.object({ value: s.number }).constrain("detached", (value) => {
          seen.push(value); before.push((value as { value: number }).value); (value as { value: number }).value = 99; return true;
        }));
        schema.validateRoot({ value: 1 }); schema.validateRoot({ value: 1 });
        return { assertRows: [
          equal_row("fresh", Object.is(seen[0], seen[1]), false),
          equal_row("inputs", before, [1, 1]),
        ] };
      }),
      test("attached-constraint-mutation-cannot-alter-the-candidate", "attached constraint mutation cannot alter the candidate", () => {
        const schema = hson.liveMap.schema.define((s) => s.object({
          value: s.unknown.constrain("detached", (value) => {
            (value as Record<string, JsonValue>).field = 99;
            return true;
          }),
        }));
        const map = hson.liveMap.fromJson({ value: { field: 1 } });
        map.schema.use(schema); map.replace(["value"], { field: 2 });
        return { assertRows: [equal_row("stored", map.snap(["value", "field"]), 2)] };
      }),
      test("schema-rejection-is-atomic", "schema rejection is atomic", () => {
        const map = hson.liveMap.fromJson({ value: 1 });
        map.schema.use(hson.liveMap.schema.define((s) => s.object({ value: s.number })));
        let feeds = 0; map.feed([], () => { feeds += 1; });
        const before = map.capture();
        const didReject = rejected(() => map.set(["value"], "bad"));
        return { assertRows: [
          equal_row("rejected", didReject, true),
          equal_row("revision", map.rev, 0),
          equal_row("feeds", feeds, 0),
          equal_row("capture", map.capture(), before),
          same_value_row("state", map.snap(["value"]), 1),
        ] };
      }),
    ],
  };
}
