// path-handle-suite.ts

import { hsonLiveMap } from "hson-live/livemap";
import type { TestSuite } from "../../harness/core/test-contracts";
import { read_case } from "./handle-helpers";

export function livemap_path_handle_suite(): TestSuite {
  const SUITE = "livemap/path-handle";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "same-map-and-canonical-path-return-the-interned-handle", name: "same map and canonical path return the interned handle",
        input: {},
        act: () => {
          const map = hsonLiveMap.fromJson({ user: { name: "Ada" } });
          const first = map.at(["user", "name"]);
          const second = map.at(["user", "name"]);

          return {
            sameHandle: first === second,
            sameRelativeHandle: map.at(["user"]).at(["name"]) === first,
          };
        },
        expected: {
          sameHandle: true,
          sameRelativeHandle: true,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "distinct-canonical-paths-return-distinct-handles", name: "distinct canonical paths return distinct handles",
        input: {},
        act: () => {
          const map = hsonLiveMap.fromJson({
            user: { name: "Ada" },
            settings: { theme: "dark" },
          });

          return map.at(["user"]) !== map.at(["settings"]);
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        caseId: "distinct-maps-never-share-handles-for-the-same-path", name: "distinct maps never share handles for the same path",
        input: {},
        act: () => {
          const first = hsonLiveMap.fromJson({ user: { name: "Ada" } });
          const second = hsonLiveMap.fromJson({ user: { name: "Ada" } });

          return first.at(["user"]) !== second.at(["user"]);
        },
        expected: true,
      }),
      read_case({
        suite: SUITE,
        caseId: "canonical-path-normalization-preserves-copies-and-path-part-distinctions", name: "canonical path normalization preserves copies and path-part distinctions",
        input: {},
        act: () => {
          const map = hsonLiveMap.fromJson({
            "0": "string key",
            items: ["array item"],
            user: { name: "Ada" },
          });
          const mutablePath: Array<string | number> = ["user", "name"];
          const copied = map.at(mutablePath);
          mutablePath.push("changed");

          return {
            copiedPath: copied.path(),
            copiedHandleReused: copied === map.at(["user", "name"]),
            stringAndNumberDistinct: map.at(["0"]) !== map.at([0]),
            numericIndexValue: map.at(["items", 0]).snap(),
          };
        },
        expected: {
          copiedPath: ["user", "name"],
          copiedHandleReused: true,
          stringAndNumberDistinct: true,
          numericIndexValue: "array item",
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "cached-handles-remain-positional-through-map-mutation", name: "cached handles remain positional through map mutation",
        input: {},
        act: () => {
          const map = hsonLiveMap.fromJson({ user: { name: "Ada" } });
          const handle = map.at(["user"]);
          map.replace(["user"], { name: "Grace" });

          return {
            sameHandle: handle === map.at(["user"]),
            currentValue: handle.snap(),
          };
        },
        expected: {
          sameHandle: true,
          currentValue: { name: "Grace" },
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "proxy-exit-returns-the-owning-map-cached-handle", name: "proxy exit returns the owning map cached handle",
        input: {},
        act: () => {
          const map = hsonLiveMap.fromJson({ user: { name: "Ada" } });
          const proxy = map.proxy() as any;

          return {
            sameHandle: proxy.user.$_ === map.at(["user"]),
            repeatedProxyExit: proxy.user.$_ === proxy.user.$_,
          };
        },
        expected: {
          sameHandle: true,
          repeatedProxyExit: true,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "path-handle-operations-work-without-a-public-identifier", name: "path-handle operations work without a public identifier",
        input: {},
        act: () => {
          const map = hsonLiveMap.fromJson({ count: 1 });
          const handle = map.at(["count"]);
          const before = "quid" in handle;
          const commit = handle.update((value) => Number(value) + 1);

          return {
            exposesQuid: before,
            changed: commit.changed,
            value: handle.snap(),
          };
        },
        expected: {
          exposesQuid: false,
          changed: true,
          value: 2,
        },
      }),
      read_case({
        suite: SUITE,
        caseId: "path-handle-creation-does-not-mint-canonical-hsonnode-quid-metadata", name: "path-handle creation does not mint canonical HsonNode QUID metadata",
        input: {},
        act: () => {
          const map = hsonLiveMap.fromJson({ nested: { value: 1 } });
          void map.at([]);
          void map.at(["nested"]);
          const proxy = map.proxy() as any;
          void proxy.nested.$_;

          return JSON.stringify(map.root()).includes('"quid"');
        },
        expected: false,
      }),
    ] as const,
  };
}
