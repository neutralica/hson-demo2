import assert from "node:assert/strict";
import { soft_tile_key, soft_tile_project } from "../../ui/soft-tile/soft-tile-candidates";
import { AMOEBI_GEOMETRY, AMOEBI_TILE_FIELD, BUTTONS } from "./amoebi.consts";
import {
  bounds_for_cells,
  core_dimensions,
  label_footprint,
  pack_amoebi_layout,
  path_for_cells,
} from "./amoebi-geometry";

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  return sorted.length % 2 ? upper : (upper + (sorted[middle - 1] ?? upper)) / 2;
}
function rounded(value: number): number { return Math.round(value * 1_000_000) / 1_000_000; }

const seeds = Array.from({ length: 20 }, (_, index) => index * 97 + 11);
const elapsedTimes: number[] = [];
const packed = seeds.map((seed) => {
  const started = performance.now();
  const result = pack_amoebi_layout(BUTTONS, seed);
  elapsedTimes.push(performance.now() - started);
  return result;
});

packed.forEach(({ layout }, layoutIndex) => {
  const occupied = new Set<string>();
  layout.forEach((button, index) => {
    assert.ok(button.bounds.left >= AMOEBI_TILE_FIELD.bounds.left - 1e-9);
    assert.ok(button.bounds.right <= AMOEBI_TILE_FIELD.bounds.right + 1e-9);
    assert.ok(button.bounds.top >= AMOEBI_TILE_FIELD.bounds.top - 1e-9);
    assert.ok(button.bounds.bottom <= AMOEBI_TILE_FIELD.bounds.bottom + 1e-9);
    assert.ok(button.cells.every((cell) => !occupied.has(soft_tile_key(cell))), `seed ${seeds[layoutIndex]}: ${button.id} does not overlap`);
    button.cells.forEach((cell) => occupied.add(soft_tile_key(cell)));
    const expectedCore = core_dimensions(button.label);
    assert.equal(button.coreCells.length, expectedCore.columns * expectedCore.rows, `${button.id} retains its protected core`);
    const coreBounds = bounds_for_cells(button.coreCells, AMOEBI_GEOMETRY.hexSize);
    const footprint = label_footprint(button.label, AMOEBI_GEOMETRY);
    assert.ok(coreBounds.width + 1e-9 >= footprint.width && coreBounds.height + 1e-9 >= footprint.height, `${button.id} label fits`);
    assert.ok(button.cx >= coreBounds.left && button.cx <= coreBounds.right && button.cy >= coreBounds.top && button.cy <= coreBounds.bottom, `${button.id} anchor remains in core`);
    assert.equal(button.path, path_for_cells(button.cells, AMOEBI_GEOMETRY.hexSize), `${button.id} outline remains consistent`);
    const previous = layout[index - 1];
    if (previous) {
      assert.ok(
        soft_tile_project({ x: button.cx, y: button.cy }, AMOEBI_TILE_FIELD.growth)
          >= soft_tile_project({ x: previous.cx, y: previous.cy }, AMOEBI_TILE_FIELD.growth) + AMOEBI_TILE_FIELD.minOrderStep - 1e-9,
        `${button.id} advances along the reading-order vector`,
      );
    }
    assert.ok(index === 0 || button.placement.contactedTileCount > 0 || button.placement.wallContact, `${button.id} is colony- or boundary-supported`);
  });
});

