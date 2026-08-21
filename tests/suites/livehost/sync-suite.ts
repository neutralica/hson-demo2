// livehost/sync-suite.ts

import { create_locus, make_locus_sync_manager } from "hson-live/locus";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "../livemap/test-helpers";

type LocusSyncReadCaseSpec = Readonly<{
  suite: string;
  caseId: string; name: string;
  input: unknown;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>;

function locus_sync_read_case(spec: LocusSyncReadCaseSpec): TestCase {
  return {
    suite: spec.suite,
    caseId: spec.caseId, name: spec.name,
    meta: {
      input: preview_value(spec.input),
    },
    run: async () => {
      const value = await spec.act();

      return {
        assertRows: [
          equal_row(`${spec.name}: value`, value, spec.expected),
        ],
      };
    },
  };
}

export function locus_sync_suite(): TestSuite {
  const SUITE = "livehost/sync";

  return {
    suite: SUITE,
    cases: [
      locus_sync_read_case({
        suite: SUITE,
        caseId: "subscribe-sends-current-path-value", name: "subscribe sends current path value",
        input: {},
        act: async () => {
          const host = create_locus({ state: { ui: { selected: "home" } } });
          const sent: unknown[] = [];
          const sync = make_locus_sync_manager(host.map);

          const added = sync.add_session("session-a", (message) => sent.push(message));
          const subscribed = sync.subscribe("session-a", ["ui", "selected"], 0);
          const [message] = sent as Array<Record<string, unknown>>;

          return {
            added: added.ok,
            subscribed: subscribed.ok,
            type: message?.type,
            seq: message?.seq,
            path: message?.path,
            value: message?.value,
          };
        },
        expected: {
          added: true,
          subscribed: true,
          type: "sync",
          seq: 0,
          path: ["ui", "selected"],
          value: "home",
        },
      }),
      locus_sync_read_case({
        suite: SUITE,
        caseId: "sync-all-sends-updated-subscribed-value", name: "sync all sends updated subscribed value",
        input: {},
        act: async () => {
          const host = create_locus({ state: { count: 0 } });
          const sent: unknown[] = [];
          const sync = make_locus_sync_manager(host.map);

          sync.add_session("session-a", (message) => sent.push(message));
          sync.subscribe("session-a", ["count"], 0);
          await host.mutate((draft) => draft.set(["count"], 1));
          sync.sync_all(1);

          const [, second] = sent as Array<Record<string, unknown>>;
          return {
            sentCount: sent.length,
            type: second?.type,
            seq: second?.seq,
            path: second?.path,
            value: second?.value,
          };
        },
        expected: {
          sentCount: 2,
          type: "sync",
          seq: 1,
          path: ["count"],
          value: 1,
        },
      }),
      locus_sync_read_case({
        suite: SUITE,
        caseId: "unsubscribe-prevents-later-sync", name: "unsubscribe prevents later sync",
        input: {},
        act: async () => {
          const host = create_locus({ state: { count: 0 } });
          const sent: unknown[] = [];
          const sync = make_locus_sync_manager(host.map);

          sync.add_session("session-a", (message) => sent.push(message));
          sync.subscribe("session-a", ["count"], 0);
          sync.unsubscribe("session-a", ["count"]);
          await host.mutate((draft) => draft.set(["count"], 1));
          sync.sync_all(1);

          return {
            sentCount: sent.length,
            first: sent[0],
          };
        },
        expected: {
          sentCount: 1,
          first: {
            type: "sync",
            seq: 0,
            path: ["count"],
            value: 0,
            format: "structural-json",
            formatVersion: 1,
            payload: "0",
          },
        },
      }),
      locus_sync_read_case({
        suite: SUITE,
        caseId: "remove-session-prevents-later-sync", name: "remove session prevents later sync",
        input: {},
        act: async () => {
          const host = create_locus({ state: { count: 0 } });
          const sent: unknown[] = [];
          const sync = make_locus_sync_manager(host.map);

          sync.add_session("session-a", (message) => sent.push(message));
          sync.subscribe("session-a", ["count"], 0);
          sync.remove_session("session-a");
          await host.mutate((draft) => draft.set(["count"], 1));
          sync.sync_all(1);

          return {
            sentCount: sent.length,
            sessions: sync.debug_sessions(),
          };
        },
        expected: {
          sentCount: 1,
          sessions: [],
        },
      }),
      locus_sync_read_case({
        suite: SUITE,
        caseId: "subscribed-path-is-copied-before-storage", name: "subscribed path is copied before storage",
        input: {},
        act: async () => {
          const host = create_locus({ state: { ui: { selected: "home" }, other: "nope" } });
          const sent: unknown[] = [];
          const sync = make_locus_sync_manager(host.map);
          const path: Array<string | number> = ["ui", "selected"];

          sync.add_session("session-a", (message) => sent.push(message));
          sync.subscribe("session-a", path, 0);
          path.splice(0, path.length, "other");
          await host.mutate((draft) => draft.set(["ui", "selected"], "settings"));
          sync.sync_all(1);

          const [, second] = sent as Array<Record<string, unknown>>;
          return {
            path: second?.path,
            value: second?.value,
            debug: sync.debug_sessions(),
          };
        },
        expected: {
          path: ["ui", "selected"],
          value: "settings",
          debug: [{ sessionId: "session-a", paths: [["ui", "selected"]] }],
        },
      }),
      locus_sync_read_case({
        suite: SUITE,
        caseId: "sync-all-sends-one-message-per-subscribed-path", name: "sync all sends one message per subscribed path",
        input: {},
        act: async () => {
          const host = create_locus({ state: { user: { name: "Ada" }, count: 0 } });
          const sent: unknown[] = [];
          const sync = make_locus_sync_manager(host.map);

          sync.add_session("session-a", (message) => sent.push(message));
          sync.subscribe("session-a", ["user", "name"], 0);
          sync.subscribe("session-a", ["count"], 0);
          await host.mutate((draft) => draft.batch((tx) => {
            tx.set(["user", "name"], "Grace");
            tx.set(["count"], 1);
          }));
          sync.sync_all(1);

          const [, , third, fourth] = sent as Array<Record<string, unknown>>;
          return {
            sentCount: sent.length,
            third: {
              type: third?.type,
              seq: third?.seq,
              path: third?.path,
              value: third?.value,
            },
            fourth: {
              type: fourth?.type,
              seq: fourth?.seq,
              path: fourth?.path,
              value: fourth?.value,
            },
          };
        },
        expected: {
          sentCount: 4,
          third: {
            type: "sync",
            seq: 1,
            path: ["user", "name"],
            value: "Grace",
          },
          fourth: {
            type: "sync",
            seq: 1,
            path: ["count"],
            value: 1,
          },
        },
      }),
      locus_sync_read_case({
        suite: SUITE,
        caseId: "resubscribe-replaces-existing-path-without-duplicate-syncs", name: "resubscribe replaces existing path without duplicate syncs",
        input: {},
        act: async () => {
          const host = create_locus({ state: { count: 0 } });
          const sent: unknown[] = [];
          const sync = make_locus_sync_manager(host.map);

          sync.add_session("session-a", (message) => sent.push(message));
          sync.subscribe("session-a", ["count"], 0);
          sync.subscribe("session-a", ["count"], 0);
          await host.mutate((draft) => draft.set(["count"], 1));
          sync.sync_all(1);

          const [, , third, fourth] = sent as Array<Record<string, unknown> | undefined>;
          return {
            sentCount: sent.length,
            thirdType: third?.type,
            thirdSeq: third?.seq,
            thirdValue: third?.value,
            fourthType: fourth?.type,
            debug: sync.debug_sessions(),
          };
        },
        expected: {
          sentCount: 3,
          thirdType: "sync",
          thirdSeq: 1,
          thirdValue: 1,
          fourthType: undefined,
          debug: [{ sessionId: "session-a", paths: [["count"]] }],
        },
      }),
      locus_sync_read_case({
        suite: SUITE,
        caseId: "duplicate-session-is-rejected", name: "duplicate session is rejected",
        input: {},
        act: () => {
          const host = create_locus({ state: {} });
          const sync = make_locus_sync_manager(host.map);

          const first = sync.add_session("session-a", () => undefined);
          const second = sync.add_session("session-a", () => undefined);

          return {
            firstOk: first.ok,
            secondOk: second.ok,
            code: second.ok ? undefined : second.error.code,
            message: second.ok ? undefined : second.error.message,
          };
        },
        expected: {
          firstOk: true,
          secondOk: false,
          code: "LOCUS_DUPLICATE_SESSION",
          message: "Locus sync session already exists: session-a",
        },
      }),
      locus_sync_read_case({
        suite: SUITE,
        caseId: "unknown-session-subscribe-is-rejected", name: "unknown session subscribe is rejected",
        input: {},
        act: () => {
          const host = create_locus({ state: {} });
          const sync = make_locus_sync_manager(host.map);
          const result = sync.subscribe("missing-session", ["count"], 0);

          return {
            ok: result.ok,
            code: result.ok ? undefined : result.error.code,
            message: result.ok ? undefined : result.error.message,
          };
        },
        expected: {
          ok: false,
          code: "LOCUS_UNKNOWN_SESSION",
          message: "Unknown Locus sync session: missing-session",
        },
      }),
    ] as const,
  };
}
