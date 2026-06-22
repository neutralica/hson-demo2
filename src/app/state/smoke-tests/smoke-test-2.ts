import { hson, type LiveTree } from "hson-live";
import type { JsonValue } from "hson-live/types";
import { create_test_log } from "../../demos/test/test-logger";
import { store_graph_entries } from "../store";
import { define_schema } from "../schema";
import { state_graph_entries, state_graph_key, state_graph_path_to_text } from "../state-graph";
import type { StateSmokeResult } from "../state.types";
import { state_smoke_test } from "./state-smoke-runner";

type TestLogSummary = {
  suites: number;
  cases: number;
  pass: number;
  fail: number;
  skip: number;
  msTotal: number;
};

type TestLogSnapshot = {
  summary: TestLogSummary;
  failures: readonly JsonValue[];
  lastLine: string;
};

type DynamicTestLog = {
  onEvent?: (event: JsonValue) => void;
  snapshot?: () => TestLogSnapshot;
  getSummary?: () => TestLogSummary;
  listFailures?: () => readonly JsonValue[];
  getLastLine?: () => string;
};

type LiveDomHost = {
  live: LiveTree;
  host: Element;
};

let domInteropCounter = 0;

function getDocument(): Document | undefined {
  if (typeof document === "undefined") return undefined;
  return document;
}

export function smoke_demo_state_graph_projection(): StateSmokeResult {
  return state_smoke_test("demo state graph projection", (t) => {
    t.step("demo graph exposes top-level state paths", () => {
      const entries = store_graph_entries();
      const byPath = new Map(entries.map((entry) => [entry.pathText, entry]));

      t.ok("root entry exists", byPath.has("$"));
      t.ok("ui currentView exists", byPath.has("$.ui.currentView"));
      t.ok("ui activeWidgets exists", byPath.has("$.ui.activeWidgets"));
      t.ok("theme color activePath exists", byPath.has("$.theme.colors.activePath"));
      t.ok("theme color tokens exists", byPath.has("$.theme.colors.tokens"));
    });

    t.step("demo graph includes schema matches", () => {
      const entries = store_graph_entries();
      const byPath = new Map(entries.map((entry) => [entry.pathText, entry]));
      const currentView = byPath.get("$.ui.currentView");
      const activeWidgets = byPath.get("$.ui.activeWidgets");
      const colorTokens = byPath.get("$.theme.colors.tokens");
      const colorValue = entries.find((entry) => (
        entry.path.length >= 5 &&
        entry.path[0] === "theme" &&
        entry.path[1] === "colors" &&
        entry.path[2] === "tokens" &&
        entry.path[4] === "value"
      ));

      t.ok("currentView has schema", currentView?.schema !== undefined);
      t.ok("currentView schema allows string", currentView?.schema?.types.includes("string") === true);
      t.ok("activeWidgets has schema", activeWidgets?.schema !== undefined);
      t.ok("color tokens has child entries", (colorTokens?.childCount ?? 0) > 0);
      t.ok("at least one color token value exists", colorValue !== undefined);
      t.ok("color token value has schema", colorValue?.schema !== undefined);
      t.ok("color token value schema allows string", colorValue?.schema?.types.includes("string") === true);
    });

    t.step("demo graph can project leaves only", () => {
      const entries = store_graph_entries({ includeContainers: false });
      const paths = entries.map((entry) => entry.pathText).join("|");

      t.ok("leaf graph has entries", entries.length > 0);
      t.ok("leaf graph omits root", !paths.includes("$|"));
      t.ok("leaf graph includes currentView", paths.includes("$.ui.currentView"));
      t.ok("leaf graph includes color token values", entries.some((entry) => (
        entry.path.length >= 5 &&
        entry.path[0] === "theme" &&
        entry.path[1] === "colors" &&
        entry.path[2] === "tokens" &&
        entry.path[4] === "value"
      )));
    });
  });
}

