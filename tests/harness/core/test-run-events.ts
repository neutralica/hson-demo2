import type { TestAssertRow, TestDescriptor, TestEvent } from "./test-contracts";

export type NormalizedTestRunEvent =
  | Readonly<{ type: "suite-started"; suite: string; totalPlanned?: number }>
  | Readonly<{ type: "test-started"; test: TestDescriptor; meta?: Record<string, string> }>
  | Readonly<{
      type: "test-finished";
      test: TestDescriptor;
      status: "pass" | "fail" | "skip";
      durationMs: number;
      error?: string;
      assertRows?: readonly TestAssertRow[];
      expected?: "ok" | "fail";
      metaPatch?: Record<string, string>;
    }>
  | Readonly<{ type: "suite-finished"; suite: string; durationMs: number }>;

export function normalize_test_event(
  event: TestEvent,
  descriptorFor: (suite: string, name: string) => TestDescriptor | undefined,
): NormalizedTestRunEvent {
  if (event.t === "suite_begin") {
    return Object.freeze({ type: "suite-started", suite: event.suite, ...(event.totalPlanned === undefined ? {} : { totalPlanned: event.totalPlanned }) });
  }
  if (event.t === "suite_end") {
    return Object.freeze({ type: "suite-finished", suite: event.suite, durationMs: event.ms });
  }
  if (event.t === "external_end" || event.t === "external_state") {
    throw new Error(`External launcher events are not canonical TestCase events: ${event.id}`);
  }
  const descriptor = descriptorFor(event.suite, event.name);
  if (descriptor === undefined) throw new Error(`No canonical descriptor for ${event.suite}::${event.name}`);
  if (event.t === "case_begin") {
    return Object.freeze({ type: "test-started", test: descriptor, ...(event.meta === undefined ? {} : { meta: event.meta }) });
  }
  return Object.freeze({
    type: "test-finished",
    test: descriptor,
    status: event.status,
    durationMs: event.ms,
    ...(event.err === undefined ? {} : { error: event.err }),
    ...(event.assertRows === undefined ? {} : { assertRows: event.assertRows }),
    ...(event.expected === undefined ? {} : { expected: event.expected }),
    ...(event.metaPatch === undefined ? {} : { metaPatch: event.metaPatch }),
  });
}
