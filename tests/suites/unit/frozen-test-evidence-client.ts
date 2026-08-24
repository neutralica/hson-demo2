import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import {
  decode_frozen_test_evidence_index,
  make_frozen_test_evidence_client,
  validate_frozen_test_evidence_root,
} from "../../../src/app/demos/tests/panel/frozen-test-evidence-client";
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

export function frozen_test_evidence_client_suite(): TestSuite {
  const cases: readonly TestCase[] = [
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
  ];
  return Object.freeze({ suite: SUITE, cases });
}
