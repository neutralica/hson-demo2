// suites-path.ts

import { format_live_path, path_is_prefix, paths_overlap } from "hson-live";
import type { LivePath } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "./test-helpers";

export function livemap_suites_path(): TestSuite {
  const SUITE = "livemap-path";

  return {
    suite: SUITE,
    cases: [
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap exact path",
        a: ["user", "name"],
        b: ["user", "name"],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap empty root hears child",
        a: [],
        b: ["user", "name"],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap parent hears child",
        a: ["user"],
        b: ["user", "name"],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap child hears parent",
        a: ["user", "name"],
        b: ["user"],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap different root keys do not match",
        a: ["user"],
        b: ["profile"],
        expected: false,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap sibling paths do not match",
        a: ["user", "name"],
        b: ["user", "role"],
        expected: false,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap array parent hears indexed child",
        a: ["items"],
        b: ["items", 0],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap array index hears nested child",
        a: ["items", 0],
        b: ["items", 0, "name"],
        expected: true,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap array sibling indexes do not match",
        a: ["items", 0],
        b: ["items", 1],
        expected: false,
      }),
      make_path_overlap_case({
        suite: SUITE,
        name: "path overlap string zero and number zero do not match",
        a: ["items", "0"],
        b: ["items", 0],
        expected: false,
      }),
      make_path_prefix_case({
        suite: SUITE,
        name: "path prefix empty root prefixes child",
        prefix: [],
        path: ["user", "name"],
        expected: true,
      }),
      make_path_prefix_case({
        suite: SUITE,
        name: "path prefix exact path",
        prefix: ["user", "name"],
        path: ["user", "name"],
        expected: true,
      }),
      make_path_prefix_case({
        suite: SUITE,
        name: "path prefix parent prefixes child",
        prefix: ["user"],
        path: ["user", "name"],
        expected: true,
      }),
      make_path_prefix_case({
        suite: SUITE,
        name: "path prefix child does not prefix parent",
        prefix: ["user", "name"],
        path: ["user"],
        expected: false,
      }),
      make_path_prefix_case({
        suite: SUITE,
        name: "path prefix sibling does not match",
        prefix: ["user", "name"],
        path: ["user", "role"],
        expected: false,
      }),
      make_path_prefix_case({
        suite: SUITE,
        name: "path prefix number and string stay distinct",
        prefix: ["items", 0],
        path: ["items", "0", "name"],
        expected: false,
      }),
      make_format_live_path_case({
        suite: SUITE,
        name: "format live path empty root",
        path: [],
        expected: "[]",
      }),
      make_format_live_path_case({
        suite: SUITE,
        name: "format live path single string part",
        path: ["user"],
        expected: "[\"user\"]",
      }),
      make_format_live_path_case({
        suite: SUITE,
        name: "format live path mixed string and number parts",
        path: ["items", 0, "name"],
        expected: "[\"items\", 0, \"name\"]",
      }),
      make_format_live_path_case({
        suite: SUITE,
        name: "format live path preserves string zero",
        path: ["items", "0", "name"],
        expected: "[\"items\", \"0\", \"name\"]",
      }),
    ] as const,
  };
}

type PathOverlapCaseSpec = Readonly<{
  suite: string;
  name: string;
  a: LivePath;
  b: LivePath;
  expected: boolean;
}>;

type PathPrefixCaseSpec = Readonly<{
  suite: string;
  name: string;
  prefix: LivePath;
  path: LivePath;
  expected: boolean;
}>;

type FormatLivePathCaseSpec = Readonly<{
  suite: string;
  name: string;
  path: LivePath;
  expected: string;
}>;

function make_path_overlap_case(spec: PathOverlapCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      a: preview_value(spec.a),
      b: preview_value(spec.b),
    },
    run: () => ({
      assertRows: [
        equal_row(spec.name, paths_overlap(spec.a, spec.b), spec.expected),
      ],
    }),
  };
}

function make_path_prefix_case(spec: PathPrefixCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      prefix: preview_value(spec.prefix),
      path: preview_value(spec.path),
    },
    run: () => ({
      assertRows: [
        equal_row(spec.name, path_is_prefix(spec.prefix, spec.path), spec.expected),
      ],
    }),
  };
}

function make_format_live_path_case(spec: FormatLivePathCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      path: preview_value(spec.path),
    },
    run: () => ({
      assertRows: [
        equal_row(spec.name, format_live_path(spec.path), spec.expected),
      ],
    }),
  };
}