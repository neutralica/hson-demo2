import type { HostedTestReport } from "../../../../shared/hosted-tests/hosted-test-report.types";
import { format_hosted_test_duration } from "../../../../shared/hosted-tests/hosted-test-timing";
import type { TestSummaryEntry } from "./test-helpers";

export type HostedTestProjectionSummary = Readonly<{
  suites: Readonly<{
    total: number;
    pass: number;
    fail: number;
    cancelled: number;
  }>;
  canonical: Readonly<{
    total: number;
    pass: number;
    fail: number;
    skip: number;
    cancelled: number;
  }>;
  launchers: Readonly<{
    total: number;
    pass: number;
    fail: number;
    declaredChecks: number;
    passedChecks: number;
    failedChecks: number | null;
    cancelled: number;
    cancelledChecks: number;
  }>;
  certifications: Readonly<{
    total: number;
    pass: number;
    fail: number;
    cancelled: number;
  }>;
}>;

export function hosted_test_projection_summary(report: HostedTestReport): HostedTestProjectionSummary {
  const normalizedLaunchers = report.suiteRuns.filter((suite) => suite.executionShape === "opaque-aggregate");
  const normalizedCaseSuites = report.suiteRuns.filter((suite) => suite.executionShape === "cases");
  const normalizedCertifications = report.suiteRuns.filter((suite) => suite.executionShape === "certification-aggregate");
  return Object.freeze({
    suites: Object.freeze({
      total: report.suiteRuns.length,
      pass: report.suiteRuns.filter((entry) => entry.status === "pass").length,
      fail: report.suiteRuns.filter((entry) => entry.status === "fail").length,
      cancelled: report.suiteRuns.filter((entry) => entry.status === "cancelled").length,
    }),
    canonical: Object.freeze({
      total: normalizedCaseSuites.reduce((total, suite) => total + suite.counts.total, 0),
      pass: report.summary.pass,
      fail: report.summary.fail,
      skip: report.summary.skip,
      cancelled: normalizedCaseSuites.reduce((total, entry) => total + entry.counts.cancelled, 0),
    }),
    launchers: Object.freeze({
      total: normalizedLaunchers.length,
      pass: normalizedLaunchers.filter((entry) => entry.status === "pass").length,
      fail: normalizedLaunchers.filter((entry) => entry.status === "fail").length,
      declaredChecks: normalizedLaunchers.reduce((total, entry) => total + entry.counts.declared, 0),
      passedChecks: normalizedLaunchers.reduce((total, entry) => total + entry.counts.passed, 0),
      failedChecks: normalizedLaunchers.reduce((total, entry) => total + entry.counts.failed, 0),
      cancelled: normalizedLaunchers.filter((entry) => entry.status === "cancelled").length,
      cancelledChecks: normalizedLaunchers.reduce((total, entry) => total + entry.counts.cancelled, 0),
    }),
    certifications: Object.freeze({
      total: normalizedCertifications.length,
      pass: normalizedCertifications.filter((entry) => entry.status === "pass").length,
      fail: normalizedCertifications.filter((entry) => entry.status === "fail").length,
      cancelled: normalizedCertifications.filter((entry) => entry.status === "cancelled").length,
    }),
  });
}

export function hosted_test_projection_footer(
  summary: HostedTestProjectionSummary,
  elapsedMs: number,
): readonly TestSummaryEntry[] {
  const elapsed: TestSummaryEntry = Object.freeze({ key: "elapsed", label: "elapsed", value: format_hosted_test_duration(elapsedMs) });
  return Object.freeze([
    Object.freeze({ key: "suites", label: "suites", value: summary.suites.total }),
    Object.freeze({ key: "suite-fail", label: "suites failed", value: summary.suites.fail }),
    Object.freeze({ key: "cases", label: "cases", value: summary.canonical.total }),
    Object.freeze({ key: "case-pass", label: "cases passed", value: summary.canonical.pass }),
    Object.freeze({ key: "case-fail", label: "cases failed", value: summary.canonical.fail }),
    ...(summary.canonical.skip > 0
      ? [Object.freeze({ key: "case-skip", label: "cases skipped", value: summary.canonical.skip })]
      : []),
    ...(summary.canonical.cancelled > 0
      ? [Object.freeze({ key: "case-cancel", label: "cases cancelled", value: summary.canonical.cancelled })]
      : []),
    ...(summary.launchers.total > 0 ? [
      Object.freeze({ key: "checks" as const, label: "checks", value: summary.launchers.declaredChecks }),
      Object.freeze({ key: "check-pass" as const, label: "checks passed", value: summary.launchers.passedChecks }),
      Object.freeze({ key: "check-fail" as const, label: "checks failed", value: summary.launchers.failedChecks ?? "unknown" }),
      ...(summary.launchers.cancelledChecks > 0
        ? [Object.freeze({ key: "check-cancel" as const, label: "checks cancelled", value: summary.launchers.cancelledChecks })]
        : []),
    ] : []),
    ...(summary.certifications.total > 0 ? [
      Object.freeze({ key: "certifications" as const, label: "certifications", value: summary.certifications.total }),
      Object.freeze({ key: "cert-pass" as const, label: "certifications passed", value: summary.certifications.pass }),
      Object.freeze({ key: "cert-fail" as const, label: "certifications failed", value: summary.certifications.fail }),
      ...(summary.certifications.cancelled > 0
        ? [Object.freeze({ key: "cert-cancel" as const, label: "certifications cancelled", value: summary.certifications.cancelled })]
        : []),
    ] : []),
    elapsed,
  ]);
}
