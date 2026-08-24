import { hson } from "hson-live";
import { mount_test_panels_with_mode } from "../../../src/app/demos/tests/panel/mount-test-panels";
import { mount_frozen_test_panel } from "../../../src/app/demos/tests/panel/mount-tp-frozen";
import { FROZEN_TEST_EVIDENCE_ROOT } from "../app/frozen-test-evidence-index";

declare global {
  interface Window { __frozenPanelFixture?: Readonly<{ liveLoads: number }> }
}

const host = hson.liveTree.queryDom("#frozen-test-panel-fixture").graft();
let liveLoads = 0;
const panel = mount_test_panels_with_mode(host, "frozen", async (root) => {
  if (root.attrs.get("data-test-acquisition") === "live") {
    liveLoads += 1;
    throw new Error("Frozen composition attempted to load the live panel.");
  }
  const missingRoot = new URL(location.href).searchParams.has("missing-root");
  return mount_frozen_test_panel(root, missingRoot ? {} : { evidenceRoot: FROZEN_TEST_EVIDENCE_ROOT });
});
window.__frozenPanelFixture = Object.freeze({ get liveLoads() { return liveLoads; } });
await panel.ready;
host.attrs.set("data-fixture-state", "ready");
