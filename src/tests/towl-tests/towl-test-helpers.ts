import type { LiveHostSocketLike } from "hson-live";
import type { TestCase } from "../../app/demos/test/tests.types";
import { equal_row, preview_value } from "../livemap-tests/test-helpers";
import type { TowlActions, TowlRuntime } from "../../app/demos/towl";

export type TowlMemorySocket = LiveHostSocketLike & Readonly<{
  receive: (message: unknown) => Promise<void>;
  emit_close: () => void;
  sent: () => readonly Record<string, unknown>[];
  listener_count: () => number;
}>;

export function make_towl_socket(): TowlMemorySocket {
  const messages = new Set<(message: string) => void>();
  const closes = new Set<() => void>();
  const sent: string[] = [];
  return Object.freeze({
    send(message: string): void { sent.push(message); },
    close(): void { for (const listener of [...closes]) listener(); },
    onMessage(listener: (message: string) => void): () => void {
      messages.add(listener);
      return () => { messages.delete(listener); };
    },
    onClose(listener: () => void): () => void {
      closes.add(listener);
      return () => { closes.delete(listener); };
    },
    async receive(message: unknown): Promise<void> {
      const raw = JSON.stringify(message);
      for (const listener of [...messages]) listener(raw);
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    },
    emit_close(): void { for (const listener of [...closes]) listener(); },
    sent: () => sent.map((message) => JSON.parse(message) as Record<string, unknown>),
    listener_count: () => messages.size + closes.size,
  });
}

export function towl_case(
  suite: string,
  name: string,
  act: () => unknown | Promise<unknown>,
  expected: unknown,
): TestCase {
  return {
    suite,
    name,
    meta: { input: preview_value({}) },
    run: async () => {
      const actual = await act();

      return {
        assertRows: [
          equal_row(
            `${name}: actual=${preview_value(actual)} expected=${preview_value(expected)}`,
            actual,
            expected,
          ),
        ],
      };
    },
  };
}

export async function create_towl_session(
  runtime: TowlRuntime,
  socket: TowlMemorySocket,
  requestId: string,
): Promise<Readonly<{ sessionId: string; credential: string }>> {
  runtime.host.connect(socket);
  await socket.receive({ type: "session-create", id: requestId });
  const created = socket.sent().find((message) => message.type === "session-created" && message.id === requestId);
  if (typeof created?.sessionId !== "string" || typeof created.credential !== "string") {
    throw new Error("Expected TOWL resumable session creation.");
  }
  return Object.freeze({ sessionId: created.sessionId, credential: created.credential });
}

let nextActionId = 0;

export async function send_towl_action<TName extends keyof TowlActions & string>(
  socket: TowlMemorySocket,
  name: TName,
  payload?: TowlActions[TName],
  options: Readonly<{ clientId?: string; requestId?: string }> = {},
): Promise<Record<string, unknown>> {
  const id = `towl-action-${++nextActionId}`;

  await socket.receive({
    type: "action",
    id,
    name,
    ...(payload !== undefined ? { payload } : {}),
    ...(options.clientId !== undefined ? { clientId: options.clientId } : {}),
    ...(options.requestId !== undefined ? { requestId: options.requestId } : {}),
  });

  const sent = socket.sent();

  const response = sent.find((message) => (
    message.id === id
    && (message.type === "ack" || message.type === "error")
  ));

  if (response === undefined) {
    throw new Error(
      `Expected TOWL action response for ${name}. `
      + `id=${id}; `
      + `clientId=${options.clientId ?? "<none>"}; `
      + `requestId=${options.requestId ?? "<none>"}; `
      + `sent=${JSON.stringify(sent)}`,
    );
  }

  return response;
}


export async function join_towl_pair(runtime: TowlRuntime): Promise<Readonly<{
  first: TowlMemorySocket;
  second: TowlMemorySocket;
  firstSessionId: string;
  secondSessionId: string;
}>> {
  const first = make_towl_socket();
  const second = make_towl_socket();
  const firstSession = await create_towl_session(runtime, first, "create-first");
  const secondSession = await create_towl_session(runtime, second, "create-second");
  await send_towl_action(first, "join");
  await send_towl_action(second, "join");
  return Object.freeze({
    first,
    second,
    firstSessionId: firstSession.sessionId,
    secondSessionId: secondSession.sessionId,
  });
}

export async function start_towl_round(runtime: TowlRuntime): Promise<Awaited<ReturnType<typeof join_towl_pair>>> {
  const pair = await join_towl_pair(runtime);
  await send_towl_action(pair.first, "set_ready", { ready: true });
  await send_towl_action(pair.second, "set_ready", { ready: true });
  return pair;
}
