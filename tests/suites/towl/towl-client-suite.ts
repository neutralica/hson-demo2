// towl-client-suite.ts

import type {
  LiveHostDisposer,
  LiveHostSocketLike,
} from "hson-live/livehost";
import type { TestSuite } from "../../harness/core/test-contracts";
import {

  create_towl_runtime,

  type TowlRuntime,
} from "../../../src/app/demos/towl/index";
import { towl_case } from "./towl-test-helpers";
import { create_towl_client, towl_host_id_for_room, type TowlClient } from "../../../src/app/demos/towl/index";

type SocketEndpoint = LiveHostSocketLike & Readonly<{
  listener_count: () => number;
}>;

type SocketPair = Readonly<{
  host: SocketEndpoint;
  client: SocketEndpoint;
  close: () => void;
}>;

type ConnectedTowlClient = Readonly<{
  client: TowlClient;
  socket: SocketPair;
}>;

function make_socket_pair(): SocketPair {
  const hostMessages = new Set<(message: string) => void>();
  const hostCloses = new Set<() => void>();
  const clientMessages = new Set<(message: string) => void>();
  const clientCloses = new Set<() => void>();

  let closed = false;

  function send_to(
    listeners: ReadonlySet<(message: string) => void>,
    message: string,
  ): void {
    if (closed) return;

    for (const listener of [...listeners]) {
      listener(message);
    }
  }

  function close_pair(): void {
    if (closed) return;
    closed = true;

    for (const listener of [...hostCloses]) listener();
    for (const listener of [...clientCloses]) listener();

    hostMessages.clear();
    hostCloses.clear();
    clientMessages.clear();
    clientCloses.clear();
  }

  const host: SocketEndpoint = Object.freeze({
    send(message: string): void {
      send_to(clientMessages, message);
    },

    close: close_pair,

    onMessage(listener: (message: string) => void): LiveHostDisposer {
      if (closed) return () => {};

      hostMessages.add(listener);
      return () => {
        hostMessages.delete(listener);
      };
    },

    onClose(listener: () => void): LiveHostDisposer {
      if (closed) {
        listener();
        return () => {};
      }

      hostCloses.add(listener);
      return () => {
        hostCloses.delete(listener);
      };
    },

    listener_count(): number {
      return hostMessages.size + hostCloses.size;
    },
  });

  const client: SocketEndpoint = Object.freeze({
    send(message: string): void {
      send_to(hostMessages, message);
    },

    close: close_pair,

    onMessage(listener: (message: string) => void): LiveHostDisposer {
      if (closed) return () => {};

      clientMessages.add(listener);
      return () => {
        clientMessages.delete(listener);
      };
    },

    onClose(listener: () => void): LiveHostDisposer {
      if (closed) {
        listener();
        return () => {};
      }

      clientCloses.add(listener);
      return () => {
        clientCloses.delete(listener);
      };
    },

    listener_count(): number {
      return clientMessages.size + clientCloses.size;
    },
  });

  return Object.freeze({
    host,
    client,
    close: close_pair,
  });
}

async function settle_client(): Promise<void> {
  for (let index = 0; index < 12; index += 1) {
    await Promise.resolve();
  }
}

async function create_connected_client(
  runtime: TowlRuntime,
  clientId: string,
): Promise<ConnectedTowlClient> {
  const socket = make_socket_pair();

  runtime.host.connect(socket.host);

  const client = create_towl_client({
    socket: socket.client,
    clientId,
  });

  client.connect();
  await settle_client();
  await client.createSession();
  await settle_client();

  return Object.freeze({
    client,
    socket,
  });
}

async function with_runtime<TResult>(
  run: (runtime: TowlRuntime) => TResult | Promise<TResult>,
): Promise<TResult> {
  let nextSession = 0;

  const runtime = create_towl_runtime({
    logicalMapId: towl_host_id_for_room("client-room"),
    sessionId: () => `towl-client-session-${++nextSession}`,
  });

  try {
    return await run(runtime);
  } finally {
    runtime.dispose();
  }
}

function dispose_client(connection: ConnectedTowlClient): void {
  connection.client.disconnect();
  connection.socket.close();
}

