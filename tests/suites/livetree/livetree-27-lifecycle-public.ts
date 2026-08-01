import {
  CssManager,
  hsonLiveTree,
  LiveTree,
  LiveTreeAlreadyAttachedError,
  LiveTreeDisposedError,
  LiveTreeProtectedRootError,
} from "hson-live/livetree";
import {
  _collect_subtree_nodes,
  _CREATE_NODE,
  _ensure_livetree_quid,
  _get_livetree_node_by_quid,
  _has_livetree_element_for_node,
  _link_livetree_node_to_element,
  _unlink_livetree_node,
} from "hson-live/diagnostics";
import type { LiveTreeCaseSpec } from "../../app/demos/test/livemap-tests.types";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { make_livetree_suite } from "./make-livetree-suite";
import { hsonLiveMap } from "hson-live/livemap";

const HSON_QUID_ATTR = "hson:quid";

function empty_case(suite: string): LiveTreeCaseSpec {
  let callerPreserved = false;
  let descendantsDestroyed = false;
  let runtimePreserved = false;
  let callerReusable = false;
  let registryStable = false;
  let structuralWrappersUnquidded = false;

  return {
    suite,
    name: "empty terminally destroys contents and preserves its caller",
    dom: true,
    html: `<main><section id="owner" data-keep="yes"><button id="child"><span id="leaf">x</span></button></section></main>`,
    act(tree) {
      const owner = tree.find.must.byId("owner");
      const child = tree.find.must.byId("child");
      const ownerNode = owner.node;
      const ownerQuid = owner.quid;
      const ownerEl = owner.dom.must.el();
      owner.css.setMany({ color: "red" });
      let clicks = 0;
      owner.listen.onClick(() => { clicks += 1; });

      const descendants = _collect_subtree_nodes(ownerNode, "pre").slice(1);
      const eligibleDescendants = descendants.filter((node) => !node.$_tag.startsWith("_hson_"));
      const structuralWrappers = descendants.filter((node) => node.$_tag.startsWith("_hson_"));
      const descendantQuids = eligibleDescendants.map((node) => _ensure_livetree_quid(node));
      structuralWrappersUnquidded = structuralWrappers.every(
        (node) => node.$_meta?.quid === undefined,
      );
      const descendantElements = [
        child.dom.must.el(),
        tree.find.must.byId("leaf").dom.must.el(),
      ];

      owner.empty().empty();
      ownerEl.dispatchEvent(new MouseEvent("click"));

      callerPreserved = owner.quid === ownerQuid
        && owner.node === ownerNode
        && owner.attrs.get("data-keep") === "yes"
        && owner.dom.el() === ownerEl
        && !owner.isDisposed;
      runtimePreserved = clicks === 1 && CssManager.invoke().hasAnyRules(ownerQuid);
      descendantsDestroyed = descendants.every((node) => node.$_meta?.quid === undefined)
        && descendantQuids.every((quid) => _get_livetree_node_by_quid(quid) === undefined)
        && descendants.every((node) => !_has_livetree_element_for_node(node))
        && descendantElements.every((element) => !element.hasAttribute(HSON_QUID_ATTR));

      const created = owner.create.span();
      created.text.set("again");
      callerReusable = owner.dom.must.el().textContent === "again";
      const createdQuid = created.quid;
      owner.empty();
      registryStable = _get_livetree_node_by_quid(createdQuid) === undefined;
    },
    assert(_tree, t) {
      t.eq("caller graph identity attrs metadata and mapping survive", callerPreserved, true);
      t.eq("caller listeners and managed CSS survive", runtimePreserved, true);
      t.eq("all descendant identity mapping and DOM metadata are destroyed", descendantsDestroyed, true);
      t.eq("structural VSN wrappers remain unquidded", structuralWrappersUnquidded, true);
      t.eq("caller remains usable after empty", callerReusable, true);
      t.eq("create-empty does not retain the created identity", registryStable, true);
    },
  };
}