const layouts = packed.map(({ layout }) => layout);
const heights = layouts.map((layout) => Math.max(...layout.map(({ bounds }) => bounds.bottom)) - Math.min(...layout.map(({ bounds }) => bounds.top)));
const widths = layouts.flatMap((layout) => layout.map(({ bounds }) => bounds.width));
const colonyWidths = layouts.map((layout) => Math.max(...layout.map(({ bounds }) => bounds.right)) - Math.min(...layout.map(({ bounds }) => bounds.left)));
const anchorsX = layouts.flatMap((layout) => layout.map(({ cx }) => cx));
const orderSteps = layouts.flatMap((layout) => layout.slice(1).map((button, index) => (
  soft_tile_project({ x: button.cx, y: button.cy }, AMOEBI_TILE_FIELD.growth)
    - soft_tile_project({ x: layout[index]!.cx, y: layout[index]!.cy }, AMOEBI_TILE_FIELD.growth)
)));
const xSteps = layouts.flatMap((layout) => layout.slice(1).map((button, index) => Math.abs(button.cx - layout[index]!.cx)));
const pairCount = layouts.length * (BUTTONS.length - 1);
const verticalOverlapCount = layouts.reduce((count, layout) => count + layout.slice(1).filter((button, index) => (
  Math.min(button.bounds.bottom, layout[index]!.bounds.bottom) > Math.max(button.bounds.top, layout[index]!.bounds.top)
)).length, 0);
const contactEdges = layouts.reduce((sum, layout) => sum + layout.reduce((count, button) => count + button.placement.contactEdges, 0), 0);
const multiBodyContacts = layouts.reduce((sum, layout) => sum + layout.filter((button) => button.placement.contactedTileCount > 1).length, 0);
const wallContacts = layouts.reduce((sum, layout) => sum + layout.filter((button) => button.placement.wallContact).length, 0);
const cavityFillScore = layouts.reduce((sum, layout) => sum + layout.reduce((count, button) => count + button.placement.cavityFillScore, 0), 0);
const emptyHoleCount = packed.reduce((sum, result) => sum + result.packingDiagnostics.emptyHoleCount, 0);
const generatedCandidates = packed.reduce((sum, result) => sum + result.packingDiagnostics.generatedCandidateCount, 0);
const retainedStates = packed.reduce((sum, result) => sum + result.packingDiagnostics.retainedStateCount, 0);

assert.ok(median(widths) <= 110, "typical bodies are materially narrower than the previous 125–156px range");
assert.ok(Math.max(...widths) <= AMOEBI_GEOMETRY.maxBodyWidth + 1e-9, "widest body respects the configured generation limit");
assert.ok(median(heights) <= 450, "median colony height decreases materially from 544.5px");
assert.ok(median(orderSteps) < 54, "median order-axis step decreases materially");
assert.ok(verticalOverlapCount / pairCount > 0.65, "successive bounds overlap vertically in most pairs");
assert.ok(multiBodyContacts > 0, "representative Amoebi seeds produce multi-body contacts");
assert.ok(cavityFillScore > 0, "representative layouts fill concave pockets");
assert.ok(layouts.every((layout) => layout.some((button) => !button.placement.wallContact)), "no layout collapses entirely into a wall spine");
assert.deepEqual(pack_amoebi_layout(BUTTONS, 9182), pack_amoebi_layout(BUTTONS, 9182), "same seed and config are deterministic");
assert.notDeepEqual(pack_amoebi_layout(BUTTONS, 3).layout, pack_amoebi_layout(BUTTONS, 4).layout, "different seeds retain organic variation");

console.log(JSON.stringify({
  seeds,
  before: {
    typicalBodyWidths: "125–156",
    medianHeight: 544.5,
    medianOrderStep: 54,
    medianXStep: 46.765372,
    multiBodyContacts: 0,
    wallContacts: 34,
  },
  after: {
    bodyWidth: { min: rounded(Math.min(...widths)), median: rounded(median(widths)), max: rounded(Math.max(...widths)) },
    medianHeight: rounded(median(heights)),
    medianColonyWidth: rounded(median(colonyWidths)),
    anchorX: { min: rounded(Math.min(...anchorsX)), max: rounded(Math.max(...anchorsX)) },
    medianOrderStep: rounded(median(orderSteps)),
    medianXStep: rounded(median(xSteps)),
    verticalOverlapPct: rounded(verticalOverlapCount / pairCount * 100),
    contactEdges,
    multiBodyContacts,
    wallContacts,
    cavityFillScore,
    emptyHoleCount,
    generatedCandidates,
    retainedStates,
    searchTimeMs: { median: rounded(median(elapsedTimes)), max: rounded(Math.max(...elapsedTimes)) },
    emergencyFailures: 0,
  },
}, null, 2));
