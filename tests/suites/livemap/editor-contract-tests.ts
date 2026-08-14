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

const userSchema = hson.liveMap.schema.define((s) => s.object({
  user: s.object({
    name: s.string,
    age: s.number.optional,
  }),
}));
const exactUserSchema = hson.liveMap.schema.define((s) => s.object({
  user: s.object.exact({
    name: s.string,
    age: s.number.optional,
  }),
}));
const itemsSchema = hson.liveMap.schema.define((s) => s.object({
  items: s.array(s.number),
}));

export function livemap_schema_contract_suite(): TestSuite {
  const SUITE = "livemap/schema-contract";
  return {
    suite: SUITE,
    cases: [
      {
        suite: SUITE,
        caseId: "schema-contract-set-validates-bad-leaf-before-mutation", name: "schema contract set validates bad leaf before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
          path: preview_value(["user", "name"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada", age: 37 } }).schema.use(userSchema);
          const message = err_message(() => map.set(["user", "name"], 12 as never));

          return {
            assertRows: [
              equal_row(
                "schema contract set validates bad leaf before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received number"
              ),
              equal_row("schema contract set validates bad leaf before mutation: root", map.snap(), { user: { name: "Ada", age: 37 } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "schema-contract-setmany-reports-bad-changed-field", name: "schema contract setMany reports bad changed field",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada", age: 37 } }).schema.use(userSchema);
          const message = err_message(() => map.setMany(["user"], { name: "Grace", age: "old" as never }));

          return {
            assertRows: [
              equal_row(
                "schema contract setMany reports bad changed field: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"age\"]:\n- LiveMap schema expected number at [\"user\",\"age\"], received string"
              ),
              equal_row("schema contract setMany reports bad changed field: root", map.snap(), { user: { name: "Ada", age: 37 } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "schema-contract-replace-validates-endpoint-exactly", name: "schema contract replace validates endpoint exactly",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada", age: 37 } }).schema.use(userSchema);
          const message = err_message(() => map.replace(["user"], { name: 12 as never }));

          return {
            assertRows: [
              equal_row(
                "schema contract replace validates endpoint exactly: error",
                message,
                "LiveMap schema rejected value at [\"user\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received number"
              ),
              equal_row("schema contract replace validates endpoint exactly: root", map.snap(), { user: { name: "Ada", age: 37 } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "schema-contract-delete-required-field-fails-before-mutation", name: "schema contract delete required field fails before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
          path: preview_value(["user", "name"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada", age: 37 } }).schema.use(userSchema);
          const message = err_message(() => map.delete(["user", "name"]));

          return {
            assertRows: [
              equal_row(
                "schema contract delete required field fails before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received missing"
              ),
              equal_row("schema contract delete required field fails before mutation: root", map.snap(), { user: { name: "Ada", age: 37 } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "schema-contract-delete-optional-field-succeeds", name: "schema contract delete optional field succeeds",
        meta: {
          input: preview_value({ user: { name: "Ada", age: 37 } }),
          path: preview_value(["user", "age"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada", age: 37 } }).schema.use(userSchema);
          const commit = map.delete(["user", "age"]);

          return {
            assertRows: [
              equal_row("schema contract delete optional field succeeds: changed", commit.changed, true),
              equal_row("schema contract delete optional field succeeds: ops", commit.ops, [
                { kind: "delete", path: ["user", "age"], prev: 37, next: undefined },
              ]),
              equal_row("schema contract delete optional field succeeds: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "schema-contract-exact-rejects-unknown-setmany-key", name: "schema contract exact rejects unknown setMany key",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } }).schema.use(exactUserSchema);
          const message = err_message(() => map.setMany(["user"], { role: "admin" } as never));

          return {
            assertRows: [
              equal_row(
                "schema contract exact rejects unknown setMany key: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"role\"]:\n- LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]"
              ),
              equal_row("schema contract exact rejects unknown setMany key: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "schema-contract-exact-allows-no-op-deletekey-for-absent-unknown-key", name: "schema contract exact allows no-op deleteKey for absent unknown key",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } }).schema.use(exactUserSchema);
          const commit = map.at(["user"]).object.deleteKey("role");

          return {
            assertRows: [
              equal_row("schema contract exact allows no-op deleteKey for absent unknown key: changed", commit.changed, false),
              equal_row("schema contract exact allows no-op deleteKey for absent unknown key: ops", commit.ops, []),
              equal_row("schema contract exact allows no-op deleteKey for absent unknown key: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "schema-contract-array-helper-reports-bad-appended-item", name: "schema contract array helper reports bad appended item",
        meta: {
          input: preview_value({ items: [0, 1] }),
          path: preview_value(["items"]),
        },
        run: () => {
          const map = map_from({ items: [0, 1] }).schema.use(itemsSchema);
          const message = err_message(() => map.at(["items"]).array.push("two" as never));

          return {
            assertRows: [
              equal_row(
                "schema contract array helper reports bad appended item: error",
                message,
                "LiveMap schema rejected value at [\"items\"]:\n- LiveMap schema expected number at [\"items\",2], received string"
              ),
              equal_row("schema contract array helper reports bad appended item: root", map.snap(), { items: [0, 1] }),
            ],
          };
        },
      },
    ],
  };
}

export function livemap_object_exact(): TestSuite {
  const SUITE = "livemap/object-exact";

  return {
    suite: SUITE,
    cases: [
      {
        suite: SUITE,
        caseId: "object-exact-rejects-unknown-object.setkey-before-mutation", name: "object exact rejects unknown object.setKey before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } }).schema.use(exactUserSchema);
          const message = err_message(() => map.at(["user"]).object.setKey("role" as never, "admin" as never));

          return {
            assertRows: [
              equal_row(
                "object exact rejects unknown object.setKey before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"role\"]:\n- LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]"
              ),
              equal_row("object exact rejects unknown object.setKey before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "object-exact-rejects-unknown-object-valued-set-before-mutation", name: "object exact rejects unknown object-valued set before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } }).schema.use(exactUserSchema);
          const message = err_message(() => map.set(["user"], { name: "Grace", role: "admin" } as never));

          return {
            assertRows: [
              equal_row(
                "object exact rejects unknown object-valued set before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\",\"role\"]:\n- LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]"
              ),
              equal_row("object exact rejects unknown object-valued set before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
      {
        suite: SUITE,
        caseId: "object-exact-rejects-unknown-replace-key-before-mutation", name: "object exact rejects unknown replace key before mutation",
        meta: {
          input: preview_value({ user: { name: "Ada" } }),
          path: preview_value(["user"]),
        },
        run: () => {
          const map = map_from({ user: { name: "Ada" } }).schema.use(exactUserSchema);
          const message = err_message(() => map.replace(["user"], { name: "Grace", role: "admin" } as never));

          return {
            assertRows: [
              equal_row(
                "object exact rejects unknown replace key before mutation: error",
                message,
                "LiveMap schema rejected value at [\"user\"]:\n- LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]"
              ),
              equal_row("object exact rejects unknown replace key before mutation: root", map.snap(), { user: { name: "Ada" } }),
            ],
          };
        },
      },
    ],
  };
}