function detach_contents_case(suite: string): LiveTreeCaseSpec {
  let detachedState = false;
  let identityStable = false;
  let behaviorStable = false;
  let exactProjectionReused = false;
  let repeatedAttachRejected = false;

  return {
    suite,
    name: "detachContents retains ordered reusable content and physical runtime state",
    dom: true,
    html: `<main><section id="source"><button id="branch">initial</button></section><aside id="target"></aside></main>`,
    act(tree) {
      const source = tree.find.must.byId("source");
      const target = tree.find.must.byId("target");
      const branch = tree.find.must.byId("branch");
      const branchQuid = branch.quid;
      const branchEl = branch.dom.must.el();
      let clicks = 0;
      branch.listen.onClick(() => { clicks += 1; });
      branch.css.setMany({ color: "blue" });
      const map = hsonLiveMap.fromJson({ label: "initial" });
      const off = branch.bind.text(map, ["label"]);

      const detached = source.detachContents();
      detachedState = detached.length > 0
        && source.content.all().length === 0
        && !branchEl.isConnected
        && !branch.isDisposed;

      branch.attrs.set("data-detached", "yes");
      map.set(["label"], "updated while detached");
      detached.appendTo(target);
      branchEl.dispatchEvent(new MouseEvent("click"));

      identityStable = branch.quid === branchQuid
        && _get_livetree_node_by_quid(branchQuid) === branch.node
        && branch.node.$_meta?.quid === branchQuid
        && branchEl.getAttribute(HSON_QUID_ATTR) === branchQuid;
      exactProjectionReused = branch.dom.el() === branchEl && target.dom.must.el().contains(branchEl);
      behaviorStable = clicks === 1
        && branch.text.get() === "updated while detached"
        && branch.attrs.get("data-detached") === "yes"
        && CssManager.invoke().hasAnyRules(branchQuid);
      try {
        detached.appendTo(source);
      } catch (error: unknown) {
        repeatedAttachRejected = error instanceof LiveTreeAlreadyAttachedError;
      }
      off();
    },
    assert(_tree, t) {
      t.eq("source becomes empty and retained branch stays active", detachedState, true);
      t.eq("QUID registry and persisted identity remain stable", identityStable, true);
      t.eq("the exact mapped DOM projection is reinserted", exactProjectionReused, true);
      t.eq("listener CSS binding and detached mutation remain functional", behaviorStable, true);
      t.eq("a detached content group has one explicit owner", repeatedAttachRejected, true);
    },
  };
}

function detach_case(suite: string): LiveTreeCaseSpec {
  let detached = false;
  let reattached = false;
  let behaviorStable = false;
  let doubleInsertRejected = false;
  let duplicatePreflight = false;
  let repeatedNoop = false;

  return {
    suite,
    name: "detach preserves the same branch for explicit reattachment",
    dom: true,
    html: `<main><section id="left"><button id="branch">old</button></section><section id="right"></section><section id="other"></section></main>`,
    act(tree) {
      const branch = tree.find.must.byId("branch");
      const right = tree.find.must.byId("right");
      const other = tree.find.must.byId("other");
      const quid = branch.quid;
      const element = branch.dom.must.el();
      let clicks = 0;
      branch.listen.onClick(() => { clicks += 1; });
      branch.css.setMany({ opacity: "0.5" });

      detached = branch.detach() === 1
        && !element.isConnected
        && !branch.isDisposed
        && branch.quid === quid
        && branch.node.$_meta?.quid === quid
        && element.getAttribute(HSON_QUID_ATTR) === quid;
      branch.text.set("new").attrs.set("data-moved", "yes");
      right.append(branch);
      element.dispatchEvent(new MouseEvent("click"));
      reattached = branch.dom.el() === element
        && right.dom.must.el().contains(element)
        && branch.quid === quid;
      behaviorStable = clicks === 1
        && element.textContent === "new"
        && element.getAttribute("data-moved") === "yes"
        && CssManager.invoke().hasAnyRules(quid);

      try {
        other.append(branch);
      } catch (error: unknown) {
        doubleInsertRejected = error instanceof LiveTreeAlreadyAttachedError
          && other.content.all().length === 0;
      }

      const malformed = hsonLiveTree.fromTrustedHtml(`<article></article>`);
      const malformedNode = malformed.node;
      const malformedQuid = malformed.quid;
      (malformedNode.$_meta ??= {}).quid = tree.quid;
      try {
        other.append(malformed);
      } catch (error: unknown) {
        duplicatePreflight = error instanceof Error
          && error.message.includes("Duplicate QUID")
          && other.content.all().length === 0;
      } finally {
        (malformedNode.$_meta ??= {}).quid = malformedQuid;
        malformed.remove();
      }

      branch.detach();
      repeatedNoop = branch.detach() === 0;
      other.append(branch);
    },
    assert(_tree, t) {
      t.eq("first detach unlinks and unmounts without disposal", detached, true);
      t.eq("same identity and DOM projection reattach elsewhere", reattached, true);
      t.eq("listener CSS and detached mutation survive", behaviorStable, true);
      t.eq("attached branch cannot be inserted twice", doubleInsertRejected, true);
      t.eq("duplicate QUID failure occurs before graph insertion", duplicatePreflight, true);
      t.eq("repeated detach is an explicit no-op", repeatedNoop, true);
    },
  };
}

