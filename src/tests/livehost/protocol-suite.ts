// livehost/protocol-suite.ts

import { decode_livehost_message, encode_livehost_message } from "hson-live";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { read_case } from "../livemap/handle-helpers";


export function livehost_protocol_suite(): TestSuite {
  const SUITE = "livehost/protocol";

  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        name: "decode accepts hello message",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "hello",
            clientId: "client-a",
            lastSeq: 12,
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            clientId: decoded.ok && decoded.value.type === "hello" ? decoded.value.clientId : undefined,
            lastSeq: decoded.ok && decoded.value.type === "hello" ? decoded.value.lastSeq : undefined,
          };
        },
        expected: {
          ok: true,
          type: "hello",
          clientId: "client-a",
          lastSeq: 12,
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode accepts action message",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "action",
            id: "action-a",
            name: "rename_user",
            payload: { name: "Ada" },
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            id: decoded.ok && decoded.value.type === "action" ? decoded.value.id : undefined,
            name: decoded.ok && decoded.value.type === "action" ? decoded.value.name : undefined,
            payload: decoded.ok && decoded.value.type === "action" ? decoded.value.payload : undefined,
          };
        },
        expected: {
          ok: true,
          type: "action",
          id: "action-a",
          name: "rename_user",
          payload: { name: "Ada" },
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode accepts subscribe message",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "subscribe",
            path: ["ui", "selected"],
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            path: decoded.ok && decoded.value.type === "subscribe" ? decoded.value.path : undefined,
          };
        },
        expected: {
          ok: true,
          type: "subscribe",
          path: ["ui", "selected"],
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode accepts unsubscribe message",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "unsubscribe",
            path: ["ui", "selected"],
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            path: decoded.ok && decoded.value.type === "unsubscribe" ? decoded.value.path : undefined,
          };
        },
        expected: {
          ok: true,
          type: "unsubscribe",
          path: ["ui", "selected"],
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode accepts numeric path parts",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "subscribe",
            path: ["rows", 3, "label"],
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            path: decoded.ok && decoded.value.type === "subscribe" ? decoded.value.path : undefined,
          };
        },
        expected: {
          ok: true,
          type: "subscribe",
          path: ["rows", 3, "label"],
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode accepts primitive action payload",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "action",
            id: "action-a",
            name: "set_mode",
            payload: "compact",
          }));

          return {
            ok: decoded.ok,
            type: decoded.ok ? decoded.value.type : undefined,
            payload: decoded.ok && decoded.value.type === "action" ? decoded.value.payload : undefined,
          };
        },
        expected: {
          ok: true,
          type: "action",
          payload: "compact",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects invalid json",
        input: {},
        act: () => {
          const decoded = decode_livehost_message("{ nope");

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "Invalid LiveHost message JSON.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects non-object json",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify("hello"));

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "LiveHost message must be an object.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects unknown message type",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({ type: "mystery" }));

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "Unknown LiveHost message type.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects action without id",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "action",
            name: "rename_user",
          }));

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "LiveHost action message requires string id.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects action without name",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "action",
            id: "action-a",
          }));

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "LiveHost action message requires string name.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects subscribe without path",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "subscribe",
          }));

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "LiveHost subscribe message requires path.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects subscribe with invalid path parts",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "subscribe",
            path: ["ui", true],
          }));

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "LiveHost subscribe message requires path.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects unsubscribe without path",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify({
            type: "unsubscribe",
          }));

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "LiveHost unsubscribe message requires path.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "decode rejects top-level arrays",
        input: {},
        act: () => {
          const decoded = decode_livehost_message(JSON.stringify(["hello"]));

          return {
            ok: decoded.ok,
            message: decoded.ok ? undefined : decoded.error.message,
          };
        },
        expected: {
          ok: false,
          message: "LiveHost message must be an object.",
        },
      }),
      read_case({
        suite: SUITE,
        name: "encode serializes server messages as json",
        input: {},
        act: () => {
          const encoded = encode_livehost_message({
            type: "hello",
            sessionId: "session-a",
            seq: 7,
            snapshot: { user: { name: "Ada" } },
          });
          const parsed = JSON.parse(encoded) as Record<string, unknown>;

          return {
            type: parsed.type,
            sessionId: parsed.sessionId,
            seq: parsed.seq,
            snapshot: parsed.snapshot,
          };
        },
        expected: {
          type: "hello",
          sessionId: "session-a",
          seq: 7,
          snapshot: { user: { name: "Ada" } },
        },
      }),
    ] as const,
  };
}