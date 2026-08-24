import type { LiveTree } from "hson-live/livetree";
import { TP_ROOTcss } from "./tp.css";

export type MountedTestPanels = Readonly<{
  root: LiveTree;
  testSurface: LiveTree;
  ready: Promise<void>;
  dispose(): void;
}>;

export type TestPanelAcquisitionMode = "frozen";

type MountedPanel = Readonly<{ branch: LiveTree; dispose(): void; ready?: Promise<unknown> }>;

export type TestPanelLoader = (root: LiveTree) => Promise<MountedPanel>;

export function test_panel_acquisition_mode(_production: boolean): TestPanelAcquisitionMode {
  return "frozen";
}

export function mount_test_panels_with_mode(
  host: LiveTree,
  mode: TestPanelAcquisitionMode,
  load: TestPanelLoader,
): MountedTestPanels {
  host.find.byId("test-panels-root")?.remove();
  const root = host.create.div().id.set("test-panels-root").css.setMany(TP_ROOTcss);
  const loading = root.create.div()
    .attrs.setMany({ "data-testid": "test-panel-loading", "data-test-acquisition": mode })
    .text.set("loading frozen test evidence…");
  let disposed = false;
  let mounted: MountedPanel | undefined;
  const ready = load(root).then(async (panel) => {
    if (disposed) {
      panel.dispose();
      return;
    }
    mounted = panel;
    loading.remove();
    await panel.ready;
  }).catch((cause: unknown) => {
    if (disposed) return;
    loading.attrs.setMany({ "data-testid": "test-panel-composition-error", role: "alert" });
    loading.text.set(`test panel failed to load: ${cause instanceof Error ? cause.message : String(cause)}`);
  });
  return Object.freeze({
    root,
    testSurface: loading,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      mounted?.dispose();
      root.remove();
    },
  });
}

export function mount_test_panels(host: LiveTree): MountedTestPanels {
  return mount_test_panels_with_mode(host, test_panel_acquisition_mode(import.meta.env.PROD), async (root) => {
    const module = await import("./mount-tp-frozen");
    const evidenceRoot = import.meta.env.VITE_TEST_EVIDENCE_ROOT;
    return module.mount_frozen_test_panel(root, evidenceRoot === undefined ? {} : { evidenceRoot });
  });
}