function remove_and_guards_case(suite: string): LiveTreeCaseSpec {
  let terminalState = false;
  let runtimeGone = false;
  let guards = 0;
  let repeatedSafe = false;

  return {
    suite,
    name: "remove terminally disposes all aliases and guards the public surface",
    dom: true,
    html: `<main><section id="target"><button id="child">x</button></section><aside id="host"></aside></main>`,
    act(tree) {
      const target = tree.find.must.byId("target");
      const child = tree.find.must.byId("child");
      const alias = new LiveTree(target);
      const host = tree.find.must.byId("host");
      const targetNode = target.node;
      const childNode = child.node;
      const targetQuid = target.quid;
      const childQuid = child.quid;
      const targetEl = target.dom.must.el();
      const cachedCss = target.css;
      const cachedAttr = target.attrs;
      const cachedDom = target.dom;
      const cachedEvents = target.events;
      const cachedContent = target.content;
      const cachedStyle = target.style;
      const cachedText = target.text;
      const cachedData = target.data;
      const cachedListen = target.listen;
      const cachedBind = target.bind;
      target.css.setMany({ color: "red" });
      target.listen.onClick(() => undefined);

      const removed = target.remove();
      repeatedSafe = target.remove() === 0 && target.removeSelf() === 0;
      terminalState = removed === 1
        && target.isDisposed
        && alias.isDisposed
        && child.isDisposed
        && _get_livetree_node_by_quid(targetQuid) === undefined
        && _get_livetree_node_by_quid(childQuid) === undefined
        && targetNode.$_meta?.quid === undefined
        && childNode.$_meta?.quid === undefined;
      runtimeGone = !targetEl.isConnected
        && !_has_livetree_element_for_node(targetNode)
        && !_has_livetree_element_for_node(childNode)
        && !CssManager.invoke().hasAnyRules(targetQuid);

      const operations: readonly (() => unknown)[] = [
        () => target.node,
        () => target.quid,
        () => target.content.all(),
        () => target.create.span(),
        () => target.empty(),
        () => target.detach(),
        () => target.detachContents(),
        () => target.find.byId("child"),
        () => target.findAll({ tag: "button" }),
        () => target.attrs.set("title", "x"),
        () => target.data.set("x", "y"),
        () => target.id.set("x"),
        () => target.classlist.add("x"),
        () => target.flags.has("hidden"),
        () => target.text.set("x"),
        () => target.form,
        () => target.style.setMany({ color: "red" }),
        () => target.css.setMany({ color: "red" }),
        () => target.events.emit("x"),
        () => target.listen.onClick(() => undefined),
        () => target.bind.text(hsonLiveMap.fromJson({ x: "y" }), ["x"]),
        () => target.svg.inScope(),
        () => target.canvas.inScope(),
        () => target.dom.el(),
        () => target.cloneBranch(),
        () => target.hostRootNode(),
        () => target.adoptRoots(tree.node),
        () => host.append(target),
        () => cachedCss.setMany({ color: "blue" }),
        () => cachedAttr.set("title", "cached"),
        () => cachedDom.el(),
        () => cachedEvents.emit("cached"),
        () => cachedContent.all(),
        () => cachedStyle.setMany({ color: "blue" }),
        () => cachedText.set("cached"),
        () => cachedData.set("cached", "yes"),
        () => cachedListen.onClick(() => undefined),
        () => cachedBind.text(hsonLiveMap.fromJson({ x: "y" }), ["x"]),
      ];
      for (const operation of operations) {
        try {
          operation();
        } catch (error: unknown) {
          if (error instanceof LiveTreeDisposedError && error.code === "LIVETREE_DISPOSED") guards += 1;
        }
      }
    },
    assert(_tree, t) {
      t.eq("root descendants aliases registry and metadata are terminal", terminalState, true);
      t.eq("DOM mappings listeners and CSS are removed", runtimeGone, true);
      t.eq("every meaningful and cached public surface is guarded", guards, 38);
      t.eq("repeated remove and deprecated alias are safe", repeatedSafe, true);
    },
  };
}

