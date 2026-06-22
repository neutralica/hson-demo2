import { type LiveTree } from "hson-live";
import { relay, relay_data, relay_void, type Outcome } from "intrastructure";
import { motes_init } from "./motes-init";
import type { MotesOpts, MotesRig } from "./make-mote";
import { OKLCH_FLEURS } from "../fleurs/fleurs.consts";
import { OKLCH_VIBRANT } from "../../core/consts/oklch.consts";


export function mount_motes(host: LiveTree, optsIn: Partial<MotesOpts> = {}): Outcome<MotesRig> {
  try {
    const opts = relay_data(normalize_motes_opts(optsIn));
    const rig = relay_data(mote_factory(host, opts));
    relay_void(motes_init(rig, opts));

    return relay.data(rig);
  } catch (err) {
    return relay.err(err instanceof Error ? err.message : "unknown error");
  }
}

// ---------------------------
function mote_factory(host: LiveTree, opts: MotesOpts): Outcome<MotesRig> {
  // stable root id so remount doesn’t duplicate
  const old = host.find.byId("motes-root");
  if (old) old.removeSelf();

  const root = host.create.div()
    .id.set("motes-root")
    .classlist.add("motes-root")
    .css.setMany({
      position: "fixed",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      zIndex: "0", 
      pointerEvents: opts.pointerEvents === "none" ? "none" : "auto",

    });

  const layer = root.create.div()
    .id.set("motes-layer")
    .classlist.add("motes-layer")
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


export function normalize_motes_opts(inOpts: Partial<MotesOpts>): Outcome<MotesOpts> {
  return relay.data({
    char: inOpts.char ?? "*",

    colors: inOpts.colors ?? [OKLCH_VIBRANT.yellowVolt],
    sizePx: inOpts.sizePx ?? [10, 18],
    opacity: inOpts.opacity ?? [0.6, 0.9],
    // blurPx: inOpts.blurPx ?? [0.3, 1.6],

    densityPerKpx2: inOpts.densityPerKpx2 ?? 24,
    maxMotes: inOpts.maxMotes ?? 420,
    spawnBatch: inOpts.spawnBatch ?? 12,

    riseDurMs: inOpts.riseDurMs ?? [15000, 21000],
    swayDurMs: inOpts.swayDurMs ?? [3600, 10200],
    spinDurMs: inOpts.spinDurMs ?? [0, 0],
    swayAmpPx: inOpts.swayAmpPx ?? [10, 30],
    spinTurns: inOpts.spinTurns ?? [-0.35, 0.35],

    spawnPadVw: inOpts.spawnPadVw ?? 18,
    pointerEvents: "none",
  });
}