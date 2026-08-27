import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import {
  decode_frozen_test_evidence_index,
  frozen_test_explorer_category_from_suite_id,
  make_frozen_test_evidence_client,
  validate_frozen_test_evidence_root,
} from "../../../src/app/demos/tests/panel/frozen-test-evidence-client";
import { format_frozen_evidence_size, serialize_frozen_index_summary } from "../../../src/app/demos/tests/panel/frozen-test-presentation";
import { test_panel_acquisition_mode } from "../../../src/app/demos/tests/panel/mount-test-panels";
import {
  FROZEN_TEST_EVIDENCE_COMMIT,
  FROZEN_TEST_EVIDENCE_ROOT,
  frozen_test_evidence_package_fixture,
} from "../../fixtures/app/frozen-test-evidence-index";

const SUITE = "unit/frozen-test-evidence-client";
function expect(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function rejects(run: () => unknown | Promise<unknown>, includes: string): Promise<void> {
  try { await run(); } catch (error) { expect(error instanceof Error && error.message.includes(includes), `expected ${includes}, received ${String(error)}`); return; }
  throw new Error(`expected rejection containing ${includes}`);
}
function response(body: string, status = 200): Pick<Response, "ok" | "status" | "text"> { return { ok: status >= 200 && status < 300, status, text: async () => body }; }
function fixtureClient(requests: string[] = []) {
  const fixture = frozen_test_evidence_package_fixture();
  const client = make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async (url) => {
    requests.push(url);
    if (url.endsWith("/index.json")) return response(JSON.stringify(fixture.index));
    const relative = url.slice(FROZEN_TEST_EVIDENCE_ROOT.length + 1);
    const body = fixture.artifacts.get(relative);
    return response(body ?? "missing", body === undefined ? 404 : 200);
  } });
  return { fixture, client };
}

