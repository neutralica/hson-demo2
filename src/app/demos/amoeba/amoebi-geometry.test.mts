/* don't want to delete, can't leave active */
// @ts-nocheck

import assert from "node:assert/strict";
import { AMOEBI_GEOMETRY, BUTTONS } from "./amoebi.consts";
import {
  bounds_for_cells,
  core_dimensions,
  hex_center,
  hex_neighbors,
  label_footprint,
  make_layout,
  path_for_cells,
  translate_cells,
} from "./amoebi-geometry";
import type { AmoebiGeometryConfig, HexCoord } from "./amoebi.types";
import { $BLING } from "../../phases/phase-3-demo/demo.consts";

function key({ q, r }: HexCoord): string { return `${q},${r}`; }

function connected(cells: readonly HexCoord[]): boolean {
  const remaining = new Set(cells.map(key));
  const first = cells[0];
  if (!first) return false;
  const pending = [first];
  remaining.delete(key(first));
  while (pending.length) {
    const cell = pending.pop();
    if (!cell) continue;
    hex_neighbors(cell).forEach((neighbor) => {
      if (!remaining.delete(key(neighbor))) return;
      pending.push(neighbor);
    });
  }
  return remaining.size === 0;
}

function edgeContacts(a: readonly HexCoord[], b: readonly HexCoord[]): number {
  const bKeys = new Set(b.map(key));
  return a.reduce((count, cell) => count + hex_neighbors(cell).filter((neighbor) => bKeys.has(key(neighbor))).length, 0);
}

function rounded(value: number): number { return Math.round(value * 1_000_000) / 1_000_000; }

const motes = BUTTONS.find(({ id }) => id === $BLING);
assert.ok(motes, "motes button remains present");
const motesDimensions = core_dimensions(motes!.label);
const motesMetrics: Array<Readonly<{ seed: number; cells: number; width: number; height: number }>> = [];
const sharedBorders: number[] = [];
const menuHeights: number[] = [];

for (let seed = 0; seed < 200; seed += 1) {
  const layout = make_layout(BUTTONS, seed);
  const occupied = new Set<string>();
  layout.forEach((current, index) => {
    assert.ok(current.cells.every((cell) => !occupied.has(key(cell))), `seed ${seed}: buttons do not overlap`);
    current.cells.forEach((cell) => occupied.add(key(cell)));
    const previous = layout[index - 1];
    if (previous) {
      const contacts = edgeContacts(previous.cells, current.cells);
      assert.ok(contacts >= 2, `seed ${seed}: ${previous.id} shares a border with ${current.id}`);
      sharedBorders.push(contacts);
    }
  });
  menuHeights.push(Math.max(...layout.map(({ bounds }) => bounds.bottom)) - Math.min(...layout.map(({ bounds }) => bounds.top)));
  const button = layout.find(({ id }) => id === "motes");
  assert.ok(button);
  if (!button) { continue; }
  assert.equal(button.coreCells.length, motesDimensions.columns * motesDimensions.rows);
  assert.ok(motesDimensions.columns >= AMOEBI_GEOMETRY.minCoreColumns);
  assert.ok(motesDimensions.rows >= AMOEBI_GEOMETRY.minCoreRows);
  assert.ok(button.cells.length >= AMOEBI_GEOMETRY.minCellCount);
  assert.ok(button.cells.length <= button.coreCells.length * (1 + AMOEBI_GEOMETRY.fringeRatioMax + AMOEBI_GEOMETRY.contactSkinRatio) + 1);

  const coreBounds = bounds_for_cells(button.coreCells, AMOEBI_GEOMETRY.hexSize);
  const footprint = label_footprint(button.label, AMOEBI_GEOMETRY);
  assert.ok(coreBounds.width + 1e-9 >= footprint.width);
  assert.ok(coreBounds.height + 1e-9 >= footprint.height);
  assert.ok(button.cx >= coreBounds.left && button.cx <= coreBounds.right);
  assert.ok(button.cy >= coreBounds.top && button.cy <= coreBounds.bottom);
  assert.ok(connected(button.cells));
  assert.ok(Math.max(button.bounds.width / button.bounds.height, button.bounds.height / button.bounds.width) <= AMOEBI_GEOMETRY.maxAspectRatio);
  assert.equal(button.path, path_for_cells(button.cells, AMOEBI_GEOMETRY.hexSize));
  assert.deepEqual(button.bounds, bounds_for_cells(button.cells, AMOEBI_GEOMETRY.hexSize));
  motesMetrics.push({ seed, cells: button.cells.length, width: rounded(button.bounds.width), height: rounded(button.bounds.height) });
}

