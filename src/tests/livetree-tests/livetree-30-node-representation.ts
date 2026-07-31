import { hson } from "hson-live";
import {
  _assert_invariants,
  _collect_subtree_nodes,
  _CREATE_NODE,
  _destroy_subtree_quids,
  _dispose_node_deep,
  _ensure_livetree_quid,
  _get_livetree_node_by_quid,
  _get_livetree_quid,
  _is_livetree_node_disposed,
} from "hson-live/diagnostics";
import type { LiveTreeCaseSpec } from "../../app/demos/test/livemap-tests.types";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { make_livetree_suite } from "./make-livetree-suite";
import type { HsonNode } from "hson-live/types";

function containers_are_canonical(nodes: readonly ReturnType<typeof _CREATE_NODE>[]): boolean {
  return nodes.every((node) =>
    (!Object.hasOwn(node, "$_attrs") || Object.keys(node.$_attrs ?? {}).length > 0)
    && (!Object.hasOwn(node, "$_meta") || Object.keys(node.$_meta ?? {}).length > 0));
}

function fresh_shape_case(suite: string): LiveTreeCaseSpec {
  let canonical = false;
  return {
    suite,
    name: "fresh nodes omit empty optional containers",
    html: `<main></main>`,
    act() {
      const fresh = _CREATE_NODE({ $_tag: "div" });
      const explicitEmpty = _CREATE_NODE({ $_tag: "span", $_attrs: {}, $_meta: {} });
      canonical = Object.keys(fresh).join(",") === "$_tag,$_content"
        && Object.keys(explicitEmpty).join(",") === "$_tag,$_content";
    },
    assert(_tree, t) {
      t.eq("factory shape contains only required fields", canonical, true);
    },
  };
}

function attrs_case(suite: string): LiveTreeCaseSpec {
  let lazy = false;
  return {
    suite,
    name: "attribute writes materialize and final deletion compacts storage",
    html: `<main></main>`,
    act() {
      const node = _CREATE_NODE({ $_tag: "div" });
      const branch = hson.liveTree.fromNode(node);
      const absent = !Object.hasOwn(node, "$_attrs");
      branch.attrs.set("data-state", "ready");
      const present = node.$_attrs?.["data-state"] === "ready";
      branch.attrs.drop("data-state");
      lazy = absent && present && !Object.hasOwn(node, "$_attrs");
      branch.remove();
    },
    assert(_tree, t) {
      t.eq("attrs exist only while populated", lazy, true);
    },
  };
}

function style_compaction_case(suite: string): LiveTreeCaseSpec {
  let compact = false;
  return {
    suite,
    name: "final inline style deletion removes the attribute container",
    html: `<main></main>`,
    act() {
      const node = _CREATE_NODE({ $_tag: "div" });
      const branch = hson.liveTree.fromNode(node);
      branch.style.set.color("red");
      const present = node.$_attrs?.style !== undefined;
      branch.style.set.color("");
      compact = present && !Object.hasOwn(node, "$_attrs");
      branch.remove();
    },
    assert(_tree, t) {
      t.eq("empty style and attrs containers are pruned", compact, true);
    },
  };
}

function persisted_quid_case(suite: string): LiveTreeCaseSpec {
  let exact = false;
  return {
    suite,
    name: "persisted QUID metadata materializes and scrubs completely",
    html: `<main></main>`,
    act() {
      const node = _CREATE_NODE({ $_tag: "div" });
      const quid = _ensure_livetree_quid(node);
      const materialized = node.$_meta?.quid === quid;
      _destroy_subtree_quids(node);
      exact = materialized
        && !Object.hasOwn(node, "$_meta")
        && _get_livetree_node_by_quid(quid) === undefined;
    },
    assert(_tree, t) {
      t.eq("QUID metadata follows compact storage", exact, true);
    },
  };
}

