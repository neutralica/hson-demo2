// cellsheet.ts

import { hson, type LiveTree } from "hson-live";
import { $PANEL_HIDDEN } from "../../core/consts/ui-consts";
import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";

type Operator = "+" | "-" | "*" | "/";
type CellKind = "blank" | "text" | "number" | "operator" | "result" | "error";
type Direction = "horizontal" | "vertical";
type CellRelation = "none" | "selected" | "operand" | "operator" | "target" | "blocked";

type CellValue = string | number | Operator | undefined;

type CellModel = {
    row: number;
    col: number;
    key: string;
    raw: string;
    display: string;
    value: CellValue;
    kind: CellKind;
    authored: boolean;
    resultOf: string | undefined;
    error: string | undefined;
    relation: CellRelation;
    input: LiveTree | undefined;
};

type OperationModel = {
    key: string;
    op: Operator;
    direction: Direction;
    left: CellModel;
    right: CellModel;
    operator: CellModel;
    target: CellModel;
    result: string | number | undefined;
    error: string | undefined;
};

type CellsheetCellState = {
    raw: string;
};

type CellsheetDerivedCellState = {
    display: string;
    kind: CellKind;
    authored: boolean;
    resultOf: string | null;
    error: string | null;
    relation: CellRelation;
};

type CellsheetOperationState = {
    op: Operator;
    direction: Direction;
    left: string;
    right: string;
    operator: string;
    target: string;
    result: string | number | null;
    error: string | null;
};

type CellsheetSummaryState = {
    authored: number;
    operators: number;
    results: number;
    errors: number;
};

type CellsheetState = {
    cells: Record<string, CellsheetCellState>;
    ui: {
        selected: string | null;
    };
    derived: {
        cells: Record<string, CellsheetDerivedCellState>;
        operations: Record<string, CellsheetOperationState>;
        summary: CellsheetSummaryState;
    };
};

export type CellsheetPanel = Readonly<{
    branch: LiveTree;
    reset: () => void;
}>;

const ROWS = 8;
const COLS = 8;
const OPERATORS = new Set<string>(["+", "-", "*", "/"]);
const MAX_EVALUATION_PASSES = ROWS * COLS;

function cell_key(row: number, col: number): string {
    return `${String.fromCharCode(65 + col)}${row + 1}`;
}

