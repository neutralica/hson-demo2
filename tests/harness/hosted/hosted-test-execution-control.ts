import type { TestEvent } from "../core/test-contracts";

export type HostedTestExecutionControlPhase =
  | "ready"
  | "running"
  | "cancellation-pending"
  | "cancelling"
  | "terminal"
  | "released";

export type HostedTestExecutionControl = Readonly<{
  signal: AbortSignal;
  phase(): HostedTestExecutionControlPhase;
  begin(): boolean;
  requestCancellation(accept: () => Promise<void>): Promise<boolean>;
  acceptNaturalTerminal(): Promise<boolean>;
  acceptsEvent(event: TestEvent): boolean;
  markCancellationTerminal(): void;
  release(): void;
  released(): Promise<void>;
  diagnostics(): Readonly<{
    cancellationRequests: number;
    destructiveCancellationSignals: number;
  }>;
}>;

/**
 * Generic attempt-local executor control. LiveHost owns whether cancellation is
 * accepted; this boundary only fences scheduling, propagates cooperative abort,
 * acknowledges executor terminality, and releases its controller reference.
 */
export function make_hosted_test_execution_control(): HostedTestExecutionControl {
  const controller = new AbortController();
  let phase: HostedTestExecutionControlPhase = "ready";
  let cancellation: Promise<boolean> | undefined;
  let cancellationRequests = 0;
  let destructiveCancellationSignals = 0;
  let releaseResolve: () => void = () => undefined;
  const releaseSettled = new Promise<void>((resolve) => { releaseResolve = resolve; });

  const acceptsEvent = (event: TestEvent): boolean => {
    if (phase === "terminal" || phase === "released") return false;
    if (phase !== "cancelling" && phase !== "cancellation-pending") return true;
    // These are executor acknowledgements/evidence, not new semantic work.
    return event.t === "case_cancelled"
      || (event.t === "external_end" && (
        event.status === "cancelled" || event.completionAcceptedBeforeCancellation === true
      ));
  };

  return Object.freeze({
    get signal() { return controller.signal; },
    phase: () => phase,
    begin() {
      if (phase !== "ready") return false;
      phase = "running";
      return true;
    },
    requestCancellation(accept) {
      cancellationRequests += 1;
      if (cancellation !== undefined) return cancellation;
      if (phase === "terminal" || phase === "released") return Promise.resolve(false);
      const prior = phase;
      phase = "cancellation-pending";
      cancellation = (async () => {
        try {
          await accept();
          phase = "cancelling";
          if (!controller.signal.aborted) {
            destructiveCancellationSignals += 1;
            controller.abort();
          }
          return true;
        } catch (error) {
          phase = prior;
          cancellation = undefined;
          throw error;
        }
      })();
      return cancellation;
    },
    async acceptNaturalTerminal() {
      if (phase === "cancellation-pending" && cancellation !== undefined) {
        const accepted = await cancellation;
        if (accepted) return false;
      }
      if (phase === "cancelling") return false;
      if (phase === "released") return false;
      phase = "terminal";
      return true;
    },
    acceptsEvent,
    markCancellationTerminal() {
      if (phase === "released") return;
      phase = "terminal";
    },
    release() {
      if (phase === "released") return;
      phase = "released";
      cancellation = undefined;
      releaseResolve();
    },
    released: () => releaseSettled,
    diagnostics: () => Object.freeze({ cancellationRequests, destructiveCancellationSignals }),
  });
}
