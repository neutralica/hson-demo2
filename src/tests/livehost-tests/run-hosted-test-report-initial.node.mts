import { decode_livehost_server_message, encode_livehost_message } from "hson-live";
import type { JsonValue } from "hson-live/types";
import { make_hosted_test_report } from "./hosted-test-report";
import {
  decode_hosted_test_report_initial,
  encode_hosted_test_report_initial,
  HOSTED_TEST_REPORT_INITIAL_EVENT,
  HostedTestReportInitialDecodeError,
} from "./hosted-test-report-initial";

function expect_initial(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted report initial: ${message}`);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  expect_initial(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nactual: ${JSON.stringify(actual)}\nexpected: ${JSON.stringify(expected)}`);
}

function rejects(input: unknown, path: string): void {
  try {
    decode_hosted_test_report_initial(input);
  } catch (error) {
    expect_initial(
      error instanceof HostedTestReportInitialDecodeError
        && error.code === "HOSTED_TEST_REPORT_INITIAL_DECODE_FAILED"
        && error.path === path,
      `invalid input fails at ${path}`,
    );
    return;
  }
  throw new Error(`hosted report initial: expected rejection at ${path}`);
}

const report = make_hosted_test_report(() => 100);
const capture = report.map.capture();
const mutableValue = structuredClone(capture.value) as unknown as { run: { status: string } };
const encoded = encode_hosted_test_report_initial("initial-run", "livemap/replay", {
  rev: capture.rev,
  value: mutableValue as unknown as typeof capture.value,
});
expect_initial(report.map.rev === 1 && encoded.rev === 1, "encoding preserves the authoritative revision 1");
equal(encoded.value, capture.value, "encoded state equals the authoritative map capture");
mutableValue.run.status = "running";
expect_initial(encoded.value.run.status === "idle", "encoding detaches from its input");

const parsed = JSON.parse(JSON.stringify(encoded)) as unknown;
const decoded = decode_hosted_test_report_initial(parsed);
equal(decoded, encoded, "initial envelope survives JSON stringify and parse");
expect_initial(Object.isFrozen(decoded) && Object.isFrozen(decoded.value) && Object.isFrozen(decoded.value.run) && Object.isFrozen(decoded.value.caseBatches), "decoded envelope and nested report are frozen");
if (typeof parsed === "object" && parsed !== null && "value" in parsed) {
  const parsedValue = (parsed as { value: { run: { status: string } } }).value;
  parsedValue.run.status = "passed";
}
expect_initial(decoded.value.run.status === "idle", "decoding detaches from parsed transport input");

const genericEncoded = encode_livehost_message({
  type: "event",
  event: HOSTED_TEST_REPORT_INITIAL_EVENT,
  payload: encoded as unknown as JsonValue,
});
const genericDecoded = decode_livehost_server_message(genericEncoded);
expect_initial(genericDecoded.ok && genericDecoded.value.type === "event", "generic LiveHost protocol accepts the initial event");
if (genericDecoded.ok && genericDecoded.value.type === "event") {
  equal(decode_hosted_test_report_initial(genericDecoded.value.payload), encoded, "initial event crosses generic protocol unchanged");
}

const base = JSON.parse(JSON.stringify(encoded)) as Record<string, unknown>;
rejects({ ...base, runId: "" }, "runId");
rejects({ ...base, suite: "other" }, "suite");
rejects({ ...base, type: "other" }, "type");
const { rev: _rev, ...withoutRev } = base;
rejects(withoutRev, "envelope");
rejects({ ...base, rev: -1 }, "rev");
rejects({ ...base, rev: 1.5 }, "rev");
rejects({ ...base, rev: 2 }, "rev");
rejects({ ...base, value: { ...(base.value as object), extra: true } }, "value");
rejects({ ...base, value: { ...(base.value as object), summary: { cases: -1, pass: 0, fail: 0, skip: 0 } } }, "value");
rejects({ ...base, value: { ...(base.value as object), run: { suite: "livemap/replay", status: "mystery", startedAt: null, completedAt: null } } }, "value");
rejects({ ...base, value: { ...(base.value as object), run: { suite: "livemap/replay", status: "idle", startedAt: Number.POSITIVE_INFINITY, completedAt: null } } }, "value.run.startedAt");
rejects({ ...base, value: { ...(base.value as object), error: undefined } }, "value.error");
rejects({ ...base, value: { run: (base.value as { run: unknown }).run } }, "value");

report.dispose();
expect_initial(typeof window === "undefined" && typeof document === "undefined", "initial codec remains Node-safe");
console.log("hosted test report initial: ok");
