import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { make_test_executor_discovery } from "../../harness/core/test-discovery";
import { LocalRunReporter } from "../../harness/reporting/local/run-reporter";
import { make_local_node_locus_executor_registry } from "../../harness/runtimes/node/livehost-node-executor";
import { run_node_selected_verifications } from "../../harness/runtimes/node/run-node-selected-verifications";
import {
  create_external_library_launcher_service,
  EXTERNAL_LIBRARY_LAUNCHER_STDERR_LIMIT_BYTES,
  EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES,
  EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS,
  EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER,
  resolve_external_library_launchers,
  type ExternalLibraryLauncherAvailability,
  type ExternalLibraryLauncherResult,
} from "../../harness/runtimes/node/external-library-launchers";
import type { ExternalLibraryLauncherTarget } from "../../../src/shared/testing/external-launcher-contract";

const fixturePath = fileURLToPath(new URL("../../fixtures/protocol/external-launcher-protocol-fixture.mjs", import.meta.url));
const discovered = await resolve_external_library_launchers();
const discoveredTarget = discovered.targets.find((entry) => entry.launcherId === "transform.hson-tokenizer");
if (discoveredTarget === undefined) throw new Error("Protocol fixture requires the executable tokenizer suite.");
const target: ExternalLibraryLauncherTarget = discoveredTarget;

function fixture_availability(selected: ExternalLibraryLauncherTarget, scenario: string): ExternalLibraryLauncherAvailability {
  return Object.freeze({ repositoryRoot: process.cwd(), targets: Object.freeze([selected]), unavailable: Object.freeze([]), invocations: Object.freeze({
    [selected.id]: Object.freeze({ kind: "direct" as const, command: process.execPath, args: Object.freeze([fixturePath, scenario, selected.launcherId]), env: Object.freeze({}) }),
  }) });
}
async function run(scenario: string, timeoutMs = 5_000, signal?: AbortSignal, observeStdoutChunk?: (text: string) => void): Promise<Readonly<{ result: ExternalLibraryLauncherResult; activeChildren: number }>> {
  const service = create_external_library_launcher_service();
  const result = await service.run(fixture_availability(target, scenario), target.id, { timeoutMs, ...(signal ? { signal } : {}), ...(observeStdoutChunk ? { observeStdoutChunk } : {}) });
  return Object.freeze({ result, activeChildren: service.metrics().activeChildren });
}

const valid = await run("valid");
assert.equal(valid.result.ok, true);
assert.equal(valid.result.events?.filter((event) => event.t === "case_end").length, 2);
assert.doesNotMatch(valid.result.ordinaryStdout, /HSON_TEST_EVENT/);

for (const [scenario, pattern] of [
  ["invalid-json", /JSON\/control frame/], ["invalid-control", /JSON\/control frame/], ["unknown-event", /unknown test event/],
  ["duplicate-case-id", /duplicate case ID/], ["end-without-begin", /without a matching case_begin/], ["double-end", /duplicate case_end/],
  ["invalid-diagnostic", /impossible case identity/], ["double-terminal", /after terminal/], ["missing-terminal", /no terminal/],
  ["truncated-control", /truncated control frame/], ["after-terminal", /after terminal/], ["wrong-suite", /suite ID mismatch/],
  ["contradiction", /contradicts emitted cases/],
] as const) {
  const observed = await run(scenario);
  assert.equal(observed.result.ok, false, scenario);
  assert.equal(observed.result.events, undefined, `${scenario} exposes no accepted child events`);
  assert.match(observed.result.protocolError ?? "", pattern, scenario);
  assert.equal(observed.activeChildren, 0, `${scenario} leaves no active child`);
}

const parentService = create_external_library_launcher_service();
const invalidAvailability = fixture_availability(target, "invalid-json");
const parentRegistry = make_local_node_locus_executor_registry();
const parentCatalog = make_test_executor_discovery(parentRegistry, invalidAvailability.targets).catalog;
const parentReporter = new LocalRunReporter(await mkdtemp(join(tmpdir(), "hson-external-protocol-report-")));
try {
  const parentResult = await run_node_selected_verifications(parentRegistry, parentCatalog, invalidAvailability, [target.id], (event) => parentReporter.event(event), {}, { launcherService: parentService });
  const parentReport = await parentReporter.finalize();
  assert.equal(parentResult.ok, false); assert.equal(parentResult.summary.cases, 0);
  assert.equal(parentReport.totals.cases, 0, "protocol infrastructure failures do not synthesize failed child cases");
  assert.equal(parentReport.suites[0]?.status, "error", "protocol infrastructure failure is suite-level error");
} finally { parentService.terminate(); }

const failed = await run("failed");
assert.equal(failed.result.ok, false);
assert.equal(failed.result.protocolError, undefined, "truthful assertion failure is not a protocol error");
assert.equal(failed.result.events?.filter((event) => event.t === "case_end" && event.status === "fail").length, 1);
for (const scenario of ["nonzero", "signal"] as const) {
  const observed = await run(scenario);
  assert.equal(observed.result.ok, false, `${scenario} cannot false-green valid events`);
  assert.equal(observed.result.events?.filter((event) => event.t === "case_end").length, 1);
  assert.equal(scenario === "nonzero" ? observed.result.exitCode === 7 : observed.result.signal !== null, true);
}

const graceful = await run("graceful-timeout", 20);
assert.equal(graceful.result.timedOut, true); assert.equal(graceful.activeChildren, 0);
const completedAbort = new AbortController();
const completedThenCancelled = await run("completed-then-wait", 5_000, completedAbort.signal, (text) => { if (text.includes('"t":"terminal"')) completedAbort.abort(); });
assert.equal(completedThenCancelled.result.ok, true, "an accepted terminal wins a later cancellation race");
assert.equal(completedThenCancelled.result.terminalAcceptedBeforeCancellation, true);
const resistantStarted = performance.now(); const resistantAbort = new AbortController();
const resistant = await run("resistant-timeout", 5_000, resistantAbort.signal, (text) => { if (text.includes("ready")) resistantAbort.abort(); });
assert.equal(resistant.result.cancelled, true); assert.equal(resistant.result.forceKilled, true); assert.equal(resistant.result.signal, "SIGKILL");
assert.equal(resistant.activeChildren, 0); assert.ok(performance.now() - resistantStarted >= EXTERNAL_LIBRARY_LAUNCHER_TERMINATION_GRACE_MS);

for (const [scenario, limit, field] of [["large-stdout", EXTERNAL_LIBRARY_LAUNCHER_STDOUT_LIMIT_BYTES, "stdout"], ["large-stderr", EXTERNAL_LIBRARY_LAUNCHER_STDERR_LIMIT_BYTES, "stderr"]] as const) {
  const observed = await run(scenario);
  assert.equal(observed.result.ok, false, `${scenario} is an infrastructure failure`);
  assert.ok(Buffer.byteLength(observed.result[field], "utf8") <= limit);
  assert.match(observed.result[field], new RegExp(EXTERNAL_LIBRARY_LAUNCHER_TRUNCATION_MARKER));
}
console.log("external launcher case-event protocol: ok (22 process-boundary cases)");
