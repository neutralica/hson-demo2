import type { TestSuite } from "../../../core/test-contracts";
import { ALL_BROWSER_SUITE_MANIFEST } from "./browser-test-manifest";

export function all_browser_locus_test_suites(): readonly TestSuite[] {
  return Object.freeze(ALL_BROWSER_SUITE_MANIFEST.map((entry, order) => Object.freeze({
    suite: entry.id,
    descriptor: Object.freeze({
      title: entry.title,
      subject: entry.subject,
      collections: Object.freeze(["dev"] as const),
      provenance: "hson-demo2" as const,
      order: 10_000 + order,
      requirements: entry.requirements,
      executionShape: "browser-journeys" as const,
      sourceRef: entry.path,
    }),
    cases: Object.freeze(entry.journeys.map((journey) => Object.freeze({
      suite: entry.id,
      caseId: journey.id,
      name: journey.title,
      run(): never {
        throw new Error("Browser journeys must be assigned to the supervised Playwright executor.");
      },
    }))),
  })));
}
