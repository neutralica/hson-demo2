import { create_test_log } from "../../app/demos/test/test-logger";
import { TestRecorder } from "../../app/demos/test/test-recorder";
import { run_test_suites } from "../../hosted-test/test-runner";
import type { CaseKey, TestEvent, TestSuite } from "../../app/demos/test/tests.types";

type CaseEndEvent = Extract<TestEvent, { t: "case_end" }>;

function expect_true(label: string, condition: unknown): void {
  if (!condition) throw new Error(label);
}

function find_case_end(events: readonly TestEvent[], suite: string, name: string): CaseEndEvent | undefined {
  return events.find((event): event is CaseEndEvent => (
    event.t === "case_end" &&
    event.suite === suite &&
    event.name === name
  ));
}

export function unit_test_harness(): TestSuite {
  const suite = "unit/test-harness";

  return {
    suite,
    cases: [
      {
        suite,
        name: "failed assertion row fails case and run",
        run: async () => {
          const nestedSuite = "unit/test-harness/nested";
          const nestedCase = "returns failed assertion row";
          const events: TestEvent[] = [];
          const log = create_test_log();

          const result = await run_test_suites(
            [
              {
                suite: nestedSuite,
                cases: [
                  {
                    suite: nestedSuite,
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
              log.onEvent(event);
            },
          );

          const caseEnd = find_case_end(events, nestedSuite, nestedCase);
          expect_true("expected case_end event", caseEnd !== undefined);
          expect_true("expected failed case_end status", caseEnd?.status === "fail");
          expect_true("expected RunResult.ok false", result.ok === false);
          expect_true("expected RunResult summary fail count", result.summary.fail === 1);

          const logSummary = log.getSummary();
          expect_true("expected logger summary fail count", logSummary.fail === 1);
          expect_true(
            "expected logger listFailures to include nested case",
            log.listFailures().some((failure) => (
              failure.suite === nestedSuite &&
              failure.name === nestedCase
            )),
          );
        },
      },
      {
        suite,
        name: "recorder and logger downgrade pass with failed assertion row",
        run: () => {
          const nestedSuite = "unit/test-harness/defensive";
          const nestedCase = "impossible pass event";
          const key = `${nestedSuite}::${nestedCase}` as CaseKey;
          const recorder = new TestRecorder();
          const log = create_test_log();
          const events: TestEvent[] = [
            { t: "suite_begin", suite: nestedSuite, totalPlanned: 1 },
            { t: "case_begin", suite: nestedSuite, name: nestedCase },
            {
              t: "case_end",
              suite: nestedSuite,
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
            log.onEvent(event);
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

          const logSummary = log.getSummary();
          expect_true("expected logger downgrade fail count", logSummary.fail === 1);
          expect_true("expected logger downgrade pass count", logSummary.pass === 0);
          expect_true("expected logger case status fail", log.getCase(key)?.status === "fail");
          expect_true(
            "expected logger failure list to include case",
            log.listFailures().some((failure) => (
              failure.suite === nestedSuite &&
              failure.name === nestedCase
            )),
          );
        },
      },
    ],
  };
}
