import { hson } from "hson-live";
import type { HsonNode, JsonValue, LiveMap } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, ordered_keys_row, own_value_row, same_value_row } from "./assert-helpers";

const SUITE = "livemap/carrier-mutation-planning";

function test(name: string, run: TestCase["run"]): TestCase {
  return { suite: SUITE, name, run };
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

function is_hson_node(value: unknown): value is HsonNode {
  return typeof value === "object"
    && value !== null
    && "$_tag" in value
    && typeof value.$_tag === "string"
    && "$_content" in value
    && Array.isArray(value.$_content);
}

function object_node(map: LiveMap, path: readonly string[] = []): HsonNode {
  const root = map.root();
  const rootValue = root.$_tag === "_hson_root" ? root.$_content[0] : root;
  if (!is_hson_node(rootValue)) throw new Error("Missing projected root value.");
  let current: HsonNode = rootValue;

  for (const key of path) {
    const wrapper: HsonNode | undefined = current.$_content.find(
      (child): child is HsonNode => is_hson_node(child) && child.$_tag === key,
    );
    if (wrapper === undefined) throw new Error(`Missing projected key ${key}.`);
    const payload: unknown = wrapper.$_content[0];
    if (!is_hson_node(payload)) throw new Error(`Missing projected payload ${key}.`);
    current = payload;
  }

  if (current.$_tag !== "_hson_obj") throw new Error("Projected path is not an object node.");
  return current;
}

function graph_keys(map: LiveMap, path: readonly string[] = []): readonly string[] {
  return object_node(map, path).$_content
    .filter((child): child is HsonNode => typeof child === "object" && child !== null)
    .map((child) => child.$_tag);
}

function graph_number(map: LiveMap, key: string): number | undefined {
  const wrapper = object_node(map).$_content.find(
    (child) => typeof child === "object" && child !== null && child.$_tag === key,
  );
  if (typeof wrapper !== "object" || wrapper === null) return undefined;
  const carrier = wrapper.$_content[0];
  if (typeof carrier !== "object" || carrier === null) return undefined;
  const valueNode = carrier.$_tag === "_hson_obj" ? carrier.$_content[0] : carrier;
  if (typeof valueNode !== "object" || valueNode === null || valueNode.$_tag !== "_hson_val") return undefined;
  const value = valueNode.$_content[0];
  return typeof value === "number" ? value : undefined;
}

export function livemap_carrier_mutation_planning_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("set retains an existing ordinary property position", () => {
        const map = hson.liveMap.fromJson('{"a":1,"b":2,"c":3}');
        map.set(["b"], 20);
        return { assertRows: [equal_row("graph order retained", graph_keys(map), ["a", "b", "c"])] };
      }),
      test("setMany appends a missing property", () => {
        const map = hson.liveMap.fromJson({ a: 1 });
        map.setMany([], { b: 2 });
        return { assertRows: [equal_row("missing key appended", graph_keys(map), ["a", "b"])] };
      }),
      test("setMany retains existing positions and appends admitted order", () => {
        const map = hson.liveMap.fromJson('{"a":1,"b":2}');
        map.setMany([], own_record([["b", 20], ["d", 4], ["c", 3]]));
        return { assertRows: [equal_row("merge order retained", graph_keys(map), ["a", "b", "d", "c"])] };
      }),
      test("constructive object set retains and appends positions", () => {
        const map = hson.liveMap.fromJson({ target: { a: 1, b: 2 } });
        map.set(["target"], own_record([["b", 20], ["d", 4], ["c", 3]]));
        return { assertRows: [equal_row("target graph order retained", graph_keys(map, ["target"]), ["a", "b", "d", "c"])] };
      }),
      test("whole replacement adopts complete admitted order", () => {
        const map = hson.liveMap.fromJson({ old: true });
        map.replace(own_record([["z", 1], ["a", 2], ["m", 3]]));
        return { assertRows: [equal_row("replacement graph order", graph_keys(map), ["z", "a", "m"])] };
      }),
      test("nested replacement adopts complete nested order", () => {
        const map = hson.liveMap.fromJson({ target: { old: true } });
        map.replace(["target"], own_record([["z", 1], ["a", 2], ["m", 3]]));
        return { assertRows: [equal_row("nested graph order", graph_keys(map, ["target"]), ["z", "a", "m"])] };
      }),
      test("integer-like positions survive an existing-key set", () => {
        const map = hson.liveMap.fromJson('{"10":"ten","2":"two","1":"one"}');
        map.set(["2"], "TWO");
        return { assertRows: [equal_row("integer graph order retained", graph_keys(map), ["10", "2", "1"])] };
      }),
      test("new integer-like key appends internally while public enumeration stays truthful", () => {
        const map = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}');
        map.setMany([], own_record([["3", 3]]));
        return { assertRows: [
          equal_row("integer graph key appended", graph_keys(map), ["10", "2", "1", "3"]),
          ordered_keys_row("public JavaScript keys enumerate normally", map.snap() as object, ["1", "2", "3", "10"]),
        ] };
      }),
      test("constructive set preserves all dangerous names as own data", () => {
        const map = hson.liveMap.fromJson({ target: { kept: true } });
        map.set(["target"], own_record([["__proto__", 1], ["constructor", 2], ["prototype", 3]]));
        const value = map.snap(["target"]) as object;
        return { assertRows: [
          equal_row("dangerous graph keys appended", graph_keys(map, ["target"]), ["kept", "__proto__", "constructor", "prototype"]),
          own_value_row("__proto__ remains data", value, "__proto__", 1),
          equal_row("prototype remains ordinary", Object.getPrototypeOf(value) === Object.prototype, true),
        ] };
      }),
      test("setMany preserves all dangerous names as own data", () => {
        const map = hson.liveMap.fromJson({ target: {} });
        map.setMany(["target"], own_record([["__proto__", 1], ["constructor", 2], ["prototype", 3]]));
        const value = map.snap(["target"]) as object;
        return { assertRows: [
          own_value_row("constructor remains data", value, "constructor", 2),
          own_value_row("prototype remains data", value, "prototype", 3),
        ] };
      }),
      test("replacement preserves all dangerous names as own data", () => {
        const map = hson.liveMap.fromJson({ target: {} });
        map.replace(["target"], own_record([["__proto__", "data"], ["constructor", false], ["prototype", null]]));
        const value = map.snap(["target"]) as object;
        return { assertRows: [
          own_value_row("replacement __proto__ remains data", value, "__proto__", "data"),
          equal_row("replacement prototype ordinary", Object.getPrototypeOf(value) === Object.prototype, true),
        ] };
      }),
      test("nested objects and arrays close through shared graph construction", () => {
        const map = hson.liveMap.fromJson({ target: null });
        map.replace(["target"], own_record([["z", [own_record([["b", 2], ["a", 1]])]], ["a", -0]]));
        const value = map.snap(["target"]) as Record<string, JsonValue>;
        return { assertRows: [
          equal_row("nested object order", graph_keys(map, ["target"]), ["z", "a"]),
          same_value_row("nested negative zero", value.a, -0),
        ] };
      }),
      test("path update preserves positions and appends its new key", () => {
        const map = hson.liveMap.fromJson({ target: { a: 1, b: 2 } });
        map.at(["target"]).update((value) => ({ ...(value as Record<string, JsonValue>), b: 20, c: 3 }));
        return { assertRows: [equal_row("update graph order", graph_keys(map, ["target"]), ["a", "b", "c"])] };
      }),
      test("positive zero to negative zero publishes exact graph value", () => {
        const map = hson.liveMap.fromJson({ value: 0 });
        const commit = map.set(["value"], -0);
        return { assertRows: [
          equal_row("zero transition changed", commit.changed, true),
          same_value_row("graph stores negative zero", graph_number(map, "value"), -0),
        ] };
      }),
      test("negative zero to negative zero remains a no-op", () => {
        const map = hson.liveMap.fromJson({ value: -0 });
        const commit = map.set(["value"], -0);
        return { assertRows: [
          equal_row("same value suppressed", commit.changed, false),
          equal_row("revision retained", map.rev, 0),
        ] };
      }),
      test("array splice preserves dense order and negative zero", () => {
        const map = hson.liveMap.fromJson({ items: [0, 1, 2] });
        const commit = map.splice(["items"], 1, 1, -0, 4);
        const items = map.snap(["items"]) as number[];
        return { assertRows: [
          equal_row("splice operation published", commit.ops[0]?.kind, "splice"),
          equal_row("dense item count", items.length, 4),
          same_value_row("inserted negative zero", items[1], -0),
        ] };
      }),
      test("batch planning observes earlier ordered writes", () => {
        const map = hson.liveMap.fromJson('{"10":10,"2":2,"target":{"a":1}}');
        map.batch((tx) => {
          tx.setMany([], own_record([["1", 1], ["3", 3]]));
          tx.set(["target"], own_record([["a", 10], ["b", 2]]));
          tx.replace(["3"], -0);
        });
        return { assertRows: [
          equal_row("batch graph order", graph_keys(map), ["10", "2", "target", "1", "3"]),
          same_value_row("later batch write sees new key", map.snap(["3"]), -0),
        ] };
      }),
      test("batch commit order matches planned operation order", () => {
        const map = hson.liveMap.fromJson({ a: 1, items: [1, 2] });
        const commit = map.batch((tx) => {
          tx.setMany([], own_record([["b", 2], ["c", 3]]));
          tx.splice(["items"], 1, 1, -0, 4);
        });
        return { assertRows: [
          equal_row("commit kinds", commit.ops.map((op) => op.kind), ["set", "set", "splice"]),
          equal_row("graph keys", graph_keys(map), ["a", "items", "b", "c"]),
        ] };
      }),
      test("failed admission leaves graph revision feed and commit state unchanged", () => {
        const map = hson.liveMap.fromJson({ value: 1 });
        const before = JSON.stringify(map.root());
        let feeds = 0;
        map.feed([], () => { feeds += 1; });
        const bad = Object.defineProperty({}, "value", { enumerable: true, get: () => 2 });
        let rejected = false;
        try { map.set(["value"], bad as JsonValue); } catch { rejected = true; }
        return { assertRows: [
          equal_row("admission rejected", rejected, true),
          equal_row("revision unchanged", map.rev, 0),
          equal_row("feed silent", feeds, 0),
          equal_row("graph unchanged", JSON.stringify(map.root()), before),
        ] };
      }),
      test("failed late batch operation is atomic", () => {
        const map = hson.liveMap.fromJson({ a: 1, b: 2 });
        const before = JSON.stringify(map.root());
        let rejected = false;
        try {
          map.batch((tx) => {
            tx.set(["a"], 10);
            tx.replace(["missing"], 3);
          });
        } catch { rejected = true; }
        return { assertRows: [
          equal_row("late operation rejected", rejected, true),
          equal_row("authority graph unchanged", JSON.stringify(map.root()), before),
          equal_row("authority revision unchanged", map.rev, 0),
        ] };
      }),
      test("schema preview validates the completed carrier candidate atomically", () => {
        const map = hson.liveMap.fromJson({ value: 1, label: "ok" });
        map.schema.use(hson.liveMap.schema.define((shape) => shape.object({ value: shape.number, label: shape.string })));
        map.batch((tx) => { tx.set(["value"], -0); tx.set(["label"], "next"); });
        const before = JSON.stringify(map.root());
        let rejected = false;
        try { map.set(["value"], "wrong"); } catch { rejected = true; }
        return { assertRows: [
          equal_row("invalid candidate rejected", rejected, true),
          equal_row("accepted revision retained", map.rev, 1),
          equal_row("rejected graph unchanged", JSON.stringify(map.root()), before),
        ] };
      }),
      test("caller mutation after admission cannot change graph or commit", () => {
        const input = own_record([["nested", own_record([["value", 1]])], ["items", [1, 2]]]);
        const map = hson.liveMap.fromJson({ target: {} });
        const commit = map.replace(["target"], input);
        (input.nested as Record<string, JsonValue>).value = 99;
        (input.items as JsonValue[]).push(3);
        return { assertRows: [
          equal_row("graph detached from caller", map.snap(["target", "nested", "value"]), 1),
          equal_row("commit detached from caller", (commit.ops[0]?.next as Record<string, JsonValue>).items, [1, 2]),
        ] };
      }),
      test("commit payload mutation cannot affect canonical state", () => {
        const map = hson.liveMap.fromJson({ target: {} });
        const commit = map.replace(["target"], { nested: { value: 1 } });
        const next = commit.ops[0]?.next as Record<string, JsonValue>;
        (next.nested as Record<string, JsonValue>).value = 42;
        return { assertRows: [equal_row("canonical state remains detached", map.snap(["target", "nested", "value"]), 1)] };
      }),
    ],
  };
}
