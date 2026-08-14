import WebSocket from "ws";
import { hson } from "hson-live";
import type { BrowserWebSocketConstructor } from "../../../src/app/demos/tests/hosted-client/browser-websocket-socket";
import { make_remote_hosted_test_runtime } from "../../../src/app/demos/tests/panel/hosted-test-panel-runtime";
import { make_hosted_test_panel_adapter, type HostedTestPanelSink } from "../../../src/app/demos/tests/panel/hosted-test-panel-adapter";
import { make_hosted_test_case_list, type HostedTestCaseList } from "../../../src/app/demos/tests/panel/hosted-test-case-list";
import {
  copy_hosted_case_report,
  open_hosted_case_report,
  render_hosted_case_diagnostic_html,
  serialize_hosted_case_diagnostic,
} from "../../../src/app/demos/tests/panel/hosted-test-report-view";
import { start_hosted_test_server } from "../../harness/runtimes/node/server/hosted-test-server";
import { make_hosted_test_run_retention } from "../../harness/hosted/hosted-test-action";
import { hosted_test_report_cases } from "../../harness/reporting/hosted/hosted-test-report.types";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";

function expect_inspect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted case inspection: ${message}`);
}

async function wait_for(condition: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (!condition() && Date.now() < deadline) await new Promise<void>((resolve) => setTimeout(resolve, 5));
  expect_inspect(condition(), message);
}

const retention = make_hosted_test_run_retention(2);
retention.retain("run-1", "node/all");
retention.retain("run-2", "dom/core");
retention.retain("run-3", "canvas/core");
expect_inspect(retention.size() === 2 && retention.get("run-1") === undefined, "run inspection retention evicts the oldest entry at its fixed bound");
retention.clear();
expect_inspect(retention.size() === 0, "run inspection retention clears on host shutdown");

const server = await start_hosted_test_server({ port: 0 });
const runtime = make_remote_hosted_test_runtime({
  url: server.url,
  WebSocketConstructor: WebSocket as unknown as BrowserWebSocketConstructor,
});
await runtime.ready();
const sink: HostedTestPanelSink = {
  reset() {}, ingest() {}, showInfrastructureError(message) { throw new Error(message); },
};
const adapter = make_hosted_test_panel_adapter(runtime, sink);
const result = await adapter.start("category/unit");
expect_inspect(result.summary.cases === 101, "focused Unit descriptor executes remotely");
const ordinary = await adapter.inspect("unit/test-harness::failed-assertion-row-fails-case-and-run");
expect_inspect(ordinary.type === "ordinary" && ordinary.caseKey.includes("unit/test-harness"), "ordinary inspection reruns one selected case");
expect_inspect(serialize_hosted_case_diagnostic(ordinary).includes(ordinary.name), "ordinary view/copy serializer contains the selected case");

const transformResult = await adapter.start("category/transform");
const registeredTransformCount = make_local_node_livehost_executor_registry().catalog.tests.filter(
  (descriptor) => descriptor.subject === "transform",
).length;
expect_inspect(
  transformResult.summary.cases === registeredTransformCount,
  "focused Transform descriptor executes the registered Transform cases remotely",
);
const transformReport = adapter.capture();
const transformCase = transformReport ? hosted_test_report_cases(transformReport)[0] : undefined;
expect_inspect(transformCase !== undefined, "transform report exposes a compact case identity");
const transform = await adapter.inspect(transformCase.key);
expect_inspect(transform.type === "transform" && transform.artifacts.length > 0, "transform inspection lazily returns full textual artifacts");

const portableCaseKey = ordinary.caseKey;
const circuitCaseKey = "livehost/circuit-worker-service::starts-exactly-one-persistent-worker";
const selected = await adapter.start_selected([portableCaseKey, circuitCaseKey]);
const selectedReport = adapter.capture();
expect_inspect(selected.summary.cases === 2 && selected.summary.pass === 2, "portable and Node-owned circuit cases execute in one selected run");
expect_inspect(selectedReport !== undefined, "selected run exposes a compact report for panel projection");
const selectedCases = hosted_test_report_cases(selectedReport);
expect_inspect(
  selectedCases.map((testCase) => testCase.key).sort().join("\n") === [portableCaseKey, circuitCaseKey].sort().join("\n"),
  "selected result rows retain the exact executor case IDs without duplicates",
);

const panelRuntime = install_hosted_dom_runtime();
try {
  const panelHost = hson.liveTree.queryBody().graft();
  const viewedKeys: string[] = [];
  const copiedKeys: string[] = [];
  const renderedViews = new Map<string, string>();
  const copiedReports = new Map<string, string>();
  let openedViews = 0;
  Object.defineProperty(panelRuntime.window, "open", {
    configurable: true,
    value: () => {
      openedViews += 1;
      return panelRuntime.window;
    },
  });
  Object.defineProperty(panelRuntime.window.navigator, "clipboard", {
    configurable: true,
    value: Object.freeze({
      async writeText(text: string) {
        const heading = text.split("\n", 1)[0] ?? "";
        copiedReports.set(heading, text);
      },
    }),
  });

  const actions = Object.freeze({
    async view(caseKey: string) {
      const diagnostic = await adapter.inspect(caseKey);
      viewedKeys.push(diagnostic.caseKey);
      renderedViews.set(diagnostic.caseKey, render_hosted_case_diagnostic_html(diagnostic));
      const originalSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = ((callback: () => void) => {
        callback();
        return 0;
      }) as typeof globalThis.setTimeout;
      try { open_hosted_case_report(diagnostic); }
      finally { globalThis.setTimeout = originalSetTimeout; }
    },
    async copy(caseKey: string) {
      const diagnostic = await adapter.inspect(caseKey);
      await copy_hosted_case_report(diagnostic);
      copiedKeys.push(diagnostic.caseKey);
    },
  });

  const mount_case_list = (): HostedTestCaseList => {
    const projection = make_hosted_test_case_list(panelHost, actions);
    projection.ingest(Object.freeze({
      report: selectedReport,
      newCases: selectedCases,
      newSuiteTimings: selectedReport.suites,
      terminal: true,
    }));
    for (const suite of new Set(selectedCases.map((testCase) => testCase.suite))) {
      projection.set_expanded(suite, true);
    }
    return projection;
  };

  const initialProjection = mount_case_list();
  expect_inspect(
    panelRuntime.document.querySelectorAll('[data-hosted-action="view"]').length === 2
      && panelRuntime.document.querySelectorAll('[data-hosted-action="copy"]').length === 2,
    "portable and Node-owned rows both render view and copy controls before remount",
  );
  initialProjection.dispose();

  const remountedProjection = mount_case_list();
  expect_inspect(remountedProjection.snapshot().metrics.listenerRegistrations === 1, "remounted case list owns one fresh delegated listener");
  for (const caseKey of [portableCaseKey, circuitCaseKey]) {
    const row = Array.from(panelRuntime.document.querySelectorAll<HTMLElement>(".hosted-case-row"))
      .find((candidate) => candidate.getAttribute("data-case-key") === caseKey);
    const view = row?.querySelector<HTMLElement>('[data-hosted-action="view"]');
    const copy = row?.querySelector<HTMLElement>('[data-hosted-action="copy"]');
    expect_inspect(
      view?.getAttribute("data-case-key") === caseKey && copy?.getAttribute("data-case-key") === caseKey,
      `remounted controls retain the intended case ID ${caseKey}`,
    );
    view.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    copy.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  }
  await wait_for(() => viewedKeys.length === 2 && copiedKeys.length === 2, "remounted view and copy actions both settle");
  for (const caseKey of [portableCaseKey, circuitCaseKey]) {
    const [suite, name] = caseKey.split("::");
    const heading = `${suite} :: ${name}`;
    expect_inspect(
      viewedKeys.includes(caseKey)
        && copiedKeys.includes(caseKey)
        && renderedViews.get(caseKey)?.includes(heading) === true
        && copiedReports.get(heading)?.includes(heading) === true,
      `view and copy resolve and serialize the same intended case ${caseKey}`,
    );
  }
  expect_inspect(openedViews === 2, "both remounted rows open their rendered inspection view");
  remountedProjection.dispose();
} finally {
  panelRuntime.dispose();
}

let unknownFailed = false;
try { await adapter.inspect("missing::case"); }
catch (error) { unknownFailed = error instanceof Error && error.message.includes("HOSTED_TEST_UNKNOWN_CASE"); }
expect_inspect(unknownFailed, "unknown case inspection fails visibly with stable identity");

adapter.dispose();
runtime.dispose();
await server.stop();
expect_inspect(typeof window === "undefined" && typeof document === "undefined", "inspection restores hosted DOM globals");
console.log(JSON.stringify({ ordinary: ordinary.caseKey, transform: transform.caseKey, artifacts: transform.artifacts.length }));
