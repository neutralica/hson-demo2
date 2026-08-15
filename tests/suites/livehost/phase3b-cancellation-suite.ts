import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { make_hosted_test_execution_control } from "../../harness/hosted/hosted-test-execution-control";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 3B cancellation: ${message}`);
}

function test_case(caseId: string, name: string, run: TestCase["run"]): TestCase {
  return Object.freeze({ suite: "livehost/cancellation-control", caseId, name, run });
}

let lastMeasurement: Readonly<{ cancellationRequests: number; destructiveCancellationSignals: number }> = Object.freeze({ cancellationRequests: 0, destructiveCancellationSignals: 0 });

export function phase3b_cancellation_measurement(): typeof lastMeasurement {
  return lastMeasurement;
}

export function all_phase3b_cancellation_suites(): readonly TestSuite[] {
  const suite = "livehost/cancellation-control";
  return Object.freeze([Object.freeze({
    suite,
    cases: Object.freeze([
      test_case("exactly-once-abort", "accepted cancellation aborts exactly once", async () => {
        const control = make_hosted_test_execution_control();
        expect(control.begin(), "attempt begins once");
        const first = control.requestCancellation(async () => undefined);
        const duplicate = control.requestCancellation(async () => { throw new Error("duplicate acceptance must not run"); });
        expect(await first && await duplicate, "first and duplicate cancellation observe acceptance");
        lastMeasurement = control.diagnostics();
        expect(control.signal.aborted && lastMeasurement.cancellationRequests === 2
          && lastMeasurement.destructiveCancellationSignals === 1, "one destructive signal serves duplicate requests");
      }),
      test_case("event-fence", "cancellation fences new work but admits terminal acknowledgements", async () => {
        const control = make_hosted_test_execution_control();
        control.begin();
        await control.requestCancellation(async () => undefined);
        expect(!control.acceptsEvent({ t: "case_begin", suite, caseId: "held", name: "held" }), "new case work is fenced");
        expect(control.acceptsEvent({ t: "case_cancelled", suite, caseId: "held", name: "held", ms: 0 }), "case cancellation acknowledgement is admitted");
      }),
      test_case("natural-terminal", "natural terminal settles before later cancellation", async () => {
        const control = make_hosted_test_execution_control();
        control.begin();
        expect(await control.acceptNaturalTerminal(), "natural completion wins while running");
        expect(!(await control.requestCancellation(async () => undefined)), "terminal attempt rejects destructive cancellation");
        expect(!control.signal.aborted, "late cancellation does not abort terminal work");
      }),
      test_case("accepted-cancel-wins", "accepted cancellation defeats concurrent natural completion", async () => {
        const control = make_hosted_test_execution_control();
        control.begin();
        let accept = (): void => undefined;
        const gate = new Promise<void>((resolve) => { accept = resolve; });
        const cancelling = control.requestCancellation(() => gate);
        const natural = control.acceptNaturalTerminal();
        accept();
        expect(await cancelling, "cancellation is accepted");
        expect(!(await natural), "natural terminal cannot supersede accepted cancellation");
        control.markCancellationTerminal();
        expect(control.phase() === "terminal", "cancellation terminalizes the attempt");
      }),
      test_case("release", "release is idempotent and resolves ownership", async () => {
        const control = make_hosted_test_execution_control();
        control.release();
        control.release();
        await control.released();
        expect(control.phase() === "released", "controller ownership is released exactly once");
      }),
    ]),
  })]);
}
