import { hson } from "hson-live";
import { link_livemap } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, own_value_row, same_value_row } from "./assert-helpers";

const SUITE = "livemap/exact-propagation";
const test = (name: string, run: TestCase["run"]): TestCase => ({ suite: SUITE, name, run });

export function livemap_exact_propagation_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("public feed enumeration cannot rewrite canonical integer-key order", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"tail":0}}');
        let observed: readonly string[] = [];
        map.feed(["value"], (event) => { observed = Object.keys(event.value as object); });
        map.set(["value", "tail"], -0);
        const restored = hson.liveMap.fromJson({ value: {} });
        restored.restore(map.capture());
        return { assertRows: [
          equal_row("public enumeration", observed, ["1", "2", "10", "tail"]),
          equal_row("exact capture closure", restored.capture().payload, map.capture().payload),
        ] };
      }),
      test("public feed values are fresh per listener", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1 } });
        let second: unknown;
        map.feed(["value"], (event) => { (event.value as Record<string, JsonValue>).a = 99; });
        map.feed(["value"], (event) => { second = (event.value as Record<string, JsonValue>).a; });
        map.replace(["value"], { a: 2 });
        return { assertRows: [equal_row("second listener", second, 2), equal_row("state", map.snap(["value", "a"]), 2)] };
      }),
      test("public feed operation values are fresh per listener", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1 } });
        let second: unknown;
        map.feed(["value"], (event) => { (event.op.next as Record<string, JsonValue>).a = 99; });
        map.feed(["value"], (event) => { second = (event.op.next as Record<string, JsonValue>).a; });
        map.replace(["value"], { a: 2 });
        return { assertRows: [equal_row("second operation", second, 2)] };
      }),
      test("feed delivery preserves negative zero", () => {
        const map = hson.liveMap.fromJson({ value: 0 });
        let observed: unknown;
        map.feed(["value"], (event) => { observed = event.value; });
        map.set(["value"], -0);
        return { assertRows: [same_value_row("negative zero", observed, -0)] };
      }),
      test("feed delivery preserves dangerous own data", () => {
        const map = hson.liveMap.fromJson('{"value":{},"tail":0}');
        let observed: object = {};
        map.feed([], (event) => { observed = event.value as object; });
        map.replace(JSON.parse('{"value":{"__proto__":1,"constructor":2,"prototype":3},"tail":1}') as JsonValue);
        const value = (observed as Record<string, object>).value;
        if (value === undefined) throw new Error("Expected dangerous-key object.");
        return { assertRows: [
          own_value_row("__proto__", value, "__proto__", 1),
          own_value_row("constructor", value, "constructor", 2),
          own_value_row("prototype", value, "prototype", 3),
        ] };
      }),
      test("repeated feed delivery remains detached", () => {
        const map = hson.liveMap.fromJson({ value: { count: 0 } });
        const values: object[] = [];
        map.feed(["value"], (event) => { values.push(event.value as object); });
        map.set(["value", "count"], 1);
        map.set(["value", "count"], 2);
        return { assertRows: [equal_row("fresh identities", Object.is(values[0], values[1]), false)] };
      }),
      test("direct links preserve exact integer-key order", () => {
        const source = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"drop":0}}');
        const target = hson.liveMap.fromJson({ value: { old: true } });
        link_livemap(source, target, { path: ["value"] });
        source.delete(["value", "drop"]);
        const expected = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        return { assertRows: [equal_row("target exact payload", target.capture().payload, expected.capture().payload)] };
      }),
      test("mapped links preserve exact integer-key order", () => {
        const source = hson.liveMap.fromJson('{"from":{"10":10,"2":2,"1":1,"drop":0}}');
        const target = hson.liveMap.fromJson({ to: { old: true } });
        link_livemap(source, target, { from: ["from"], to: ["to"] });
        source.delete(["from", "drop"]);
        const expected = hson.liveMap.fromJson('{"to":{"10":10,"2":2,"1":1}}');
        return { assertRows: [equal_row("mapped exact payload", target.capture().payload, expected.capture().payload)] };
      }),
      test("links preserve negative zero", () => {
        const source = hson.liveMap.fromJson({ value: 0 });
        const target = hson.liveMap.fromJson({ value: 0 });
        link_livemap(source, target, { path: ["value"] });
        source.set(["value"], -0);
        return { assertRows: [same_value_row("linked negative zero", target.snap(["value"]), -0)] };
      }),
      test("links preserve dangerous keys and isolated surrogates", () => {
        const source = hson.liveMap.fromJson('{"value":{"__proto__":1,"constructor":2,"prototype":"\\ud800","drop":0}}');
        const target = hson.liveMap.fromJson({ value: { old: true } });
        link_livemap(source, target, { path: ["value"] });
        source.delete(["value", "drop"]);
        const value = target.snap(["value"]) as object;
        return { assertRows: [
          own_value_row("__proto__", value, "__proto__", 1),
          own_value_row("constructor", value, "constructor", 2),
          own_value_row("prototype", value, "prototype", "\ud800"),
        ] };
      }),
      test("links preserve array splices exactly", () => {
        const source = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}]}');
        const target = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}]}');
        link_livemap(source, target, { path: ["items"] });
        source.splice(["items"], 1, 0, { tail: -0 });
        return { assertRows: [equal_row("splice closure", target.capture().payload, source.capture().payload)] };
      }),
      test("links preserve objects inside arrays", () => {
        const source = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}],"drop":0}');
        const target = hson.liveMap.fromJson({ mirror: [] });
        link_livemap(source, target, { from: ["items"], to: ["mirror"] });
        source.splice(["items"], 1, 0, { "z": 1, "a": 2 });
        return { assertRows: [equal_row("nested array size", (target.snap(["mirror"]) as unknown[]).length, 2)] };
      }),
      test("path-handle links use exact propagation", () => {
        const source = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"drop":0}}');
        const target = hson.liveMap.fromJson({ value: { old: true } });
        source.at(["value"]).linkTo(target.at(["value"]));
        source.delete(["value", "drop"]);
        const expected = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        return { assertRows: [equal_row("handle closure", target.capture().payload, expected.capture().payload)] };
      }),
      test("listener mutation cannot alter link transport", () => {
        const source = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"drop":0}}');
        const target = hson.liveMap.fromJson({ value: { old: true } });
        source.feed(["value"], (event) => { (event.value as Record<string, JsonValue>)["1"] = 99; });
        link_livemap(source, target, { path: ["value"] });
        source.delete(["value", "drop"]);
        return { assertRows: [equal_row("linked value", target.snap(["value", "1"]), 1)] };
      }),
      test("failed target propagation leaves the target atomic", () => {
        const source = hson.liveMap.fromJson({ value: 0 });
        const target = hson.liveMap.fromJson({ other: 1 });
        link_livemap(source, target, { from: ["value"], to: ["missing", "child"] });
        let rejected = false;
        try { source.set(["value"], 2); } catch { rejected = true; }
        return { assertRows: [
          equal_row("notification rejected", rejected, true),
          equal_row("source authoritative", source.snap(["value"]), 2),
          equal_row("target revision", target.rev, 0),
          equal_row("target state", target.snap(), { other: 1 }),
        ] };
      }),
      test("store diff suppresses unchanged exact state", () => {
        const map = hson.liveMap.fromJson({ value: -0 });
        let calls = 0;
        map.sub.diff(() => { calls += 1; });
        map.set(["value"], -0);
        return { assertRows: [equal_row("calls", calls, 0)] };
      }),
      test("store diff publishes order-only changes", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1, b: 2 } });
        let calls = 0;
        map.sub.diff(() => { calls += 1; });
        map.replace(["value"], { b: 2, a: 1 });
        return { assertRows: [equal_row("calls", calls, 1)] };
      }),
      test("store path publishes positive zero to negative zero", () => {
        const map = hson.liveMap.fromJson({ value: 0 });
        let observed: unknown;
        map.sub.path(["value"], (next) => { observed = next; });
        map.set(["value"], -0);
        return { assertRows: [same_value_row("next", observed, -0)] };
      }),
      test("store path suppresses negative zero to negative zero", () => {
        const map = hson.liveMap.fromJson({ value: -0 });
        let calls = 0;
        map.sub.path(["value"], () => { calls += 1; });
        map.set(["value"], -0);
        return { assertRows: [equal_row("calls", calls, 0)] };
      }),
      test("store listener mutation remains isolated", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1 } });
        map.sub.path(["value"], (next) => { (next as Record<string, JsonValue>).a = 99; });
        map.replace(["value"], { a: 2 });
        return { assertRows: [equal_row("state", map.snap(["value", "a"]), 2)] };
      }),
      test("selector equality remains Object.is for primitive results", () => {
        const map = hson.liveMap.fromJson({ value: 0, other: 0 });
        let calls = 0;
        map.sub.sel((state) => (state as Record<string, JsonValue>).value, () => { calls += 1; });
        map.set(["other"], 1);
        map.set(["value"], -0);
        return { assertRows: [equal_row("selector calls", calls, 1)] };
      }),
      test("LiveHost canonical commits carry exact transport", async () => {
        const host = hson.liveHost.create({ state: { value: 0 } });
        let payload: unknown;
        host.stream.on_commit((commit) => { payload = commit.payload; });
        await host.mutate((draft) => draft.set(["value"], -0));
        return { assertRows: [equal_row("payload type", typeof payload, "string")] };
      }),
      test("LiveHost recovery snapshots preserve exact canonical order", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        const host = hson.liveHost.create({ map });
        const plan = host.recovery.plan({ logicalMapId: host.stream.logicalMapId });
        if (plan.outcome !== "snapshot") return { assertRows: [equal_row("outcome", plan.outcome, "snapshot")] };
        const restored = hson.liveMap.fromHson(plan.body.hson);
        const expected = host.map.capture().payload;
        const restoredCapture = restored.capture();
        plan.dispose();
        return { assertRows: [equal_row(
          "snapshot closure",
          "payload" in restoredCapture ? restoredCapture.payload : undefined,
          expected,
        )] };
      }),
    ],
  };
}
