import { create_livehost_client } from "hson-live";
import type { LiveHostClient, LiveHostSocketLike } from "hson-live/types";
import { create_hosted_test_livehost, type HostedTestActions } from "../../app/hosted-test/hosted-test-action";
import type { HostedTestSuiteRegistry } from "../../app/hosted-test/hosted-test-suite";

type MessageListener = (message: string) => void;

export type InMemoryHostedTestRuntime = Readonly<{
  client: LiveHostClient<undefined, HostedTestActions>;
  dispose(): void;
}>;

function make_socket_pair(): readonly [LiveHostSocketLike, LiveHostSocketLike] {
  const firstMessages = new Set<MessageListener>();
  const secondMessages = new Set<MessageListener>();
  const firstCloses = new Set<() => void>();
  const secondCloses = new Set<() => void>();
  function socket(ownMessages: Set<MessageListener>, peerMessages: Set<MessageListener>, ownCloses: Set<() => void>, peerCloses: Set<() => void>): LiveHostSocketLike {
    return {
      send(message) { queueMicrotask(() => { for (const listener of peerMessages) listener(message); }); },
      close() { queueMicrotask(() => { for (const listener of peerCloses) listener(); }); },
      onMessage(listener) { ownMessages.add(listener); return () => ownMessages.delete(listener); },
      onClose(listener) { ownCloses.add(listener); return () => ownCloses.delete(listener); },
    };
  }
  return [
    socket(firstMessages, secondMessages, firstCloses, secondCloses),
    socket(secondMessages, firstMessages, secondCloses, firstCloses),
  ];
}

export function make_in_memory_hosted_test_runtime(registry: HostedTestSuiteRegistry): InMemoryHostedTestRuntime {
  const [clientSocket, hostSocket] = make_socket_pair();
  const host = create_hosted_test_livehost(registry);
  const client = create_livehost_client<undefined, HostedTestActions>({ socket: clientSocket });
  const disconnectHost = host.connect(hostSocket);
  client.connect();
  let disposed = false;
  return Object.freeze({
    client,
    dispose() {
      if (disposed) return;
      disposed = true;
      client.disconnect();
      disconnectHost();
    },
  });
}
