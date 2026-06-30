// suites-node.ts

import type { HsonNode, JsonValue, LiveMapNodeAttrValue } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { ELEM_TAG, hson, make_livemap_core, OBJ_TAG } from "hson-live";
import  { preview_value, equal_row } from "./test-helpers";
import  { json_root_node } from "./make-livemap-suite";



const SUITE = "LiveMap node";

type ExpectedFailTestCase = TestCase & Readonly<{
  expected: "fail";
  expectedError?: Readonly<{
    message?: string;
    includes?: string;
  }>;
}>;

function expected_fail_case(testCase: TestCase, expectedMessage: string): ExpectedFailTestCase {
  return {
    ...testCase,
    expected: "fail",
    expectedError: { message: expectedMessage },
  };
}

export function livemap_suites_node(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      make_node_live_after_delete_case({
        suite: SUITE,
        name: "node handle reflects deleted path",
        input: { user: { name: "Ada", role: "user" } },
        path: ["user", "name"],
        deletePath: ["user", "name"],
        expectedInitialTag: "name",
        expectedAfterDelete: undefined,
      }),
      make_node_live_after_set_case({
        suite: SUITE,
        name: "node handle resolves after missing path is created",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        setPath: ["user", "role"],
        value: "admin",
        expectedInitial: undefined,
        expectedAfterSetTag: "role",
      }),
      make_node_parent_content_case({
        suite: SUITE,
        name: "node handle parent content reflects child set",
        input: { user: { name: "Ada" } },
        path: ["user"],
        setPath: ["user", "role"],
        value: "admin",
        expectedInitialContentLength: 1,
        expectedAfterSetContentLength: 2,
      }),
      make_node_attrs_copy_case({
        suite: SUITE,
        name: "node attrs returns defensive copy",
        html: "<button>Press</button>",
        path: ["button"],
        setName: "class",
        setValue: "active",
        mutateName: "class",
        mutateValue: "mutated",
        expectedAttr: "active",
        expectedAttrs: { class: "active" },
      }),
      make_node_set_attr_case({
        suite: SUITE,
        name: "node setAttr writes one attr and chains",
        html: "<button>Press</button>",
        path: ["button"],
        nameToSet: "class",
        valueToSet: "active",
        expectedAttr: "active",
        expectedAttrs: { class: "active" },
      }),
      make_node_set_attrs_case({
        suite: SUITE,
        name: "node setAttrs writes many attrs and preserves existing attrs",
        html: "<button>Press</button>",
        path: ["button"],
        firstName: "class",
        firstValue: "active",
        attrsToSet: { title: "Profile", hidden: true },
        expectedAttrs: { class: "active", title: "Profile", hidden: true },
      }),
      make_node_remove_attr_case({
        suite: SUITE,
        name: "node removeAttr removes one attr and chains",
        html: "<button>Press</button>",
        path: ["button"],
        attrsToSet: { class: "active", title: "Profile" },
        nameToRemove: "class",
        expectedRemovedAttr: undefined,
        expectedAttrs: { title: "Profile" },
      }),
      make_node_clear_attrs_case({
        suite: SUITE,
        name: "node clearAttrs removes all attrs and chains",
        html: "<button>Press</button>",
        path: ["button"],
        attrsToSet: { class: "active", title: "Profile" },
        expectedAttrs: {},
      }),
      make_node_existing_attrs_case({
        suite: SUITE,
        name: "node attrs reads parser-provided HTML attrs",
        html: `<button class="active" disabled>Press</button>`,
        path: ["button"],
        expectedClass: "active",
        expectedDisabled: "disabled",
        expectedAttrs: { class: "active", disabled: "disabled" },
      }),
      make_node_attr_missing_path_throw_case({
        suite: SUITE,
        name: "node attr mutation on missing path throws",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        expectedMessage: "LiveMap node path does not resolve: [\"user\", \"role\"]",
      }),
      make_node_attr_json_backed_throw_case({
        suite: SUITE,
        name: "node attr mutation on JSON-backed path throws",
        input: { user: { name: "Ada" } },
        path: ["user"],
        expectedMessage: "LiveMap node attrs can only be edited on _hson_elem-backed nodes: [\"user\"]",
      }),
      make_node_json_html_tag_name_case({
        suite: SUITE,
        name: "node JSON key matching HTML tag remains JSON-backed",
        input: { button: { label: "Press" } },
        path: ["button"],
        expectedTag: "button",
        expectedContentLength: 1,
        expectedMessage: "LiveMap node attrs can only be edited on _hson_elem-backed nodes: [\"button\"]",
      }),
      make_node_children_case({
        suite: SUITE,
        name: "node children reads direct HSON child nodes",
        input: { user: { name: "Ada", role: "admin" } },
        path: ["user"],
        expectedChildTags: [OBJ_TAG],
        expectedMissingPathChildren: [],
      }),
      make_node_child_lookup_case({
        suite: SUITE,
        name: "node child lookup reads direct child by tag",
        input: { user: { name: "Ada", role: "admin" } },
        path: ["user"],
        tag: OBJ_TAG,
        missingTag: ELEM_TAG,
        expectedChildTag: OBJ_TAG,
        expectedChildrenByTagCount: 1,
        expectedMissingChildrenByTag: [],
        expectedMissingChild: undefined,
      }),
      make_node_must_child_throw_case({
        suite: SUITE,
        name: "node mustChild throws with path and tag context",
        input: { user: { name: "Ada" } },
        path: ["user"],
        missingTag: ELEM_TAG,
        expectedMessage: `LiveMap node child does not resolve: ["user"]."${ELEM_TAG}"`,
      }),
      make_node_append_case({
        suite: SUITE,
        name: "node append adds direct child and chains",
        input: { user: { name: "Ada" } },
        path: ["user"],
        childTag: "note",
        expectedChildTags: [OBJ_TAG, "note"],
        expectedAppendedTag: "note",
      }),
      make_node_append_missing_path_throw_case({
        suite: SUITE,
        name: "node append on missing path throws",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        childTag: "note",
        expectedMessage: "LiveMap node path does not resolve: [\"user\", \"role\"]",
      }),
      make_node_append_html_case({
        suite: SUITE,
        name: "node append works on HTML-backed node",
        html: "<button>Press</button>",
        path: ["button"],
        childTag: "icon",
        expectedChildTags: [ELEM_TAG, "icon"],
        expectedAppendedTag: "icon",
      }),
      make_node_remove_children_case({
        suite: SUITE,
        name: "node remove.children removes direct child nodes and chains",
        input: { user: { name: "Ada" } },
        path: ["user"],
        appendedTag: "note",
        primitiveContent: "loose text",
        expectedBeforeChildTags: [OBJ_TAG, "note"],
        expectedAfterChildTags: [],
        expectedAfterContent: ["loose text"],
      }),
      make_node_remove_child_case({
        suite: SUITE,
        name: "node remove.child removes by child-node index and chains",
        input: { user: { name: "Ada" } },
        path: ["user"],
        firstAppendedTag: "note",
        secondAppendedTag: "icon",
        primitiveContent: "loose text",
        indexToRemove: 1,
        expectedBeforeChildTags: [OBJ_TAG, "note", "icon"],
        expectedAfterChildTags: [OBJ_TAG, "icon"],
        expectedContentTagsAndValues: [OBJ_TAG, "loose text", "icon"],
      }),
      make_node_remove_child_bad_index_throw_case({
        suite: SUITE,
        name: "node remove.child bad index throws",
        input: { user: { name: "Ada" } },
        path: ["user"],
        badIndex: 4,
        expectedMessage: "LiveMap node child index does not resolve: [\"user\"][4]",
      }),
      make_node_remove_missing_path_throw_case({
        suite: SUITE,
        name: "node remove on missing path throws",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        expectedMessage: "LiveMap node path does not resolve: [\"user\", \"role\"]",
      }),
    ] as const,
  };
}

type NodeLiveAfterDeleteCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  deletePath: (string | number)[];
  expectedInitialTag: string;
  expectedAfterDelete: undefined;
}>;

type NodeLiveAfterSetCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  setPath: (string | number)[];
  value: JsonValue;
  expectedInitial: undefined;
  expectedAfterSetTag: string;
}>;

type NodeParentContentCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  setPath: (string | number)[];
  value: JsonValue;
  expectedInitialContentLength: number;
  expectedAfterSetContentLength: number;
}>;

type NodeAttrsCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  setName: string;
  setValue: LiveMapNodeAttrValue;
  mutateName: string;
  mutateValue: LiveMapNodeAttrValue;
  expectedAttr: LiveMapNodeAttrValue;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

type NodeSetAttrCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  nameToSet: string;
  valueToSet: LiveMapNodeAttrValue;
  expectedAttr: LiveMapNodeAttrValue;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

type NodeSetAttrsCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  firstName: string;
  firstValue: LiveMapNodeAttrValue;
  attrsToSet: Readonly<Record<string, LiveMapNodeAttrValue>>;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

type NodeRemoveAttrCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  attrsToSet: Readonly<Record<string, LiveMapNodeAttrValue>>;
  nameToRemove: string;
  expectedRemovedAttr: undefined;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

type NodeClearAttrsCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  attrsToSet: Readonly<Record<string, LiveMapNodeAttrValue>>;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

type NodeExistingAttrsCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  expectedClass: LiveMapNodeAttrValue;
  expectedDisabled: LiveMapNodeAttrValue;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

type NodeAttrMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
}>;

type NodeAttrJsonBackedThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
}>;

type NodeJsonHtmlTagNameCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedTag: string;
  expectedContentLength: number;
  expectedMessage: string;
}>;

type NodeChildrenCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedChildTags: readonly string[];
  expectedMissingPathChildren: readonly string[];
}>;

type NodeChildLookupCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  tag: string;
  missingTag: string;
  expectedChildTag: string;
  expectedChildrenByTagCount: number;
  expectedMissingChildrenByTag: readonly string[];
  expectedMissingChild: undefined;
}>;

type NodeMustChildThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  missingTag: string;
  expectedMessage: string;
}>;

type NodeAppendCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  childTag: string;
  expectedChildTags: readonly string[];
  expectedAppendedTag: string;
}>;

type NodeAppendMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  childTag: string;
  expectedMessage: string;
}>;


type NodeAppendHtmlCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  childTag: string;
  expectedChildTags: readonly string[];
  expectedAppendedTag: string;
}>;

type NodeRemoveChildrenCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  appendedTag: string;
  primitiveContent: string;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
  expectedAfterContent: readonly string[];
}>;

type NodeRemoveChildCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  firstAppendedTag: string;
  secondAppendedTag: string;
  primitiveContent: string;
  indexToRemove: number;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
  expectedContentTagsAndValues: readonly string[];
}>;

type NodeRemoveChildBadIndexThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  badIndex: number;
  expectedMessage: string;
}>;

type NodeRemoveMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
}>;

function make_node_live_after_delete_case(spec: NodeLiveAfterDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      const initialTag = handle.tag();

      map.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: initial tag`, initialTag, spec.expectedInitialTag),
          equal_row(`${spec.name}: after delete get`, handle.get(), spec.expectedAfterDelete),
          equal_row(`${spec.name}: after delete tag`, handle.tag(), spec.expectedAfterDelete),
        ],
      };
    },
  };
}

function make_node_live_after_set_case(spec: NodeLiveAfterSetCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      const initial = handle.get();

      map.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: initial get`, initial, spec.expectedInitial),
          equal_row(`${spec.name}: after set tag`, handle.tag(), spec.expectedAfterSetTag),
        ],
      };
    },
  };
}

