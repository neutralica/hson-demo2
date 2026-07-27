// -------------------------
// Fireworks tuning knobs
// -------------------------

import type { LiveTree } from "hson-live/livetree";

type FireworksWasm = {
  memory: WebAssembly.Memory;
  init: (n: number) => void;
  tick: (t: number) => void;
};
export type FireworkLevel = 0 | 1 | 2;

export type FireworkController = Readonly<{
  fire: (level?: FireworkLevel) => void;
  teardown: () => void;
}>;


const FIREWORKS = {
  wasmPath: "/hson-fireworks.wasm",
  durationMs: 10_000,
  width: 900,     // you can also bind to window.innerWidth
  height: 520,
  fpsCap: 60,     // optional
} as const;
const MAX_LIVE_FIREWORKS = 100;
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
  // CHANGED: normal fireworks use full-size rendering; compact variants may override this.
  shapeScale: number;
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
  // per-particle state (frozen WASM burst shape + JS-side offsets/velocity)
  count: number;
  baseX: Float32Array;
  baseY: Float32Array;
  offX: Float32Array;
  offY: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  // render helpers
  prevX: Float32Array;
  prevY: Float32Array;
  phase: Float32Array;
  white: Uint8Array;

  // config
  cfg: FireworkConfig;
  t: number;
};

type DetonationPop = {
  x: number;
  y: number;
  hue: number;
  t: number;
  life: number;
  radius: number;
};


type SmokeCloud = {
  x: number;
  y: number;
  t: number;
  life: number;
  radius: number;
};

type ScreenFlash = {
  t: number;
  dropFrames: number;
  holdFrames: number;
  fadeFrames: number;
  peakAlpha: number;
  tailAlpha: number;
};

