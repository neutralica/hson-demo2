import { performance } from "node:perf_hooks";
import {
  hson,
  CssManager,
  LiveProjectionError,
  LIVE_PROJECTION_BRANCH_ATTACHED_ERROR_CODE,
  LIVE_PROJECTION_DUPLICATE_KEY_ERROR_CODE,
  LIVE_PROJECTION_RENDERER_CREATE_ERROR_CODE,
  LIVE_PROJECTION_SOURCE_REPLACEMENT_ERROR_CODE,
} from "hson-live";
import { install_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-runtime";

let checks = 0;

function expect(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`liveproject/keyed: ${message}`);
}

function expectError(error: unknown, code: string, message: string): void {
  expect(error instanceof LiveProjectionError, `${message}: classified LiveProjectionError`);
  expect(error.code === code, `${message}: expected ${code}, got ${error.code}`);
}

type Item = { id: string; label: string };

function order(host: ReturnType<typeof hson.liveTree.queryBody>["graft"] extends () => infer T ? T : never): string[] {
  return Array.from(host.dom.must.el().children).map((element) => element.textContent ?? "");
}

function makeHost() {
  const root = hson.liveTree.queryBody().graft();
  return root.create.ul();
}

function makeProjection(
  source: any,
  host: any,
  hooks: { failCreateFor?: string; failUpdateFor?: string } = {},
) {
  const trees = new Map<string, any>();
  const renders = new Map<string, number>();
  const updates = new Map<string, number>();
  const cleanups = new Map<string, number>();
  const projection = hson.liveProject.keyedCollection<Item>({
    source,
    host,
    key: (item) => item.id,
    render(item, context) {
      const value = item.snap();
      if (hooks.failCreateFor === value.id) throw new Error(`create ${value.id}`);
      const tree = hson.liveTree.create.li();
      tree.text.set(value.label);
      trees.set(value.id, tree);
      renders.set(value.id, (renders.get(value.id) ?? 0) + 1);
      context.own(() => cleanups.set(value.id, (cleanups.get(value.id) ?? 0) + 1));
      return {
        tree,
        update(next) {
          const nextValue = next.snap();
          if (hooks.failUpdateFor === nextValue.id) throw new Error(`update ${nextValue.id}`);
          tree.text.set(nextValue.label);
          updates.set(nextValue.id, (updates.get(nextValue.id) ?? 0) + 1);
        },
      };
    },
  });
  return { projection, trees, renders, updates, cleanups };
}