function make_node_parent_content_case(spec: NodeParentContentCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      const initialContentLength = handle.content()?.length;

      map.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: initial content length`, initialContentLength, spec.expectedInitialContentLength),
          equal_row(`${spec.name}: after set content length`, handle.content()?.length, spec.expectedAfterSetContentLength),
        ],
      };
    },
  };
}

function make_node_attrs_copy_case(spec: NodeAttrsCopyCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: preview_value(spec.html),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(html_root_node(spec.html));
      const handle = map.node(spec.path);

      handle.setAttr(spec.setName, spec.setValue);
      const attrs = handle.attrs() as Record<string, LiveMapNodeAttrValue>;
      attrs[spec.mutateName] = spec.mutateValue;

      return {
        assertRows: [
          equal_row(`${spec.name}: attr`, handle.attr(spec.setName), spec.expectedAttr),
          equal_row(`${spec.name}: attrs`, handle.attrs(), spec.expectedAttrs),
        ],
      };
    },
  };
}

function make_node_set_attr_case(spec: NodeSetAttrCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: preview_value(spec.html),
      path: preview_value(spec.path),
      nameToSet: preview_value(spec.nameToSet),
      valueToSet: preview_value(spec.valueToSet),
    },
    run: () => {
      const map = make_livemap_core(html_root_node(spec.html));
      const handle = map.node(spec.path);
      const returned = handle.setAttr(spec.nameToSet, spec.valueToSet);

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: attr`, handle.attr(spec.nameToSet), spec.expectedAttr),
          equal_row(`${spec.name}: attrs`, handle.attrs(), spec.expectedAttrs),
        ],
      };
    },
  };
}

function make_node_set_attrs_case(spec: NodeSetAttrsCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: preview_value(spec.html),
      path: preview_value(spec.path),
      attrsToSet: preview_value(spec.attrsToSet),
    },
    run: () => {
      const map = make_livemap_core(html_root_node(spec.html));
      const handle = map.node(spec.path);

      handle.setAttr(spec.firstName, spec.firstValue);
      const returned = handle.setAttrs(spec.attrsToSet);

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: attrs`, handle.attrs(), spec.expectedAttrs),
        ],
      };
    },
  };
}

function make_node_remove_attr_case(spec: NodeRemoveAttrCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: preview_value(spec.html),
      path: preview_value(spec.path),
      attrsToSet: preview_value(spec.attrsToSet),
      nameToRemove: preview_value(spec.nameToRemove),
    },
    run: () => {
      const map = make_livemap_core(html_root_node(spec.html));
      const handle = map.node(spec.path);

      handle.setAttrs(spec.attrsToSet);
      const returned = handle.removeAttr(spec.nameToRemove);

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: removed attr`, handle.attr(spec.nameToRemove), spec.expectedRemovedAttr),
          equal_row(`${spec.name}: attrs`, handle.attrs(), spec.expectedAttrs),
        ],
      };
    },
  };
}

function make_node_clear_attrs_case(spec: NodeClearAttrsCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: preview_value(spec.html),
      path: preview_value(spec.path),
      attrsToSet: preview_value(spec.attrsToSet),
    },
    run: () => {
      const map = make_livemap_core(html_root_node(spec.html));
      const handle = map.node(spec.path);

      handle.setAttrs(spec.attrsToSet);
      const returned = handle.clearAttrs();

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: attrs`, handle.attrs(), spec.expectedAttrs),
        ],
      };
    },
  };
}

function make_node_existing_attrs_case(spec: NodeExistingAttrsCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: preview_value(spec.html),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(html_root_node(spec.html));
      const handle = map.node(spec.path);

      return {
        assertRows: [
          equal_row(`${spec.name}: class`, handle.attr("class"), spec.expectedClass),
          equal_row(`${spec.name}: disabled`, handle.attr("disabled"), spec.expectedDisabled),
          equal_row(`${spec.name}: attrs`, handle.attrs(), spec.expectedAttrs),
        ],
      };
    },
  };
}

function make_node_attr_missing_path_throw_case(spec: NodeAttrMissingPathThrowCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      let setAttrMessage = "";
      let setAttrsMessage = "";
      let removeAttrMessage = "";
      let clearAttrsMessage = "";

      try {
        handle.setAttr("class", "active");
      } catch (error) {
        setAttrMessage = error instanceof Error ? error.message : String(error);
      }

      try {
        handle.setAttrs({ class: "active" });
      } catch (error) {
        setAttrsMessage = error instanceof Error ? error.message : String(error);
      }

      try {
        handle.removeAttr("class");
      } catch (error) {
        removeAttrMessage = error instanceof Error ? error.message : String(error);
      }

      try {
        handle.clearAttrs();
      } catch (error) {
        clearAttrsMessage = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: setAttr error`, setAttrMessage, spec.expectedMessage),
          equal_row(`${spec.name}: setAttrs error`, setAttrsMessage, spec.expectedMessage),
          equal_row(`${spec.name}: removeAttr error`, removeAttrMessage, spec.expectedMessage),
          equal_row(`${spec.name}: clearAttrs error`, clearAttrsMessage, spec.expectedMessage),
        ],
      };
    },
  };
}

