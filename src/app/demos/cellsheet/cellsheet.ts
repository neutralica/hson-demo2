// cellsheet.ts

import { hson, type LiveTree } from "hson-live";
import { $PANEL_HIDDEN } from "../../core/consts/ui-consts";
import type { CssMap } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";

type Operator = "+" | "-" | "*" | "/";
type CellKind = "blank" | "text" | "number" | "operator" | "result" | "error";
type Direction = "horizontal" | "vertical";

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

type CellsheetState = {
    cells: Record<string, CellsheetCellState>;
};

export type CellsheetPanel = Readonly<{
    branch: LiveTree;
    reset: () => void;
}>;

const ROWS = 8;
const COLS = 8;
const OPERATORS = new Set<string>(["+", "-", "*", "/"]);

function create_initial_cellsheet_state(): CellsheetState {
    const cells: Record<string, CellsheetCellState> = {};
    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            cells[cell_key(row, col)] = { raw: "" };
        }
    }
    return { cells };
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
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "0.78rem",
    textAlign: "center",
    outline: "none",
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

function cell_key(row: number, col: number): string {
    return `${String.fromCharCode(65 + col)}${row + 1}`;
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

function cell_status(cell: CellModel): string {
    if (cell.error) return "error";
    return cell.kind;
}

function apply_cell_style(cell: CellModel): void {
    if (!cell.input) return;

    const status = cell_status(cell);
    cell.input.attr.set("data-cellsheet-cell", status);

    const css: CssMap = {
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
        borderStyle: cell.resultOf ? "dashed" : "solid",
    };

    cell.input.css.setMany(css);
}

function apply_display(cell: CellModel): void {
    if (!cell.input) return;
    cell.input.form.setValue(cell.display, { silent: true });
    apply_cell_style(cell);
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
        .text.set("+ can add numbers or join strings. - * / only operate on numbers. Operators look left/right first, then up/down. Result conflicts are marked as errors.")
        .css.setMany(METAcss);

    const resetButton = sidebar.create.button().css.setMany(RESETcss);
    resetButton.text.set("reset grid");

    const getCell = (row: number, col: number): CellModel | undefined => {
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return undefined;
        return cells[(row * COLS) + col];
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

    const syncAuthoredFromSnap = (snap: unknown): void => {
        for (const cell of cells) apply_authored_raw(cell, readRawFromSnap(snap, cell.key));
    };

    const renderStatus = (): void => {
        const authoredCount = cells.filter((cell) => cell.authored).length;
        const resultCount = cells.filter((cell) => cell.kind === "result").length;
        const errorCount = cells.filter((cell) => cell.error).length;
        const opCount = operations.length;
        statusText.text.set(`${authoredCount} authored / ${opCount} operators / ${resultCount} results / ${errorCount} errors`);
    };

    const applyAll = (): void => {
        for (const cell of cells) apply_display(cell);
        renderStatus();
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

    const evaluate = (): void => {
        const snap = map.snap();
        operations.length = 0;
        syncAuthoredFromSnap(snap);
        reset_derived_state(cells);

        for (const operator of cells) {
            if (operator.kind !== "operator") continue;

            const operation = findOperation(operator);
            if (!operation) continue;
            operations.push(operation);

            if (operation.error) {
                operation.operator.error = operation.error;
                continue;
            }

            if (!can_receive_result(operation.target)) {
                operation.target.error = `occupied result target for ${operation.operator.key}`;
                continue;
            }

            operation.target.kind = "result";
            operation.target.value = operation.result;
            operation.target.display = value_text(operation.result);
            operation.target.resultOf = operation.key;
        }

        applyAll();
    };

    const reset = (): void => {
        map.batch((tx) => {
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
                input: undefined,
            };

            const input = grid.create.input();
            input.attr.set("aria-label", key);
            input.attr.set("data-cellsheet-key", key);
            input.css.setMany(CELLcss);
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
