import type { LiveTree } from "hson-live";
import type { TestEvent } from "./tests.types";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";

export type HostedTestCaseActions = Readonly<{
  view(caseKey: string): Promise<void>;
  copy(caseKey: string): Promise<void>;
}>;

export type HostedTestCaseList = Readonly<{
  reset(): void;
  on_event(event: TestEvent): void;
  show_error(message: string): void;
}>;

export function make_hosted_test_case_list(host: LiveTree, actions: HostedTestCaseActions): HostedTestCaseList {
  const root = host.create.div().classlist.set("hosted-case-list").css.setMany({
    width: "100%", height: "100%", overflow: "auto", fontFamily: "DM Mono, monospace", fontSize: "11px",
  });
  root.css.selector(".hosted-case-action:hover").setMany({ color: "#d7ff70", borderColor: "#d7ff70", background: "rgba(215,255,112,.08)" });
  const suiteRows = new Map<string, LiveTree>();

  const action_button = (row: LiveTree, label: string, run: () => Promise<void>): void => {
    const button = row.create.button().classlist.set("hosted-case-action").text.set(label).css.setMany({
      appearance: "none", border: "1px solid rgba(200,220,208,.3)", background: "transparent", color: "#9bb3a6", cursor: "pointer", padding: "2px 6px", font: "inherit",
    });
    button.listen.onClick(async () => {
      button.flag.set("disabled");
      button.text.set("…");
      try { await run(); }
      catch (error) { show_error(error instanceof Error ? error.message : String(error)); }
      finally { button.attr.drop("disabled"); button.text.set(label); }
    });
  };

  const show_error = (message: string): void => {
    root.create.div().text.set(`error: ${message}`).css.setMany({ color: "#ff8778", padding: "5px 8px", borderBottom: "1px solid rgba(255,135,120,.3)" });
  };

  return Object.freeze({
    reset() { root.empty(); suiteRows.clear(); },
    show_error,
    on_event(event) {
      if (event.t === "suite_begin") {
        const suiteRow = root.create.div().css.setMany({ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", padding: "7px 8px 4px", color: "#7dd8cf", borderBottom: "1px solid rgba(125,216,207,.25)" });
        suiteRow.create.span().text.set(event.suite);
        const timing = suiteRow.create.span().text.set("running").css.set.color("#6f7c75");
        suiteRows.set(event.suite, timing);
        return;
      }
      if (event.t === "suite_end") {
        suiteRows.get(event.suite)?.text.set(format_hosted_test_duration(event.ms));
        return;
      }
      if (event.t !== "case_end") return;
      const key = `${event.suite}::${event.name}`;
      const row = root.create.div().css.setMany({
        display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 70px auto auto", alignItems: "center", gap: "7px", padding: "4px 8px", borderBottom: "1px solid rgba(200,220,208,.09)", color: "#ddd9cd",
      });
      row.create.span().text.set(event.status.toUpperCase()).css.set.color(event.status === "pass" ? "#9ddf8b" : event.status === "fail" ? "#ff8778" : "#c4b070");
      row.create.span().text.set(event.name).attr.set("title", key).css.setMany({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
      row.create.span().text.set(format_hosted_test_duration(event.ms)).css.setMany({ textAlign: "right", color: "#89948d" });
      action_button(row, "view", () => actions.view(key));
      action_button(row, "copy", () => actions.copy(key));
    },
  });
}
