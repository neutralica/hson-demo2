const COMMIT = "a".repeat(40);
const EXPLORER_CATEGORIES = ["transform", "livetree", "livemap", "locus", "livehost", "reflect", "unit", "browser", "certification"] as const;

function encoded(id: string): string { return Buffer.from(id, "utf8").toString("base64url"); }
function path(kind: "categories" | "suites" | "cases", id: string): string { return `${kind}/${encoded(id)}.json`; }
function timing(ms = 1) { return { queuedAt: 1, startedAt: 2, completedAt: 3, durationMs: ms, ms }; }
function lifecycle(total: number) { return { declared: total, total, executed: total, passed: total, failed: 0, skipped: 0, unsupported: 0, cancelled: 0 }; }
function reference(artifactPath: string, text: string) { return { available: true, path: artifactPath, rawBytes: Buffer.byteLength(text), sha256: "b".repeat(64) }; }
function totals(suites = 0, cases = 0) { return { suites, cases, pass: cases, fail: 0, skip: 0, unsupported: 0, cancelled: 0 }; }

export type FrozenTestEvidencePackageFixture = Readonly<{
  index: Record<string, any>;
  artifacts: ReadonlyMap<string, string>;
  suites: readonly Record<string, any>[];
  cases: readonly Record<string, any>[];
}>;

export function frozen_test_evidence_package_fixture(): FrozenTestEvidencePackageFixture {
  const artifacts = new Map<string, string>();
  const suitePlans = [
    { categoryId: "transform", category: "semantic", id: "transform/frozen-client", title: "Frozen client semantics", shape: "cases", caseIds: ["loads-index", "releases-detail"] as const, detail: false },
    { categoryId: "browser", category: "browser", id: "livedemo/browser/frozen-panel", title: "Frozen panel browser proof", shape: "browser-journeys", caseIds: ["renders-inventory"] as const, detail: false },
    { categoryId: "certification", category: "certification", id: "verification/frozen-acquisition", title: "Frozen acquisition certified", shape: "certification-aggregate", caseIds: [] as const, detail: true },
  ] as const;
  const suites: Record<string, any>[] = [];
  const cases: Record<string, any>[] = [];
  for (const [order, plan] of suitePlans.entries()) {
    const caseRows: Record<string, any>[] = [];
    for (const [caseOrder, caseId] of plan.caseIds.entries()) {
      const id = `${plan.id}::${caseId}`;
      const item = { id, caseId, title: `case ${caseId}`, order: caseOrder, status: "pass", timing: timing(2), errors: [], evidenceRefs: [], diagnostic: {
        type: "ordinary", runId: "run:frozen", suite: "canonical/selected", caseKey: id, caseSuite: plan.id, caseId,
        name: `case ${caseId}`, status: "pass", ms: 2, error: null, assertions: [],
        values: caseId === "loads-index" ? Array.from({ length: 80 }, (_, index) => ({ label: `retained line ${index + 1}`, value: "frozen report content" })) : [],
        artifacts: [], trace: [],
      } };
      const caseBody = JSON.stringify({ category: plan.category, suiteId: plan.id, caseId: id, case: item, evidence: [] });
      const caseReference = reference(path("cases", id), caseBody);
      artifacts.set(caseReference.path, caseBody);
      caseRows.push({ id, caseId, title: item.title, order: caseOrder, status: "pass", timing: item.timing, evidence: caseReference });
      cases.push(item);
    }
    const count = plan.caseIds.length === 0 ? 1 : caseRows.length;
    const suite = {
      categoryId: plan.categoryId, category: plan.category, id: plan.id, title: plan.title, order, status: "pass", executionShape: plan.shape,
      counts: lifecycle(count), timing: timing(order + 3), suiteEvidenceAvailable: plan.detail,
    } as Record<string, any>;
    const retained = [{ id: "artifact:proof", sequence: 1, timestamp: 2, executorId: "fixture", kind: "artifact", name: "proof", content: "retained certification evidence", truncated: false, knownBytes: 31, reference: null, mediaType: "text/plain" }];
    const suiteBody = JSON.stringify({
      categoryId: plan.categoryId, category: plan.category, suiteId: plan.id, cases: caseRows,
      ...(plan.detail ? { suite: { id: plan.id, title: plan.title, status: "pass", errors: [] }, evidenceRefs: ["artifact:proof"], evidence: retained } : {}),
    });
    suite.listing = reference(path("suites", plan.id), suiteBody);
    artifacts.set(suite.listing.path, suiteBody);
    suites.push(suite);
  }

  const categories = EXPLORER_CATEGORIES.map((id, order) => {
    const owned = suites.filter((suite) => suite.categoryId === id);
    const count = owned.reduce((sum, suite) => sum + suite.counts.total, 0);
    const categoryBody = JSON.stringify({ categoryId: id, suites: owned });
    const listing = reference(path("categories", id), categoryBody);
    artifacts.set(listing.path, categoryBody);
    return { id, title: id.toUpperCase(), order, status: owned.length === 0 ? "unexecuted" : "pass", counts: totals(owned.length, count), timing: { durationMs: owned.reduce((sum, suite) => sum + suite.timing.ms, 0) }, listing };
  });
  const overall = categories.reduce((sum, category) => {
    for (const key of Object.keys(sum) as (keyof typeof sum)[]) sum[key] += category.counts[key];
    return sum;
  }, totals());
  const index = {
    deployment: { hsonDeployCommit: COMMIT, hsonDemo2Gitlink: "c".repeat(40), hsonLiveGitlink: "d".repeat(40), intrastructureGitlink: "e".repeat(40) },
    capture: { candidateId: "fixture", capturedAt: "2026-08-24T00:00:00.000Z" },
    accounting: { semantic: { canonical: { cases: 1, pass: 1, fail: 0, skip: 0 } } },
    overall,
    categories,
  };
  return Object.freeze({ index, artifacts, suites, cases });
}

export function frozen_test_evidence_fixture(): Record<string, any> { return frozen_test_evidence_package_fixture().index; }
export const FROZEN_TEST_EVIDENCE_COMMIT = COMMIT;
export const FROZEN_TEST_EVIDENCE_ROOT = `/test-evidence/${COMMIT}`;
export function large_frozen_test_evidence_inventory_fixture(): Record<string, any> { return frozen_test_evidence_fixture(); }
