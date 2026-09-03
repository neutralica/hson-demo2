import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolve_local_frozen_evidence } from "../vite.config.mjs";

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";

function fixture(status = "pass") {
  const root = mkdtempSync(join(tmpdir(), "hson-frozen-local-"));
  const run = join(root, ".test-reports", RUN_ID);
  mkdirSync(join(run, "site"), { recursive: true });
  writeFileSync(join(root, ".test-reports", "current.json"), `${JSON.stringify({ runId: RUN_ID, path: `${RUN_ID}/site` })}\n`);
  writeFileSync(join(run, "run.json"), `${JSON.stringify({ id: RUN_ID, status })}\n`);
  writeFileSync(join(run, "site", "index.json"), `${JSON.stringify({ runId: RUN_ID, status })}\n`);
  return root;
}

test("frozen-local selects the direct reporter's current progressive site", () => {
  const root = fixture();
  assert.deepEqual(resolve_local_frozen_evidence({}, root), {
    publicRoot: `/test-evidence/${RUN_ID}`,
    runId: RUN_ID,
    evidenceDirectory: join(root, ".test-reports", RUN_ID, "site"),
    status: "pass",
    source: "current",
  });
});

test("frozen-local starts without evidence before current.json exists", () => {
  const root = mkdtempSync(join(tmpdir(), "hson-frozen-local-empty-"));
  assert.equal(resolve_local_frozen_evidence({}, root), undefined);
});

test("frozen-local rejects malformed and dangling current pointers without scanning for a fallback", () => {
  const malformed = mkdtempSync(join(tmpdir(), "hson-frozen-local-malformed-"));
  mkdirSync(join(malformed, ".test-reports"));
  writeFileSync(join(malformed, ".test-reports", "current.json"), "{bad\n");
  assert.throws(() => resolve_local_frozen_evidence({}, malformed), /LOCAL_FROZEN_CURRENT_REPORT_INVALID/);

  const dangling = mkdtempSync(join(tmpdir(), "hson-frozen-local-dangling-"));
  mkdirSync(join(dangling, ".test-reports"));
  writeFileSync(join(dangling, ".test-reports", "current.json"), `${JSON.stringify({ runId: RUN_ID, path: `${RUN_ID}/site` })}\n`);
  assert.throws(() => resolve_local_frozen_evidence({}, dangling), /LOCAL_FROZEN_RUN_REPORT_INVALID/);
});

test("frozen-local accepts every non-pass terminal report", () => {
  for (const status of ["fail", "skip", "unsupported", "cancelled", "error"]) {
    const selected = resolve_local_frozen_evidence({}, fixture(status));
    assert.equal(selected.status, status);
    assert.equal(selected.runId, RUN_ID);
  }
});

test("frozen-local retains an explicit UUID report-site override", () => {
  const root = fixture();
  const evidenceDirectory = join(root, ".test-reports", RUN_ID, "site");
  assert.equal(resolve_local_frozen_evidence({
    VITE_TEST_EVIDENCE_ROOT: `/test-evidence/${RUN_ID}`,
    HSON_LOCAL_FROZEN_EVIDENCE_DIRECTORY: evidenceDirectory,
  }, root).source, "override");
});
