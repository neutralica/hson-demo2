type JsonRecord = Record<string, unknown>;

const VOLATILE_TIME = "<observational:finite-nonnegative-ms>";
const VOLATILE_BYTES = "<observational:nonnegative-integer-bytes>";

const EXPECTED_TELEMETRY = Object.freeze<Record<string, readonly string[]>>({
  "livemap.aggregate-library-transitions": Object.freeze(["aggregate-transition"]),
  "livemap.n-library-engine": Object.freeze(["n-library-engine"]),
  "livemap.hosted-multi-library-h1": Object.freeze(["hosted-h1"]),
  "locus.hosted-multi-library-h2": Object.freeze(["hosted-h2"]),
  "locus.hosted-multi-library-h3": Object.freeze(["hosted-h3"]),
  "locus.hosted-multi-library-h5": Object.freeze(["hosted-h5-bootstrap", "hosted-h5-replay", "hosted-h5-recovery"]),
  "hson-schema-composition-recursion": Object.freeze(["schema-recursion"]),
  "hson-schema-document": Object.freeze(["schema-document"]),
});

const OPTIONAL_INVOCATION_TELEMETRY = Object.freeze<Record<string, readonly string[]>>({
  // Emitted by `npm run build` before the analyzer launcher, not by the
  // launcher module itself. Direct TSX execution therefore omits it.
  "hson-schema-analyzer": Object.freeze(["schema-analyzer"]),
});

type NormalizedTelemetry = Readonly<{ kind: string; value: unknown }>;

function invalid(label: string, detail: string): never {
  throw new Error(`EXTERNAL_LAUNCHER_TELEMETRY_INVALID: ${label}: ${detail}`);
}

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid(label, "expected an object");
  return value as JsonRecord;
}

function exact_keys(value: JsonRecord, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || !actual.every((key, index) => key === expected[index])) {
    invalid(label, `expected keys ${expected.join(",")}, received ${actual.join(",")}`);
  }
}

function finite_nonnegative(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    invalid(label, "expected a finite nonnegative number");
  }
  return value;
}

function nonnegative_integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) invalid(label, "expected a nonnegative safe integer");
  return value as number;
}

function nonempty_string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) invalid(label, "expected a nonempty string");
  return value;
}

function parse_json(body: string, label: string): JsonRecord {
  try {
    return record(JSON.parse(body), label);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("EXTERNAL_LAUNCHER_TELEMETRY_INVALID:")) throw error;
    return invalid(label, "expected valid JSON");
  }
}

function plain_time(value: string, label: string): number {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) invalid(label, "expected a nonnegative decimal millisecond value");
  return finite_nonnegative(Number(value), label);
}

function plain_integer(value: string, label: string): number {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) invalid(label, "expected a nonnegative decimal integer");
  return nonnegative_integer(Number(value), label);
}

function engine(value: unknown, label: string): JsonRecord {
  const parsed = record(value, label);
  const keys = ["candidateRootsCloned", "schemaValidations", "aggregatePublications", "acceptedTransitions"];
  exact_keys(parsed, keys, label);
  return Object.fromEntries(keys.map((key) => [key, nonnegative_integer(parsed[key], `${label}.${key}`)]));
}

function json_telemetry(body: string, label: string): JsonRecord {
  if (!body.startsWith("# telemetry ")) invalid(label, "expected a '# telemetry ' JSON record");
  return parse_json(body.slice("# telemetry ".length), label);
}

function normalize_aggregate_transition(body: string): NormalizedTelemetry {
  const label = "livemap.aggregate-library-transitions";
  const match = /^telemetry single-library=([^ ]+)ms aggregate-two-library=([^ ]+)ms candidates=(\d+) revisions=(\d+) publications=(\d+)$/.exec(body);
  if (match === null) invalid(label, "malformed aggregate transition telemetry");
  plain_time(match[1]!, `${label}.single-library`);
  plain_time(match[2]!, `${label}.aggregate-two-library`);
  return Object.freeze({
    kind: "aggregate-transition",
    value: Object.freeze({
      singleLibraryMs: VOLATILE_TIME,
      aggregateTwoLibraryMs: VOLATILE_TIME,
      candidates: plain_integer(match[3]!, `${label}.candidates`),
      revisions: plain_integer(match[4]!, `${label}.revisions`),
      publications: plain_integer(match[5]!, `${label}.publications`),
    }),
  });
}

