import { hson } from "hson-live";
import { mount_test_panels, mount_test_panels_with_mode } from "../../../src/app/demos/tests/panel/mount-test-panels";
import { mount_frozen_test_panel } from "../../../src/app/demos/tests/panel/mount-tp-frozen";

declare global {
  interface Window { __frozenPanelFixture?: Readonly<{ acquisition: string | null; deactivate(): void }> }
}

const host = hson.liveTree.queryDom("#frozen-test-panel-fixture").graft();
const fixtureUrl = new URL(location.href);
const missingRoot = fixtureUrl.searchParams.has("missing-root");
const evidenceRoot = fixtureUrl.searchParams.get("evidence-root");
const panel = missingRoot || evidenceRoot !== null
  ? mount_test_panels_with_mode(host, "frozen", async (root) => mount_frozen_test_panel(root, evidenceRoot === null ? {} : { evidenceRoot }))
  : mount_test_panels(host);
await panel.ready;
const acquisition = host.find.byId("test-panel-branch")?.attrs.get("data-test-acquisition");
window.__frozenPanelFixture = Object.freeze({
  acquisition: typeof acquisition === "string" ? acquisition : null,
  deactivate: () => panel.deactivate(),
});
host.attrs.set("data-fixture-state", "ready");
