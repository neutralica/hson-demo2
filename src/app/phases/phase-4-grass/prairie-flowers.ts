import { set_alpha } from "../../core/helpers/color-helpers";
import { _clamp01, _lerp } from "../../utils/helpers";
import { row_wind_x } from "./prairie-helpers";
import type { PrairieRowStatic, PrairieConfig, PrairieFlowerStatic, PrairieFlowerBud } from "./prairie.types";

export function make_row_flowers(
  row: PrairieRowStatic,
  cfg: PrairieConfig,
  rand: () => number,
): PrairieFlowerStatic[] {
  const out: PrairieFlowerStatic[] = [];

  // same attempt count for every row
  const tries = 12;

  for (let k = 0; k < tries; k++) {
    if (rand() > cfg.flowerChance) continue;

    const xPad = 12;
    const xBase = _lerp(xPad, cfg.width - xPad, rand());

    const scale = flower_depth_scale(row.t);
    const radius = _lerp(cfg.flowerRadiusFar, cfg.flowerRadiusNear, scale);

    out.push({
      rowIndex: row.rowIndex,
      t: row.t,

      xBase,
      yBase: row.yBase - row.bladeHeight * _lerp(0.62, 0.94, rand()),

      radius,
      color: set_alpha(pick_flower_color(rand),0.6),
      buds: make_flower_buds(row.t, rand),

      bloomAtSec: rand() < 0.22 ? 0 : rand() * cfg.flowerBloomWindowSec,
      bloomDurSec: _lerp(30.35, 60.95, rand()),

      phase: rand() * Math.PI * 2,
      wobbleAmp: _lerp(0.05, 0.02, row.t),
      wobbleSpeed: _lerp(13.4, 12.9, rand()),
    });
  }

  return out;
}

function pick_flower_color(rand: () => number): string {
    const roll = rand();

    if (roll < 0.28) return "rgba(255,232,120,0.96)"; // yellow
    if (roll < 0.52) return "rgba(0,246,238,0.98)"; // white
    if (roll < 0.72) return "rgba(255,176,198,0.96)"; // pink
    if (roll < 0.88) return "rgba(197,210,255,0.96)"; // pale blue-violet

    return "rgba(255,210,150,0.96)"; // peach
}

export function ease_out_back(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    // changed for universal clamp; maybe misconfig?
    const u = _clamp01(t);
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

export function build_circle_path(cx: number, cy: number, r: number): string {
    if (r <= 0) return "";
    return [
        `M ${(cx - r).toFixed(2)} ${cy.toFixed(2)}`,
        `a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0`,
        `a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`,
        "Z",
    ].join(" ");
}

function flower_depth_scale(t: number): number {
    // near = 1, far collapses aggressively
    return Math.pow(1 - t, 1.9);
}
function make_flower_buds(t: number, rand: () => number): PrairieFlowerBud[] {
    const near = t < 0.35;
    const budCount = near
        ? 3 + Math.floor(rand() * 3) // 3–5
        : t < 0.7
            ? 2 + Math.floor(rand() * 2) // 2–3
            : 1 + Math.floor(rand() * 2); // 1–2

    const buds: PrairieFlowerBud[] = [];

    for (let i = 0; i < budCount; i++) {
        const angle = rand() * Math.PI * 2;
        const dist = rand() * _lerp(1.8, 0.35, t);
        buds.push({
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist * 0.7,
            rMul: _lerp(0.65, 0.35, rand()),
        });
    }

    return buds;
}

export function build_flower_cluster_path(
    flower: PrairieFlowerStatic,
    row: PrairieRowStatic,
    timeSec: number,
    bloomScale: number,
): string {
    const rowWind = row_wind_x(row, flower.xBase, timeSec);

    const wobble =
        Math.sin(timeSec * flower.wobbleSpeed + flower.phase) * flower.wobbleAmp;

    const cx = flower.xBase + rowWind + wobble;
    const cy = flower.yBase;

    const rCore = flower.radius * bloomScale;

    const parts: string[] = [];

    const core = build_circle_path(cx, cy, rCore);
    if (core) parts.push(core);

    for (const bud of flower.buds) {
        const bx = cx + bud.dx * rCore;
        const by = cy + bud.dy * rCore;
        const br = Math.max(0.3, rCore * bud.rMul);

        const d = build_circle_path(bx, by, br);
        if (d) parts.push(d);
    }

    return parts.join(" ");
}
