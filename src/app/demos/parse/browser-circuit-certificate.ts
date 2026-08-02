import { hson } from "hson-live";
import { assert_canonical_oracle_graph_equal } from "hson-live/diagnostics/transform-test-oracle";
import type { HsonNode } from "hson-live/types";
import type { CircuitVerificationResult } from "../../../../tests/harness/hosted/circuit-verification-contract";
import type {
  ParsingBrowserCertificateResult,
  ParsingVerificationFailure,
} from "./parsing-verification-coordinator";

export type BrowserCircuitAdmission = Readonly<{
  node: HsonNode;
}>;

export type BrowserCircuitCertificateOptions = Readonly<{
  now?: () => number;
  admitBaselineHson?: (source: string) => HsonNode;
  admitFinalHtml?: (source: string) => HsonNode;
  compare?: (expected: HsonNode, actual: HsonNode, operation: string) => void;
}>;

function browser_failure(code: string, message: string, stage: string): ParsingVerificationFailure {
  return Object.freeze({ category: "browser-boundary", code, message, stage });
}

function strict_compare(expected: HsonNode, actual: HsonNode, operation: string): void {
  assert_canonical_oracle_graph_equal({
    launcher: "hson-demo2.parsing-panel",
    caseId: "browser-html-boundary",
    operation,
    expected,
    actual,
    classification: "cross-runtime-divergence",
  });
}

/**
 * Cross the documented public Transform detachment boundary for a
 * DOMParser-owned HTML frame. HTML/JSON source frames may retain their
 * `_hson_root` attachment carrier at `toNode()`. HSON output explicitly
 * detaches parser-owned roots, and HSON admission returns that one detached
 * semantic value. No graph field is peeled or normalized here.
 */
export function admit_detached_browser_html(source: string): HsonNode {
  const browserAdmission = hson.fromTrustedHtml(source);
  return hson.fromHson(browserAdmission.toHson().serialize()).toNode();
}

export function certify_browser_circuit_boundary(input: Readonly<{
  entry: "hson" | "json" | "html";
  inputRevision: number;
  immediateAdmission: BrowserCircuitAdmission;
  workerResult: CircuitVerificationResult;
  isCurrent(): boolean;
  options?: BrowserCircuitCertificateOptions;
}>): ParsingBrowserCertificateResult {
  if (!input.isCurrent()) return Object.freeze({ ok: false, stale: true });
  const baselineHson = input.workerResult.baselineHson;
  const finalHtml = input.workerResult.finalHtml;
  if (input.workerResult.status !== "verified" || baselineHson === undefined || finalHtml === undefined) {
    return Object.freeze({
      ok: false,
      failure: browser_failure(
        "BROWSER_CERTIFICATE_WORKER_EVIDENCE_INCOMPLETE",
        "Universal verification completed without the browser certificate evidence.",
        "worker-evidence",
      ),
    });
  }
  const now = input.options?.now ?? (() => performance.now());
  const began = now();
  let workerBaseline: HsonNode;
  try {
    workerBaseline = (input.options?.admitBaselineHson ?? ((source) => hson.fromHson(source).toNode()))(baselineHson);
  } catch {
    return Object.freeze({
      ok: false,
      failure: browser_failure(
        "BROWSER_CERTIFICATE_BASELINE_PARSE_FAILED",
        "The worker baseline could not be admitted by the browser Transform facade.",
        "baseline-admission",
      ),
    });
  }
  if (!input.isCurrent()) return Object.freeze({ ok: false, stale: true });
  let browserFinal: HsonNode;
  try {
    browserFinal = (input.options?.admitFinalHtml ?? admit_detached_browser_html)(finalHtml);
  } catch {
    return Object.freeze({
      ok: false,
      failure: browser_failure(
        "BROWSER_CERTIFICATE_HTML_ADMISSION_FAILED",
        "Browser DOMParser admission of the circuit's final HTML failed.",
        "final-html-admission",
      ),
    });
  }
  if (!input.isCurrent()) return Object.freeze({ ok: false, stale: true });
  const compare = input.options?.compare ?? strict_compare;
  try {
    compare(workerBaseline, browserFinal, "browser-final-html-vs-worker-baseline");
  } catch {
    return Object.freeze({
      ok: false,
      failure: browser_failure(
        "BROWSER_CERTIFICATE_FINAL_HTML_DIFFERENCE",
        "Browser DOMParser produced a graph that differs from the worker baseline.",
        "final-html-comparison",
      ),
    });
  }
  if (!input.isCurrent()) return Object.freeze({ ok: false, stale: true });
  try {
    compare(workerBaseline, input.immediateAdmission.node, "browser-origin-vs-worker-baseline");
  } catch {
    return Object.freeze({
      ok: false,
      failure: browser_failure(
        "BROWSER_CERTIFICATE_ORIGIN_DIFFERENCE",
        input.entry === "html"
          ? "Browser admission of the authored HTML differs from the worker baseline."
          : "Browser admission of the authored source differs from the worker baseline.",
        "origin-comparison",
      ),
    });
  }
  if (!input.isCurrent()) return Object.freeze({ ok: false, stale: true });
  return Object.freeze({
    ok: true,
    certificate: Object.freeze({
      entry: input.entry,
      inputRevision: input.inputRevision,
      operationCounts: input.workerResult.operationCounts,
      workerDurationMs: input.workerResult.durationMs,
      browserCheckDurationMs: Math.max(0, now() - began),
      browserFinalMatchesBaseline: true,
      browserOriginMatchesBaseline: true,
    }),
  });
}
