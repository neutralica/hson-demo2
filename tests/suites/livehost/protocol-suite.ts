import {
  decode_locus_message,
  decode_locus_server_message,
  encode_locus_client_message,
  encode_locus_message,
} from "hson-live/locus";
import { HsonData } from "hson-live/hson";
import type { LocusClientMessage, LocusServerMessage } from "hson-live/locus";
import type { TestSuite } from "../../harness/core/test-contracts";
import { read_case } from "../livemap/handle-helpers";

export function locus_protocol_suite(): TestSuite {
  const SUITE = "livehost/protocol";
  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "current-client-messages-round-trip",
        name: "current session, action, recovery, and goodbye messages round-trip",
        input: {},
        act: () => ([
          { type: "session-create", id: "session-request" },
          { type: "session-attach", id: "attach-request", credential: "credential" },
          { type: "action", id: "action-a", name: "save", payload: HsonData.from({ id: 1 }) },
          { type: "recover", id: "recover-a", logicalMapId: "main", incarnationId: "inc", lastAppliedRev: 3 },
          { type: "session-goodbye", id: "goodbye-request" },
        ] satisfies readonly LocusClientMessage[]).map((message) => {
          const decoded = decode_locus_message(encode_locus_client_message(message));
          return decoded.ok ? decoded.value.type : decoded.error.message;
        }),
        expected: ["session-create", "session-attach", "action", "recover", "session-goodbye"],
      }),
      read_case({
        suite: SUITE,
        caseId: "retired-client-messages-reject",
        name: "retired hello and subscription messages reject",
        input: {},
        act: () => [
          { type: "hello" },
          { type: "subscribe", path: ["count"] },
          { type: "unsubscribe", path: ["count"] },
        ].map((message) => decode_locus_message(JSON.stringify(message)).ok),
        expected: [false, false, false],
      }),
      read_case({
        suite: SUITE,
        caseId: "current-server-messages-decode",
        name: "current session, acknowledgement, commit, and event messages decode",
        input: {},
        act: () => ([
          {
            type: "session-created", id: "create-a", sessionId: "session-a",
            credential: "credential-a", epoch: 1, logicalMapId: "main", incarnationId: "inc-a",
          },
          {
            type: "session-attached", id: "attach-a", sessionId: "session-a",
            epoch: 2, logicalMapId: "main", incarnationId: "inc-a",
          },
          { type: "ack", id: "action-a", ok: true, seq: 4, result: HsonData.from({ saved: true }) },
          { type: "event", event: "application.progress", payload: { completed: 1 } },
          {
            type: "commit", id: "recover-a",
            commit: {
              logicalMapId: "main", incarnationId: "inc-a", mode: "data-object",
              prevRev: 3, rev: 4,
              ops: [{
                kind: "set", path: ["saved"],
                prev: { present: false }, next: { present: true, value: true },
              }],
            },
          },
        ] satisfies readonly LocusServerMessage[]).map((message) => {
          const decoded = decode_locus_server_message(encode_locus_message(message));
          return decoded.ok ? decoded.value.type : decoded.error.message;
        }),
        expected: ["session-created", "session-attached", "ack", "event", "commit"],
      }),
      read_case({
        suite: SUITE,
        caseId: "retired-server-messages-reject",
        name: "retired server hello and sync messages reject",
        input: {},
        act: () => [
          { type: "hello", sessionId: "session-a", seq: 0, snapshot: {} },
          { type: "sync", seq: 1, path: ["count"], value: 1 },
        ].map((message) => decode_locus_server_message(JSON.stringify(message)).ok),
        expected: [false, false],
      }),
      read_case({
        suite: SUITE,
        caseId: "malformed-current-messages-reject",
        name: "malformed current messages reject without throwing",
        input: {},
        act: () => ({
          malformedJson: decode_locus_message("{").ok,
          sessionWithoutId: decode_locus_message(JSON.stringify({ type: "session-create" })).ok,
          eventWithoutPayload: decode_locus_server_message(JSON.stringify({ type: "event", event: "progress" })).ok,
          unknown: decode_locus_server_message(JSON.stringify({ type: "unknown" })).ok,
        }),
        expected: {
          malformedJson: false,
          sessionWithoutId: false,
          eventWithoutPayload: false,
          unknown: false,
        },
      }),
    ],
  };
}
