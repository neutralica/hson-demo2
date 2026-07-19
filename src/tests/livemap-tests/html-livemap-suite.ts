// html-livemap-suite.ts

// livemap-suites-html-proof.ts

import { hson } from "hson-live";
import type { JsonValue, LiveMap } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";

export function livemap_suite_html_proof(): TestSuite {
  const SUITE = "livemap/html-proof";

  return {
    suite: SUITE,
    cases: [
      make_html_snap_case({
        suite: SUITE,
        name: "html simple text element snap shape",
        html: "<button>Press</button>",
        expected: { button: "Press" },
      }),

      make_html_snap_case({
        suite: SUITE,
        name: "html element attrs are excluded from projected snap",
        html: `<button class="primary" disabled>Press</button>`,
        expected: { button: "Press" },
      }),

      make_html_snap_case({
        suite: SUITE,
        name: "html sibling elements project as object keys",
        html: `<section><h1>Hello</h1><p>World</p></section>`,
        expected: {
          section: {
            h1: "Hello",
            p: "World",
          },
        },
      }),

      make_html_snap_case({
        suite: SUITE,
        name: "html repeated sibling tags project as array-like repeated value",
        html: `<ul><li>One</li><li>Two</li></ul>`,
        expected: {
          ul: {
            li: ["One", "Two"],
          },
        },
      }),

      make_html_snap_case({
        suite: SUITE,
        name: "html nested text element projects nested value",
        html: `<article><header><h1>Title</h1></header></article>`,
        expected: {
          article: {
            header: {
              h1: "Title",
            },
          },
        },
      }),

      make_html_set_case({
        suite: SUITE,
        name: "html projected leaf set updates text projection",
        html: "<button>Press</button>",
        path: ["button"],
        value: "Save",
        expectedSnap: { button: "Save" },
        expectedCommitChanged: true,
      }),

      make_html_replace_case({
        suite: SUITE,
        name: "html projected leaf replace updates text projection",
        html: "<button>Press</button>",
        path: ["button"],
        value: "Save",
        expectedSnap: { button: "Save" },
        expectedCommitChanged: true,
      }),

      make_html_set_case({
        suite: SUITE,
        name: "html projected nested leaf set updates nested text projection",
        html: `<section><h1>Hello</h1><p>World</p></section>`,
        path: ["section", "h1"],
        value: "Changed",
        expectedSnap: {
          section: {
            h1: "Changed",
            p: "World",
          },
        },
        expectedCommitChanged: true,
      }),

      make_html_replace_case({
        suite: SUITE,
        name: "html projected object replace removes sibling projection",
        html: `<section><h1>Hello</h1><p>World</p></section>`,
        path: ["section"],
        value: { h1: "Changed" },
        expectedSnap: {
          section: {
            h1: "Changed",
          },
        },
        expectedCommitChanged: true,
      }),

      make_html_node_attr_case({
        suite: SUITE,
        name: "html node handle reads element attr outside projected snap",
        html: `<button class="primary">Press</button>`,
        path: ["button"],
        attrName: "class",
        expectedAttr: "primary",
        expectedSnap: { button: "Press" },
      }),

      make_html_node_set_attr_case({
        suite: SUITE,
        name: "html node attr mutation does not change projected snap",
        html: `<button class="primary">Press</button>`,
        path: ["button"],
        attrName: "class",
        attrValue: "secondary",
        expectedAttr: "secondary",
        expectedSnap: { button: "Press" },
      }),

      make_html_schema_case({
        suite: SUITE,
        name: "html projected snap accepts compatible schema",
        html: "<button>Press</button>",
        expectedSnap: { button: "Press" },
      }),
    ] as const,
  };
}

type HtmlSnapCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  expected: JsonValue;
}>;

type HtmlSetCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: readonly (string | number)[];
  value: JsonValue;
  expectedSnap: JsonValue;
  expectedCommitChanged: boolean;
}>;

type HtmlReplaceCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: readonly (string | number)[];
  value: JsonValue;
  expectedSnap: JsonValue;
  expectedCommitChanged: boolean;
}>;

type HtmlNodeAttrCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: readonly (string | number)[];
  attrName: string;
  expectedAttr: string | undefined;
  expectedSnap: JsonValue;
}>;

type HtmlNodeSetAttrCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: readonly (string | number)[];
  attrName: string;
  attrValue: string;
  expectedAttr: string | undefined;
  expectedSnap: JsonValue;
}>;

type HtmlSchemaCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  expectedSnap: JsonValue;
}>;

function html_map(html: string): LiveMap<JsonValue> {
  return hson.liveMap.fromNode(
    hson.fromTrustedHtml(html).toNode(),
  ) as LiveMap<JsonValue>;
}

function make_html_snap_case(spec: HtmlSnapCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: spec.html,
      expected: preview_value(spec.expected),
    },
    run: () => {
      const map = html_map(spec.html);

      return {
        assertRows: [
          equal_row(`${spec.name}: snap`, map.snap(), spec.expected),
        ],
      };
    },
  };
}

function make_html_set_case(spec: HtmlSetCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: spec.html,
      path: preview_value(spec.path),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = html_map(spec.html);
      const commit = map.set(spec.path, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedCommitChanged),
          equal_row(`${spec.name}: snap`, map.snap(), spec.expectedSnap),
        ],
      };
    },
  };
}

function make_html_replace_case(spec: HtmlReplaceCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: spec.html,
      path: preview_value(spec.path),
      value: preview_value(spec.value),
    },
    run: () => {
      const map = html_map(spec.html);
      const commit = map.replace(spec.path, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: changed`, commit.changed, spec.expectedCommitChanged),
          equal_row(`${spec.name}: snap`, map.snap(), spec.expectedSnap),
        ],
      };
    },
  };
}

function make_html_node_attr_case(spec: HtmlNodeAttrCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: spec.html,
      path: preview_value(spec.path),
      attrName: spec.attrName,
    },
    run: () => {
      const map = html_map(spec.html);
      const node = map.node(spec.path);

      return {
        assertRows: [
          equal_row(`${spec.name}: attr`, node.attr(spec.attrName), spec.expectedAttr),
          equal_row(`${spec.name}: snap`, map.snap(), spec.expectedSnap),
        ],
      };
    },
  };
}

function make_html_node_set_attr_case(spec: HtmlNodeSetAttrCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: spec.html,
      path: preview_value(spec.path),
      attrName: spec.attrName,
      attrValue: spec.attrValue,
    },
    run: () => {
      const map = html_map(spec.html);
      const node = map.node(spec.path);

      node.setAttr(spec.attrName, spec.attrValue);

      return {
        assertRows: [
          equal_row(`${spec.name}: attr`, node.attr(spec.attrName), spec.expectedAttr),
          equal_row(`${spec.name}: snap`, map.snap(), spec.expectedSnap),
        ],
      };
    },
  };
}

function make_html_schema_case(spec: HtmlSchemaCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      html: spec.html,
    },
    run: () => {
      const schema = hson.liveMap.schema.define((s) => ({
        button: s.string,
      }));

      const map = html_map(spec.html).schema.use(schema);

      return {
        assertRows: [
          equal_row(`${spec.name}: snap`, map.snap(), spec.expectedSnap),
        ],
      };
    },
  };
}