function liveDomHtmlOf(tree: LiveTree, label: string): HTMLElement {
  try {
    return tree.dom.must.html();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label}: ${message}`);
  }
}

function makeLiveDomHost(mountedHost: LiveTree | undefined): LiveDomHost | undefined {
  if (!mountedHost) return undefined;

  const live = mountedHost.create.div();

  return {
    live,
    host: liveDomHtmlOf(live, "LiveTree DOM interop host"),
  };
}

function makeForeignNode(doc: Document, label: string): HTMLElement {
  domInteropCounter += 1;

  const node = doc.createElement("span");
  node.id = `hson-dom-interop-${label}-${domInteropCounter}`;
  node.dataset.domInterop = label;
  node.textContent = `foreign:${label}`;

  return node;
}

function setLiveAttr(live: LiveTree, key: string, value: string): void {
  live.attr.set(key, value);
}

function setLiveCss(live: LiveTree, rules: Record<string, string>): void {
  live.css.setMany(rules);
}

function createLiveDiv(live: LiveTree): void {
  void live.create.div();
}

function emptyLiveTree(live: LiveTree): void {
  live.empty();
}

function asDynamicTestLog(value: unknown): DynamicTestLog {
  return value as DynamicTestLog;
}

function sendLogEvent(log: DynamicTestLog, event: JsonValue): void {
  if (typeof log.onEvent !== "function") {
    throw new Error("test log does not expose onEvent(event)");
  }

  log.onEvent(event);
}

function readLogSummary(log: DynamicTestLog): TestLogSummary {
  if (typeof log.getSummary === "function") return log.getSummary();
  if (typeof log.snapshot === "function") return log.snapshot().summary;

  throw new Error("test log does not expose getSummary() or snapshot()");
}

function readLogFailures(log: DynamicTestLog): readonly JsonValue[] {
  if (typeof log.listFailures === "function") return log.listFailures();
  if (typeof log.snapshot === "function") return log.snapshot().failures;

  throw new Error("test log does not expose listFailures() or snapshot()");
}

function readLastLine(log: DynamicTestLog): string {
  if (typeof log.getLastLine === "function") return log.getLastLine();
  if (typeof log.snapshot === "function") return log.snapshot().lastLine;

  throw new Error("test log does not expose getLastLine() or snapshot()");
}

function passLogEvents(log: DynamicTestLog): void {
  sendLogEvent(log, { t: "suite_begin", suite: "demo", total: 1 });
  sendLogEvent(log, { t: "case_begin", suite: "demo", name: "passes" });
  sendLogEvent(log, { t: "case_end", suite: "demo", name: "passes", status: "pass", ms: 4 });
  sendLogEvent(log, { t: "suite_end", suite: "demo", ms: 4 });
}


function failLogEvents(log: DynamicTestLog): void {
  sendLogEvent(log, { t: "suite_begin", suite: "demo", total: 1 });
  sendLogEvent(log, { t: "case_begin", suite: "demo", name: "fails" });
  sendLogEvent(log, {
    t: "case_end",
    suite: "demo",
    name: "fails",
    status: "fail",
    err: "expected failure",
    meta: { source: "smoke" },
    ms: 7,
  });
  sendLogEvent(log, { t: "suite_end", suite: "demo", ms: 7 });
}

export function smoke_state_graph_projection(): StateSmokeResult {
  return state_smoke_test("state graph projection", (t) => {
    const root = {
      count: 2,
      flag: true,
      none: null,
      ui: {
        activeWidgets: ["oklch"],
        currentView: "about",
      },
    } satisfies JsonValue;

    const schema = define_schema((scm) => ({
      count: scm.number,
      flag: scm.boolean,
      none: scm.null,
      ui: {
        activeWidgets: scm.string.array,
        currentView: scm.string,
      },
    }));

    t.step("path helpers are stable", () => {
      t.eq("root path text", state_graph_path_to_text([]), "$");
      t.eq("dotted path text", state_graph_path_to_text(["ui", "currentView"]), "$.ui.currentView");
      t.eq("array path text", state_graph_path_to_text(["ui", "activeWidgets", 0]), "$.ui.activeWidgets[0]");
      t.eq("quoted path text", state_graph_path_to_text(["not-simple"]), '$["not-simple"]');
      t.eq("path key", state_graph_key(["ui", "currentView"]), '["ui","currentView"]');
    });

    t.step("graph entries include containers by default", () => {
      const entries = state_graph_entries(root, { schema });
      const byPath = new Map(entries.map((entry) => [entry.pathText, entry]));
      const currentView = byPath.get("$.ui.currentView");
      const widgets = byPath.get("$.ui.activeWidgets");

      t.eq("entry count", entries.length, 8);
      t.ok("root entry exists", byPath.has("$"));
      t.ok("ui container exists", byPath.has("$.ui"));
      t.ok("array container exists", widgets !== undefined);
      t.eq("array child count", widgets?.childCount ?? -1, 1);
      t.eq("current view kind", currentView?.kind ?? "missing", "string");
      t.eq("current view preview", currentView?.valuePreview ?? "missing", '"about"');
      t.eq("current view schema type", currentView?.schema?.types.join("|") ?? "missing", "string");
    });

    t.step("graph entries can omit containers", () => {
      const entries = state_graph_entries(root, { includeContainers: false, schema });
      const paths = entries.map((entry) => entry.pathText).join("|");

      t.eq("leaf entry count", entries.length, 5);
      t.ok("leaf paths include array item", paths.includes("$.ui.activeWidgets[0]"));
      t.ok("leaf paths omit root", !paths.includes("$|"));
      t.ok("leaf paths omit ui container", !paths.includes("$.ui|"));
    });
  });
}

export function smoke_log_schema(): StateSmokeResult {
  return state_smoke_test("test log store schema", (t) => {
    t.step("test log records passing event flow", () => {
      const log = asDynamicTestLog(create_test_log());

      passLogEvents(log);

      const summary = readLogSummary(log);

      t.eq("summary suites", summary.suites as JsonValue, 1);
      t.eq("summary cases", summary.cases as JsonValue, 1);
      t.eq("summary pass", summary.pass as JsonValue, 1);
      t.eq("summary fail", summary.fail as JsonValue, 0);
      t.ok("last line is present", readLastLine(log).length > 0);
    });

    t.step("test log records failing event flow", () => {
      const log = asDynamicTestLog(create_test_log());

      failLogEvents(log);

      const summary = readLogSummary(log);
      const failures = readLogFailures(log);

      t.eq("summary suites", summary.suites as JsonValue, 1);
      t.eq("summary cases", summary.cases as JsonValue, 1);
      t.eq("summary pass", summary.pass as JsonValue, 0);
      t.eq("summary fail", summary.fail as JsonValue, 1);
      t.eq("failure count", failures.length as JsonValue, 1);
    });

  });
}

// export function smoke_livetree_dom_interop(mountedHost?: LiveTree): StateSmokeResult {
//   return state_smoke_test("livetree dom interop", (t) => {
//     t.step("native appendChild attaches unmanaged node", () => {
//       const doc = getDocument();

//       if (!doc) {
//         t.ok("document unavailable; dom interop smoke skipped", true);
//         return;
//       }

//       const domHost = makeLiveDomHost(mountedHost);

//       if (!domHost) {
//         t.ok("mounted LiveTree host unavailable; dom interop smoke skipped", true);
//         return;
//       }

//       const { host } = domHost;
//       const foreign = makeForeignNode(doc, "append");

//       host.appendChild(foreign);

//       t.ok("host contains foreign node", host.contains(foreign));
//       t.ok("native querySelector sees foreign node", host.querySelector(`#${foreign.id}`) === foreign);
//     });

//     t.step("native node survives LiveTree attr and css writes", () => {
//       const doc = getDocument();

//       if (!doc) {
//         t.ok("document unavailable; dom interop smoke skipped", true);
//         return;
//       }

//       const domHost = makeLiveDomHost(mountedHost);

//       if (!domHost) {
//         t.ok("mounted LiveTree host unavailable; dom interop smoke skipped", true);
//         return;
//       }

//       const { live, host } = domHost;
//       const foreign = makeForeignNode(doc, "non-destructive");

//       host.appendChild(foreign);
//       setLiveAttr(live, "data-dom-interop-live-write", "yes");
//       setLiveCss(live, { opacity: "1" });

//       t.ok("foreign node survives attr/css writes", host.contains(foreign));
//       t.ok("native querySelector still sees foreign node", host.querySelector(`#${foreign.id}`) === foreign);
//     });

//     t.step("native node survives LiveTree child append", () => {
//       const doc = getDocument();

//       if (!doc) {
//         t.ok("document unavailable; dom interop smoke skipped", true);
//         return;
//       }

//       const domHost = makeLiveDomHost(mountedHost);

//       if (!domHost) {
//         t.ok("mounted LiveTree host unavailable; dom interop smoke skipped", true);
//         return;
//       }

//       const { live, host } = domHost;
//       const foreign = makeForeignNode(doc, "live-child");

//       host.appendChild(foreign);
//       createLiveDiv(live);

//       t.ok("foreign node survives LiveTree create.div", host.contains(foreign));
//       t.ok("native querySelector still sees foreign node", host.querySelector(`#${foreign.id}`) === foreign);
//     });

//     t.step("native node is removed by LiveTree empty", () => {
//       const doc = getDocument();

//       if (!doc) {
//         t.ok("document unavailable; dom interop smoke skipped", true);
//         return;
//       }

//       const domHost = makeLiveDomHost(mountedHost);

//       if (!domHost) {
//         t.ok("mounted LiveTree host unavailable; dom interop smoke skipped", true);
//         return;
//       }

//       const { live, host } = domHost;
//       const foreign = makeForeignNode(doc, "empty");

//       host.appendChild(foreign);
//       t.ok("foreign node starts attached", host.contains(foreign));

//       emptyLiveTree(live);

//       t.ok("foreign node removed by empty", !host.contains(foreign));
//       t.ok("native querySelector no longer sees foreign node", host.querySelector(`#${foreign.id}`) === null);
//     });
//   });
// }