function make_node_attr_json_backed_throw_case(spec: NodeAttrJsonBackedThrowCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      let setAttrMessage = "";
      let setAttrsMessage = "";
      let removeAttrMessage = "";
      let clearAttrsMessage = "";

      try {
        handle.setAttr("class", "active");
      } catch (error) {
        setAttrMessage = error instanceof Error ? error.message : String(error);
      }

      try {
        handle.setAttrs({ class: "active" });
      } catch (error) {
        setAttrsMessage = error instanceof Error ? error.message : String(error);
      }

      try {
        handle.removeAttr("class");
      } catch (error) {
        removeAttrMessage = error instanceof Error ? error.message : String(error);
      }

      try {
        handle.clearAttrs();
      } catch (error) {
        clearAttrsMessage = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: setAttr error`, setAttrMessage, spec.expectedMessage),
          equal_row(`${spec.name}: setAttrs error`, setAttrsMessage, spec.expectedMessage),
          equal_row(`${spec.name}: removeAttr error`, removeAttrMessage, spec.expectedMessage),
          equal_row(`${spec.name}: clearAttrs error`, clearAttrsMessage, spec.expectedMessage),
        ],
      };
    },
  };
}

function make_node_json_html_tag_name_case(spec: NodeJsonHtmlTagNameCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      let message = "";

      try {
        handle.setAttr("class", "active");
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        assertRows: [
          equal_row(`${spec.name}: tag`, handle.tag(), spec.expectedTag),
          equal_row(`${spec.name}: content length`, handle.content()?.length, spec.expectedContentLength),
          equal_row(`${spec.name}: attrs error`, message, spec.expectedMessage),
        ],
      };
    },
  };
}

function make_node_children_case(spec: NodeChildrenCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      const missingHandle = map.node(["missing"]);

      return {
        assertRows: [
          equal_row(`${spec.name}: child tags`, handle.children().map((child) => child.$_tag), spec.expectedChildTags),
          equal_row(`${spec.name}: missing path children`, missingHandle.children().map((child) => child.$_tag), spec.expectedMissingPathChildren),
        ],
      };
    },
  };
}

function make_node_child_lookup_case(spec: NodeChildLookupCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      tag: preview_value(spec.tag),
      missingTag: preview_value(spec.missingTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);

      return {
        assertRows: [
          equal_row(`${spec.name}: child`, handle.child(spec.tag)?.$_tag, spec.expectedChildTag),
          equal_row(`${spec.name}: mustChild`, handle.mustChild(spec.tag).$_tag, spec.expectedChildTag),
          equal_row(`${spec.name}: childrenByTag count`, handle.childrenByTag(spec.tag).length, spec.expectedChildrenByTagCount),
          equal_row(`${spec.name}: missing childrenByTag`, handle.childrenByTag(spec.missingTag).map((child) => child.$_tag), spec.expectedMissingChildrenByTag),
          equal_row(`${spec.name}: missing child`, handle.child(spec.missingTag), spec.expectedMissingChild),
        ],
      };
    },
  };
}

function make_node_must_child_throw_case(spec: NodeMustChildThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      missingTag: preview_value(spec.missingTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.mustChild(spec.missingTag);
    },
  }, spec.expectedMessage);
}

function make_node_append_case(spec: NodeAppendCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      childTag: preview_value(spec.childTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      const child = make_test_node(spec.childTag);
      const returned = handle.append(child);

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: child tags`, handle.children().map((node) => node.$_tag), spec.expectedChildTags),
          equal_row(`${spec.name}: child lookup`, handle.child(spec.childTag)?.$_tag, spec.expectedAppendedTag),
          equal_row(`${spec.name}: mustChild lookup`, handle.mustChild(spec.childTag).$_tag, spec.expectedAppendedTag),
        ],
      };
    },
  };
}

