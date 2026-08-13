export type SurfaceController = Readonly<{
  dispose(): void;
  activate?(): void;
  deactivate?(): void;
}>;

export type SurfaceRetention = "recreate" | "retain";

export type SurfaceRegistration = Readonly<{
  retention: SurfaceRetention;
  mount(): SurfaceController;
}>;

type SurfaceInstance<TId extends string> = {
  id: TId;
  active: boolean;
  controller: SurfaceController;
};

export type ShellLifecycleReconciler<TMainId extends string, TWidgetId extends string> = Readonly<{
  reconcileMain(next: TMainId | null): void;
  reconcileWidgets(next: readonly TWidgetId[]): void;
  dispose(): void;
}>;

export function create_shell_lifecycle_reconciler<
  TMainId extends string,
  TWidgetId extends string,
>(options: Readonly<{
  mainIds: readonly TMainId[];
  widgetIds: readonly TWidgetId[];
  main: Readonly<Record<TMainId, SurfaceRegistration>>;
  widgets: Readonly<Record<TWidgetId, SurfaceRegistration>>;
}>): ShellLifecycleReconciler<TMainId, TWidgetId> {
  const mainInstances = new Map<TMainId, SurfaceInstance<TMainId>>();
  const widgetInstances = new Map<TWidgetId, SurfaceInstance<TWidgetId>>();
  let activeMain: TMainId | null = null;
  let disposed = false;

  const deactivate = <TId extends string>(
    id: TId,
    instances: Map<TId, SurfaceInstance<TId>>,
    registration: SurfaceRegistration,
  ): void => {
    const instance = instances.get(id);
    if (instance === undefined || !instance.active) return;

    if (registration.retention === "retain") {
      instance.controller.deactivate?.();
      instance.active = false;
      return;
    }

    instance.controller.dispose();
    instances.delete(id);
  };

  const activate = <TId extends string>(
    id: TId,
    instances: Map<TId, SurfaceInstance<TId>>,
    registration: SurfaceRegistration,
  ): void => {
    const retained = instances.get(id);
    if (retained !== undefined) {
      if (retained.active) return;
      retained.controller.activate?.();
      retained.active = true;
      return;
    }

    const controller = registration.mount();
    instances.set(id, { id, active: true, controller });
  };

  const reconcileMain = (next: TMainId | null): void => {
    if (disposed || next === activeMain) return;

    if (activeMain !== null) {
      deactivate(activeMain, mainInstances, options.main[activeMain]);
      activeMain = null;
    }

    if (next === null) return;
    activate(next, mainInstances, options.main[next]);
    activeMain = next;
  };

  const reconcileWidgets = (next: readonly TWidgetId[]): void => {
    if (disposed) return;
    const desired = new Set(next);

    for (const id of options.widgetIds) {
      const registration = options.widgets[id];
      if (desired.has(id)) activate(id, widgetInstances, registration);
      else deactivate(id, widgetInstances, registration);
    }
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;

    for (const id of options.mainIds) {
      const instance = mainInstances.get(id);
      if (instance !== undefined) instance.controller.dispose();
    }
    for (const id of options.widgetIds) {
      const instance = widgetInstances.get(id);
      if (instance !== undefined) instance.controller.dispose();
    }

    mainInstances.clear();
    widgetInstances.clear();
    activeMain = null;
  };

  return Object.freeze({ reconcileMain, reconcileWidgets, dispose });
}
