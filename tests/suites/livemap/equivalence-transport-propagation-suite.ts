import { hson } from "hson-live";
import { link_livemap } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, own_value_row, same_value_row } from "./assert-helpers";

const SUITE = "livemap/equivalence-transport-propagation";
const test = (name: string, run: TestCase["run"]): TestCase => ({ suite: SUITE, name, run });

export function livemap_equivalence_transport_propagation_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      test("capture and restore close exact canonical state", () => {
        const source = hson.liveMap.fromJson('{"10":10,"2":2,"1":1,"tail":-0}'); const target = hson.liveMap.fromJson({ old: true }); target.restore(source.capture());
        return { assertRows: [equal_row("payload", target.capture().payload, source.capture().payload)] };
      }),
      test("minimal exact restore closes canonical state", () => {
        const source = hson.liveMap.fromJson('{"value":{"b":2,"a":1}}'); const capture = source.capture(); const target = hson.liveMap.fromJson({ old: true }); target.restore({ rev: capture.rev, format: capture.format, formatVersion: capture.formatVersion, payload: capture.payload });
        return { assertRows: [equal_row("payload", target.capture().payload, capture.payload)] };
      }),
      test("exact apply closes canonical state", () => {
        const source = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}'); const capture = source.capture(); const target = hson.liveMap.fromJson({ old: true }); target.apply({ prevRev: 0, format: capture.format, formatVersion: capture.formatVersion, payload: capture.payload });
        return { assertRows: [equal_row("payload", target.capture().payload, capture.payload)] };
      }),
      test("exact replay closes a committed mutation", () => {
        const source = hson.liveMap.fromJson({ value: 0 }); const target = hson.liveMap.fromJson({ value: 0 }); target.replay(source.set(["value"], -0));
        return { assertRows: [equal_row("payload", target.capture().payload, source.capture().payload)] };
      }),
      test("capture restore replay tail and link form one closed chain", () => {
        const source = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}'); const restored = hson.liveMap.fromJson({ value: {} }); restored.restore(source.capture()); restored.replay(source.setMany(["value"], { tail: -0 })); const target = hson.liveMap.fromJson({ value: {} }); target.restore(restored.capture()); link_livemap(restored, target, { path: ["value"] }); restored.setMany(["value"], { final: "\ud800" });
        return { assertRows: [equal_row("source target", target.capture().payload, restored.capture().payload)] };
      }),
      test("repeated exact captures are byte stable", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        return { assertRows: [equal_row("bytes", map.capture().payload, map.capture().payload)] };
      }),
      test("exact transport preserves mixed key classes", () => {
        const source = hson.liveMap.fromJson('{"a":1,"10":10,"2":2,"01":1,"4294967294":4,"4294967295":5,"-1":-1,"b":2}'); const target = hson.liveMap.fromJson({}); target.restore(source.capture());
        return { assertRows: [equal_row("payload", target.capture().payload, source.capture().payload)] };
      }),
      test("exact transport preserves dangerous keys", () => {
        const source = hson.liveMap.fromJson('{"__proto__":1,"constructor":2,"prototype":3}'); const target = hson.liveMap.fromJson({}); target.restore(source.capture()); const value = target.snap() as object;
        return { assertRows: [own_value_row("__proto__", value, "__proto__", 1), own_value_row("constructor", value, "constructor", 2), own_value_row("prototype", value, "prototype", 3)] };
      }),
      test("exact transport preserves negative zero", () => {
        const source = hson.liveMap.fromJson({ value: -0 }); const target = hson.liveMap.fromJson({ value: 0 }); target.restore(source.capture());
        return { assertRows: [same_value_row("value", target.snap(["value"]), -0)] };
      }),
      test("exact transport preserves isolated surrogate strings", () => {
        const source = hson.liveMap.fromJson({ value: "\ud800x\udfff" }); const target = hson.liveMap.fromJson({ value: "" }); target.restore(source.capture());
        return { assertRows: [equal_row("value", target.snap(["value"]), "\ud800x\udfff")] };
      }),
      test("exact transport preserves objects inside arrays", () => {
        const source = hson.liveMap.fromJson('{"items":[{"10":10,"2":2,"1":1}]}'); const target = hson.liveMap.fromJson({ items: [] }); target.restore(source.capture());
        return { assertRows: [equal_row("payload", target.capture().payload, source.capture().payload)] };
      }),
      test("exact transport preserves arrays inside objects", () => {
        const source = hson.liveMap.fromJson({ value: { items: [1, -0, { b: 2, a: 1 }] } }); const target = hson.liveMap.fromJson({ value: null }); target.restore(source.capture());
        return { assertRows: [equal_row("payload", target.capture().payload, source.capture().payload)] };
      }),
      test("feed delivery exposes detached public values", () => {
        const map = hson.liveMap.fromJson({ value: { a: 1 } }); let second: unknown; map.feed(["value"], (event) => { (event.value as Record<string, JsonValue>).a = 99; }); map.feed(["value"], (event) => { second = (event.value as Record<string, JsonValue>).a; }); map.replace(["value"], { a: 2 });
        return { assertRows: [equal_row("second", second, 2), equal_row("state", map.snap(["value", "a"]), 2)] };
      }),
      test("public feed enumeration cannot rewrite exact order", () => {
        const map = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"tail":0}}'); let publicKeys: readonly string[] = []; map.feed(["value"], (event) => { publicKeys = Object.keys(event.value as object); }); map.set(["value", "tail"], -0); const target = hson.liveMap.fromJson({ value: {} }); target.restore(map.capture());
        return { assertRows: [equal_row("public keys", publicKeys, ["1", "2", "10", "tail"]), equal_row("exact payload", target.capture().payload, map.capture().payload)] };
      }),
      test("direct links preserve exact ordered state", () => {
        const source = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"drop":0}}'); const target = hson.liveMap.fromJson({ value: {} }); link_livemap(source, target, { path: ["value"] }); source.delete(["value", "drop"]); const expected = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        return { assertRows: [equal_row("target", target.capture().payload, expected.capture().payload)] };
      }),
      test("path-handle links preserve exact ordered state", () => {
        const source = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1,"drop":0}}'); const target = hson.liveMap.fromJson({ value: {} }); source.at(["value"]).linkTo(target.at(["value"])); source.delete(["value", "drop"]); const expected = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}');
        return { assertRows: [equal_row("target", target.capture().payload, expected.capture().payload)] };
      }),
      test("store publication preserves SameValue", () => {
        const map = hson.liveMap.fromJson({ value: 0 }); let observed: unknown; map.sub.path(["value"], (value) => { observed = value; }); map.set(["value"], -0);
        return { assertRows: [same_value_row("observed", observed, -0)] };
      }),
      test("LiveHost commits expose exact payload transport", () => {
        const host = hson.liveHost.create({ state: { value: 0 } }); let payload: unknown; host.stream.on_commit((commit) => { payload = commit.payload; }); host.map.set(["value"], -0);
        return { assertRows: [equal_row("payload type", typeof payload, "string"), same_value_row("state", host.map.snap(["value"]), -0)] };
      }),
      test("LiveHost recovery snapshot closes exact state", () => {
        const host = hson.liveHost.create({ state: { value: { a: 1 } } }); const ordered = hson.liveMap.fromJson('{"value":{"10":10,"2":2,"1":1}}').capture(); host.map.restore(ordered); const plan = host.recovery.plan({ logicalMapId: host.stream.logicalMapId }); if (plan.outcome !== "snapshot") return { assertRows: [equal_row("outcome", plan.outcome, "snapshot")] }; const restored = hson.liveMap.fromHson(plan.body.hson); const capture = restored.capture(); plan.dispose();
        return { assertRows: [equal_row("payload", "payload" in capture ? capture.payload : undefined, host.map.capture().payload)] };
      }),
      test("legacy capture stays readable and observably lossy", () => {
        const source = hson.liveMap.fromJson('{"10":10,"2":2,"1":1}'); const target = hson.liveMap.fromJson({}); target.restore({ rev: source.rev, value: source.snap() as JsonValue });
        return { assertRows: [equal_row("changed bytes", target.capture().payload === source.capture().payload, false), equal_row("public value", target.snap(), source.snap())] };
      }),
    ],
  };
}
