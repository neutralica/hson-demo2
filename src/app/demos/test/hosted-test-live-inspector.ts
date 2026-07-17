import { hson, type LiveInspector, type LiveTree } from "hson-live";
import type { JsonValue, LivePath } from "hson-live/types";
import type { HostedTestSuiteId } from "../../hosted-test/hosted-test-suite";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";
import type { HostedTestPanelReportUpdate } from "./hosted-test-panel-adapter";
import {
  make_hosted_test_inspector_source,
  type HostedTestInspectorCase,
  type HostedTestInspectorSource,
  type HostedTestInspectorSourceSnapshot,
  type HostedTestInspectorState,
  type HostedTestInspectorSuite,
} from "./hosted-test-inspector-source";

export type HostedTestLiveInspector = Readonly<{
  root: LiveTree;
  inspector: LiveInspector;
  source: HostedTestInspectorSource;
  reset(suite: HostedTestSuiteId): void;
  ingest(update: HostedTestPanelReportUpdate): boolean;
  selectCase(caseKey: string): void;
  snapshot(): HostedTestInspectorSourceSnapshot;
  dispose(): void;
}>;

function is_record(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function is_suite(value: JsonValue): value is HostedTestInspectorSuite & JsonValue {
  return is_record(value) && typeof value.id === "string" && Array.isArray(value.cases) && is_record(value.summary);
}

function is_case(value: JsonValue | undefined): value is HostedTestInspectorCase & JsonValue {
  return is_record(value) && typeof value.key === "string" && typeof value.name === "string" && typeof value.status === "string" && typeof value.duration === "number";
}

function is_run(value: JsonValue): value is HostedTestInspectorState["run"] & JsonValue {
  return is_record(value) && "suite" in value && "status" in value && "timing" in value;
}

function summary_tree(text: string, tone: string): LiveTree {
  return hson.liveTree.create.span().text.set(text).css.setMany({ color: tone, fontWeight: "600" });
}

function array_key(item: JsonValue, context: Readonly<{ arrayPath: LivePath }>): string | number | undefined {
  const tail = context.arrayPath[context.arrayPath.length - 1];
  if (tail === "suites" && is_suite(item)) return item.id;
  if (tail === "cases" && is_case(item)) return item.key;
  return undefined;
}

export function make_hosted_test_live_inspector(host: LiveTree, initialSuite: HostedTestSuiteId = "livemap/replay"): HostedTestLiveInspector {
  const root = host.create.div().classlist.set("hosted-live-inspector").css.setMany({ width: "100%", minWidth: "0", overflow: "auto" });
  const inspectorHost = root.create.div();
  const selectedDetail = root.create.div().classlist.set("hosted-live-inspector-selection").css.setMany({
    marginTop: "0.5rem", padding: "0.5rem", borderTop: "1px solid rgba(125,216,207,.22)", color: "#d7ff70", whiteSpace: "pre-wrap",
  });
  selectedDetail.text.set("select a case to inspect its test-specific result");
  const source = make_hosted_test_inspector_source(initialSuite);
  let disposed = false;

  const inspector = hson.inspect.create({
    source: source.map,
    host: inspectorHost,
    initialDepth: 3,
    arrayKey: array_key,
    hsonMode: "none",
    showSchema: false,
    specializations: [
      {
        name: "hosted-run",
        priority: 30,
        match: is_run,
        render(handle) {
          let current = handle;
          const render = (): string => {
            const run = current.snap() as HostedTestInspectorState["run"];
            const elapsed = run.timing === null ? "running" : format_hosted_test_duration(run.timing.runnerMs);
            return `${run.suite} · ${run.status} · ${elapsed}`;
          };
          const tree = summary_tree(render(), "#d7ff70");
          return { tree, update(next) { current = next; tree.text.set(render()); } };
        },
      },
      {
        name: "hosted-suite",
        priority: 20,
        match: is_suite,
        render(handle) {
          let current = handle;
          const render = (): string => {
            const suite = current.snap() as unknown as HostedTestInspectorSuite;
            const summary = suite.summary;
            const duration = summary.duration === null ? "running" : format_hosted_test_duration(summary.duration);
            return `${suite.id} · ${summary.passed} pass · ${summary.failed} fail · ${summary.skipped} skip · ${duration}`;
          };
          const tree = summary_tree(render(), "#7dd8cf");
          return { tree, update(next) { current = next; tree.text.set(render()); } };
        },
      },
      {
        name: "hosted-case",
        priority: 20,
        match: is_case,
        render(handle) {
          let current = handle;
          const render = (): string => {
            const testCase = current.snap() as unknown as HostedTestInspectorCase;
            return `${testCase.status.toUpperCase()} · ${testCase.name} · ${format_hosted_test_duration(testCase.duration)}${testCase.error ? ` · ${testCase.error}` : ""}`;
          };
          const testCase = handle.snap() as unknown as HostedTestInspectorCase;
          const tree = summary_tree(render(), testCase.status === "fail" ? "#ff8778" : testCase.status === "skip" ? "#c4b070" : "#9ddf8b");
          return { tree, update(next) { current = next; tree.text.set(render()); } };
        },
      },
      {
        name: "hosted-timing",
        priority: 10,
        match(value, context) { return context.path[context.path.length - 1] === "timing" && is_record(value); },
        render(handle) {
          const timing = handle.snap() as unknown as { runnerMs: number; hostMs: number };
          return summary_tree(`runner ${format_hosted_test_duration(timing.runnerMs)} · host ${format_hosted_test_duration(timing.hostMs)}`, "#89948d");
        },
      },
    ],
  });

  const stopSelection = inspector.subscribe((snapshot) => {
    const path = snapshot.selection?.path;
    if (path === undefined || path[path.length - 2] !== "cases") {
      selectedDetail.text.set("select a case to inspect its test-specific result");
      return;
    }
    const value = source.map.at(path).snap();
    if (!is_case(value)) return;
    selectedDetail.text.set(`${value.status.toUpperCase()} ${value.name}\n${value.error ?? "no failure detail"}`);
  });

  return Object.freeze({
    root,
    inspector,
    source,
    reset(suite) {
      if (disposed) return;
      const map = source.reset(suite);
      inspector.replaceSource(map);
      selectedDetail.text.set("select a case to inspect its test-specific result");
    },
    ingest(update) { return disposed ? false : source.ingest(update); },
    selectCase(caseKey) {
      if (disposed) return;
      const path = source.pathForCase(caseKey);
      if (path !== undefined) inspector.select(path);
    },
    snapshot: () => source.snapshot(),
    dispose() {
      if (disposed) return;
      disposed = true;
      stopSelection();
      inspector.dispose();
      source.dispose();
      if (!root.isDisposed) root.remove();
    },
  });
}
