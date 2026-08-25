const COMMIT = "a".repeat(40);

function evidence(path: string) {
  return { available: true, path, rawBytes: 12, sha256: "b".repeat(64) };
}

function timing(ms = 1) {
  return { queuedAt: 1, startedAt: 2, completedAt: 3, durationMs: ms, ms };
}

function counts(total: number) {
  return { total, pass: total, fail: 0, skip: 0 };
}

function lifecycle(total: number) {
  return { declared: total, total, executed: total, passed: total, failed: 0, skipped: 0, unsupported: 0, cancelled: 0 };
}

export function frozen_test_evidence_fixture(): Record<string, any> {
  const suites = [
    {
      category: "semantic", id: "transform/frozen-client", title: "Frozen client semantics", order: 0, status: "pass", executionShape: "cases",
      counts: lifecycle(1), timing: timing(4), evidence: { available: false },
      cases: [{ id: "transform/frozen-client::loads-index", caseId: "loads-index", title: "loads the immutable index", order: 0, status: "pass", timing: timing(2), evidence: evidence("cases/semantic.json") }],
    },
    {
      category: "browser", id: "browser/frozen-panel", title: "Frozen panel browser proof", order: 0, status: "pass", executionShape: "browser-journeys",
      counts: lifecycle(1), timing: timing(8), evidence: { available: false },
      cases: [{ id: "browser/frozen-panel::renders-inventory", caseId: "renders-inventory", title: "renders the frozen inventory", order: 0, status: "pass", timing: timing(6), evidence: { available: false } }],
    },
    {
      category: "certification", id: "cert/frozen-acquisition", title: "Frozen acquisition certified", order: 0, status: "pass", executionShape: "certification-aggregate",
      counts: lifecycle(1), timing: timing(3), evidence: evidence("suites/certification.json"), cases: [],
    },
  ];
  return {
    deployment: { hsonDeployCommit: COMMIT, hsonDemo2Gitlink: "c".repeat(40), hsonLiveGitlink: "d".repeat(40), intrastructureGitlink: "e".repeat(40) },
    capture: { candidateId: "fixture", capturedAt: "2026-08-24T00:00:00.000Z" },
    accounting: { semantic: { canonical: { cases: 1, pass: 1, fail: 0, skip: 0 } } },
    selectionCategories: ["semantic", "browser", "certification"],
    categories: [
      { id: "semantic", status: "passed", suiteCounts: counts(1), caseCounts: counts(1), summary: { cases: 1, pass: 1, fail: 0, skip: 0 }, timing: { startedAt: 1, completedAt: 3, runnerMs: 4, hostMs: 5 }, evidenceAvailable: true, report: evidence("reports/semantic.json") },
      { id: "browser", status: "passed", suiteCounts: counts(1), caseCounts: counts(1), summary: { cases: 1, pass: 1, fail: 0, skip: 0 }, timing: { startedAt: 1, completedAt: 3, runnerMs: 8, hostMs: 9 }, evidenceAvailable: false, report: evidence("reports/browser.json") },
      { id: "certification", status: "passed", suiteCounts: counts(1), caseCounts: counts(0), summary: { cases: 0, pass: 0, fail: 0, skip: 0 }, timing: { startedAt: 1, completedAt: 3, runnerMs: 3, hostMs: 4 }, evidenceAvailable: true, report: evidence("reports/certification.json") },
    ],
    suites,
  };
}

export const FROZEN_TEST_EVIDENCE_COMMIT = COMMIT;
export const FROZEN_TEST_EVIDENCE_ROOT = `/test-evidence/${COMMIT}`;

/** Synthetic current-scale explorer fixture. Its values intentionally do not
 * mirror or constrain the executable test inventory. */
