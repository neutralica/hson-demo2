// html-livemap-suite.ts



import {  make_livemap_core } from "hson-live/livemap";
import type { JsonValue, LiveMap } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "./test-helpers";
import  { hson } from "hson-live";

export function livemap_suite_html_proof(): TestSuite {
  const SUITE = "livemap/html-proof";

  return {
    suite: SUITE,
    cases: [
      make_html_snap_case({
        suite: SUITE,
        caseId: "html-simple-text-element-snap-shape", name: "html simple text element snap shape",
        html: "<button>Press</button>",
        expected: { button: "Press" },
      }),

      make_html_snap_case({
        suite: SUITE,
        caseId: "html-element-attrs-are-excluded-from-projected-snap", name: "html element attrs are excluded from projected snap",
        html: `<button class="primary" disabled>Press</button>`,
        expected: { button: "Press" },
      }),

      make_html_snap_case({
        suite: SUITE,
        caseId: "html-sibling-elements-project-as-object-keys", name: "html sibling elements project as object keys",
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
        caseId: "html-repeated-sibling-tags-project-as-array-like-repeated-value", name: "html repeated sibling tags project as array-like repeated value",
        html: `<ul><li>One</li><li>Two</li></ul>`,
        expected: {
          ul: {
            li: ["One", "Two"],
          },
        },
      }),

      make_html_snap_case({
        suite: SUITE,
        caseId: "html-nested-text-element-projects-nested-value", name: "html nested text element projects nested value",
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
        caseId: "html-projected-leaf-set-updates-text-projection", name: "html projected leaf set updates text projection",
        html: "<button>Press</button>",
        path: ["button"],
        value: "Save",
        expectedSnap: { button: "Save" },
        expectedCommitChanged: true,
      }),

      make_html_replace_case({
        suite: SUITE,
        caseId: "html-projected-leaf-replace-updates-text-projection", name: "html projected leaf replace updates text projection",
        html: "<button>Press</button>",
        path: ["button"],
        value: "Save",
        expectedSnap: { button: "Save" },
        expectedCommitChanged: true,
      }),

      make_html_set_case({
        suite: SUITE,
        caseId: "html-projected-nested-leaf-set-updates-nested-text-projection", name: "html projected nested leaf set updates nested text projection",
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
        caseId: "html-data-object-replace-removes-sibling-projection", name: "html data object replace removes sibling projection",
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
    ] as const,
  };
}

type HtmlSnapCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  html: string;
  expected: JsonValue;
}>;

type HtmlSetCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  html: string;
  path: readonly (string | number)[];
  value: JsonValue;
  expectedSnap: JsonValue;
  expectedCommitChanged: boolean;
}>;

type HtmlReplaceCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  html: string;
  path: readonly (string | number)[];
  value: JsonValue;
  expectedSnap: JsonValue;
  expectedCommitChanged: boolean;
}>;

type HtmlSchemaCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  html: string;
  expectedSnap: JsonValue;
}>;

function html_map(html: string): LiveMap<JsonValue> {
  return make_livemap_core(
    hson.fromTrustedHtml(html).toNode(),
  ) as LiveMap<JsonValue>;
}

function make_html_snap_case(spec: HtmlSnapCaseSpec): TestCase {
  return {
    suite: spec.suite,
    caseId: spec.caseId, name: spec.name,
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
    caseId: spec.caseId, name: spec.name,
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
    caseId: spec.caseId, name: spec.name,
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
