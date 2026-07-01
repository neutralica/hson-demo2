// proxy-suites.ts

import type { TestSuite } from "../../app/demos/test/tests.types";
import { readCase, commitCase, throwCase } from "./handle-helpers";



export function livemap_suites_proxy(): TestSuite {
  const SUITE = "livemap/handle/proxy";

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
      

    ] as const,
  };
}