import { hson, make_livemap_core } from "hson-live";
import type { JsonValue, LiveMapFeedEvent } from "hson-live/types";
import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { equal_row, make_core_set_case, make_core_snap_case, preview_value } from "./test-helpers";
import type { LiveMapFeedCaseSpec, LiveMapFeedEventPreview } from "./types";

export function livemap_suites_core(): TestSuite {
  const SUITE = "livemap-core";

  return {
    suite: SUITE,
    cases: [
      make_core_snap_case({
        suite: SUITE,
        name: "core snap root object",
        input: { user: { name: "Ada" } },
        expected: { user: { name: "Ada" } },
      }),
      make_core_snap_case({
        suite: SUITE,
        name: "core snap nested object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        expected: "Ada",
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set existing object property",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Grace",
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "name"], prev: "Ada", next: "Grace" },
        ],
        expectedRoot: { user: { name: "Grace" } },
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set missing object property",
        input: { user: { name: "Ada" } },
        path: ["user", "role"],
        value: "admin",
        expectedChanged: true,
        expectedOps: [
          { kind: "set", path: ["user", "role"], prev: undefined, next: "admin" },
        ],
        expectedRoot: { user: { name: "Ada", role: "admin" } },
      }),
      make_core_set_case({
        suite: SUITE,
        name: "core set existing object property unchanged",
        input: { user: { name: "Ada" } },
        path: ["user", "name"],
        value: "Ada",
        expectedChanged: false,
        expectedOps: [],
        expectedRoot: { user: { name: "Ada" } },
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed exact path hears set",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [
          {
            path: ["user", "name"],
            value: "Grace",
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed parent hears child set",
        input: { user: { name: "Ada" } },
        feedPath: ["user"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [
          {
            path: ["user"],
            value: { name: "Grace" },
            opPath: ["user", "name"],
            opPrev: "Ada",
            opNext: "Grace",
          },
        ],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed sibling ignores set",
        input: { user: { name: "Ada", role: "user" } },
        feedPath: ["user", "role"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [],
      }),
      make_core_feed_case({
        suite: SUITE,
        name: "core feed ignores unchanged set",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Ada",
        expectedEvents: [],
      }),
      make_core_feed_dispose_case({
        suite: SUITE,
        name: "core feed disposer stops later events",
        input: { user: { name: "Ada" } },
        feedPath: ["user", "name"],
        setPath: ["user", "name"],
        value: "Grace",
        expectedEvents: [],
      }),
    ] as const,
  };
}

function make_core_feed_case(spec: LiveMapFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const map = make_livemap_core(root);
      const events: LiveMapFeedEventPreview[] = [];

      map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      map.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function make_core_feed_dispose_case(spec: LiveMapFeedCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
    meta: {
      input: preview_value(spec.input),
      feedPath: preview_value(spec.feedPath),
      setPath: preview_value(spec.setPath),
      value: preview_value(spec.value),
    },
    run: () => {
      const root = json_root_node(spec.input);
      const map = make_livemap_core(root);
      const events: LiveMapFeedEventPreview[] = [];

      const dispose = map.feed(spec.feedPath, (event) => {
        events.push(preview_core_feed_event(event));
      });

      dispose();
      map.set(spec.setPath, spec.value);

      return {
        assertRows: [
          equal_row(`${spec.name}: events`, events, spec.expectedEvents),
        ],
      };
    },
  };
}

function preview_core_feed_event(event: LiveMapFeedEvent): LiveMapFeedEventPreview {
  return {
    path: event.path,
    value: event.value,
    opPath: event.op.path,
    opPrev: event.op.prev,
    opNext: event.op.next,
  };
}

function json_root_node(input: JsonValue) {
  return hson.fromJson(input).toHson().parse();
}
