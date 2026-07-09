import type { CssMap } from "hson-live/types";
import { $PANEL_HIDDEN } from "../../core/consts/ui-consts";
import { CELLcss } from "./cellsheet.css";
import type { CellsheetState, CellsheetCellState, CellsheetDerivedCellState, Operator, CellModel, OperationModel, CellKind, CellsheetOperationState, CellsheetSummaryState, CellRelation } from "./cellsheet.types";

export const ROWS = 8;
export const COLS = 8;
const OPERATORS = new Set<string>(["+", "-", "*", "/"]);
export const MAX_EVALUATION_PASSES = ROWS * COLS;
export function cell_key(row: number, col: number): string {
    return `${String.fromCharCode(65 + col)}${row + 1}`;
}
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
        ui: {
            selected: null,
        },
        derived: {
            cells: derivedCells,
            operations: {},
            summary: {
                authored: 0,
                operators: 0,
                results: 0,
                errors: 0,
            },
        },
    };
}
function hide_panel(): string {
    return $PANEL_HIDDEN;
}
export function is_operator(value: string): value is Operator {
    return OPERATORS.has(value);
}
function normalize_raw(raw: string): string {
    return raw.trim();
}
export function is_record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parse_value(raw: string): Pick<CellModel, "value" | "kind"> {
    const clean = normalize_raw(raw);
    if (clean === "") return { value: undefined, kind: "blank" };
    if (is_operator(clean)) return { value: clean, kind: "operator" };

    const asNumber = Number(clean);
    if (clean !== "" && Number.isFinite(asNumber)) return { value: asNumber, kind: "number" };

    return { value: clean, kind: "text" };
}
export function value_text(value: string | number | undefined): string {
    if (value === undefined) return "";
    return String(value);
}
function can_receive_result(cell: CellModel): boolean {
    return !cell.authored || cell.kind === "result";
}
export function result_target_error(operation: OperationModel): string | undefined {
    const target = operation.target;

    if (target.kind === "result" && target.resultOf !== undefined && target.resultOf !== operation.key) {
        return `result collision: ${target.key} is already written by ${target.resultOf}`;
    }

    if (!can_receive_result(target)) {
        return `occupied result target for ${operation.operator.key}`;
    }

    return undefined;
}
function cell_status(cell: CellModel): CellKind {
    if (cell.error) return "error";
    return cell.kind;
}
function css_for_cell_state(derived: CellsheetDerivedCellState): CssMap {
    const status = derived.kind;
    const relation = derived.relation;

    return {
        ...CELLcss,
        ...(status === "operator" ? {
            fontWeight: "700",
            opacity: "1",
        } : {}),
        ...(status === "result" ? {
            opacity: "0.68",
            fontStyle: "italic",
        } : {}),
        ...(status === "error" ? {
            opacity: "1",
            textDecoration: "underline",
        } : {}),
        borderStyle: derived.resultOf ? "dashed" : "solid",
        ...(relation === "selected" ? {
            outline: "2px solid currentColor",
            outlineOffset: "-2px",
            opacity: "1",
        } : {}),
        ...(relation === "operand" ? {
            borderWidth: "2px",
            opacity: "1",
        } : {}),
        ...(relation === "operator" ? {
            borderWidth: "2px",
            fontWeight: "700",
            opacity: "1",
        } : {}),
        ...(relation === "target" ? {
            borderStyle: "dashed",
            borderWidth: "2px",
            opacity: "1",
        } : {}),
        ...(relation === "blocked" ? {
            borderStyle: "double",
            borderWidth: "3px",
            opacity: "1",
            textDecoration: "underline",
        } : {}),
    };
}
export function render_cell_from_derived(cell: CellModel, derived: CellsheetDerivedCellState): void {
    if (!cell.input) return;

    cell.input.form.setValue(derived.display, { silent: true });
    cell.input.attr.set("data-cellsheet-cell", derived.kind);
    cell.input.attr.set("data-cellsheet-relation", derived.relation);
    cell.input.css.setMany(css_for_cell_state(derived));
}
export function apply_authored_raw(cell: CellModel, raw: string): void {
    const parsed = parse_value(raw);
    cell.raw = raw;
    cell.display = raw;
    cell.value = parsed.value;
    cell.kind = parsed.kind;
    cell.authored = normalize_raw(raw) !== "";
    cell.resultOf = undefined;
    cell.error = undefined;
    cell.relation = "none";
}
export function reset_derived_state(cells: readonly CellModel[]): void {
    for (const cell of cells) {
        if (!cell.authored || cell.kind === "result") {
            cell.raw = "";
            cell.display = "";
            cell.value = undefined;
            cell.kind = "blank";
        }
        cell.resultOf = undefined;
        cell.error = undefined;
        cell.relation = "none";
    }
}
export function compute_result(op: Operator, left: CellModel, right: CellModel): string | number | undefined {
    const a = left.value;
    const b = right.value;

    if (a === undefined || b === undefined) return undefined;

    if (op === "+") {
        if (typeof a === "number" && typeof b === "number") return a + b;
        return `${a}${b}`;
    }

    if (typeof a !== "number" || typeof b !== "number") return undefined;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (b === 0) return undefined;
    return a / b;
}
export function operation_error(op: Operator, left: CellModel, right: CellModel, result: string | number | undefined): string | undefined {
    if (left.value === undefined || right.value === undefined) return "missing operand";
    if (result === undefined) {
        if (op === "/" && right.value === 0) return "division by zero";
        return `${op} needs numbers`;
    }
    return undefined;
}
export function derived_cell_from_model(cell: CellModel): CellsheetDerivedCellState {
    return {
        display: cell.display,
        kind: cell_status(cell),
        authored: cell.authored,
        resultOf: cell.resultOf ?? null,
        error: cell.error ?? null,
        relation: cell.relation,
    };
}
export function operation_state_from_model(operation: OperationModel): CellsheetOperationState {
    return {
        op: operation.op,
        direction: operation.direction,
        left: operation.left.key,
        right: operation.right.key,
        operator: operation.operator.key,
        target: operation.target.key,
        result: operation.result ?? null,
        error: operation.error ?? null,
    };
}
export function summary_state_from_models(cells: readonly CellModel[], operations: readonly OperationModel[]): CellsheetSummaryState {
    return {
        authored: cells.filter((cell) => cell.authored).length,
        operators: operations.length,
        results: cells.filter((cell) => cell.kind === "result").length,
        errors: cells.filter((cell) => cell.error).length,
    };
}
export function read_selected_from_snap(snap: unknown): string | undefined {
    if (!is_record(snap)) return undefined;
    if (!is_record(snap.ui)) return undefined;
    return typeof snap.ui.selected === "string" ? snap.ui.selected : undefined;
}
export function read_summary_from_snap(snap: unknown): CellsheetSummaryState {
    if (!is_record(snap)) return { authored: 0, operators: 0, results: 0, errors: 0 };
    if (!is_record(snap.derived)) return { authored: 0, operators: 0, results: 0, errors: 0 };
    if (!is_record(snap.derived.summary)) return { authored: 0, operators: 0, results: 0, errors: 0 };

    const summary = snap.derived.summary;
    return {
        authored: typeof summary.authored === "number" ? summary.authored : 0,
        operators: typeof summary.operators === "number" ? summary.operators : 0,
        results: typeof summary.results === "number" ? summary.results : 0,
        errors: typeof summary.errors === "number" ? summary.errors : 0,
    };
}
export function read_derived_cell_from_snap(snap: unknown, key: string): CellsheetDerivedCellState | undefined {
    if (!is_record(snap)) return undefined;
    if (!is_record(snap.derived)) return undefined;
    if (!is_record(snap.derived.cells)) return undefined;

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
export function mark_related_cell(cell: CellModel, relation: CellRelation): void {
    if (cell.relation === "selected") return;
    if (cell.relation === "blocked") return;
    cell.relation = relation;
}
export function model_value_changed(cell: CellModel, operation: OperationModel): boolean {
    return cell.kind !== "result"
        || cell.value !== operation.result
        || cell.display !== value_text(operation.result)
        || cell.resultOf !== operation.key;
}
export function remember_operation_once(operations: OperationModel[], seen: Set<string>, operation: OperationModel): void {
    if (seen.has(operation.key)) {
        const index = operations.findIndex((row) => row.key === operation.key);
        if (index >= 0) operations[index] = operation;
        return;
    }

    seen.add(operation.key);
    operations.push(operation);
}
