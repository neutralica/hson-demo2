import { performance } from "node:perf_hooks";
import {
  _append_livetree_branches_atomic,
  begin_livetree_materialization_profile,
  LIVETREE_DISPOSED_ERROR_CODE,
  LiveTreeDisposedError,
  type LiveTreeMaterializationProfile,
} from "hson-live/diagnostics";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";
import { hson } from "hson-live";
import {
  CollectionReflectError,
  COLLECTION_REFLECT_RENDERER_CREATE_ERROR_CODE,
  hsonReflect,
} from "hson-live/reflect";
import { hsonLiveMap } from "hson-live/livemap";
import { hsonLiveTree } from "hson-live/livetree";
import { LIVETREE_BATCH_VALIDATION_ERROR_CODE, LiveTreeBatchError, CssManager } from "hson-live/livetree";

let checks = 0;
function expect(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`liveinspect/materialization: ${message}`);
}

const runtime = install_hosted_dom_runtime();
const root = hsonLiveTree.queryBody().graft();
const measurements: Record<string, number> = {};

try {
  root.empty();
  {
    const host = root.create.div();
    const first = hsonLiveTree.create.section();
    const firstChild = first.create.button();
    firstChild.text.set("nested");
    const second = hsonLiveTree.create.aside();
    _append_livetree_branches_atomic(host, [first, second]);
    expect(host.content.count() === 2, "valid batch attaches every branch in order");
    expect(host.content.at(0)?.quid === first.quid && host.content.at(1)?.quid === second.quid, "batch preserves ordered LiveTree identity");
    const firstDom = first.dom.must.el();
    expect(first.content.mustOnly().quid === firstChild.quid, "batch preserves nested branch identity");
    expect(host.dom.must.el().children.length === 2, "batch performs coherent DOM attachment");
    first.detach();
    _append_livetree_branches_atomic(host, [first], 0);
    expect(first.dom.must.el() === firstDom, "batch reinsertion preserves retained DOM identity");
  }

  root.empty();
  {
    const host = root.create.div();
    const elsewhere = root.create.div();
    const valid = hsonLiveTree.create.span();
    const attached = elsewhere.create.span();
    let error: unknown;
    try { _append_livetree_branches_atomic(host, [valid, attached]); } catch (caught) { error = caught; }
    expect(error instanceof LiveTreeBatchError && error.code === LIVETREE_BATCH_VALIDATION_ERROR_CODE, "attached member receives stable batch validation error");
    expect(host.content.count() === 0 && host.dom.must.el().children.length === 0, "invalid member rolls back the complete batch");
    host.append(valid);
    expect(host.content.count() === 1, "rollback leaves prior valid members detached and reusable");
  }

  root.empty();
  {
    const host = root.create.div();
    const first = hsonLiveTree.create.div();
    const duplicate = hsonLiveTree.create.div();
    const original = duplicate.node.$_meta?.quid;
    duplicate.node.$_meta = { ...duplicate.node.$_meta, "quid": first.quid };
    let error: unknown;
    try { _append_livetree_branches_atomic(host, [first, duplicate]); } catch (caught) { error = caught; }
    expect(error instanceof LiveTreeBatchError && error.code === LIVETREE_BATCH_VALIDATION_ERROR_CODE, "duplicate QUID receives stable batch validation error");
    expect(host.content.count() === 0, "duplicate QUID leaves no partial graph attachment");
    if (original === undefined) delete duplicate.node.$_meta?.quid;
    else duplicate.node.$_meta = { ...duplicate.node.$_meta, "quid": original };
    first.remove();
    duplicate.remove();
  }

  root.empty();
  {
    const host = root.create.div();
    const branch = hsonLiveTree.create.button();
    const branchQuid = branch.quid;
    branch.css.setMany({ color: "red" });
    let events = 0;
    branch.listen.document.onCustom("batch-owned", () => { events += 1; });
    _append_livetree_branches_atomic(host, [branch]);
    document.dispatchEvent(new CustomEvent("batch-owned"));
    expect(events === 1 && CssManager.invoke().hasAnyRules(branchQuid), "batch preserves branch-owned listeners and CSS");
    root.empty();
    document.dispatchEvent(new CustomEvent("batch-owned"));
    expect(events === 1 && !CssManager.invoke().hasAnyRules(branchQuid), "terminal host cleanup releases batch-owned resources once");
  }

  root.empty();
  {
    const disposedHost = root.create.div();
    disposedHost.remove();
    const branch = hsonLiveTree.create.div();
    let error: unknown;
    try { _append_livetree_branches_atomic(disposedHost, [branch]); } catch (caught) { error = caught; }
    expect(error instanceof LiveTreeDisposedError && error.code === LIVETREE_DISPOSED_ERROR_CODE, "disposed batch host fails before attachment");
    expect(!branch.isDisposed, "disposed host failure leaves detached branch ownership intact");
    branch.remove();
  }

  root.empty();
  {
    const host = root.create.div();
    const source = hsonLiveMap.fromJson({ items: [{ id: "a" }, { id: "bad" }, { id: "c" }] });
    let error: unknown;
    try {
      hsonReflect.collection({
        source: source.at(["items"]) as any,
        host,
        key: (item: any) => item.id,
        render(item: any) {
          if (item.snap().id === "bad") throw new Error("renderer fixture");
          return hsonLiveTree.create.div();
        },
      });
    } catch (caught) { error = caught; }
    expect(error instanceof CollectionReflectError && error.code === COLLECTION_REFLECT_RENDERER_CREATE_ERROR_CODE, "renderer failure remains classified through initial projection");
    expect(host.content.count() === 0 && host.dom.must.el().children.length === 0, "renderer failure before batch attachment leaks no branch");
  }

  const small = profileObject(100);
  const large = profileObject(1_000);
  measurements.object100Ms = small.ms;
  measurements.object1000Ms = large.ms;
  expect(large.branches === 1_001, "1,000-property profile materializes the expected branch count");
  expect(large.profile.appendValidationTargetNodes <= small.profile.appendValidationTargetNodes * 15, "target validation work grows approximately proportionally from 100 to 1,000 rows");
  expect(large.profile.liveTreeInstances <= small.profile.liveTreeInstances * 11, "LiveTree construction grows proportionally");
  expect(large.profile.sourceAtCalls <= small.profile.sourceAtCalls * 11 && large.profile.objectKeyEnumerations === 1, "source adaptation is one read per row and one object-key enumeration");
  expect(large.profile.inspectorRootListeners === 1 && large.profile.inspectorCssRuleSets === 11, "listener and stylesheet setup remain collection-size independent");
  expect(large.profile.domAppendOperations === 3, "one large inspector uses a bounded number of host DOM attachments");
  expect(large.diagnostics.batchAttachmentPasses === 2 && large.diagnostics.rowsBatchAttached === 1_001, "public diagnostics expose coherent root and property batches");
  expect(large.diagnostics.largestMaterialization === 1_000 && large.diagnostics.observerNotifications === 0, "materialization diagnostics report the largest pass without per-row observer publication");

  root.empty();
  {
    const value = Object.fromEntries(Array.from({ length: 1_000 }, (_, index) => [`p${index}`, index]));
    const source = hsonLiveMap.fromJson(value);
    const expanded = hson.inspect.create({ source, host: root.create.div(), initialDepth: 1 });
    const lazy = hson.inspect.create({ source, host: root.create.div(), initialDepth: 0 });
    expect(expanded.diagnostics().totalBranchCount === 1_001 && lazy.diagnostics().totalBranchCount === 1, "materialization state remains isolated across two inspectors");
    const retainedRowQuid = expanded.debugMappings().find((mapping) => mapping.path.length === 1)?.viewQuid;
    expanded.collapse([]);
    const repeatStarted = performance.now();
    expanded.expand([]);
    measurements.repeatedExpansion1000Ms = performance.now() - repeatStarted;
    expect(
      expanded.debugMappings().find((mapping) => mapping.path.length === 1)?.viewQuid === retainedRowQuid,
      "repeated expansion reuses materialized row identity",
    );
    lazy.expand([]);
    expect(lazy.diagnostics().totalBranchCount === 1_001, "lazy peer materializes current authoritative state on first expansion");
    expanded.dispose();
    source.set(["p0"], 42);
    expect(lazy.status === "ready" && lazy.debugMappings().length === 1_001, "disposing one inspector does not affect its peer");
    lazy.dispose();
  }
} finally {
  runtime.dispose();
}

console.log(JSON.stringify({ checks, measurements }, null, 2));

function profileObject(size: number): Readonly<{
  ms: number;
  branches: number;
  profile: LiveTreeMaterializationProfile;
  diagnostics: ReturnType<ReturnType<typeof hson.inspect.create>["diagnostics"]>;
}> {
  root.empty();
  const value = Object.fromEntries(Array.from({ length: size }, (_, index) => [`property-${index}`, index]));
  const source = hsonLiveMap.fromJson(value);
  const host = root.create.div();
  const profiler = begin_livetree_materialization_profile();
  const started = performance.now();
  const inspector = hson.inspect.create({ source, host, initialDepth: 1 });
  const ms = performance.now() - started;
  const profile = profiler.stop();
  const branches = inspector.diagnostics().totalBranchCount;
  const diagnostics = inspector.diagnostics();
  inspector.dispose();
  return { ms, branches, profile, diagnostics };
}
