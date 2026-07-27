// mount-bar-bar.ts

import type { LiveTree } from "hson-live/livetree";
import type { CssMap } from "hson-live/types";

const W = 720, H = 480, COLS = 10, ROWS = 5, GAP = 7, L = 34, TOP = 122, HEAD = 94;
const BW = (W - L * 2 - GAP * (COLS - 1)) / COLS, BH = 24, PW = 124, PH = 18, PY = H - 46, R = 8;
const C = {
  shell: "#050604", pit: "#151611", rail: "#2a2a22", ink: "#898575",
  speck: "#10110d", blot: "#0b0c08", rot: "#6b3a31", rotHi: "#865345",
  paddle: "#9a9787", ball: "#ddd9c6",
};

type Brick = [x: number, y: number, w: number, h: number, alive: 0 | 1];
type State = {
  bricks: Brick[]; x: number; y: number; vx: number; vy: number; px: number;
  l: boolean; r: boolean; run: boolean; hold: boolean; win: boolean; lose: boolean; score: number; raf?: number;
};

const ROOTcss: CssMap = {
  width: "100%", height: "100%", minHeight: "520px", display: "grid", placeItems: "center",
  background: C.shell, color: C.ink, fontFamily: "Verdana, Arial Black, sans-serif", outline: "none",
};

const CANVAScss: CssMap = {
  display: "block", width: "min(92vw, 720px)", height: "auto", aspectRatio: `${W} / ${H}`,
  background: C.pit, border: `2px solid ${C.rail}`, imageRendering: "pixelated",
  touchAction: "none", cursor: "crosshair",
};

function bricks(): Brick[] {
  return Array.from({ length: ROWS * COLS }, (_, i) => {
    const row = Math.floor(i / COLS), col = i % COLS;
    return [L + col * (BW + GAP), TOP + row * (BH + GAP), BW, BH, 1];
  });
}