export function large_frozen_test_evidence_inventory_fixture(): Record<string, any> {
  const semanticDomains = [
    { id: "transform", suites: 36, cases: 314 },
    { id: "livetree", suites: 36, cases: 314 },
    { id: "livemap", suites: 36, cases: 314 },
    { id: "locus", suites: 36, cases: 314 },
    { id: "livehost", suites: 36, cases: 314 },
    { id: "reflect", suites: 35, cases: 314 },
    { id: "unit", suites: 35, cases: 314 },
    { id: "dev", suites: 35, cases: 307 },
  ] as const;
  const categoryPlan = [
    { id: "semantic", suites: 285, cases: 2505, shape: "cases" },
    { id: "browser", suites: 19, cases: 83, shape: "browser-journeys" },
    { id: "certification", suites: 61, cases: 0, shape: "certification-aggregate" },
  ] as const;
  const semanticSuites = semanticDomains.flatMap((domain) => {
    const baseCases = Math.floor(domain.cases / domain.suites);
    const remainder = domain.cases % domain.suites;
    return Array.from({ length: domain.suites }, (_, suiteIndex) => {
      const suiteId = domain.id === "locus"
        ? `livehost/locus/suite-${String(suiteIndex).padStart(3, "0")}`
        : `${domain.id}/suite-${String(suiteIndex).padStart(3, "0")}`;
      const caseCount = baseCases + (suiteIndex < remainder ? 1 : 0);
      return {
        category: "semantic",
        id: suiteId,
        title: `${domain.id} representative suite ${suiteIndex}`,
        order: suiteIndex,
        status: "pass",
        executionShape: "cases",
        counts: lifecycle(caseCount),
        timing: timing(suiteIndex + 1),
        evidence: suiteIndex === 0 ? evidence(`suites/${domain.id}-000.json`) : { available: false },
        cases: Array.from({ length: caseCount }, (_, caseIndex) => ({
          id: `${suiteId}::case-${String(caseIndex).padStart(3, "0")}`,
          caseId: `case-${String(caseIndex).padStart(3, "0")}`,
          title: `${domain.id} representative case ${caseIndex}`,
          order: caseIndex,
          status: "pass",
          timing: timing(caseIndex + 0.5),
          evidence: caseIndex === 0 ? evidence(`cases/${domain.id}-${suiteIndex}-${caseIndex}.json`) : { available: false },
        })),
      };
    });
  });
  const suites = [
    ...semanticSuites,
    ...categoryPlan.filter((plan) => plan.id !== "semantic").flatMap((plan) => {
    const baseCases = Math.floor(plan.cases / plan.suites);
    const remainder = plan.cases % plan.suites;
    return Array.from({ length: plan.suites }, (_, suiteIndex) => {
      const suiteId = `${plan.id}/suite-${String(suiteIndex).padStart(3, "0")}`;
      const caseCount = baseCases + (suiteIndex < remainder ? 1 : 0);
      return {
        category: plan.id,
        id: suiteId,
        title: `${plan.id} representative suite ${suiteIndex}`,
        order: suiteIndex,
        status: "pass",
        executionShape: plan.shape,
        counts: lifecycle(plan.id === "certification" ? 1 : caseCount),
        timing: timing(suiteIndex + 1),
        evidence: suiteIndex === 0 ? evidence(`suites/${plan.id}-000.json`) : { available: false },
        cases: Array.from({ length: caseCount }, (_, caseIndex) => ({
          id: `${suiteId}::case-${String(caseIndex).padStart(3, "0")}`,
          caseId: `case-${String(caseIndex).padStart(3, "0")}`,
          title: `${plan.id} representative case ${caseIndex}`,
          order: caseIndex,
          status: "pass",
          timing: timing(caseIndex + 0.5),
          evidence: caseIndex === 0 ? evidence(`cases/${plan.id}-${suiteIndex}-${caseIndex}.json`) : { available: false },
        })),
      };
    });
    }),
  ];
  return {
    deployment: { hsonDeployCommit: COMMIT },
    accounting: { inventory: { suites: suites.length, cases: suites.flatMap((suite) => suite.cases).length } },
    selectionCategories: ["semantic", "browser", "certification"],
    categories: categoryPlan.map((plan) => ({
      id: plan.id,
      status: "passed",
      suiteCounts: counts(plan.suites),
      caseCounts: counts(plan.cases),
      summary: { cases: plan.cases, pass: plan.cases, fail: 0, skip: 0 },
      timing: { startedAt: 1, completedAt: 3, runnerMs: plan.suites, hostMs: plan.suites + 1 },
      evidenceAvailable: true,
      report: evidence(`reports/${plan.id}.json`),
    })),
    suites,
  };
}
