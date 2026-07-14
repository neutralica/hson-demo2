import { JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS } from "./dom/canvas/jsdom-hosted-canvas-suites";
import { JSDOM_HOSTED_DEFERRED_CASE_KEYS } from "./dom/jsdom-hosted-test-suites";

export type FinalHarnessMigrationStatus =
  | "HOSTED"
  | "DEFERRED_BROWSER_FIDELITY"
  | "GENERATED_HOSTABLE"
  | "GENERATED_BROWSER_ONLY"
  | "DEV_ONLY"
  | "LEGACY_REMOVE"
  | "UNKNOWN";

export type FinalHarnessMigrationEntry = Readonly<{
  id: string;
  status: FinalHarnessMigrationStatus;
  cases: number | undefined;
  execution: string;
  reason: string;
}>;

export const DEFERRED_BROWSER_FIDELITY_CASES = Object.freeze([
  ...JSDOM_HOSTED_DEFERRED_CASE_KEYS.map((id) => Object.freeze({
    id,
    status: "DEFERRED_BROWSER_FIDELITY" as const,
    cases: 1,
    execution: "test-only browser-fidelity fixture",
    reason: "requires rendered pseudo-element computed-style readback",
  })),
  ...JSDOM_HOSTED_CANVAS_DEFERRED_CASE_KEYS.map((id) => Object.freeze({
    id,
    status: "DEFERRED_BROWSER_FIDELITY" as const,
    cases: 1,
    execution: "test-only browser-fidelity fixture",
    reason: "requires raster canvas pixel readback",
  })),
]);

export const GENERATED_TEST_MODES: readonly FinalHarnessMigrationEntry[] = Object.freeze([
  Object.freeze({
    id: "transform/fuzz-json/seed_<startup-seed>",
    status: "GENERATED_HOSTABLE",
    cases: 50,
    execution: "Node-only diagnostic with an explicit seed",
    reason: "host-compatible and reproducible only when the seed and case count are explicit",
  }),
  Object.freeze({
    id: "generated/json/seed_<run-seed>",
    status: "GENERATED_HOSTABLE",
    cases: 200,
    execution: "Node-only diagnostic with an explicit seed and case count",
    reason: "configurable generated workload is excluded from the fixed canonical total",
  }),
]);

export const REMOVED_LOCAL_HARNESS_MODES: readonly FinalHarnessMigrationEntry[] = Object.freeze([
  ...["all", "transform", "livetree", "livemap", "livehost", "legacy", "unit", "dev", "fuzz-json"].map((id) => Object.freeze({
    id: `panel/${id}`,
    status: "LEGACY_REMOVE" as const,
    cases: undefined,
    execution: "removed from production panel",
    reason: "superseded by explicit remote hosted selectors",
  })),
  Object.freeze({
    id: "transform/ad-hoc/<format>",
    status: "DEV_ONLY",
    cases: 1,
    execution: "test-only transform fixture",
    reason: "runtime-selected parser input is not a fixed canonical suite",
  }),
]);

export const FINAL_HARNESS_MIGRATION_INVENTORY: readonly FinalHarnessMigrationEntry[] = Object.freeze([
  Object.freeze({
    id: "hosted/all",
    status: "HOSTED",
    cases: 2045,
    execution: "real Node/WebSocket LiveHost",
    reason: "canonical fixed deterministic collection",
  }),
  ...DEFERRED_BROWSER_FIDELITY_CASES,
  ...GENERATED_TEST_MODES,
  ...REMOVED_LOCAL_HARNESS_MODES,
]);
