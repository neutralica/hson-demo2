import { hson } from "hson-live";
import { mount_test_panels, mount_test_panels_with_mode } from "../../../src/app/demos/tests/panel/mount-test-panels";
import { mount_frozen_test_panel } from "../../../src/app/demos/tests/panel/mount-tp-frozen";

declare global {
  interface Window { __frozenPanelFixture?: Readonly<{ acquisition: string | null }> }
}

const host = hson.liveTree.queryDom("#frozen-test-panel-fixture").graft();
const missingRoot = new URL(location.href).searchParams.has("missing-root");
const panel = missingRoot
  ? mount_test_panels_with_mode(host, "frozen", async (root) => mount_frozen_test_panel(root))
  : mount_test_panels(host);
await panel.ready;
const acquisition = host.find.byId("test-panel-branch")?.attrs.get("data-test-acquisition");
window.__frozenPanelFixture = Object.freeze({ acquisition: typeof acquisition === "string" ? acquisition : null });
host.attrs.set("data-fixture-state", "ready");
