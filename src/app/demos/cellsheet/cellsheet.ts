// cellsheet.ts

import { hson, type LiveTree } from "hson-live";
import type { CellsheetDerivedCellState, Operator, CellModel, OperationModel, CellsheetOperationState, CellsheetPanel } from "./cellsheet.types";
import { CELLcss, PANELcss, HEADERcss, TITLEcss, SUBTITLEcss, BODYcss, GRIDcss, SIDEBARcss, CARDcss, LABELcss, METAcss, RESETcss } from "./cellsheet.css";
import { create_initial_cellsheet_state, ROWS, COLS, is_record, apply_authored_raw, derived_cell_from_model, operation_state_from_model, summary_state_from_models, read_summary_from_snap, read_derived_cell_from_snap, render_cell_from_derived, is_operator, compute_result, operation_error, mark_related_cell, read_selected_from_snap, reset_derived_state, MAX_EVALUATION_PASSES, remember_operation_once, result_target_error, model_value_changed, value_text, cell_key } from "./cellsheet-helpers";

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

    const findOperations = (operator: CellModel): OperationModel[] => {
        const op = operator.value;
        if (!is_operator(String(op))) return [];

        const out: OperationModel[] = [];

        const left = getCell(operator.row, operator.col - 1);
        const right = getCell(operator.row, operator.col + 1);
        const horizontalTarget = getCell(operator.row, operator.col + 2);
        if (left && right && horizontalTarget && left.value !== undefined && right.value !== undefined) {
            const result = compute_result(op as Operator, left, right);
            out.push({
                key: `${operator.key}:h`,
                op: op as Operator,
                direction: "horizontal",
                left,
                right,
                operator,
                target: horizontalTarget,
                result,
                error: operation_error(op as Operator, left, right, result),
            });
        }

        const top = getCell(operator.row - 1, operator.col);
        const bottom = getCell(operator.row + 1, operator.col);
        const verticalTarget = getCell(operator.row + 2, operator.col);
        if (top && bottom && verticalTarget && top.value !== undefined && bottom.value !== undefined) {
            const result = compute_result(op as Operator, top, bottom);
            out.push({
                key: `${operator.key}:v`,
                op: op as Operator,
                direction: "vertical",
                left: top,
                right: bottom,
                operator,
                target: verticalTarget,
                result,
                error: operation_error(op as Operator, top, bottom, result),
            });
        }

        return out;
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

                for (const operation of findOperations(operator)) {
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

    // Debounced evaluation logic
    let evaluateQueued = false;

    const scheduleEvaluate = (): void => {
        if (evaluateQueued) return;
        evaluateQueued = true;

        queueMicrotask(() => {
            evaluateQueued = false;
            evaluate();
        });
    };

    map.sub.path(["cells"], scheduleEvaluate);
    map.sub.path(["ui", "selected"], scheduleEvaluate);

    scheduleEvaluate();

    return { branch, reset };
}
