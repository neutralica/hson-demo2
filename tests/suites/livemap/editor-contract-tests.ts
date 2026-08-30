// contract-tests.ts

import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestSuite } from "../../harness/core/test-contracts";
import { preview_value, equal_row } from "./test-helpers";


function err_message(fn: () => unknown): string {
  try {
    fn();
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function map_from(input: JsonValue) {
  return hson.liveMap.fromJson(input);
}

export function livemap_editor_contract(): TestSuite {
  const SUITE = "livemap/editor-contract";
  return {
    suite: SUITE,
    cases: [
      {
        suite: SUITE,
        caseId: "contract-set-requires-addressed-path-to-resolve", name: "contract set requires addressed path to resolve",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user", "role"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } });
          const message = err_message(() => map.set(["user", "role"], "admin"));

          return {
            assertRows: [
              equal_row("contract set requires addressed path to resolve: error", message, "LiveMap set path does not resolve: [\"user\", \"role\"]"),
              equal_row("contract set requires addressed path to resolve: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "contract-object-set-preserves-unspecified-siblings", name: "contract object set preserves unspecified siblings",
        meta: {
          input: preview_value({ user: { name: "Ada", role: "user" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada", role: "user" } });
          const commit = map.set(["user"], { name: "Grace" });

          return {
            assertRows: [
              equal_row("contract object set preserves unspecified siblings: changed", commit.changed, true),
              equal_row("contract object set preserves unspecified siblings: ops", commit.ops, [
                { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
              ]),
              equal_row("contract object set preserves unspecified siblings: root", map.snap(), { user: { name: "Grace", role: "user" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "contract-setmany-creates-missing-children-under-resolved-object", name: "contract setMany creates missing children under resolved object",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } });
          const commit = map.setMany(["user"], { role: "admin" });

          return {
            assertRows: [
              equal_row("contract setMany creates missing children under resolved object: changed", commit.changed, true),
              equal_row("contract setMany creates missing children under resolved object: ops", commit.ops, [
                { kind: "set", path: ["user", "role"], prev: undefined, next: "admin" },
              ]),
              equal_row("contract setMany creates missing children under resolved object: root", map.snap(), { user: { name: "Ada", role: "admin" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "contract-replace-removes-unspecified-siblings", name: "contract replace removes unspecified siblings",
        meta: {
          input: preview_value({ user: { name: "Ada", role: "user" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada", role: "user" } });
          const commit = map.replace(["user"], { name: "Grace" });

          return {
            assertRows: [
              equal_row("contract replace removes unspecified siblings: changed", commit.changed, true),
              equal_row("contract replace removes unspecified siblings: ops", commit.ops, [
                { kind: "replace", path: ["user"], prev: { name: "Ada", role: "user" }, next: { name: "Grace" } },
              ]),
              equal_row("contract replace removes unspecified siblings: root", map.snap(), { user: { name: "Grace" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "contract-root-replace-replaces-root-exactly", name: "contract root replace replaces root exactly",
        meta: {
          input: preview_value({ user: { name: "Ada" }, meta: { draft: true } }),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" }, meta: { draft: true } });
          const commit = map.replace({ user: { name: "Grace" } });

          return {
            assertRows: [
              equal_row("contract root replace replaces root exactly: changed", commit.changed, true),
              equal_row("contract root replace replaces root exactly: ops", commit.ops, [
                { kind: "replace", path: [], prev: { user: { name: "Ada" }, meta: { draft: true } }, next: { user: { name: "Grace" } } },
              ]),
              equal_row("contract root replace replaces root exactly: root", map.snap(), { user: { name: "Grace" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "contract-delete-requires-addressed-path-to-resolve", name: "contract delete requires addressed path to resolve",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user", "role"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } });
          const message = err_message(() => map.delete(["user", "role"]));

          return {
            assertRows: [
              equal_row("contract delete requires addressed path to resolve: error", message, "LiveMap delete path does not resolve: [\"user\", \"role\"]"),
              equal_row("contract delete requires addressed path to resolve: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "contract-object-deletekey-missing-key-no-ops", name: "contract object deleteKey missing key no-ops",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } });
          const commit = map.at(["user"]).object.deleteKey("role");

          return {
            assertRows: [
              equal_row("contract object deleteKey missing key no-ops: changed", commit.changed, false),
              equal_row("contract object deleteKey missing key no-ops: ops", commit.ops, []),
              equal_row("contract object deleteKey missing key no-ops: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "contract-handle-linkto-can-create-missing-target-object-property", name: "contract handle linkTo can create missing target object property",
        meta: {
          source: preview_value({ draft: { name: "Ada" } }),
          target: preview_value({ user: {} }),
        },
        run: () => {
          const source = map_from({ draft: { name: "Ada" } });
          const target = map_from({ user: {} });
          const off = source.at(["draft", "name"]).linkTo(target.at(["user", "name"]));

          source.set(["draft", "name"], "Grace");
          off();

          return {
            assertRows: [
              equal_row("contract handle linkTo can create missing target object property: target", target.snap(), { user: { name: "Grace" } }),
            ],
          };
        },
      },
    ],
  };
}
