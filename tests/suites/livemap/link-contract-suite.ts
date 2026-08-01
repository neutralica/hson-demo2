
// link-contract-suites.ts

import { link_livemap, make_livemap_core } from "hson-live/livemap";
import type { JsonValue, LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "./test-helpers";
import { json_root_node } from "./json-root-node";

const SUITE = "livemap/link-contract";

function err_message(fn: () => unknown): string {
  try {
    fn();
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function map_from(input: JsonValue) {
  return make_livemap_core(json_root_node(input));
}

export function livemap_link_contract_suites(): TestSuite {
  return {
    suite: SUITE,
    cases: [
      make_contract_link_case({
        name: "contract link_livemap propagates child set through parent link",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        from: ["draft"],
        to: ["user"],
        act: (source) => source.set(["draft", "name"], "Grace"),
        expectedSource: { draft: { name: "Grace", role: "user" } },
        expectedTarget: { user: { name: "Grace", role: "user" } },
      }),
      make_contract_link_case({
        name: "contract link_livemap propagates endpoint replace as endpoint replace",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        from: ["draft"],
        to: ["user"],
        act: (source) => source.replace(["draft"], { name: "Grace" }),
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_contract_link_case({
        name: "contract link_livemap propagates exact delete as target delete",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        from: ["draft", "name"],
        to: ["user", "name"],
        act: (source) => source.delete(["draft", "name"]),
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { user: { role: "user" } },
      }),
      make_contract_link_case({
        name: "contract link_livemap child delete under parent writes updated parent",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        from: ["draft"],
        to: ["user"],
        act: (source) => source.delete(["draft", "name"]),
        expectedSource: { draft: { role: "user" } },
        expectedTarget: { user: { role: "user" } },
      }),
      make_contract_handle_link_case({
        name: "contract handle linkTo propagates child set through parent handle",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        sourcePath: ["draft"],
        targetPath: ["user"],
        act: (source) => source.set(["draft", "name"], "Grace"),
        expectedSource: { draft: { name: "Grace", role: "user" } },
        expectedTarget: { user: { name: "Grace", role: "user" } },
      }),
      make_contract_handle_link_case({
        name: "contract handle linkTo propagates source replace as target replace",
        sourceInput: { draft: { name: "Ada", role: "user" } },
        targetInput: { user: { name: "Ada", role: "user" } },
        sourcePath: ["draft"],
        targetPath: ["user"],
        act: (source) => source.replace(["draft"], { name: "Grace" }),
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      make_contract_handle_link_case({
        name: "contract handle linkTo creates missing target child under object parent",
        sourceInput: { draft: { name: "Ada" } },
        targetInput: { user: {} },
        sourcePath: ["draft", "name"],
        targetPath: ["user", "name"],
        act: (source) => source.set(["draft", "name"], "Grace"),
        expectedSource: { draft: { name: "Grace" } },
        expectedTarget: { user: { name: "Grace" } },
      }),
      {
        suite: SUITE,
        name: "contract handle linkTo missing target parent still throws",
        meta: {
          sourceInput: preview_value({ draft: { name: "Ada" } }),
          targetInput: preview_value({}),
          sourcePath: preview_value(["draft", "name"]),
          targetPath: preview_value(["user", "name"]),
        },
        run: () => {
          const source = map_from({ draft: { name: "Ada" } });
          const target = map_from({});

          source.at(["draft", "name"]).linkTo(target.at(["user", "name"]));
          const message = err_message(() => source.set(["draft", "name"], "Grace"));

          return {
            assertRows: [
              equal_row(
                "contract handle linkTo missing target parent still throws: error",
                message,
                "LiveMap set path does not resolve: [\"user\", \"name\"]"
              ),
              equal_row("contract handle linkTo missing target parent still throws: source committed before feed error", source.snap(), { draft: { name: "Grace" } }),
              equal_row("contract handle linkTo missing target parent still throws: target", target.snap(), {}),
            ],
          };
        },
      },
    ] as const,
  };
}

type ContractLinkCaseSpec = Readonly<{
  name: string;
  sourceInput: JsonValue;
  targetInput: JsonValue;
  from: LivePath;
  to: LivePath;
  act: (source: ReturnType<typeof map_from>) => unknown;
  expectedSource: JsonValue;
  expectedTarget: JsonValue;
}>;

type ContractHandleLinkCaseSpec = Readonly<{
  name: string;
  sourceInput: JsonValue;
  targetInput: JsonValue;
  sourcePath: LivePath;
  targetPath: LivePath;
  act: (source: ReturnType<typeof map_from>) => unknown;
  expectedSource: JsonValue;
  expectedTarget: JsonValue;
}>;

function make_contract_link_case(spec: ContractLinkCaseSpec): TestCase {
  return {
    suite: SUITE,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      from: preview_value(spec.from),
      to: preview_value(spec.to),
    },
    run: () => {
      const source = map_from(spec.sourceInput);
      const target = map_from(spec.targetInput);

      link_livemap(source, target, { from: spec.from, to: spec.to });
      spec.act(source);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}

function make_contract_handle_link_case(spec: ContractHandleLinkCaseSpec): TestCase {
  return {
    suite: SUITE,
    name: spec.name,
    meta: {
      sourceInput: preview_value(spec.sourceInput),
      targetInput: preview_value(spec.targetInput),
      sourcePath: preview_value(spec.sourcePath),
      targetPath: preview_value(spec.targetPath),
    },
    run: () => {
      const source = map_from(spec.sourceInput);
      const target = map_from(spec.targetInput);

      source.at(spec.sourcePath).linkTo(target.at(spec.targetPath));
      spec.act(source);

      return {
        assertRows: [
          equal_row(`${spec.name}: source`, source.snap(), spec.expectedSource),
          equal_row(`${spec.name}: target`, target.snap(), spec.expectedTarget),
        ],
      };
    },
  };
}
