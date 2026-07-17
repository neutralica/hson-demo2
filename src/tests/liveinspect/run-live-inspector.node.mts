import { performance } from "node:perf_hooks";
import {
  hson,
  LiveInspectorError,
  LIVE_INSPECTOR_DISPOSED_ERROR_CODE,
  LIVE_INSPECTOR_DUPLICATE_ARRAY_KEY_ERROR_CODE,
  LIVE_INSPECTOR_EXPAND_LIMIT_ERROR_CODE,
  LIVE_INSPECTOR_INVALID_PATH_ERROR_CODE,
  LIVE_INSPECTOR_MISSING_ARRAY_KEY_ERROR_CODE,
  LIVE_INSPECTOR_NON_STRUCTURAL_EXPANSION_ERROR_CODE,
  LIVE_INSPECTOR_OBSERVER_ERROR_CODE,
  LIVE_INSPECTOR_SOURCE_REPLACEMENT_ERROR_CODE,
  LIVE_INSPECTOR_UNREPRESENTABLE_CONVERSION_ERROR_CODE,
} from "hson-live";
import { install_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-runtime";

let checks = 0;
function expect(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`liveinspect: ${message}`);
}
function expectCode(run: () => unknown, code: string, message: string): void {
  let caught: unknown;
  try { run(); } catch (error) { caught = error; }
  expect(caught instanceof LiveInspectorError, `${message}: classified inspector error`);
  expect(caught.code === code, `${message}: expected ${code}, got ${caught.code}`);
}
function makeHost() {
  return hson.liveTree.queryBody().graft().create.div();
}
function mapping(inspector: ReturnType<typeof hson.inspect.create>, path: readonly (string | number)[]) {
  return inspector.debugMappings().find((entry) => JSON.stringify(entry.path) === JSON.stringify(path));
}

