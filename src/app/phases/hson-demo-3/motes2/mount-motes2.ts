// motes2/mount-motes2.ts

import type { LiveTree } from "hson-live";
import { type Outcome, relay, relay_data, relay_void } from "intrastructure";
import { _freeze } from "../../../../tests/fixtures/generate-fixtures";
import { config_mote2, motes_init2 } from "./motes-init";
import type { Mote, MotesOpts, MoteStyle } from "./motes2.types";
import type { MotesRig } from "./motes2.types";

export function mount_motes2(host: LiveTree, optsIn: Partial<MotesOpts> = {}): Outcome<MotesRig> {
  try {
    const opts = relay_data(normalize_motes_opts2(optsIn));

    const rig = relay_data(motes2_factory(host, opts));
    relay_void(motes_init2(rig, opts));

    return relay.data(rig);
  } catch (err) {
    return relay.err(err instanceof Error ? err.message : "unknown error");
  }
}

// ---------------------------
function motes2_factory(host: LiveTree, opts: MotesOpts): Outcome<MotesRig> {
  // CHANGED: stable root id so remount doesn’t duplicate
  const old = host.find.byId("motes2-root");
  if (old) old.removeSelf();

  const root = host.create.div()
    .id.set("motes2-root")
    .classlist.add("motes2-root")
    .css.setMany({
      position: "fixed",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      zIndex: "0", // wallpaper/screen-fx layer
      pointerEvents: opts.pointerEvents === "none" ? "none" : "auto",
    });

  const layer = root.create.div()
    .id.set("motes2-layer")
    .classlist.add("motes2-layer")
    .css.setMany({
      position: "absolute",
      inset: "0",
      overflow: "hidden",
      pointerEvents: "inherit",
    });

  const dispose = (): void => void 0; // init patches this

  return relay.data({ root, layer, dispose });
}

// ---------------------------


export function normalize_motes_opts2(inOpts: Partial<MotesOpts>): Outcome<MotesOpts> {
  return relay.data({
    char: inOpts.char ?? "*",

    colors: inOpts.colors ?? ["rgba(120, 255, 160, 0.85)"],
    sizePx: inOpts.sizePx ?? [10, 18],
    opacity: inOpts.opacity ?? [0.25, 0.90],
    blurPx: inOpts.blurPx ?? [0.3, 1.6],

    densityPerKpx2: inOpts.densityPerKpx2 ?? 38,
    maxMotes: inOpts.maxMotes ?? 820,
    spawnBatch: inOpts.spawnBatch ?? 12,

    riseDurMs: inOpts.riseDurMs ?? [9000, 17000],
    swayDurMs: inOpts.swayDurMs ?? [5600, 15200],
    spinDurMs: inOpts.spinDurMs ?? [6000, 14000],
    swayAmpPx: inOpts.swayAmpPx ?? [10, 60],
    spinTurns: inOpts.spinTurns ?? [-0.35, 0.35],

    repelRadiusPx: inOpts.repelRadiusPx ?? 90,
    repelStrengthPx: inOpts.repelStrengthPx ?? 28,
    killRadiusPx: inOpts.killRadiusPx ?? 10,
    repelOnlyBelowMouse: inOpts.repelOnlyBelowMouse ?? true,
    killOnHit: inOpts.killOnHit ?? true,
    pointerEvents: inOpts.pointerEvents ?? "none",
  });
}