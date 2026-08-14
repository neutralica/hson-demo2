import type { HostedTestReport } from "../../../../../tests/harness/reporting/hosted/hosted-test-report.types";
import { hosted_test_report_cases } from "../../../../../tests/harness/reporting/hosted/hosted-test-report.types";
import { format_hosted_test_duration } from "../../../../../tests/harness/reporting/hosted/hosted-test-timing";

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
  const normalizedCases = report.suiteRuns.flatMap((suite) => suite.cases);
  const cases = normalizedCases.length > 0 ? normalizedCases : hosted_test_report_cases(report);
  const normalizedLaunchers = report.suiteRuns.filter((suite) => suite.executionShape === "opaque-aggregate");
  const legacyLaunchers = Object.values(report.externalResults);
  return Object.freeze({
    canonical: Object.freeze({
      total: cases.length,
      pass: cases.filter((entry) => entry.status === "pass").length,
      fail: cases.filter((entry) => entry.status === "fail").length,
      skip: cases.filter((entry) => entry.status === "skip").length,
    }),
    launchers: Object.freeze({
      total: normalizedLaunchers.length || legacyLaunchers.length,
      pass: normalizedLaunchers.length > 0
        ? normalizedLaunchers.filter((entry) => entry.status === "pass").length
        : legacyLaunchers.filter((entry) => entry.status === "pass").length,
      fail: normalizedLaunchers.length > 0
        ? normalizedLaunchers.filter((entry) => entry.status === "fail").length
        : legacyLaunchers.filter((entry) => entry.status === "fail").length,
      declaredChecks: normalizedLaunchers.length > 0
        ? normalizedLaunchers.reduce((total, entry) => total + entry.counts.declared, 0)
        : legacyLaunchers.reduce((total, entry) => total + entry.executableChecks, 0),
      passedChecks: normalizedLaunchers.length > 0
        ? normalizedLaunchers.reduce((total, entry) => total + entry.counts.passed, 0)
        : legacyLaunchers.filter((entry) => entry.status === "pass").reduce((total, entry) => total + entry.executableChecks, 0),
    }),
  });
}

export function hosted_test_projection_footer(
  summary: HostedTestProjectionSummary,
  elapsedMs: number,
): readonly Readonly<{ label: string; value: string | number }>[] {
  const elapsed = Object.freeze({ label: "elapsed", value: format_hosted_test_duration(elapsedMs) });
  if (summary.launchers.total > 0) {
    const failed: string | number = summary.launchers.fail === 0
      ? summary.canonical.fail
      : summary.canonical.fail === 0
        ? `${summary.launchers.fail} ${summary.launchers.fail === 1 ? "suite" : "suites"}`
        : `${summary.canonical.fail} ${summary.canonical.fail === 1 ? "case" : "cases"} · ${summary.launchers.fail} ${summary.launchers.fail === 1 ? "suite" : "suites"}`;
    return Object.freeze([
      Object.freeze({ label: "cases", value: summary.canonical.total }),
      Object.freeze({ label: "case pass", value: summary.canonical.pass }),
      Object.freeze({ label: "checks", value: summary.launchers.declaredChecks }),
      Object.freeze({ label: "check pass", value: summary.launchers.passedChecks }),
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
