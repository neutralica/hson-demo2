import { create_livehost_client } from "hson-live/livehost";
import type { LiveHostSocketLike } from "hson-live/livehost";
import {
  create_hosted_test_livehost,
  run_hosted_replay_action,
  type HostedTestActions,
} from "./hosted-replay-action";
import type { TestSuite } from "../../app/demos/test/tests.types";

type Listener = (message: string) => void;

function expect_hosted(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted replay action: ${message}`);
}

function make_socket_pair(): readonly [LiveHostSocketLike, LiveHostSocketLike, readonly string[]] {
  const clientListeners = new Set<Listener>();
  const hostListeners = new Set<Listener>();
  const clientClose = new Set<() => void>();
  const hostClose = new Set<() => void>();
  const clientSent: string[] = [];

  function socket(
    sent: string[] | undefined,
    ownListeners: Set<Listener>,
    peerListeners: Set<Listener>,
    ownClose: Set<() => void>,
    peerClose: Set<() => void>,
  ): LiveHostSocketLike {
    return {
      send(message) {
        sent?.push(message);
        queueMicrotask(() => {
          for (const listener of peerListeners) listener(message);
        });
      },
      close() {
        queueMicrotask(() => {
          for (const listener of peerClose) listener();
        });
      },
      onMessage(listener) {
        ownListeners.add(listener);
        return () => ownListeners.delete(listener);
      },
      onClose(listener) {
        ownClose.add(listener);
        return () => ownClose.delete(listener);
      },
    };
  }

  return [
    socket(clientSent, clientListeners, hostListeners, clientClose, hostClose),
    socket(undefined, hostListeners, clientListeners, hostClose, clientClose),
    clientSent,
  ];
}

export function hosted_replay_action_in_memory_suite(): TestSuite {
  const suite = "livehost/hosted-replay-action-in-memory";
  return Object.freeze({
    suite,
    descriptor: Object.freeze({
      subject: "livehost",
      requirements: Object.freeze(["javascript", "node"] as const),
    }),
    cases: Object.freeze([Object.freeze({
      suite,
      name: "hosted replay action preserves request, result, and failure semantics",
      run: async () => {
expect_hosted(typeof document === "undefined", "document must be unavailable");
expect_hosted(typeof window === "undefined", "window must be unavailable");

const [clientSocket, hostSocket, clientSent] = make_socket_pair();
const host = create_hosted_test_livehost();
const client = create_livehost_client<undefined, HostedTestActions>({
  socket: clientSocket,
  actionId: () => "hosted-replay-1",
});
const disconnectHost = host.connect(hostSocket);
client.connect();

const result = await run_hosted_replay_action(client);
const actionMessages = clientSent
  .map((message) => JSON.parse(message) as { type?: unknown; name?: unknown })
  .filter((message) => message.type === "action");

expect_hosted(actionMessages.length === 1, "host must receive exactly one action request");
expect_hosted(actionMessages[0]?.name === "tests.run", "action name must be tests.run");
expect_hosted(
  JSON.parse(clientSent.find((message) => JSON.parse(message).type === "action") ?? "null").payload.suite === "livemap/replay",
  "request must round-trip through JSON",
);
expect_hosted(result.suite === "livemap/replay", "result must identify livemap/replay");
expect_hosted(typeof result.runId === "string" && result.runId.length > 0, "result must identify the hosted run");
expect_hosted(result.ok === true, "replay suite must pass");
expect_hosted(result.summary.fail === 0, "summary.fail must be zero");
expect_hosted(result.summary.cases === 45, "summary.cases must match the current replay suite count");
expect_hosted(JSON.parse(JSON.stringify(result)).summary.cases === result.summary.cases, "result must round-trip through JSON");

client.disconnect();
disconnectHost();

const unsupported = await create_hosted_test_livehost().dispatch_action({
  type: "action",
  id: "unsupported",
  name: "tests.run",
  payload: { suite: "other" },
} as never);
expect_hosted(unsupported.type === "error", "unsupported suite must be rejected");
expect_hosted(
  unsupported.type === "error" && unsupported.error.code === "LIVEHOST_SCHEMA_INVALID_PAYLOAD",
  "unsupported suite must use the schema rejection path",
);

const malformed = await create_hosted_test_livehost().dispatch_action({
  type: "action",
  id: "malformed",
  name: "tests.run",
  payload: null,
} as never);
expect_hosted(malformed.type === "error", "malformed payload must be rejected");

const infrastructureFailure = await create_hosted_test_livehost(async () => {
  throw new Error("runner infrastructure failed");
}).dispatch_action({
  type: "action",
  id: "runner-throws",
  name: "tests.run",
  payload: { suite: "livemap/replay" },
});
expect_hosted(infrastructureFailure.type === "error", "runner exception must reject the action");
expect_hosted(
  infrastructureFailure.type === "error" && infrastructureFailure.error.code === "LIVEHOST_ACTION_FAILED",
  "runner exception must use the existing action failure path",
);

const failedRun = await create_hosted_test_livehost(async () => ({
  ok: false,
  summary: {
    suites: 1,
    cases: 1,
    pass: 0,
    fail: 1,
    skip: 0,
    msTotal: 1,
    failures: [{ suite: "livemap/replay", name: "fails", err: "expected", ms: 1 }],
  },
})).dispatch_action({
  type: "action",
  id: "failed-cases",
  name: "tests.run",
  payload: { suite: "livemap/replay" },
});
expect_hosted(failedRun.type === "ack", "failed assertions must remain a successful action");
expect_hosted(
  failedRun.type === "ack"
    && typeof failedRun.result === "object"
    && failedRun.result !== null
    && !Array.isArray(failedRun.result)
    && failedRun.result.ok === false,
  "failed assertions must return ok false",
);
      },
    })]),
  });
}
