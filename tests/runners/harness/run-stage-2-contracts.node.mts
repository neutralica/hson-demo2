import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TestCase, TestEvent, TestSuite } from "../../harness/core/test-contracts";
import type { TestDescriptor } from "../../../src/shared/testing/test-contracts";
import { make_test_catalog, resolve_test_descriptor } from "../../harness/core/test-catalog";
import { executor_supports, select_executor } from "../../harness/core/test-executor";
import type { TestExecutorDescriptor } from "../../../src/shared/testing/test-executor-contract";
import { normalize_test_event } from "../../harness/core/test-run-events";
import { select_test_descriptors } from "../../../src/shared/testing/test-selection";
import { all_livehost_suites } from "../../suites/livehost/suite-registry";

function expect_stage_2(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Stage 2 contracts: ${message}`);
}

const baseCase: TestCase = Object.freeze({ suite: "proof/suite", caseId: "base", name: "base", run: () => undefined });
const overrideCase: TestCase = Object.freeze({
  suite: "proof/suite",
  caseId: "override", name: "override",
  descriptor: Object.freeze({ requirements: Object.freeze(["javascript", "node"] as const) }),
  run: () => undefined,
});
const suite: TestSuite = Object.freeze({
  suite: "proof/suite",
  descriptor: Object.freeze({ subject: "integration", requirements: Object.freeze(["javascript"] as const) }),
  cases: Object.freeze([baseCase, overrideCase]),
});
const base = resolve_test_descriptor(suite, baseCase);
const override = resolve_test_descriptor(suite, overrideCase);
const catalog = make_test_catalog([base, override]);
expect_stage_2(Object.isFrozen(catalog) && Object.isFrozen(catalog.tests), "catalog and test array are immutable");
expect_stage_2(
  Object.isFrozen(base) && Object.isFrozen(base.requirements) && Object.isFrozen(base.collections),
  "descriptors and metadata arrays are immutable",
);
expect_stage_2(base.subject === "integration" && base.requirements.join(",") === "javascript", "suite metadata supplies defaults");
expect_stage_2(override.subject === "integration" && override.requirements.join(",") === "javascript,node", "case metadata overrides requirements only");
let duplicateRejected = false;
try { make_test_catalog([base, { ...base }]); } catch { duplicateRejected = true; }
expect_stage_2(duplicateRejected, "duplicate deterministic IDs are rejected");

const nodeExecutor: TestExecutorDescriptor = Object.freeze({
  id: "node-a",
  kind: "node",
  label: "Node A",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node"] as const) }),
  supportsStreaming: true,
  supportsCancellation: false,
});
const javascriptExecutor: TestExecutorDescriptor = Object.freeze({
  id: "javascript-a",
  kind: "cloudflare-worker",
  label: "JavaScript A",
  location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript"] as const) }),
  supportsStreaming: true,
  supportsCancellation: false,
});
expect_stage_2(executor_supports(nodeExecutor, override), "capability matching accepts a complete subset");
expect_stage_2(!executor_supports(javascriptExecutor, override), "capability matching rejects a missing requirement");
expect_stage_2(select_executor(override, [nodeExecutor]) === nodeExecutor, "single compatible executor selection is deterministic");

const filters: readonly TestDescriptor[] = Object.freeze([
  base,
  override,
  Object.freeze({
    id: "other/suite::third",
    suiteId: "other/suite",
    caseId: "third", name: "third",
    title: "third",
    subject: "livehost",
    requirements: Object.freeze(["javascript"] as const),
    collections: Object.freeze([]),
    provenance: "hson-demo2",
    suiteOrdinal: 1,
    caseOrdinal: 0,
  }),
]);
expect_stage_2(select_test_descriptors(filters, { subject: "livehost" }).map((test) => test.id).join() === "other/suite::third", "subject filtering is exact");
expect_stage_2(select_test_descriptors(filters, { suite: "proof/suite" }).length === 2, "suite filtering is exact");
expect_stage_2(select_test_descriptors(filters, { test: override.id }).map((test) => test.id).join() === override.id, "test filtering is exact");

const diagnosticEvent: TestEvent = {
  t: "case_end",
  suite: base.suiteId,
  caseId: base.caseId, name: base.title,
  status: "fail",
  ms: 12,
  err: "message\nstack",
  assertRows: Object.freeze([{ ok: false, label: "kept", actual: 1, expected: 2 }]),
  expected: "fail",
  metaPatch: { artifact: "kept" },
};
const normalized = normalize_test_event(diagnosticEvent, () => base);
expect_stage_2(
  normalized.type === "test-finished"
    && normalized.error === diagnosticEvent.err
    && normalized.assertRows === diagnosticEvent.assertRows
    && normalized.expected === "fail"
    && normalized.metaPatch === diagnosticEvent.metaPatch,
  "event normalization preserves all diagnostic fields",
);

const livehostSuites = all_livehost_suites();
expect_stage_2(livehostSuites.length > 0 && livehostSuites.every((entry) => entry.descriptor?.subject === "livehost"), "all proof LiveHost suites carry canonical metadata");

const neutralFiles = [
  "tests/harness/core/test-catalog.ts",
  "tests/harness/core/test-selection.ts",
  "tests/harness/core/test-executor.ts",
  "tests/harness/core/test-run-events.ts",
  "tests/harness/core/test-discovery.ts",
  "tests/harness/core/test-selected-run.ts",
];
const incompatibleImport = /(?:from\s+|import\s*\()["'][^"']*(?:livehost-node-executor|hosted-test\/dom|node:|jsdom|server\/|cloudflare\/)[^"']*["']/;
for (const file of neutralFiles) {
  const source = readFileSync(resolve(file), "utf8");
  expect_stage_2(!incompatibleImport.test(source), `${file} remains descriptor/runtime neutral`);
}

console.log("Stage 2 contracts: ok");
