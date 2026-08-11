import { CssManager, hson } from "hson-live";
import { hson_quid_selector } from "../../helpers/hson/hson-metadata-helpers";

function error_message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type QuidSelectorPreflushSnapshot = Readonly<{
  htmlOpacity: string;
  svgOpacity: string;
  htmlRulePresent: boolean;
  svgRulePresent: boolean;
}>;

let flush_initial: (() => void) | undefined;

function rule_is_present(quid: string): boolean {
  const selector = hson_quid_selector(quid);
  const style = document.querySelector("#css-manager #_hson") as HTMLStyleElement | null;
  const sheet = style?.sheet as CSSStyleSheet | null;
  return sheet == null
    ? false
    : Array.from(sheet.cssRules).some((rule) => "selectorText" in rule && rule.selectorText === selector);
}

export function install_quid_selector_fixture(): QuidSelectorPreflushSnapshot {
  const host = hson.liveTree.queryDom("#fixture-root").graft();
  const isolatedHost = hson.liveTree.queryDom("#fixture-isolated-root").graft();
  host.attrs.set("data-fixture-state", "installing");
  isolatedHost.attrs.set("data-fixture-state", "installing");

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
    const isolatedTarget = isolatedHost.create.div().id.set("quid-isolated-target").text.set("Isolated target");
    isolatedHost.create.div().id.set("quid-isolated-sibling").text.set("Isolated sibling");
    const pseudoPlain = host.create.div().id.set("quid-pseudo-plain").text.set("plain");
    const pseudoEmpty = host.create.div().id.set("quid-pseudo-empty").text.set("empty");
    const pseudoManual = host.create.div().id.set("quid-pseudo-manual").text.set("manual");
    const pseudoAuto = host.create.div().id.set("quid-pseudo-auto").text.set("auto");
    const pseudoAttr = host.create.div().id.set("quid-pseudo-attr").attrs.set("data-label", "HELLO").text.set("attr");
    const update = host.create.button().id.set("quid-update").text.set("Update QUID styles");
    const clear = host.create.button().id.set("quid-clear").text.set("Clear QUID styles");

    function flush(state: string): void {
      CssManager.invoke().syncNow();
      host.attrs.set("data-fixture-state", state);
      isolatedHost.attrs.set("data-fixture-state", state);
    }

    htmlTarget.css.setMany({ opacity: "0.25" });
    svgTarget.css.setMany({ opacity: "0.4" });
    isolatedTarget.css.setMany({ opacity: "0.6" });
    pseudoPlain.css.setMany({ __before: { content: "X", color: "rgb(255, 0, 255)" } });
    pseudoEmpty.css.setMany({ __before: { color: "rgb(255, 0, 255)" } });
    pseudoManual.css.setMany({ __before: { content: `"M"` } });
    pseudoAuto.css.setMany({ __before: { content: "A" } });
    pseudoAttr.css.setMany({ __before: { content: "attr(data-label)" } });

    const htmlElement = htmlTarget.dom.must.el();
    const svgElement = svgTarget.dom.must.el();
    const htmlQuid = htmlElement.getAttribute("hson:quid") ?? "";
    const svgQuid = svgElement.getAttribute("hson:quid") ?? "";
    const preflush = Object.freeze({
      htmlOpacity: getComputedStyle(htmlElement).opacity,
      svgOpacity: getComputedStyle(svgElement).opacity,
      htmlRulePresent: rule_is_present(htmlQuid),
      svgRulePresent: rule_is_present(svgQuid),
    });
    host.attrs.set("data-fixture-state", "pending");
    isolatedHost.attrs.set("data-fixture-state", "pending");
    flush_initial = () => flush("initial");

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

    return preflush;
  } catch (error) {
    const message = `QUID selector fixture initialization failed: ${error_message(error)}`;
    host.attrs.setMany({
      "data-fixture-state": "failed",
      "data-fixture-error": message,
    });
    isolatedHost.attrs.setMany({
      "data-fixture-state": "failed",
      "data-fixture-error": message,
    });
    throw new Error(message);
  }
}

export function flush_quid_selector_fixture(): void {
  if (flush_initial === undefined) {
    throw new Error("QUID selector fixture must be installed before its initial flush.");
  }
  flush_initial();
  flush_initial = undefined;
}