function normalize_n_library_engine(body: string): NormalizedTelemetry {
  const label = "livemap.n-library-engine";
  const match = /^telemetry single=([^ ]+)ms one=([^ ]+)ms two=([^ ]+)ms three=([^ ]+)ms candidates=(\d+)\/(\d+)\/(\d+) schemas=(\d+)\/(\d+)\/(\d+) revisions=(\d+) publications=(\d+)$/.exec(body);
  if (match === null) invalid(label, "malformed N-library telemetry");
  for (let index = 1; index <= 4; index += 1) plain_time(match[index]!, `${label}.timing-${index}`);
  return Object.freeze({
    kind: "n-library-engine",
    value: Object.freeze({
      singleMs: VOLATILE_TIME,
      oneMs: VOLATILE_TIME,
      twoMs: VOLATILE_TIME,
      threeMs: VOLATILE_TIME,
      candidates: Object.freeze(match.slice(5, 8).map((value, index) => plain_integer(value, `${label}.candidates[${index}]`))),
      schemas: Object.freeze(match.slice(8, 11).map((value, index) => plain_integer(value, `${label}.schemas[${index}]`))),
      revisions: plain_integer(match[11]!, `${label}.revisions`),
      publications: plain_integer(match[12]!, `${label}.publications`),
    }),
  });
}

function normalize_hosted_h1(body: string): NormalizedTelemetry {
  const label = "livemap.hosted-multi-library-h1";
  const parsed = json_telemetry(body, label);
  const timingKeys = ["captureTwoMs", "captureFourMs", "snapshotCloneMs", "decodeAndLedgerHydrateMs", "replayOneMs", "replayAggregateMs"];
  exact_keys(parsed, [...timingKeys, "engine"], label);
  for (const key of timingKeys) finite_nonnegative(parsed[key], `${label}.${key}`);
  return Object.freeze({
    kind: "hosted-h1",
    value: Object.freeze({
      ...Object.fromEntries(timingKeys.map((key) => [key, VOLATILE_TIME])),
      engine: engine(parsed.engine, `${label}.engine`),
    }),
  });
}

function normalize_hosted_h2(body: string): NormalizedTelemetry {
  const label = "locus.hosted-multi-library-h2";
  const parsed = json_telemetry(body, label);
  exact_keys(parsed, ["serverPrepareGateAcceptMs", "clientReplayMs", "serverEngine", "clientEngine"], label);
  finite_nonnegative(parsed.serverPrepareGateAcceptMs, `${label}.serverPrepareGateAcceptMs`);
  finite_nonnegative(parsed.clientReplayMs, `${label}.clientReplayMs`);
  return Object.freeze({
    kind: "hosted-h2",
    value: Object.freeze({
      serverPrepareGateAcceptMs: VOLATILE_TIME,
      clientReplayMs: VOLATILE_TIME,
      serverEngine: engine(parsed.serverEngine, `${label}.serverEngine`),
      clientEngine: engine(parsed.clientEngine, `${label}.clientEngine`),
    }),
  });
}

function normalize_hosted_h3(body: string): NormalizedTelemetry {
  const label = "locus.hosted-multi-library-h3";
  const parsed = json_telemetry(body, label);
  exact_keys(parsed, ["bootstrapTwoMs", "bootstrapFourMs", "twoBytes", "fourBytes", "effectiveLiveWireBytes"], label);
  finite_nonnegative(parsed.bootstrapTwoMs, `${label}.bootstrapTwoMs`);
  finite_nonnegative(parsed.bootstrapFourMs, `${label}.bootstrapFourMs`);
  return Object.freeze({
    kind: "hosted-h3",
    value: Object.freeze({
      bootstrapTwoMs: VOLATILE_TIME,
      bootstrapFourMs: VOLATILE_TIME,
      twoBytes: nonnegative_integer(parsed.twoBytes, `${label}.twoBytes`),
      fourBytes: nonnegative_integer(parsed.fourBytes, `${label}.fourBytes`),
      effectiveLiveWireBytes: nonnegative_integer(parsed.effectiveLiveWireBytes, `${label}.effectiveLiveWireBytes`),
    }),
  });
}

function normalize_hosted_h5(body: string): NormalizedTelemetry {
  const label = "locus.hosted-multi-library-h5";
  const parsed = json_telemetry(body, label);
  if ("bootstrapMs" in parsed) {
    const timingKeys = ["bootstrapMs", "stateOnlyMs", "stateColorsPageMs"];
    exact_keys(parsed, [...timingKeys, "aggregateCommitBytes"], `${label}.bootstrap`);
    for (const key of timingKeys) finite_nonnegative(parsed[key], `${label}.${key}`);
    return Object.freeze({
      kind: "hosted-h5-bootstrap",
      value: Object.freeze({
        ...Object.fromEntries(timingKeys.map((key) => [key, VOLATILE_TIME])),
        aggregateCommitBytes: nonnegative_integer(parsed.aggregateCommitBytes, `${label}.aggregateCommitBytes`),
      }),
    });
  }
  if ("snapshotReplacementMs" in parsed) {
    exact_keys(parsed, ["snapshotReplacementMs", "retainedReplayMs"], `${label}.replay`);
    finite_nonnegative(parsed.snapshotReplacementMs, `${label}.snapshotReplacementMs`);
    finite_nonnegative(parsed.retainedReplayMs, `${label}.retainedReplayMs`);
    return Object.freeze({ kind: "hosted-h5-replay", value: Object.freeze({ snapshotReplacementMs: VOLATILE_TIME, retainedReplayMs: VOLATILE_TIME }) });
  }
  if ("checkpointMs" in parsed) {
    const timingKeys = ["checkpointMs", "restartLoadMs", "reconnectMs", "continuedStatePageMs"];
    exact_keys(parsed, timingKeys, `${label}.recovery`);
    for (const key of timingKeys) finite_nonnegative(parsed[key], `${label}.${key}`);
    return Object.freeze({ kind: "hosted-h5-recovery", value: Object.freeze(Object.fromEntries(timingKeys.map((key) => [key, VOLATILE_TIME]))) });
  }
  return invalid(label, "unknown H5 telemetry record");
}

