import { hson } from "hson-live";
import type { RunResult, TestEvent } from "../../harness/core/test-contracts";
import type { TestCapability, TestCollection, TestDescriptor, TestSubject, TestSuiteDescriptor } from "../../../src/shared/testing/test-contracts";
import { make_test_catalog } from "../../harness/core/test-catalog";
import { test_catalog_version } from "../../../src/shared/testing/test-catalog-contract";
import { format_test_case_id, parse_test_case_id, validate_test_case_id, validate_test_suite_id } from "../../../src/shared/testing/test-identity";
import { make_test_run_plan } from "../../harness/core/test-run-plan";
import { TEST_CONVERGENCE_BOUNDARIES } from "../../harness/core/test-convergence-compatibility";
import { CANONICAL_TEST_COLLECTION_ORDER, CANONICAL_TEST_SUBJECT_ORDER } from "../../../src/shared/testing/test-contracts";
import { test_presentation_rank } from "../../../src/shared/testing/test-order";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { external_launcher_suite_descriptor } from "../../../src/shared/testing/external-launcher-contract";
import { make_cloudflare_livehost_executor_registry } from "../../harness/runtimes/cloudflare/cloudflare-test-executor";
import { install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";
import { resolve_external_library_launchers } from "../../harness/runtimes/node/external-library-launchers";
import { make_local_node_livehost_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { make_hosted_test_report } from "../../harness/reporting/hosted/hosted-test-report";
import { hosted_test_report_cases } from "../../../src/shared/hosted-tests/hosted-test-report.types";
import {
  hosted_test_panel_primary_choices,
  hosted_test_panel_selected_ids,
} from "../../../src/app/demos/tests/panel/hosted-test-panel-selection";
import { make_hosted_test_case_list } from "../../../src/app/demos/tests/panel/hosted-test-case-list";

const counts = { identity: 0, taxonomy: 0, planAndReport: 0 };

function certify(group: keyof typeof counts, condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 1 ${group}: ${message}`);
  counts[group] += 1;
}

function rejects(run: () => unknown): boolean {
  try { run(); return false; } catch { return true; }
}

function suite_descriptor(
  id: string,
  subject: TestSubject,
  order: number,
  collections: readonly TestCollection[] = Object.freeze([]),
  shape: "cases" | "opaque-aggregate" = "cases",
  sourceRef?: string,
): TestSuiteDescriptor {
  const requirements: readonly TestCapability[] = shape === "cases"
    ? Object.freeze(["javascript"])
    : Object.freeze(["javascript", "node"]);
  return Object.freeze({
    id,
    title: id,
    subject,
    collections: Object.freeze([...collections]),
    provenance: shape === "cases" ? "hson-demo2" : "hson-live",
    order,
    requirements,
    executionShape: shape,
    ...(sourceRef === undefined ? {} : { sourceRef }),
    ...(shape === "opaque-aggregate" ? { declaredChecks: 7 } : {}),
  });
}

function case_descriptor(
  suite: TestSuiteDescriptor,
  caseId: string,
  caseOrdinal: number,
  title = caseId,
): TestDescriptor {
  return Object.freeze({
    id: format_test_case_id(suite.id, caseId),
    suiteId: suite.id,
    caseId,
    title,
    subject: suite.subject,
    requirements: suite.requirements,
    collections: suite.collections,
    provenance: suite.provenance,
    suiteOrdinal: suite.order,
    caseOrdinal,
    ...(suite.sourceRef === undefined ? {} : { sourceRef: suite.sourceRef }),
  });
}

// Identity certification: machine grammar, formatting, collisions, and title independence.
certify("identity", validate_test_suite_id("transform/hson-tokenizer") === "transform/hson-tokenizer", "semantic slash suite IDs validate");
certify("identity", validate_test_suite_id("livemap/canonical-ownership") === "livemap/canonical-ownership", "multi-segment semantic suite IDs validate");
certify("identity", validate_test_case_id("negative-zero") === "negative-zero", "hyphenated case IDs validate");
certify("identity", validate_test_case_id("number.v2_case") === "number.v2_case", "the complete machine segment alphabet validates");
certify("identity", format_test_case_id("livemap/canonical-ownership", "negative-zero") === "livemap/canonical-ownership::negative-zero", "the formatter reserves one double-colon boundary");
certify("identity", parse_test_case_id("livemap/canonical-ownership::negative-zero").caseId === "negative-zero", "the parser returns the case ID");
certify("identity", parse_test_case_id("livemap/canonical-ownership::negative-zero").suiteId === "livemap/canonical-ownership", "the parser returns the suite ID");
for (const malformed of ["", "/transform", "transform/", "transform//tokenizer", "transform/white space", "Transform/tokenizer", "transform::tokenizer"]) {
  certify("identity", rejects(() => validate_test_suite_id(malformed)), `malformed suite ID rejects: ${JSON.stringify(malformed)}`);
}
for (const malformed of ["", "negative zero", "Negative-zero", "::negative-zero", "negative::zero", "-negative-zero"]) {
  certify("identity", rejects(() => validate_test_case_id(malformed)), `malformed case ID rejects: ${JSON.stringify(malformed)}`);
}
certify("identity", rejects(() => parse_test_case_id("livemap/canonical-ownership")), "a full case ID requires the reserved separator");
certify("identity", rejects(() => parse_test_case_id("livemap/canonical-ownership::negative-zero::again")), "a full case ID permits exactly one reserved separator");
const identitySuite = suite_descriptor("livemap/canonical-ownership", "livemap", 0);
const stableTitleA = case_descriptor(identitySuite, "negative-zero", 0, "negative zero remains distinct");
const stableTitleB = case_descriptor(identitySuite, "negative-zero", 0, "negative zero compares distinctly");
certify("identity", stableTitleA.id === stableTitleB.id && stableTitleA.title !== stableTitleB.title, "display title changes do not alter machine identity");
certify("identity", rejects(() => make_test_catalog([stableTitleA, stableTitleA], [identitySuite])), "duplicate full case IDs reject globally");
certify("identity", rejects(() => make_test_catalog([stableTitleA], [identitySuite, identitySuite])), "duplicate suite IDs reject");

const transformCanonical = suite_descriptor("transform/demo", "transform", 1);
const transformOpaque = suite_descriptor("transform/hson-tokenizer", "transform", 0, Object.freeze([]), "opaque-aggregate", "hson-live:transform.hson-tokenizer");
const livetreeSuite = suite_descriptor("livetree/demo", "livetree", 0);
const livemapCanonical = suite_descriptor("livemap/demo", "livemap", 1);
const livemapOpaque = suite_descriptor("livemap/canonical-ownership", "livemap", 0, Object.freeze([]), "opaque-aggregate", "hson-live:livemap.canonical-ownership");
const livehostSuite = suite_descriptor("livehost/demo", "livehost", 0);
const reflectSuite = suite_descriptor("reflect/demo", "reflect", 0);
const unitSuite = suite_descriptor("unit/demo", "integration", 0, Object.freeze(["unit"]));
const devSuite = suite_descriptor("dev/demo", "integration", 0, Object.freeze(["dev"]));
const caseSuites = [transformCanonical, livetreeSuite, livemapCanonical, livehostSuite, reflectSuite, unitSuite, devSuite];
const mixedCases = caseSuites.map((suite, index) => case_descriptor(
  suite,
  suite === transformCanonical ? "intentionally-slow" : "proof",
  0,
  suite === transformCanonical ? "intentionally slow canonical case" : `${suite.id} proof`,
));
const shuffledSuites = [devSuite, livemapOpaque, transformCanonical, reflectSuite, livetreeSuite, unitSuite, livehostSuite, transformOpaque, livemapCanonical];
const shuffledCases = [mixedCases[6]!, mixedCases[2]!, mixedCases[0]!, mixedCases[4]!, mixedCases[1]!, mixedCases[5]!, mixedCases[3]!];
const mixedCatalog = make_test_catalog(shuffledCases, shuffledSuites);

const externalAvailability = await resolve_external_library_launchers();
const liveTransform = externalAvailability.targets.find((target) => target.launcherId === "transform.hson-tokenizer");
const liveMap = externalAvailability.targets.find((target) => target.launcherId.startsWith("livemap."));
const liveReflect = externalAvailability.targets.find((target) => target.subject === "reflect");
const liveDev = externalAvailability.targets.find((target) => target.launcherId === "core.public-boundaries");
certify("taxonomy", CANONICAL_TEST_SUBJECT_ORDER.join("|") === "transform|livetree|livemap|livehost|reflect", "one subject authority includes Reflect in settled rank order");
certify("taxonomy", CANONICAL_TEST_COLLECTION_ORDER.join("|") === "unit|dev", "collection-only selector entries follow semantic subjects");
certify("taxonomy", liveTransform?.id === "transform/hson-tokenizer" && liveTransform.subject === "transform", "hson-live Transform launchers normalize to Transform");
certify("taxonomy", liveMap?.id.startsWith("livemap/") && liveMap.subject === "livemap", "hson-live LiveMap launchers normalize to LiveMap");
certify("taxonomy", liveReflect?.id.startsWith("reflect/") && liveReflect.subject === "reflect", "Reflect launchers normalize to a first-class Reflect subject");
certify("taxonomy", externalAvailability.targets.every((target) => target.sourceRef === `hson-live:${target.launcherId}`), "sourceRef retains launcher provenance without becoming identity");
certify("taxonomy", externalAvailability.targets.every((target) => !target.id.startsWith("library::") && !target.id.includes("::")), "no external canonical suite uses the removed library identity prefix");
certify("taxonomy", externalAvailability.targets.every((target) => target.collections.every((collection) => collection === "unit" || collection === "dev")), "normalized launcher collections contain only tier metadata");
certify("taxonomy", externalAvailability.targets.every((target) => !target.requirements.includes("unit" as never) && !target.requirements.includes("dev" as never)), "Unit and Dev are never runtime requirements");
certify("taxonomy", liveDev?.subject === "integration" && liveDev.collections.includes("dev"), "an external Dev suite retains a separate semantic subject");
certify("taxonomy", liveDev !== undefined && hosted_test_panel_selected_ids(Object.freeze([]), { kind: "collection", collection: "dev" }, Object.freeze([external_launcher_suite_descriptor(liveDev)])).join() === liveDev.id, "external collection filtering reads collections without rewriting subject");
certify("taxonomy", case_descriptor(suite_descriptor("livemap/unit-proof", "livemap", 0, Object.freeze(["unit"])), "proof", 0).subject === "livemap", "a Unit case retains one LiveMap semantic identity");
certify("taxonomy", case_descriptor(suite_descriptor("livemap/unit-proof", "livemap", 0, Object.freeze(["unit"])), "proof", 0).collections.includes("unit"), "the same case independently retains Unit membership");
certify("taxonomy", test_presentation_rank("livemap", Object.freeze(["unit"])) === 2, "collection membership never displaces a first-class semantic subject");
certify("taxonomy", test_presentation_rank("integration", Object.freeze(["unit"])) === 5 && test_presentation_rank("integration", Object.freeze(["dev"])) === 6, "collection-only suites rank after all semantic subjects");
certify("taxonomy", transformCanonical.subject === transformOpaque.subject && transformCanonical.provenance !== transformOpaque.provenance, "provenance does not alter semantic subject classification");
certify("taxonomy", externalAvailability.targets.every((target) => target.executableChecks > 0), "opaque launcher declared-check evidence remains aggregate metadata");
certify("taxonomy", TEST_CONVERGENCE_BOUNDARIES.length === 1 && TEST_CONVERGENCE_BOUNDARIES.every((bridge) => bridge.deletionGate.length > 0), "the sole retained cross-repository bridge has an explicit deletion gate");

const syntheticOpaqueSuites: readonly TestSuiteDescriptor[] = Object.freeze([transformOpaque, livemapOpaque]);
const primaryKeys = hosted_test_panel_primary_choices(mixedCatalog.tests, syntheticOpaqueSuites).map((choice) => choice.key);
certify("taxonomy", primaryKeys.join("|") === "all|subject:transform|subject:livetree|subject:livemap|subject:livehost|subject:reflect|collection:unit|collection:dev", "selector order is exactly All, Transform, LiveTree, LiveMap, LiveHost, Reflect, Unit, Dev");
certify("taxonomy", primaryKeys.every((key) => key !== "library" && key !== "subject:library"), "Library is not a primary selector category");
const unitIds = hosted_test_panel_selected_ids(mixedCatalog.tests, { kind: "collection", collection: "unit" }, syntheticOpaqueSuites);
certify("taxonomy", unitIds.join() === "unit/demo::proof", "Unit filtering lowers to an exact canonical case ID");
certify("taxonomy", new Set(hosted_test_panel_selected_ids(mixedCatalog.tests, { kind: "all" }, syntheticOpaqueSuites)).size === 9, "overlapping subject and collection discovery never duplicates execution");

const selectedIds = hosted_test_panel_selected_ids(mixedCatalog.tests, { kind: "all" }, syntheticOpaqueSuites);
const plan = make_test_run_plan({
  runId: "phase1-mixed-run",
  protocolVersion: 3,
  catalogVersion: test_catalog_version(mixedCatalog),
  executorId: "phase1-node",
  catalog: mixedCatalog,
  selectedIds,
});
const expectedSuiteOrder = "transform/hson-tokenizer|transform/demo|livetree/demo|livemap/canonical-ownership|livemap/demo|livehost/demo|reflect/demo|unit/demo|dev/demo";
certify("planAndReport", plan.suites.map((suite) => suite.id).join("|") === expectedSuiteOrder, "RunPlan uses semantic rank, suite ordinal, then case ordinal");
certify("planAndReport", plan.selectionIds.join("|") === selectedIds.join("|"), "selection lowers to exact IDs in RunPlan order");
certify("planAndReport", Object.isFrozen(plan) && Object.isFrozen(plan.suites) && plan.suites.every(Object.isFrozen), "RunPlan and planned suites are frozen");
certify("planAndReport", plan.suites.every((suite) => Object.isFrozen(suite.cases) && Object.isFrozen(suite.collections)), "nested RunPlan order evidence is frozen");
certify("planAndReport", rejects(() => (plan.suites as unknown as { pop(): unknown }).pop()), "RunPlan ordering cannot be mutated");
const reshuffledCatalog = make_test_catalog([...shuffledCases].reverse(), [...shuffledSuites].reverse());
const samePlan = make_test_run_plan({ ...plan, catalog: reshuffledCatalog, selectedIds: [...selectedIds].reverse() });
certify("planAndReport", samePlan.suites.map((suite) => suite.id).join("|") === expectedSuiteOrder, "discovery and selection input order do not perturb the plan");
certify("planAndReport", samePlan.selectionIds.join("|") === plan.selectionIds.join("|"), "the same selected catalog produces the same ordered identities");
certify("planAndReport", plan.suites[0]?.provenance === "hson-live" && plan.suites[1]?.provenance === "hson-demo2", "provenance is frozen evidence but not the ordering axis");
certify("planAndReport", plan.suites.filter((suite) => suite.executionShape === "opaque-aggregate").every((suite) => suite.cases.length === 0), "opaque suites contain no fabricated cases");

const report = make_hosted_test_report(() => 100, undefined, { runPlan: plan });
const initial = report.map.capture().value;
certify("planAndReport", initial.suiteRuns.map((suite) => suite.id).join("|") === expectedSuiteOrder, "the report reducer seeds final suite positions before evidence");
certify("planAndReport", initial.suiteRuns.every((suite) => suite.status === "queued"), "every selected suite is initially queued");
certify("planAndReport", initial.suiteRuns.filter((suite) => suite.executionShape === "cases").every((suite) => suite.cases.length === 1 && suite.cases[0]?.status === "queued"), "every selected canonical case is initially queued");
certify("planAndReport", initial.suiteRuns.filter((suite) => suite.executionShape === "opaque-aggregate").every((suite) => suite.cases.length === 0), "opaque launchers seed suite rows only");
certify("planAndReport", hosted_test_report_cases(initial).every((testCase) => testCase.status === "queued"), "queued authority is normalized suiteRuns without fabricated completion projections");

const dom = install_hosted_dom_runtime();
const inspector = make_hosted_test_case_list(hson.liveTree.queryBody().graft(), { async view() {}, async copy() {} });
inspector.ingest({ report: initial, terminal: false });
inspector.flush();
const initialInspector = inspector.snapshot();
certify("planAndReport", Object.keys(initialInspector.statusesBySuite).join("|") === expectedSuiteOrder, "Inspector projects the reducer-seeded order before completion");
certify("planAndReport", Object.values(initialInspector.statusesBySuite).every((status) => status === "queued"), "Inspector queued state comes from the report snapshot");
certify("planAndReport", initialInspector.cases === 7 && initialInspector.launchers === 2, "Inspector distinguishes seven planned cases from two opaque launchers");

function finish_case(testCase: TestDescriptor, status: "pass" | "fail" = "pass"): void {
  report.reduce({ t: "suite_begin", suite: testCase.suiteId, totalPlanned: 1 });
  report.reduce({ t: "case_begin", suite: testCase.suiteId, caseId: testCase.caseId, name: testCase.title });
  report.reduce({
    t: "case_end", suite: testCase.suiteId, caseId: testCase.caseId, name: testCase.title, status, ms: 1,
    ...(status === "fail" ? { err: "controlled mixed-run assertion failure" } : {}),
  });
  report.reduce({ t: "suite_end", suite: testCase.suiteId, ms: 1 });
}

function external_event(suite: TestSuiteDescriptor, status: "running" | "pass"): TestEvent {
  const shared = {
    id: suite.id, suite: suite.id, name: suite.title, subject: suite.subject, runtime: "node",
    executableChecks: suite.declaredChecks!, collections: suite.collections,
  };
  return status === "running"
    ? { t: "external_state", ...shared, status }
    : {
      t: "external_end", ...shared, status, ms: 1,
      stdout: `opaque output\n<HSON_LIVE_TEST_COMPLETION>{}\n`, ordinaryStdout: "opaque output\n", stderr: "",
      exitCode: 0, signal: null, timedOut: false,
      completion: { version: 1, launcherId: suite.sourceRef ?? suite.id, executed: suite.declaredChecks!, passed: suite.declaredChecks!, failed: 0 },
    };
}

report.reduce(external_event(transformOpaque, "running"));
report.reduce(external_event(livemapOpaque, "running"));
await Promise.all([
  new Promise<void>((resolve) => setTimeout(() => { finish_case(shuffledCases[0]!); resolve(); }, 1)),
  new Promise<void>((resolve) => setTimeout(() => { report.reduce(external_event(livemapOpaque, "pass")); resolve(); }, 2)),
  new Promise<void>((resolve) => setTimeout(() => { finish_case(shuffledCases[3]!, "fail"); resolve(); }, 3)),
  new Promise<void>((resolve) => setTimeout(() => { report.reduce(external_event(transformOpaque, "pass")); resolve(); }, 4)),
  new Promise<void>((resolve) => setTimeout(() => { for (const testCase of [shuffledCases[2]!, shuffledCases[4]!, shuffledCases[5]!, shuffledCases[6]!, shuffledCases[1]!]) finish_case(testCase); resolve(); }, 8)),
]);
const result: RunResult = {
  ok: false,
  summary: {
    suites: 9, cases: 7, pass: 6, fail: 1, skip: 0, msTotal: 9,
    failures: [{ suite: reflectSuite.id, caseId: "proof", name: "reflect proof", err: "controlled mixed-run assertion failure", ms: 1 }],
  },
};
report.complete(result, { runnerMs: 9, hostMs: 10 });
const finalReport = report.map.capture().value;
certify("planAndReport", finalReport.suiteRuns.map((suite) => suite.id).join("|") === expectedSuiteOrder, "hostile completion timing never moves report records");
certify("planAndReport", finalReport.suiteRuns.filter((suite) => suite.status === "fail").map((suite) => suite.id).join() === reflectSuite.id, "one controlled failure transitions in its seeded position");
certify("planAndReport", finalReport.suiteRuns.flatMap((suite) => suite.cases).filter((testCase) => testCase.status === "fail").length === 1, "case records transition in place with one controlled failure");
certify("planAndReport", finalReport.suiteRuns.filter((suite) => suite.executionShape === "opaque-aggregate").every((suite) => suite.counts.passed === 7 && suite.cases.length === 0), "opaque suites retain check counts without fabricated cases");
certify("planAndReport", finalReport.suiteRuns.filter((suite) => suite.executionShape === "opaque-aggregate").every((suite) => suite.evidence.some((item) => item.kind === "stdout")), "opaque output attaches as evidence rather than a result model");
inspector.ingest({ report: finalReport, terminal: true });
inspector.flush();
const finalInspector = inspector.snapshot();
certify("planAndReport", Object.keys(finalInspector.statusesBySuite).join("|") === expectedSuiteOrder, "Inspector final order equals its initial queued order");
certify("planAndReport", Object.values(finalInspector.statusesBySuite).filter((status) => status === "fail").length === 1, "Inspector projects terminal transitions from report authority");
inspector.dispose();
dom.dispose();
report.dispose();

const nodeRegistry = make_local_node_livehost_executor_registry();
const nodeDiscovery = make_test_executor_discovery(nodeRegistry, externalAvailability.targets);
const workerDiscovery = make_test_executor_discovery(make_cloudflare_livehost_executor_registry());
certify("planAndReport", nodeDiscovery.catalog.suites.some((suite) => suite.executionShape === "opaque-aggregate" && suite.provenance === "hson-live"), "Node discovery exposes normalized executable opaque suites");
certify("planAndReport", workerDiscovery.catalog.suites.every((suite) => suite.executionShape === "cases" && suite.provenance === "hson-demo2"), "Worker discovery exposes only its exact executable case suites");
certify("planAndReport", workerDiscovery.catalog.suites.every((suite) => suite.executionShape !== "opaque-aggregate"), "external launchers remain absent rather than failed on Worker");
certify("planAndReport", nodeDiscovery.catalog.tests.every((descriptor) => nodeRegistry.get(descriptor.id) !== undefined), "every Node case descriptor has exact executable registration");

console.log(JSON.stringify({ counts, initialOrder: expectedSuiteOrder.split("|"), hostileCompletion: ["dev", "livemap opaque", "reflect", "transform opaque", "remaining canonical"], finalOrder: finalReport.suiteRuns.map((suite) => suite.id) }));
