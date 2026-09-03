import type { TestSuite } from "../../harness/core/test-contracts";
import {
  classify_towl_entry_url,
  classify_towl_room_url,
  canonical_towl_invite_url,
  create_towl_room_url,
  normalize_towl_room_id,
  resolve_towl_room_url,
  towl_host_id_for_room,
  towl_departure_url,
  towl_room_credential_key,
  towl_room_id_from_host_id,
  type TowlState,
} from "../../../src/app/demos/towl/index";
import { create_towl_authority_application } from "../../../src/server/towl/towl-authority-application";
import { make_towl_socket, send_towl_action, towl_case } from "./towl-test-helpers";

function empty_application() {
  return create_towl_authority_application();
}

export function towl_room_suite(): TestSuite {
  const SUITE = "livehost/towl-rooms";
  return {
    suite: SUITE,
    cases: [
      towl_case(SUITE, "valid-room-ids-normalize-consistently", "valid room IDs normalize consistently", () => ({
        simple: normalize_towl_room_id("abc123"),
        normalized: normalize_towl_room_id("  Team-42  "),
      }), { simple: "abc123", normalized: "team-42" }),
      towl_case(SUITE, "invalid-room-ids-are-rejected", "invalid room IDs are rejected", () => ({
        short: normalize_towl_room_id("abc"),
        symbols: normalize_towl_room_id("room_name"),
        leading: normalize_towl_room_id("-room12"),
        trailing: normalize_towl_room_id("room12-"),
        long: normalize_towl_room_id("a".repeat(25)),
      }), { short: undefined, symbols: undefined, leading: undefined, trailing: undefined, long: undefined }),
      towl_case(SUITE, "room-host-ids-are-deterministic-distinct-and-reversible", "room host IDs are deterministic, distinct, and reversible", () => {
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
      towl_case(SUITE, "credential-storage-keys-are-scoped-by-room", "credential storage keys are scoped by room", () => ({
        first: towl_room_credential_key("room-a1"),
        second: towl_room_credential_key("room-b2"),
        distinct: towl_room_credential_key("room-a1") !== towl_room_credential_key("room-b2"),
      }), {
        first: "hson-livedemo.towl.room-a1.locus-credential",
        second: "hson-livedemo.towl.room-b2.locus-credential",
        distinct: true,
      }),
      towl_case(SUITE, "room-url-resolution-preserves-unrelated-address-state", "room URL resolution preserves unrelated address state", () => {
        const resolved = resolve_towl_room_url(
          new URL("https://example.test/demo?mode=play#rules"),
          () => "fixed-room",
        );
        const normalized = resolve_towl_room_url(new URL("https://example.test/demo?room=TEAM-42&mode=play#rules"));
        let invalidGeneratorCalls = 0;
        const invalidUrl = new URL("https://example.test/demo?room=not_valid&mode=play#rules");
        const invalid = classify_towl_room_url(invalidUrl);
        let invalidResolution = "accepted";
        try {
          resolve_towl_room_url(invalidUrl, () => {
            invalidGeneratorCalls += 1;
            return "fixed-room";
          });
        } catch {
          invalidResolution = "blocked";
        }
        const intentionalReplacement = create_towl_room_url(invalidUrl, () => "fixed-room");
        const direct = classify_towl_entry_url(new URL("https://example.test/towl"));
        const directInvalid = classify_towl_entry_url(new URL("https://example.test/towl?room=not_valid"));
        const ordinaryDeepLink = classify_towl_entry_url(new URL("https://example.test/?room=TEAM-42"));
        const ordinaryInvalid = classify_towl_entry_url(new URL("https://example.test/?room=not_valid"));
        const canonicalInvite = canonical_towl_invite_url(
          new URL("https://example.test/demo?room=team-42&mode=play#rules"),
          "TEAM-42",
        );
        const directDeparture = towl_departure_url(new URL("https://example.test/towl?room=team-42&mode=play#rules"));
        const ordinaryDeparture = towl_departure_url(new URL("https://example.test/demo?room=team-42&mode=play#rules"));
        return {
          generated: resolved.roomId,
          generatedUrl: resolved.url.toString(),
          changed: resolved.changed,
          normalized: normalized.roomId,
          normalizedUrl: normalized.url.toString(),
          invalidKind: invalid.kind,
          invalidRequested: invalid.kind === "invalid" ? invalid.requested : undefined,
          invalidResolution,
          invalidGeneratorCalls,
          intentionalReplacement: intentionalReplacement.url.toString(),
          directSelectsTowl: direct.selectsTowl,
          directInvalidSelectsTowl: directInvalid.selectsTowl,
          ordinaryDeepLinkSelectsTowl: ordinaryDeepLink.selectsTowl,
          ordinaryInvalidSelectsTowl: ordinaryInvalid.selectsTowl,
          canonicalInvite: canonicalInvite.toString(),
          directDeparture: directDeparture.toString(),
          ordinaryDeparture: ordinaryDeparture.toString(),
        };
      }, {
        generated: "fixed-room",
        generatedUrl: "https://example.test/demo?mode=play&room=fixed-room#rules",
        changed: true,
        normalized: "team-42",
        normalizedUrl: "https://example.test/demo?room=team-42&mode=play#rules",
        invalidKind: "invalid",
        invalidRequested: "not_valid",
        invalidResolution: "blocked",
        invalidGeneratorCalls: 0,
        intentionalReplacement: "https://example.test/demo?room=fixed-room&mode=play#rules",
        directSelectsTowl: true,
        directInvalidSelectsTowl: true,
        ordinaryDeepLinkSelectsTowl: true,
        ordinaryInvalidSelectsTowl: false,
        canonicalInvite: "https://example.test/towl?room=team-42",
        directDeparture: "https://example.test/?mode=play#rules",
        ordinaryDeparture: "https://example.test/demo?mode=play#rules",
      }),
      towl_case(SUITE, "same-room-resolution-reuses-one-authoritative-runtime", "same room resolution reuses one authoritative runtime", () => {
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
      towl_case(SUITE, "different-rooms-keep-authoritative-state-isolated", "different rooms keep authoritative state isolated", async () => {
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
      towl_case(SUITE, "two-clients-in-one-room-share-the-same-game", "two clients in one room share the same game", async () => {
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
      towl_case(SUITE, "bounded-room-sweeps-preserve-idle-age-and-activity", "bounded room sweeps preserve idle age and activity", async () => {
        let now = 1_000;
        let scheduled: (() => void) | undefined;
        let scheduleCalls = 0;
        const application = create_towl_authority_application({
          maxRooms: 1,
          idleMs: 100,
          sweepIntervalMs: 100,
          now: () => now,
          schedule: (_delayMs, callback) => {
            scheduleCalls += 1;
            scheduled = callback;
            return () => {
              if (scheduled === callback) scheduled = undefined;
            };
          },
        });
        const hostId = towl_host_id_for_room("idle-room");
        const flush = async (): Promise<void> => {
          for (let index = 0; index < 20; index += 1) await Promise.resolve();
        };
        try {
          const firstSocket = make_towl_socket();
          const first = await application.connectBounded(hostId, firstSocket);
          if (!first.ok) throw new Error(first.error.message);
          first.value();
          firstSocket.emit_close();
          await flush();
          const zeroAge = await application.sweep();
          now = 1_099;
          const belowThreshold = await application.sweep();
          now = 1_100;
          const threshold = await application.sweep();

          const secondSocket = make_towl_socket();
          const second = await application.connectBounded(hostId, secondSocket);
          if (!second.ok) throw new Error(second.error.message);
          now = 1_200;
          const active = await application.sweep();
          const activeRetained = application.hasRoom(hostId);
          second.value();
          secondSocket.emit_close();
          await flush();
          await new Promise<void>((resolve) => setTimeout(resolve, 110));
          const wallClockRetained = application.hasRoom(hostId);
          const zeroAgeScheduled = scheduled;
          if (zeroAgeScheduled === undefined) throw new Error("Expected an application-private scheduled sweep.");
          zeroAgeScheduled();
          await flush();
          const scheduledZeroAgeRetained = application.hasRoom(hostId);
          now = 1_300;
          const thresholdScheduled = scheduled;
          if (thresholdScheduled === undefined) throw new Error("Expected the application-private sweep to reschedule.");
          thresholdScheduled();
          await flush();
          await application.dispose();
          const schedulerCancelled = scheduled === undefined;
          return {
            zeroAge,
            belowThreshold,
            threshold,
            active,
            activeRetained,
            wallClockRetained,
            scheduledZeroAgeRetained,
            scheduledThresholdEvicted: !application.hasRoom(hostId),
            schedulerConsumed: scheduleCalls >= 3,
            schedulerCancelled,
          };
        } finally {
          await application.dispose();
        }
      }, {
        zeroAge: 0,
        belowThreshold: 0,
        threshold: 1,
        active: 0,
        activeRetained: true,
        wallClockRetained: true,
        scheduledZeroAgeRetained: true,
        scheduledThresholdEvicted: true,
        schedulerConsumed: true,
        schedulerCancelled: true,
      }),
    ],
  };
}
