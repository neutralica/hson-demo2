// proxy-suites.ts

import { define_livemap_schema } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { readCase, commitCase, throwCase } from "./handle-helpers";



export function livemap_suites_proxy(): TestSuite {
  const SUITE = "livemap/proxy";

  return {
    suite: SUITE,
    cases: [
      readCase({
        suite: SUITE,
        name: "proxy root $_ returns root handle path",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy().$_.path(),
        expected: [],
      }),
      readCase({
        suite: SUITE,
        name: "proxy string property builds path",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.name.$_.path();
        },
        expected: ["user", "name"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy numeric property builds array index path",
        input: { items: [{ name: "Ada" }] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items[0].name.$_.path();
        },
        expected: ["items", 0, "name"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy path-scoped root builds from starting path",
        input: { user: { profile: { name: "Ada" } } },
        act: (map) => {
          const proxy = map.proxy(["user"]) as any;
          return proxy.profile.name.$_.path();
        },
        expected: ["user", "profile", "name"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy $_ snap reads current value",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.name.$_.snap();
        },
        expected: "Ada",
      }),
      commitCase({
        suite: SUITE,
        name: "proxy $_ set writes current path",
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
        name: "proxy $_ delete deletes current path",
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
        name: "proxy direct assignment throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          proxy.user.name = "Grace";
        },
        expectedMessage: "LiveMap proxy values must be changed through $_.",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy direct delete throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          delete proxy.user.name;
        },
        expectedMessage: "LiveMap proxy values must be deleted through $_.",
      }),
      readCase({
        suite: SUITE,
        name: "proxy has $_ escape key",
        input: { user: { name: "Ada" } },
        act: (map) => "$_" in map.proxy(),
        expected: true,
      }),
      readCase({
        suite: SUITE,
        name: "proxy does not report data keys through in operator",
        input: { user: { name: "Ada" } },
        act: (map) => "user" in map.proxy(),
        expected: false,
      }),
      readCase({
        suite: SUITE,
        name: "proxy own keys reports only escape key",
        input: { user: { name: "Ada" } },
        act: (map) => Reflect.ownKeys(map.proxy()),
        expected: ["$_"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy Object.keys hides escape key",
        input: { user: { name: "Ada" } },
        act: (map) => Object.keys(map.proxy()),
        expected: [],
      }),
      readCase({
        suite: SUITE,
        name: "proxy numeric string property builds array index path",
        input: { items: [{ name: "Ada" }] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["0"].name.$_.path();
        },
        expected: ["items", 0, "name"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy leading-zero numeric string remains object key",
        input: { items: { "01": { name: "Ada" } } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["01"].name.$_.path();
        },
        expected: ["items", "01", "name"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy negative numeric string remains object key",
        input: { items: { "-1": { name: "Ada" } } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["-1"].name.$_.path();
        },
        expected: ["items", "-1", "name"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy decimal numeric string remains object key",
        input: { items: { "1.5": { name: "Ada" } } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["1.5"].name.$_.path();
        },
        expected: ["items", "1.5", "name"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy symbol access returns undefined",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy[Symbol.iterator];
        },
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "proxy $_ descriptor is non-enumerable",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const descriptor = Object.getOwnPropertyDescriptor(map.proxy(), "$_");
          return descriptor?.enumerable;
        },
        expected: false,
      }),
      readCase({
        suite: SUITE,
        name: "proxy $_ descriptor is configurable",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const descriptor = Object.getOwnPropertyDescriptor(map.proxy(), "$_");
          return descriptor?.configurable;
        },
        expected: true,
      }),
      readCase({
        suite: SUITE,
        name: "proxy unknown descriptor is undefined",
        input: { user: { name: "Ada" } },
        act: (map) => Object.getOwnPropertyDescriptor(map.proxy(), "user"),
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "proxy scoped $_ returns scoped handle path",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy(["user", "name"]).$_.path(),
        expected: ["user", "name"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy $_ exposes array handle namespace",
        input: { items: ["a", "b", "c"] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items.$_.array.length();
        },
        expected: 3,
      }),
      readCase({
        suite: SUITE,
        name: "proxy $_ exposes object handle namespace",
        input: { user: { name: "Ada", role: "user" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.$_.object.keys();
        },
        expected: ["name", "role"],
      }),
      commitCase({
        suite: SUITE,
        name: "proxy $_ array helper mutates current array path",
        input: { items: ["a", "b"] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items.$_.array.push("c");
        },
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["items"], prev: ["a", "b"], next: ["a", "b", "c"] },
        ],
        expectedRoot: { items: ["a", "b", "c"] },
      }),
      commitCase({
        suite: SUITE,
        name: "proxy $_ object helper mutates current object path",
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
      readCase({
        suite: SUITE,
        name: "proxy then access returns undefined",
        input: { then: "data" },
        act: (map) => {
          const proxy = map.proxy()  as any;
          return proxy.then;
        },
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "proxy toJSON access returns undefined",
        input: { toJSON: "data" },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.toJSON;
        },
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "proxy constructor access returns undefined",
        input: { constructor: "data" },
        act: (map) => {
          const proxy = map.proxy();
          return proxy.constructor;
        },
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "proxy reserved key can still be reached through $_ handle",
        input: { then: "data" },
        act: (map) => {
          const p = map.proxy();
          return p.$_.object.getKey("then");
        },
        expected: "data",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy Object.defineProperty throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          Object.defineProperty(proxy.user, "name", { value: "Grace" });
        },
        expectedMessage: "LiveMap proxy properties must not be defined directly.",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy Object.setPrototypeOf throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          Object.setPrototypeOf(proxy.user, {});
        },
        expectedMessage: "LiveMap proxy prototype must not be changed.",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy Object.preventExtensions throws",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          Object.preventExtensions(proxy.user);
        },
        expectedMessage: "LiveMap proxy extensibility must not be changed.",
      }),
      readCase({
        suite: SUITE,
        name: "proxy has null prototype",
        input: { user: { name: "Ada" } },
        act: (map) => Object.getPrototypeOf(map.proxy()),
        expected: null,
      }),
      readCase({
        suite: SUITE,
        name: "proxy hasOwnProperty access returns undefined",
        input: { hasOwnProperty: "data" },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.hasOwnProperty;
        },
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "proxy __proto__ access returns undefined",
        input: { __proto__: "data" },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.__proto__;
        },
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "proxy prototype-like key can still be reached through $_ handle",
        input: { hasOwnProperty: "data" },
        act: (map) => map.proxy().$_.object.getKey("hasOwnProperty"),
        expected: "data",
      }),
      readCase({
        suite: SUITE,
        name: "proxy max safe integer numeric string builds numeric path",
        input: {},
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["9007199254740991"].$_.path();
        },
        expected: ["items", 9007199254740991],
      }),
      readCase({
        suite: SUITE,
        name: "proxy unsafe integer numeric string remains object key",
        input: {},
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items["9007199254740993"].$_.path();
        },
        expected: ["items", "9007199254740993"],
      }),
      readCase({
        suite: SUITE,
        name: "proxy JSON.stringify returns empty object",
        input: { user: { name: "Ada" } },
        act: (map) => JSON.stringify(map.proxy()),
        expected: "{}",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy String conversion throws",
        input: { user: { name: "Ada" } },
        act: (map) => String(map.proxy()),
        expectedMessage: "Cannot convert object to primitive value",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy concatenation throws",
        input: { user: { name: "Ada" } },
        act: (map) => `${map.proxy()}`,
        expectedMessage: "Cannot convert object to primitive value",
      }),
      readCase({
        suite: SUITE,
        name: "proxy Promise.resolve treats proxy as non-thenable",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.then;
        },
        expected: undefined,
      }),
      readCase({
        suite: SUITE,
        name: "core proxy accepts explicit empty path",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy([]).$_.path(),
        expected: [],
      }),
      throwCase({
        suite: SUITE,
        name: "core proxy rejects non-array path",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy("user" as never).$_.path(),
        expectedMessage: "LiveMap path is not an array",
      }),
      throwCase({
        suite: SUITE,
        name: "core proxy rejects invalid path part",
        input: { user: { name: "Ada" } },
        act: (map) => map.proxy([{}] as never).$_.path(),
        expectedMessage: "LiveMap path part is not valid at index 0",
      }),
      readCase({
        suite: SUITE,
        name: "proxy child access returns stable proxy identity",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user === proxy.user;
        },
        expected: true,
      }),
      readCase({
        suite: SUITE,
        name: "proxy nested child access returns stable proxy identity",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.name === proxy.user.name;
        },
        expected: true,
      }),
      readCase({
        suite: SUITE,
        name: "proxy numeric child access returns stable proxy identity",
        input: { items: [{ name: "Ada" }] },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.items[0] === proxy.items[0];
        },
        expected: true,
      }),
      readCase({
        suite: SUITE,
        name: "proxy $_ returns stable handle identity",
        input: { user: { name: "Ada" } },
        act: (map) => {
          const proxy = map.proxy() as any;
          return proxy.user.$_ === proxy.user.$_;
        },
        expected: true,
      }),
      readCase({
        suite: SUITE,
        name: "proxy cached $_ handle still reflects current value",
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
        name: "proxy schema allows valid $_ set",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
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
        name: "proxy schema rejects invalid $_ set before mutation",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: {
              name: s.string,
            },
          })));
          const proxy = map.proxy() as any;

          return proxy.user.name.$_.set(12);
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received number",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy schema rejects invalid array helper before mutation",
        input: { items: [0, 1] },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            items: s.array(s.number),
          })));
          const proxy = map.proxy() as any;

          return proxy.items.$_.array.push("bad");
        },
        expectedMessage: "LiveMap schema rejected value at [\"items\"]:\n- LiveMap schema expected number at [\"items\",2], received string",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy schema rejects invalid object helper before mutation",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: {
              name: s.string,
              age: s.number,
            },
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.object.setKey("age", "old");
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"age\"]:\n- LiveMap schema expected number at [\"user\",\"age\"], received string",
      }),
      throwCase({
        suite: SUITE,
        name: "proxy schema rejects delete required field before mutation",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: {
              name: s.string,
              age: s.number.optional,
            },
          })));
          const proxy = map.proxy() as any;

          return proxy.user.name.$_.delete();
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received undefined",
      }),
      commitCase({
        suite: SUITE,
        name: "proxy schema allows delete optional field",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: {
              name: s.string,
              age: s.number.optional,
            },
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
        name: "proxy schema rejects object.deleteKey required field before mutation",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: {
              name: s.string,
              age: s.number.optional,
            },
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.object.deleteKey("name");
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"name\"]:\n- LiveMap schema expected string at [\"user\",\"name\"], received undefined",
      }),
      commitCase({
        suite: SUITE,
        name: "proxy schema allows object.deleteKey optional field",
        input: { user: { name: "Ada", age: 37 } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: {
              name: s.string,
              age: s.number.optional,
            },
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
        name: "proxy exact schema rejects unknown object helper before mutation",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: s.exact({
              name: s.string,
            }),
          })));
          const proxy = map.proxy() as any;

          return proxy.user.$_.object.setKey("role", "admin");
        },
        expectedMessage: "LiveMap schema rejected value at [\"user\",\"role\"]:\n- LiveMap schema does not allow key \"role\" at [\"user\",\"role\"]",
      }),
      commitCase({
        suite: SUITE,
        name: "proxy exact schema allows no-op delete of absent unknown object key",
        input: { user: { name: "Ada" } },
        act: (map) => {
          map.withSchema(define_livemap_schema((s) => ({
            user: s.exact({
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