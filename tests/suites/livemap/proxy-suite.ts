// proxy-suites.ts

import { hson } from "hson-live";
import type { JsonValue } from "hson-live/types";
import type { TestSuite } from "../../harness/core/test-contracts";
import { read_case, commitCase, throwCase } from "./handle-helpers";

function own_proto_data_input(): JsonValue {
  const input: Record<string, JsonValue> = {};
  Object.defineProperty(input, "__proto__", {
    value: "data",
    enumerable: true,
    writable: true,
    configurable: true,
  });
  return input;
}


export function livemap_suites_proxy(): TestSuite {
  const SUITE = "livemap/proxy";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "proxy-root-_-returns-root-handle-path", name: "proxy root $_ returns root handle path",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy().$_.path(),
        expected: [],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-string-property-builds-path", name: "proxy string property builds path",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.name.$_.path();
        },
        expected: ["user", "name"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-numeric-property-builds-array-index-path", name: "proxy numeric property builds array index path",
        input: { items: [{ name: "Ada" }] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items[0].name.$_.path();
        },
        expected: ["items", 0, "name"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-path-scoped-root-builds-from-starting-path", name: "proxy path-scoped root builds from starting path",
        input: { user: { profile: { name: "Ada" } } },
        act: (map) => {
          const proxy = map.proxy(["user"]) as any;
          return proxy.profile.name.$_.path();
        },
        expected: ["user", "profile", "name"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-_-snap-reads-current-value", name: "proxy $_ snap reads current value",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.name.$_.snap();
        },
        expected: "Ada",
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-_-set-writes-current-path", name: "proxy $_ set writes current path",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.name.$_.set("Grace");
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        ],
        expectedRoot: { user: { name: "Grace" } },
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-contract-object-valued-set-preserves-unspecified-siblings", name: "proxy contract object-valued set preserves unspecified siblings",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.$_.set({ name: "Grace" });
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        ],
        expectedRoot: { user: { name: "Grace", role: "user" } },
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-contract-set-missing-direct-property-throws", name: "proxy contract set missing direct property throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.role.$_.set("admin");
        },
        expectedMessage: "LiveMap set path does not resolve: [\"user\", \"role\"]",
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-contract-replace-removes-unspecified-siblings", name: "proxy contract replace removes unspecified siblings",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.$_.replace({ name: "Grace" });
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "replace", path: ["user"], prev: { name: "Ada", role: "user" }, next: { name: "Grace" } },
        ],
        expectedRoot: { user: { name: "Grace" } },
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-_-delete-deletes-current-path", name: "proxy $_ delete deletes current path",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.role.$_.delete();
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "delete", path: ["user", "role"], prev: "user", next: undefined },
        ],
        expectedRoot: { user: { name: "Ada" } },
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-direct-assignment-throws", name: "proxy direct assignment throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          proxy.user.name = "Grace";
        },
        expectedMessage: "LiveMap proxy values must be changed through $_.",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-direct-delete-throws", name: "proxy direct delete throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          delete proxy.user.name;
        },
        expectedMessage: "LiveMap proxy values must be deleted through $_.",
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-has-_-escape-key", name: "proxy has $_ escape key",
        input: { user: { name: "Ada" } },
        act: (map) => "$_" in map.proxy(),
        expected: true,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-does-not-report-data-keys-through-in-operator", name: "proxy does not report data keys through in operator",
        input: { user: { name: "Ada" } },
        act: (map) => "user" in map.proxy(),
        expected: false,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-own-keys-reports-only-escape-key", name: "proxy own keys reports only escape key",
        input: { user: { name: "Ada" } },
        act: (map) => Reflect.ownKeys(map.proxy()),
        expected: ["$_"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-object.keys-hides-escape-key", name: "proxy Object.keys hides escape key",
        input: { user: { name: "Ada" } },
        act: (map) => Object.keys(map.proxy()),
        expected: [],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-numeric-string-property-builds-array-index-path", name: "proxy numeric string property builds array index path",
        input: { items: [{ name: "Ada" }] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["0"].name.$_.path();
        },
        expected: ["items", 0, "name"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-leading-zero-numeric-string-remains-object-key", name: "proxy leading-zero numeric string remains object key",
        input: { items: { "01": { name: "Ada" } } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["01"].name.$_.path();
        },
        expected: ["items", "01", "name"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-negative-numeric-string-remains-object-key", name: "proxy negative numeric string remains object key",
        input: { items: { "-1": { name: "Ada" } } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["-1"].name.$_.path();
        },
        expected: ["items", "-1", "name"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-decimal-numeric-string-remains-object-key", name: "proxy decimal numeric string remains object key",
        input: { items: { "1.5": { name: "Ada" } } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["1.5"].name.$_.path();
        },
        expected: ["items", "1.5", "name"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-symbol-access-returns-undefined", name: "proxy symbol access returns undefined",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy[Symbol.iterator];
        },
        expected: undefined,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-_-descriptor-is-non-enumerable", name: "proxy $_ descriptor is non-enumerable",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const descriptor = Object.getOwnPropertyDescriptor(map.proxy(), "$_");
          return descriptor?.enumerable;
        },
        expected: false,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-_-descriptor-is-configurable", name: "proxy $_ descriptor is configurable",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const descriptor = Object.getOwnPropertyDescriptor(map.proxy(), "$_");
          return descriptor?.configurable;
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-unknown-descriptor-is-undefined", name: "proxy unknown descriptor is undefined",
        input: { user: { name: "Ada" } },
        act: (map) => Object.getOwnPropertyDescriptor(map.proxy(), "user"),
        expected: undefined,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-scoped-_-returns-scoped-handle-path", name: "proxy scoped $_ returns scoped handle path",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy(["user", "name"]).$_.path(),
        expected: ["user", "name"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-_-exposes-array-handle-namespace", name: "proxy $_ exposes array handle namespace",
        input: { items: ["a", "b", "c"] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items.$_.array.length();
        },
        expected: 3,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-_-exposes-object-handle-namespace", name: "proxy $_ exposes object handle namespace",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.$_.object.keys();
        },
        expected: ["name", "role"],
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-_-array-helper-mutates-current-array-path", name: "proxy $_ array helper mutates current array path",
        input: { items: ["a", "b"] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items.$_.array.push("c");
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "splice", path: ["items"], start: 2, removed: [], inserted: ["c"], prev: ["a", "b"], next: ["a", "b", "c"] },
        ],
        expectedRoot: { items: ["a", "b", "c"] },
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-_-object-helper-mutates-current-object-path", name: "proxy $_ object helper mutates current object path",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.$_.object.setKey("role", "user");
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: undefined, next: "user" },
        ],
        expectedRoot: { user: { name: "Ada", role: "user" } },
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-contract-setmany-creates-missing-object-key", name: "proxy contract setMany creates missing object key",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.$_.setMany({ role: "admin" });
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: undefined, next: "admin" },
        ],
        expectedRoot: { user: { name: "Ada", role: "admin" } },
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-then-access-returns-undefined", name: "proxy then access returns undefined",
        input: { then: "data" },
        act: (map) => {
          const proxy = map.proxy()  as any;
          return proxy.then;
        },
        expected: undefined,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-tojson-access-returns-undefined", name: "proxy toJSON access returns undefined",
        input: { toJSON: "data" },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.toJSON;
        },
        expected: undefined,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-constructor-access-returns-undefined", name: "proxy constructor access returns undefined",
        input: { constructor: "data" },
        act: (map) => {
          const proxy = map.proxy();
          return proxy.constructor;
        },
        expected: undefined,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-reserved-key-can-still-be-reached-through-_-handle", name: "proxy reserved key can still be reached through $_ handle",
        input: { then: "data" },
        act: (map) => {
          const p = map.proxy();
          return p.$_.object.getKey("then");
        },
        expected: "data",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-object.defineproperty-throws", name: "proxy Object.defineProperty throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          Object.defineProperty(proxy.user, "name", { value: "Grace" });
        },
        expectedMessage: "LiveMap proxy properties must not be defined directly.",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-object.setprototypeof-throws", name: "proxy Object.setPrototypeOf throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          Object.setPrototypeOf(proxy.user, {});
        },
        expectedMessage: "LiveMap proxy prototype must not be changed.",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-object.preventextensions-throws", name: "proxy Object.preventExtensions throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          Object.preventExtensions(proxy.user);
        },
        expectedMessage: "LiveMap proxy extensibility must not be changed.",
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-has-null-prototype", name: "proxy has null prototype",
        input: { user: { name: "Ada" } },
        act: (map) => Object.getPrototypeOf(map.proxy()),
        expected: null,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-hasownproperty-access-returns-undefined", name: "proxy hasOwnProperty access returns undefined",
        input: { hasOwnProperty: "data" },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.hasOwnProperty;
        },
        expected: undefined,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-direct-__proto__-reservation-hides-an-actual-own-data-property", name: "proxy direct __proto__ reservation hides an actual own data property",
        input: own_proto_data_input(),
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.__proto__;
        },
        expected: undefined,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-_-escape-reaches-an-actual-own-__proto__-data-property", name: "proxy $_ escape reaches an actual own __proto__ data property",
        input: own_proto_data_input(),
        act: (map) => map.proxy().$_.object.getKey("__proto__"),
        expected: "data",
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-prototype-like-key-can-still-be-reached-through-_-handle", name: "proxy prototype-like key can still be reached through $_ handle",
        input: { hasOwnProperty: "data" },
        act: (map) => map.proxy().$_.object.getKey("hasOwnProperty"),
        expected: "data",
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-max-safe-integer-numeric-string-builds-numeric-path", name: "proxy max safe integer numeric string builds numeric path",
        input: {},
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["9007199254740991"].$_.path();
        },
        expected: ["items", 9007199254740991],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-unsafe-integer-numeric-string-remains-object-key", name: "proxy unsafe integer numeric string remains object key",
        input: {},
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["9007199254740993"].$_.path();
        },
        expected: ["items", "9007199254740993"],
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-json.stringify-returns-empty-object", name: "proxy JSON.stringify returns empty object",
        input: { user: { name: "Ada" } },
        act: (map) => JSON.stringify(map.proxy()),
        expected: "{}",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-string-conversion-throws", name: "proxy String conversion throws",
        input: { user: { name: "Ada" } },
        act: (map) => String(map.proxy()),
        expectedMessage: "Cannot convert object to primitive value",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-concatenation-throws", name: "proxy concatenation throws",
        input: { user: { name: "Ada" } },
        act: (map) => `${map.proxy()}`,
        expectedMessage: "Cannot convert object to primitive value",
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-promise.resolve-treats-proxy-as-non-thenable", name: "proxy Promise.resolve treats proxy as non-thenable",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.then;
        },
        expected: undefined,
      }),
      read_case({
        suite: SUITE,
        caseId: "core-proxy-accepts-explicit-empty-path", name: "core proxy accepts explicit empty path",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy([]).$_.path(),
        expected: [],
      }),
      throwCase({
        suite: SUITE,
        caseId: "core-proxy-rejects-non-array-path", name: "core proxy rejects non-array path",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy("user" as never).$_.path(),
        expectedMessage: "LiveMap path is not an array",
      }),
      throwCase({
        suite: SUITE,
        caseId: "core-proxy-rejects-invalid-path-part", name: "core proxy rejects invalid path part",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy([{}] as never).$_.path(),
        expectedMessage: "LiveMap path part is not valid at index 0",
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-child-access-returns-stable-proxy-identity", name: "proxy child access returns stable proxy identity",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user === proxy.user;
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-nested-child-access-returns-stable-proxy-identity", name: "proxy nested child access returns stable proxy identity",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.name === proxy.user.name;
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-numeric-child-access-returns-stable-proxy-identity", name: "proxy numeric child access returns stable proxy identity",
        input: { items: [{ name: "Ada" }] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items[0] === proxy.items[0];
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-_-returns-stable-handle-identity", name: "proxy $_ returns stable handle identity",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.$_ === proxy.user.$_;
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-cached-_-handle-still-reflects-current-value", name: "proxy cached $_ handle still reflects current value",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          const handle = proxy.user.name.$_;
          handle.set("Grace");
          return handle.snap();
        },
        expected: "Grace",
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-schema-allows-valid-_-set", name: "proxy schema allows valid $_ set",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.name.$_.set("Grace");
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        ],
        expectedRoot: { user: { name: "Grace" } },
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-schema-rejects-invalid-_-set-before-mutation", name: "proxy schema rejects invalid $_ set before mutation",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.name.$_.set(12);
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received number",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-schema-rejects-invalid-array-helper-before-mutation", name: "proxy schema rejects invalid array helper before mutation",
        input: { items: [0, 1] },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            items: s.array(s.number),
          })));
          const proxy = map.proxy() as any;

          return proxy.items.$_.array.push("bad");
        },
        expectedMessage: "LiveMap schema rejected value at [\"items\"]:\n- LiveMap schema expected number at [\"items\",2], received string",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-schema-rejects-invalid-object-helper-before-mutation", name: "proxy schema rejects invalid object helper before mutation",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.object.setKey("age", "old");
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"age\"]:\n- LiveMap schema expected number at [\"user\",\"age\"], received string",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-schema-rejects-delete-required-field-before-mutation", name: "proxy schema rejects delete required field before mutation",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number.optional,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.name.$_.delete();
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received missing",
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-schema-allows-delete-optional-field", name: "proxy schema allows delete optional field",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number.optional,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.age.$_.delete();
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "delete", path: ["user", "age"], prev: 37, next: undefined },
        ],
        expectedRoot: { user: { name: "Ada" } },
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-schema-rejects-object.deletekey-required-field-before-mutation", name: "proxy schema rejects object.deleteKey required field before mutation",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number.optional,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.object.deleteKey("name");
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received missing",
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-schema-allows-object.deletekey-optional-field", name: "proxy schema allows object.deleteKey optional field",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object({
              name: s.string,
              age: s.number.optional,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.object.deleteKey("age");
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "delete", path: ["user", "age"], prev: 37, next: undefined },
        ],
        expectedRoot: { user: { name: "Ada" } },
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-exact-schema-rejects-unknown-object-helper-before-mutation", name: "proxy exact schema rejects unknown object helper before mutation",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object.exact({
              name: s.string,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.object.setKey("role", "admin");
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"role\"]:\n- LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-exact-schema-rejects-unknown-object-valued-set-before-mutation", name: "proxy exact schema rejects unknown object-valued set before mutation",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object.exact({
              name: s.string,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.set({ name: "Grace", role: "admin" });
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"role\"]:\n- LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]",
      }),
      throwCase({
        suite: SUITE,
        caseId: "proxy-exact-schema-rejects-unknown-replace-key-before-mutation", name: "proxy exact schema rejects unknown replace key before mutation",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object.exact({
              name: s.string,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.replace({ name: "Grace", role: "admin" });
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\"]:\n- LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]",
      }),
      commitCase({
        suite: SUITE,
        caseId: "proxy-exact-schema-allows-no-op-delete-of-absent-unknown-object-key", name: "proxy exact schema allows no-op delete of absent unknown object key",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.schema.use(hson.liveMap.schema.define((s) => s.object({
            user: s.object.exact({
              name: s.string,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.object.deleteKey("role");
        },
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),

    ] as const,
  };
}
