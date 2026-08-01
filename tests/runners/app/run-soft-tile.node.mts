import assert from "node:assert/strict";
import { soft_tile_key, soft_tile_project, soft_tile_translate } from "./soft-tile-candidates";
import { pack_soft_tiles } from "./soft-tile-field";
import type { SoftTileBody, SoftTileFieldConfig, SoftTileHexCoord } from "./soft-tile.types";

function rectangle(id: string, columns: number, rows: number, requiredParentId?: string): SoftTileBody {
  const cells: SoftTileHexCoord[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const r = row - 1;
      cells.push({ q: column - Math.floor(columns / 2) - Math.floor(r / 2), r });
    }
  }
  return {
    id,
    cells,
    core: cells,
    anchor: { x: 50, y: 20 },
    ...(requiredParentId ? { requiredParentId } : {}),
  };
}

const field: SoftTileFieldConfig = {
  bounds: { left: 0, top: 0, right: 120, bottom: 180, width: 120, height: 180 },
  origin: { x: 50, y: 20 },
  hexSize: 8,
  gravity: { x: -0.3, y: -1 },
  growth: { x: 0.3, y: 1 },
  supportWalls: ["left", "top"],
  wallContactTolerance: 7,
  minOrderStep: 1,
  rootRequiresSupport: true,
  targetColonyWidth: 120,
};
const search = { beamWidth: 64, maxCandidatesPerTile: 32, searchMarginRows: 6 } as const;
const notchBodies = [rectangle("a", 5, 2), rectangle("b", 5, 2), rectangle("c", 3, 2)] as const;
const notch = pack_soft_tiles(notchBodies, field, search);
const notchAgain = pack_soft_tiles(notchBodies, field, search);

assert.deepEqual(notch, notchAgain, "beam search is deterministic with explicit tie-breaking");
assert.equal(notch.tiles.length, 3);
const occupied = new Set<string>();
notch.tiles.forEach((tile, index) => {
  assert.ok(tile.bounds.left >= field.bounds.left && tile.bounds.right <= field.bounds.right);
  assert.ok(tile.bounds.top >= field.bounds.top && tile.bounds.bottom <= field.bounds.bottom);
  assert.ok(tile.cells.every((cell) => !occupied.has(soft_tile_key(cell))), `${tile.id} does not overlap prior tiles`);
  assert.equal(tile.core.length, notchBodies[index]?.core.length, `${tile.id} retains its protected core`);
  assert.deepEqual(tile.core, soft_tile_translate(notchBodies[index]?.core ?? [], tile.translation), `${tile.id} core is translated without mutation`);
  tile.cells.forEach((cell) => occupied.add(soft_tile_key(cell)));
  const previous = notch.tiles[index - 1];
  if (previous) {
    assert.ok(soft_tile_project(tile.anchor, field.growth) >= soft_tile_project(previous.anchor, field.growth) + field.minOrderStep - 1e-9);
  }
  assert.ok(index === 0 || tile.contacts.contactedTileIndices.length > 0 || tile.contacts.walls.length > 0);
});

const third = notch.tiles[2];
const second = notch.tiles[1];
assert.ok(third && second);
assert.deepEqual(third.contacts.contactedTileIndices, [0, 1], "the third tile settles into the two-body notch");
assert.ok(third.contacts.cavityFillScore > 0, "the notch placement fills a concave pocket");
assert.ok(third.bounds.top < second.bounds.bottom, "the notch tile overlaps the second tile's vertical span instead of stacking below it");

const parent = pack_soft_tiles(
  [rectangle("parent", 5, 2), rectangle("sibling", 5, 2), rectangle("child", 3, 2, "parent")],
  field,
  search,
);
assert.ok(parent.tiles[2]?.contacts.contactedTileIds.includes("parent"), "required parent attachment is honored");

const reversedField: SoftTileFieldConfig = {
  ...field,
  gravity: { x: 0.3, y: 1 },
  growth: { x: -0.3, y: -1 },
  supportWalls: ["right", "bottom"],
};
const reversed = pack_soft_tiles(notchBodies, reversedField, search);
assert.notDeepEqual(
  reversed.tiles.map((tile) => tile.translation),
  notch.tiles.map((tile) => tile.translation),
  "reversing gravity and growth redirects packing without per-index targets",
);
assert.ok(notch.tiles.some((tile) => tile.contacts.contactedTileIndices.length > 1), "synthetic packing creates multi-body contact");
assert.ok(notch.tiles.filter((tile) => tile.contacts.walls.length > 0).length < notch.tiles.length, "wall support does not absorb every tile");

console.log(JSON.stringify({
  notch: notch.tiles.map((tile) => ({
    id: tile.id,
    translation: tile.translation,
    contactedTileIds: tile.contacts.contactedTileIds,
    cavityFillScore: tile.contacts.cavityFillScore,
  })),
  diagnostics: notch.diagnostics,
  energy: notch.energy,
}, null, 2));
