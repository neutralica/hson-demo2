import { hson } from "hson-live";
import { link_livemap } from "hson-live/livemap";
import type { JsonValue, LiveMap } from "hson-live/types";
import type { TestAssertRow, TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row } from "./assert-helpers";

const SUITE = "livemap/equivalence-rejection-isolation";
const test = (name: string, run: TestCase["run"]): TestCase => ({ suite: SUITE, name, run });
type Route = "set" | "setMany" | "replace" | "update" | "batch" | "object" | "array";
const routes: readonly Route[] = ["set", "setMany", "replace", "update", "batch", "object", "array"];

function own_property(key: PropertyKey, value: unknown, enumerable = true): object {
  return Object.defineProperty({}, key, { value, enumerable, writable: true, configurable: true });
}

function initial(route: Route): JsonValue {
  if (route === "object") return {};
  if (route === "array") return [];
  return 1;
}

function mutate(route: Route, map: LiveMap, witness: unknown): void {
  if (route === "set") { map.set(["value"], witness as JsonValue); return; }
  if (route === "setMany") { map.setMany([], own_property("value", witness) as Record<string, JsonValue>); return; }
  if (route === "replace") { map.replace(["value"], witness as JsonValue); return; }
  if (route === "update") { map.at(["value"]).update(() => witness as JsonValue); return; }
  if (route === "batch") { map.batch((tx) => { tx.set(["value"], witness as JsonValue); }); return; }
  if (route === "object") { map.at(["value"]).object.setKey("bad", witness as never); return; }
  map.at(["value"]).array.push(witness as never);
}

function rejects(run: () => unknown): boolean {
  try { run(); return false; } catch { return true; }
}

function rejection_rows(witness: unknown, route: Route): readonly TestAssertRow[] {
  const sourceMap = hson.liveMap.fromJson({ value: initial(route), guard: 1 })
    .schema.use(hson.liveMap.schema.define((s) => ({ value: s.unknown, guard: s.number })));
  const host = hson.liveHost.create({ map: sourceMap });
  const source = host.map as unknown as LiveMap;
  const target = hson.liveMap.fromJson({ value: initial(route), guard: 1 });
  link_livemap(source, target, { path: ["value"] });
  const sourceBefore = source.capture(); const targetBefore = target.capture();
  let commits = 0; let feeds = 0; let stores = 0; let hostCommits = 0;
  source.commits.observe(() => { commits += 1; }); source.feed([], () => { feeds += 1; }); source.sub.diff(() => { stores += 1; }); host.stream.on_commit(() => { hostCommits += 1; });
  const mutationRejected = rejects(() => mutate(route, source, witness));
  return [
    equal_row("Transform rejected", rejects(() => hson.fromJson(witness as JsonValue)), true),
    equal_row("LiveMap construction rejected", rejects(() => hson.liveMap.fromJson(witness as JsonValue)), true),
    equal_row("schema rejected", hson.liveMap.schema.define((s) => s.unknown).validateRoot(witness as JsonValue).ok, false),
    equal_row("mutation rejected", mutationRejected, true),
    equal_row("source capture", source.capture(), sourceBefore),
    equal_row("target capture", target.capture(), targetBefore),
    equal_row("revision", source.rev, 0),
    equal_row("commits", commits, 0),
    equal_row("feeds", feeds, 0),
    equal_row("stores", stores, 0),
    equal_row("LiveHost commits", hostCommits, 0),
  ];
}

function rejected_case(name: string, route: Route, witness: () => unknown): TestCase {
  return test(name, () => ({ assertRows: rejection_rows(witness(), route) }));
}

export function livemap_equivalence_rejection_isolation_suite(): TestSuite {
  let route = 0;
  const rejected = (name: string, witness: () => unknown): TestCase => rejected_case(name, routes[route++ % routes.length]!, witness);
  return {
    suite: SUITE,
    cases: [
      rejected("undefined rejects without publication", () => undefined),
      rejected("NaN rejects without publication", () => Number.NaN),
      test("both infinities reject without publication", () => ({ assertRows: [...rejection_rows(Infinity, routes[route++ % routes.length]!), ...rejection_rows(-Infinity, routes[route++ % routes.length]!)] })),
      rejected("bigint rejects without publication", () => 1n),
      rejected("symbol rejects without publication", () => Symbol("value")),
      rejected("function rejects without execution or publication", () => function unsupported() { return 1; }),
      rejected("boxed primitive rejects without publication", () => new Number(1)),
      rejected("custom prototype rejects without publication", () => Object.create({ inherited: true })),
      rejected("class instance rejects without publication", () => new (class Value { field = 1; })()),
      rejected("Date rejects without publication", () => new Date(0)),
      rejected("Map rejects without publication", () => new Map([["a", 1]])),
      rejected("Set rejects without publication", () => new Set([1])),
      rejected("Promise rejects without publication", () => Promise.resolve(1)),
      test("ordinary accessors reject without getter execution", () => {
        let calls = 0; const value = {}; Object.defineProperty(value, "field", { enumerable: true, get: () => { calls += 1; return 1; } });
        return { assertRows: [...rejection_rows(value, routes[route++ % routes.length]!), equal_row("getter calls", calls, 0)] };
      }),
      rejected("nonenumerable properties reject without publication", () => own_property("hidden", 1, false)),
      rejected("symbol-keyed properties reject without publication", () => own_property(Symbol("hidden"), 1)),
      rejected("sparse arrays reject without publication", () => { const value = new Array(2); value[1] = 1; return value; }),
      rejected("explicit array undefined rejects without publication", () => [1, undefined]),
      rejected("extra named array properties reject without publication", () => { const value = [1]; Object.defineProperty(value, "named", { value: 2, enumerable: true }); return value; }),
      rejected("array accessors reject without publication", () => { const value = [1]; Object.defineProperty(value, "0", { enumerable: true, get: () => 1 }); return value; }),
      rejected("array subclasses reject without publication", () => new (class Values extends Array<number> {})(1, 2)),
      rejected("cycles reject deterministically without publication", () => { const value: Record<string, unknown> = {}; value.self = value; return value; }),
      test("malformed exact envelopes never downgrade to legacy", () => {
        const map = hson.liveMap.fromJson({ value: 1 }); const before = map.capture(); let commits = 0; let feeds = 0; map.commits.observe(() => { commits += 1; }); map.feed([], () => { feeds += 1; });
        const didReject = rejects(() => map.restore({ rev: 2, format: "structural-json", value: { value: 9 } } as never));
        return { assertRows: [equal_row("rejected", didReject, true), equal_row("capture", map.capture(), before), equal_row("commits", commits, 0), equal_row("feeds", feeds, 0)] };
      }),
      test("malformed structural JSON rejects restore apply and replay atomically", () => {
        const restore = hson.liveMap.fromJson({ value: 1 }); const apply = hson.liveMap.fromJson({ value: 1 }); const replay = hson.liveMap.fromJson({ value: 1 }); const before = restore.capture();
        const envelope = { format: "structural-json", formatVersion: 1, payload: "{" } as const;
        return { assertRows: [
          equal_row("restore", rejects(() => restore.restore({ rev: 1, ...envelope })), true),
          equal_row("apply", rejects(() => apply.apply({ prevRev: 0, ...envelope })), true),
          equal_row("replay", rejects(() => replay.replay({ prevRev: 0, ...envelope })), true),
          equal_row("restore atomic", restore.capture(), before), equal_row("apply atomic", apply.capture(), before), equal_row("replay atomic", replay.capture(), before),
        ] };
      }),
    ],
  };
}
