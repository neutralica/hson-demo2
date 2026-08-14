import { CssManager, hsonLiveTree, LiveTree } from "hson-live/livetree";
import type { HsonNode } from "hson-live/types";
import {
  LIVETREE_DISPOSED_ERROR_CODE,
  LiveTreeDisposedError,
  _CREATE_NODE,
  _TERMINAL_DISPOSABLE_DRAIN_LIMIT,
  _assert_livetree_node_active,
  _collect_subtree_nodes,
  _destroy_subtree_quids,
  _detach_node_deep,
  _disposable_add_for_owner,
  _disposables_count_for_owner,
  _dispose_node_deep,
  _disposed_nodes_count_for_subtree,
  _ensure_livetree_quid,
  _get_livetree_node_by_quid,
  _get_livetree_quid,
  _has_livetree_element_for_node,
  _has_livetree_quid,
  _is_livetree_node_disposed,
} from "hson-live/diagnostics";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import type { TestSuite } from "../../harness/core/test-contracts";
import { make_livetree_suite } from "./make-livetree-suite";

const HSON_QUID_ATTR = "hson:quid";

function traversal_case(suite: string): LiveTreeCaseSpec {
  let pre = "";
  let post = "";

  return {
    suite,
    caseId: "lifecycle-traversal-includes-vsn-nodes-and-ignores-primitives-deterministically", name: "lifecycle traversal includes VSN nodes and ignores primitives deterministically",
    html: `<main></main>`,
    act() {
      const section = _CREATE_NODE({ $_tag: "section", $_content: ["leaf"] });
      const stringNode = _CREATE_NODE({ $_tag: "_hson_str", $_content: ["wrapped"] });
      const emphasis = _CREATE_NODE({ $_tag: "em", $_content: [] });
      const elem = _CREATE_NODE({
        $_tag: "_hson_elem",
        $_content: [section, "primitive", stringNode, emphasis],
      });
      const root = _CREATE_NODE({ $_tag: "_hson_root", $_content: [elem] });

      pre = _collect_subtree_nodes(root, "pre").map((node) => node.$_tag).join(",");
      post = _collect_subtree_nodes(root, "post").map((node) => node.$_tag).join(",");
    },
    assert(_tree, t) {
      t.eq("pre-order is stable", pre, "_hson_root,_hson_elem,section,_hson_str,em");
      t.eq("post-order is stable", post, "section,_hson_str,em,_hson_elem,_hson_root");
    },
  };
}

function recursive_quid_case(suite: string): LiveTreeCaseSpec {
  let destroyed = 0;
  let repeated = -1;
  let allStrongGone = false;
  let allWeakGone = false;
  let allMetadataGone = false;

  return {
    suite,
    caseId: "recursive-quid-destruction-scrubs-unmounted-root-descendants-and-vsn-identity", name: "recursive QUID destruction scrubs unmounted root descendants and VSN identity",
    html: `<main></main>`,
    act() {
      const leaf = _CREATE_NODE({ $_tag: "span", $_content: ["x"] });
      const elem = _CREATE_NODE({ $_tag: "_hson_elem", $_content: [leaf] });
      const root = _CREATE_NODE({ $_tag: "_hson_root", $_content: [elem] });
      const nodes = _collect_subtree_nodes(root, "post");
      const quids = nodes.map((node) => _ensure_livetree_quid(node));

      destroyed = _destroy_subtree_quids(root);
      repeated = _destroy_subtree_quids(root);
      allStrongGone = quids.every((quid) => _get_livetree_node_by_quid(quid) === undefined);
      allWeakGone = nodes.every((node) => !_has_livetree_quid(node) && _get_livetree_quid(node) === undefined);
      allMetadataGone = nodes.every((node) => node.$_meta?.quid === undefined);
    },
    assert(_tree, t) {
      t.eq("all three node identities destroyed", destroyed, 3);
      t.eq("repeated recursive destruction is harmless", repeated, 0);
      t.eq("all strong registry entries are gone", allStrongGone, true);
      t.eq("all weak reverse entries are gone", allWeakGone, true);
      t.eq("all persisted metadata is gone", allMetadataGone, true);
    },
  };
}

