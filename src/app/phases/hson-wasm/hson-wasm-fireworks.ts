// -------------------------
// Fireworks tuning knobs
// -------------------------

import type { LiveTree } from "hson-live";
const FIREWORKS = {
  wasmPath: "/hson-fireworks.wasm",
  durationMs: 10_000,
  width: 900,     // you can also bind to window.innerWidth
  height: 520,
  fpsCap: 60,     // optional
} as const;

type FireworksWasm = {
  memory: WebAssembly.Memory;
  init: (n: number) => void;
  tick: (t: number) => void;
};

let _wasmCache: FireworksWasm | undefined;

async function load_fireworks_wasm(): Promise<FireworksWasm> {
  if (_wasmCache) return _wasmCache;

  const res = await fetch(FIREWORKS.wasmPath);
  const buf = await res.arrayBuffer();
  const wasm = await WebAssembly.instantiate(buf, {});
  const exp = wasm.instance.exports as Partial<FireworksWasm>;

  if (!exp.memory || !exp.init || !exp.tick) {
    throw new Error("fireworks wasm missing exports: memory/init/tick");
  }
  _wasmCache = exp as FireworksWasm;
  return _wasmCache;
}
export async function run_fireworks(stage: LiveTree): Promise<void> {
  const fw = await load_fireworks_wasm();

  // --- create one canvas (LiveTree for structure; raw DOM for speed) ---
  const canvasLt = stage.create.canvas()
    .id.set("wasm-fireworks")
    .css.setMany({
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "1",
    });

  const canvas = canvasLt.asDomElement() as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // --- size ---
  const EXTRA_FALL_PX = 260;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight + EXTRA_FALL_PX;

  // --- wasm sim ---
  const COUNT = 1200;
  fw.init(COUNT);
  const view = new DataView(fw.memory.buffer);

  // --- per-particle render state (for streaks + stable color) ---
  const prevX = new Float32Array(COUNT);
  const prevY = new Float32Array(COUNT);
  const hue = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i += 1) {
    prevX[i] = Number.NaN;
    prevY[i] = Number.NaN;
    hue[i] = Math.random() * 360;
  }

  // --- tuning ---
  const TRAIL_FADE = 0.16; // higher = shorter trails
  const LINE_W = 1.35;
  const DOT_W = 2;
  const DOT_H = 2;

  // use your existing FIREWORKS.durationMs (or hardcode)
  const start = performance.now();
  let t = 0;

  // clear once
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function frame(now: number) {
    if ((now - start) > FIREWORKS.durationMs) {
      canvasLt.removeSelf();
      return;
    }
if (!ctx) return;
    fw.tick(t++);
    const nRaw = view.getInt32(0, true);
    const n = Math.min(Math.max(0, nRaw), COUNT);

    // 1) fade previous frame (trail persistence)
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2) draw streaks additively (glowy, hides quantization)
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = LINE_W;
    ctx.lineCap = "round";

    // Optional global fade near the end of the whole show:
    // (comment out if you don’t want it)
    const fadeStart = FIREWORKS.durationMs * 0.65;
    const fadeK =
      (now - start) <= fadeStart
        ? 1
        : Math.max(0, (FIREWORKS.durationMs - (now - start)) / (FIREWORKS.durationMs - fadeStart));

    for (let i = 0; i < n; i += 1) {
      const x = view.getInt32(4 + i * 8, true);
      const y = view.getInt32(8 + i * 8, true);

      // let them disappear below / outside
      if (y < -60 || y > canvas.height + 60 || x < -60 || x > canvas.width + 60) continue;

      const px = prevX[i];
      const py = prevY[i];

      const h = hue[i];
      ctx.strokeStyle = `hsla(${h}, 95%, 70%, ${0.55 * fadeK})`;

      if (Number.isFinite(px) && Number.isFinite(py)) {
        ctx.beginPath();
        ctx.moveTo(px as number, py as number);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = `hsla(${h}, 95%, 70%, ${0.75 * fadeK})`;
        ctx.fillRect(x, y, DOT_W, DOT_H);
      }

      prevX[i] = x;
      prevY[i] = y;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}