// suites-link.ts

import { link_livemap, make_livemap_core } from "hson-live";
import type { JsonValue, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";
import { json_root_node } from "./test-kit";

export function livemap_suites_link(): TestSuite {
  const SUITE = "livemap-link";

  return {
    suite: SUITE,
    cases: [
      make_link_case({
        suite: SUITE,
        name: "link propagates exact set",
        sourceInput: { user: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        linkPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedSource: { user: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_link_case({
        suite: SUITE,
        name: "link parent path propagates child set",
        sourceInput: { user: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        linkPath: ["user"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedSource: { user: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_link_case({
        suite: SUITE,
        name: "link sibling path ignores unrelated set",
        sourceInput: { user: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        linkPath: ["user", "role"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedSource: { user: { name: "Grace", role: "user" } },
        expectedTarget: { user: { name: "Ada", role: "user" } },
      }),
      make_link_case({
        suite: SUITE,
        name: "link ignores unchanged source set",
        sourceInput: { user: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        linkPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Ada",
        expectedSource: { user: { name: "Ada" } },
        expectedTarget: { user: { name: "Ada" } },
      }),
      make_link_dispose_case({
        suite: SUITE,
        name: "link disposer stops propagation",
        sourceInput: { user: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        linkPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedSource: { user: { name: "Grace" } },
        expectedTarget: { user: { name: "Ada" } },
      }),
      make_link_mapped_case({
        suite: SUITE,
        name: "link maps exact source path to exact target path",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        from: ["draft", "name"],
        to: ["user", "name"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_link_mapped_case({
        suite: SUITE,
        name: "link maps source parent to target parent",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        from: ["draft"],
        to: ["user"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_link_mapped_case({
        suite: SUITE,
        name: "link mapped sibling ignores unrelated set",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        from: ["draft", "role"],
        to: ["user", "role"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace", role: "user" } },
        expectedTarget: { user: { name: "Ada", role: "user" } },
      }),
      make_link_mapped_dispose_case({
        suite: SUITE,
        name: "link mapped disposer stops propagation",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        from: ["draft", "name"],
        to: ["user", "name"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Ada" } },
      }),
    ] as const,
  };
}

type LinkCaseSpec = Readonly<{
  suite: string;
  name: string;
  sourceInput: JsonValue;
  targetInput: JsonValue;
  linkPath: LivePath;
  setPath: LivePath;
  value: JsonValue;
  expectedSource: JsonValue;
  expectedTarget: JsonValue;
}>;

type MappedLinkCaseSpec = Omit<LinkCaseSpec, "linkPath"> & Readonly<{
  from: LivePath;
  to: LivePath;
}>;

function make_link_case(spec: LinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      linkPath: preview_value(spec.linkPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      link_livemap(source, target, { path: spec.linkPath });
      source.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_link_dispose_case(spec: LinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      linkPath: preview_value(spec.linkPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      const dispose = link_livemap(source, target, { path: spec.linkPath });
      dispose();
      source.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_link_mapped_case(spec: MappedLinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      from: preview_value(spec.from),
      to: preview_value(spec.to),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      link_livemap(source, target, { from: spec.from, to: spec.to });
      source.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_link_mapped_dispose_case(spec: MappedLinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      from: preview_value(spec.from),
      to: preview_value(spec.to),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      const dispose = link_livemap(source, target, { from: spec.from, to: spec.to });
      dispose();
      source.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}
