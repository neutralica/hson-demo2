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
    observedChecks: number;
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
  browser: Readonly<{
    total: number;
    pass: number;
    fail: number;
    skip: number;
    cancelled: number;
  }>;
  tests: Readonly<{
    total: number;
    passed: number;
    failed: number;
  }>;
}>;

export function hosted_test_projection_summary(report: HostedTestReport): HostedTestProjectionSummary {
  const normalizedLaunchers = report.suiteRuns.filter((suite) => suite.executionShape === "opaque-aggregate");
  const normalizedCaseSuites = report.suiteRuns.filter((suite) => suite.executionShape === "cases");
  const normalizedBrowserSuites = report.suiteRuns.filter((suite) => suite.executionShape === "browser-journeys");
  const normalizedCertifications = report.suiteRuns.filter((suite) => suite.executionShape === "certification-aggregate");
  const canonical = Object.freeze({
    total: normalizedCaseSuites.reduce((total, suite) => total + suite.counts.total, 0),
    pass: normalizedCaseSuites.reduce((total, suite) => total + suite.counts.passed, 0),
    fail: normalizedCaseSuites.reduce((total, suite) => total + suite.counts.failed, 0),
    skip: normalizedCaseSuites.reduce((total, suite) => total + suite.counts.skipped, 0),
    cancelled: normalizedCaseSuites.reduce((total, entry) => total + entry.counts.cancelled, 0),
  });
  const launchers = Object.freeze({
    total: normalizedLaunchers.length,
    pass: normalizedLaunchers.filter((entry) => entry.status === "pass").length,
    fail: normalizedLaunchers.filter((entry) => entry.status === "fail").length,
    observedChecks: normalizedLaunchers.reduce((total, entry) => total + entry.counts.total, 0),
    passedChecks: normalizedLaunchers.reduce((total, entry) => total + entry.counts.passed, 0),
    failedChecks: normalizedLaunchers.reduce((total, entry) => total + entry.counts.failed, 0),
    cancelled: normalizedLaunchers.filter((entry) => entry.status === "cancelled").length,
    cancelledChecks: normalizedLaunchers.reduce((total, entry) => total + entry.counts.cancelled, 0),
  });
  const certifications = Object.freeze({
    total: normalizedCertifications.length,
    pass: normalizedCertifications.filter((entry) => entry.status === "pass").length,
    fail: normalizedCertifications.filter((entry) => entry.status === "fail").length,
    cancelled: normalizedCertifications.filter((entry) => entry.status === "cancelled").length,
  });
  const browser = Object.freeze({
    total: normalizedBrowserSuites.reduce((total, suite) => total + suite.counts.total, 0),
    pass: normalizedBrowserSuites.reduce((total, suite) => total + suite.counts.passed, 0),
    fail: normalizedBrowserSuites.reduce((total, suite) => total + suite.counts.failed, 0),
    skip: normalizedBrowserSuites.reduce((total, suite) => total + suite.counts.skipped, 0),
    cancelled: normalizedBrowserSuites.reduce((total, suite) => total + suite.counts.cancelled, 0),
  });
  return Object.freeze({
    suites: Object.freeze({
      total: report.suiteRuns.length,
      pass: report.suiteRuns.filter((entry) => entry.status === "pass").length,
      fail: report.suiteRuns.filter((entry) => entry.status === "fail").length,
      cancelled: report.suiteRuns.filter((entry) => entry.status === "cancelled").length,
    }),
    canonical,
    launchers,
    certifications,
    browser,
    tests: Object.freeze({
      total: canonical.total + browser.total + launchers.observedChecks,
      passed: canonical.pass + browser.pass + launchers.passedChecks,
      failed: canonical.fail + browser.fail + (launchers.failedChecks ?? launchers.fail) + certifications.fail,
    }),
  });
}

export function hosted_test_projection_footer(
  summary: HostedTestProjectionSummary,
  elapsedMs: number | null,
): readonly TestSummaryEntry[] {
  return Object.freeze([
    Object.freeze({ key: "suites", label: "suites", value: summary.suites.total }),
    Object.freeze({ key: "tests", label: "tests", value: summary.tests.total }),
    Object.freeze({ key: "passed", label: "passed", value: summary.tests.passed }),
    Object.freeze({ key: "failed", label: "failed", value: summary.tests.failed }),
    Object.freeze({ key: "elapsed", label: "elapsed", value: elapsedMs === null ? "—" : format_hosted_test_duration(elapsedMs) }),
  ]);
}
