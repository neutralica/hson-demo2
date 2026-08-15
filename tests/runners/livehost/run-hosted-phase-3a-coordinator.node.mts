import assert from "node:assert/strict";
import { make_test_executor_registry } from "../../harness/core/test-executor";
import type { TestSuite } from "../../harness/core/test-contracts";
import { hosted_test_recovery_association } from "../../../src/shared/hosted-tests/hosted-test-application.types";
import { make_in_memory_hosted_test_runtime } from "../../suites/livehost/in-memory-hosted-test-panel-runtime";
import { create_hosted_test_application } from "../../harness/hosted/hosted-test-application";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";

const suiteId = "livehost/phase3a-current";
const fixture: TestSuite = Object.freeze({
  suite: suiteId,
  descriptor: Object.freeze({ subject: "livehost", requirements: Object.freeze(["javascript", "node"] as const) }),
  cases: Object.freeze([Object.freeze({ suite: suiteId, caseId: "passes", name: "passes", run() {} })]),
});
const executor = Object.freeze({
  id: "phase3a-current-node",
  kind: "node" as const,
  label: "Phase 3A current fixture",
  location: "hosted" as const,
  capabilities: Object.freeze({ provides: Object.freeze(["javascript", "node"] as const) }),
  supportsStreaming: true,
  supportsCancellation: true,
});
const registry = make_test_executor_registry(executor, [fixture]);
const runtime = make_in_memory_hosted_test_runtime(registry);

try {
  await runtime.ready();
  const discovery = await runtime.discover();
  const selectionId = discovery.catalog.tests[0]!.id;
  const run = await runtime.start_selected([selectionId]);
  const result = await run.actionResult;
  assert.equal(result.ok, true);
  assert.deepEqual(result.selectionIds, [selectionId]);
  assert.deepEqual(run.association.acceptedPlan.selectionIds, [selectionId]);
  assert.equal(run.association.acceptedPlan.runId, run.association.runId);
  assert.equal(run.association.attemptId.endsWith(":attempt:1"), true);

  const report = run.client.recovery.map.capture().value;
  assert.equal(report.run.id, run.association.runId);
  assert.equal(report.plan.executorId, executor.id);
  assert.equal(report.suiteRuns[0]?.cases[0]?.id, selectionId);
  assert.equal(Object.hasOwn(report, "caseBatches"), false);
  assert.equal(Object.hasOwn(report, "externalResults"), false);
  assert.equal(Object.hasOwn(report, "suites"), false);

  const association = hosted_test_recovery_association(
    runtime.client.recovery.map.capture().value,
    run.association.runId,
    run.association.attemptId,
  );
  assert.equal(association?.reportHostId, run.association.reportHostId);
  const recovered = await runtime.recover_run(run.association.runId, run.association.attemptId);
  assert.equal(recovered.association.attemptId, run.association.attemptId);
  assert.equal(recovered.client.recovery.map.capture().value.run.status, "passed");
  await assert.rejects(runtime.recover_run(run.association.runId, ""), /explicit recovery|not available/);

  const routeApplication = create_hosted_test_application({ executorRegistry: registry, discovery: make_test_executor_discovery(registry) });
  const dispatch = routeApplication.coordinator.dispatch_action as unknown as (action: unknown) => Promise<{ type: string }>;
  const action = (name: string, payload: unknown, ordinal: number) => dispatch({ type: "action", id: `retired-${ordinal}`, clientId: "retired-client", requestId: `retired-request-${ordinal}`, name, payload });
  assert.equal((await action("tests.run", { suite: "hosted/all" }, 1)).type, "error");
  assert.equal((await action("tests.runSelected", { selectionIds: ["category/livehost"] }, 2)).type, "error");
  assert.equal((await action("tests.runSelected", { selectionIds: ["suite/livehost"] }, 3)).type, "error");
  assert.equal((await action("tests.runSelected", { testIds: [selectionId] }, 4)).type, "error");
  routeApplication.dispose();

  recovered.dispose();
  run.dispose();
  console.log(JSON.stringify({ certificate: "phase3a-coordinator", runId: result.runId, attemptId: result.attemptId, selectionIds: result.selectionIds, recovered: true }));
} finally {
  runtime.dispose();
}
