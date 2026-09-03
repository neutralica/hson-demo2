import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, mkdir, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalRunReporter } from "../../harness/reporting/local/run-reporter";
import { begin_run, finalize_run, prune_reports } from "../../harness/reporting/local/run-report-storage";
import { reduce_status } from "../../../src/shared/testing/test-run-contract";
import type { RunReport } from "../../harness/reporting/local/run-report-contract";
import { decode_frozen_test_category_listing, decode_frozen_test_evidence_index, decode_frozen_test_suite_listing, validate_frozen_row_artifact } from "../../../src/app/demos/tests/panel/frozen-test-evidence-client";
let checks = 0; const check = async (name: string, fn: () => Promise<void>) => { await fn(); checks++; console.log(`ok ${checks} - ${name}`); };
const base = await mkdtemp(join(tmpdir(), "hson-report-meta-"));
const emit = async (status: "pass" | "fail" | "skip" | "cancelled", err?: string) => { const r = new LocalRunReporter(base, { profile: "fixture", ids: ["suite::case"] }); r.event({ t: "suite_begin", suite: "fixture/suite" }); r.event({ t: "case_begin", suite: "fixture/suite", caseId: "case", name: "case" }); if (status === "cancelled") r.event({ t: "case_cancelled", suite: "fixture/suite", caseId: "case", name: "case", ms: 1 }); else r.event({ t: "case_end", suite: "fixture/suite", caseId: "case", name: "case", status, ms: 1, ...(err ? { err } : {}) }); r.event({ t: "suite_end", suite: "fixture/suite", ms: 1 }); return r.finalize(); };
await check("pass, failure, timeout and cancellation retain terminal evidence", async () => { assert.equal((await emit("pass")).status, "pass"); assert.equal((await emit("fail", "[TEST_CASE_TIMEOUT] timeout")).status, "fail"); assert.equal((await emit("cancelled")).status, "cancelled"); });
await check("terminal reducer preserves specified precedence", async () => { assert.equal(reduce_status(["skip", "unsupported"]), "unsupported"); assert.equal(reduce_status(["pass", "fail"]), "fail"); assert.equal(reduce_status(["pass", "cancelled"]), "cancelled"); assert.equal(reduce_status(["fail", "error"]), "error"); });
await check("redaction happens before local persistence", async () => { const report = await emit("fail", `${process.env.HOME}/secret Authorization: Bearer abc.def token=sensitive`); const raw = await readFile(join(base, ".test-reports", report.id, "run.json"), "utf8"); assert.match(raw, /<home>|<repo>/); assert.match(raw, /Authorization: <redacted>/); assert.doesNotMatch(raw, /abc\.def|sensitive/); });
await check("materializer error finalizes an error report and advances complete current", async () => { const r = new LocalRunReporter(base); const report = await r.finalize({ injectMaterializerFailure: true }); assert.equal(report.status, "error"); const current = JSON.parse(await readFile(join(base, ".test-reports", "current.json"), "utf8")); assert.equal(current.runId, report.id); });
await check("direct materialization decodes progressively through the explorer contract", async () => {
  const report = await emit("fail", "assertion failed");
  const site = join(base, ".test-reports", report.id, "site");
  const index = decode_frozen_test_evidence_index(JSON.parse(await readFile(join(site, "index.json"), "utf8")), report.id);
  assert.equal(index.status, "fail"); assert.equal(index.categories.length, 1);
  const category = index.categories[0]!;
  const categoryListing = decode_frozen_test_category_listing(JSON.parse(await readFile(join(site, category.listing.file), "utf8")), category);
  const suite = categoryListing.suites[0]!;
  const suiteListing = decode_frozen_test_suite_listing(JSON.parse(await readFile(join(site, suite.listing.file), "utf8")), suite);
  const testCase = suiteListing.cases[0]!;
  const detail = validate_frozen_row_artifact(JSON.parse(await readFile(join(site, testCase.evidence.file), "utf8")), { suite, testCase, reference: testCase.evidence });
  assert.equal(detail.status, "fail"); assert.equal(detail.diagnostics[0]?.kind, "test");
});
await check("emitted categories materialize dynamically in deterministic safe order", async () => {
  const reporter = new LocalRunReporter(base);
  for (const [suite, category] of [["zeta/suite", "zeta"], ["alpha/suite", "../Alpha Category"]] as const) {
    reporter.event({ t: "suite_begin", suite, title: suite, category });
    reporter.event({ t: "case_begin", suite, caseId: "case", name: "case" });
    reporter.event({ t: "case_end", suite, caseId: "case", name: "case", status: "pass", ms: 1 });
    reporter.event({ t: "suite_end", suite, ms: 1 });
  }
  const report = await reporter.finalize();
  const index = JSON.parse(await readFile(join(base, ".test-reports", report.id, "site", "index.json"), "utf8"));
  assert.deepEqual(index.categories.map((category: { id: string }) => category.id), ["../Alpha Category", "zeta"]);
  assert.equal(index.categories.every((category: { file: string }) => /^categories\/[a-z0-9-]+\.json$/.test(category.file)), true);
  assert.deepEqual(index.suites.map((suite: { id: string }) => suite.id), ["alpha/suite", "zeta/suite"]);
});
await check("retention keeps ten terminal runs and prunes only old owned incomplete directories", async () => { for (let i = 0; i < 11; i++) await emit(i % 2 ? "fail" : "pass"); const reports = await readdir(join(base, ".test-reports"), { withFileTypes: true }); assert.ok(reports.filter((e) => e.isDirectory() && !e.name.startsWith(".incomplete-")).length <= 10); const old = await begin_run(base, "old"); await utimes(old, new Date(Date.now() - 25 * 3600e3), new Date(Date.now() - 25 * 3600e3)); const young = await begin_run(base, "young"); await mkdir(join(base, ".test-reports", "unrelated")); await prune_reports(join(base, ".test-reports")); const after = await readdir(join(base, ".test-reports")); assert.ok(!after.includes(".incomplete-old") && after.includes(".incomplete-young") && after.includes("unrelated")); });
console.log(`# ${checks} report meta checks passed`);