for (const button of BUTTONS) {
  const dimensions = core_dimensions(button.label);
  assert.ok(dimensions.columns * dimensions.rows >= AMOEBI_GEOMETRY.minCellCount, `${button.id} has minimum core mass`);
  const generated = make_layout([button], 17)[0];
  assert.ok(generated);
  const footprint = label_footprint(button.label, AMOEBI_GEOMETRY);
  const coreBounds = bounds_for_cells(generated.coreCells, AMOEBI_GEOMETRY.hexSize);
  assert.ok(coreBounds.width >= footprint.width, `${button.id} label width fits`);
  assert.ok(coreBounds.height >= footprint.height, `${button.id} label height fits`);
}

assert.deepEqual(make_layout(BUTTONS, 9182), make_layout(BUTTONS, 9182), "same seed is identical");
const seedA = make_layout([motes], 3)[0];
const seedB = make_layout([motes], 4)[0];
assert.ok(seedA && seedB);
assert.notDeepEqual(seedA.cells, seedB.cells, "different seeds vary the fringe");

const sample = seedA.cells;
const delta = { q: 3, r: 4 } as const;
const translated = translate_cells(sample, delta);
const beforeBounds = bounds_for_cells(sample, AMOEBI_GEOMETRY.hexSize);
const afterBounds = bounds_for_cells(translated, AMOEBI_GEOMETRY.hexSize);
const beforeCenter = hex_center(sample[0]!, AMOEBI_GEOMETRY.hexSize);
const afterCenter = hex_center(translated[0]!, AMOEBI_GEOMETRY.hexSize);
const dx = afterCenter.x - beforeCenter.x;
const dy = afterCenter.y - beforeCenter.y;
assert.equal(rounded(afterBounds.left - beforeBounds.left), rounded(dx));
assert.equal(rounded(afterBounds.top - beforeBounds.top), rounded(dy));
assert.equal(path_for_cells(translated, AMOEBI_GEOMETRY.hexSize), path_for_cells(translate_cells(sample, delta), AMOEBI_GEOMETRY.hexSize));

const smallerConfig: AmoebiGeometryConfig = { ...AMOEBI_GEOMETRY, hexSize: AMOEBI_GEOMETRY.hexSize * 0.8 };
const normalCore = core_dimensions(motes.label, AMOEBI_GEOMETRY);
const smallerCore = core_dimensions(motes.label, smallerConfig);
assert.ok(smallerCore.columns * smallerCore.rows > normalCore.columns * normalCore.rows, "smaller hexes increase core population");

const uniqueMotesMetrics = new Set(motesMetrics.map(({ cells, width, height }) => `${cells}:${width}:${height}`));
assert.ok(uniqueMotesMetrics.size > 1, "motes silhouette varies across seeds");

console.log(JSON.stringify({
  seeds: motesMetrics.length,
  core: motesDimensions,
  coreCells: motesDimensions.columns * motesDimensions.rows,
  totalCells: { min: Math.min(...motesMetrics.map(({ cells }) => cells)), max: Math.max(...motesMetrics.map(({ cells }) => cells)) },
  width: { min: Math.min(...motesMetrics.map(({ width }) => width)), max: Math.max(...motesMetrics.map(({ width }) => width)) },
  height: { min: Math.min(...motesMetrics.map(({ height }) => height)), max: Math.max(...motesMetrics.map(({ height }) => height)) },
  sharedBorders: { min: Math.min(...sharedBorders), average: rounded(sharedBorders.reduce((sum, count) => sum + count, 0) / sharedBorders.length), max: Math.max(...sharedBorders) },
  menuHeight: { min: rounded(Math.min(...menuHeights)), average: rounded(menuHeights.reduce((sum, height) => sum + height, 0) / menuHeights.length), max: rounded(Math.max(...menuHeights)) },
  smallerHexCoreCells: smallerCore.columns * smallerCore.rows,
}, null, 2));
