export const FROZEN_TEST_CATEGORIES = Object.freeze(["semantic", "browser", "certification"] as const);

export type FrozenTestCategoryId = typeof FROZEN_TEST_CATEGORIES[number];
export type FrozenTestStatus = "pass" | "fail" | "skip";
export type FrozenTestRunStatus = "passed" | "failed" | "cancelled";

export type FrozenEvidenceReference = Readonly<{
  available: boolean;
  path?: string;
  rawBytes?: number;
  sha256?: string;
}>;

export type FrozenTestTiming = Readonly<{
  queuedAt?: number | null;
  startedAt?: number | null;
  completedAt?: number | null;
  durationMs?: number | null;
  ms?: number | null;
  runnerMs?: number | null;
  hostMs?: number | null;
}>;

export type FrozenStatusCounts = Readonly<{ total: number; pass: number; fail: number; skip: number }>;

export type FrozenTestCase = Readonly<{
  id: string;
  caseId: string;
  title: string;
  order: number;
  status: FrozenTestStatus;
  timing: FrozenTestTiming;
  evidence?: FrozenEvidenceReference;
}>;

export type FrozenTestSuite = Readonly<{
  category: FrozenTestCategoryId;
  id: string;
  title: string;
  order: number;
  status: FrozenTestStatus;
  executionShape: "cases" | "browser-journeys" | "opaque-aggregate" | "certification-aggregate";
  counts: Readonly<{
    declared: number;
    total: number;
    executed: number;
    passed: number;
    failed: number;
    skipped: number;
    unsupported: number;
    cancelled: number;
  }>;
  timing: FrozenTestTiming;
  evidence?: FrozenEvidenceReference;
  cases: readonly FrozenTestCase[];
}>;

export type FrozenTestCategory = Readonly<{
  id: FrozenTestCategoryId;
  status: FrozenTestRunStatus;
  suiteCounts: FrozenStatusCounts;
  caseCounts: FrozenStatusCounts;
  summary: Readonly<Record<string, number>>;
  timing: FrozenTestTiming;
  evidenceAvailable: boolean;
  report: FrozenEvidenceReference;
}>;

export type FrozenTestEvidenceIndex = Readonly<{
  deployment: Readonly<{ hsonDeployCommit: string }> & Readonly<Record<string, unknown>>;
  selectionCategories: readonly FrozenTestCategoryId[];
  categories: readonly FrozenTestCategory[];
  suites: readonly FrozenTestSuite[];
  accounting: Readonly<Record<string, unknown>>;
}>;

export class FrozenTestEvidenceError extends Error {
  constructor(readonly code: string, message: string, options?: ErrorOptions) {
    super(`${code}: ${message}`, options);
    this.name = "FrozenTestEvidenceError";
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "text">>;

export type FrozenTestEvidenceClient = Readonly<{
  root: string;
  deploymentCommit: string;
  loadIndex(): Promise<FrozenTestEvidenceIndex>;
  loadRowEvidence(reference: FrozenEvidenceReference): Promise<unknown>;
}>;

function fail(code: string, message: string): never {
  throw new FrozenTestEvidenceError(code, message);
}

export function validate_frozen_test_evidence_root(configured: string | undefined): Readonly<{ root: string; deploymentCommit: string }> {
  if (configured === undefined) fail("FROZEN_EVIDENCE_ROOT_MISSING", "VITE_TEST_EVIDENCE_ROOT is required in frozen production.");
  const root = configured.trim();
  if (root === "") fail("FROZEN_EVIDENCE_ROOT_EMPTY", "VITE_TEST_EVIDENCE_ROOT must not be empty.");
  if (!root.startsWith("/")) fail("FROZEN_EVIDENCE_ROOT_NOT_ROOT_RELATIVE", "Evidence root must be a root-relative path.");
  if (root.includes("?") || root.includes("#")) fail("FROZEN_EVIDENCE_ROOT_DECORATED", "Evidence root must not contain a query string or fragment.");
  if (root.includes("\\") || root.split("/").some((segment) => segment === "." || segment === "..")) {
    fail("FROZEN_EVIDENCE_ROOT_TRAVERSAL", "Evidence root must not contain traversal segments.");
  }
  if (root.toLowerCase().split("/").includes("latest")) fail("FROZEN_EVIDENCE_ROOT_MUTABLE", "Mutable latest-style evidence roots are forbidden.");
  const matched = /^\/test-evidence\/([0-9a-f]{40})$/.exec(root);
  if (matched === null) fail("FROZEN_EVIDENCE_ROOT_COMMIT", "Evidence root must end in one exact lowercase 40-hex deployment commit.");
  return Object.freeze({ root, deploymentCommit: matched[1]! });
}

function record(value: unknown, at: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail("FROZEN_INDEX_MALFORMED", `${at} must be an object.`);
  return value as Record<string, unknown>;
}

function array(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value)) fail("FROZEN_INDEX_MALFORMED", `${at} must be an array.`);
  return value;
}

