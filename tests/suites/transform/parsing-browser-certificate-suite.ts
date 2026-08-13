import { hson } from "hson-live";
import { verify_universal_circuit } from "hson-live/diagnostics/universal-circuit";
import { assert_canonical_oracle_graph_equal } from "hson-live/diagnostics/transform-test-oracle";
import type { HsonNode } from "hson-live/types";
import type { TestSuite } from "../../harness/core/test-contracts";
import type { CircuitVerificationEntry, CircuitVerificationResult } from "../../../src/shared/circuit-verification-contract";
import {
  certify_browser_circuit_boundary,
  admit_detached_browser_html,
  type BrowserCircuitAdmission,
  type BrowserCircuitCertificateOptions,
} from "../../../src/app/demos/parse/browser-circuit-certificate";

const SUITE = "transform/parsing-browser-certificate";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`parsing browser certificate: ${message}`);
}

function browser_admit(entry: CircuitVerificationEntry, source: string): BrowserCircuitAdmission {
  const transformed = entry === "hson"
    ? hson.fromHson(source)
    : entry === "json"
      ? hson.fromJson(source)
      : hson.fromTrustedHtml(source);
  return Object.freeze({
    node: entry !== "hson"
      ? hson.fromHson(transformed.toHson().serialize()).toNode()
      : transformed.toNode(),
  });
}

function worker_result(entry: CircuitVerificationEntry, source: string): CircuitVerificationResult {
  const universal = verify_universal_circuit({ entry, source }, { now: () => 0 });
  const { boundary: _boundary, ...detached } = universal;
  return Object.freeze({ panelId: "certificate-panel", inputRevision: 1, ...detached });
}

function certify(
  entry: CircuitVerificationEntry,
  source: string,
  options?: BrowserCircuitCertificateOptions,
) {
  return certify_browser_circuit_boundary({
    entry,
    inputRevision: 1,
    immediateAdmission: browser_admit(entry, source),
    workerResult: worker_result(entry, source),
    isCurrent: () => true,
    ...(options === undefined ? {} : { options }),
  });
}

function verified_fixture(
  baseline: HsonNode,
  final: HsonNode,
  origin: HsonNode = baseline,
  options: BrowserCircuitCertificateOptions = {},
) {
  const result: CircuitVerificationResult = Object.freeze({
    panelId: "certificate-panel",
    inputRevision: 1,
    status: "verified",
    entry: "json",
    operationCounts: Object.freeze({ serializations: 24, parses: 25, comparisons: 25, laps: 6, directions: 2 }),
    durationMs: 3,
    baselineHson: "baseline",
    clockwiseFinalHson: "cw",
    counterclockwiseFinalHson: "ccw",
    finalHtml: "final",
  });
  return certify_browser_circuit_boundary({
    entry: "json",
    inputRevision: 1,
    immediateAdmission: { node: origin },
    workerResult: result,
    isCurrent: () => true,
    options: {
      admitBaselineHson: () => baseline,
      admitFinalHtml: () => final,
      ...options,
    },
  });
}

