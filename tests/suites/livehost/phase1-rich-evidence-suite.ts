import type { RunCaseContext, TestEvent, TestSuite } from "../../harness/core/test-contracts";
import { run_test_suites } from "../../harness/core/test-runner";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import { all_deterministic_transform_test_suites } from "../../harness/hosted/deterministic-transform-test-suites";
import { make_in_memory_hosted_test_runtime } from "./in-memory-hosted-test-panel-runtime";
import { normalize_hosted_test_case_diagnostic, transform_terminal_assertions } from "../../harness/core/hosted-test-case-diagnostic";
const PHASE1_EXECUTOR = Object.freeze({
  id: "phase1-rich-evidence-node", kind: "node", label: "Phase 1 rich evidence Node", location: "hosted",
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node"] as const) }),
  supportsStreaming: true, supportsCancellation: true,
});

function expect_phase1(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`phase 1 rich evidence: ${message}`);
}

function terminal(events: readonly TestEvent[]): Extract<TestEvent, { t: "case_end" }> {
  const result = events.find((event): event is Extract<TestEvent, { t: "case_end" }> => event.t === "case_end");
  if (result === undefined) throw new Error("phase 1 rich evidence: no terminal case event");
  return result;
}

function useful(diagnostic: NonNullable<Extract<TestEvent, { t: "case_end" }>["diagnostic"]>) {
  return {
    type: diagnostic.type, caseKey: diagnostic.caseKey, caseSuite: diagnostic.caseSuite,
    caseId: diagnostic.caseId, name: diagnostic.name, status: diagnostic.status,
    error: diagnostic.error, assertions: diagnostic.assertions, values: diagnostic.values,
    artifacts: diagnostic.artifacts, trace: diagnostic.trace,
  };
}

function ordinary_suite(): TestSuite {
  const suite = "livehost/phase1-rich-evidence";
  return Object.freeze({
    suite,
    descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript", "node"] as const), collections: Object.freeze(["dev"] as const) }),
    cases: Object.freeze([Object.freeze({
      suite, caseId: "ordinary", name: "ordinary rich evidence",
      meta: Object.freeze({ registered: "metadata" }),
      run: () => Object.freeze({
        metaPatch: Object.freeze({ patched: "metadata" }),
        assertRows: Object.freeze([
          Object.freeze({ ok: true, label: "passed assertion", actual: 1, expected: 1 }),
          Object.freeze({ ok: false, label: "failed assertion", actual: "actual", expected: "expected" }),
        ]),
      }),
    })]),
  });
}

function transformer_suite(): readonly [TestSuite, string, () => number] {
  let executions = 0;
  const suite = all_deterministic_transform_test_suites().find((candidate) => candidate.suite === "transform/json/basic-test");
  if (suite === undefined) throw new Error("phase 1 rich evidence: missing deterministic transform suite");
  const base = suite.cases.find((candidate) => candidate.caseId === "test.empty");
  if (base === undefined) throw new Error("phase 1 rich evidence: missing deterministic transform case");
  const transformed: TestSuite = Object.freeze({
    suite: base.suite,
    descriptor: Object.freeze({ subject: "transform", requirements: Object.freeze(["javascript", "node"] as const), collections: Object.freeze(["dev"] as const) }),
    cases: Object.freeze([Object.freeze({ ...base, run: (context: RunCaseContext | undefined) => {
      executions += 1;
      return base.run(context);
    } })]),
  });
  return [transformed, `${base.suite}::${base.caseId}`, () => executions] as const;
}

