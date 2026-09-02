import type { Artifact } from "hson-live/diagnostics";

export type TestCapability =
  | "javascript"
  | "node"
  | "process"
  | "worker-threads"
  | "synthetic-dom"
  | "synthetic-canvas"
  | "browser-dom"
  | "browser-raster"
  | "browser"
  | "chromium"
  | "cloudflare-worker"
  | "filesystem"
  | "websocket"
  | "network"
  | "local-server"
  | "compiler/typescript"
  | "build-tooling"
  | "dynamic-generated"
  | "environment/secrets"
  | "deployment-access";

/** Stable presentation and serialization order for selectable semantic subjects. */
export const CANONICAL_TEST_SUBJECT_ORDER = Object.freeze([
  "transform",
  "livetree",
  "livemap",
  "livehost",
  "reflect",
] as const);

export const CANONICAL_TEST_COLLECTION_ORDER = Object.freeze(["unit", "dev"] as const);

/** Complete protocol vocabulary: selectable subjects first, auxiliary subjects last. */
export const TEST_SUBJECT_IDENTIFIERS = Object.freeze([
  ...CANONICAL_TEST_SUBJECT_ORDER,
  "integration",
  "livedemo",
] as const);

export type TestSubject = typeof TEST_SUBJECT_IDENTIFIERS[number];
export type TestCollection = "unit" | "dev";
export type TestProvenance = "hson-demo2" | "hson-live";
export type TestExecutionShape = "cases" | "browser-journeys" | "opaque-aggregate";

export type TestDescriptorMetadata = Readonly<{
  subject: TestSubject;
  requirements: readonly TestCapability[];
  collections?: readonly TestCollection[];
  title?: string;
  provenance?: TestProvenance;
  order?: number;
  executionShape?: TestExecutionShape;
  sourceRef?: string;
}>;

export type TestDescriptorMetadataOverride = Readonly<{
  subject?: TestSubject;
  requirements?: readonly TestCapability[];
  collections?: readonly TestCollection[];
}>;

export type TestDescriptor = Readonly<{
  id: string;
  suiteId: string;
  caseId: string;
  title: string;
  subject: TestSubject;
  requirements: readonly TestCapability[];
  collections: readonly TestCollection[];
  provenance: TestProvenance;
  suiteOrdinal: number;
  caseOrdinal: number;
  sourceRef?: string;
}>;

export type TestSuiteDescriptor = Readonly<{
  id: string;
  title: string;
  subject: TestSubject;
  collections: readonly TestCollection[];
  provenance: TestProvenance;
  order: number;
  requirements: readonly TestCapability[];
  executionShape: TestExecutionShape;
  sourceRef?: string;
}>;

export type CaseMeta = Readonly<{
  fixture?: string;
  sub?: string;
  preview?: string;
  input?: string;
  reportId?: Artifact;
  category?: string;
  assertRows?: string;
}>;

export type TestFailure = Readonly<{
  suite: string;
  caseId?: string;
  name: string;
  err: string;
  ms: number;
  meta?: CaseMeta;
}>;

export type TestSummary = Readonly<{
  suites: number;
  cases: number;
  pass: number;
  fail: number;
  skip: number;
  msTotal: number;
  failures: readonly TestFailure[];
}>;

export type UiLevel = "quiet" | "normal";
