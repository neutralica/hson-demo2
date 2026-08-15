import assert from "node:assert/strict";
import { verify_universal_circuit } from "hson-live/diagnostics/universal-circuit";
import { hsonTransform } from "hson-live/transform";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { create_circuit_verification_service } from "../../harness/runtimes/node/circuit-verification-service";

const SUITE = "livehost/circuit-worker-parity";

function parity_case(
  caseId: string,
  name: string,
  entry: "hson" | "json" | "html",
  source: string,
): TestCase {
  return Object.freeze({
    suite: SUITE,
    caseId,
    name,
    async run() {
      const direct = verify_universal_circuit({ entry, source });
      const service = create_circuit_verification_service();
      try {
        await service.ready();
        const worker = await service.submit({ panelId: "parity", inputRevision: 1, entry, source });
        const directEvidence = {
          status: direct.status,
          entry: direct.entry,
          operationCounts: direct.operationCounts,
          failure: direct.failure,
          baselineHson: direct.baselineHson,
          clockwiseFinalHson: direct.clockwiseFinalHson,
          counterclockwiseFinalHson: direct.counterclockwiseFinalHson,
          finalHtml: direct.finalHtml,
        };
        const workerEvidence = {
          status: worker.status,
          entry: worker.entry,
          operationCounts: worker.operationCounts,
          failure: worker.failure,
          baselineHson: worker.baselineHson,
          clockwiseFinalHson: worker.clockwiseFinalHson,
          counterclockwiseFinalHson: worker.counterclockwiseFinalHson,
          finalHtml: worker.finalHtml,
        };
        assert.deepEqual(workerEvidence, directEvidence, `worker/direct universal evidence differs for ${name}`);
      } finally {
        await service.dispose();
      }
    },
  });
}

export function circuit_worker_parity_suite(): TestSuite {
  const quoted = hsonTransform.fromJson({ "quoted name": 1, "colon:name": 2 }).toHson().serialize();
  return Object.freeze({
    suite: SUITE,
    descriptor: Object.freeze({ subject: "transform", requirements: Object.freeze(["javascript", "node", "worker-threads"] as const) }),
    cases: Object.freeze([
      parity_case("explicit-hson", "explicit HSON agrees with direct universal execution", "hson", "<\n  phase 2\n  worker true\n>"),
      parity_case("explicit-json", "explicit JSON agrees with direct universal execution", "json", '{"phase":2,"worker":true}'),
      parity_case("explicit-html", "explicit HTML agrees with direct universal execution", "html", '<main data-phase="2">worker</main>'),
      parity_case("object-ordering", "object ordering evidence agrees", "json", '{"z":1,"a":2,"m":3}'),
      parity_case("negative-zero", "negative zero evidence agrees", "json", "-0"),
      parity_case("dangerous-keys", "dangerous-key evidence agrees", "json", '{"__proto__":"safe","constructor":"value","prototype":"kept"}'),
      parity_case("unicode", "Unicode evidence agrees", "json", '{"text":"𝄞 café 日本語"}'),
      parity_case("isolated-surrogate", "isolated-surrogate evidence agrees", "json", '"\\ud800"'),
      parity_case("malformed-input", "malformed-input evidence agrees", "json", "{"),
      parity_case("quoted-hson-names", "quoted HSON names agree", "hson", quoted),
    ]),
  });
}
