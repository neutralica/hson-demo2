import type { TestSuite } from "../../harness/core/test-contracts";
import {
  normalize_towl_room_id,
  resolve_towl_room_url,
  towl_host_id_for_room,
  towl_room_credential_key,
  towl_room_id_from_host_id,
  type TowlState,
} from "../../../src/app/demos/towl/index";
import { create_towl_authority_application } from "../../harness/hosted/towl-authority-application";
import { make_towl_socket, send_towl_action, towl_case } from "./towl-test-helpers";

function empty_application() {
  return create_towl_authority_application();
}

export function towl_room_suite(): TestSuite {
  const SUITE = "livehost/towl-rooms";
  return {
    suite: SUITE,
    cases: [
      towl_case(SUITE, "valid room IDs normalize consistently", () => ({
        simple: normalize_towl_room_id("abc123"),
        normalized: normalize_towl_room_id("  Team-42  "),
      }), { simple: "abc123", normalized: "team-42" }),
      towl_case(SUITE, "invalid room IDs are rejected", () => ({
        short: normalize_towl_room_id("abc"),
        symbols: normalize_towl_room_id("room_name"),
        leading: normalize_towl_room_id("-room12"),
        trailing: normalize_towl_room_id("room12-"),
        long: normalize_towl_room_id("a".repeat(25)),
      }), { short: undefined, symbols: undefined, leading: undefined, trailing: undefined, long: undefined }),
      towl_case(SUITE, "room host IDs are deterministic, distinct, and reversible", () => {
        const first = towl_host_id_for_room("room-a1");
        const same = towl_host_id_for_room("ROOM-A1");
        const second = towl_host_id_for_room("room-b2");
        return {
          first,
          same,
          second,
          distinct: first !== second,
          parsed: towl_room_id_from_host_id(first),
          malformed: towl_room_id_from_host_id("towl:ROOM-A1"),
        };
      }, {
        first: "towl:room-a1",
        same: "towl:room-a1",
        second: "towl:room-b2",
        distinct: true,
        parsed: "room-a1",
        malformed: undefined,
      }),
      towl_case(SUITE, "credential storage keys are scoped by room", () => ({
        first: towl_room_credential_key("room-a1"),
        second: towl_room_credential_key("room-b2"),
        distinct: towl_room_credential_key("room-a1") !== towl_room_credential_key("room-b2"),
      }), {
        first: "hson-livedemo.towl.room-a1.livehost-credential",
        second: "hson-livedemo.towl.room-b2.livehost-credential",
        distinct: true,
      }),
      towl_case(SUITE, "room URL resolution preserves unrelated address state", () => {
        const resolved = resolve_towl_room_url(
          new URL("https://example.test/demo?mode=play#rules"),
          () => "fixed-room",
        );
        const normalized = resolve_towl_room_url(new URL("https://example.test/demo?room=TEAM-42&mode=play#rules"));
        const invalid = resolve_towl_room_url(
          new URL("https://example.test/demo?room=not_valid&mode=play#rules"),
          () => "fixed-room",
        );
        return {
          generated: resolved.roomId,
          generatedUrl: resolved.url.toString(),
          changed: resolved.changed,
          normalized: normalized.roomId,
          normalizedUrl: normalized.url.toString(),
          invalidReplacement: invalid.roomId,
        };
      }, {
        generated: "fixed-room",
        generatedUrl: "https://example.test/demo?mode=play&room=fixed-room#rules",
        changed: true,
        normalized: "team-42",
        normalizedUrl: "https://example.test/demo?room=team-42&mode=play#rules",
        invalidReplacement: "fixed-room",
      }),
      towl_case(SUITE, "same room resolution reuses one authoritative runtime", () => {
        const application = empty_application();
        const hostId = towl_host_id_for_room("shared-room");
        try {
          const first = application.connect(hostId, make_towl_socket());
          const firstHost = application.store.get(hostId);
          const second = application.connect(hostId, make_towl_socket());
          return {
            connected: first.ok && second.ok,
            reused: firstHost === application.store.get(hostId),
            rooms: application.store.list().filter((entry) => entry.id.startsWith("towl:")).length,
          };
        } finally {
          application.dispose();
        }
      }, { connected: true, reused: true, rooms: 1 }),
      towl_case(SUITE, "different rooms keep authoritative state isolated", async () => {
        const application = empty_application();
        const firstHostId = towl_host_id_for_room("room-one");
        const secondHostId = towl_host_id_for_room("room-two");
        const first = make_towl_socket();
        const second = make_towl_socket();
        try {
          const firstConnected = application.connect(firstHostId, first);
          const secondConnected = application.connect(secondHostId, second);
          if (!firstConnected.ok || !secondConnected.ok) throw new Error("Expected both TOWL rooms to connect.");
          await first.receive({ type: "session-create", id: "room-one-session" });
          await send_towl_action(first, "join");
          const firstState = application.store.get(firstHostId)?.map.snap() as TowlState;
          const secondState = application.store.get(secondHostId)?.map.snap() as TowlState;
          return {
            separateHosts: application.store.get(firstHostId) !== application.store.get(secondHostId),
            firstJoined: firstState.player1.sessionId !== null,
            secondVacant: secondState.player1.sessionId === null,
          };
        } finally {
          application.dispose();
        }
      }, { separateHosts: true, firstJoined: true, secondVacant: true }),
      towl_case(SUITE, "two clients in one room share the same game", async () => {
        const application = empty_application();
        const hostId = towl_host_id_for_room("pair-room");
        const first = make_towl_socket();
        const second = make_towl_socket();
        try {
          if (!application.connect(hostId, first).ok || !application.connect(hostId, second).ok) {
            throw new Error("Expected shared TOWL room connections.");
          }
          await first.receive({ type: "session-create", id: "pair-first" });
          await second.receive({ type: "session-create", id: "pair-second" });
          await send_towl_action(first, "join");
          await send_towl_action(second, "join");
          const state = application.store.get(hostId)?.map.snap() as TowlState;
          return {
            phase: state.phase,
            occupied: [state.player1.sessionId !== null, state.player2.sessionId !== null],
          };
        } finally {
          application.dispose();
        }
      }, { phase: "ready", occupied: [true, true] }),
    ],
  };
}
