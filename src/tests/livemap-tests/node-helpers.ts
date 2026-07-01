import { make_livemap_core, hson } from "hson-live";
import type { LiveMapNodeAttrValue, HsonNode } from "hson-live/types";
import type { TestCase } from "../../app/demos/test/tests.types";
import { json_root_node } from "./all-livemap-suites";
import { preview_value, equal_row } from "./test-helpers";
import type { NodeLiveAfterDeleteCaseSpec, NodeLiveAfterSetCaseSpec, NodeParentContentCaseSpec, NodeAttrsCopyCaseSpec, NodeSetAttrCaseSpec, NodeSetAttrsCaseSpec, NodeRemoveAttrCaseSpec, NodeClearAttrsCaseSpec, NodeExistingAttrsCaseSpec, NodeAttrMissingPathThrowCaseSpec, NodeAttrJsonBackedThrowCaseSpec, NodeJsonHtmlTagNameCaseSpec, NodeChildrenCaseSpec, NodeChildLookupCaseSpec, NodeMustChildThrowCaseSpec, NodeAppendCaseSpec, NodeAppendMissingPathThrowCaseSpec, NodeAppendHtmlCaseSpec, NodeRemoveChildrenCaseSpec, NodeRemoveChildCaseSpec, NodeRemoveChildBadIndexThrowCaseSpec, NodeRemoveMissingPathThrowCaseSpec, NodeReplaceChildrenCaseSpec, NodeReplaceChildCaseSpec, NodeReplaceChildBadIndexThrowCaseSpec, NodeReplaceMissingPathThrowCaseSpec, NodeInsertChildCaseSpec, NodeInsertChildAppendCaseSpec, NodeInsertChildBadIndexThrowCaseSpec, NodeInsertMissingPathThrowCaseSpec, NodeMoveChildCaseSpec, NodeMoveChildBackwardCaseSpec, NodeMoveChildBadToIndexThrowCaseSpec, NodeMoveChildBadFromIndexThrowCaseSpec, NodeMoveMissingPathThrowCaseSpec } from "./node-types";
import  {expected_fail_case} from "./node-suites";