export function frozen_test_evidence_client_suite(): TestSuite {
  const cases: readonly TestCase[] = [
    { suite: SUITE, caseId: "development-production-composition-parity", name: "development and production select the same frozen acquisition path", run: () => {
      expect(test_panel_acquisition_mode(false) === "frozen" && test_panel_acquisition_mode(true) === "frozen", "both compositions must use frozen evidence");
    } },
    { suite: SUITE, caseId: "root-loads-once-without-descendant-fetch", name: "root loads once and contains only category summaries", run: async () => {
      const requests: string[] = []; const { client } = fixtureClient(requests);
      const first = await client.loadIndex(); const second = await client.loadIndex();
      expect(first === second, "root should be cached by identity");
      expect(first.categories.length === 9 && first.overall.suites === 3, "root category and aggregate inventory should decode");
      expect(requests.length === 1 && requests[0]?.endsWith("/index.json"), "root open must not fetch descendants");
      expect(client.snapshot().categoryRequests === 0 && client.snapshot().suiteRequests === 0 && client.snapshot().rowEvidenceRequests === 0, "descendant request counters must remain zero");
    } },
    { suite: SUITE, caseId: "category-suite-case-fetch-chain", name: "category, suite, and case artifacts load only when requested", run: async () => {
      const requests: string[] = []; const { client } = fixtureClient(requests); const root = await client.loadIndex();
      const category = root.categories.find((entry) => entry.id === "transform")!;
      const listing = await client.loadCategory(category); const suite = listing.suites[0]!;
      const suiteListing = await client.loadSuite(suite); const item = suiteListing.cases[0]!;
      expect(client.snapshot().categoryRequests === 1 && client.snapshot().suiteRequests === 1 && client.snapshot().rowEvidenceRequests === 0, "listing fetches should remain distinct from detail fetches");
      const artifact = await client.loadRowEvidence({ category: suite.category, suite, testCase: item, reference: item.evidence! });
      expect(artifact.owner === "case" && artifact.caseId === item.id, "case artifact should validate against suite listing identity");
      expect(requests.length === 4, "exact root-category-suite-case path should use four requests");
      client.releaseRowEvidence(); expect(client.snapshot().retainedRowArtifacts === 0, "case close should release current detail");
    } },
    { suite: SUITE, caseId: "suite-detail-is-owned-by-suite-envelope", name: "suite-owned evidence arrives in the already loaded suite envelope", run: async () => {
      const { client } = fixtureClient(); const root = await client.loadIndex();
      const category = await client.loadCategory(root.categories.find((entry) => entry.id === "certification")!);
      const listing = await client.loadSuite(category.suites[0]!);
      expect(listing.detail?.owner === "suite" && listing.detail.evidence[0]?.content.includes("certification") === true, "suite detail should be embedded in its listing envelope");
      expect(client.snapshot().rowEvidenceRequests === 0, "suite detail must not cause another request");
    } },
    { suite: SUITE, caseId: "rejects-size-and-identity-mismatch", name: "category and suite bytes and identities reject locally", run: async () => {
      const fixture = frozen_test_evidence_package_fixture(); const root = decode_frozen_test_evidence_index(fixture.index, FROZEN_TEST_EVIDENCE_COMMIT);
      const category = root.categories.find((entry) => entry.id === "transform")!;
      const client = make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async (url) => url.endsWith("index.json")
        ? response(JSON.stringify(fixture.index)) : response("{}") });
      await client.loadIndex();
      await rejects(() => client.loadCategory(category), "SIZE_MISMATCH");
      const wrong = JSON.parse(fixture.artifacts.get(category.listing.path!)!); wrong.categoryId = "unit";
      const body = JSON.stringify(wrong); fixture.index.categories.find((entry: any) => entry.id === "transform").listing.rawBytes = Buffer.byteLength(body);
      const identityClient = make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async (url) => url.endsWith("index.json") ? response(JSON.stringify(fixture.index)) : response(body) });
      const decoded = await identityClient.loadIndex();
      await rejects(() => identityClient.loadCategory(decoded.categories.find((entry) => entry.id === "transform")!), "RELATIONSHIP");
    } },
    { suite: SUITE, caseId: "routing-invariant", name: "suite ids route deterministically without a root lookup table", run: async () => {
      const routes = [["transform/a", "transform"], ["livehost/locus/a", "locus"], ["livetree-browser", "livetree"], ["livedemo/browser/a", "browser"], ["verification/a", "certification"], ["integration/public-boundaries", "unit"]] as const;
      for (const [id, expected] of routes) expect(frozen_test_explorer_category_from_suite_id(id) === expected, `${id} should route to ${expected}`);
      await rejects(() => frozen_test_explorer_category_from_suite_id("transform/a::case"), "PRESENTATION_CATEGORY");
      await rejects(() => frozen_test_explorer_category_from_suite_id("integration/anything-else"), "PRESENTATION_CATEGORY");
    } },
    { suite: SUITE, caseId: "copy-reports-root-summary-only", name: "Copy Reports serializes root and category summaries without hidden inventory", run: async () => {
      const { client } = fixtureClient(); const root = await client.loadIndex(); const copied = serialize_frozen_index_summary(root);
      expect(copied.includes("TRANSFORM") && copied.includes("CERTIFICATION") && !copied.includes("transform/frozen-client"), "copy should expose category summaries but no hidden suite names");
      expect(client.snapshot().categoryRequests === 0 && client.snapshot().suiteRequests === 0, "copy must not fan out");
    } },
    { suite: SUITE, caseId: "rejects-invalid-roots-and-index", name: "immutable roots, deployment binding, and JSON remain strict", run: async () => {
      for (const root of [undefined, "", `/test-evidence/latest`, `/test-evidence/../${FROZEN_TEST_EVIDENCE_COMMIT}`, "/test-evidence/abc"]) await rejects(() => validate_frozen_test_evidence_root(root), "FROZEN_EVIDENCE_ROOT");
      const fixture = frozen_test_evidence_package_fixture().index; fixture.deployment.hsonDeployCommit = "f".repeat(40);
      await rejects(() => decode_frozen_test_evidence_index(fixture, FROZEN_TEST_EVIDENCE_COMMIT), "DEPLOYMENT_MISMATCH");
      await rejects(() => make_frozen_test_evidence_client({ root: FROZEN_TEST_EVIDENCE_ROOT, fetch: async () => response("{") }).loadIndex(), "FROZEN_EVIDENCE_JSON");
    } },
    { suite: SUITE, caseId: "formats-raw-byte-sizes", name: "frozen evidence sizes use raw decimal units", run: () => {
      expect(format_frozen_evidence_size(999) === "999 B" && format_frozen_evidence_size(3_400) === "3.4 kB" && format_frozen_evidence_size(2_500_000) === "2.5 MB", "raw-byte formatting");
    } },
  ];
  return Object.freeze({ suite: SUITE, cases });
}