function nonpersisted_quid_case(suite: string): LiveTreeCaseSpec {
  let exact = false;
  return {
    suite,
    name: "non-persisted QUID identity never creates metadata",
    html: `<main></main>`,
    act() {
      const node = _CREATE_NODE({ $_tag: "div" });
      const quid = _ensure_livetree_quid(node, { persist: false });
      exact = _get_livetree_quid(node) === quid && !Object.hasOwn(node, "$_meta");
      _destroy_subtree_quids(node);
    },
    assert(_tree, t) {
      t.eq("WeakMap-only identity leaves storage compact", exact, true);
    },
  };
}

function terminal_disposal_case(suite: string): LiveTreeCaseSpec {
  let terminal = false;
  return {
    suite,
    name: "terminal disposal removes final identity metadata",
    html: `<main></main>`,
    act() {
      const child = _CREATE_NODE({ $_tag: "span" });
      const root = _CREATE_NODE({ $_tag: "div", $_content: [child] });
      _ensure_livetree_quid(root);
      _ensure_livetree_quid(child);
      _dispose_node_deep(root);
      terminal = !Object.hasOwn(root, "$_meta")
        && !Object.hasOwn(child, "$_meta")
        && _is_livetree_node_disposed(root)
        && _is_livetree_node_disposed(child);
    },
    assert(_tree, t) {
      t.eq("terminal lifecycle scrubs compact metadata for the subtree", terminal, true);
    },
  };
}

function serialization_case(suite: string): LiveTreeCaseSpec {
  let stable = false;
  return {
    suite,
    name: "serializers and round trips omit absent containers",
    html: `<main></main>`,
    act() {
      const input = { alpha: "x", nested: { value: 2 } };
      const parsed = hson.fromJson(input).toNode();
      const hsonText = hson.fromNode(parsed).toHson().serialize();
      const jsonText = hson.fromNode(parsed).toJson().serialize();
      const htmlText = hson.fromNode(parsed).toHtml().serialize();
      const roundTrip = hson.fromHson(hsonText).toJson().value();
      stable = !hsonText.includes("$_attrs")
        && !hsonText.includes("$_meta")
        && !jsonText.includes("$_attrs")
        && !jsonText.includes("$_meta")
        && !htmlText.includes("hson:")
        && JSON.stringify(roundTrip) === JSON.stringify(input);
    },
    assert(_tree, t) {
      t.eq("wire formats preserve behavior without placeholders", stable, true);
    },
  };
}

function invariants_case(suite: string): LiveTreeCaseSpec {
  let accepted = false;
  let rejected = false;
  return {
    suite,
    name: "invariants accept absence and reject malformed optional containers",
    html: `<main></main>`,
    act() {
      _assert_invariants(_CREATE_NODE({ $_tag: "div" }), "compact absence");
      const explicitEmpty = { $_tag: "div", $_content: [], $_attrs: {}, $_meta: {} };
      _assert_invariants(explicitEmpty, "explicit empty equivalence");
      accepted = true;

      class NodeInstance {
        public $_tag = "div";
        public $_content = [];
      }
      const malformed = [
        new NodeInstance(),
        Object.assign(_CREATE_NODE({ $_tag: "div" }), { $_attrs: [] }),
        Object.assign(_CREATE_NODE({ $_tag: "div" }), { $_meta: null }),
        _CREATE_NODE({ $_tag: "div", $_meta: { illegal: "x" } } as unknown as HsonNode),
        _CREATE_NODE({ $_tag: "div", $_meta: { "data-_quid": "0000000000000001" } } as unknown as HsonNode),
        _CREATE_NODE({ $_tag: "_hson_ii", $_meta: { "data-_index": "0" } } as unknown as HsonNode),
        _CREATE_NODE({ $_tag: "_hson_elem", $_attrs: { id: "bad" } }),
        Object.assign(_CREATE_NODE({ $_tag: "div" }), { $_meta: { "data-_bad": 1 } }),
      ];
      rejected = malformed.every((node) => {
        try {
          _assert_invariants(node, "malformed representation");
          return false;
        } catch {
          return true;
        }
      });
    },
    assert(_tree, t) {
      t.eq("absent and explicit-empty containers are equivalent", accepted, true);
      t.eq("arrays, null, classes, illegal keys and malformed values are rejected", rejected, true);
    },
  };
}