function fresh(): State {
  return { bricks: bricks(), x: W / 2, y: PY - R, vx: 3.8, vy: -4.6, px: W / 2 - PW / 2,
    l: false, r: false, run: false, hold: true, win: false, lose: false, score: 0 };
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const hit = (x: number, y: number, r: number, b: Brick): boolean =>
  b[4] === 1 && x + r >= b[0] && x - r <= b[0] + b[2] && y + r >= b[1] && y - r <= b[1] + b[3];

function reset(s: State): void {
  const raf = s.raf;
  Object.assign(s, fresh(), { raf });
}

function launch(s: State): void {
  if (!s.hold) return;
  s.x = s.px + PW / 2;
  s.y = PY - R;
  s.vx = 3.8;
  s.vy = -16.6;
  s.hold = false;
  s.run = true;
}

function tick(s: State): void {
  s.px = clamp(s.px + (s.l ? -9 : 0) + (s.r ? 9 : 0), 0, W - PW);

  if (s.hold) {
    s.x = s.px + PW / 2;
    s.y = PY - R;
    return;
  }

  if (!s.run) return;

  s.x += s.vx; s.y += s.vy;

  if (s.x - R <= 0) { s.x = R; s.vx *= -1; }
  if (s.x + R >= W) { s.x = W - R; s.vx *= -1; }
  if (s.y - R <= 0) { s.y = R; s.vy *= -1; }

  if (s.vy > 0 && s.y + R >= PY && s.y - R <= PY + PH && s.x >= s.px && s.x <= s.px + PW) {
    s.vx = ((s.x - (s.px + PW / 2)) / (PW / 2)) * 6.3;
    s.vy = -Math.abs(s.vy) - 0.05;
    s.y = PY - R;
  }

  for (const b of s.bricks) if (hit(s.x, s.y, R, b)) { b[4] = 0; s.score += 10; s.vy *= -1; break; }
  if (s.bricks.every(b => b[4] === 0)) { s.run = false; s.win = true; }
  if (s.y - R > H) { s.run = false; s.lose = true; }
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
}

function stipple(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = C.speck;
  for (let y = HEAD + 12; y < H; y += 15) for (let x = 9; x < W; x += 15) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = C.blot;
  for (let y = HEAD + 24; y < H; y += 42) for (let x = 23; x < W; x += 42) ctx.fillRect(x, y, 2, 1);
}

function type(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, align: CanvasTextAlign = "left", size = 19, fill = C.ink): void {
  ctx.fillStyle = fill; ctx.font = `900 ${size}px Trebuchet MS, Arial Black, Impact, Verdana, sans-serif`; ctx.textAlign = align; ctx.fillText(txt, x, y);
}

function bar_label(ctx: CanvasRenderingContext2D, x: number): void {
  const txt = "БАР-БАР";
  const left = x + 14;
  const step = (PW - 28) / (txt.length - 1);

  // CHANGED: paddle label as crude molded lettering, spread across the bar
  // instead of printed as a small centered caption.
  box(ctx, x + 7, PY + 3, PW - 14, 1, "#777263");
  box(ctx, x + 7, PY + PH - 4, PW - 14, 1, "#b3ae9c");

  ctx.fillStyle = C.rot;
  ctx.font = "900 13px Arial Black, Impact, Verdana, sans-serif";
  ctx.textAlign = "center";
  for (let i = 0; i < txt.length; i += 1) ctx.fillText(txt[i] ?? "", left + step * i, PY + 14);
}

function draw(ctx: CanvasRenderingContext2D, s: State): void {
  box(ctx, 0, 0, W, H, C.pit); stipple(ctx); box(ctx, 0, 0, W, HEAD, C.shell);
  type(ctx, "БАР-БАР", W / 2, 58, "center", 58, C.rot);
  type(ctx, `СЧЁТ ${s.score}`, 18, 82, "left", 17);
  type(ctx, "← → / УКАЗАТЕЛЬ / КЛИК СБРОС", W - 18, 82, "right", 17);

  for (const b of s.bricks) if (b[4]) { box(ctx, b[0], b[1], b[2], b[3], C.rot); box(ctx, b[0] + 3, b[1] + 3, b[2] - 6, 4, C.rotHi); }
  box(ctx, s.px, PY, PW, PH, C.paddle);
  bar_label(ctx, s.px);
  ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.fillStyle = C.ball; ctx.fill();

  if (s.hold) type(ctx, "КЛИК ИЛИ КЛАВИША — ПУСК", W / 2, 318, "center", 24, C.ink);
  if (s.win || s.lose) type(ctx, s.win ? "ОЧИЩЕНО. КЛИК СБРОС." : "ШАР УТЕРЯН. КЛИК СБРОС.", W / 2, 318, "center", 30, C.rot);
}

export function mount_bar_bar(host: LiveTree): void {
  host.empty().css.setMany(ROOTcss).attrs.set("tabindex", "0");
  const canvas = host.create.canvas().css.setMany(CANVAScss);
  canvas.canvas.width.set(W); canvas.canvas.height.set(H);

  const ctx = canvas.canvas.must.ctx2d({ alpha: false }, "BAR-BAR canvas");
  const s = fresh();

  host.listen.window.onKeyDown(ev => {
    const k = ev.key.toLowerCase();
    if (k === "arrowleft" || k === "a") s.l = true;
    if (k === "arrowright" || k === "d") s.r = true;
    if (s.hold) launch(s);
    else if (!s.run) reset(s);
  });

  host.listen.window.onKeyUp(ev => {
    const k = ev.key.toLowerCase();
    if (k === "arrowleft" || k === "a") s.l = false;
    if (k === "arrowright" || k === "d") s.r = false;
  });

  canvas.listen.preventDefault().onPointerMove(ev => {
    const p = canvas.canvas.pointer(ev);
    if (p) {
      s.px = clamp(p.x - PW / 2, 0, W - PW);
      if (s.hold) { s.x = s.px + PW / 2; s.y = PY - R; }
    }
  });

  canvas.listen.preventDefault().onClick(() => {
    if (s.hold) launch(s);
    else if (!s.run) reset(s);
  });

  const frame = (): void => { tick(s); draw(ctx, s); s.raf = requestAnimationFrame(frame); };
  frame();
}

export default mount_bar_bar;