function make_node_append_missing_path_throw_case(spec: NodeAppendMissingPathThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      childTag: preview_value(spec.childTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.append(make_test_node(spec.childTag));
    },
  }, spec.expectedMessage);
}


function make_node_append_html_case(spec: NodeAppendHtmlCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: preview_value(spec.html),
      path: preview_value(spec.path),
      childTag: preview_value(spec.childTag),
    },
    run: () => {
      const map = make_livemap_core(html_root_node(spec.html));
      const handle = map.node(spec.path);
      const child = make_test_node(spec.childTag);
      const returned = handle.append(child);

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: child tags`, handle.children().map((node) => node.$_tag), spec.expectedChildTags),
          equal_row(`${spec.name}: child lookup`, handle.child(spec.childTag)?.$_tag, spec.expectedAppendedTag),
        ],
      };
    },
  };
}

function make_node_remove_children_case(spec: NodeRemoveChildrenCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      appendedTag: preview_value(spec.appendedTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.must().$_content.push(spec.primitiveContent);
      handle.append(make_test_node(spec.appendedTag));
      const beforeChildTags = handle.children().map((node) => node.$_tag);
      const returned = handle.remove.children();

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: before child tags`, beforeChildTags, spec.expectedBeforeChildTags),
          equal_row(`${spec.name}: after child tags`, handle.children().map((node) => node.$_tag), spec.expectedAfterChildTags),
          equal_row(`${spec.name}: after content`, content_tags_and_values(handle.must()), spec.expectedAfterContent),
        ],
      };
    },
  };
}

function make_node_remove_child_case(spec: NodeRemoveChildCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      indexToRemove: preview_value(spec.indexToRemove),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.append(make_test_node(spec.firstAppendedTag));
      handle.must().$_content.splice(1, 0, spec.primitiveContent);
      handle.append(make_test_node(spec.secondAppendedTag));
      const beforeChildTags = handle.children().map((node) => node.$_tag);
      const returned = handle.remove.child(spec.indexToRemove);

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: before child tags`, beforeChildTags, spec.expectedBeforeChildTags),
          equal_row(`${spec.name}: after child tags`, handle.children().map((node) => node.$_tag), spec.expectedAfterChildTags),
          equal_row(`${spec.name}: content tags and values`, content_tags_and_values(handle.must()), spec.expectedContentTagsAndValues),
        ],
      };
    },
  };
}

function make_node_remove_child_bad_index_throw_case(spec: NodeRemoveChildBadIndexThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      badIndex: preview_value(spec.badIndex),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.remove.child(spec.badIndex);
    },
  }, spec.expectedMessage);
}

function make_node_remove_missing_path_throw_case(spec: NodeRemoveMissingPathThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.remove.children();
    },
  }, spec.expectedMessage);
}

function content_tags_and_values(node: HsonNode): readonly string[] {
  return node.$_content.map((child) => typeof child === "object" && child !== null && "$_tag" in child ? child.$_tag : String(child));
}

function make_test_node(tag: string): HsonNode {
  return {
    $_tag: tag,
    $_content: [],
    $_attrs: {},
    $_meta: {},
  };
}

function html_root_node(input: string) {
  return hson.fromTrustedHtml(input).toHson().parse();
}
