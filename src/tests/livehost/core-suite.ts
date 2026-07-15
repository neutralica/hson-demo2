// livehost/core-suite.ts

import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { create_livehost } from "hson-live";
import { equal_row, preview_value } from "../livemap/test-helpers";

type LiveHostReadCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: unknown;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>;

function livehost_response_seq(response: unknown): number | undefined {
  // changed: generic LiveHost server events do not carry seq, so tests must narrow response messages before reading seq.
  if (typeof response !== "object" || response === null || !("seq" in response)) return undefined;

  const seq = (response as { seq?: unknown }).seq;
  return typeof seq === "number" ? seq : undefined;
}

function livehost_read_case(spec: LiveHostReadCaseSpec): TestCase {
  return {
    suite: spec.suite,
    name: spec.name,
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

export function livehost_core_suite(): TestSuite {
  const SUITE = "livehost/core";

  return {
    suite: SUITE,
    cases: [
      livehost_read_case({
        suite: SUITE,
        name: "create initializes map from state",
        input: {},
        act: () => {
          const host = create_livehost({
            state: { user: { name: "Ada" }, ui: { selected: "home" } },
          });

          return {
            root: host.map.snap(),
            user: host.map.at(["user", "name"]).snap(),
            selected: host.map.at(["ui", "selected"]).snap(),
          };
        },
        expected: {
          root: { user: { name: "Ada" }, ui: { selected: "home" } },
          user: "Ada",
          selected: "home",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "create starts seq at zero",
        input: {},
        act: () => {
          const host = create_livehost({ state: { ok: true } });
          return { seq: host.seq };
        },
        expected: { seq: 0 },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "create defaults to empty object state",
        input: {},
        act: () => {
          const host = create_livehost();
          return { root: host.map.snap() };
        },
        expected: { root: {} },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "action context sees current seq before ack increment",
        input: {},
        act: async () => {
          const seenSeqs: number[] = [];
          const host = create_livehost({
            state: {},
            actions: {
              record_seq: (ctx) => {
                seenSeqs.push(ctx.seq);
              },
            },
          });

          const first = await host.dispatch_action({ type: "action", id: "a1", name: "record_seq" });
          const second = await host.dispatch_action({ type: "action", id: "a2", name: "record_seq" });

          return {
            seenSeqs,
            firstSeq: livehost_response_seq(first),
            secondSeq: livehost_response_seq(second),
            hostSeq: livehost_response_seq(host),
          };
        },
        expected: {
          seenSeqs: [0, 1],
          firstSeq: 1,
          secondSeq: 2,
          hostSeq: 2,
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch action calls registered handler",
        input: {},
        act: async () => {
          let called = false;
          const host = create_livehost({
            state: {},
            actions: {
              mark_called: () => {
                called = true;
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "mark_called",
          });

          return {
            called,
            responseType: response.type,
            responseOk: response.type === "ack" ? response.ok : false,
            responseId: "id" in response ? response.id : undefined,
          };
        },
        expected: {
          called: true,
          responseType: "ack",
          responseOk: true,
          responseId: "action-a",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch action lets handler mutate map",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            actions: {
              rename_user: (ctx, payload) => {
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
                const name = (payload as { name?: unknown }).name;
                if (typeof name === "string") ctx.map.set(["user", "name"], name);
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: { name: "Grace" },
          });

          return {
            responseType: response.type,
            name: host.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          responseType: "ack",
          name: "Grace",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch action awaits async handler before ack",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { status: "idle" },
            actions: {
              mark_done: async (ctx) => {
                await Promise.resolve();
                ctx.map.set(["status"], "done");
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "mark_done",
          });

          return {
            responseType: response.type,
            seq: livehost_response_seq(response),
            hostSeq: livehost_response_seq(host),
            status: host.map.at(["status"]).snap(),
          };
        },
        expected: {
          responseType: "ack",
          seq: 1,
          hostSeq: 1,
          status: "done",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch action returns ack and increments seq",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: {},
            actions: {
              noop: () => undefined,
            },
          });

          const first = await host.dispatch_action({ type: "action", id: "a1", name: "noop" });
          const second = await host.dispatch_action({ type: "action", id: "a2", name: "noop" });

          return {
            firstSeq: livehost_response_seq(first),
            secondSeq: livehost_response_seq(second),
            hostSeq: livehost_response_seq(host),
          };
        },
        expected: {
          firstSeq: 1,
          secondSeq: 2,
          hostSeq: 2,
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch unknown action returns error without incrementing seq",
        input: {},
        act: async () => {
          const host = create_livehost({ state: {} });
          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "missing_action",
          });

          return {
            responseType: response.type,
            id: "id" in response ? response.id : undefined,
            ok: "ok" in response ? response.ok : undefined,
            seq: livehost_response_seq(response),
            hostSeq: livehost_response_seq(host),
            code: response.type === "error" ? response.error.code : undefined,
            message: response.type === "error" ? response.error.message : undefined,
          };
        },
        expected: {
          responseType: "error",
          id: "action-a",
          ok: false,
          seq: 0,
          hostSeq: 0,
          code: "LIVEHOST_UNKNOWN_ACTION",
          message: "Unknown LiveHost action: missing_action",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch thrown action returns error without incrementing seq",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: {},
            actions: {
              explode: () => {
                throw new Error("boom");
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "explode",
          });

          return {
            responseType: response.type,
            id: "id" in response ? response.id : undefined,
            ok: "ok" in response ? response.ok : undefined,
            seq: livehost_response_seq(response),
            hostSeq: livehost_response_seq(host),
            code: response.type === "error" ? response.error.code : undefined,
            message: response.type === "error" ? response.error.message : undefined,
          };
        },
        expected: {
          responseType: "error",
          id: "action-a",
          ok: false,
          seq: 0,
          hostSeq: 0,
          code: "LIVEHOST_ACTION_FAILED",
          message: "boom",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch rejected async action returns error without incrementing seq",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: {},
            actions: {
              reject: async () => {
                await Promise.resolve();
                throw new Error("async boom");
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "reject",
          });

          return {
            responseType: response.type,
            id: "id" in response ? response.id : undefined,
            ok: "ok" in response ? response.ok : undefined,
            seq: livehost_response_seq(response),
            hostSeq: livehost_response_seq(host),
            code: response.type === "error" ? response.error.code : undefined,
            message: response.type === "error" ? response.error.message : undefined,
          };
        },
        expected: {
          responseType: "error",
          id: "action-a",
          ok: false,
          seq: 0,
          hostSeq: 0,
          code: "LIVEHOST_ACTION_FAILED",
          message: "async boom",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "schema payload validator accepts valid payload",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            schema: {
              actions: {
                rename_user: {
                  payload: (value): value is { name: string } => {
                    return typeof value === "object"
                      && value !== null
                      && !Array.isArray(value)
                      && typeof (value as { name?: unknown }).name === "string";
                  },
                },
              },
            },
            actions: {
              rename_user: (ctx, payload) => {
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
                const name = (payload as { name?: unknown }).name;
                if (typeof name === "string") ctx.map.set(["user", "name"], name);
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: { name: "Grace" },
          });

          return {
            responseType: response.type,
            seq: livehost_response_seq(response),
            hostSeq: livehost_response_seq(host),
            name: host.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          responseType: "ack",
          seq: 1,
          hostSeq: 1,
          name: "Grace",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "schema payload validator rejects invalid payload without incrementing seq",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            schema: {
              actions: {
                rename_user: {
                  payload: (value): value is { name: string } => {
                    return typeof value === "object"
                      && value !== null
                      && !Array.isArray(value)
                      && typeof (value as { name?: unknown }).name === "string";
                  },
                },
              },
            },
            actions: {
              rename_user: (ctx, payload) => {
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
                const name = (payload as { name?: unknown }).name;
                if (typeof name === "string") ctx.map.set(["user", "name"], name);
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: { label: "Grace" },
          });

          return {
            responseType: response.type,
            ok: "ok" in response ? response.ok : undefined,
            seq: livehost_response_seq(response),
            hostSeq: livehost_response_seq(host),
            code: response.type === "error" ? response.error.code : undefined,
            message: response.type === "error" ? response.error.message : undefined,
            name: host.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          responseType: "error",
          ok: false,
          seq: 0,
          hostSeq: 0,
          code: "LIVEHOST_SCHEMA_INVALID_PAYLOAD",
          message: "Value failed LiveHost schema validation.",
          name: "Ada",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "schema payload decoder passes decoded value to handler",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            schema: {
              actions: {
                rename_user: {
                  payload: (value) => {
                    if (typeof value !== "string") {
                      return { ok: false, issues: ["name must be string"] } as const;
                    }

                    return { ok: true, value: { name: value } } as const;
                  },
                },
              },
            },
            actions: {
              rename_user: (ctx, payload) => {
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
                const name = (payload as { name?: unknown }).name;
                if (typeof name === "string") ctx.map.set(["user", "name"], name);
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: "Grace",
          });

          return {
            responseType: response.type,
            seq: livehost_response_seq(response),
            hostSeq: livehost_response_seq(host),
            name: host.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          responseType: "ack",
          seq: 1,
          hostSeq: 1,
          name: "Grace",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "schema payload decoder reports custom issues",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            schema: {
              actions: {
                rename_user: {
                  payload: (value) => {
                    if (typeof value !== "string") {
                      return { ok: false, issues: ["name must be string", "payload rejected"] } as const;
                    }

                    return { ok: true, value: { name: value } } as const;
                  },
                },
              },
            },
            actions: {
              rename_user: (ctx, payload) => {
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
                const name = (payload as { name?: unknown }).name;
                if (typeof name === "string") ctx.map.set(["user", "name"], name);
              },
            },
          });

          const response = await host.dispatch_action({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: { name: "Grace" },
          });

          return {
            responseType: response.type,
            ok: "ok" in response ? response.ok : undefined,
            seq: livehost_response_seq(response),
            hostSeq: livehost_response_seq(host),
            code: response.type === "error" ? response.error.code : undefined,
            message: response.type === "error" ? response.error.message : undefined,
            name: host.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          responseType: "error",
          ok: false,
          seq: 0,
          hostSeq: 0,
          code: "LIVEHOST_SCHEMA_INVALID_PAYLOAD",
          message: "name must be string; payload rejected",
          name: "Ada",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "create exposes schema reference",
        input: {},
        act: () => {
          const schema = {
            state: (value: unknown): value is { ok: boolean } => {
              return typeof value === "object"
                && value !== null
                && !Array.isArray(value)
                && typeof (value as { ok?: unknown }).ok === "boolean";
            },
          } as const;
          const host = create_livehost({
            state: { ok: true },
            schema,
          });

          return {
            sameSchema: host.schema === schema,
            root: host.map.snap(),
          };
        },
        expected: {
          sameSchema: true,
          root: { ok: true },
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "create applies state schema validator before map creation",
        input: {},
        act: () => {
          let validatorCalled = false;
          const host = create_livehost({
            state: { user: { name: "Ada" } },
            schema: {
              state: (value): value is { user: { name: string } } => {
                validatorCalled = true;
                return typeof value === "object"
                  && value !== null
                  && !Array.isArray(value)
                  && typeof (value as { user?: { name?: unknown } }).user?.name === "string";
              },
            },
          });

          return {
            validatorCalled,
            root: host.map.snap(),
          };
        },
        expected: {
          validatorCalled: true,
          root: { user: { name: "Ada" } },
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "create applies state schema decoder before map creation",
        input: {},
        act: () => {
          const host = create_livehost({
            state: { user: { name: "  Ada  " } },
            schema: {
              state: (value) => {
                if (typeof value !== "object" || value === null || Array.isArray(value)) {
                  return { ok: false, issues: ["state must be object"] } as const;
                }

                const name = (value as { user?: { name?: unknown } }).user?.name;
                if (typeof name !== "string") {
                  return { ok: false, issues: ["state user name must be string"] } as const;
                }

                return { ok: true, value: { user: { name: name.trim() } } } as const;
              },
            },
          });

          return {
            root: host.map.snap(),
            name: host.map.at(["user", "name"]).snap(),
          };
        },
        expected: {
          root: { user: { name: "Ada" } },
          name: "Ada",
        },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch action returns json-safe handler result",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: {},
            actions: {
              read: () => ({ status: "done", count: 2 }),
            },
          });
          const response = await host.dispatch_action({ type: "action", id: "result-a", name: "read" });
          return response.type === "ack" ? response.result : undefined;
        },
        expected: { status: "done", count: 2 },
      }),
      livehost_read_case({
        suite: SUITE,
        name: "dispatch action rejects non-finite handler result",
        input: {},
        act: async () => {
          const host = create_livehost({
            state: {},
            actions: {
              invalid: () => Number.NaN,
            },
          });
          const response = await host.dispatch_action({ type: "action", id: "invalid-a", name: "invalid" });
          return {
            type: response.type,
            code: response.type === "error" ? response.error.code : undefined,
            seq: livehost_response_seq(response),
          };
        },
        expected: { type: "error", code: "LIVEHOST_ACTION_OUTCOME_NORMALIZATION_FAILED", seq: 0 },
      }),

    ] as const,
  };
}
