import { CssManager, hson } from "hson-live";

function error_message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function install_quid_selector_fixture(): void {
  const host = hson.liveTree.queryDom("#fixture-root").graft();
  host.attrs.set("data-fixture-state", "installing");

  try {
    const htmlTarget = host.create.div().id.set("quid-html-target").text.set("HTML target");
    host.create.div().id.set("quid-html-sibling").text.set("HTML sibling");
    const svg = host.create.svg().id.set("quid-svg");
    const svgTarget = svg.create.circle().id.set("quid-svg-target").attrs.setMany({
      cx: "10",
      cy: "10",
      r: "8",
    });
    svg.create.circle().id.set("quid-svg-sibling").attrs.setMany({
      cx: "30",
      cy: "10",
      r: "8",
    });
    const update = host.create.button().id.set("quid-update").text.set("Update QUID styles");
    const clear = host.create.button().id.set("quid-clear").text.set("Clear QUID styles");

    function flush(state: string): void {
      CssManager.invoke().syncNow();
      host.attrs.set("data-fixture-state", state);
    }

    htmlTarget.css.setMany({ opacity: "0.25" });
    svgTarget.css.setMany({ opacity: "0.4" });
    flush("initial");

    update.listen.onClick(() => {
      htmlTarget.css.setMany({ opacity: "0.75" });
      svgTarget.css.setMany({ opacity: "0.65" });
      flush("updated");
    });

    clear.listen.onClick(() => {
      htmlTarget.css.clear();
      svgTarget.css.clear();
      flush("cleared");
    });
  } catch (error) {
    const message = `QUID selector fixture initialization failed: ${error_message(error)}`;
    host.attrs.setMany({
      "data-fixture-state": "failed",
      "data-fixture-error": message,
    });
    throw new Error(message);
  }
}
