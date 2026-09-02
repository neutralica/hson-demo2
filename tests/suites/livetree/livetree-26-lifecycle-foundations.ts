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

function remove_regression_case(suite: string): LiveTreeCaseSpec {
  let nonRootTerminal = false;
  let ownedRootTerminal = false;

  return {
    suite,
    caseId: "remove-terminally-disposes-branches", name: "remove terminally disposes branches",
    dom: true,
    html: `<main><section id="target"><span id="child">x</span></section></main>`,
    act(tree) {
      const target = tree.find.must.byId("target");
      const child = tree.find.must.byId("child");
      const targetNode = target.node;
      const childNode = child.node;
      const targetQuid = target.quid;
      const childQuid = child.quid;
      target.remove();
      nonRootTerminal = _get_livetree_node_by_quid(targetQuid) === undefined
        && _get_livetree_quid(targetNode) === undefined
        && _get_livetree_node_by_quid(childQuid) === undefined
        && target.isDisposed
        && child.isDisposed;

      const rootBranch = hsonLiveTree.fromTrustedHtml(`<aside></aside>`);
      const rootQuid = rootBranch.quid;
      const rootNode = rootBranch.node;
      rootBranch.remove();
      ownedRootTerminal = _get_livetree_node_by_quid(rootQuid) === undefined
        && _get_livetree_quid(rootNode) === undefined
        && rootBranch.isDisposed;
    },
    assert(_tree, t) {
      t.eq("non-root remove terminally disposes its subtree", nonRootTerminal, true);
      t.eq("ordinary owned root remove terminally disposes", ownedRootTerminal, true);
    },
  };
}

export function livetree_lifecycle_foundations(): TestSuite {
  const suite = "livetree/lifecycle-foundations";
  const cases: readonly LiveTreeCaseSpec[] = [
    traversal_case(suite),
    mapped_quid_case(suite),
    runtime_terminal_case(suite),
    bounded_reentrant_case(suite),
    detach_state_case(suite),
    disposed_error_case(suite),
    empty_regression_case(suite),
    remove_regression_case(suite),
  ];
  return make_livetree_suite(suite, cases);
}