function mapped_quid_case(suite: string): LiveTreeCaseSpec {
  let destroyed = 0;
  let rootRegistryGone = false;
  let childRegistryGone = false;
  let rootDomScrubbed = false;
  let childDomScrubbed = false;
  let mappingsRemain = false;

  return {
    suite,
    caseId: "recursive-quid-destruction-scrubs-mapped-dom-attributes-without-detaching", name: "recursive QUID destruction scrubs mapped DOM attributes without detaching",
    dom: true,
    html: `<main><section id="target"><span id="child">x</span></section></main>`,
    act(tree) {
      const target = tree.find.must.byId("target");
      const child = tree.find.must.byId("child");
      const targetNode = target.node;
      const childNode = child.node;
      const targetEl = target.dom.must.el();
      const childEl = child.dom.must.el();
      const targetQuid = target.quid;
      const childQuid = child.quid;

      destroyed = _destroy_subtree_quids(targetNode);
      rootRegistryGone = _get_livetree_node_by_quid(targetQuid) === undefined;
      childRegistryGone = _get_livetree_node_by_quid(childQuid) === undefined;
      rootDomScrubbed = !targetEl.hasAttribute(HSON_QUID_ATTR);
      childDomScrubbed = !childEl.hasAttribute(HSON_QUID_ATTR);
      mappingsRemain = _has_livetree_element_for_node(targetNode)
        && _has_livetree_element_for_node(childNode);
    },
    assert(_tree, t) {
      t.eq("mapped root and child identities destroyed", destroyed, 2);
      t.eq("mapped root registry entry gone", rootRegistryGone, true);
      t.eq("mapped child registry entry gone", childRegistryGone, true);
      t.eq("mapped root DOM attribute scrubbed", rootDomScrubbed, true);
      t.eq("mapped child DOM attribute scrubbed", childDomScrubbed, true);
      t.eq("identity destruction alone preserves mappings", mappingsRemain, true);
    },
  };
}

function weak_and_duplicate_case(suite: string): LiveTreeCaseSpec {
  let weakGone = false;
  let duplicateCouldNotDeleteOwner = false;
  let duplicateMetadataGone = false;
  let divergentRegistryReleasedSafely = false;

  return {
    suite,
    caseId: "recursive-quid-destruction-handles-weakmap-only-and-malformed-duplicate-identity", name: "recursive QUID destruction handles WeakMap-only and malformed duplicate identity",
    html: `<main></main>`,
    act() {
      const weakOnly = _CREATE_NODE({ $_tag: "aside" });
      const weakQuid = _ensure_livetree_quid(weakOnly, { persist: false });
      _destroy_subtree_quids(weakOnly);
      weakGone = _get_livetree_quid(weakOnly) === undefined
        && _get_livetree_node_by_quid(weakQuid) === undefined;

      const duplicateQuid = `lifecycle-duplicate-${crypto.randomUUID()}`;
      const owner = _CREATE_NODE({ $_tag: "section", $_meta: { quid: duplicateQuid } });
      const duplicate = _CREATE_NODE({ $_tag: "div", $_meta: { quid: duplicateQuid } });
      _ensure_livetree_quid(owner);
      _destroy_subtree_quids(duplicate);
      duplicateCouldNotDeleteOwner = _get_livetree_node_by_quid(duplicateQuid) === owner;
      duplicateMetadataGone = duplicate.$_meta?.quid === undefined;
      _destroy_subtree_quids(owner);

      const registryOwner = _CREATE_NODE({ $_tag: "article" });
      const registryQuid = _ensure_livetree_quid(registryOwner, { persist: false });
      const metadataOwner = _CREATE_NODE({ $_tag: "nav" });
      const metadataQuid = _ensure_livetree_quid(metadataOwner);
      (registryOwner.$_meta ??= {}).quid = metadataQuid;
      _destroy_subtree_quids(registryOwner);
      divergentRegistryReleasedSafely = _get_livetree_node_by_quid(registryQuid) === undefined
        && _get_livetree_node_by_quid(metadataQuid) === metadataOwner;
      _destroy_subtree_quids(metadataOwner);
    },
    assert(_tree, t) {
      t.eq("WeakMap-only identity is gone", weakGone, true);
      t.eq("duplicate metadata cannot delete the real owner", duplicateCouldNotDeleteOwner, true);
      t.eq("duplicate node metadata is still scrubbed", duplicateMetadataGone, true);
      t.eq("divergent metadata cannot hide or steal registry ownership", divergentRegistryReleasedSafely, true);
    },
  };
}

