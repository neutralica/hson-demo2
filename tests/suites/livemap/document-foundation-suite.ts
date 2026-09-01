import { hson } from "hson-live";
import type { HsonNode, Primitive } from "hson-live/types";
import type { TestSuite } from "../../harness/core/test-contracts";
import { equal_row } from "./assert-helpers";

const SUITE = "livemap/document-foundation";

function is_node(value: HsonNode | Primitive): value is HsonNode {
  return typeof value === "object" && value !== null && "$_tag" in value;
}

function find_node(root: HsonNode, tag: string): HsonNode | undefined {
  if (root.$_tag === tag) return root;
  for (const child of root.$_content) {
    if (!is_node(child)) continue;
    const found = find_node(child, tag);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function livemap_document_foundation_suite(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      {
        suite: SUITE,
        caseId: "flat-trusted-html-constructor-places-one-element-under-document-root", name: "flat trusted HTML constructor places one element under the document root",
        run: () => {
          const map = hson.liveMap.fromTrustedHtml("<button>Save</button>");
          const button = map.document.content()[0];
          return {
            assertRows: [
              equal_row("trusted document mode", map.mode, "document"),
              equal_row("trusted element tag", button !== undefined && is_node(button) ? button.$_tag : undefined, "button"),
              equal_row("trusted element remains unquidded", button !== undefined && is_node(button) ? button.$_meta?.quid : undefined, undefined),
              equal_row("trusted document begins at revision zero", map.rev, 0),
              equal_row("trusted document capture begins at revision zero", map.capture().rev, 0),
              equal_row("document facade omits projected set", "set" in map, false),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "flat-trusted-html-constructor-orders-repeated-elements-under-document-root", name: "flat trusted HTML constructor orders repeated elements under the document root",
        run: () => {
          const map = hson.liveMap.fromTrustedHtml("<div>One</div><div>Two</div>");
          const content = map.document.content();
          return {
            assertRows: [
              equal_row("trusted document mode", map.mode, "document"),
              equal_row("trusted document ordered tags", content.map((item) => is_node(item) ? item.$_tag : item), ["div", "div"]),
              equal_row("trusted repeated elements remain unquidded", content.map((item) => is_node(item) ? item.$_meta?.quid : undefined), [undefined, undefined]),
              equal_row("trusted document begins at revision zero", map.rev, 0),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "trusted-and-untrusted-constructors-retain-their-parser-boundary", name: "trusted and untrusted constructors retain their parser boundary",
        run: () => {
          const source = `<button data-safe="yes" onclick="alert(1)">Save</button>`;
          const trusted = hson.liveMap.fromTrustedHtml(source);
          const untrusted = hson.liveMap.fromUntrustedHtml(source);
          const trustedButton = find_node(trusted.root(), "button");
          const untrustedButton = find_node(untrusted.root(), "button");
          return {
            assertRows: [
              equal_row("trusted retains inline handler attr", trustedButton?.$_attrs?.onclick, "alert(1)"),
              equal_row("untrusted removes inline handler attr", untrustedButton?.$_attrs?.onclick, undefined),
              equal_row("untrusted retains safe attr", untrustedButton?.$_attrs?.["data-safe"], "yes"),
              equal_row("trusted construction begins at revision zero", trusted.rev, 0),
              equal_row("untrusted construction begins at revision zero", untrusted.rev, 0),
              equal_row("untrusted construction does not mint QUID", untrustedButton?.$_meta?.quid, undefined),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "mixed-top-level-html-remains-ordered-under-document-root", name: "mixed top-level HTML remains ordered under the document root",
        run: () => {
          const map = hson.liveMap.fromTrustedHtml("before <em>middle</em> after");
          const before = map.root();
          const content = map.document.content();
          const first = content[0];
          if (first !== undefined && is_node(first)) first.$_tag = "changed";
          return {
            assertRows: [
              equal_row("mixed HTML document mode", map.mode, "document"),
              equal_row("mixed HTML content tags", content.map((item) => is_node(item) ? item.$_tag : item), ["changed", "em", "_hson_str"]),
              equal_row("mixed read mutation detached", map.root(), before),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "trusted-empty-and-text-only-html-use-document-roots", name: "trusted empty and text-only HTML use document roots",
        run: () => {
          const empty = hson.liveMap.fromTrustedHtml("");
          const text = hson.liveMap.fromTrustedHtml("text only");
          const emptyContent = empty.document.content();
          const textContent = text.document.content();
          return {
            assertRows: [
              equal_row("empty HTML document mode", empty.mode, "document"),
              equal_row("empty HTML document content", emptyContent, []),
              equal_row("text-only HTML document mode", text.mode, "document"),
              equal_row("text-only HTML content tags", textContent.map((item) => is_node(item) ? item.$_tag : item), ["_hson_str"]),
            ],
          };
        },
      },
    ],
  };
}
