import { TestRecorder } from "../../harness/reporting/test-recorder";
import { run_test_suites } from "../../harness/core/test-runner";
import type { TestEvent, TestSuite } from "../../harness/core/test-contracts";

type CaseEndEvent = Extract<TestEvent, { t: "case_end" }>;

function expect_true(label: string, condition: unknown): void {
  if (!condition) throw new Error(label);
}

function find_case_end(events: readonly TestEvent[], suite: string, caseId: string): CaseEndEvent | undefined {
  return events.find((event): event is CaseEndEvent => (
    event.t === "case_end" &&
    event.suite === suite &&
    event.caseId === caseId
  ));
}

export function unit_test_harness(): TestSuite {
  const suite = "unit/test-harness";

  return {
    suite,
    cases: [
      {
        suite,
        caseId: "failed-assertion-row-fails-case-and-run", name: "failed assertion row fails case and run",
        run: async () => {
          const nestedSuite = "unit/test-harness/nested";
          const nestedCase = "returns failed assertion row";
          const events: TestEvent[] = [];

          const result = await run_test_suites(
            [
              {
                suite: nestedSuite,
                cases: [
                  {
                    suite: nestedSuite,
                    caseId: "returns-failed-assertion-row",
                    name: nestedCase,
                    run: () => ({
                      assertRows: [
                        {
                          ok: false,
                          label: "synthetic assertion failure",
                          actual: "{}",
                          expected: "\"Ada\"",
                        },
                      ],
                    }),
                  },
                ],
              },
            ],
            (event) => {
              events.push(event);
            },
          );

          const caseEnd = find_case_end(events, nestedSuite, "returns-failed-assertion-row");
          expect_true("expected case_end event", caseEnd !== undefined);
          expect_true("expected failed case_end status", caseEnd?.status === "fail");
          expect_true("expected RunResult.ok false", result.ok === false);
          expect_true("expected RunResult summary fail count", result.summary.fail === 1);

        },
      },
      {
        suite,
        caseId: "recorder-and-logger-downgrade-pass-with-failed-assertion-row", name: "recorder and logger downgrade pass with failed assertion row",
        run: () => {
          const nestedSuite = "unit/test-harness/defensive";
          const nestedCase = "impossible pass event";
          const recorder = new TestRecorder();
          const events: TestEvent[] = [
            { t: "suite_begin", suite: nestedSuite, totalPlanned: 1 },
            { t: "case_begin", suite: nestedSuite, caseId: "impossible-pass-event", name: nestedCase },
            {
              t: "case_end",
              suite: nestedSuite,
              caseId: "impossible-pass-event",
              name: nestedCase,
              status: "pass",
              ms: 1,
              assertRows: [
                {
                  ok: false,
                  label: "defensive assertion failure",
                  actual: "{}",
                  expected: "\"Ada\"",
                },
              ],
            },
          ];

          for (const event of events) {
            recorder.ingest(event);
          }

          const recorderSummary = recorder.summary();
          expect_true("expected recorder downgrade fail count", recorderSummary.fail === 1);
          expect_true("expected recorder downgrade pass count", recorderSummary.pass === 0);
          expect_true(
            "expected recorder failure list to include case",
            recorderSummary.failures.some((failure) => (
              failure.suite === nestedSuite &&
              failure.name === nestedCase
            )),
          );

        },
      },
      {
        suite,
        caseId: "elapsed-budget-yields-between-fast-cases", name: "elapsed budget yields between fast cases",
        run: async () => {
          const nestedSuite = "unit/test-harness/cooperative-budget";
          const total = 40;
          const elapsedPerCase = 0.25;
          let syntheticNow = 0;
          let completed = 0;
          const checkpoints: number[] = [];
          const frozenRuntimeNow = (): number => 0;
          const scheduleCheckpoint = (): void => {
            setImmediate(() => {
              checkpoints.push(completed);
              if (completed < total) scheduleCheckpoint();
            });
          };
          scheduleCheckpoint();
          const result = await run_test_suites(
            [{
              suite: nestedSuite,
              cases: Array.from({ length: total }, (_, index) => ({
                suite: nestedSuite,
                caseId: `fast-${index}`,
                name: `fast ${index}`,
                run() {
                  const frozenBefore = frozenRuntimeNow();
                  syntheticNow += elapsedPerCase;
                  expect_true("finite case does not require runtime clock progress", frozenRuntimeNow() === frozenBefore);
                },
              })),
            }],
            (event) => { if (event.t === "case_end") completed += 1; },
            {
              yieldEveryCases: 0,
              yieldAfterMs: 2,
              yieldBetweenSuites: false,
              now: () => syntheticNow,
            },
          );
          await new Promise<void>((resolve) => setImmediate(resolve));
          expect_true("elapsed-budget nested run passes", result.ok && result.summary.cases === total);
          expect_true("synthetic elapsed clock advances exactly once per case", syntheticNow === total * elapsedPerCase);
          expect_true(
            "a macrotask observes partial progress before terminal completion",
            checkpoints.some((count) => count > 0 && count < total),
          );
        },
      },
    ],
  };
}
