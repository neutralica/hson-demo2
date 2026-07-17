import WebSocket from "ws";
import type { BrowserWebSocketConstructor } from "../../app/hosted-test/browser-websocket-socket";
import {
  make_hosted_test_panel_adapter,
  type HostedTestPanelReportUpdate,
} from "../../app/demos/test/hosted-test-panel-adapter";
import {
  make_remote_hosted_test_runtime,
  type HostedTestPanelRuntime,
} from "../../app/demos/test/hosted-test-panel-runtime";
import type { HostedTestSuiteId } from "../../app/hosted-test/hosted-test-suite";

export const TEST_WEBSOCKET_CONSTRUCTOR = WebSocket as unknown as BrowserWebSocketConstructor;

export function bounded<T>(promise: Promise<T>, label: string, timeoutMs = 30_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`HOSTED_TEST_TIMEOUT: ${label} exceeded ${timeoutMs}ms.`)), timeoutMs);
    void promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export async function eventually(check: () => boolean, label: string, timeoutMs = 2_000): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!check()) {
    if (performance.now() >= deadline) throw new Error(`HOSTED_TEST_TIMEOUT: ${label} did not settle within ${timeoutMs}ms.`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

export function make_real_websocket_runtime(url: string): HostedTestPanelRuntime {
  return make_remote_hosted_test_runtime({ url, WebSocketConstructor: TEST_WEBSOCKET_CONSTRUCTOR });
}

export function make_real_websocket_probe(runtime: HostedTestPanelRuntime) {
  const updates: HostedTestPanelReportUpdate[] = [];
  const errors: string[] = [];
  const adapter = make_hosted_test_panel_adapter(runtime, {
    reset() { updates.length = 0; errors.length = 0; },
    ingest(update) { updates.push(update); },
    showInfrastructureError(message) { errors.push(message); },
  });
  return Object.freeze({
    adapter,
    updates,
    errors,
    ready: () => bounded(runtime.ready(), "coordinator readiness"),
    start: (suite: HostedTestSuiteId) => bounded(adapter.start(suite), `${suite} terminal report`, 60_000),
    recover: (runId: string) => bounded(adapter.recover(runId), `report recovery for ${runId}`),
    dispose() {
      adapter.dispose();
      runtime.dispose();
    },
  });
}
