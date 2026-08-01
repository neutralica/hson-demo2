import type { TestCase, TestSuite } from "../../app/demos/test/tests.types";
import { make_hosted_test_panel_adapter, type HostedTestPanelReportUpdate } from "../../app/demos/test/hosted-test-panel-adapter";
import {
  hosted_test_panel_selected_ids,
  hosted_test_panel_display_label,
  hosted_test_panel_primary_choices,
  hosted_test_panel_suite_choices,
  hosted_test_panel_test_choices,
} from "../../app/demos/test/hosted-test-panel-selection";
import type { ExternalLibraryLauncherTarget } from "../../test-system/external-library-launchers";
import { decode_selected_hosted_test_run_response } from "../../app/hosted-test/hosted-test-client-action";
import { make_hosted_test_suite_registry } from "../../app/hosted-test/hosted-test-suite";
import { make_test_executor_registry, type TestExecutorDescriptor } from "../../test-system/test-executor";
import { make_in_memory_hosted_test_runtime } from "../livehost-tests/in-memory-hosted-test-panel-runtime";
import { visible_external_launcher_stderr } from "../../app/demos/test/hosted-test-report-view";

function expect_panel(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 4B panel: ${message}`);
}

const bootstrapStderr = [
  "(node:123) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:",
  "--import 'data:text/javascript,register(\"ts-node/esm\")'",
  "(Use `node --trace-warnings ...` to show where the warning was created)",
  "(node:123) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.",
  "(Use `node --trace-deprecation ...` to show where the warning was created)",
  "meaningful warning",
].join("\n");
expect_panel(
  visible_external_launcher_stderr(bootstrapStderr) === "meaningful warning"
    && bootstrapStderr.includes("ExperimentalWarning"),
  "visible stderr removes only known ts-node/esm bootstrap blocks while raw diagnostics remain unchanged",
);
const originalReportName = "Original Report Name";
expect_panel(
  hosted_test_panel_display_label(originalReportName) === "original report name"
    && originalReportName === "Original Report Name",
  "lowercase selector projection does not mutate report-facing names",
);

let executions = 0;
const alphaCase: TestCase = Object.freeze({
  suite: "alpha/suite",
  name: "first",
  run: () => { executions += 1; },
});
const betaCase: TestCase = Object.freeze({
  suite: "beta/suite",
  name: "second",
  run: () => { executions += 1; },
});
const betaOtherCase: TestCase = Object.freeze({
  suite: "beta/suite",
  name: "third",
  descriptor: Object.freeze({ subject: "dev" }),
  run: () => { executions += 1; },
});
const fixtureSuites: readonly TestSuite[] = Object.freeze([
  Object.freeze({
    suite: "beta/suite",
    descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript"] as const), collections: Object.freeze([]) }),
    cases: Object.freeze([betaOtherCase, betaCase]),
  }),
  Object.freeze({
    suite: "alpha/suite",
    descriptor: Object.freeze({ subject: "integration", requirements: Object.freeze(["javascript"] as const), collections: Object.freeze([]) }),
    cases: Object.freeze([alphaCase]),
  }),
]);

function executor(kind: "node" | "cloudflare-worker"): TestExecutorDescriptor {
  return Object.freeze({
    id: kind === "node" ? "panel-node" : "panel-worker",
    kind,
    label: kind === "node" ? "Panel Node LiveHost" : "Panel Worker LiveHost",
    location: "hosted",
    capabilities: Object.freeze({ provides: Object.freeze(["javascript"] as const) }),
    supportsStreaming: true,
    supportsCancellation: false,
  });
}

const nodeRegistry = make_test_executor_registry(executor("node"), fixtureSuites);
const workerRegistry = make_test_executor_registry(executor("cloudflare-worker"), fixtureSuites);
const externalTarget = Object.freeze({
  id: "library::livehost.authority",
  launcherId: "livehost.authority",
  subject: "livehost",
  displayName: "Exclusive LiveHost authority",
  runtime: "node",
  executableChecks: 19,
  collections: Object.freeze(["authority"]),
}) satisfies ExternalLibraryLauncherTarget;
for (const registry of [nodeRegistry, workerRegistry]) {
  const targets = registry.executor.kind === "node" ? Object.freeze([externalTarget]) : Object.freeze([]);
  const choices = hosted_test_panel_primary_choices(registry.catalog.tests, targets);
  const expectedAllCases = registry.catalog.tests.length + (registry.executor.kind === "node" ? 19 : 0);
  expect_panel(
    choices[0]?.key === "all"
      && choices[0].label === `all (${expectedAllCases})`
      && !choices.some((choice) => choice.label.includes("All discovered tests")),
    `${registry.executor.kind} projection begins with the quiet all label`,
  );
  expect_panel(
    choices.map((choice) => choice.key).join("|") === "all|subject:livehost",
    `${registry.executor.kind} primary projection is curated`,
  );
  expect_panel(
    choices.every((choice) => hosted_test_panel_display_label(choice.label) === hosted_test_panel_display_label(choice.label).toLowerCase()),
    `${registry.executor.kind} visible primary labels are lowercase`,
  );
  const livehostPrimary = choices.find((choice) => choice.key === "subject:livehost");
  expect_panel(livehostPrimary !== undefined, `${registry.executor.kind} exposes the fixture category`);
  expect_panel(
    hosted_test_panel_suite_choices(registry.catalog.tests, targets, livehostPrimary.selection)
      .map((choice) => choice.key).join("|")
      === (registry.executor.kind === "node"
        ? "suite:library::livehost.authority|suite:beta/suite"
        : "suite:beta/suite"),
    `${registry.executor.kind} suite choices are filtered to the active primary category`,
  );
  const betaChoices = hosted_test_panel_test_choices(registry.catalog.tests, "beta/suite");
  expect_panel(
    betaChoices.map((choice) => choice.key).join("|")
      === "test:beta/suite::second|test:beta/suite::third"
      && betaChoices.every((choice) => choice.selection.kind === "test" && choice.count === 1),
    `${registry.executor.kind} targeted cases contain only the selected suite in deterministic order`,
  );
  expect_panel(
    betaChoices.every((choice) => hosted_test_panel_display_label(choice.label) === choice.label.toLowerCase())
      && betaChoices[0]?.selection.kind === "test"
      && betaChoices[0].selection.testId === "beta/suite::second",
    `${registry.executor.kind} lowercase display projection does not mutate canonical IDs`,
  );
  expect_panel(
    hosted_test_panel_test_choices(registry.catalog.tests, "alpha/suite")
      .every((choice) => !betaChoices.some((beta) => beta.key === choice.key)),
    `${registry.executor.kind} changing suites cannot retain a stale case choice`,
  );
  const all = hosted_test_panel_selected_ids(registry.catalog.tests, { kind: "all" }, targets);
  const subject = hosted_test_panel_selected_ids(registry.catalog.tests, { kind: "subject", subject: "livehost" });
  const suite = hosted_test_panel_selected_ids(registry.catalog.tests, { kind: "suite", suite: "beta/suite" });
  const exact = hosted_test_panel_selected_ids(registry.catalog.tests, { kind: "test", testId: "alpha/suite::first" });
  expect_panel(
    all.length === (registry.executor.kind === "node" ? 4 : 3) && new Set(all).size === all.length,
    `${registry.executor.kind} all selection is duplicate-free`,
  );
  expect_panel(
    all.filter((id) => id.startsWith("library::")).length === (registry.executor.kind === "node" ? 1 : 0),
    `${registry.executor.kind} all includes each available external target exactly once`,
  );
  expect_panel(subject.join() === "beta/suite::second", `${registry.executor.kind} subject projection is exact`);
  expect_panel(suite.join("|") === "beta/suite::second|beta/suite::third", `${registry.executor.kind} suite projection is exact`);
  expect_panel(exact.join() === "alpha/suite::first", `${registry.executor.kind} exact-test projection preserves the stable ID`);
  expect_panel(
    hosted_test_panel_selected_ids(registry.catalog.tests, { kind: "suite", suite: "missing" }).length === 0,
    `${registry.executor.kind} empty selections remain empty`,
  );
  if (registry.executor.kind === "node") {
    expect_panel(
      !choices.some((choice) => choice.key === "collection:library" || choice.label.includes("library verification")),
      "library verification is absent from the primary selector",
    );
    const librarySuites = hosted_test_panel_suite_choices(registry.catalog.tests, targets, livehostPrimary.selection)
      .filter((choice) => choice.key.startsWith("suite:library::"));
    expect_panel(
      librarySuites.length === 1
        && librarySuites[0]?.label === "library · Exclusive LiveHost authority (19)"
        && hosted_test_panel_display_label(librarySuites[0].label)
          === "library · exclusive livehost authority (19)",
      "external suite label is lowercased for display without mutating launcher metadata",
    );
    expect_panel(
      hosted_test_panel_test_choices(registry.catalog.tests, externalTarget.id, targets).length === 0,
      "external launcher exposes no fabricated internal case choices",
    );
    expect_panel(hosted_test_panel_selected_ids(registry.catalog.tests, livehostPrimary.selection, targets)
      .includes(externalTarget.id), "all livehost suites includes the external suite");
  }
}

const runtime = make_in_memory_hosted_test_runtime(make_hosted_test_suite_registry([]), nodeRegistry);
expect_panel(Boolean(runtime.discovery === undefined), "discovery is not performed before connection readiness");
await runtime.ready();
expect_panel(Boolean(runtime.discovery === undefined), "connection readiness precedes discovery");
const discovery = await runtime.discover();
expect_panel(
  runtime.discovery === discovery
    && discovery.executor.id === "panel-node"
    && discovery.catalog.tests.length === 3,
  "strict executor-centered discovery is retained by the panel runtime",
);

const updates: HostedTestPanelReportUpdate[] = [];
const errors: string[] = [];
let resets = 0;
const adapter = make_hosted_test_panel_adapter(runtime, {
  reset(target) {
    resets += 1;
    expect_panel(target === "canonical/selected", "canonical selected reports reset the existing presentation path");
  },
  ingest(update) { updates.push(update); },
  showInfrastructureError(message) { errors.push(message); },
});
const selectedIds = hosted_test_panel_selected_ids(discovery.catalog.tests, {
  kind: "suite",
  suite: "beta/suite",
});
const result = await adapter.start_selected(selectedIds);
expect_panel(
  result.suite === "canonical/selected"
    && result.summary.cases === 2
    && result.testIds.join("|") === selectedIds.join("|"),
  "tests.runSelected dispatches stable IDs and presents its terminal result",
);
expect_panel(executions === 2, "selected TestCases execute once outside the panel");
expect_panel(resets === 1 && errors.length === 0, "canonical attachment uses the existing adapter without infrastructure errors");
expect_panel(
  updates.length >= 1
    && updates.flatMap((update) => update.newCases).length === 2
    && updates.at(-1)?.terminal === true,
  "streamed case batches and terminal presentation are preserved",
);
expect_panel(adapter.capture()?.run.suite === "canonical/selected", "the existing report recovery map remains authoritative");
adapter.dispose();
runtime.dispose();

let structuredRejection = "";
try {
  decode_selected_hosted_test_run_response({
    type: "error",
    error: {
      code: "HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR",
      message: "[HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR] catalog changed",
    },
  });
} catch (error) {
  structuredRejection = error instanceof Error ? error.message : String(error);
}
expect_panel(
  structuredRejection.includes("HOSTED_TEST_UNAVAILABLE_ON_EXECUTOR"),
  "catalog-change selected-run rejection remains visible to the panel",
);

const legacyRuntime = make_in_memory_hosted_test_runtime(make_hosted_test_suite_registry([]));
await legacyRuntime.ready();
let legacyDiscoveryFailure = "";
try { await legacyRuntime.discover(); }
catch (error) { legacyDiscoveryFailure = error instanceof Error ? error.message : String(error); }
expect_panel(
  legacyDiscoveryFailure.includes("HOSTED_TEST_DISCOVERY_UNAVAILABLE")
    && legacyRuntime.discovery === undefined,
  "legacy discovery failure remains isolated from canonical selection state",
);
legacyRuntime.dispose();

console.log(JSON.stringify({
  executor: discovery.executor.id,
  discovered: discovery.catalog.tests.length,
  selected: result.summary.cases,
  updates: updates.length,
  terminal: updates.at(-1)?.terminal === true,
}));