function clone_case(suite: string): LiveTreeCaseSpec {
  let attrsCanonical = false;
  let metaCanonical = false;
  return {
    suite,
    name: "branch cloning preserves only populated optional containers",
    html: `<main></main>`,
    act() {
      const sourceNode = _CREATE_NODE({ $_tag: "div" });
      Object.defineProperty(sourceNode, "$_attrs", { configurable: true, enumerable: true, value: {}, writable: true });
      const source = hson.liveTree.fromNode(sourceNode);
      const clone = source.cloneBranch();
      attrsCanonical = !Object.hasOwn(clone.node, "$_attrs");
      metaCanonical = Object.keys(clone.node.$_meta ?? {}).join(",") === "quid";
      source.remove();
      clone.remove();
    },
    assert(_tree, t) {
      t.eq("clone canonicalizes an empty attrs bag", attrsCanonical, true);
      t.eq("clone retains only populated identity metadata", metaCanonical, true);
    },
  };
}

function parser_paths_case(suite: string): LiveTreeCaseSpec {
  let canonical = false;
  let boundaries = false;
  return {
    suite,
    name: "JSON HTML and SVG parser paths produce canonical storage",
    dom: true,
    html: `<main></main>`,
    act() {
      const jsonNode = hson.fromJson({ plain: "x", items: [1, 2] }).toNode();
      const htmlNode = hson.fromTrustedHtml(
        `<section hson:quid="0000000000000001" data-_quid="user-quid" data-_index="user-index">x</section>`,
      ).toNode();
      const arrayNode = hson.fromTrustedHtml(
        `<_hson_arr><_hson_ii hson:index="0"><_hson_obj/></_hson_ii></_hson_arr>`,
      ).toNode();
      const svgNode = hson.fromTrustedHtml(
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:hson="urn:hson-live" hson:quid="0000000000000002"><g></g></svg>`,
      ).toNode();
      const nodes = [jsonNode, htmlNode, arrayNode, svgNode]
        .flatMap((node) => _collect_subtree_nodes(node, "pre"));
      canonical = containers_are_canonical(nodes);
      const section = nodes.find((node) => node.$_tag === "section");
      const indexedItem = nodes.find((node) => node.$_tag === "_hson_ii");
      const svg = nodes.find((node) => node.$_tag === "svg");
      const serializedHtml = hson.fromNode(htmlNode).toHtml().serialize();
      const serializedSvg = hson.fromNode(svgNode).toHtml().serialize();
      let unknownMetadataRejected = false;
      try {
        hson.fromTrustedHtml(`<div hson:unknown="x">x</div>`).toNode();
      } catch {
        unknownMetadataRejected = true;
      }
      boundaries = section?.$_meta?.quid === "0000000000000001"
        && section.$_attrs?.["data-_quid"] === "user-quid"
        && section.$_attrs?.["data-_index"] === "user-index"
        && indexedItem?.$_meta?.index === "0"
        && svg?.$_meta?.quid === "0000000000000002"
        && serializedHtml.includes(`data-_index="user-index"`)
        && serializedHtml.includes(`data-_quid="user-quid"`)
        && serializedHtml.includes(`hson:quid="0000000000000001"`)
        && serializedSvg.includes(`hson:quid="0000000000000002"`)
        && unknownMetadataRejected;
    },
    assert(_tree, t) {
      t.eq("direct transform constructors omit empty attrs and meta", canonical, true);
      t.eq("graph metadata, markup metadata, and ordinary data attributes remain distinct", boundaries, true);
    },
  };
}

export function hson_node_representation(): TestSuite {
  const suite = "livetree/node-representation";
  return make_livetree_suite(suite, [
    fresh_shape_case(suite),
    attrs_case(suite),
    style_compaction_case(suite),
    persisted_quid_case(suite),
    nonpersisted_quid_case(suite),
    terminal_disposal_case(suite),
    serialization_case(suite),
    invariants_case(suite),
    clone_case(suite),
    parser_paths_case(suite),
  ]);
}