function create_initial_cellsheet_state(): CellsheetState {
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

const PANELcss: CssMap = {
    display: "grid",
    gap: "1rem",
    alignContent: "start",
    minHeight: "100%",
    color: _colors.txt.code,
};

const HEADERcss: CssMap = {
    display: "grid",
    gap: "0.25rem",
};

const TITLEcss: CssMap = {
    fontSize: "0.9rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
};

const SUBTITLEcss: CssMap = {
    maxWidth: "64ch",
    fontSize: "0.72rem",
    lineHeight: "1.45",
    opacity: "0.74",
};

const BODYcss: CssMap = {
    display: "grid",
    gridTemplateColumns: "minmax(0, max-content) minmax(14rem, 1fr)",
    gap: "1rem",
    alignItems: "start",
};

const GRIDcss: CssMap = {
    display: "grid",
    gridTemplateColumns: `repeat(${COLS}, minmax(3.1rem, 4.5rem))`,
    gap: "0.25rem",
    padding: "0.35rem",
    border: "1px solid currentColor",
};

const CELLcss: CssMap = {
    width: "100%",
    minWidth: "0",
    height: "2.35rem",
    boxSizing: "border-box",
    border: "1px solid currentColor",
    borderWidth: "1px",
    borderStyle: "solid",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "0.78rem",
    fontWeight: "400",
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "center",
    outline: "1px solid transparent",
    outlineOffset: "-1px",
    opacity: "0.88",
};

const SIDEBARcss: CssMap = {
    display: "grid",
    gap: "0.75rem",
    alignContent: "start",
    minWidth: "14rem",
};

const CARDcss: CssMap = {
    display: "grid",
    gap: "0.35rem",
    padding: "0.7rem",
    border: "1px solid currentColor",
};

const LABELcss: CssMap = {
    fontSize: "0.68rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    opacity: "0.72",
};

const METAcss: CssMap = {
    fontSize: "0.75rem",
    lineHeight: "1.35",
    opacity: "0.88",
};

const RESETcss: CssMap = {
    border: "1px solid currentColor",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "0.72rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "0.55rem 0.75rem",
    cursor: "pointer",
};

function hide_panel(): string {
    return $PANEL_HIDDEN;
}

function is_operator(value: string): value is Operator {
    return OPERATORS.has(value);
}

function normalize_raw(raw: string): string {
    return raw.trim();
}

function is_record(value: unknown): value is Record<string, unknown> {
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

function value_text(value: string | number | undefined): string {
    if (value === undefined) return "";
    return String(value);
}


function can_receive_result(cell: CellModel): boolean {
    return !cell.authored || cell.kind === "result";
}

function result_target_error(operation: OperationModel): string | undefined {
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

function render_cell_from_derived(cell: CellModel, derived: CellsheetDerivedCellState): void {
    if (!cell.input) return;

    cell.input.form.setValue(derived.display, { silent: true });
    cell.input.attr.set("data-cellsheet-cell", derived.kind);
    cell.input.attr.set("data-cellsheet-relation", derived.relation);
    cell.input.css.setMany(css_for_cell_state(derived));
}

function apply_authored_raw(cell: CellModel, raw: string): void {
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

function reset_derived_state(cells: readonly CellModel[]): void {
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

function compute_result(op: Operator, left: CellModel, right: CellModel): string | number | undefined {
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

function operation_error(op: Operator, left: CellModel, right: CellModel, result: string | number | undefined): string | undefined {
    if (left.value === undefined || right.value === undefined) return "missing operand";
    if (result === undefined) {
        if (op === "/" && right.value === 0) return "division by zero";
        return `${op} needs numbers`;
    }
    return undefined;
}

function derived_cell_from_model(cell: CellModel): CellsheetDerivedCellState {
    return {
        display: cell.display,
        kind: cell_status(cell),
        authored: cell.authored,
        resultOf: cell.resultOf ?? null,
        error: cell.error ?? null,
        relation: cell.relation,
    };
}

function operation_state_from_model(operation: OperationModel): CellsheetOperationState {
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

function summary_state_from_models(cells: readonly CellModel[], operations: readonly OperationModel[]): CellsheetSummaryState {
    return {
        authored: cells.filter((cell) => cell.authored).length,
        operators: operations.length,
        results: cells.filter((cell) => cell.kind === "result").length,
        errors: cells.filter((cell) => cell.error).length,
    };
}

function read_selected_from_snap(snap: unknown): string | undefined {
    if (!is_record(snap)) return undefined;
    if (!is_record(snap.ui)) return undefined;
    return typeof snap.ui.selected === "string" ? snap.ui.selected : undefined;
}

function read_summary_from_snap(snap: unknown): CellsheetSummaryState {
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

function read_derived_cell_from_snap(snap: unknown, key: string): CellsheetDerivedCellState | undefined {
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

function mark_related_cell(cell: CellModel, relation: CellRelation): void {
    if (cell.relation === "selected") return;
    if (cell.relation === "blocked") return;
    cell.relation = relation;
}

function model_value_changed(cell: CellModel, operation: OperationModel): boolean {
    return cell.kind !== "result"
        || cell.value !== operation.result
        || cell.display !== value_text(operation.result)
        || cell.resultOf !== operation.key;
}

function remember_operation_once(operations: OperationModel[], seen: Set<string>, operation: OperationModel): void {
    if (seen.has(operation.key)) {
        const index = operations.findIndex((row) => row.key === operation.key);
        if (index >= 0) operations[index] = operation;
        return;
    }

    seen.add(operation.key);
    operations.push(operation);
}

export function create_cellsheet_panel(stage: LiveTree): CellsheetPanel {
    const cells: CellModel[] = [];
    const operations: OperationModel[] = [];
    const map = hson.liveMap.fromJson(create_initial_cellsheet_state());

    const branch = stage.create.div()
        .id.set("cellsheet-panel")
        .css.setMany(PANELcss);

    const header = branch.create.div().css.setMany(HEADERcss);
    header.create.div().text.set("cellsheet").css.setMany(TITLEcss);
    header.create.div()
        .text.set("A small reactive operator grid. Type values into cells, then place + - * or / between adjacent cells. The result appears one cell past the second operand, unless that cell is already occupied.")
        .css.setMany(SUBTITLEcss);

    const body = branch.create.div().css.setMany(BODYcss);
    const grid = body.create.div().css.setMany(GRIDcss);
    const sidebar = body.create.div().css.setMany(SIDEBARcss);

    const statusCard = sidebar.create.div().css.setMany(CARDcss);
    statusCard.create.div().text.set("state").css.setMany(LABELcss);
    const statusText = statusCard.create.div().css.setMany(METAcss);

    const helpCard = sidebar.create.div().css.setMany(CARDcss);
    helpCard.create.div().text.set("rules").css.setMany(LABELcss);
    helpCard.create.div()
        .text.set("+ can add numbers or join strings. - * / only operate on numbers. Operators look left/right first, then up/down. Select a cell to reveal the operation it participates in.")
        .css.setMany(METAcss);

    const resetButton = sidebar.create.button().css.setMany(RESETcss);
    resetButton.text.set("reset grid");

    const getCell = (row: number, col: number): CellModel | undefined => {
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return undefined;
        return cells[(row * COLS) + col];
    };

    const getCellByKey = (key: string): CellModel | undefined => {
        return cells.find((cell) => cell.key === key);
    };

    const readRawFromSnap = (snap: unknown, key: string): string => {
        if (!is_record(snap)) return "";

        const cellRoot = snap.cells;
        if (!is_record(cellRoot)) return "";

        const entry = cellRoot[key];
        if (!is_record(entry)) return "";

        return typeof entry.raw === "string" ? entry.raw : "";
    };

    const writeRawToMap = (key: string, raw: string): void => {
        map.set(["cells", key, "raw"], raw);
    };

    const selectCell = (key: string): void => {
        map.set(["ui", "selected"], key);
        evaluate();
    };

    const syncAuthoredFromSnap = (snap: unknown): void => {
        for (const cell of cells) apply_authored_raw(cell, readRawFromSnap(snap, cell.key));
    };

    const writeDerivedToMap = (): void => {
        const derivedCells: Record<string, CellsheetDerivedCellState> = {};
        const derivedOperations: Record<string, CellsheetOperationState> = {};

        for (const cell of cells) derivedCells[cell.key] = derived_cell_from_model(cell);
        for (const operation of operations) derivedOperations[operation.key] = operation_state_from_model(operation);

        const summary = summary_state_from_models(cells, operations);

        map.batch((tx) => {
            tx.set(["derived", "cells"], derivedCells);
            tx.set(["derived", "operations"], derivedOperations);
            tx.set(["derived", "summary"], summary);
        });
    };

    const renderStatusFromMap = (snap: unknown): void => {
        const summary = read_summary_from_snap(snap);
        statusText.text.set(`${summary.authored} authored / ${summary.operators} operators / ${summary.results} results / ${summary.errors} errors`);
    };

    const renderFromMap = (): void => {
        const snap = map.snap();
        for (const cell of cells) {
            const derived = read_derived_cell_from_snap(snap, cell.key);
            if (derived) render_cell_from_derived(cell, derived);
        }
        renderStatusFromMap(snap);
    };

    const findOperation = (operator: CellModel): OperationModel | undefined => {
        const op = operator.value;
        if (!is_operator(String(op))) return undefined;

        const left = getCell(operator.row, operator.col - 1);
        const right = getCell(operator.row, operator.col + 1);
        const horizontalTarget = getCell(operator.row, operator.col + 2);
        if (left && right && horizontalTarget && left.value !== undefined && right.value !== undefined) {
            const result = compute_result(op as Operator, left, right);
            return {
                key: `${operator.key}:h`,
                op: op as Operator,
                direction: "horizontal",
                left,
                right,
                operator,
                target: horizontalTarget,
                result,
                error: operation_error(op as Operator, left, right, result),
            };
        }

        const top = getCell(operator.row - 1, operator.col);
        const bottom = getCell(operator.row + 1, operator.col);
        const verticalTarget = getCell(operator.row + 2, operator.col);
        if (top && bottom && verticalTarget && top.value !== undefined && bottom.value !== undefined) {
            const result = compute_result(op as Operator, top, bottom);
            return {
                key: `${operator.key}:v`,
                op: op as Operator,
                direction: "vertical",
                left: top,
                right: bottom,
                operator,
                target: verticalTarget,
                result,
                error: operation_error(op as Operator, top, bottom, result),
            };
        }

        return undefined;
    };

    const applySelectionRelations = (selectedKey: string | undefined): void => {
        if (!selectedKey) return;

        const selectedCell = getCellByKey(selectedKey);
        if (selectedCell) selectedCell.relation = "selected";

        for (const operation of operations) {
            const touchesOperation = operation.left.key === selectedKey
                || operation.right.key === selectedKey
                || operation.operator.key === selectedKey
                || operation.target.key === selectedKey;

            if (!touchesOperation) continue;

            mark_related_cell(operation.left, "operand");
            mark_related_cell(operation.right, "operand");
            mark_related_cell(operation.operator, "operator");
            mark_related_cell(operation.target, operation.target.error ? "blocked" : "target");
        }
    };

    const evaluate = (): void => {
        const snap = map.snap();
        const selectedKey = read_selected_from_snap(snap);
        operations.length = 0;
        syncAuthoredFromSnap(snap);
        reset_derived_state(cells);

        const seenOperations = new Set<string>();

        for (let pass = 0; pass < MAX_EVALUATION_PASSES; pass += 1) {
            let changed = false;

            for (const operator of cells) {
                if (operator.kind !== "operator") continue;

                const operation = findOperation(operator);
                if (!operation) continue;
                remember_operation_once(operations, seenOperations, operation);

                if (operation.error) {
                    operation.operator.error = operation.error;
                    continue;
                }

                const targetError = result_target_error(operation);
                if (targetError) {
                    operation.error = targetError;
                    operation.operator.error = targetError;
                    operation.target.error = targetError;
                    continue;
                }

                if (model_value_changed(operation.target, operation)) changed = true;
                operation.target.kind = "result";
                operation.target.value = operation.result;
                operation.target.display = value_text(operation.result);
                operation.target.resultOf = operation.key;
            }

            if (!changed) break;
        }

        applySelectionRelations(selectedKey);
        writeDerivedToMap();
        renderFromMap();
    };

    const reset = (): void => {
        map.batch((tx) => {
            tx.set(["ui", "selected"], null);
            for (const cell of cells) tx.set(["cells", cell.key, "raw"], "");
        });
        evaluate();
    };

    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            const key = cell_key(row, col);
            const cell: CellModel = {
                row,
                col,
                key,
                raw: "",
                display: "",
                value: undefined,
                kind: "blank",
                authored: false,
                resultOf: undefined,
                error: undefined,
                relation: "none",
                input: undefined,
            };

            const input = grid.create.input();
            input.attr.set("aria-label", key);
            input.attr.set("data-cellsheet-key", key);
            input.css.setMany(CELLcss);
            input.listen.on("focus", () => {
                selectCell(cell.key);
            });
            input.listen.on("input", () => {
                writeRawToMap(cell.key, input.form.getValue() ?? "");
                evaluate();
            });

            cell.input = input;
            cells.push(cell);
        }
    }

    resetButton.listen.onClick(reset);

    const seed = (row: number, col: number, raw: string): void => {
        const cell = getCell(row, col);
        if (!cell) return;
        writeRawToMap(cell.key, raw);
    };

    seed(0, 0, "1");
    seed(0, 1, "+");
    seed(0, 2, "2");
    seed(2, 0, "egg");
    seed(2, 1, "+");
    seed(2, 2, "shell");
    seed(4, 3, "8");
    seed(5, 3, "/");
    seed(6, 3, "2");

    evaluate();

    return { branch, reset };
}