function string(value: unknown, at: string): string {
  if (typeof value !== "string" || value.length === 0) fail("FROZEN_INDEX_MALFORMED", `${at} must be a non-empty string.`);
  return value;
}

function nonnegative(value: unknown, at: string, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    fail("FROZEN_INDEX_MALFORMED", `${at} must be a non-negative${integer ? " integer" : " finite number"}.`);
  }
  return value;
}

function nullable_number(value: unknown, at: string): number | null {
  if (value === null) return null;
  return nonnegative(value, at);
}

function status(value: unknown, at: string): FrozenTestStatus {
  if (value !== "pass" && value !== "fail" && value !== "skip") fail("FROZEN_INDEX_MALFORMED", `${at} has an invalid terminal status.`);
  return value;
}

function run_status(value: unknown, at: string): FrozenTestRunStatus {
  if (value !== "passed" && value !== "failed" && value !== "cancelled") fail("FROZEN_INDEX_MALFORMED", `${at} has an invalid terminal run status.`);
  return value;
}

function category_id(value: unknown, at: string): FrozenTestCategoryId {
  if (!FROZEN_TEST_CATEGORIES.includes(value as FrozenTestCategoryId)) fail("FROZEN_INDEX_MALFORMED", `${at} has an unknown category.`);
  return value as FrozenTestCategoryId;
}

function timing(value: unknown, at: string): FrozenTestTiming {
  const source = record(value, at);
  const decoded: Record<string, number | null> = {};
  for (const key of ["queuedAt", "startedAt", "completedAt", "durationMs", "ms", "runnerMs", "hostMs"] as const) {
    if (key in source) decoded[key] = nullable_number(source[key], `${at}.${key}`);
  }
  if (!("ms" in source) && !("durationMs" in source) && !("runnerMs" in source) && !("hostMs" in source)) {
    fail("FROZEN_INDEX_MALFORMED", `${at} must contain timing data.`);
  }
  return Object.freeze(decoded);
}

function evidence_path(value: unknown, at: string): string {
  const path = string(value, at);
  if (path.startsWith("/") || path.includes("\\") || path.includes("%") || path.includes("?") || path.includes("#")) {
    fail("FROZEN_INDEX_EVIDENCE_PATH", `${at} must be package-relative and undecorated.`);
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail("FROZEN_INDEX_EVIDENCE_PATH", `${at} must not escape the evidence package.`);
  }
  return path;
}

function evidence(value: unknown, at: string): FrozenEvidenceReference | undefined {
  if (value === undefined || value === null) return undefined;
  const source = record(value, at);
  if (source.available !== undefined && typeof source.available !== "boolean") fail("FROZEN_INDEX_EVIDENCE_METADATA", `${at}.available must be boolean when supplied.`);
  if (source.available === false) {
    if (source.path !== undefined || source.rawBytes !== undefined || source.sha256 !== undefined) {
      fail("FROZEN_INDEX_EVIDENCE_METADATA", `${at} cannot describe an unavailable artifact.`);
    }
    return Object.freeze({ available: false });
  }
  if (source.available === undefined && source.path === undefined) fail("FROZEN_INDEX_EVIDENCE_METADATA", `${at} must declare availability or an explicit path.`);
  const path = evidence_path(source.path, `${at}.path`);
  const rawBytes = nonnegative(source.rawBytes, `${at}.rawBytes`, true);
  let sha256: string | undefined;
  if (source.sha256 !== undefined) {
    sha256 = string(source.sha256, `${at}.sha256`);
    if (!/^[0-9a-f]{64}$/.test(sha256)) fail("FROZEN_INDEX_EVIDENCE_METADATA", `${at}.sha256 must be lowercase 64-hex.`);
  }
  return Object.freeze({ available: true, path, rawBytes, ...(sha256 === undefined ? {} : { sha256 }) });
}

function status_counts(value: unknown, at: string): FrozenStatusCounts {
  const source = record(value, at);
  const counts = {
    total: nonnegative(source.total, `${at}.total`, true),
    pass: nonnegative(source.pass, `${at}.pass`, true),
    fail: nonnegative(source.fail, `${at}.fail`, true),
    skip: nonnegative(source.skip, `${at}.skip`, true),
  };
  if (counts.pass + counts.fail + counts.skip !== counts.total) fail("FROZEN_INDEX_MALFORMED", `${at} totals do not balance.`);
  return Object.freeze(counts);
}