const runtime = install_hosted_dom_runtime();
const measurements: Record<string, number> = {};
try {
  runtime.reset_document();
  {
    const source = hson.liveMap.fromJson({
      title: "A deliberately long string for neutral preview behavior",
      emptyObject: {},
      emptyArray: [],
      nested: { enabled: true, count: 3, nothing: null },
      mixed: [1, "two", false, null, { deep: "value" }],
    });
    const host = makeHost();
    const inspector = hson.inspect.create({ source, host, initialDepth: 0, longStringLimit: 12 });
    expect(inspector.status === "ready", "object inspector is immediately ready");
    expect(inspector.source === source, "public handle reports the active LiveMap source");
    expect(inspector.diagnostics().totalBranchCount === 1, "initialDepth zero materializes only the root");
    expect(inspector.diagnostics().delegatedListenerCount === 1, "one delegated interaction listener is owned");
    expect(host.dom.must.el().querySelectorAll("button").length === 2, "root uses real disclosure and selection buttons");
    inspector.expand([]);
    expect(inspector.diagnostics().totalBranchCount === 6, "root expansion lazily materializes direct object properties");
    expect(mapping(inspector, ["nested"])?.kind === "object", "nested object receives a semantic row");
    expect(mapping(inspector, ["emptyObject"])?.arrayIdentity === undefined, "empty object is distinct from array identity");
    expect(mapping(inspector, ["emptyArray"])?.arrayIdentity === "positional", "empty array reports honest positional identity");
    expect(host.dom.must.el().textContent?.includes("empty") === true, "empty collections are visibly identified");
    expect(host.dom.must.el().textContent?.includes("…") === true, "long strings receive a bounded preview");
    inspector.expand(["nested"]);
    expect(mapping(inspector, ["nested", "enabled"])?.kind === "boolean", "nested boolean is navigable");
    const selected = inspector.select(["nested", "count"]);
    expect(selected.kind === "number" && selected.childCount === 0, "selection exposes semantic details");
    expect(host.dom.must.el().querySelector('[data-hson-inspect-region="details"]')?.textContent?.includes("View QUID") === true, "detail surface shows identity context");
    expectCode(() => inspector.expand(["nested", "count"]), LIVE_INSPECTOR_NON_STRUCTURAL_EXPANSION_ERROR_CODE, "primitive expansion");
    expectCode(() => inspector.select(["missing"]), LIVE_INSPECTOR_INVALID_PATH_ERROR_CODE, "invalid selection path");
    expectCode(() => inspector.expandAll(4), LIVE_INSPECTOR_EXPAND_LIMIT_ERROR_CODE, "bounded expand all");
    inspector.expandAll(100);
    expect(mapping(inspector, ["mixed", 4, "deep"])?.kind === "string", "expand all reaches mixed nested data");
    inspector.collapseAll();
    expect(inspector.diagnostics().visibleBranchCount === 1, "collapse all hides descendants without discarding them");
    inspector.expand([]);
    expect(mapping(inspector, ["nested", "count"])?.viewQuid === selected.viewQuid, "collapse and re-expand preserve materialized branch identity");

    const countBefore = mapping(inspector, ["nested", "count"])?.viewQuid;
    const siblingBefore = mapping(inspector, ["nested", "enabled"])?.viewQuid;
    source.set(["nested", "count"], 4);
    expect(mapping(inspector, ["nested", "count"])?.viewQuid === countBefore, "primitive update preserves its row QUID");
    expect(mapping(inspector, ["nested", "enabled"])?.viewQuid === siblingBefore, "primitive update preserves sibling QUID");
    expect(inspector.selection?.path.join("/") === "nested/count", "selection follows an in-place primitive update");
    source.replace(["nested", "count"], { unit: "px" });
    expect(mapping(inspector, ["nested", "count"])?.viewQuid === countBefore, "type replacement preserves the outer row");
    expect(mapping(inspector, ["nested", "count"])?.kind === "object", "type replacement updates row semantics");
    inspector.expand(["nested", "count"]);
    expect(mapping(inspector, ["nested", "count", "unit"]) !== undefined, "replacement materializes a fresh structural interior");
    source.delete(["nested", "count"]);
    expect(inspector.selection?.path.join("/") === "nested", "selected deletion transfers selection to nearest surviving parent");

    const json = inspector.serialize("json", ["nested"]);
    expect(JSON.parse(json).enabled === true, "JSON serialization delegates to the transform pipeline");
    expect(typeof inspector.serialize("hson") === "string", "HSON serialization is available on demand");
    expectCode(() => inspector.serialize("html"), LIVE_INSPECTOR_UNREPRESENTABLE_CONVERSION_ERROR_CODE, "plain JSON to HTML conversion");
    expect(inspector.diagnostics().serializationRequests === 3, "serialization requests are diagnosed");
    inspector.dispose();
    inspector.dispose();
    expect(host.content.count() === 0 && inspector.status === "disposed", "disposal is terminal, complete, and idempotent");
    expect(inspector.diagnostics().delegatedListenerCount === 0, "disposal releases delegated interaction ownership");
    source.set(["title"], "ignored after disposal");
    expectCode(() => inspector.expand([]), LIVE_INSPECTOR_DISPOSED_ERROR_CODE, "disposed inspector use");
  }

  runtime.reset_document();
  {
    const source = hson.liveMap.fromJson({ items: [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
      { id: "c", label: "Gamma" },
    ] });
    const inspector = hson.inspect.create({
      source,
      host: makeHost(),
      initialDepth: 2,
      arrayKey: (item) => typeof item === "object" && item !== null && !Array.isArray(item) ? item.id as string | undefined : undefined,
    });
    expect(mapping(inspector, ["items"])?.arrayIdentity === "application-key", "keyed array identity is explicit");
    const b = mapping(inspector, ["items", 1]);
    inspector.select(["items", 1]);
    source.at(["items"]).array.move(1, 0);
    expect(mapping(inspector, ["items", 0])?.viewQuid === b?.viewQuid, "keyed movement preserves view QUID");
    expect(inspector.selection?.path.join("/") === "items/0", "selection follows keyed movement");
    source.set(["items", 0, "label"], "Beta moved");
    expect(mapping(inspector, ["items", 0])?.viewQuid === b?.viewQuid, "nested keyed update preserves branch identity");
    source.at(["items"]).array.insert(1, { id: "d", label: "Delta" });
    expect(mapping(inspector, ["items", 1])?.applicationKey === "d", "middle insertion creates the declared application key");
    source.at(["items"]).array.remove(0);
    expect(inspector.selection?.path.join("/") === "items", "selected keyed removal chooses the array parent");
    inspector.select(["items", 1]);

    const replacement = hson.liveMap.fromJson({ items: [
      { id: "a", label: "Alpha snapshot" },
      { id: "c", label: "Gamma snapshot" },
      { id: "d", label: "Delta snapshot" },
    ] });
    const survivors = new Map(inspector.debugMappings().filter((entry) => entry.role === "array-item").map((entry) => [entry.applicationKey, entry.viewQuid]));
    inspector.replaceSource(replacement);
    expect(["d", "a", "c"].every((key) => inspector.debugMappings().some((entry) => entry.applicationKey === key && entry.viewQuid === survivors.get(key))), "compatible replacement preserves keyed rows");
    expect(inspector.selection?.path.join("/") === "items/0" && inspector.selection.key === "a", "compatible replacement preserves selection by application key across movement");
    expect(mapping(inspector, ["items"])?.expanded === true, "compatible replacement preserves surviving expansion state");
    expect(inspector.source === replacement, "successful replacement exposes the new source");
    const invalid = hson.liveMap.fromJson({ items: [{ id: "x" }, { id: "x" }] });
    let replacementFailure: unknown;
    try { inspector.replaceSource(invalid); } catch (error) { replacementFailure = error; }
    expect(replacementFailure instanceof LiveInspectorError && replacementFailure.code === LIVE_INSPECTOR_SOURCE_REPLACEMENT_ERROR_CODE, "duplicate replacement receives source-replacement classification");
    expect(replacementFailure instanceof LiveInspectorError && replacementFailure.cause instanceof LiveInspectorError && replacementFailure.cause.code === LIVE_INSPECTOR_DUPLICATE_ARRAY_KEY_ERROR_CODE, "replacement failure preserves duplicate-key classification as its cause");
    replacement.set(["items", 0, "label"], "still active");
    expect(inspector.source === replacement && mapping(inspector, ["items", 0]) !== undefined, "failed replacement retains the active valid source");
    inspector.dispose();
  }

  runtime.reset_document();
  {
    const positionalSource = hson.liveMap.fromJson({ items: ["a", "b"] });
    const positional = hson.inspect.create({ source: positionalSource, host: makeHost(), initialDepth: 2 });
    expect(mapping(positional, ["items", 0])?.arrayIdentity === undefined, "array items are distinct from their parent identity mode");
    const first = mapping(positional, ["items", 0])?.viewQuid;
    positionalSource.at(["items"]).array.insert(0, "new");
    expect(mapping(positional, ["items", 0])?.viewQuid === first, "positional fallback honestly preserves positions, not moved values");
    expect(positional.diagnostics().positionalArrayBranches === 1, "positional fallback is visible in diagnostics");
    positional.dispose();

    expectCode(() => hson.inspect.create({
      source: hson.liveMap.fromJson([{ id: "a" }, { label: "missing" }]),
      host: makeHost(),
      arrayKey: (item) => typeof item === "object" && item !== null && !Array.isArray(item) ? item.id as string | undefined : undefined,
    }), LIVE_INSPECTOR_MISSING_ARRAY_KEY_ERROR_CODE, "mixed array key coverage");
  }

  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ user: { name: "Ada" } });
    const pathInspector = hson.inspect.create({ source: map.at(["user"]), host: makeHost(), initialDepth: 1 });
    expect(pathInspector.sourcePath.join("/") === "user", "path-handle source retains canonical root path");
    expect(mapping(pathInspector, ["user", "name"])?.kind === "string", "path-handle projection uses absolute canonical paths");
    pathInspector.dispose();

    const owned = hson.inspect.fromJson({ value: [true, null, 2], host: makeHost(), initialDepth: 1 });
    expect(owned.sourcePath.length === 0 && owned.diagnostics().sourceKind === "array", "owned JSON convenience constructs a LiveMap-backed array inspector");
    owned.dispose();

    const serialized = hson.fromTrustedHtml("<article data-id='x'><strong>Hello</strong></article>").toHson().serialize();
    const hsonInspector = hson.inspect.fromHson({ value: serialized, host: makeHost(), initialDepth: 0, hsonMode: "canonical" });
    expect(typeof hsonInspector.serialize("canonical-node") === "string", "canonical HSON node serialization is available for HSON-owned sources");
    expect(hsonInspector.serialize("html").includes("article"), "HTML serialization is limited to representable HSON-derived sources");
    hsonInspector.dispose();
  }

  runtime.reset_document();
  {
    const schema = hson.liveMap.schema.define((s) => s.exact({ name: s.string, age: s.number.optional }));
    const source = hson.liveMap.fromJson({ name: "Ada" }).schema.use(schema);
    const inspector = hson.inspect.create({ source, host: makeHost(), initialDepth: 1, showSchema: true });
    const selected = inspector.select(["name"]);
    expect(selected.schema?.includes("string") === true && selected.schema.includes("required"), "selection resolves effective LiveMap schema facets");
    expect(selected.schema?.includes("valid") === true, "schema detail reports current validation state");
    let observerCalls = 0;
    inspector.subscribe(() => { observerCalls += 1; throw new Error("observer fixture"); });
    source.set(["name"], "Grace");
    expect(observerCalls === 1 && inspector.status === "ready", "observer failure cannot corrupt inspector state");
    expect(inspector.diagnostics().observerFailures === 1 && inspector.diagnostics().lastNonFatalError?.code === LIVE_INSPECTOR_OBSERVER_ERROR_CODE, "observer failure is classified and diagnosed");

    const second = hson.inspect.create({ source, host: makeHost(), initialDepth: 1 });
    const firstName = mapping(inspector, ["name"])?.viewQuid;
    const secondName = mapping(second, ["name"])?.viewQuid;
    source.set(["name"], "Mina");
    expect(mapping(inspector, ["name"])?.viewQuid === firstName && mapping(second, ["name"])?.viewQuid === secondName, "two inspectors independently preserve rows over one source");
    second.root.remove();
    expect(second.status === "disposed" && second.diagnostics().totalBranchCount === 0, "external inspector-root removal triggers terminal ownership cleanup");
    inspector.dispose();
  }

  runtime.reset_document();
  {
    const source = hson.liveMap.fromJson({ value: "neutral fallback" });
    const inspector = hson.inspect.create({
      source,
      host: makeHost(),
      initialDepth: 1,
      renderers: { primitive: () => { throw new Error("renderer fixture"); } },
    });
    expect(inspector.status === "ready" && inspector.diagnostics().rendererHookFailures === 1, "renderer-hook failure leaves neutral rendering active");
    expect(inspector.root.dom.must.el().textContent?.includes("neutral fallback") === true, "renderer-hook failure falls back to the neutral preview");
    inspector.dispose();
  }

  for (const [value, kind] of [["root", "string"], [3, "number"], [false, "boolean"], [null, "null"]] as const) {
    runtime.reset_document();
    const inspector = hson.inspect.fromJson({ value, host: makeHost(), initialDepth: 0 });
    expect(inspector.sourcePath.length === 0 && inspector.diagnostics().sourceKind === kind && inspector.diagnostics().totalBranchCount === 1, `root ${kind} renders at the canonical root as one semantic branch`);
    inspector.dispose();
  }

  runtime.reset_document();
  {
    let updates = 0;
    let disposals = 0;
    let mutationSurface = false;
    const source = hson.liveMap.fromJson({ value: 2, other: "plain" });
    const inspector = hson.inspect.create({
      source,
      host: makeHost(),
      initialDepth: 1,
      specializations: [{
        name: "even-number",
        match: (value) => typeof value === "number" && value % 2 === 0,
        render(handle) {
          mutationSurface = "set" in handle || "replace" in handle || "delete" in handle;
          const tree = hson.liveTree.create.span();
          tree.text.set(`even:${handle.snap()}`);
          return {
            tree,
            update(next) { updates += 1; tree.text.set(`even:${next.snap()}`); },
            dispose() { disposals += 1; },
          };
        },
      }],
    });
    expect(mapping(inspector, ["value"])?.specializationName === "even-number", "semantic specialization is selected deterministically");
    expect(!mutationSurface, "renderer receives a mutation-free read handle");
    source.set(["value"], 4);
    expect(updates === 1, "matching specialization updates without recreation");
    source.set(["value"], 5);
    expect(disposals === 1 && mapping(inspector, ["value"])?.specializationName === undefined, "specialization exit disposes renderer-local resources once");
    inspector.dispose();
  }

  runtime.reset_document();
  {
    const large = Array.from({ length: 1_000 }, (_, index) => ({ id: `item-${index}`, value: index }));
    const source = hson.liveMap.fromJson({ items: large });
    const start = performance.now();
    const inspector = hson.inspect.create({ source, host: makeHost(), initialDepth: 0, arrayKey: (item) => (item as any).id });
    measurements.lazyInitial1000Ms = performance.now() - start;
    expect(inspector.diagnostics().totalBranchCount === 1, "large collapsed source does not eagerly walk view branches");
    const expandStart = performance.now();
    inspector.expand([]);
    inspector.expand(["items"]);
    measurements.expand1000Ms = performance.now() - expandStart;
    expect(inspector.diagnostics().totalBranchCount === 1_002, "large expansion materializes the expected branch count");
    const updateStart = performance.now();
    source.set(["items", 500, "value"], 1_001);
    measurements.targetedNestedUpdateMs = performance.now() - updateStart;
    expect(inspector.diagnostics().primitiveUpdates === 0, "collapsed item interiors do not materialize or update primitive descendants");
    expect(inspector.diagnostics().serializationRequests === 0, "ordinary commits perform no source serialization");
    const moved = mapping(inspector, ["items", 900]);
    const moveStart = performance.now();
    source.at(["items"]).array.move(900, 2);
    measurements.keyedMoveMs = performance.now() - moveStart;
    expect(mapping(inspector, ["items", 2])?.viewQuid === moved?.viewQuid, "large keyed move preserves its row");
    const insertStart = performance.now();
    source.at(["items"]).array.insert(0, { id: "front", value: -1 });
    measurements.frontInsertionMs = performance.now() - insertStart;
    expect(mapping(inspector, ["items", 0])?.applicationKey === "front", "large front insertion creates one keyed row");
    const removeStart = performance.now();
    source.at(["items"]).array.remove(10);
    measurements.deletionMs = performance.now() - removeStart;
    const reconciled = source.snap(["items"]) as any[];
    const reconcileStart = performance.now();
    source.replace(["items"], reconciled.map((item) => ({ ...item, value: item.value + 1 })));
    measurements.fullReconciliationMs = performance.now() - reconcileStart;
    const replacement = hson.liveMap.fromJson({ items: reconciled.map((item) => ({ ...item, value: item.value + 2 })) });
    const replacementStart = performance.now();
    inspector.replaceSource(replacement);
    measurements.equivalentReplacementMs = performance.now() - replacementStart;
    expect(inspector.diagnostics().preservedBranchesAfterReplacement >= 1_001, "equivalent large replacement records preserved branches");
    const collapseStart = performance.now();
    inspector.collapse(["items"]);
    measurements.collapseMs = performance.now() - collapseStart;
    const beforeDispose = inspector.diagnostics();
    expect(beforeDispose.recordsMoved > 0 && beforeDispose.recordsReused > 0 && beforeDispose.recordsRemoved > 0, "projection diagnostics expose movement, reuse, and removal");
    const disposeStart = performance.now();
    inspector.dispose();
    measurements.disposalMs = performance.now() - disposeStart;
    expect(inspector.diagnostics().totalBranchCount === 0, "large disposal retains no inspector branches");
  }

  runtime.reset_document();
  {
    const object = Object.fromEntries(Array.from({ length: 1_000 }, (_, index) => [`property-${index}`, index]));
    const sourceStart = performance.now();
    const source = hson.liveMap.fromJson(object);
    measurements.construct1000PropertyLiveMapMs = performance.now() - sourceStart;
    const start = performance.now();
    const inspector = hson.inspect.create({ source, host: makeHost(), initialDepth: 1 });
    measurements.initial1000PropertyObjectMs = performance.now() - start;
    expect(inspector.diagnostics().totalBranchCount === 1_001, "1,000-property object initial render materializes each property once");
    expect(inspector.diagnostics().recordsCreated === 1_001, "1,000-property object reports keyed projection creation counts");
    inspector.dispose();
  }
} finally {
  runtime.dispose();
}

console.log(JSON.stringify({ checks, measurements }, null, 2));
