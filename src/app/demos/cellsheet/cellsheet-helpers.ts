import type { CssMap } from "hson-live/types";
import { CELLcss } from "./cellsheet.css";
import {
  COLS,
  ROWS,
  cell_key,
  type CellKind,
  type CellRelation,
} from "./cellsheet-evaluator";
import type {
  CellViewModel,
  CellsheetCellState,
  CellsheetDerivedCellState,
  CellsheetState,
  CellsheetSummaryState,
} from "./cellsheet.types";

export { COLS, ROWS, cell_key };

export function create_initial_cellsheet_state(): CellsheetState {
  const cells: Record<string, CellsheetCellState> = {};
  const derivedCells: Record<string, CellsheetDerivedCellState> = {};

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const key = cell_key(row, col);
      cells[key] = { raw: "" };
      derivedCells[key] = {
        display: "",
        kind: "blank",
        authored: false,
        resultOf: null,
        error: null,
        relation: "none",
      };
    }
  }

  return {
    cells,
    ui: { selected: null },
    derived: {
      cells: derivedCells,
      operations: {},
      summary: { authored: 0, operators: 0, results: 0, errors: 0 },
    },
  };
}

export function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function css_for_cell_state(derived: CellsheetDerivedCellState): CssMap {
  const status: CellKind = derived.kind;
  const relation: CellRelation = derived.relation;

  return {
    ...CELLcss,
    ...(status === "operator" ? { fontWeight: "700", opacity: "1" } : {}),
    ...(status === "result" ? { opacity: "0.68", fontStyle: "italic" } : {}),
    ...(status === "error" ? { opacity: "1", textDecoration: "underline" } : {}),
    borderStyle: derived.resultOf ? "dashed" : "solid",
    ...(relation === "selected" ? {
      outline: "2px solid currentColor",
      outlineOffset: "-2px",
      opacity: "1",
    } : {}),
    ...(relation === "operand" ? { borderWidth: "2px", opacity: "1" } : {}),
    ...(relation === "operator" ? { borderWidth: "2px", fontWeight: "700", opacity: "1" } : {}),
    ...(relation === "target" ? { borderStyle: "dashed", borderWidth: "2px", opacity: "1" } : {}),
    ...(relation === "blocked" ? {
      borderStyle: "double",
      borderWidth: "3px",
      opacity: "1",
      textDecoration: "underline",
    } : {}),
  };
}

export function render_cell_from_derived(cell: CellViewModel, derived: CellsheetDerivedCellState): void {
  cell.input.form.setValue(derived.display, { silent: true });
  cell.input.attrs.set("data-cellsheet-cell", derived.kind);
  cell.input.attrs.set("data-cellsheet-relation", derived.relation);
  cell.input.css.setMany(css_for_cell_state(derived));
}

export function read_selected_from_snap(snap: unknown): string | undefined {
  if (!is_record(snap) || !is_record(snap.ui)) return undefined;
  return typeof snap.ui.selected === "string" ? snap.ui.selected : undefined;
}

export function read_summary_from_snap(snap: unknown): CellsheetSummaryState {
  if (!is_record(snap) || !is_record(snap.derived) || !is_record(snap.derived.summary)) {
    return { authored: 0, operators: 0, results: 0, errors: 0 };
  }

  const summary = snap.derived.summary;
  return {
    authored: typeof summary.authored === "number" ? summary.authored : 0,
    operators: typeof summary.operators === "number" ? summary.operators : 0,
    results: typeof summary.results === "number" ? summary.results : 0,
    errors: typeof summary.errors === "number" ? summary.errors : 0,
  };
}

export function read_derived_cell_from_snap(
  snap: unknown,
  key: string,
): CellsheetDerivedCellState | undefined {
  if (!is_record(snap) || !is_record(snap.derived) || !is_record(snap.derived.cells)) return undefined;
  const entry = snap.derived.cells[key];
  if (!is_record(entry)) return undefined;

  return {
    display: typeof entry.display === "string" ? entry.display : "",
    kind: typeof entry.kind === "string" ? entry.kind as CellKind : "blank",
    authored: typeof entry.authored === "boolean" ? entry.authored : false,
    resultOf: typeof entry.resultOf === "string" ? entry.resultOf : null,
    error: typeof entry.error === "string" ? entry.error : null,
    relation: typeof entry.relation === "string" ? entry.relation as CellRelation : "none",
  };
}
