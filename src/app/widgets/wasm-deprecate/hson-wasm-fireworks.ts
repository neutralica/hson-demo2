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


type FireworkConfig = {
  // launch shape
  count: number;
  originX: number;
  originY: number;
  angleRad: number;
  speed: number;

  // look
  hueBase: number;
  hueDrift: number;
  trailFade: number;
  lineWBase: number;
  glowBase: number;

  // envelope
  lifeFrames: number;
  peakMode: "early" | "mid" | "late";
};

type LiveFirework = {
  // per-particle state (JS-side offsets + velocity)
  count: number;
  offX: Float32Array;
  offY: Float32Array;
  vx: Float32Array;
  vy: Float32Array;

  // render helpers
  prevX: Float32Array;
  prevY: Float32Array;
  phase: Float32Array;

  // config
  cfg: FireworkConfig;
  t: number;
};

export async function mount_firework(stage: LiveTree): Promise<() => void> {
  const fw = await load_fireworks_wasm();

  // Create one canvas and keep it. Everything draws here.
  const canvasLt = stage.create.canvas()
    .id.set("wasm-fireworks")
    .css.setMany({
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "1",
    });

  const canvas = canvasLt.dom.el() as HTMLCanvasElement;

  const ctx0 = canvas.getContext("2d");
  if (!ctx0) {
    canvasLt.removeSelf();
    return () => void 0;
  }
  const ctx: CanvasRenderingContext2D = ctx0;

  const EXTRA_FALL_PX = 520;
  const W = window.innerWidth;
  const H = window.innerHeight + EXTRA_FALL_PX;
  canvas.width = W;
  canvas.height = H;

  // --- WASM ---
  const COUNT_MAX = 700;
  fw.init(COUNT_MAX);
  const view = new DataView(fw.memory.buffer);

  // Active fireworks list
  const live: LiveFirework[] = [];

  // ---------------------------------------
  // helpers: random + envelope + color
  // ---------------------------------------
  const rand = (a: number, b: number): number => a + Math.random() * (b - a);
  const randInt = (a: number, b: number): number => Math.floor(rand(a, b + 1));
  const pick = <T>(xs: readonly T[]): T => xs[randInt(0, xs.length - 1)]!;

  function envelope(u: number, mode: FireworkConfig["peakMode"]): number {
    // u is 0..1
    // These are simple “music synth-ish” shapes: quick attack, variable peak, soft release
    const attack = 0.10;
    const release = 0.35;

    let peakAt = 0.25;
    if (mode === "mid") peakAt = 0.55;
    if (mode === "late") peakAt = 0.80;

    if (u < attack) return u / attack;

    // rise/hold to peak
    if (u < peakAt) {
      const k = (u - attack) / Math.max(1e-6, (peakAt - attack));
      return 0.75 + 0.25 * k;
    }

    // release tail
    if (u > (1 - release)) {
      const k = (1 - u) / release;
      return Math.max(0, k);
    }

    return 1;
  }

  function spawn_firework(cfg: FireworkConfig): void {
    // One firework: WASM drives a base “pattern”, JS adds ballistic arc + sparkle
    // count is clamped to COUNT_MAX (WASM buffer)
    const n = Math.min(cfg.count, COUNT_MAX);

    const offX = new Float32Array(n);
    const offY = new Float32Array(n);
    const vx = new Float32Array(n);
    const vy = new Float32Array(n);

    const prevX = new Float32Array(n);
    const prevY = new Float32Array(n);
    const phase = new Float32Array(n);

    for (let i = 0; i < n; i += 1) {
      prevX[i] = Number.NaN;
      prevY[i] = Number.NaN;

      // Phase for per-particle sparkle LFO
      phase[i] = Math.random() * 1000;

      // Launch impulse: angle + speed with slight per-particle variance
      const a = cfg.angleRad + rand(-0.22, 0.22);
      const s = cfg.speed * rand(0.70, 1.15);

      vx[i] = Math.cos(a) * s;
      vy[i] = Math.sin(a) * s; // negative means “up” if angle aims upward
    }

    live.push({
      count: n,
      offX,
      offY,
      vx,
      vy,
      prevX,
      prevY,
      phase,
      cfg,
      t: 0,
    });
  }

  // ---------------------------------------
  // rendering loop
  // ---------------------------------------
  const G = 0.11;        // gravity (px/frame^2)
  const DRAG = 0.992;    // air resistance
  const TERMINAL = 8.0;  // terminal velocity cap

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0, 0, W, H);

  let rafId: number | null = null;
  let wasmT = 0;

  function render_frame(): void {
    // global trails (keeps things coherent when many fireworks overlap)
    // (per-firework trailFade could be added, but global is usually enough + faster)
    if (live.length === 0) {
      rafId = requestAnimationFrame(render_frame);
      return;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";


    fw.tick(wasmT++);

    // draw and step each firework
    for (let f = live.length - 1; f >= 0; f -= 1) {
      const fwk = live[f]!;
      const cfg = fwk.cfg;

      const life = cfg.lifeFrames;
      const u = Math.min(1, fwk.t / Math.max(1, life));
      const env = envelope(u, cfg.peakMode);

      // sparkle LFO affects width/glow and slight hue wobble
      const lineW = cfg.lineWBase * (0.7 + 0.8 * env);
      const glow = cfg.glowBase * (0.4 + 1.2 * env);

      ctx.lineWidth = lineW;

      // a little color evolution (hot -> cooler) across life
      const hueLife = cfg.hueBase + (u * cfg.hueDrift);

      for (let i = 0; i < fwk.count; i += 1) {
        // typed-array index reads under noUncheckedIndexedAccess: use ?? 0
        const ph = fwk.phase[i] ?? 0;
        const px = fwk.prevX[i];
        const py = fwk.prevY[i];

        // integrate motion (THIS is the “rise then fall” fix)
        let vxi = fwk.vx[i] ?? 0;
        let vyi = fwk.vy[i] ?? 0;

        vyi = Math.min(TERMINAL, vyi + G);
        vxi *= DRAG;
        vyi *= DRAG;

        fwk.vx[i] = vxi;
        fwk.vy[i] = vyi;

        const ox = (fwk.offX[i] ?? 0) + vxi;
        const oy = (fwk.offY[i] ?? 0) + vyi;

        fwk.offX[i] = ox;
        fwk.offY[i] = oy;

        // WASM base coords (pattern). If you want origin control, add it in WAT later.
        // Layout: n at 0, then pairs at 4 + i*8 (x), 8 + i*8 (y)
        const wx = view.getInt32(4 + i * 8, true);
        const wy = view.getInt32(8 + i * 8, true);

        // origin + ballistic offsets
        const x = wx + ox;
        const y = wy + oy;

        // cull when out of bounds
        if (y < -120 || y > H + 160 || x < -160 || x > W + 160) continue;

        // sparkle flicker: small fast LFO; occasional “twinkle spike”
        const flick = 0.65 + 0.35 * Math.sin((fwk.t + ph) * 0.22);
        const twinkle = (Math.random() < 0.015) ? 1.35 : 1.0;

        const a = 0.55 * env * flick * twinkle;

        // glow
        ctx.shadowBlur = glow * (0.6 + 0.8 * flick);
        const hueNow = hueLife + cfg.hueDrift * 0.15 * Math.sin((fwk.t + ph) * 0.07);
        ctx.shadowColor = `hsla(${hueNow}, 100%, 70%, ${0.55 * a})`;

        ctx.strokeStyle = `hsla(${hueNow}, 100%, 65%, ${a})`;

        if (Number.isFinite(px) && Number.isFinite(py)) {
          ctx.beginPath();
          ctx.moveTo(px as number, py as number);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.fillStyle = `hsla(${hueNow}, 100%, 65%, ${a})`;
          ctx.fillRect(x, y, 2, 2);
        }

        fwk.prevX[i] = x;
        fwk.prevY[i] = y;
      }

      fwk.t += 1;
      if (fwk.t > life) {
        live.splice(f, 1);
      }
    }

    rafId = requestAnimationFrame(render_frame);
  }

  rafId = requestAnimationFrame(render_frame);

  // ---------------------------------------
  // SECRET keyboard controller
  // ---------------------------------------
  const ROWS = {
    top: "qwertyuiop",
    mid: "asdfghjkl",
    low: "zxcvbnm",
  } as const;

  function key_row(k: string): "top" | "mid" | "low" | null {
    if (ROWS.top.includes(k)) return "top";
    if (ROWS.mid.includes(k)) return "mid";
    if (ROWS.low.includes(k)) return "low";
    return null;
  }

  function key_index(k: string, row: "top" | "mid" | "low"): number {
    const s = ROWS[row];
    return s.indexOf(k);
  }

  function make_config_from_key(k: string, holdMs: number, layer: 0 | 1 | 2): FireworkConfig | null {
    const row = key_row(k);
    if (!row) return null;

    // altitude tiers (invert if you prefer)
    const speedBase =
      row === "top" ? 4.8 :
        row === "mid" ? 4.1 :
          3.6;

    // angle by key position: left = more leftward, right = more rightward
    const idx = key_index(k, row);
    const span = Math.max(1, ROWS[row].length - 1);
    const p = (idx / span) * 2 - 1; // -1..+1

    // aim mostly upward with side bias
    const angle = (-Math.PI / 2) + (p * 0.55) + rand(-0.06, 0.06);

    // particle scaling by hold (cap at 2000)
    const baseCount = 520 + randInt(-80, 120);
    const steps = Math.min(10, Math.floor(Math.min(2000, holdMs) / 200)); // up to ~10 steps (2s)
    const add = steps * randInt(30, 55);
    const count = Math.min(2000, baseCount + add + layer * randInt(60, 140));

    // origin: center-ish with a little spread; you can tie x to p if you want
    const originX = Math.floor(W * 0.50 + rand(-W * 0.06, W * 0.06));
    const originY = Math.floor(H * 0.55 + rand(-H * 0.08, H * 0.06));

    // per-firework envelope randomization
    const peakMode = pick(["early", "mid", "late"] as const);

    // color personality
    const hueBase = rand(0, 360);
    const hueDrift = rand(-45, 65) * (layer === 0 ? 1 : 0.7);

    return {
      count,
      originX,
      originY,
      angleRad: angle,
      speed: speedBase * rand(0.92, 1.18),

      hueBase,
      hueDrift,
      trailFade: rand(0.08, 0.14),
      lineWBase: rand(0.9, 1.8),
      glowBase: rand(6, 18),

      lifeFrames: randInt(120, 210),
      peakMode,
    };
  }

  let downKey: string | null = null;
  let downAt = 0;
  let layerTimer1: number | null = null;
  let layerTimer2: number | null = null;

  function clear_layer_timers(): void {
    if (layerTimer1 !== null) window.clearTimeout(layerTimer1);
    if (layerTimer2 !== null) window.clearTimeout(layerTimer2);
    layerTimer1 = null;
    layerTimer2 = null;
  }

  const onKeyDown = (ev: KeyboardEvent): void => {
    // ignore repeats; only start a “charge” on first press
    if (ev.repeat) return;

    const k = ev.key.toLowerCase();
    if (!key_row(k)) return;

    // only one active charge at a time (simple + reliable)
    if (downKey !== null) return;

    downKey = k;
    downAt = performance.now();

    // at 1s: “second config” arms (fires together on release)
    layerTimer1 = window.setTimeout(() => {
      // marker only; release will spawn the layer
    }, 1000);

    // at 2s: “third config” arms
    layerTimer2 = window.setTimeout(() => {
      // marker only
    }, 2000);
  };

  const onKeyUp = (ev: KeyboardEvent): void => {
    const k = ev.key.toLowerCase();
    if (downKey === null || k !== downKey) return;

    const held = Math.min(2000, performance.now() - downAt);

    // base layer
    const cfg0 = make_config_from_key(k, held, 0);
    if (cfg0) spawn_firework(cfg0);

    // if held >= 1s, add a second “personality” layer
    if (held >= 1000) {
      const cfg1 = make_config_from_key(k, held, 1);
      if (cfg1) spawn_firework(cfg1);
    }

    // if held >= 2s, add a third layer
    if (held >= 2000) {
      const cfg2 = make_config_from_key(k, held, 2);
      if (cfg2) spawn_firework(cfg2);
    }

    downKey = null;
    downAt = 0;
    clear_layer_timers();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // return a teardown so your phase system can cleanly remove this “easter egg”
  const teardown = (): void => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    clear_layer_timers();

    if (rafId !== null) cancelAnimationFrame(rafId);
    canvasLt.removeSelf();
  };

  return teardown;
}