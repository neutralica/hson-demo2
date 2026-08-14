import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import { MAIN_VIEW_IDS, WIDGET_IDS, type MainViewId, type WidgetId } from "../../../src/app/state/shell-ids";
import {
  create_shell_lifecycle_reconciler,
  type SurfaceRegistration,
  type SurfaceRetention,
} from "../../../src/app/phases/phase-3-demo/shell-lifecycle";

const SUITE = "unit/livedemo-shell-lifecycle";

type Probe = {
  mounts: number;
  activates: number;
  deactivates: number;
  disposes: number;
};

function probes<TId extends string>(ids: readonly TId[]): Record<TId, Probe> {
  return Object.fromEntries(ids.map((id) => [id, {
    mounts: 0,
    activates: 0,
    deactivates: 0,
    disposes: 0,
  }])) as Record<TId, Probe>;
}

function registrations<TId extends string>(
  ids: readonly TId[],
  state: Record<TId, Probe>,
  retention: (id: TId) => SurfaceRetention,
): Record<TId, SurfaceRegistration> {
  return Object.fromEntries(ids.map((id) => [id, {
    retention: retention(id),
    mount: () => {
      state[id].mounts += 1;
      let disposed = false;
      return {
        activate: () => { state[id].activates += 1; },
        deactivate: () => { state[id].deactivates += 1; },
        dispose: () => {
          if (disposed) return;
          disposed = true;
          state[id].disposes += 1;
        },
      };
    },
  }])) as Record<TId, SurfaceRegistration>;
}

function harness(options: Readonly<{
  mainRetention?: (id: MainViewId) => SurfaceRetention;
  widgetRetention?: (id: WidgetId) => SurfaceRetention;
}> = {}) {
  const main = probes(MAIN_VIEW_IDS);
  const widgets = probes(WIDGET_IDS);
  const reconciler = create_shell_lifecycle_reconciler({
    mainIds: MAIN_VIEW_IDS,
    widgetIds: WIDGET_IDS,
    main: registrations(MAIN_VIEW_IDS, main, options.mainRetention ?? (() => "recreate")),
    widgets: registrations(WIDGET_IDS, widgets, options.widgetRetention ?? (() => "recreate")),
  });
  return { main, widgets, reconciler };
}

function expect_count(actual: number, expected: number, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

export function live_demo_shell_lifecycle_suite(): TestSuite {
  const cases: readonly TestCase[] = [
    {
      suite: SUITE,
      caseId: "construction-and-null-reconciliation-mount-no-ordinary-main-surface", name: "construction and null reconciliation mount no ordinary main surface",
      run: () => {
        const { main, reconciler } = harness();
        reconciler.reconcileMain(null);
        for (const id of MAIN_VIEW_IDS) expect_count(main[id].mounts, 0, `${id} mounts`);
      },
    },
    {
      suite: SUITE,
      caseId: "initial-widget-reconciliation-mounts-only-selected-bling", name: "initial widget reconciliation mounts only selected Bling",
      run: () => {
        const { widgets, reconciler } = harness();
        reconciler.reconcileWidgets(["bling"]);
        expect_count(widgets.bling.mounts, 1, "Bling mounts");
        expect_count(widgets.point.mounts, 0, "Pointer mounts");
        expect_count(widgets.oklch.mounts, 0, "OKLCH mounts");
      },
    },
    {
      suite: SUITE,
      caseId: "recreate-main-surfaces-switch-clear-and-ignore-same-selection-exactly-once", name: "recreate main surfaces switch, clear, and ignore same selection exactly once",
      run: () => {
        const { main, reconciler } = harness();
        reconciler.reconcileMain("about");
        reconciler.reconcileMain("about");
        expect_count(main.about.mounts, 1, "About mounts");

        reconciler.reconcileMain("parse");
        expect_count(main.about.disposes, 1, "About disposes");
        expect_count(main.parse.mounts, 1, "Parse mounts");

        reconciler.reconcileMain(null);
        expect_count(main.parse.disposes, 1, "Parse disposes");
      },
    },
    {
      suite: SUITE,
      caseId: "retained-main-surface-deactivates-and-reactivates-without-reconstruction", name: "retained main surface deactivates and reactivates without reconstruction",
      run: () => {
        const { main, reconciler } = harness({
          mainRetention: (id) => id === "test" ? "retain" : "recreate",
        });
        reconciler.reconcileMain("test");
        reconciler.reconcileMain("about");
        expect_count(main.test.deactivates, 1, "Test deactivations");
        expect_count(main.test.disposes, 0, "Test disposes before shell teardown");

        reconciler.reconcileMain("test");
        expect_count(main.test.mounts, 1, "Test mounts");
        expect_count(main.test.activates, 1, "Test reactivations");

        reconciler.dispose();
        reconciler.dispose();
        expect_count(main.test.disposes, 1, "Test final disposes");
      },
    },
    {
      suite: SUITE,
      caseId: "widget-membership-reconciles-by-identity-without-duplicates", name: "widget membership reconciles by identity without duplicates",
      run: () => {
        const { widgets, reconciler } = harness({
          widgetRetention: (id) => id === "point" ? "retain" : "recreate",
        });
        reconciler.reconcileWidgets(["point", "bling"]);
        reconciler.reconcileWidgets(["point", "bling"]);
        expect_count(widgets.point.mounts, 1, "Pointer mounts");
        expect_count(widgets.bling.mounts, 1, "Bling mounts");

        reconciler.reconcileWidgets([]);
        expect_count(widgets.point.deactivates, 1, "Pointer deactivations");
        expect_count(widgets.bling.disposes, 1, "Bling disposes");

        reconciler.reconcileWidgets(["point", "oklch"]);
        expect_count(widgets.point.mounts, 1, "Pointer remounts");
        expect_count(widgets.point.activates, 1, "Pointer reactivations");
        expect_count(widgets.oklch.mounts, 1, "OKLCH mounts");
      },
    },
    {
      suite: SUITE,
      caseId: "same-value-restore-style-reconciliation-converges-without-duplicate-instances", name: "same-value restore-style reconciliation converges without duplicate instances",
      run: () => {
        const { main, widgets, reconciler } = harness();
        reconciler.reconcileMain("towl");
        reconciler.reconcileWidgets(["bling"]);
        reconciler.reconcileMain("towl");
        reconciler.reconcileWidgets(["bling"]);
        expect_count(main.towl.mounts, 1, "TOWL mounts");
        expect_count(widgets.bling.mounts, 1, "Bling mounts");
      },
    },
  ];

  return { suite: SUITE, cases };
}
