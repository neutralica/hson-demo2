import assert from "node:assert/strict";
import { create_local_redactor } from "../../harness/reporting/local/run-report-redaction";
import { TestEventAdapter } from "../../harness/reporting/local/test-event-adapter";

let tick = 0;
const adapter = new TestEventAdapter(create_local_redactor(process.cwd()), () => new Date(1_000 + tick++ * 10));
adapter.ingest({ t: "suite_begin", suite: "ordinary/lifecycle", title: "Lifecycle", category: "integration" });
adapter.ingest({ t: "case_begin", suite: "ordinary/lifecycle", caseId: "pass", name: "passes" });
adapter.ingest({ t: "case_end", suite: "ordinary/lifecycle", caseId: "pass", name: "passes", status: "pass", ms: 4 });
adapter.ingest({ t: "case_end", suite: "ordinary/lifecycle", caseId: "pass", name: "must be ignored", status: "fail", ms: 5, err: "late reopen" });
adapter.ingest({ t: "case_begin", suite: "ordinary/lifecycle", caseId: "cancel", name: "cancelled" });
adapter.ingest({ t: "case_cancelled", suite: "ordinary/lifecycle", caseId: "cancel", name: "cancelled", ms: 6 });
adapter.ingest({ t: "suite_end", suite: "ordinary/lifecycle", ms: 10 });
const lifecycle = adapter.finalize()[0]!;
assert.equal(lifecycle.status, "cancelled");
assert.deepEqual(lifecycle.cases.map((entry) => [entry.id, entry.status]), [["pass", "pass"], ["cancel", "cancelled"]]);
assert.equal(lifecycle.cases[0]?.diagnostics.length, 0, "a terminal case cannot be reopened by a second terminal event");
assert.equal(lifecycle.totals.cases, 2);
assert.equal(lifecycle.totals.pass, 1);
assert.equal(lifecycle.totals.cancelled, 1);

const external = (overrides: Record<string, unknown>) => ({
  t: "external_end" as const, id: "external", suite: "external/runtime", name: "external", subject: "integration" as const,
  runtime: "node", collections: [], status: "fail" as const, ms: 1, stdout: "", stderr: "", exitCode: 1,
  signal: null, timedOut: false, ...overrides,
});
const protocol = new TestEventAdapter(create_local_redactor(process.cwd()));
protocol.ingest(external({ exitCode: 0, protocolError: "terminal truncated" }));
assert.equal(protocol.finalize()[0]?.status, "error");
assert.equal(protocol.finalize()[0]?.diagnostics[0]?.kind, "external-protocol");
const timeout = new TestEventAdapter(create_local_redactor(process.cwd()));
timeout.ingest(external({ timedOut: true, signal: "SIGTERM" }));
assert.equal(timeout.finalize()[0]?.status, "error");
assert.equal(timeout.finalize()[0]?.subprocess?.timedOut, true);
const cancelled = new TestEventAdapter(create_local_redactor(process.cwd()));
cancelled.ingest(external({ status: "cancelled", cancelled: true, exitCode: null, signal: "SIGTERM" }));
assert.equal(cancelled.finalize()[0]?.status, "cancelled");
assert.equal(cancelled.finalize()[0]?.subprocess?.cancelled, true);
const unsupported = new TestEventAdapter(create_local_redactor(process.cwd()));
unsupported.ingest(external({ status: "pass", terminalStatus: "unsupported", exitCode: 0 }));
assert.equal(unsupported.finalize()[0]?.status, "unsupported", "child terminal status remains authoritative");
const infrastructure = new TestEventAdapter(create_local_redactor(process.cwd()));
infrastructure.ingest(external({ status: "fail", terminalStatus: "error", exitCode: 0 }));
assert.equal(infrastructure.finalize()[0]?.status, "error", "child infrastructure status remains explicit");

console.log(JSON.stringify({ suite: "reporter-lifecycle", checks: 15 }));