function normalize_schema_recursion(body: string): NormalizedTelemetry {
  const label = "hson-schema-composition-recursion";
  const parsed = parse_json(body, label);
  const integerKeys = ["defs", "refs", "recursiveSccs", "canonicalNodes", "proofNodes", "generatedDeclarationBytes"];
  exact_keys(parsed, ["recursionPerformance", ...integerKeys, "runtimeValidationMs"], label);
  if (parsed.recursionPerformance !== "ok") invalid(label, "recursionPerformance must equal 'ok'");
  finite_nonnegative(parsed.runtimeValidationMs, `${label}.runtimeValidationMs`);
  return Object.freeze({
    kind: "schema-recursion",
    value: Object.freeze({
      recursionPerformance: "ok",
      ...Object.fromEntries(integerKeys.map((key) => [key, nonnegative_integer(parsed[key], `${label}.${key}`)])),
      runtimeValidationMs: VOLATILE_TIME,
    }),
  });
}

function normalize_schema_document(body: string): NormalizedTelemetry {
  const label = "hson-schema-document";
  const parsed = parse_json(body, label);
  exact_keys(parsed, ["documentBreadthPerformance"], label);
  if (!Array.isArray(parsed.documentBreadthPerformance) || parsed.documentBreadthPerformance.length === 0) {
    invalid(label, "documentBreadthPerformance must be a nonempty array");
  }
  const integerKeys = ["definitions", "refs", "repeatNodes", "exactCountNodes", "canonicalNodes", "proofNodes", "generatedDeclarationBytes"];
  const entries = parsed.documentBreadthPerformance.map((entry, index) => {
    const itemLabel = `${label}.documentBreadthPerformance[${index}]`;
    const item = record(entry, itemLabel);
    exact_keys(item, ["name", ...integerKeys, "compileMs", "runtimeValidationMs"], itemLabel);
    finite_nonnegative(item.compileMs, `${itemLabel}.compileMs`);
    finite_nonnegative(item.runtimeValidationMs, `${itemLabel}.runtimeValidationMs`);
    return Object.freeze({
      name: nonempty_string(item.name, `${itemLabel}.name`),
      ...Object.fromEntries(integerKeys.map((key) => [key, nonnegative_integer(item[key], `${itemLabel}.${key}`)])),
      compileMs: VOLATILE_TIME,
      runtimeValidationMs: VOLATILE_TIME,
    });
  });
  return Object.freeze({ kind: "schema-document", value: Object.freeze({ documentBreadthPerformance: Object.freeze(entries) }) });
}

function normalize_schema_analyzer(body: string): NormalizedTelemetry {
  const label = "hson-schema-analyzer";
  const parsed = parse_json(body, label);
  const deterministicIntegerKeys = [
    "schemas", "defs", "refs", "recursiveSccs", "documentRepeatNodes", "documentExactCountNodes",
    "canonicalNodes", "canonicalDocumentNodes", "refinementCount", "generatedDeclarationBytes", "proofNodes",
    "staticHsonValidations", "staticDocumentValidations", "freshnessArtifactBytes", "sourceProvenanceBytes",
  ];
  const timingKeys = ["analyzerColdMs", "analyzerWarmMs", "staticValidationMs", "typescriptColdMs", "typescriptIncrementalMs", "totalMs"];
  exact_keys(parsed, ["hsonSchema", ...deterministicIntegerKeys, ...timingKeys, "checkerHeapBytes", "checkerRssBytes"], label);
  if (parsed.hsonSchema !== "verify") invalid(label, "hsonSchema must equal 'verify'");
  for (const key of timingKeys) finite_nonnegative(parsed[key], `${label}.${key}`);
  nonnegative_integer(parsed.checkerHeapBytes, `${label}.checkerHeapBytes`);
  nonnegative_integer(parsed.checkerRssBytes, `${label}.checkerRssBytes`);
  return Object.freeze({
    kind: "schema-analyzer",
    value: Object.freeze({
      hsonSchema: "verify",
      ...Object.fromEntries(deterministicIntegerKeys.map((key) => [key, nonnegative_integer(parsed[key], `${label}.${key}`)])),
      ...Object.fromEntries(timingKeys.map((key) => [key, VOLATILE_TIME])),
      checkerHeapBytes: VOLATILE_BYTES,
      checkerRssBytes: VOLATILE_BYTES,
    }),
  });
}