export async function mount_firework(stage: LiveTree): Promise<FireworkController> {
  const fw = await load_fireworks_wasm();

  // Create one canvas and keep it. Everything draws here.
  const canvasLt = stage.create.canvas()
    .id.set("wasm-fireworks")
    .css.setMany({
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2",
    });

  // BUG TODO ixnay on the om.elday()
  const canvas = canvasLt.dom.el() as HTMLCanvasElement;
  const ctx0 = canvasLt.canvas.ctx2d();

  if (!ctx0) {
    canvasLt.remove();
    return Object.freeze({
      fire: () => void 0,
      teardown: () => void 0,
    });
  }
  const ctx: CanvasRenderingContext2D = ctx0;

  // CHANGED: keep the screen flash out of the persistent particle-trail canvas.
  // Painting white into that canvas caused faint frames to accumulate over time.
  const flashLt = stage.create.div()
    .id.set("wasm-fireworks-flash")
    .css.setMany({
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "1",
      background: "rgb(255 255 245)",
      opacity: "0",
    });
  const flashEl = flashLt.dom.el() as HTMLDivElement;
  const EXTRA_FALL_PX = 520;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const CULL_H = H + EXTRA_FALL_PX;
  const SKY_LIFT_PX = Math.min(260, Math.round(H * 0.24));
  // ixnay i say
  canvas.width = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";

  // --- WASM ---
  const COUNT_MAX = 200;
  fw.init(COUNT_MAX);
  const view = new DataView(fw.memory.buffer);

  // Active fireworks list
  const live: LiveFirework[] = [];
  const pops: DetonationPop[] = [];
  const smokes: SmokeCloud[] = [];
  const flashes: ScreenFlash[] = [];

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
    const white = new Uint8Array(n);
    // Freeze the WASM burst pattern at spawn time. After this, JS velocity/gravity
    // controls the trajectory instead of re-reading the animated WASM pattern.
    fw.tick(0);
    // CHANGED: WASM emits coordinates in its fixed 900 × 520 field.
    // Using viewport dimensions here shifts the whole burst right on narrow screens.
    const patternCenterX = FIREWORKS.width * 0.5;
    const patternCenterY = FIREWORKS.height * 0.5;
    const baseX = new Float32Array(n);
    const baseY = new Float32Array(n);
    let baseSumX = 0;
    let baseSumY = 0;

    for (let i = 0; i < n; i += 1) {
      const bx = view.getInt32(4 + i * 8, true) - patternCenterX;
      const by = view.getInt32(8 + i * 8, true) - patternCenterY;
      baseX[i] = bx;
      baseY[i] = by;
      baseSumX += bx;
      baseSumY += by;
    }

    const baseCenterX = n > 0 ? baseSumX / n : 0;
    const baseCenterY = n > 0 ? baseSumY / n : 0;

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
      white[i] = Math.random() < 0.52 ? 1 : 0;
      // Launch impulse: angle + speed with slight per-particle variance
      const radialA = rand(-Math.PI, Math.PI);
      const sharedBias = cfg.angleRad * 0.12;
      const a = radialA + sharedBias + rand(-0.32, 0.32);
      const s = cfg.speed * rand(0.70, 1.15);

      vx[i] = Math.cos(a) * s;
      vy[i] = Math.sin(a) * s; // negative means “up” if angle aims upward
    }
    while (live.length >= MAX_LIVE_FIREWORKS) live.shift();
    live.push({
      count: n,
      baseX,
      baseY,
      offX,
      offY,
      vx,
      vy,
      prevX,
      prevY,
      phase,
      white,
      cfg,
      t: 0,
    });
    const detX = cfg.originX + baseCenterX;
    const detY = cfg.originY + baseCenterY - SKY_LIFT_PX;

    pops.push({
      x: detX,
      y: detY,
      hue: cfg.hueBase,
      t: 0,
      life: 6,
      // CHANGED: compact pattern bursts keep compact detonation halos.
      radius: 50 * Math.max(0.2, cfg.shapeScale),
    });
    smokes.push({
      x: detX,
      y: detY,
      t: 0,
      // CHANGED: compact pattern bursts do not leave full-size, long-lived smoke.
      life: Math.max(90, Math.round(1360 * cfg.shapeScale)),
      radius: 55 * Math.max(0.2, cfg.shapeScale),
    });
    // CHANGED: immediate pop, then a short low glow with quick dissipation.
    if (cfg.shapeScale >= 0.25) {
      flashes.push({
        t: 0,
        // CHANGED: immediate pop, then a short low glow with quick dissipation.
        dropFrames: 1,
        holdFrames: 4,
        fadeFrames: 24,
        // CHANGED: stronger detonation peak; reflected tail remains unchanged.
        peakAlpha: 0.065,
        tailAlpha: 0.006,
      });
    }
    ensure_loop();
  }

  // ---------------------------------------
  // rendering loop
  // ---------------------------------------
  const G = 0.11;        // gravity (px/frame^2)
  const DRAG = 0.992;    // air resistance
  const TERMINAL = 8.0;  // terminal velocity cap

  ctx.clearRect(0, 0, W, H);

  ctx.globalCompositeOperation = "lighter";
  let rafId: number | null = null;

  function ensure_loop(): void {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(render_frame);
  }

  function render_frame(): void {
    rafId = null;
    // global trails (keeps things coherent when many fireworks overlap)
    // (per-firework trailFade could be added, but global is usually enough + faster)
    if (live.length === 0 && pops.length === 0 && smokes.length === 0 && flashes.length === 0) {
      flashEl.style.opacity = "0";
      return;
    }
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    let flashAlpha = 0;

    for (let i = flashes.length - 1; i >= 0; i -= 1) {
      const flash = flashes[i]!;
      const fadeStart = flash.dropFrames + flash.holdFrames;
      const totalFrames = fadeStart + flash.fadeFrames;
      let alpha = 0;

      if (flash.t < flash.dropFrames) {
        // CHANGED: cubic snap-down makes the bright pop effectively immediate.
        const k = flash.t / Math.max(1, flash.dropFrames);
        alpha = flash.tailAlpha
          + (flash.peakAlpha - flash.tailAlpha) * Math.pow(1 - k, 3);
      } else if (flash.t < fadeStart) {
        // CHANGED: brief low plateau reads as reflected light rather than another flash.
        alpha = flash.tailAlpha;
      } else if (flash.t < totalFrames) {
        // CHANGED: eased tail lingers softly, then disappears without a linear ramp.
        const k = (flash.t - fadeStart) / Math.max(1, flash.fadeFrames);
        const eased = 1 - (k * k * (3 - 2 * k));
        alpha = flash.tailAlpha * eased;
      }

      // CHANGED: simultaneous firework layers share one flash instead of stacking brighter.
      flashAlpha = Math.max(flashAlpha, alpha);
      flash.t += 1;
      if (flash.t >= totalFrames) flashes.splice(i, 1);
    }

    // CHANGED: DOM opacity is non-persistent, so the flash appears immediately
    // and follows the envelope exactly instead of accreting in the trail buffer.
    flashEl.style.opacity = String(Math.min(0.065, flashAlpha));

    for (let p = pops.length - 1; p >= 0; p -= 1) {
      const pop = pops[p]!;
      const u = Math.min(1, pop.t / Math.max(1, pop.life));
      const alpha = 0.38 * (1 - u);
      const radius = pop.radius * (0.55 + 0.65 * u);
      const grad = ctx.createRadialGradient(pop.x, pop.y, 0, pop.x, pop.y, radius);
      grad.addColorStop(0, `hsla(${pop.hue}, 100%, 92%, ${alpha})`);
      grad.addColorStop(0.35, `hsla(${pop.hue}, 100%, 72%, ${alpha * 0.45})`);
      grad.addColorStop(1, `hsla(${pop.hue}, 100%, 60%, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, radius, 0, Math.PI * 2);
      ctx.fill();

      pop.t += 1;
      if (pop.t > pop.life) pops.splice(p, 1);
    }


    // draw and step each firework
    for (let f = live.length - 1; f >= 0; f -= 1) {
      const fwk = live[f]!;
      const cfg = fwk.cfg;

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

        const x = cfg.originX + (fwk.baseX[i] ?? 0) - ox;
        const y = cfg.originY + (fwk.baseY[i] ?? 0) + oy - SKY_LIFT_PX;

        // cull when out of bounds, but allow the falling tail to age out below the viewport.
        if (y < -120 || y > CULL_H + 160 || x < -160 || x > W + 160) { continue; }

        // sparkle flicker: small fast LFO; occasional “twinkle spike”
        const flick = 0.65 + 0.35 * Math.sin((fwk.t + ph) * 0.22);
        const twinkle = (Math.random() < 0.015) ? 1.35 : 1.0;

        const a = 0.55 * envelope(Math.min(1, fwk.t / Math.max(1, cfg.lifeFrames)), cfg.peakMode) * flick * twinkle;

        // glow
        ctx.shadowBlur = /* cfg.glowBase * (0.6 + 0.8 * flick) */ 0;
        const hueNow = cfg.hueBase + ((fwk.t / cfg.lifeFrames) * cfg.hueDrift) + cfg.hueDrift * 0.15 * Math.sin((fwk.t + ph) * 0.07);
        const isWhiteSpark = (fwk.white[i] ?? 0) > 0;

        ctx.shadowColor = isWhiteSpark
          ? `rgba(255,255,245,${0.75 * a})`
          : `hsla(${hueNow}, 100%, 70%, ${0.55 * a})`;

        ctx.strokeStyle = isWhiteSpark
          ? `rgba(255,255,245,${a})`
          : `hsla(${hueNow}, 100%, 65%, ${a})`;
        if (Number.isFinite(px) && Number.isFinite(py)) {
          ctx.beginPath();
          ctx.moveTo(px as number, py as number);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.fillStyle = isWhiteSpark
            ? `rgba(255,255,245,${a})`
            : `hsla(${hueNow}, 100%, 65%, ${a})`;
          ctx.fillRect(x, y, 2, 2);
        }

        fwk.prevX[i] = x;
        fwk.prevY[i] = y;
      }

      fwk.t += 1;
      if (fwk.t > cfg.lifeFrames) {
        live.splice(f, 1);
      }
    }

    for (let s = smokes.length - 1; s >= 0; s -= 1) {
      const smoke = smokes[s]!;
      const u = Math.min(1, smoke.t / Math.max(1, smoke.life));
      const alpha = 0.08 * Math.pow(1 - u, 1.75);
      const radius = smoke.radius * (1.65 + 3.25 * u);
      const driftY = smoke.t * -0.68;
      const grad = ctx.createRadialGradient(smoke.x, smoke.y + driftY, 0, smoke.x, smoke.y + driftY, radius);
      grad.addColorStop(0, `rgba(92,92,86,${alpha})`);
      // grad.addColorStop(0.42, `rgba(60,60,56,${alpha * 0.42})`);
      grad.addColorStop(1, "rgba(40,40,38,0)");

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y + driftY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";

      smoke.t += 1;
      if (smoke.t > smoke.life) smokes.splice(s, 1);
    }
    if (live.length > 0 || pops.length > 0 || smokes.length > 0 || flashes.length > 0) {
      rafId = requestAnimationFrame(render_frame);
    }
  }

  rafId = requestAnimationFrame(render_frame);

  // ---------------------------------------
  // Firework config builder
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

  function make_config_from_key(k: string, holdMs: number, layer: FireworkLevel): FireworkConfig | null {
    const row = key_row(k);
    if (!row) return null;

    const speedBase =
      row === "top" ? 4.8 :
        row === "mid" ? 4.1 :
          3.6;

    const idx = key_index(k, row);
    const span = Math.max(1, ROWS[row].length - 1);
    const p = (idx / span) * 2 - 1;
    const angle = (-Math.PI / 2) + (p * 0.55) + rand(-0.06, 0.06);

    const baseCount = 520 + randInt(-80, 120);
    const steps = Math.min(10, Math.floor(Math.min(2000, holdMs) / 200));
    const add = steps * randInt(30, 55);
    const count = Math.min(2000, baseCount + add + layer * randInt(60, 140));

    // CHANGED: once the fixed WASM field is centered correctly, the configured
    // origin can be the actual viewport center rather than a rightward correction.
    const logoSpreadX = Math.min(170, W * 0.14);
    const originX = Math.floor(W * 0.5 + rand(-logoSpreadX, logoSpreadX));
    const originY = Math.floor((H * 0.40) + SKY_LIFT_PX + rand(-H * 0.03, H * 0.03));

    const peakMode = pick(["early", "mid", "late"] as const);
    const hueBase = rand(0, 360);
    const hueDrift = rand(-45, 65) * (layer === 0 ? 1 : 0.7);

    return {
      count,
      originX,
      originY,
      angleRad: angle,
      speed: speedBase * rand(0.92, 1.18),
      shapeScale: 1,
      hueBase,
      hueDrift,
      trailFade: rand(0.08, 0.14),
      lineWBase: rand(0.9, 1.8),
      glowBase: rand(6, 18),
      lifeFrames: randInt(120, 210),
      peakMode,
    };
  }

  // ---------------------------------------
  // Fire controller
  // ---------------------------------------
  const FIRE_KEYS = "qwertyuiopasdfghjklzxcvbnm";


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
    if (!key_row(k) || k !== "z") return;

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

  canvasLt.listen.window.onKeyDown(onKeyDown);
  canvasLt.listen.window.onKeyUp(onKeyUp)

  function random_fire_key(): string {
    return FIRE_KEYS[randInt(0, FIRE_KEYS.length - 1)] ?? "h";
  }

  function fire(level: FireworkLevel = 0): void {
    const k = random_fire_key();
    const safeLevel: FireworkLevel = level === 2 ? 2 : level === 1 ? 1 : 0;
    const holdMs = safeLevel === 2 ? 2000 : safeLevel === 1 ? 1000 : 0;

    for (let layer = 0; layer <= safeLevel; layer += 1) {
      const cfg = make_config_from_key(k, holdMs, layer as FireworkLevel);
      if (cfg) spawn_firework(cfg);
    }
  }

  const teardown = (): void => {
    clear_layer_timers();

    if (rafId !== null) cancelAnimationFrame(rafId);
    flashLt.remove();
    canvasLt.remove();
  };

  return Object.freeze({ fire, teardown });
}
