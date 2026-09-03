import assert from "node:assert/strict";
import { empty_totals, type TerminalStatus } from "../../../src/shared/testing/test-run-contract";
import { format_cli_test_result } from "../../harness/reporting/format-cli-test-result";

const scenarios = Object.freeze([
  ["all-pass", "pass"],
  ["assertion-failure", "fail"],
  ["skipped", "skip"],
  ["unsupported", "unsupported"],
  ["cancelled", "cancelled"],
  ["infrastructure-error", "error"],
] as const satisfies readonly (readonly [string, TerminalStatus])[]);

for (const [label, status] of scenarios) {
  const totals = { ...empty_totals(), suites: 1, cases: 1, [status]: 1 };
  const output = format_cli_test_result(label, { totals, durationMs: 12.5 });
  for (const expected of [
    `${totals.pass} pass`,
    `${totals.fail} fail`,
    `${totals.skip} skip`,
    `${totals.unsupported} unsupported`,
    `${totals.cancelled} cancelled`,
    `${totals.error} error`,
  ]) assert.match(output, new RegExp(expected), `${label} preserves ${expected}`);
}

console.log(`CLI terminal-status presentation: ok (${scenarios.length} scenarios)`);
