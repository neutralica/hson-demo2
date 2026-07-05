// suites-link.ts

import { link_livemap, make_livemap_core } from "hson-live";
import type { JsonValue, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";
import { json_root_node } from "./all-livemap-suites";

export function livemap_suites_link(): TestSuite {
  const SUITE = "livemap/link";

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
      {
        suite: SUITE,
        name: "link mapped parent propagates destructive setMany as parent replacement",
        meta: {
          sourceInput: preview_value({ draft: { name: "Ada", role: "user" } }),
          targetInput: preview_value({ user: { name: "Ada", role: "user" } }),
          from: preview_value(["draft"]),
          to: preview_value(["user"]),
          values: preview_value({ name: "Grace" }),
        },
        run: () => {
          const source = make_livemap_core(json_root_node({ draft: { name: "Ada", role: "user" } }));
          const target = make_livemap_core(json_root_node({ user: { name: "Ada", role: "user" } }));

          link_livemap(source, target, { from: ["draft"], to: ["user"] });
          source.setMany(["draft"], { name: "Grace" });

          return {
            assertRows: [
              equal_row("link mapped parent propagates destructive setMany as parent replacement: source", source.snap(), {
                draft: { name: "Grace" },
              }),
              equal_row("link mapped parent propagates destructive setMany as parent replacement: target", target.snap(), {
                user: { name: "Grace" },
              }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "link mapped parent propagates write as sibling-preserving child writes",
        meta: {
          sourceInput: preview_value({ draft: { name: "Ada", role: "user" } }),
          targetInput: preview_value({ user: { name: "Ada", role: "user" } }),
          from: preview_value(["draft"]),
          to: preview_value(["user"]),
          values: preview_value({ name: "Grace" }),
        },
        run: () => {
          const source = make_livemap_core(json_root_node({ draft: { name: "Ada", role: "user" } }));
          const target = make_livemap_core(json_root_node({ user: { name: "Ada", role: "user" } }));

          link_livemap(source, target, { from: ["draft"], to: ["user"] });
          source.write(["draft"], { name: "Grace" });

          return {
            assertRows: [
              equal_row("link mapped parent propagates write as sibling-preserving child writes: source", source.snap(), {
                draft: { name: "Grace", role: "user" },
              }),
              equal_row("link mapped parent propagates write as sibling-preserving child writes: target", target.snap(), {
                user: { name: "Grace", role: "user" },
              }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        name: "link mapped parent propagates root replace affecting source scope",
        meta: {
          sourceInput: preview_value({ draft: { name: "Ada", role: "user" }, other: true }),
          targetInput: preview_value({ user: { name: "Ada", role: "user" } }),
          from: preview_value(["draft"]),
          to: preview_value(["user"]),
          value: preview_value({ draft: { name: "Grace" }, other: false }),
        },
        run: () => {
          const source = make_livemap_core(json_root_node({ draft: { name: "Ada", role: "user" }, other: true }));
          const target = make_livemap_core(json_root_node({ user: { name: "Ada", role: "user" } }));

          link_livemap(source, target, { from: ["draft"], to: ["user"] });
          source.replace({ draft: { name: "Grace" }, other: false });

          return {
            assertRows: [
              equal_row("link mapped parent propagates root replace affecting source scope: source", source.snap(), {
                draft: { name: "Grace" },
                other: false,
              }),
              equal_row("link mapped parent propagates root replace affecting source scope: target", target.snap(), {
                user: { name: "Grace" },
              }),
            ],
          };
        },
      },
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
      make_link_case({
        suite: SUITE,
        name: "link propagates array item replacement",
        sourceInput: { users: [{ name: "Ada" }, { name: "Grace" }] },
        targetInput: { users: [{ name: "Ada" }, { name: "Grace" }] },
        linkPath: ["users"],
        setPath: ["users", 0],
        value: { name: "Margaret" },
        expectedSource: { users: [{ name: "Margaret" }, { name: "Grace" }] },
        expectedTarget: { users: [{ name: "Margaret" }, { name: "Grace" }] },
      }),
      make_link_case({
        suite: SUITE,
        name: "link propagates nested array item property",
        sourceInput: { users: [{ name: "Ada" }, { name: "Grace" }] },
        targetInput: { users: [{ name: "Ada" }, { name: "Grace" }] },
        linkPath: ["users", 1],
        setPath: ["users", 1, "name"],
        value: "Margaret",
        expectedSource: { users: [{ name: "Ada" }, { name: "Margaret" }] },
        expectedTarget: { users: [{ name: "Ada" }, { name: "Margaret" }] },
      }),
      make_link_mapped_case({
        suite: SUITE,
        name: "link mapped path preserves numeric array suffix",
        sourceInput: { draftUsers: [{ name: "Ada" }, { name: "Grace" }] },
        targetInput: { users: [{ name: "Ada" }, { name: "Grace" }] },
        from: ["draftUsers"],
        to: ["users"],
        setPath: ["draftUsers", 0, "name"],
        value: "Margaret",
        expectedSource: { draftUsers: [{ name: "Margaret" }, { name: "Grace" }] },
        expectedTarget: { users: [{ name: "Margaret" }, { name: "Grace" }] },
      }),
      make_link_mapped_case({
        suite: SUITE,
        name: "link maps source leaf to renamed target leaf",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: { displayName: "Ada" } },
        from: ["draft", "name"],
        to: ["user", "displayName"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { displayName: "Grace" } },
      }),
      make_link_mapped_case({
        suite: SUITE,
        name: "link mapped target can add missing property",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: {} },
        from: ["draft", "name"],
        to: ["user", "name"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_link_reverse_set_case({
        suite: SUITE,
        name: "link is one way from source to target",
        sourceInput: { user: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        linkPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedSource: { user: { name: "Ada" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_link_two_targets_case({
        suite: SUITE,
        name: "link source can propagate to multiple targets",
        sourceInput: { user: { name: "Ada" } },
        firstTargetInput: { user: { name: "Ada" } },
        secondTargetInput: { profile: { name: "Ada" } },
        firstLinkPath: ["user", "name"],
        secondFrom: ["user", "name"],
        secondTo: ["profile", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedSource: { user: { name: "Grace" } },
        expectedFirstTarget: { user: { name: "Grace" } },
        expectedSecondTarget: { profile: { name: "Grace" } },
      }),
      make_link_delete_case({
        suite: SUITE,
        name: "link propagates leaf delete",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { draft: { name: "Ada", role: "user" } },
        linkPath: ["draft", "name"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { draft: { role: "user" } },
      }),
      make_link_delete_case({
        suite: SUITE,
        name: "link parent propagates child delete as updated parent",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { draft: { name: "Ada", role: "user" } },
        linkPath: ["draft"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { draft: { role: "user" } },
      }),
      make_link_mapped_delete_case({
        suite: SUITE,
        name: "link mapped propagates leaf delete",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        from: ["draft", "name"],
        to: ["user", "name"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { user: { role: "user" } },
      }),
      make_link_mapped_delete_case({
        suite: SUITE,
        name: "link mapped parent propagates child delete as updated parent",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        from: ["draft"],
        to: ["user"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { user: { role: "user" } },
      }),
      make_link_delete_dispose_case({
        suite: SUITE,
        name: "link disposer stops delete propagation",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { draft: { name: "Ada", role: "user" } },
        linkPath: ["draft", "name"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { draft: { name: "Ada", role: "user" } },
      }),
      make_link_mapped_delete_dispose_case({
        suite: SUITE,
        name: "link mapped disposer stops delete propagation",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        from: ["draft", "name"],
        to: ["user", "name"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { user: { name: "Ada", role: "user" } },
      }),
      make_link_reverse_delete_case({
        suite: SUITE,
        name: "link delete is one way from source to target",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { draft: { name: "Ada", role: "user" } },
        linkPath: ["draft", "name"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { name: "Ada", role: "user" } },
        expectedTarget: { draft: { role: "user" } },
      }),
      make_handle_link_case({
        suite: SUITE,
        name: "handle linkTo propagates leaf value",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        sourcePath: ["draft", "name"],
        targetPath: ["user", "name"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_handle_link_case({
        suite: SUITE,
        name: "handle linkTo propagates parent value after child set",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        sourcePath: ["draft"],
        targetPath: ["user"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_handle_link_case({
        suite: SUITE,
        name: "handle linkTo target can add missing property",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: {} },
        sourcePath: ["draft", "name"],
        targetPath: ["user", "name"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_handle_link_reverse_set_case({
        suite: SUITE,
        name: "handle linkTo is one way from source to target",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        sourcePath: ["draft", "name"],
        targetPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Ada" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_handle_link_dispose_case({
        suite: SUITE,
        name: "handle linkTo disposer stops propagation",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: { name: "Ada" } },
        sourcePath: ["draft", "name"],
        targetPath: ["user", "name"],
        setPath: ["draft", "name"],
        value: "Grace",
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Ada" } },
      }),
      make_handle_link_delete_case({
        suite: SUITE,
        name: "handle linkTo propagates leaf delete",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        sourcePath: ["draft", "name"],
        targetPath: ["user", "name"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { user: { role: "user" } },
      }),
      make_handle_link_delete_case({
        suite: SUITE,
        name: "handle linkTo parent propagates child delete as updated parent",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        sourcePath: ["draft"],
        targetPath: ["user"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { user: { role: "user" } },
      }),
      make_handle_link_delete_dispose_case({
        suite: SUITE,
        name: "handle linkTo disposer stops delete propagation",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        sourcePath: ["draft", "name"],
        targetPath: ["user", "name"],
        deletePath: ["draft", "name"],
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { user: { name: "Ada", role: "user" } },
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

type MappedLinkDeleteCaseSpec = Omit<MappedLinkCaseSpec, "setPath" | "value"> & Readonly<{
  deletePath: LivePath;
}>;
type LinkDeleteCaseSpec = Omit<LinkCaseSpec, "setPath" | "value"> & Readonly<{
  deletePath: LivePath;
}>;

type TwoTargetLinkCaseSpec = Readonly<{
  suite: string;
  name: string;
  sourceInput: JsonValue;
  firstTargetInput: JsonValue;
  secondTargetInput: JsonValue;
  firstLinkPath: LivePath;
  secondFrom: LivePath;
  secondTo: LivePath;
  setPath: LivePath;
  value: JsonValue;
  expectedSource: JsonValue;
  expectedFirstTarget: JsonValue;
  expectedSecondTarget: JsonValue;
}>;

type HandleLinkCaseSpec = Readonly<{
  suite: string;
  name: string;
  sourceInput: JsonValue;
  targetInput: JsonValue;
  sourcePath: LivePath;
  targetPath: LivePath;
  setPath: LivePath;
  value: JsonValue;
  expectedSource: JsonValue;
  expectedTarget: JsonValue;
}>;

type HandleLinkDeleteCaseSpec = Readonly<{
  suite: string;
  name: string;
  sourceInput: JsonValue;
  targetInput: JsonValue;
  sourcePath: LivePath;
  targetPath: LivePath;
  deletePath: LivePath;
  expectedSource: JsonValue;
  expectedTarget: JsonValue;
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


function make_link_delete_case(spec: LinkDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      linkPath: preview_value(spec.linkPath),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      link_livemap(source, target, { path: spec.linkPath });
      source.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_link_delete_dispose_case(spec: LinkDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      linkPath: preview_value(spec.linkPath),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      const dispose = link_livemap(source, target, { path: spec.linkPath });
      dispose();
      source.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_link_reverse_delete_case(spec: LinkDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      linkPath: preview_value(spec.linkPath),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      link_livemap(source, target, { path: spec.linkPath });
      target.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_link_reverse_set_case(spec: LinkCaseSpec): TestCase {
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
      target.set(spec.setPath, spec.value);

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


function make_link_mapped_delete_case(spec: MappedLinkDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      from: preview_value(spec.from),
      to: preview_value(spec.to),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      link_livemap(source, target, { from: spec.from, to: spec.to });
      source.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_link_mapped_delete_dispose_case(spec: MappedLinkDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      from: preview_value(spec.from),
      to: preview_value(spec.to),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      const dispose = link_livemap(source, target, { from: spec.from, to: spec.to });
      dispose();
      source.delete(spec.deletePath);

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

function make_link_two_targets_case(spec: TwoTargetLinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      firstTargetInput: preview_value(spec.firstTargetInput),
      secondTargetInput: preview_value(spec.secondTargetInput),
      firstLinkPath: preview_value(spec.firstLinkPath),
      secondFrom: preview_value(spec.secondFrom),
      secondTo: preview_value(spec.secondTo),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const firstTarget = make_livemap_core(json_root_node(spec.firstTargetInput));
      const secondTarget = make_livemap_core(json_root_node(spec.secondTargetInput));

      link_livemap(source, firstTarget, { path: spec.firstLinkPath });
      link_livemap(source, secondTarget, { from: spec.secondFrom, to: spec.secondTo });
      source.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: first target`, firstTarget.snap(), spec.expectedFirstTarget),
          equal_row(`${spec.name}: second target`, secondTarget.snap(), spec.expectedSecondTarget),
        ],
      };
    },
  };
}

function make_handle_link_case(spec: HandleLinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      sourcePath: preview_value(spec.sourcePath),
      targetPath: preview_value(spec.targetPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      source.at(spec.sourcePath).linkTo(target.at(spec.targetPath));
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

function make_handle_link_reverse_set_case(spec: HandleLinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      sourcePath: preview_value(spec.sourcePath),
      targetPath: preview_value(spec.targetPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      source.at(spec.sourcePath).linkTo(target.at(spec.targetPath));
      target.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_handle_link_dispose_case(spec: HandleLinkCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      sourcePath: preview_value(spec.sourcePath),
      targetPath: preview_value(spec.targetPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      const dispose = source.at(spec.sourcePath).linkTo(target.at(spec.targetPath));
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

function make_handle_link_delete_case(spec: HandleLinkDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      sourcePath: preview_value(spec.sourcePath),
      targetPath: preview_value(spec.targetPath),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      source.at(spec.sourcePath).linkTo(target.at(spec.targetPath));
      source.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_handle_link_delete_dispose_case(spec: HandleLinkDeleteCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      sourcePath: preview_value(spec.sourcePath),
      targetPath: preview_value(spec.targetPath),
      deletePath: preview_value(spec.deletePath),
    },
    run: () => {
      const source = make_livemap_core(json_root_node(spec.sourceInput));
      const target = make_livemap_core(json_root_node(spec.targetInput));

      const dispose = source.at(spec.sourcePath).linkTo(target.at(spec.targetPath));
      dispose();
      source.delete(spec.deletePath);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}