function unmounted_terminal_case(suite: string): LiveTreeCaseSpec {
  let expectedNodes = 0;
  let disposedNodes = 0;
  let resultNodes = 0;
  let identitiesDestroyed = 0;
  let aliasesDisposed = false;
  let identitiesGone = false;
  let metadataGone = false;
  let repeatedStillDisposed = false;

  return {
    suite,
    caseId: "terminal-disposal-marks-every-unmounted-node-and-every-alias", name: "terminal disposal marks every unmounted node and every alias",
    html: `<main></main>`,
    act() {
      const branch = hsonLiveTree.fromTrustedHtml(
        `<section id="owner"><span id="child">x</span></section>`,
      );
      const child = branch.find.must.byId("child");
      const branchAlias = new LiveTree(branch);
      const childAlias = new LiveTree(child);
      const rootNode = branch.node;
      const nodes = _collect_subtree_nodes(rootNode, "post");
      const quids = nodes.map((node) => _ensure_livetree_quid(node));
      expectedNodes = nodes.length;

      const result = _dispose_node_deep(rootNode);
      resultNodes = result.nodesDisposed;
      identitiesDestroyed = result.identitiesDestroyed;
      disposedNodes = _disposed_nodes_count_for_subtree(rootNode);
      aliasesDisposed = branch.isDisposed && branchAlias.isDisposed
        && child.isDisposed && childAlias.isDisposed;
      identitiesGone = quids.every((quid) => _get_livetree_node_by_quid(quid) === undefined)
        && nodes.every((node) => _get_livetree_quid(node) === undefined);
      metadataGone = nodes.every((node) => node.$_meta?.quid === undefined);
      _dispose_node_deep(rootNode);
      repeatedStillDisposed = nodes.every((node) => _is_livetree_node_disposed(node));
    },
    assert(_tree, t) {
      t.eq("terminal result covers the complete graph", resultNodes, expectedNodes);
      t.eq("all identities are counted as destroyed", identitiesDestroyed, expectedNodes);
      t.eq("every subtree node is disposed", disposedNodes, expectedNodes);
      t.eq("all aliases share disposed state", aliasesDisposed, true);
      t.eq("no node remains QUID-reachable", identitiesGone, true);
      t.eq("no persisted QUID metadata remains", metadataGone, true);
      t.eq("repeated terminal disposal remains disposed", repeatedStillDisposed, true);
    },
  };
}

function runtime_terminal_case(suite: string): LiveTreeCaseSpec {
  let listenerHits = 0;
  let successfulCleanups = 0;
  let reentrantCleanups = 0;
  let runtimeGone = false;
  let identityGone = false;
  let domIdentityGone = false;
  let disposed = false;
  let drainReachedFixedPoint = false;

  return {
    suite,
    caseId: "terminal-disposal-composes-runtime-cleanup-identity-destruction-and-reentrant-drain", name: "terminal disposal composes runtime cleanup identity destruction and reentrant drain",
    dom: true,
    html: `<main><section id="target"><button id="button">go</button></section></main>`,
    act(tree) {
      const target = tree.find.must.byId("target");
      const button = tree.find.must.byId("button");
      const targetNode = target.node;
      const buttonNode = button.node;
      const targetEl = target.dom.must.el();
      const buttonEl = button.dom.must.el();
      const targetQuid = target.quid;
      const buttonQuid = button.quid;

      target.css.setMany({ opacity: "0.5" });
      button.css.setMany({ color: "red" });
      button.listen.onClick(() => { listenerHits += 1; });
      buttonEl.dispatchEvent(new MouseEvent("click"));

      _disposable_add_for_owner(buttonQuid, () => {
        throw new Error("expected lifecycle test cleanup failure");
      });
      _disposable_add_for_owner(buttonQuid, () => {
        successfulCleanups += 1;
        _disposable_add_for_owner(buttonQuid, () => { reentrantCleanups += 1; });
      });

      const result = _dispose_node_deep(targetNode);
      buttonEl.dispatchEvent(new MouseEvent("click"));

      runtimeGone = listenerHits === 1
        && !CssManager.invoke().hasAnyRules(targetQuid)
        && !CssManager.invoke().hasAnyRules(buttonQuid)
        && !_has_livetree_element_for_node(targetNode)
        && !_has_livetree_element_for_node(buttonNode);
      identityGone = _get_livetree_node_by_quid(targetQuid) === undefined
        && _get_livetree_node_by_quid(buttonQuid) === undefined
        && _get_livetree_quid(targetNode) === undefined
        && _get_livetree_quid(buttonNode) === undefined;
      domIdentityGone = !targetEl.hasAttribute(HSON_QUID_ATTR) && !buttonEl.hasAttribute(HSON_QUID_ATTR);
      disposed = target.isDisposed && button.isDisposed;
      drainReachedFixedPoint = successfulCleanups === 1
        && reentrantCleanups === 1
        && result.disposableDrainPasses === 1
        && _disposables_count_for_owner(buttonQuid) === 0;
    },
    assert(_tree, t) {
      t.eq("listener CSS and mappings are removed", runtimeGone, true);
      t.eq("cleanup continues after a disposable throws", successfulCleanups, 1);
      t.eq("reentrant disposable is invoked", reentrantCleanups, 1);
      t.eq("reentrant owner set reaches a fixed point", drainReachedFixedPoint, true);
      t.eq("root and child identity are gone", identityGone, true);
      t.eq("retained DOM references have no QUID attribute", domIdentityGone, true);
      t.eq("root and child handles are disposed", disposed, true);
    },
  };
}

