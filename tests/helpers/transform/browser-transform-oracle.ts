import {
  assertCanonicalClosure,
  assertCanonicalRejection,
} from "hson-live/diagnostics/transform-test-oracle";
import { hsonTransform } from "hson-live/transform";

/** Browser-executed portability probe; imported only by Playwright. */
export function run_browser_transform_oracle_probe(): Readonly<{
  closureTag: string;
  rejectionCode: string;
  rejectionStage: string | undefined;
  source: Readonly<{ index: number; line: number; column: number }> | undefined;
  stableWitness: boolean;
  negativeZero: boolean;
}> {
  const closure = assertCanonicalClosure({
    launcher: "browser.transform-oracle",
    caseId: "browser-strict-closure",
    ingress: "hson-source",
    source: `<browser @000000001 "ready"/>`,
    cycles: 3,
  });
  const rejection = assertCanonicalRejection({
    launcher: "browser.transform-oracle",
    caseId: "browser-reserved-name",
    operation: "fromHson",
    ingress: "hson-source",
    source: `<_hson_obj>`,
    expectedCode: "authored-reserved-name",
    expectedStage: "tokenization",
    run: () => hsonTransform.fromHson(`<_hson_obj>`).toNode(),
    repetitions: 3,
  });
  return Object.freeze({
    closureTag: closure.reparsed.$_tag,
    rejectionCode: rejection.details.code,
    rejectionStage: rejection.details.stage,
    source: rejection.details.source,
    stableWitness: rejection.witnessBody.includes('"actualClassification": "expected-rejection"'),
    negativeZero: Object.is(hsonTransform.fromHson("-0").toNode().$_content[0], -0),
  });
}