function lifecycle_counts(value: unknown, at: string): FrozenTestSuite["counts"] {
  const source = record(value, at);
  const decoded = Object.fromEntries([
    "declared", "total", "executed", "passed", "failed", "skipped", "unsupported", "cancelled",
  ].map((key) => [key, nonnegative(source[key], `${at}.${key}`, true)])) as FrozenTestSuite["counts"];
  if (decoded.passed + decoded.failed + decoded.skipped + decoded.unsupported + decoded.cancelled !== decoded.executed) {
    fail("FROZEN_INDEX_MALFORMED", `${at} executed totals do not balance.`);
  }
  return Object.freeze(decoded);
}

function numeric_summary(value: unknown, at: string): Readonly<Record<string, number>> {
  const source = record(value, at);
  const decoded: Record<string, number> = {};
  for (const [key, item] of Object.entries(source)) decoded[key] = nonnegative(item, `${at}.${key}`, true);
  return Object.freeze(decoded);
}

export function decode_frozen_test_evidence_index(value: unknown, expectedCommit: string): FrozenTestEvidenceIndex {
  const source = record(value, "index");
  const deploymentSource = record(source.deployment, "index.deployment");
  const deploymentCommit = string(deploymentSource.hsonDeployCommit, "index.deployment.hsonDeployCommit");
  if (!/^[0-9a-f]{40}$/.test(deploymentCommit)) fail("FROZEN_INDEX_MALFORMED", "index deployment commit must be lowercase 40-hex.");
  if (deploymentCommit !== expectedCommit) {
    fail("FROZEN_INDEX_DEPLOYMENT_MISMATCH", `Index commit ${deploymentCommit} does not match evidence root commit ${expectedCommit}.`);
  }

  const selectionCategories = array(source.selectionCategories, "index.selectionCategories").map((item, index) => category_id(item, `index.selectionCategories[${index}]`));
  if (selectionCategories.length !== FROZEN_TEST_CATEGORIES.length
    || selectionCategories.some((item, index) => item !== FROZEN_TEST_CATEGORIES[index])) {
    fail("FROZEN_INDEX_MALFORMED", "index.selectionCategories must be semantic, browser, certification in canonical order.");
  }

  const categoryIds = new Set<string>();
  const categories = array(source.categories, "index.categories").map((item, index): FrozenTestCategory => {
    const at = `index.categories[${index}]`;
    const entry = record(item, at);
    const id = category_id(entry.id, `${at}.id`);
    if (categoryIds.has(id)) fail("FROZEN_INDEX_DUPLICATE_ID", `Duplicate category id ${id}.`);
    categoryIds.add(id);
    const report = evidence(entry.report, `${at}.report`);
    if (report?.available !== true) fail("FROZEN_INDEX_EVIDENCE_METADATA", `${at}.report must contain the explicit canonical report artifact.`);
    if (typeof entry.evidenceAvailable !== "boolean") fail("FROZEN_INDEX_MALFORMED", `${at}.evidenceAvailable must be boolean.`);
    return Object.freeze({
      id,
      status: run_status(entry.status, `${at}.status`),
      suiteCounts: status_counts(entry.suiteCounts, `${at}.suiteCounts`),
      caseCounts: status_counts(entry.caseCounts, `${at}.caseCounts`),
      summary: numeric_summary(entry.summary, `${at}.summary`),
      timing: timing(entry.timing, `${at}.timing`),
      evidenceAvailable: entry.evidenceAvailable,
      report,
    });
  });
  if (categories.length !== FROZEN_TEST_CATEGORIES.length || FROZEN_TEST_CATEGORIES.some((id) => !categoryIds.has(id))) {
    fail("FROZEN_INDEX_MALFORMED", "index must contain exactly the three expected categories.");
  }

  const suiteIds = new Set<string>();
  const caseIds = new Set<string>();
  const suites = array(source.suites, "index.suites").map((item, suiteIndex): FrozenTestSuite => {
    const at = `index.suites[${suiteIndex}]`;
    const entry = record(item, at);
    const id = string(entry.id, `${at}.id`);
    if (suiteIds.has(id)) fail("FROZEN_INDEX_DUPLICATE_ID", `Duplicate suite id ${id}.`);
    suiteIds.add(id);
    const category = category_id(entry.category, `${at}.category`);
    if (!categoryIds.has(category)) fail("FROZEN_INDEX_RELATIONSHIP", `Suite ${id} refers to missing category ${category}.`);
    const shape = entry.executionShape;
    if (shape !== "cases" && shape !== "browser-journeys" && shape !== "opaque-aggregate" && shape !== "certification-aggregate") {
      fail("FROZEN_INDEX_MALFORMED", `${at}.executionShape is invalid.`);
    }
    const cases = array(entry.cases, `${at}.cases`).map((caseValue, caseIndex): FrozenTestCase => {
      const caseAt = `${at}.cases[${caseIndex}]`;
      const caseEntry = record(caseValue, caseAt);
      const caseId = string(caseEntry.caseId, `${caseAt}.caseId`);
      const caseKey = string(caseEntry.id, `${caseAt}.id`);
      if (caseIds.has(caseKey)) fail("FROZEN_INDEX_DUPLICATE_ID", `Duplicate case id ${caseKey}.`);
      caseIds.add(caseKey);
      if (caseKey !== `${id}::${caseId}`) fail("FROZEN_INDEX_RELATIONSHIP", `Case ${caseKey} is not owned by suite ${id}.`);
      const caseEvidence = evidence(caseEntry.evidence, `${caseAt}.evidence`);
      return Object.freeze({
        id: caseKey,
        caseId,
        title: string(caseEntry.title, `${caseAt}.title`),
        order: nonnegative(caseEntry.order, `${caseAt}.order`, true),
        status: status(caseEntry.status, `${caseAt}.status`),
        timing: timing(caseEntry.timing, `${caseAt}.timing`),
        ...(caseEvidence === undefined ? {} : { evidence: caseEvidence }),
      });
    });
    const suiteEvidence = evidence(entry.evidence, `${at}.evidence`);
    return Object.freeze({
      category,
      id,
      title: string(entry.title, `${at}.title`),
      order: nonnegative(entry.order, `${at}.order`, true),
      status: status(entry.status, `${at}.status`),
      executionShape: shape,
      counts: lifecycle_counts(entry.counts, `${at}.counts`),
      timing: timing(entry.timing, `${at}.timing`),
      ...(suiteEvidence === undefined ? {} : { evidence: suiteEvidence }),
      cases: Object.freeze(cases),
    });
  });

  for (const category of categories) {
    const ownedSuites = suites.filter((suite) => suite.category === category.id);
    const ownedCases = ownedSuites.flatMap((suite) => suite.cases);
    const actualSuites = { total: ownedSuites.length, pass: 0, fail: 0, skip: 0 };
    const actualCases = { total: ownedCases.length, pass: 0, fail: 0, skip: 0 };
    for (const suite of ownedSuites) actualSuites[suite.status] += 1;
    for (const item of ownedCases) actualCases[item.status] += 1;
    if (JSON.stringify(actualSuites) !== JSON.stringify(category.suiteCounts)
      || JSON.stringify(actualCases) !== JSON.stringify(category.caseCounts)) {
      fail("FROZEN_INDEX_RELATIONSHIP", `Category ${category.id} accounting does not match its suites and cases.`);
    }
  }

  return Object.freeze({
    deployment: Object.freeze({ ...deploymentSource, hsonDeployCommit: deploymentCommit }),
    selectionCategories: Object.freeze(selectionCategories),
    categories: Object.freeze(categories),
    suites: Object.freeze(suites),
    accounting: Object.freeze({ ...record(source.accounting, "index.accounting") }),
  });
}

