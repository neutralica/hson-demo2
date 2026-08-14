export const HOSTED_TEST_TIMELINE_STAGES = Object.freeze([
  "run_button_invoked",
  "selection_completed",
  "run_plan_created",
  "coordinator_request_sent",
  "coordinator_request_accepted",
  "report_host_allocated",
  "report_seeded_queued",
  "initial_report_mutation_committed",
  "coordinator_association_committed",
  "report_client_ready",
  "first_report_frame_serialized",
  "first_report_frame_sent",
  "browser_received_first_report_frame",
  "inspector_projected_queued",
  "logger_projected_queued",
  "summary_projected_queued",
  "first_suite_or_case_started",
  "run_finished",
  "report_terminal_committed",
  "panel_run_completed",
] as const);

export type HostedTestTimelineStage = typeof HOSTED_TEST_TIMELINE_STAGES[number];
export type HostedTestTimelineEvent = Readonly<{
  stage: HostedTestTimelineStage;
  at: number;
  detail?: Readonly<Record<string, string | number | boolean | null>>;
}>;
export type HostedTestTimelineObserver = (event: HostedTestTimelineEvent) => void;

export function observe_hosted_test_timeline(
  observer: HostedTestTimelineObserver | undefined,
  stage: HostedTestTimelineStage,
  detail?: HostedTestTimelineEvent["detail"],
): void {
  observer?.(Object.freeze({ stage, at: performance.now(), ...(detail === undefined ? {} : { detail }) }));
}
