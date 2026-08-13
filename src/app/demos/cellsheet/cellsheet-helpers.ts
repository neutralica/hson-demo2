import type { CssMap } from "hson-live/types";
import { CELLcss } from "./cellsheet.css";
import {
  COLS,
  ROWS,
  cell_key,
  type CellKind,
  type CellRelation,
  type CellsheetEvaluatedCell,
} from "./cellsheet-evaluator";
import type { CellViewModel } from "./cellsheet.types";

export { COLS, ROWS, cell_key };

function css_for_cell_state(
  status: CellKind,
  relation: CellRelation,
  resultOf: string | undefined,
): CssMap {
  return {
    ...CELLcss,
    ...(status === "operator" ? { fontWeight: "700", opacity: "1" } : {}),
    ...(status === "result" ? { opacity: "0.68", fontStyle: "italic" } : {}),
    ...(status === "error" ? { opacity: "1", textDecoration: "underline" } : {}),
    borderStyle: resultOf ? "dashed" : "solid",
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

export function project_cell(
  cell: CellViewModel,
  evaluated: CellsheetEvaluatedCell,
  relation: CellRelation,
): void {
  cell.input.form.setValue(evaluated.display, { silent: true });
  cell.input.attrs.set("data-cellsheet-cell", evaluated.kind);
  project_cell_relation(cell, evaluated, relation);
}

export function project_cell_relation(
  cell: CellViewModel,
  evaluated: CellsheetEvaluatedCell,
  relation: CellRelation,
): void {
  cell.input.attrs.set("data-cellsheet-relation", relation);
  cell.input.css.setMany(css_for_cell_state(evaluated.kind, relation, evaluated.resultOf));
}