const runtime = install_hosted_dom_runtime();
const measurements: Record<string, number> = {};
try {
  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ items: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }] });
    const host = makeHost();
    const view = makeProjection(map.at(["items"]), host);
    expect(view.projection.status === "ready", "initial projection is ready");
    expect(view.projection.itemCount === 2, "initial projection owns two records");
    expect(order(host).join("|") === "Alpha|Beta", "initial order and content match");
    expect(view.projection.debugMappings().length === 2, "initial projection exposes one detached mapping per item");
    expect([...view.renders.values()].reduce((sum, count) => sum + count, 0) === 2, "initial items render exactly once");

    const aTree = view.trees.get("a");
    const bTree = view.trees.get("b");
    const aDom = aTree.dom.must.el();
    const bDom = bTree.dom.must.el();
    map.set(["items", 1, "label"], "Beta 2");
    expect(order(host).join("|") === "Alpha|Beta 2", "nested update changes the owning branch");
    expect((view.updates.get("b") ?? 0) === 1 && (view.updates.get("a") ?? 0) === 0, "nested update targets one record");
    expect(aTree === view.trees.get("a") && aDom === aTree.dom.must.el(), "nested update preserves sibling LiveTree and DOM identity");
    expect(bTree === view.trees.get("b") && bDom === bTree.dom.must.el(), "nested update preserves updated branch identity");

    map.at(["items"]).array.insert(1, { id: "c", label: "Gamma" });
    expect(order(host).join("|") === "Alpha|Gamma|Beta 2", "middle insertion has correct order");
    expect((view.renders.get("c") ?? 0) === 1, "insertion renders one new branch");
    expect(aTree === view.trees.get("a") && bTree === view.trees.get("b"), "insertion preserves existing branches");

    const cTree = view.trees.get("c");
    const cQuid = cTree.quid;
    const cDom = cTree.dom.must.el();
    map.at(["items"]).array.move(1, 0);
    expect(order(host).join("|") === "Gamma|Alpha|Beta 2", "movement reaches correct order");
    expect(cTree.quid === cQuid && cTree.dom.must.el() === cDom, "movement preserves view QUID and DOM identity");
    expect((view.cleanups.get("c") ?? 0) === 0, "movement performs no terminal cleanup");

    map.at(["items"]).array.splice(1, 1, { id: "d", label: "Delta" });
    expect(order(host).join("|") === "Gamma|Delta|Beta 2", "splice replacement converges");
    expect(aTree.isDisposed && (view.cleanups.get("a") ?? 0) === 1, "splice terminally disposes removed identity once");
    expect((view.renders.get("d") ?? 0) === 1 && bTree.dom.must.el() === bDom, "splice creates only the new identity");

    let notifications = 0;
    const off = view.projection.subscribe(() => { notifications += 1; });
    map.batch((tx) => {
      tx.splice(["items"], 1, 0, { id: "e", label: "Epsilon" });
      tx.set(["items", 2, "label"], "Delta 2");
    });
    expect(notifications === 1, "one LiveMap batch publishes one projection notification");
    expect(order(host).join("|") === "Gamma|Epsilon|Delta 2|Beta 2", "batch exposes one final correct projection");
    off();

    const oldC = view.trees.get("c");
    map.set(["items", 0, "id"], "z");
    expect(view.projection.debugMappings()[0]?.applicationKey === "z", "key mutation removes stale old-key mapping");
    expect(oldC.isDisposed && (view.cleanups.get("c") ?? 0) === 1, "key mutation is removal plus insertion without source-node identity proof");
    expect((view.renders.get("z") ?? 0) === 1, "key mutation creates the new keyed projection once");

    const replacement = hson.liveMap.fromJson({ items: [
      { id: "z", label: "Gamma snapshot" },
      { id: "e", label: "Epsilon" },
      { id: "d", label: "Delta snapshot" },
      { id: "b", label: "Beta snapshot" },
    ] });
    const surviving = new Map(view.projection.debugMappings().map((mapping) => [mapping.applicationKey, mapping.viewQuid]));
    view.projection.replaceSource(replacement.at(["items"]));
    expect(order(host).join("|") === "Gamma snapshot|Epsilon|Delta snapshot|Beta snapshot", "equivalent snapshot replacement updates content");
    expect(view.projection.debugMappings().every((mapping) => surviving.get(mapping.applicationKey) === mapping.viewQuid), "snapshot replacement reuses all surviving keyed branches");

    const invalid = hson.liveMap.fromJson({ items: [{ id: "x", label: "X" }, { id: "x", label: "duplicate" }] });
    let replacementError: unknown;
    try { view.projection.replaceSource(invalid.at(["items"])); } catch (error) { replacementError = error; }
    expectError(replacementError, LIVE_PROJECTION_SOURCE_REPLACEMENT_ERROR_CODE, "invalid source replacement");
    expect(order(host).join("|") === "Gamma snapshot|Epsilon|Delta snapshot|Beta snapshot", "invalid replacement retains prior projection");
    replacement.set(["items", 0, "label"], "Still subscribed");
    expect(order(host)[0] === "Still subscribed", "invalid replacement retains prior source subscription");
    expect(view.projection.diagnostics().failedSourceReplacements === 1, "failed replacement is diagnosed");

    view.projection.dispose();
    expect(view.projection.status === "disposed" && host.content.count() === 0, "disposal removes only owned branches");
    expect(view.projection.diagnostics().applicationKeyMappings === 0, "disposal releases projection records");
    const cleanupTotal = [...view.cleanups.values()].reduce((sum, count) => sum + count, 0);
    expect(cleanupTotal === 6, "every created branch cleanup runs exactly once across removals and disposal");
    view.projection.dispose();
    replacement.set(["items", 0, "label"], "ignored");
    expect(host.content.count() === 0, "repeated disposal is safe and later commits do nothing");
  }

  runtime.reset_document();
  {
    let renders = 0;
    const duplicate = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }, { id: "a", label: "A2" }] });
    let error: unknown;
    try {
      hson.liveProject.keyedCollection({
        source: duplicate.at(["items"]) as any,
        host: makeHost(),
        key: (item: any) => item.id,
        render() { renders += 1; return hson.liveTree.create.li(); },
      });
    } catch (caught) { error = caught; }
    expectError(error, LIVE_PROJECTION_DUPLICATE_KEY_ERROR_CODE, "duplicate initial key");
    expect(renders === 0, "duplicate initial keys reject before renderer or host mutation");
  }

  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }] });
    const host = makeHost();
    const view = makeProjection(map.at(["items"]), host);
    map.at(["items"]).array.push({ id: "a", label: "duplicate" });
    expect(view.projection.status === "failed", "duplicate-key mutation visibly fails the projection");
    expect(view.projection.failure?.code === LIVE_PROJECTION_DUPLICATE_KEY_ERROR_CODE, "duplicate mutation retains classified first failure");
    expect(order(host).join("|") === "A", "duplicate mutation does not corrupt prior projection");
    view.projection.dispose();
  }

  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] });
    const host = makeHost();
    let removedTree: any;
    let listenerHits = 0;
    const projection = hson.liveProject.keyedCollection<Item>({
      source: map.at(["items"]) as any,
      host,
      key: (item) => item.id,
      render(item) {
        const value = item.snap();
        const tree = hson.liveTree.create.button();
        tree.text.set(value.label);
        tree.listen.document.onCustom("projection-owned", () => { listenerHits += 1; });
        tree.css.setMany({ color: "red" });
        if (value.id === "a") removedTree = tree;
        return tree;
      },
    });
    const removedQuid = removedTree.quid;
    const removedElement = removedTree.dom.must.el();
    document.dispatchEvent(new CustomEvent("projection-owned"));
    map.at(["items"]).array.remove(0);
    document.dispatchEvent(new CustomEvent("projection-owned"));
    expect(listenerHits === 3, "terminal projection removal releases only the removed branch listener");
    expect(!CssManager.invoke().hasAnyRules(removedQuid), "terminal projection removal releases scoped CSS");
    expect(removedTree.isDisposed && !removedElement.hasAttribute("data-hson-quid"), "terminal projection removal destroys view identity once");
    projection.dispose();
  }

  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }] });
    const host = makeHost();
    const view = makeProjection(map.at(["items"]), host, { failCreateFor: "bad" });
    map.at(["items"]).array.push({ id: "bad", label: "Bad" });
    expect(view.projection.status === "failed", "renderer insertion failure marks projection failed");
    expect(view.projection.failure?.code === LIVE_PROJECTION_RENDERER_CREATE_ERROR_CODE, "renderer create failure is classified");
    expect(host.content.count() === 1, "failed insertion leaks no branch");
    view.projection.dispose();
  }

  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }] });
    const root = hson.liveTree.queryBody().graft();
    const host = root.create.ul();
    const elsewhere = root.create.div();
    const attached = elsewhere.create.li();
    let error: unknown;
    try {
      hson.liveProject.keyedCollection({
        source: map.at(["items"]) as any,
        host,
        key: (item: any) => item.id,
        render: () => attached,
      });
    } catch (caught) { error = caught; }
    expectError(error, LIVE_PROJECTION_BRANCH_ATTACHED_ERROR_CODE, "renderer attached branch");
    expect(attached.dom.must.el().parentElement === elsewhere.dom.must.el(), "projector never steals an attached renderer branch");
  }

  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ left: [{ id: "a", label: "A" }], right: [{ id: "b", label: "B" }] });
    const root = hson.liveTree.queryBody().graft();
    const left = makeProjection(map.at(["left"]), root.create.ul());
    const right = makeProjection(map.at(["right"]), root.create.ul());
    const secondLeft = makeProjection(map.at(["left"]), root.create.ul());
    expect(left.trees.get("a") !== secondLeft.trees.get("a"), "multiple views share source identity input but own distinct LiveTrees");
    map.set(["right", 0, "label"], "B2");
    expect((left.updates.get("a") ?? 0) === 0 && (right.updates.get("b") ?? 0) === 1, "independent source paths route commits correctly");
    left.projection.dispose();
    map.set(["left", 0, "label"], "A2");
    expect((secondLeft.updates.get("a") ?? 0) === 1, "disposing one view leaves another view healthy");
    right.projection.dispose();
    secondLeft.projection.dispose();
  }

  runtime.reset_document();
  {
    const source = hson.liveMap.fromJson({ items: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ] });
    const host = makeHost();
    const view = makeProjection(source.at(["items"]), host);
    const aQuid = view.trees.get("a").quid;
    const bQuid = view.trees.get("b").quid;
    const removedC = view.trees.get("c");
    const replacement = hson.liveMap.fromJson({ items: [
      { id: "b", label: "B2" },
      { id: "d", label: "D" },
      { id: "a", label: "A2" },
    ] });
    view.projection.replaceSource(replacement.at(["items"]));
    expect(order(host).join("|") === "B2|D|A2", "changed source replacement applies order, inserts, removals, and content");
    expect(view.projection.debugMappings().find((entry) => entry.applicationKey === "a")?.viewQuid === aQuid, "changed replacement reuses surviving a identity");
    expect(view.projection.debugMappings().find((entry) => entry.applicationKey === "b")?.viewQuid === bQuid, "changed replacement reuses surviving b identity");
    expect(removedC.isDisposed && (view.renders.get("d") ?? 0) === 1, "changed replacement disposes removed keys and renders new keys once");
    view.projection.dispose();
  }

  runtime.reset_document();
  {
    const authority = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] });
    const replay = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] });
    const view = makeProjection(replay.at(["items"]), makeHost());
    const aQuid = view.trees.get("a").quid;
    const commits = [
      authority.set(["items", 0, "label"], "A2"),
      authority.at(["items"]).array.insert(1, { id: "c", label: "C" }),
      authority.at(["items"]).array.move(2, 0),
      authority.at(["items"]).array.remove(2),
    ];
    for (const commit of commits) replay.replay({ prevRev: commit.prevRev, ops: commit.ops });
    expect(JSON.stringify(replay.at(["items"]).snap()) === JSON.stringify(authority.at(["items"]).snap()), "semantic replay converges to authoritative source structure");
    expect(order(view.projection.host).join("|") === "B|A2", "projection converges while replay commits apply");
    expect(view.projection.debugMappings().find((entry) => entry.applicationKey === "a")?.viewQuid === aQuid, "replay reconciliation preserves surviving keyed view identity");
    view.projection.dispose();
  }

  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }] });
    const view = makeProjection(map.at(["items"]), makeHost(), { failUpdateFor: "a" });
    map.set(["items", 0, "label"], "A2");
    expect(view.projection.status === "failed", "renderer update failure marks projection failed");
    expect(view.projection.failure?.code === "LIVE_PROJECTION_RENDERER_UPDATE_FAILED", "renderer update failure is classified and retained");
    expect(view.projection.diagnostics().rendererFailures === 1, "renderer update failure is diagnosed once");
    view.projection.dispose();
    expect((view.cleanups.get("a") ?? 0) === 1, "failed renderer branch still receives exactly one terminal cleanup");
  }

  runtime.reset_document();
  {
    const map = hson.liveMap.fromJson({ items: [{ id: "a", label: "A" }] });
    const view = makeProjection(map.at(["items"]), makeHost());
    const off = view.projection.subscribe(() => { throw new Error("observer"); });
    map.set(["items", 0, "label"], "A2");
    off();
    expect(view.projection.status === "ready" && order(view.projection.host)[0] === "A2", "observer failure cannot corrupt authoritative projection state");
    expect(view.projection.diagnostics().observerFailures === 1, "observer failure is diagnosed separately");
    view.projection.dispose();
  }

  runtime.reset_document();
  {
    const initial = Array.from({ length: 1_000 }, (_, index) => ({ id: `k${index}`, label: `Item ${index}` }));
    const map = hson.liveMap.fromJson({ items: initial });
    const host = makeHost();
    let renders = 0;
    let updates = 0;
    const started = performance.now();
    const projection = hson.liveProject.keyedCollection<Item>({
      source: map.at(["items"]) as any,
      host,
      key: (item) => item.id,
      render(item) {
        renders += 1;
        const tree = hson.liveTree.create.li();
        tree.text.set(item.snap().label);
        return { tree, update(next) { updates += 1; tree.text.set(next.snap().label); } };
      },
    });
    measurements.initial1000Ms = performance.now() - started;
    expect(renders === 1_000, "1,000-record initial projection renders once per record");

    const nestedStart = performance.now();
    map.set(["items", 500, "label"], "Changed");
    measurements.nestedUpdateMs = performance.now() - nestedStart;
    expect(renders === 1_000 && updates === 1, "one nested update neither rebuilds nor updates 1,000 branches");

    const insertStart = performance.now();
    map.at(["items"]).array.insert(1, { id: "inserted", label: "Inserted" });
    measurements.frontInsertionMs = performance.now() - insertStart;
    expect(renders === 1_001, "front insertion creates one branch and preserves unaffected siblings");

    const movedQuid = projection.debugMappings().find((mapping) => mapping.applicationKey === "k900")?.viewQuid;
    const moveStart = performance.now();
    map.at(["items"]).array.move(901, 2);
    measurements.movementMs = performance.now() - moveStart;
    expect(renders === 1_001, "movement recreates no branch");
    expect(projection.debugMappings().find((mapping) => mapping.applicationKey === "k900")?.viewQuid === movedQuid, "large movement preserves view identity");

    const deleteStart = performance.now();
    map.at(["items"]).array.remove(10);
    measurements.deletionMs = performance.now() - deleteStart;

    const reconcileStart = performance.now();
    projection.resync();
    measurements.completeReconciliationMs = performance.now() - reconcileStart;

    const replacement = hson.liveMap.fromJson({ items: map.at(["items"]).snap() });
    const replacementStart = performance.now();
    projection.replaceSource(replacement.at(["items"]) as any);
    measurements.sourceReplacementMs = performance.now() - replacementStart;
    expect(renders === 1_001, "equivalent source replacement preserves all keyed branches");

    const disposeStart = performance.now();
    projection.dispose();
    measurements.disposalMs = performance.now() - disposeStart;
    expect(projection.itemCount === 0 && projection.diagnostics().applicationKeyMappings === 0 && host.content.count() === 0, "disposal releases all records and owned branches");
  }
} finally {
  runtime.dispose();
}

console.log(JSON.stringify({ checks, pass: checks, measurements }));