export function parsing_browser_certificate_suite(): TestSuite {
  return Object.freeze({
    suite: SUITE,
    descriptor: Object.freeze({ subject: "transform", requirements: Object.freeze(["javascript", "node", "synthetic-dom"] as const) }),
    cases: Object.freeze([
      Object.freeze({ suite: SUITE, name: "HSON origin earns a browser certificate", run: () => {
        const result = certify("hson", '<main id="hson-origin" "hello"/>'); expect(result.ok, "HSON must pass both boundaries");
      } }),
      Object.freeze({ suite: SUITE, name: "JSON origin earns a browser certificate", run: () => {
        const result = certify("json", '{"phase":3,"items":[1,true,"x"]}'); expect(result.ok, "JSON must pass both boundaries");
      } }),
      Object.freeze({ suite: SUITE, name: "HTML origin earns a DOMParser certificate", run: () => {
        const result = certify("html", '<main data-phase="3"><span>hello</span></main>'); expect(result.ok, "ordinary HTML must agree across actual parsers");
      } }),
      Object.freeze({ suite: SUITE, name: "worker final HTML is admitted through browser facade", run: () => {
        let admissions = 0;
        const result = certify("json", '{"ok":true}', {
          admitFinalHtml(source) {
            admissions += 1;
            const browserAdmission = hson.fromTrustedHtml(source);
            return hson.fromHson(browserAdmission.toHson().serialize()).toNode();
          },
        });
        expect(result.ok && admissions === 1, "certificate must perform exactly one final browser HTML admission");
      } }),
      Object.freeze({ suite: SUITE, name: "browser root carrier is detached only through the public Transform boundary", run: () => {
        const worker = worker_result("html", '<main data-boundary="root"><b>detached</b></main>');
        expect(worker.finalHtml !== undefined, "verified worker must return final HTML");
        const rootBearing = hson.fromTrustedHtml(worker.finalHtml).toNode();
        expect(rootBearing.$_tag === "_hson_root", "DOMParser admission must demonstrate its internal attachment carrier");
        const detached = admit_detached_browser_html(worker.finalHtml);
        expect(detached.$_tag !== "_hson_root", "public HSON output/admission boundary must detach the root carrier");
        const comparedTags: string[] = [];
        const result = certify("html", '<main data-boundary="root"><b>detached</b></main>', {
          compare(expected, actual, operation) {
            comparedTags.push(`${expected.$_tag}:${actual.$_tag}`);
            expect(expected.$_tag !== "_hson_root" && actual.$_tag !== "_hson_root", "strict comparison must never admit the attachment root");
            assert_canonical_oracle_graph_equal({
              launcher: "hson-demo2.parsing-panel",
              caseId: "public-root-detachment",
              operation,
              expected,
              actual,
              classification: "cross-runtime-divergence",
            });
          },
        });
        expect(result.ok && comparedTags.length === 2, "both strict certificate comparisons must use detached semantic graphs");
      } }),
      Object.freeze({ suite: SUITE, name: "certificate retains authoritative worker operation counts", run: () => {
        const result = certify("hson", '<p "counts"/>');
        expect(result.ok && JSON.stringify(result.certificate.operationCounts) === JSON.stringify({ serializations: 24, parses: 25, comparisons: 25, laps: 6, directions: 2 }), "counts must remain exact");
      } }),
      Object.freeze({ suite: SUITE, name: "certificate records both strict comparison claims", run: () => {
        const result = certify("json", '{"strict":true}'); expect(result.ok && result.certificate.browserFinalMatchesBaseline && result.certificate.browserOriginMatchesBaseline, "both comparisons must be explicit");
      } }),
      Object.freeze({ suite: SUITE, name: "stable object member order certifies", run: () => {
        const result = certify("json", '{"first":1,"second":2,"third":3}'); expect(result.ok, "stable member order must pass");
      } }),
      Object.freeze({ suite: SUITE, name: "object member reordering fails strict browser comparison", run: () => {
        const baseline = hson.fromJson('{"first":1,"second":2}').toNode();
        const reordered = hson.fromJson('{"second":2,"first":1}').toNode();
        const result = verified_fixture(baseline, reordered);
        expect(!result.ok && !result.stale && result.failure.code === "BROWSER_CERTIFICATE_FINAL_HTML_DIFFERENCE", "order must not use projected equality");
      } }),
      Object.freeze({ suite: SUITE, name: "zero and negative zero remain distinct", run: () => {
        const negative = hson.fromJson("-0").toNode(); const positive = hson.fromJson("0").toNode();
        const result = verified_fixture(negative, positive);
        expect(!result.ok && !result.stale && result.failure.code === "BROWSER_CERTIFICATE_FINAL_HTML_DIFFERENCE", "strict comparison must detect -0");
      } }),
      Object.freeze({ suite: SUITE, name: "dangerous keys certify without prototype projection", run: () => {
        const result = certify("json", '{"__proto__":"safe","constructor":"value"}'); expect(result.ok, "dangerous own members must survive");
      } }),
      Object.freeze({ suite: SUITE, name: "Unicode certifies across universal and browser boundaries", run: () => {
        const result = certify("json", '{"text":"𝄞 café 日本語"}'); expect(result.ok, "Unicode must remain canonical");
      } }),
      Object.freeze({ suite: SUITE, name: "isolated surrogate changes are strict disagreements", run: () => {
        const isolated = hson.fromJson('{"text":"\\ud800"}').toNode();
        const replacement = hson.fromJson('{"text":"�"}').toNode();
        const result = verified_fixture(isolated, replacement);
        expect(!result.ok && !result.stale, "isolated surrogate replacement must fail");
      } }),
      Object.freeze({ suite: SUITE, name: "quoted HSON member names certify", run: () => {
        const result = certify("hson", "<'a b' 1 'quoted:name' 2>"); expect(result.ok, "quoted member syntax must retain identity");
      } }),
      Object.freeze({ suite: SUITE, name: "array position changes are strict disagreements", run: () => {
        const baseline = hson.fromJson('[1,2,3]').toNode(); const reordered = hson.fromJson('[1,3,2]').toNode();
        const result = verified_fixture(baseline, reordered); expect(!result.ok && !result.stale, "array position must be strict");
      } }),
      Object.freeze({ suite: SUITE, name: "browser-final disagreement has stable code", run: () => {
        const baseline = hson.fromJson('{"same":true}').toNode(); const changed = hson.fromJson('{"same":false}').toNode();
        const result = verified_fixture(baseline, changed); expect(!result.ok && !result.stale && result.failure.code === "BROWSER_CERTIFICATE_FINAL_HTML_DIFFERENCE", "final mismatch code must be stable");
      } }),
      Object.freeze({ suite: SUITE, name: "browser-origin disagreement has distinct stable code", run: () => {
        const baseline = hson.fromJson('{"worker":true}').toNode(); const origin = hson.fromJson('{"worker":false}').toNode();
        const result = verified_fixture(baseline, baseline, origin); expect(!result.ok && !result.stale && result.failure.code === "BROWSER_CERTIFICATE_ORIGIN_DIFFERENCE", "origin mismatch must be distinct");
      } }),
      Object.freeze({ suite: SUITE, name: "DOMParser admission failure is bounded", run: () => {
        const baseline = hson.fromJson('{"ok":true}').toNode();
        const result = verified_fixture(baseline, baseline, baseline, { admitFinalHtml: () => { throw new Error("raw DOM failure"); } });
        expect(!result.ok && !result.stale && result.failure.code === "BROWSER_CERTIFICATE_HTML_ADMISSION_FAILED" && !result.failure.message.includes("raw"), "DOM failure must be normalized");
      } }),
      Object.freeze({ suite: SUITE, name: "worker baseline admission failure is bounded", run: () => {
        const baseline = hson.fromJson('{"ok":true}').toNode();
        const result = verified_fixture(baseline, baseline, baseline, { admitBaselineHson: () => { throw new Error("raw baseline failure"); } });
        expect(!result.ok && !result.stale && result.failure.code === "BROWSER_CERTIFICATE_BASELINE_PARSE_FAILED", "baseline failure must be normalized");
      } }),
      Object.freeze({ suite: SUITE, name: "missing worker material cannot certify", run: () => {
        const worker = worker_result("json", '{"ok":true}');
        const result = certify_browser_circuit_boundary({ entry: "json", inputRevision: 1, immediateAdmission: browser_admit("json", '{"ok":true}'), workerResult: { ...worker, finalHtml: undefined } as never, isCurrent: () => true });
        expect(!result.ok && !result.stale && result.failure.code === "BROWSER_CERTIFICATE_WORKER_EVIDENCE_INCOMPLETE", "missing evidence must fail closed");
      } }),
      Object.freeze({ suite: SUITE, name: "nonverified worker result cannot certify", run: () => {
        const worker = { ...worker_result("json", '{"ok":true}'), status: "failed" as const, failure: { stage: "parse", message: "failed" } };
        const result = certify_browser_circuit_boundary({ entry: "json", inputRevision: 1, immediateAdmission: browser_admit("json", '{"ok":true}'), workerResult: worker, isCurrent: () => true });
        expect(!result.ok && !result.stale && result.failure.code === "BROWSER_CERTIFICATE_WORKER_EVIDENCE_INCOMPLETE", "worker success is prerequisite");
      } }),
      Object.freeze({ suite: SUITE, name: "stale revision before admission is silent", run: () => {
        const worker = worker_result("json", '{"ok":true}');
        const result = certify_browser_circuit_boundary({ entry: "json", inputRevision: 1, immediateAdmission: browser_admit("json", '{"ok":true}'), workerResult: worker, isCurrent: () => false });
        expect(!result.ok && result.stale === true, "stale check must not become failure");
      } }),
      Object.freeze({ suite: SUITE, name: "revision is fenced during browser admission", run: () => {
        const worker = worker_result("json", '{"ok":true}'); let checks = 0;
        const result = certify_browser_circuit_boundary({ entry: "json", inputRevision: 1, immediateAdmission: browser_admit("json", '{"ok":true}'), workerResult: worker, isCurrent: () => { checks += 1; return checks < 3; } });
        expect(!result.ok && result.stale === true, "edit during browser check must suppress completion");
      } }),
      Object.freeze({ suite: SUITE, name: "HTML origin participates in the second strict comparison", run: () => {
        const operations: string[] = [];
        const result = certify("html", '<article><b>origin</b></article>', {
          compare(expected, actual, operation) {
            operations.push(operation);
            // Reuse the same strict public assertion indirectly through a
            // nested certificate fixture when identity is not obvious.
            const nested = verified_fixture(expected, actual);
            if (!nested.ok) throw new Error("strict difference");
          },
        });
        expect(result.ok && operations.join(",") === "browser-final-html-vs-worker-baseline,browser-origin-vs-worker-baseline", "HTML source graph must be compared explicitly");
      } }),
    ]),
  });
}