export function towl_client_suite(): TestSuite {
  const SUITE = "livehost/towl-client";

  return {
    suite: SUITE,
    cases: [
      towl_case(
        SUITE,
        "client creates a resumable session and reflects lobby state",
        async () => with_runtime(async (runtime) => {
          const connection = await create_connected_client(
            runtime,
            "towl-client-first",
          );

          try {
            return {
              session: {
                status: connection.client.livehost.session.status,
                sessionId: connection.client.livehost.session.sessionId,
                hasCredential:
                  connection.client.livehost.session.credential !== undefined,
              },
              seat: connection.client.seat,
              state: connection.client.state,
            };
          } finally {
            dispose_client(connection);
          }
        }),
        {
          session: {
            status: "attached",
            sessionId: "towl-client-session-1",
            hasCredential: true,
          },
          seat: undefined,
          state: {
            phase: "lobby",
            player1: {
              sessionId: null,
              connected: false,
              ready: false,
            },
            player2: {
              sessionId: null,
              connected: false,
              ready: false,
            },
            position: 0,
            winner: null,
            round: 1,
          },
        },
      ),

      towl_case(
        SUITE,
        "join assigns the local client its authoritative seat",
        async () => with_runtime(async (runtime) => {
          const connection = await create_connected_client(
            runtime,
            "towl-client-first",
          );

          try {
            const result = await connection.client.join();
            await settle_client();

            return {
              result,
              seat: connection.client.seat,
              state: connection.client.state,
            };
          } finally {
            dispose_client(connection);
          }
        }),
        {
          result: {
            seat: "player1",
          },
          seat: "player1",
          state: {
            phase: "lobby",
            player1: {
              sessionId: "towl-client-session-1",
              connected: true,
              ready: false,
            },
            player2: {
              sessionId: null,
              connected: false,
              ready: false,
            },
            position: 0,
            winner: null,
            round: 1,
          },
        },
      ),

      towl_case(
        SUITE,
        "two clients join opposite seats and reflect the same state",
        async () => with_runtime(async (runtime) => {
          const first = await create_connected_client(
            runtime,
            "towl-client-first",
          );

          const second = await create_connected_client(
            runtime,
            "towl-client-second",
          );

          try {
            const firstJoin = await first.client.join();
            const secondJoin = await second.client.join();
            await settle_client();

            return {
              results: [
                firstJoin,
                secondJoin,
              ],
              seats: [
                first.client.seat,
                second.client.seat,
              ],
              firstState: first.client.state,
              secondState: second.client.state,
              equal:
                JSON.stringify(first.client.state)
                === JSON.stringify(second.client.state),
            };
          } finally {
            dispose_client(first);
            dispose_client(second);
          }
        }),
        {
          results: [
            {
              seat: "player1",
            },
            {
              seat: "player2",
            },
          ],
          seats: [
            "player1",
            "player2",
          ],
          firstState: {
            phase: "ready",
            player1: {
              sessionId: "towl-client-session-1",
              connected: true,
              ready: false,
            },
            player2: {
              sessionId: "towl-client-session-2",
              connected: true,
              ready: false,
            },
            position: 0,
            winner: null,
            round: 1,
          },
          secondState: {
            phase: "ready",
            player1: {
              sessionId: "towl-client-session-1",
              connected: true,
              ready: false,
            },
            player2: {
              sessionId: "towl-client-session-2",
              connected: true,
              ready: false,
            },
            position: 0,
            winner: null,
            round: 1,
          },
          equal: true,
        },
      ),

      towl_case(
        SUITE,
        "both clients becoming ready starts the round",
        async () => with_runtime(async (runtime) => {
          const first = await create_connected_client(
            runtime,
            "towl-client-first",
          );

          const second = await create_connected_client(
            runtime,
            "towl-client-second",
          );

          try {
            await first.client.join();
            await second.client.join();

            const firstReady = await first.client.setReady(true);
            const afterFirst = first.client.state.phase;

            const secondReady = await second.client.setReady(true);
            await settle_client();

            return {
              results: [
                firstReady,
                secondReady,
              ],
              afterFirst,
              firstState: first.client.state,
              secondState: second.client.state,
            };
          } finally {
            dispose_client(first);
            dispose_client(second);
          }
        }),
        {
          results: [
            {
              seat: "player1",
              ready: true,
            },
            {
              seat: "player2",
              ready: true,
            },
          ],
          afterFirst: "ready",
          firstState: {
            phase: "playing",
            player1: {
              sessionId: "towl-client-session-1",
              connected: true,
              ready: true,
            },
            player2: {
              sessionId: "towl-client-session-2",
              connected: true,
              ready: true,
            },
            position: 0,
            winner: null,
            round: 1,
          },
          secondState: {
            phase: "playing",
            player1: {
              sessionId: "towl-client-session-1",
              connected: true,
              ready: true,
            },
            player2: {
              sessionId: "towl-client-session-2",
              connected: true,
              ready: true,
            },
            position: 0,
            winner: null,
            round: 1,
          },
        },
      ),

      towl_case(
        SUITE,
        "pull exposes the domain result and updates both mirrors",
        async () => with_runtime(async (runtime) => {
          const first = await create_connected_client(
            runtime,
            "towl-client-first",
          );

          const second = await create_connected_client(
            runtime,
            "towl-client-second",
          );

          try {
            await first.client.join();
            await second.client.join();
            await first.client.setReady(true);
            await second.client.setReady(true);

            const result = await first.client.pull();
            await settle_client();

            return {
              result,
              first: {
                seat: first.client.seat,
                position: first.client.state.position,
                phase: first.client.state.phase,
              },
              second: {
                seat: second.client.seat,
                position: second.client.state.position,
                phase: second.client.state.phase,
              },
              canonicalPosition: runtime.host.map.snap().position,
            };
          } finally {
            dispose_client(first);
            dispose_client(second);
          }
        }),
        {
          result: {
            seat: "player1",
            position: 1,
            winner: null,
          },
          first: {
            seat: "player1",
            position: 1,
            phase: "playing",
          },
          second: {
            seat: "player2",
            position: 1,
            phase: "playing",
          },
          canonicalPosition: 1,
        },
      ),
    ],
  };
}
