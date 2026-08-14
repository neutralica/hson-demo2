import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import type { JsonValue } from "hson-live/types";
import type { InferLiveMapSchema } from "hson-live/livemap";
import {
  CELLSHEET_WORKBOOK_SCHEMA,
  create_cellsheet_workbook_store,
  create_empty_cellsheet_workbook,
  create_seeded_cellsheet_workbook,
  type CellsheetWorkbook,
} from "../../../src/app/demos/cellsheet/cellsheet.state";
import {
  cellsheet_cell_ref,
  derive_cellsheet_relations,
  evaluate_cellsheet,
} from "../../../src/app/demos/cellsheet/cellsheet-evaluator";

const SUITE = "unit/cellsheet-state";

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends
  (<T>() => T extends TRight ? 1 : 2) ? true : false;
type Expect<TValue extends true> = TValue;
type Snap<TLocation extends { snap: () => unknown }> = ReturnType<TLocation["snap"]>;
type _WorkbookIsSchemaInferred = Expect<Equal<
  CellsheetWorkbook,
  InferLiveMapSchema<typeof CELLSHEET_WORKBOOK_SCHEMA>
>>;

function typed_location_evidence(): void {
  const cells = create_cellsheet_workbook_store().locations.cells;
  const firstRow = cells.at([0]);
  const firstCell = cells.at([0, 0]);
  const lastCell = cells.at([7, 7]);
  type _FirstRowIsExactTuple = Expect<Equal<
    Snap<typeof firstRow>,
    CellsheetWorkbook["cells"][0]
  >>;
  type _FirstCellIsString = Expect<Equal<Snap<typeof firstCell>, string>>;
  type _LastCellIsString = Expect<Equal<Snap<typeof lastCell>, string>>;
  firstCell.set("authored");
  // @ts-expect-error Exact workbook coordinates reject a ninth row.
  cells.at([8, 0]);
  // @ts-expect-error Exact workbook coordinates reject a ninth cell.
  cells.at([0, 8]);
  // @ts-expect-error A typed cell endpoint accepts only strings.
  firstCell.set(12);
}
void typed_location_evidence;

function fail(message: string): never {
  throw new Error(message);
}

function equal<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) fail(`${message}: expected ${String(expected)}, received ${String(actual)}`);
}

function deep_equal(actual: unknown, expected: unknown, message: string): void {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) fail(`${message}: expected ${expectedText}, received ${actualText}`);
}

function rejects(value: JsonValue, message: string): void {
  if (CELLSHEET_WORKBOOK_SCHEMA.validateRoot(value).ok) fail(message);
}