export function make_node_live_after_delete_case(spec: NodeLiveAfterDeleteCaseSpec): TestCase {
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
export function make_node_live_after_set_case(spec: NodeLiveAfterSetCaseSpec): TestCase {
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
export function make_node_parent_content_case(spec: NodeParentContentCaseSpec): TestCase {
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
export function make_node_attrs_copy_case(spec: NodeAttrsCopyCaseSpec): TestCase {
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
export function make_node_set_attr_case(spec: NodeSetAttrCaseSpec): TestCase {
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
export function make_node_set_attrs_case(spec: NodeSetAttrsCaseSpec): TestCase {
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
export function make_node_remove_attr_case(spec: NodeRemoveAttrCaseSpec): TestCase {
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
export function make_node_clear_attrs_case(spec: NodeClearAttrsCaseSpec): TestCase {
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
export function make_node_existing_attrs_case(spec: NodeExistingAttrsCaseSpec): TestCase {
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
export function make_node_attr_missing_path_throw_case(spec: NodeAttrMissingPathThrowCaseSpec): TestCase {
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
export function make_node_attr_json_backed_throw_case(spec: NodeAttrJsonBackedThrowCaseSpec): TestCase {
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
export function make_node_json_html_tag_name_case(spec: NodeJsonHtmlTagNameCaseSpec): TestCase {
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
export function make_node_children_case(spec: NodeChildrenCaseSpec): TestCase {
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
export function make_node_child_lookup_case(spec: NodeChildLookupCaseSpec): TestCase {
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
export function make_node_must_child_throw_case(spec: NodeMustChildThrowCaseSpec): TestCase {
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
export function make_node_append_case(spec: NodeAppendCaseSpec): TestCase {
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
export function make_node_append_missing_path_throw_case(spec: NodeAppendMissingPathThrowCaseSpec): TestCase {
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
export function make_node_append_html_case(spec: NodeAppendHtmlCaseSpec): TestCase {
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
export function make_node_remove_children_case(spec: NodeRemoveChildrenCaseSpec): TestCase {
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
export function make_node_remove_child_case(spec: NodeRemoveChildCaseSpec): TestCase {
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
export function make_node_remove_child_bad_index_throw_case(spec: NodeRemoveChildBadIndexThrowCaseSpec): TestCase {
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
export function make_node_remove_missing_path_throw_case(spec: NodeRemoveMissingPathThrowCaseSpec): TestCase {
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
export function make_node_replace_children_case(spec: NodeReplaceChildrenCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      replacementTags: preview_value(spec.replacementTags),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.must().$_content.push(spec.primitiveContent);
      handle.append(make_test_node(spec.appendedTag));
      const beforeChildTags = handle.children().map((node) => node.$_tag);
      const replacements = spec.replacementTags.map((tag) => make_test_node(tag));
      const returned = handle.replace.children(replacements);

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
export function make_node_replace_child_case(spec: NodeReplaceChildCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      indexToReplace: preview_value(spec.indexToReplace),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.append(make_test_node(spec.firstAppendedTag));
      handle.must().$_content.splice(1, 0, spec.primitiveContent);
      handle.append(make_test_node(spec.secondAppendedTag));
      const beforeChildTags = handle.children().map((node) => node.$_tag);
      const returned = handle.replace.child(spec.indexToReplace, make_test_node(spec.replacementTag));

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
export function make_node_replace_child_bad_index_throw_case(spec: NodeReplaceChildBadIndexThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      badIndex: preview_value(spec.badIndex),
      replacementTag: preview_value(spec.replacementTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.replace.child(spec.badIndex, make_test_node(spec.replacementTag));
    },
  }, spec.expectedMessage);
}
export function make_node_replace_missing_path_throw_case(spec: NodeReplaceMissingPathThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      replacementTag: preview_value(spec.replacementTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.replace.children([make_test_node(spec.replacementTag)]);
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
export function make_node_insert_child_case(spec: NodeInsertChildCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      indexToInsert: preview_value(spec.indexToInsert),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.append(make_test_node(spec.firstAppendedTag));
      handle.must().$_content.splice(1, 0, spec.primitiveContent);
      handle.append(make_test_node(spec.secondAppendedTag));
      const beforeChildTags = handle.children().map((node) => node.$_tag);
      const returned = handle.insert.child(spec.indexToInsert, make_test_node(spec.insertedTag));

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
export function make_node_insert_child_append_case(spec: NodeInsertChildAppendCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      indexToInsert: preview_value(spec.indexToInsert),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      const returned = handle.insert.child(spec.indexToInsert, make_test_node(spec.insertedTag));

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: child tags`, handle.children().map((node) => node.$_tag), spec.expectedChildTags),
        ],
      };
    },
  };
}
export function make_node_insert_child_bad_index_throw_case(spec: NodeInsertChildBadIndexThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      badIndex: preview_value(spec.badIndex),
      insertedTag: preview_value(spec.insertedTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.insert.child(spec.badIndex, make_test_node(spec.insertedTag));
    },
  }, spec.expectedMessage);
}
export function make_node_insert_missing_path_throw_case(spec: NodeInsertMissingPathThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      insertedTag: preview_value(spec.insertedTag),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.insert.child(0, make_test_node(spec.insertedTag));
    },
  }, spec.expectedMessage);
}
export function make_node_move_child_case(spec: NodeMoveChildCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      fromIndex: preview_value(spec.fromIndex),
      toIndex: preview_value(spec.toIndex),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.append(make_test_node(spec.firstAppendedTag));
      handle.must().$_content.splice(1, 0, spec.primitiveContent);
      handle.append(make_test_node(spec.secondAppendedTag));
      const beforeChildTags = handle.children().map((node) => node.$_tag);
      const returned = handle.move.child(spec.fromIndex, spec.toIndex);

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
export function make_node_move_child_backward_case(spec: NodeMoveChildBackwardCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      fromIndex: preview_value(spec.fromIndex),
      toIndex: preview_value(spec.toIndex),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.append(make_test_node(spec.firstAppendedTag));
      handle.append(make_test_node(spec.secondAppendedTag));
      const beforeChildTags = handle.children().map((node) => node.$_tag);
      const returned = handle.move.child(spec.fromIndex, spec.toIndex);

      return {
        assertRows: [
          equal_row(`${spec.name}: chains`, returned === handle, true),
          equal_row(`${spec.name}: before child tags`, beforeChildTags, spec.expectedBeforeChildTags),
          equal_row(`${spec.name}: after child tags`, handle.children().map((node) => node.$_tag), spec.expectedAfterChildTags),
        ],
      };
    },
  };
}
export function make_node_move_child_bad_to_index_throw_case(spec: NodeMoveChildBadToIndexThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      fromIndex: preview_value(spec.fromIndex),
      badToIndex: preview_value(spec.badToIndex),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.move.child(spec.fromIndex, spec.badToIndex);
    },
  }, spec.expectedMessage);
}
export function make_node_move_child_bad_from_index_throw_case(spec: NodeMoveChildBadFromIndexThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      badFromIndex: preview_value(spec.badFromIndex),
      toIndex: preview_value(spec.toIndex),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.move.child(spec.badFromIndex, spec.toIndex);
    },
  }, spec.expectedMessage);
}
export function make_node_move_missing_path_throw_case(spec: NodeMoveMissingPathThrowCaseSpec): TestCase {
  return expected_fail_case({
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      path: preview_value(spec.path),
      fromIndex: preview_value(spec.fromIndex),
      toIndex: preview_value(spec.toIndex),
    },
    run: () => {
      const map = make_livemap_core(json_root_node(spec.input));
      const handle = map.node(spec.path);
      handle.move.child(spec.fromIndex, spec.toIndex);
    },
  }, spec.expectedMessage);
}