function bounded_reentrant_case(suite: string): LiveTreeCaseSpec {
  let calls = 0;
  let passes = 0;
  let bounded = false;
  let ownerEmpty = false;

  return {
    suite,
    caseId: "terminal-disposable-drain-bounds-pathological-re-registration", name: "terminal disposable drain bounds pathological re-registration",
    html: `<main></main>`,
    act() {
      const branch = hsonLiveTree.fromTrustedHtml(`<section></section>`);
      const quid = branch.quid;
      const repeat = (): void => {
        calls += 1;
        _disposable_add_for_owner(quid, repeat);
      };
      _disposable_add_for_owner(quid, repeat);

      const result = _dispose_node_deep(branch.node);
      passes = result.disposableDrainPasses;
      bounded = result.disposableDrainBounded;
      ownerEmpty = _disposables_count_for_owner(quid) === 0;
    },
    assert(_tree, t) {
      t.eq("drain uses the stable pass limit", passes, _TERMINAL_DISPOSABLE_DRAIN_LIMIT);
      t.eq("pathological registration reports bounded termination", bounded, true);
      t.eq("initial callback plus every bounded pass ran", calls, _TERMINAL_DISPOSABLE_DRAIN_LIMIT + 1);
      t.eq("remaining callbacks are discarded", ownerEmpty, true);
    },
  };
}

function detach_state_case(suite: string): LiveTreeCaseSpec {
  let active = false;
  let identityPreserved = false;

  return {
    suite,
    caseId: "runtime-detach-preserves-active-state-and-identity", name: "runtime detach preserves active state and identity",
    html: `<main></main>`,
    act() {
      const branch = hsonLiveTree.fromTrustedHtml(`<section><span>x</span></section>`);
      const quid = branch.quid;
      _detach_node_deep(branch.node);
      active = !branch.isDisposed && !_is_livetree_node_disposed(branch.node);
      identityPreserved = _get_livetree_node_by_quid(quid) === branch.node;
      _destroy_subtree_quids(branch.node);
    },
    assert(_tree, t) {
      t.eq("plain detach does not dispose", active, true);
      t.eq("plain detach preserves registry ownership", identityPreserved, true);
    },
  };
}

function disposed_error_case(suite: string): LiveTreeCaseSpec {
  let classified = false;
  let code = "";
  let operation = "";
  let mentionsQuid = false;
  let directConstructible = false;
  let remintDidNotReactivate = false;

  return {
    suite,
    caseId: "disposed-guard-throws-the-stable-livetreedisposederror", name: "disposed guard throws the stable LiveTreeDisposedError",
    html: `<main></main>`,
    act() {
      const branch = hsonLiveTree.fromTrustedHtml(`<section></section>`);
      const formerQuid = branch.quid;
      const node = branch.node;
      _dispose_node_deep(node);

      try {
        _assert_livetree_node_active(node, "mutate lifecycle test node");
      } catch (error: unknown) {
        classified = error instanceof LiveTreeDisposedError;
        if (error instanceof LiveTreeDisposedError) {
          code = error.code;
          operation = error.operation;
          mentionsQuid = error.message.includes(formerQuid);
        }
      }

      directConstructible = new LiveTreeDisposedError("inspect").code
        === LIVETREE_DISPOSED_ERROR_CODE;
      _ensure_livetree_quid(node);
      remintDidNotReactivate = branch.isDisposed;
      _destroy_subtree_quids(node);
    },
    assert(_tree, t) {
      t.eq("error is classifiable by type", classified, true);
      t.eq("error code is stable", code, "LIVETREE_DISPOSED");
      t.eq("error records the operation", operation, "mutate lifecycle test node");
      t.eq("error safely includes former QUID", mentionsQuid, true);
      t.eq("error is directly constructible", directConstructible, true);
      t.eq("QUID reminting does not clear disposed state", remintDidNotReactivate, true);
    },
  };
}

