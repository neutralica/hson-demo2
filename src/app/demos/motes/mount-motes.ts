import { type LiveTree } from "hson-live";
import { motes_init } from "./motes-init";
import type { MotesOpts, MotesRig } from "./make-mote";
import { OKLCH_FLEURS } from "../fleurs/fleurs.consts";
import { OKLCH_VIBRANT } from "../../core/consts/oklch.consts";
import { MOTES_HOSTcss, MOTES_ROOTcss } from "./motes.css";


export function mount_motes(host: LiveTree, optsIn: Partial<MotesOpts> = {}): MotesRig {
  const opts = normalize_motes_opts(optsIn);
  const rig = mote_factory(host, opts);
  motes_init(rig, opts);
  return rig;
}

// ---------------------------
function mote_factory(host: LiveTree, opts: MotesOpts): MotesRig {
  // stable root id so remount doesn’t duplicate
  const old = host.find.byId("motes-root");
  if (old) old.removeSelf();

  const root = host.create.div()
    .id.set("motes-root")
    .classlist.add("motes-root")
    .css.setMany(MOTES_ROOTcss);

  const layer = root.create.div()
    .id.set("motes-host")
    .classlist.add("bling")
    .css.setMany(MOTES_HOSTcss);

  const dispose = (): void => void 0; // init patches this

  return { root, layer, dispose };
}

// ---------------------------


export function normalize_motes_opts(inOpts: Partial<MotesOpts>): MotesOpts {
  return {
    char: inOpts.char ?? "*",

    colors: inOpts.colors ?? [OKLCH_VIBRANT.orangeTangerine],
    sizePx: inOpts.sizePx ?? [10, 38],
    opacity: inOpts.opacity ?? [0.2, 0.5],
    blurPx: [1.3, 2.6],

    densityPerKpx2: inOpts.densityPerKpx2 ?? 74,
    maxMotes: inOpts.maxMotes ?? 420,
    spawnBatch: inOpts.spawnBatch ?? 12,

    riseDurMs: inOpts.riseDurMs ?? [15000, 21000],
    swayDurMs: inOpts.swayDurMs ?? [3600, 10200],
    spinDurMs: inOpts.spinDurMs ?? [0, 0],
    swayAmpPx: inOpts.swayAmpPx ?? [10, 30],
    spinTurns: inOpts.spinTurns ?? [-0.35, 0.35],

    spawnPadVw: inOpts.spawnPadVw ?? 18,
    pointerEvents: "none",
  };
}