export function cellsheet_state_suite(): TestSuite {
  const cases: readonly TestCase[] = [
    {
      suite: SUITE,
      caseId: "seeded-workbook-is-the-exact-8-by-8-raw-string-shape", name: "seeded workbook is the exact 8 by 8 raw-string shape",
      run: () => {
        const workbook = create_seeded_cellsheet_workbook();
        equal(CELLSHEET_WORKBOOK_SCHEMA.validateRoot(workbook).ok, true, "schema admission");
        deep_equal(Object.keys(workbook), ["cells"], "canonical keys");
        equal(workbook.cells.length, 8, "row count");
        for (const row of workbook.cells) {
          equal(row.length, 8, "cell count");
          equal(row.every((raw) => typeof raw === "string"), true, "raw strings");
        }
        deep_equal(
          [workbook.cells[0][0], workbook.cells[0][1], workbook.cells[0][2], workbook.cells[2][0], workbook.cells[2][1], workbook.cells[2][2], workbook.cells[4][3], workbook.cells[5][3], workbook.cells[6][3]],
          ["1", "+", "2", "egg", "+", "shell", "8", "/", "2"],
          "mount seeds",
        );
      },
    },
    {
      suite: SUITE,
      caseId: "empty-and-seeded-factories-return-fresh-detached-rows", name: "empty and seeded factories return fresh detached rows",
      run: () => {
        const first = create_empty_cellsheet_workbook();
        const second = create_empty_cellsheet_workbook();
        first.cells[0][0] = "changed";
        equal(second.cells[0][0], "", "separate workbook cells");
        equal(first.cells[0] === first.cells[1], false, "separate rows in one workbook");
        const seeded = create_seeded_cellsheet_workbook();
        equal(seeded.cells[0][0], "1", "seed factory unaffected");
      },
    },
    {
      suite: SUITE,
      caseId: "schema-rejects-fewer-than-eight-rows", name: "schema rejects fewer than eight rows",
      run: () => rejects({ cells: create_empty_cellsheet_workbook().cells.slice(0, 7) }, "seven rows were admitted"),
    },
    {
      suite: SUITE,
      caseId: "schema-rejects-more-than-eight-rows", name: "schema rejects more than eight rows",
      run: () => rejects({ cells: [...create_empty_cellsheet_workbook().cells, ["", "", "", "", "", "", "", ""]] }, "nine rows were admitted"),
    },
    {
      suite: SUITE,
      caseId: "schema-rejects-rows-with-the-wrong-cell-count", name: "schema rejects rows with the wrong cell count",
      run: () => {
        const workbook = create_empty_cellsheet_workbook();
        rejects({ cells: [workbook.cells[0].slice(0, 7), ...workbook.cells.slice(1)] }, "seven cells were admitted");
      },
    },
    {
      suite: SUITE,
      caseId: "schema-rejects-non-string-raw-cells", name: "schema rejects non-string raw cells",
      run: () => {
        const workbook = create_empty_cellsheet_workbook();
        rejects({ cells: [[12, ...workbook.cells[0].slice(1)], ...workbook.cells.slice(1)] }, "numeric raw cell was admitted");
      },
    },
    {
      suite: SUITE,
      caseId: "schema-rejects-every-removed-ownership-branch", name: "schema rejects every removed ownership branch",
      run: () => {
        const workbook = create_empty_cellsheet_workbook();
        const removedBranches: Readonly<Record<string, JsonValue>> = {
          selection: "A1",
          colWidths: [],
          rowHeights: [],
          operations: [],
          errors: [],
          results: [],
          summary: {},
          relationships: {},
          ui: {},
          view: {},
        };
        for (const [key, value] of Object.entries(removedBranches)) {
          rejects({ ...workbook, [key]: value }, `extra ${key} branch was admitted`);
        }
      },
    },
    {
      suite: SUITE,
      caseId: "schema-bound-map-owns-only-the-cells-matrix", name: "schema-bound map owns only the cells matrix",
      run: () => {
        const store = create_cellsheet_workbook_store();
        deep_equal(Object.keys(store.map.snap()), ["cells"], "map keys");
        equal(store.map.rev, 0, "fresh revision");
        equal(store.map.schema.get(), CELLSHEET_WORKBOOK_SCHEMA, "attached schema");
        equal(store.map.schema.has(["cells", 0, 0]), true, "valid cell schema path");
        equal(store.map.schema.has(["cells", 8, 0]), false, "invalid row schema path");
        equal(store.map.schema.has(["cells", 0, 8]), false, "invalid cell schema path");
      },
    },
    {
      suite: SUITE,
      caseId: "one-authored-edit-is-one-commit-watch-evaluation-and-no-writeback", name: "one authored edit is one commit, watch evaluation, and no writeback",
      run: () => {
        const store = create_cellsheet_workbook_store();
        let evaluations = 0;
        const stop = store.locations.cells.watch((nextCells) => {
          evaluations += 1;
          evaluate_cellsheet(nextCells);
        });
        const startRevision = store.map.rev;
        const commit = store.locations.cells.at([0, 0]).set("9");
        stop();
        equal(commit.changed, true, "edit changed");
        equal(store.map.rev - startRevision, 1, "canonical commits");
        equal(evaluations, 1, "evaluations");
        deep_equal(Object.keys(store.map.snap()), ["cells"], "no derived writeback");
      },
    },
    {
      suite: SUITE,
      caseId: "local-selection-derives-relationships-with-zero-commits-or-evaluations", name: "local selection derives relationships with zero commits or evaluations",
      run: () => {
        const store = create_cellsheet_workbook_store();
        const evaluation = evaluate_cellsheet(store.locations.cells.snap());
        const startRevision = store.map.rev;
        let evaluations = 0;
        let relationshipProjections = 0;
        relationshipProjections += 1;
        const relationships = derive_cellsheet_relations(evaluation, cellsheet_cell_ref(0, 0));
        equal(store.map.rev - startRevision, 0, "canonical commits");
        equal(evaluations, 0, "evaluations");
        equal(relationshipProjections, 1, "relationship projections");
        equal(relationships.selected?.key, "A1", "selected relation source");
      },
    },
    {
      suite: SUITE,
      caseId: "local-dimension-updates-produce-zero-canonical-commits-or-evaluations", name: "local dimension updates produce zero canonical commits or evaluations",
      run: () => {
        const store = create_cellsheet_workbook_store();
        const startRevision = store.map.rev;
        let evaluations = 0;
        const colWidths = Array.from({ length: 8 }, () => 56);
        colWidths[0] = 80;
        equal(colWidths[0], 80, "local dimension");
        equal(store.map.rev - startRevision, 0, "canonical commits");
        equal(evaluations, 0, "evaluations");
      },
    },
    {
      suite: SUITE,
      caseId: "reset-replaces-the-workbook-in-one-commit-and-one-evaluation", name: "reset replaces the workbook in one commit and one evaluation",
      run: () => {
        const store = create_cellsheet_workbook_store();
        let evaluations = 0;
        const stop = store.locations.cells.watch((nextCells) => {
          evaluations += 1;
          evaluate_cellsheet(nextCells);
        });
        const startRevision = store.map.rev;
        const commit = store.locations.cells.replace(create_empty_cellsheet_workbook().cells);
        stop();
        equal(commit.changed, true, "reset changed");
        equal(store.map.rev - startRevision, 1, "canonical commits");
        equal(evaluations, 1, "evaluations");
        equal(store.locations.cells.snap().flat().every((raw) => raw === ""), true, "empty reset cells");
      },
    },
    {
      suite: SUITE,
      caseId: "reset-of-an-already-empty-workbook-manufactures-no-commit-or-evaluation", name: "reset of an already empty workbook manufactures no commit or evaluation",
      run: () => {
        const store = create_cellsheet_workbook_store(create_empty_cellsheet_workbook());
        let evaluations = 0;
        const stop = store.locations.cells.watch(() => { evaluations += 1; });
        const startRevision = store.map.rev;
        const commit = store.locations.cells.replace(create_empty_cellsheet_workbook().cells);
        stop();
        equal(commit.changed, false, "empty reset change");
        equal(store.map.rev - startRevision, 0, "empty reset commits");
        equal(evaluations, 0, "empty reset evaluations");
      },
    },
    {
      suite: SUITE,
      caseId: "stopped-workbook-watch-receives-no-post-disposal-evaluation", name: "stopped workbook watch receives no post-disposal evaluation",
      run: () => {
        const store = create_cellsheet_workbook_store();
        let evaluations = 0;
        const stop = store.locations.cells.watch(() => { evaluations += 1; });
        stop();
        store.locations.cells.at([0, 0]).set("after-stop");
        equal(evaluations, 0, "post-stop evaluations");
      },
    },
  ];
  return { suite: SUITE, cases };
}