export function phase1_rich_evidence_suite(): TestSuite {
  const suite = "livehost/phase1-rich-evidence-certification";
  return Object.freeze({
    suite,
    descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript", "node"] as const), collections: Object.freeze(["dev"] as const) }),
    cases: Object.freeze([
      Object.freeze({ suite, caseId: "ordinary-rich-is-opt-in-and-complete", name: "ordinary rich evidence is opt-in and complete", run: async () => {
        const source = ordinary_suite();
        const normal: TestEvent[] = [];
        const rich: TestEvent[] = [];
        await run_test_suites([source], (event) => normal.push(event), {});
        await run_test_suites([source], (event) => rich.push(event), { richDiagnostics: true, richDiagnosticContext: { runId: "phase1", suite: "canonical/selected" } });
        const ordinary = terminal(normal);
        const retained = terminal(rich);
        expect_phase1(ordinary.diagnostic === undefined, "normal mode must not retain a diagnostic");
        expect_phase1(retained.diagnostic?.type === "ordinary" && retained.diagnostic.assertions.length === 2, "rich ordinary execution retains both assertion rows");
        expect_phase1(retained.diagnostic?.assertions[0]?.actual === "1" && retained.diagnostic.assertions[1]?.expected === "expected", "rich ordinary execution retains expected and actual values");
        expect_phase1(retained.diagnostic?.values.some((value) => value.label === "registered" && value.value === "metadata") && retained.diagnostic.values.some((value) => value.label === "patched" && value.value === "metadata"), "registration metadata and metaPatch are merged");
      } }),
      Object.freeze({ suite, caseId: "transformer-rich-normalizes-original-execution-once", name: "transformer rich evidence normalizes original execution once", run: async () => {
        const [source, , executions] = transformer_suite();
        const events: TestEvent[] = [];
        await run_test_suites([source], (event) => events.push(event), { richDiagnostics: true, includePassedDiagnostics: true, richDiagnosticContext: { runId: "phase1", suite: "canonical/selected" } });
        const diagnostic = terminal(events).diagnostic;
        expect_phase1(executions() === 1, `transformer circuit executes once, received ${executions()}`);
        expect_phase1(diagnostic?.type === "transform" && diagnostic.trace.length > 0, "transformer diagnostic is canonical and retains trace");
        expect_phase1(diagnostic.artifacts.every((artifact) => typeof artifact.format === "string"), "final transformer diagnostic contains normalized artifacts, not a raw LoopReport");
      } }),
      Object.freeze({ suite, caseId: "original-and-inspection-share-useful-normalization", name: "original and inspection share useful normalization", run: async () => {
        const source = ordinary_suite();
        const rich: TestEvent[] = [];
        await run_test_suites([source], (event) => rich.push(event), { richDiagnostics: true, richDiagnosticContext: { runId: "phase1", suite: "canonical/selected" } });
        const original = terminal(rich).diagnostic;
        const ordinaryEnd = terminal(rich);
        const inspected = normalize_hosted_test_case_diagnostic({ runId: "phase1", suite: "canonical/selected", caseSuite: source.suite, caseId: "ordinary", name: "ordinary rich evidence", status: "fail", ...(ordinaryEnd.assertRows === undefined ? {} : { assertRows: ordinaryEnd.assertRows }), metadata: { registered: "metadata", patched: "metadata" }, ms: 0, ...(ordinaryEnd.err === undefined ? {} : { error: ordinaryEnd.err }) });
        expect_phase1(original !== undefined && JSON.stringify(useful(original)) === JSON.stringify(useful(inspected)), "ordinary original and inspection diagnostics are semantically equivalent");
        const [transform, transformKey] = transformer_suite();
        const transformEvents: TestEvent[] = [];
        await run_test_suites([transform], (event) => transformEvents.push(event), { richDiagnostics: true, richDiagnosticContext: { runId: "phase1", suite: "canonical/selected" } });
        const transformOriginal = terminal(transformEvents).diagnostic;
        const transformResult = await transform.cases[0]!.run({ richDiagnostics: true });
        const inspectedAssertions = transformResult?.loopReport === undefined ? undefined : transform_terminal_assertions(transformResult.loopReport, transform.cases[0]!.expected);
        const transformInspected = normalize_hosted_test_case_diagnostic({ runId: "phase1", suite: "canonical/selected", caseSuite: transform.suite, caseId: transformKey.slice(transformKey.indexOf("::") + 2), name: transform.cases[0]!.name, status: "pass", ms: 0, metadata: { ...transform.cases[0]!.meta, ...transformResult?.metaPatch }, ...(transformResult?.loopReport === undefined ? {} : { loopReport: transformResult.loopReport }), ...(inspectedAssertions === undefined ? {} : { assertRows: inspectedAssertions }) });
        expect_phase1(transformOriginal !== undefined && JSON.stringify(useful(transformOriginal)) === JSON.stringify(useful(transformInspected)), "transformer original and inspection diagnostics are semantically equivalent");
      } }),
      Object.freeze({ suite, caseId: "locus-recovery-retains-terminal-diagnostic-and-reportrev", name: "Locus recovery retains terminal diagnostic and report revision", run: async () => {
        const source = ordinary_suite();
        const registry = make_test_executor_registry(PHASE1_EXECUTOR, [source]);
        const runtime = make_in_memory_hosted_test_runtime(registry, { retainRichDiagnostics: true });
        try {
          await runtime.discover();
          const run = await runtime.start_selected(["livehost/phase1-rich-evidence::ordinary"]);
          const acknowledged = await run.actionResult;
          const report = run.client.recovery.map.snap();
          const retained = report.suiteRuns[0]?.cases[0]?.diagnostic as { assertions?: unknown[]; values?: unknown[] } | null;
          const recovered = await runtime.recover_run(run.association.runId, run.association.attemptId);
          const recoveredReport = recovered.client.recovery.map.snap();
          expect_phase1(retained !== null && retained?.assertions?.length === 2 && retained.values?.length === 2, "terminal report retains structured original diagnostic through Locus");
          expect_phase1(JSON.stringify(recoveredReport.suiteRuns[0]?.cases[0]?.diagnostic) === JSON.stringify(retained), "newly attached recovered client receives the retained diagnostic");
          expect_phase1(acknowledged.reportRev === run.client.recovery.lastAppliedRev && recovered.client.recovery.lastAppliedRev === acknowledged.reportRev, "action acknowledgement and recovered report revisions reconcile");
          recovered.dispose();
          run.dispose();
        } finally { runtime.dispose(); }
      } }),
    ]),
  });
}