export function make_frozen_test_evidence_client(options: Readonly<{
  root?: string;
  fetch?: FetchLike;
}> = {}): FrozenTestEvidenceClient {
  const configured = validate_frozen_test_evidence_root(options.root);
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  let cached: FrozenTestEvidenceIndex | undefined;
  let pending: Promise<FrozenTestEvidenceIndex> | undefined;

  async function fetch_json(path: string, kind: "index" | "row"): Promise<unknown> {
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await fetcher(`${configured.root}/${path}`, { method: "GET", credentials: "same-origin" });
    } catch (cause) {
      throw new FrozenTestEvidenceError("FROZEN_EVIDENCE_FETCH_FAILED", `Unable to load ${kind} evidence.`, { cause });
    }
    if (!response.ok) fail("FROZEN_EVIDENCE_HTTP", `${kind} evidence request failed with HTTP ${response.status}.`);
    const bytes = await response.text();
    try { return JSON.parse(bytes) as unknown; }
    catch (cause) { throw new FrozenTestEvidenceError("FROZEN_EVIDENCE_JSON", `${kind} evidence is not valid JSON.`, { cause }); }
  }

  const client: FrozenTestEvidenceClient = Object.freeze({
    root: configured.root,
    deploymentCommit: configured.deploymentCommit,
    loadIndex() {
      if (cached !== undefined) return Promise.resolve(cached);
      pending ??= fetch_json("index.json", "index").then((value) => {
        cached = decode_frozen_test_evidence_index(value, configured.deploymentCommit);
        return cached;
      }).finally(() => { pending = undefined; });
      return pending;
    },
    async loadRowEvidence(reference) {
      if (reference.available !== true || reference.path === undefined) fail("FROZEN_EVIDENCE_UNAVAILABLE", "This row has no frozen evidence artifact.");
      const path = evidence_path(reference.path, "row evidence path");
      return fetch_json(path, "row");
    },
  });
  return client;
}