function normalize_telemetry_line(launcherId: string, body: string): NormalizedTelemetry | undefined {
  switch (launcherId) {
    case "livemap.aggregate-library-transitions": return body.startsWith("telemetry") ? normalize_aggregate_transition(body) : undefined;
    case "livemap.n-library-engine": return body.startsWith("telemetry") ? normalize_n_library_engine(body) : undefined;
    case "livemap.hosted-multi-library-h1": return body.startsWith("# telemetry") ? normalize_hosted_h1(body) : undefined;
    case "locus.hosted-multi-library-h2": return body.startsWith("# telemetry") ? normalize_hosted_h2(body) : undefined;
    case "locus.hosted-multi-library-h3": return body.startsWith("# telemetry") ? normalize_hosted_h3(body) : undefined;
    case "locus.hosted-multi-library-h5": return body.startsWith("# telemetry") ? normalize_hosted_h5(body) : undefined;
    case "hson-schema-composition-recursion": return body.startsWith("{\"recursionPerformance") ? normalize_schema_recursion(body) : undefined;
    case "hson-schema-document": return body.startsWith("{\"documentBreadthPerformance") ? normalize_schema_document(body) : undefined;
    case "hson-schema-analyzer": return body.startsWith("{\"hsonSchema") ? normalize_schema_analyzer(body) : undefined;
    default: return undefined;
  }
}

type ParityProjection = Readonly<{
  canonicalStdout: string;
  invocationTelemetry: Readonly<Record<string, string>>;
}>;

function parity_projection(launcherId: string, stdout: string): ParityProjection {
  const expected = EXPECTED_TELEMETRY[launcherId];
  const optional = OPTIONAL_INVOCATION_TELEMETRY[launcherId];
  if (expected === undefined && optional === undefined) {
    return Object.freeze({ canonicalStdout: stdout, invocationTelemetry: Object.freeze({}) });
  }
  const seen = new Set<string>();
  const invocationTelemetry: Record<string, string> = {};
  const lines = stdout.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const normalized = lines.map((rawLine) => {
    const newline = rawLine.endsWith("\n") ? "\n" : "";
    const body = newline === "" ? rawLine : rawLine.slice(0, -1);
    const telemetry = normalize_telemetry_line(launcherId, body);
    if (telemetry === undefined) return rawLine;
    if (!(expected?.includes(telemetry.kind) ?? false) && !(optional?.includes(telemetry.kind) ?? false)) {
      invalid(launcherId, `unexpected telemetry record ${telemetry.kind}`);
    }
    if (seen.has(telemetry.kind)) invalid(launcherId, `duplicate telemetry record ${telemetry.kind}`);
    seen.add(telemetry.kind);
    const normalizedRecord = JSON.stringify({ telemetry: telemetry.kind, value: telemetry.value });
    if (optional?.includes(telemetry.kind)) {
      invocationTelemetry[telemetry.kind] = normalizedRecord;
      return "";
    }
    return `${normalizedRecord}${newline}`;
  });
  for (const kind of expected ?? []) if (!seen.has(kind)) invalid(launcherId, `missing telemetry record ${kind}`);
  return Object.freeze({
    canonicalStdout: normalized.join(""),
    invocationTelemetry: Object.freeze(invocationTelemetry),
  });
}

export function assert_external_launcher_stdout_parity(launcherId: string, left: string, right: string): void {
  const leftProjection = parity_projection(launcherId, left);
  const rightProjection = parity_projection(launcherId, right);
  if (leftProjection.canonicalStdout !== rightProjection.canonicalStdout) {
    throw new Error(`EXTERNAL_LAUNCHER_STDOUT_PARITY_FAILED: ${launcherId}: deterministic stdout differs`);
  }
  for (const kind of OPTIONAL_INVOCATION_TELEMETRY[launcherId] ?? []) {
    const leftRecord = leftProjection.invocationTelemetry[kind];
    const rightRecord = rightProjection.invocationTelemetry[kind];
    if (leftRecord !== undefined && rightRecord !== undefined && leftRecord !== rightRecord) {
      throw new Error(`EXTERNAL_LAUNCHER_STDOUT_PARITY_FAILED: ${launcherId}: deterministic ${kind} fields differ`);
    }
  }
}
