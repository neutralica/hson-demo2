import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import {
  decode_frozen_test_evidence_index,
  make_frozen_test_evidence_client,
  validate_frozen_test_evidence_root,
} from "../../../src/app/demos/tests/panel/frozen-test-evidence-client";
import { format_frozen_evidence_size, serialize_frozen_index_summary } from "../../../src/app/demos/tests/panel/frozen-test-presentation";
import { test_panel_acquisition_mode } from "../../../src/app/demos/tests/panel/mount-test-panels";
import {
  FROZEN_TEST_EVIDENCE_COMMIT,
  FROZEN_TEST_EVIDENCE_ROOT,
  frozen_test_evidence_fixture,
} from "../../fixtures/app/frozen-test-evidence-index";

const SUITE = "unit/frozen-test-evidence-client";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function rejects(run: () => unknown | Promise<unknown>, includes: string): Promise<void> {
  try { await run(); }
  catch (error) {
    expect(error instanceof Error && error.message.includes(includes), `expected rejection containing ${includes}, received ${String(error)}`);
    return;
  }
  throw new Error(`expected rejection containing ${includes}`);
}

function response(body: string, status = 200): Pick<Response, "ok" | "status" | "text"> {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}

function artifact_path(owner: "cases" | "suites", id: string): string {
  return `${owner}/${Buffer.from(id, "utf8").toString("base64url")}.json`;
}

function ordinary_case_artifact(suiteId: string, id: string, caseId: string): Record<string, unknown> {
  return {
    category: "semantic", suiteId, caseId: id,
    case: {
      id, caseId, title: "retained ordinary case", status: "pass", errors: [], evidenceRefs: [],
      diagnostic: {
        type: "ordinary", runId: "run:frozen", suite: "canonical/selected", caseKey: id, caseSuite: suiteId, caseId,
        name: "retained ordinary case", status: "pass", ms: 2, error: null,
        assertions: [{ ok: true, label: "retained assertion", actual: "yes", expected: "yes" }],
        values: [{ label: "metadata", value: "frozen" }], artifacts: [], trace: [],
      },
    },
    evidence: [],
  };
}

function configured_case_fixture(artifact: unknown): Readonly<{ index: Record<string, any>; body: string; path: string }> {
  const index = frozen_test_evidence_fixture();
  const item = index.suites[0].cases[0];
  const path = artifact_path("cases", item.id);
  const body = JSON.stringify(artifact);
  item.evidence = { available: true, path, rawBytes: Buffer.byteLength(body), sha256: "b".repeat(64) };
  return { index, body, path };
}

