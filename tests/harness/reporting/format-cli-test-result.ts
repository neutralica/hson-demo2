import type { RunResult } from "../core/test-contracts";

/** Human-readable projection only; RunResult.totals remains programmatic truth. */
export function format_cli_test_result(label: string, result: Pick<RunResult, "totals" | "durationMs">): string {
  const totals = result.totals;
  return `${label}: ${totals.cases} cases across ${totals.suites} suites — ${totals.pass} pass, ${totals.fail} fail, ${totals.skip} skip, ${totals.unsupported} unsupported, ${totals.cancelled} cancelled, ${totals.error} error (${result.durationMs.toFixed(1)} ms)`;
}
