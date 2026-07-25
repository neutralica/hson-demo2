import type { HostedTestReport } from "../../hosted-test/hosted-test-report.types";
import { hosted_test_report_cases } from "../../hosted-test/hosted-test-report.types";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";

export type HostedTestProjectionSummary = Readonly<{
  canonical: Readonly<{
    total: number;
    pass: number;
    fail: number;
    skip: number;
  }>;
  launchers: Readonly<{
    total: number;
    pass: number;
    fail: number;
    declaredChecks: number;
    passedChecks: number;
  }>;
}>;

export function hosted_test_projection_summary(report: HostedTestReport): HostedTestProjectionSummary {
  const cases = hosted_test_report_cases(report);
  const launchers = Object.values(report.externalResults);
  return Object.freeze({
    canonical: Object.freeze({
      total: cases.length,
      pass: cases.filter((entry) => entry.status === "pass").length,
      fail: cases.filter((entry) => entry.status === "fail").length,
      skip: cases.filter((entry) => entry.status === "skip").length,
    }),
    launchers: Object.freeze({
      total: launchers.length,
      pass: launchers.filter((entry) => entry.status === "pass").length,
      fail: launchers.filter((entry) => entry.status === "fail").length,
      declaredChecks: launchers.reduce((total, entry) => total + entry.executableChecks, 0),
      passedChecks: launchers
        .filter((entry) => entry.status === "pass")
        .reduce((total, entry) => total + entry.executableChecks, 0),
    }),
  });
}

export function hosted_test_projection_footer(
  summary: HostedTestProjectionSummary,
  elapsedMs: number,
): readonly Readonly<{ label: string; value: string | number }>[] {
  const elapsed = Object.freeze({ label: "elapsed", value: format_hosted_test_duration(elapsedMs) });
  if (summary.launchers.total > 0) {
    const totalCases = summary.canonical.total + summary.launchers.declaredChecks;
    const failed: string | number = summary.launchers.fail === 0
      ? summary.canonical.fail
      : summary.canonical.fail === 0
        ? `${summary.launchers.fail} ${summary.launchers.fail === 1 ? "suite" : "suites"}`
        : `${summary.canonical.fail} ${summary.canonical.fail === 1 ? "case" : "cases"} · ${summary.launchers.fail} ${summary.launchers.fail === 1 ? "suite" : "suites"}`;
    return Object.freeze([
      Object.freeze({ label: "cases", value: totalCases }),
      Object.freeze({ label: "passed", value: summary.canonical.pass + summary.launchers.passedChecks }),
      Object.freeze({ label: "failed", value: failed }),
      elapsed,
    ]);
  }
  return Object.freeze([
    Object.freeze({ label: "cases", value: summary.canonical.total }),
    Object.freeze({ label: "passed", value: summary.canonical.pass }),
    Object.freeze({ label: "failed", value: summary.canonical.fail }),
    elapsed,
  ]);
}
