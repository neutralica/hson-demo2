import type { TestSuite } from "../../../core/test-contracts";
import { playwright_browser_test_suites } from "./playwright-test-discovery";

export function all_browser_locus_test_suites(): readonly TestSuite[] {
  return playwright_browser_test_suites();
}
