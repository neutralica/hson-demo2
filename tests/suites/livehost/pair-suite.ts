import { hson } from "hson-live";
import { create_echo } from "hson-live/echo";
import { create_locus, decode_locus_server_message } from "hson-live/locus";
import type { LocusSocketLike } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { equal_row, preview_value } from "../livemap/test-helpers";

type Socket = LocusSocketLike & Readonly<{ sent(): Array<Record<string, unknown>> }>;

function make_socket_pair(): readonly [Socket, Socket] {
  const firstMessages = new Set<(message: string) => void>();
  const secondMessages = new Set<(message: string) => void>();
  const firstCloses = new Set<() => void>();
  const secondCloses = new Set<() => void>();
  const firstSent: string[] = [];
  const secondSent: string[] = [];
  const make = (
    ownSent: string[],
    peerMessages: Set<(message: string) => void>,
    ownMessages: Set<(message: string) => void>,
    peerCloses: Set<() => void>,
    ownCloses: Set<() => void>,
  ): Socket => Object.freeze({
    send(message: string) {
      ownSent.push(message);
      for (const listener of [...peerMessages]) listener(message);
    },
    close() { for (const listener of [...peerCloses]) listener(); },
    onMessage(listener: (message: string) => void) {
      ownMessages.add(listener);
      return () => ownMessages.delete(listener);
    },
    onClose(listener: () => void) {
      ownCloses.add(listener);
      return () => ownCloses.delete(listener);
    },
    sent: () => ownSent.map((message) => JSON.parse(message) as Record<string, unknown>),
  });
  return [
    make(firstSent, secondMessages, firstMessages, secondCloses, firstCloses),
    make(secondSent, firstMessages, secondMessages, firstCloses, secondCloses),
  ];
}

function read_case(spec: Readonly<{
  suite: string;
  caseId: string;
  name: string;
  act: () => unknown | Promise<unknown>;
  expected: unknown;
}>): TestCase {
  return {
    suite: spec.suite,
    caseId: spec.caseId,
    name: spec.name,
    meta: { input: preview_value({}) },
    run: async () => ({ assertRows: [equal_row(spec.name, await spec.act(), spec.expected)] }),
  };
}

export function locus_pair_suite(): TestSuite {
  const SUITE = "livehost/pair";
  return {
    suite: SUITE,
    cases: [
      read_case({
        suite: SUITE,
        caseId: "endpoint-establishes-session-with-authority",
        name: "endpoint establishes a semantic session with its authority",
        act: async () => {
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_locus({ state: {}, logicalMapId: "pair" });
          host.connect(hostSocket);
          const client = create_echo({ socket: clientSocket });
          client.connect();
          const session = await client.session.create();
          const result = {
            outbound: clientSocket.sent()[0]?.type,
            inbound: hostSocket.sent()[0]?.type,
            logicalMapId: session.logicalMapId,
            status: client.session.status,
          };
          client.dispose();
          host.dispose();
          return result;
        },
        expected: { outbound: "session-create", inbound: "session-created", logicalMapId: "pair", status: "attached" },
      }),
      read_case({
        suite: SUITE,
        caseId: "endpoint-action-mutates-authority",
        name: "endpoint action mutates only the authoritative map",
        act: async () => {
          type Actions = Readonly<{ increment: undefined }>;
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_locus<{ count: number }, Actions>({
            state: { count: 0 },
            logicalMapId: "counter",
            actions: {
              increment: async (context) => {
                await context.mutate((draft) => draft.set(["count"], 1));
              },
            },
          });
          host.connect(hostSocket);
          const client = create_echo<undefined, Actions>({ socket: clientSocket });
          client.connect();
          await client.session.create();
          const response = await client.action("increment");
          const result = {
            response: response.type,
            completionRev: response.type === "ack" ? response.seq : undefined,
            authorityRev: host.map.rev,
            count: host.map.at(["count"]).snap(),
            hasClientMap: "map" in client,
          };
          client.dispose();
          host.dispose();
          return result;
        },
        expected: { response: "ack", completionRev: 1, authorityRev: 1, count: 1, hasClientMap: false },
      }),
      read_case({
        suite: SUITE,
        caseId: "application-event-is-connection-scoped",
        name: "application event is observed at the invoking socket boundary",
        act: async () => {
          type Actions = Readonly<{ mark: { marker: string } }>;
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_locus<undefined, Actions>({
            state: undefined,
            logicalMapId: "events",
            actions: { mark: (context, payload) => context.emit_event("marked", payload) },
          });
          host.connect(hostSocket);
          const events: unknown[] = [];
          clientSocket.onMessage((raw) => {
            const decoded = decode_locus_server_message(raw);
            if (decoded.ok && decoded.value.type === "event") events.push(decoded.value.payload);
          });
          const client = create_echo<undefined, Actions>({ socket: clientSocket });
          client.connect();
          await client.session.create();
          await client.action("mark", { marker: "a" });
          const result = { events, hasOnEvent: "onEvent" in client };
          client.dispose();
          host.dispose();
          return result;
        },
        expected: { events: [{ marker: "a" }], hasOnEvent: false },
      }),
      read_case({
        suite: SUITE,
        caseId: "replica-recovers-explicit-map",
        name: "replica-bearing Echo recovers its explicitly supplied LiveMap",
        act: async () => {
          const [clientSocket, hostSocket] = make_socket_pair();
          const host = create_locus({ state: { count: 4 }, logicalMapId: "replica" });
          host.connect(hostSocket);
          const map = hson.liveMap.fromJson({ count: 0 });
          const client = create_echo({
            socket: clientSocket,
            map,
            recovery: { logicalMapId: "replica" },
          });
          client.connect();
          await client.session.create();
          const recovery = await client.recovery.recover();
          const result = {
            sameMap: client.map === map,
            strategy: recovery.strategy,
            count: map.at(["count"]).snap(),
            mapRev: map.rev,
            recoveryRev: client.recovery.lastAppliedRev,
          };
          client.dispose();
          host.dispose();
          return result;
        },
        expected: { sameMap: true, strategy: "snapshot", count: 4, mapRev: 0, recoveryRev: 0 },
      }),
      read_case({
        suite: SUITE,
        caseId: "two-endpoints-have-independent-sessions",
        name: "two endpoints establish independent sessions",
        act: async () => {
          const [firstClientSocket, firstHostSocket] = make_socket_pair();
          const [secondClientSocket, secondHostSocket] = make_socket_pair();
          const host = create_locus({ state: {}, logicalMapId: "shared" });
          host.connect(firstHostSocket);
          host.connect(secondHostSocket);
          const first = create_echo({ socket: firstClientSocket });
          const second = create_echo({ socket: secondClientSocket });
          first.connect();
          second.connect();
          const firstSession = await first.session.create();
          const secondSession = await second.session.create();
          const result = {
            distinct: firstSession.sessionId !== secondSession.sessionId,
            firstMap: firstSession.logicalMapId,
            secondMap: secondSession.logicalMapId,
          };
          first.dispose();
          second.dispose();
          host.dispose();
          return result;
        },
        expected: { distinct: true, firstMap: "shared", secondMap: "shared" },
      }),
    ],
  };
}