function empty_regression_case(suite: string): LiveTreeCaseSpec {
  let destroyed = false;
  let callerActive = false;
  let domEmpty = false;

  return {
    suite,
    caseId: "patch-2-makes-empty-descendant-identity-terminal", name: "Patch 2 makes empty descendant identity terminal",
    dom: true,
    html: `<main><section id="root"><span id="child">x</span></section></main>`,
    act(tree) {
      const root = tree.find.must.byId("root");
      const child = tree.find.must.byId("child");
      const childNode = child.node;
      const childQuid = child.quid;
      root.empty();
      destroyed = _get_livetree_node_by_quid(childQuid) === undefined
        && childNode.$_meta?.quid === undefined
        && child.isDisposed;
      callerActive = !root.isDisposed;
      domEmpty = root.dom.must.el().childNodes.length === 0;
    },
    assert(_tree, t) {
      t.eq("empty destroys descendant QUID behavior", destroyed, true);
      t.eq("empty leaves caller active", callerActive, true);
      t.eq("empty still clears DOM contents", domEmpty, true);
    },
  };
}

function remove_self_regression_case(suite: string): LiveTreeCaseSpec {
  let nonRootTerminal = false;
  let ownedRootTerminal = false;

  return {
    suite,
    caseId: "patch-2-removeself-is-a-terminal-remove-alias", name: "Patch 2 removeSelf is a terminal remove alias",
    dom: true,
    html: `<main><section id="target"><span id="child">x</span></section></main>`,
    act(tree) {
      const target = tree.find.must.byId("target");
      const child = tree.find.must.byId("child");
      const targetNode = target.node;
      const childNode = child.node;
      const targetQuid = target.quid;
      const childQuid = child.quid;
      const removed = target.removeSelf();
      nonRootTerminal = removed === 1
        && _get_livetree_node_by_quid(targetQuid) === undefined
        && _get_livetree_quid(targetNode) === undefined
        && _get_livetree_node_by_quid(childQuid) === undefined
        && target.isDisposed
        && child.isDisposed;

      const rootBranch = hsonLiveTree.fromTrustedHtml(`<aside></aside>`);
      const rootQuid = rootBranch.quid;
      const rootNode = rootBranch.node;
      const rootRemoved = rootBranch.removeSelf();
      ownedRootTerminal = rootRemoved === 1
        && _get_livetree_node_by_quid(rootQuid) === undefined
        && _get_livetree_quid(rootNode) === undefined
        && rootBranch.isDisposed;
    },
    assert(_tree, t) {
      t.eq("non-root removeSelf terminally disposes its subtree", nonRootTerminal, true);
      t.eq("ordinary owned root removeSelf terminally disposes", ownedRootTerminal, true);
    },
  };
}

function remove_children_regression_case(suite: string): LiveTreeCaseSpec {
  let removed = -1;
  let textPreserved = false;
  let identityPreserved = false;

  return {
    suite,
    caseId: "patch-1-preserves-filtered-removechildren-behavior", name: "Patch 1 preserves filtered removeChildren behavior",
    dom: true,
    html: `<main id="root">before<section id="one">one</section><section id="two">two</section>after</main>`,
    act(tree) {
      const root = tree.find.must.byId("root");
      const one = tree.find.must.byId("one");
      const oneNode = one.node;
      const oneQuid = one.quid;
      removed = root.removeChildren();
      textPreserved = root.text.get().includes("before")
        && root.text.get().includes("after")
        && root.dom.must.el().textContent?.includes("before") === true
        && root.dom.must.el().textContent?.includes("after") === true;
      identityPreserved = _get_livetree_node_by_quid(oneQuid) === oneNode
        && !one.isDisposed;
    },
    assert(_tree, t) {
      t.eq("removeChildren still removes two semantic elements", removed, 2);
      t.eq("removeChildren still preserves primitive text", textPreserved, true);
      t.eq("removeChildren still retains removed identity", identityPreserved, true);
    },
  };
}

export function livetree_lifecycle_foundations(): TestSuite {
  const suite = "livetree/lifecycle-foundations";
  const cases: readonly LiveTreeCaseSpec[] = [
    traversal_case(suite),
    recursive_quid_case(suite),
    mapped_quid_case(suite),
    weak_and_duplicate_case(suite),
    unmounted_terminal_case(suite),
    runtime_terminal_case(suite),
    bounded_reentrant_case(suite),
    detach_state_case(suite),
    disposed_error_case(suite),
    empty_regression_case(suite),
    remove_self_regression_case(suite),
    remove_children_regression_case(suite),
  ];
  return make_livetree_suite(suite, cases);
}