function roots_and_legacy_case(suite: string): LiveTreeCaseSpec {
  let ordinaryRoot = false;
  let protectedRoots = 0;
  let legacyAlias = false;
  let legacyChildren = false;

  return {
    suite,
    name: "owned roots are removable browser roots are protected and legacy APIs are explicit",
    dom: true,
    html: `<main><section id="legacy">before<span id="legacy-child">x</span>after</section><aside id="legacy-remove"></aside></main>`,
    act(tree) {
      const detachedRoot = hsonLiveTree.fromTrustedHtml(`<article></article>`);
      const detachedRootRemoved = detachedRoot.detach() === 0
        && detachedRoot.remove() === 1
        && detachedRoot.isDisposed;

      const ownedElement = document.createElement("section");
      ownedElement.id = `owned-lifecycle-${crypto.randomUUID()}`;
      document.body.appendChild(ownedElement);
      const ownedTree = hsonLiveTree.queryDom(`#${ownedElement.id}`).graft();
      const ownedDetached = ownedTree.detach() === 1
        && !ownedElement.isConnected
        && !ownedTree.isDisposed;
      document.body.appendChild(ownedElement);
      const ownedRemoved = ownedTree.remove() === 1
        && ownedTree.isDisposed
        && !ownedElement.isConnected;
      ordinaryRoot = detachedRootRemoved && ownedDetached && ownedRemoved;

      const freshDocument = document.implementation.createHTMLDocument("lifecycle roots");
      for (const element of [freshDocument.documentElement, freshDocument.head, freshDocument.body]) {
        const branch = new LiveTree(_CREATE_NODE({ $_tag: element.tagName.toLowerCase() }));
        _link_livetree_node_to_element(branch.node, element);
        try {
          branch.remove();
        } catch (error: unknown) {
          if (error instanceof LiveTreeProtectedRootError && error.code === "LIVETREE_PROTECTED_ROOT") {
            protectedRoots += 1;
          }
        } finally {
          _unlink_livetree_node(branch.node);
          branch.remove();
        }
      }

      const legacyRemove = tree.find.must.byId("legacy-remove");
      legacyAlias = legacyRemove.removeSelf() === 1 && legacyRemove.isDisposed;

      const legacy = tree.find.must.byId("legacy");
      const legacyChild = tree.find.must.byId("legacy-child");
      const legacyQuid = legacyChild.quid;
      legacyChildren = legacy.removeChildren() === 1
        && legacy.text.get().includes("before")
        && legacy.text.get().includes("after")
        && !legacyChild.isDisposed
        && _get_livetree_node_by_quid(legacyQuid) === legacyChild.node;
    },
    assert(_tree, t) {
      t.eq("ordinary owned root supports terminal removal", ordinaryRoot, true);
      t.eq("documentElement head and body throw the stable protected-root error", protectedRoots, 3);
      t.eq("removeSelf is a deprecated terminal alias", legacyAlias, true);
      t.eq("removeChildren retains its documented specialized legacy behavior", legacyChildren, true);
    },
  };
}

export function livetree_lifecycle_public(): TestSuite {
  const suite = "livetree/lifecycle-public";
  return make_livetree_suite(suite, [
    empty_case(suite),
    detach_contents_case(suite),
    detach_case(suite),
    remove_and_guards_case(suite),
    roots_and_legacy_case(suite),
  ]);
}
