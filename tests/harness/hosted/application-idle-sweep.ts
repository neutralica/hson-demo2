import type { LocusActivity, LocusDisposer } from "hson-live/types";

type ApplicationIdleEntry = {
  readonly activity: LocusActivity;
  acquisitions: number;
  idleSince: number | undefined;
  stopActivity: LocusDisposer;
};

type ApplicationIdleSweepOptions = Readonly<{
  idleMs: number;
  sweepIntervalMs?: number;
  now?: () => number;
  schedule?: (delayMs: number, callback: () => void) => LocusDisposer;
  evict(key: string): Promise<Readonly<{ status: string }>>;
}>;

export type ApplicationIdleSweep = Readonly<{
  track(key: string, activity: LocusActivity): void;
  beginAcquisition(key: string): void;
  endAcquisition(key: string): void;
  remove(key: string): void;
  sweep(): Promise<number>;
  dispose(): void;
}>;

/** Application-private idle-age gate for explicit Hosted Test/TOWL sweep controls. */
export function create_application_idle_sweep(
  options: ApplicationIdleSweepOptions,
): ApplicationIdleSweep {
  const now = options.now ?? (() => performance.now());
  const entries = new Map<string, ApplicationIdleEntry>();
  let disposed = false;
  let stopScheduledSweep: LocusDisposer | undefined;
  let runningSweep: Promise<number> | undefined;

  function reconcile(entry: ApplicationIdleEntry): void {
    const active = entry.acquisitions > 0 || entry.activity.snapshot().state === "active";
    if (active) {
      entry.idleSince = undefined;
    } else if (entry.idleSince === undefined) {
      entry.idleSince = now();
    }
  }

  async function run_sweep(): Promise<number> {
    if (disposed) return 0;
    const sweepNow = now();
    let evicted = 0;
    for (const [key, entry] of [...entries]) {
      if (entries.get(key) !== entry) continue;
      reconcile(entry);
      if (
        entry.acquisitions > 0
        || entry.activity.snapshot().state === "active"
        || entry.idleSince === undefined
        || sweepNow - entry.idleSince < options.idleMs
      ) continue;
      if ((await options.evict(key)).status === "evicted") evicted += 1;
    }
    return evicted;
  }

  function sweep(): Promise<number> {
    if (runningSweep !== undefined) return runningSweep;
    const operation = run_sweep().finally(() => {
      if (runningSweep === operation) runningSweep = undefined;
    });
    runningSweep = operation;
    return operation;
  }

  function schedule_next(): void {
    if (
      disposed
      || options.schedule === undefined
      || options.sweepIntervalMs === undefined
      || stopScheduledSweep !== undefined
    ) return;
    stopScheduledSweep = options.schedule(options.sweepIntervalMs, () => {
      stopScheduledSweep = undefined;
      void sweep().then(schedule_next, schedule_next);
    });
  }

  schedule_next();

  return Object.freeze({
    track(key, activity) {
      if (disposed) return;
      const previous = entries.get(key);
      previous?.stopActivity();
      const entry: ApplicationIdleEntry = {
        activity,
        acquisitions: 0,
        idleSince: now(),
        stopActivity: () => {},
      };
      entry.stopActivity = activity.on_change(() => reconcile(entry));
      reconcile(entry);
      entries.set(key, entry);
    },
    beginAcquisition(key) {
      const entry = entries.get(key);
      if (entry === undefined) return;
      entry.acquisitions += 1;
      reconcile(entry);
    },
    endAcquisition(key) {
      const entry = entries.get(key);
      if (entry === undefined) return;
      entry.acquisitions = Math.max(0, entry.acquisitions - 1);
      reconcile(entry);
    },
    remove(key) {
      const entry = entries.get(key);
      if (entry === undefined) return;
      entry.stopActivity();
      entries.delete(key);
    },
    sweep,
    dispose() {
      if (disposed) return;
      disposed = true;
      stopScheduledSweep?.();
      stopScheduledSweep = undefined;
      for (const entry of entries.values()) entry.stopActivity();
      entries.clear();
    },
  });
}