export function frozen_test_evidence_client_suite(): TestSuite {
  const cases: readonly TestCase[] = [
    {
      suite: SUITE, caseId: "development-production-composition-parity", name: "development and production select the same frozen acquisition path",
      run: () => {
        expect(test_panel_acquisition_mode(false) === "frozen", "development must select frozen evidence");
        expect(test_panel_acquisition_mode(true) === "frozen", "production must select frozen evidence");
      },
    },
    {
      suite: SUITE, caseId: "valid-index-loads-once-and-caches", name: "valid index loads once and caches without lazy evidence fetches",
      run: async () => {
        const requests: string[] = [];
        const client = make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async (url) => {
          requests.push(url);
          return response(JSON.stringify(frozen_test_evidence_fixture()));
        } });
        const first = await client.loadIndex();
        const second = await client.loadIndex();
        expect(first === second, "index should be cached by identity");
        expect(first.categories.length === 3 && first.suites.length === 3, "complete fixture inventory should decode");
        expect(JSON.stringify(requests) === JSON.stringify([`${FROZEN_TEST_EVIDENCE_ROOT}/index.json`]), `unexpected initial requests: ${requests.join(", ")}`);
      },
    },
    {
      suite: SUITE, caseId: "rejects-malformed-json", name: "malformed JSON rejects the whole load",
      run: () => rejects(() => make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async () => response("{") }).loadIndex(), "FROZEN_EVIDENCE_JSON"),
    },
    {
      suite: SUITE, caseId: "reports-missing-index-status", name: "missing index reports its HTTP status",
      run: () => rejects(() => make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async () => response("missing", 404) }).loadIndex(), "HTTP 404"),
    },
    {
      suite: SUITE, caseId: "reports-http-failure-status", name: "HTTP failure reports its response status",
      run: () => rejects(() => make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async () => response("unavailable", 503) }).loadIndex(), "HTTP 503"),
    },
    {
      suite: SUITE, caseId: "rejects-wrong-deployment-commit", name: "index deployment must match the immutable root suffix",
      run: () => {
        const index = frozen_test_evidence_fixture();
        index.deployment.hsonDeployCommit = "f".repeat(40);
        return rejects(() => decode_frozen_test_evidence_index(index, FROZEN_TEST_EVIDENCE_COMMIT), "FROZEN_INDEX_DEPLOYMENT_MISMATCH");
      },
    },
    {
      suite: SUITE, caseId: "rejects-duplicate-identities", name: "duplicate category, suite, and case identities reject",
      run: async () => {
        const duplicateSuite = frozen_test_evidence_fixture();
        duplicateSuite.suites.push(clone(duplicateSuite.suites[0]));
        await rejects(() => decode_frozen_test_evidence_index(duplicateSuite, FROZEN_TEST_EVIDENCE_COMMIT), "Duplicate suite id");
        const duplicateCase = frozen_test_evidence_fixture();
        duplicateCase.suites[1].cases[0].id = duplicateCase.suites[0].cases[0].id;
        await rejects(() => decode_frozen_test_evidence_index(duplicateCase, FROZEN_TEST_EVIDENCE_COMMIT), "Duplicate case id");
      },
    },
    {
      suite: SUITE, caseId: "rejects-invalid-suite-case-relationship", name: "case identity must remain owned by its indexed suite",
      run: () => {
        const index = frozen_test_evidence_fixture();
        index.suites[0].cases[0].id = "another/suite::loads-index";
        return rejects(() => decode_frozen_test_evidence_index(index, FROZEN_TEST_EVIDENCE_COMMIT), "FROZEN_INDEX_RELATIONSHIP");
      },
    },
    {
      suite: SUITE, caseId: "rejects-invalid-and-traversing-evidence-paths", name: "evidence paths are package-relative and cannot traverse",
      run: async () => {
        for (const path of ["/cases/absolute.json", "cases/../outside.json", "cases\\outside.json", "cases/%2e%2e/outside.json"]) {
          const index = frozen_test_evidence_fixture();
          index.suites[0].cases[0].evidence.path = path;
          await rejects(() => decode_frozen_test_evidence_index(index, FROZEN_TEST_EVIDENCE_COMMIT), "FROZEN_INDEX_EVIDENCE_PATH");
        }
      },
    },
    {
      suite: SUITE, caseId: "rejects-malformed-evidence-metadata", name: "available evidence requires exact bytes and valid optional digest",
      run: async () => {
        const missingBytes = frozen_test_evidence_fixture();
        delete missingBytes.suites[0].cases[0].evidence.rawBytes;
        await rejects(() => decode_frozen_test_evidence_index(missingBytes, FROZEN_TEST_EVIDENCE_COMMIT), "rawBytes");
        const badDigest = frozen_test_evidence_fixture();
        badDigest.suites[0].cases[0].evidence.sha256 = "mutable";
        await rejects(() => decode_frozen_test_evidence_index(badDigest, FROZEN_TEST_EVIDENCE_COMMIT), "sha256");
      },
    },
    {
      suite: SUITE, caseId: "rejects-invalid-roots-before-fetch", name: "missing, mutable, decorated, traversing, and malformed roots fail before fetch",
      run: async () => {
        for (const root of [undefined, "", "test-evidence/" + FROZEN_TEST_EVIDENCE_COMMIT, "/test-evidence/latest", "/test-evidence/../" + FROZEN_TEST_EVIDENCE_COMMIT, FROZEN_TEST_EVIDENCE_ROOT + "?deployment=x", FROZEN_TEST_EVIDENCE_ROOT + "#x", "/test-evidence/abc"]) {
          await rejects(() => validate_frozen_test_evidence_root(root), "FROZEN_EVIDENCE_ROOT");
        }
      },
    },
    {
      suite: SUITE, caseId: "row-artifact-validates-and-deduplicates", name: "row artifact validation checks retained identity and deduplicates in-flight and completed requests",
      run: async () => {
        const suiteId = "transform/frozen-client";
        const id = `${suiteId}::loads-index`;
        const fixture = configured_case_fixture(ordinary_case_artifact(suiteId, id, "loads-index"));
        const requests: string[] = [];
        const client = make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async (url) => {
          requests.push(url);
          return url.endsWith("index.json") ? response(JSON.stringify(fixture.index)) : response(fixture.body);
        } });
        const index = await client.loadIndex();
        const suite = index.suites[0]!;
        const testCase = suite.cases[0]!;
        const selection = { category: suite.category, suite, testCase, reference: testCase.evidence! } as const;
        const [first, second] = await Promise.all([client.loadRowEvidence(selection), client.loadRowEvidence(selection)]);
        const third = await client.loadRowEvidence(selection);
        expect(first.owner === "case" && first.diagnostic?.caseKey === id && second.owner === "case" && third.owner === "case", "validated case diagnostic should be retained");
        expect(client.snapshot().rowEvidenceRequests === 1 && requests.length === 2, "one artifact GET should serve concurrent and repeated row actions");
      },
    },
    {
      suite: SUITE, caseId: "row-artifact-rejects-identity-and-size-mismatches", name: "row artifacts reject wrapper, nested case, diagnostic, path, and raw-byte mismatches",
      run: async () => {
        const suiteId = "transform/frozen-client";
        const id = `${suiteId}::loads-index`;
        for (const mutation of ["wrapper", "case", "diagnostic", "size", "path"] as const) {
          const artifact = ordinary_case_artifact(suiteId, id, "loads-index") as any;
          if (mutation === "wrapper") artifact.suiteId = "wrong/suite";
          if (mutation === "case") artifact.case.id = "wrong::case";
          if (mutation === "diagnostic") artifact.case.diagnostic.caseKey = "wrong::diagnostic";
          const fixture = configured_case_fixture(artifact);
          if (mutation === "size") fixture.index.suites[0].cases[0].evidence.rawBytes += 1;
          if (mutation === "path") fixture.index.suites[0].cases[0].evidence.path = "cases/not-the-selected-row.json";
          const client = make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async (url) => url.endsWith("index.json") ? response(JSON.stringify(fixture.index)) : response(fixture.body) });
          const index = await client.loadIndex();
          const suite = index.suites[0]!;
          const testCase = suite.cases[0]!;
          await rejects(() => client.loadRowEvidence({ category: suite.category, suite, testCase, reference: testCase.evidence! }), "FROZEN_ROW_EVIDENCE_");
        }
      },
    },
    {
      suite: SUITE, caseId: "row-artifact-reports-http-and-json-failures", name: "row artifact 404 and malformed JSON remain isolated evidence errors",
      run: async () => {
        const suiteId = "transform/frozen-client";
        const id = `${suiteId}::loads-index`;
        const artifact = ordinary_case_artifact(suiteId, id, "loads-index");
        for (const artifactResponse of [response("missing", 404), response("{")] as const) {
          const fixture = configured_case_fixture(artifact);
          const client = make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async (url) => url.endsWith("index.json") ? response(JSON.stringify(fixture.index)) : artifactResponse });
          const index = await client.loadIndex();
          const suite = index.suites[0]!;
          const testCase = suite.cases[0]!;
          await rejects(() => client.loadRowEvidence({ category: suite.category, suite, testCase, reference: testCase.evidence! }), "FROZEN_EVIDENCE_");
          expect(client.snapshot().indexRequests === 1, "row failure must not invalidate the loaded index");
        }
      },
    },
    {
      suite: SUITE, caseId: "formats-raw-byte-sizes", name: "frozen evidence sizes use raw decimal bytes, kB, and MB",
      run: () => {
        expect(format_frozen_evidence_size(999) === "999 B", "byte formatting");
        expect(format_frozen_evidence_size(3_400) === "3.4 kB", "kilobyte formatting");
        expect(format_frozen_evidence_size(2_500_000) === "2.5 MB", "megabyte formatting");
      },
    },
    {
      suite: SUITE, caseId: "copy-reports-is-index-only", name: "frozen Copy Reports serializes complete inventory from the loaded index without artifact requests",
      run: async () => {
        const client = make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async () => response(JSON.stringify(frozen_test_evidence_fixture())) });
        const index = await client.loadIndex();
        const copied = serialize_frozen_index_summary(index);
        expect(copied.includes("Test reports") && copied.includes("transform/frozen-client::loads-index") && copied.includes("CERTIFICATION"), "summary should include category, suite, and case inventory");
        expect(client.snapshot().rowEvidenceRequests === 0, "Copy Reports must not fetch row or full-report evidence");
      },
    },
  ];
  return Object.freeze({ suite: SUITE, cases });
}
