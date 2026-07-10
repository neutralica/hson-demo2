// cellsheet.ts

import { bind_paths, derive_from_paths, hson, make_microtask_scheduler, type LiveTree } from "hson-live";
import type { CellsheetDerivedCellState, Operator, CellModel, OperationModel, CellsheetOperationState, CellsheetPanel } from "./cellsheet.types";
import { CELLcss, PANELcss, HEADERcss, TITLEcss, SUBTITLEcss, BODYcss, GRIDcss, CARDcss, LABELcss, METAcss, RESETcss, FOOTERcss, RESIZE_EDGE, SEL_EDGE, AUTH_TEXT, DER_TEXT, OPERATOR_COLOR, ERR_TEXT, RELAT_EDGE, BORDER, DER_BORDER, ERR_BORDER } from "./cellsheet.css";
import { create_initial_cellsheet_state, ROWS, COLS, is_record, apply_authored_raw, derived_cell_from_model, operation_state_from_model, summary_state_from_models, read_summary_from_snap, read_derived_cell_from_snap, read_operations_from_snap, operation_touches_cell, format_operation_state, render_cell_from_derived, is_operator, compute_result, operation_error, mark_related_cell, read_selected_from_snap, reset_derived_state, MAX_EVALUATION_PASSES, remember_operation_once, result_target_error, model_value_changed, value_text, cell_key } from "./cellsheet-helpers";

export function create_cellsheet_panel(stage: LiveTree): CellsheetPanel {
    const cells: CellModel[] = [];
    const operations: OperationModel[] = [];
    const map = hson.liveMap.fromJson(create_initial_cellsheet_state());
    const disposers: Array<() => void> = [];
    let activeResizeCleanup: (() => void) | undefined;
    let activeResizeTarget: HTMLElement | undefined;
    let disposed = false;

    const DEFAULT_COL_WIDTH = 56;
    const DEFAULT_ROW_HEIGHT = 34;
    const MIN_COL_WIDTH = 34;
    const MAX_COL_WIDTH = 140;
    const MIN_ROW_HEIGHT = 26;
    const MAX_ROW_HEIGHT = 96;
    const RESIZE_EDGE_PX = 7;
    const RESIZE_EDGE_COLOR = RESIZE_EDGE;

    type ResizeEdge = "left" | "right" | "top" | "bottom";

    type ResizeAxis = "col" | "row";

    type ResizeTarget = {
        axis: ResizeAxis;
        index: number;
        neighborIndex: number | undefined;
        sign: 1 | -1;
    };

    const branch = stage.create.div()
        .id.set("cellsheet-panel")
        .css.setMany(PANELcss);

    const header = branch.create.div().css.setMany(HEADERcss);
    header.create.div().text.set("cellsheet").css.setMany(TITLEcss);
    header.create.div()
        .text.set("A small reactive operator grid.\n• type values into cells\n• place + - * or / between adjacent cells\n• drag cell edges to resize rows and columns\n• hold shift while dragging to take space from the neighbor")
        .css.setMany(SUBTITLEcss);

    const body = branch.create.div().css.setMany(BODYcss);
    const grid = body.create.div().css.setMany(GRIDcss).css.setMany({
        width: "fit-content",
        maxWidth: "100%",
    });

    const footer = branch.create.div().css.setMany(FOOTERcss);
    const footerCards = footer.create.div().css.setMany({
        display: "grid",
        gridTemplateColumns: "minmax(0, 0.86fr) minmax(0, 1.14fr)",
        gap: "0.75rem",
        minWidth: "0",
    });
    const footerActions = footer.create.div().css.setMany({
        display: "grid",
        alignContent: "stretch",
        minWidth: "9rem",
    });

    const statusCard = footerCards.create.div().css.setMany(CARDcss).css.setMany({
        borderColor: BORDER,
    });
    statusCard.create.div().text.set("state").css.setMany(LABELcss).css.setMany({ color: OPERATOR_COLOR });
    const statusText = statusCard.create.div().css.setMany(METAcss).css.setMany({ color: DER_TEXT });

    const selectionCard = footerCards.create.div().css.setMany(CARDcss).css.setMany({
        borderColor: SEL_EDGE,
        boxShadow: `inset 0 0 0 1px ${RELAT_EDGE}`,
    });
    selectionCard.create.div().text.set("selection").css.setMany(LABELcss).css.setMany({ color: SEL_EDGE });
    const selectionText = selectionCard.create.div().css.setMany(METAcss).css.setMany({ color: AUTH_TEXT });

    const resetButton = footerActions.create.button().css.setMany(RESETcss).css.setMany({
        height: "100%",
        minHeight: "100%",
        paddingInline: "24px",
    });
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

    const clampDimension = (value: number, min: number, max: number): number => {
        return Math.max(min, Math.min(max, Math.round(value)));
    };

    const makeDimensionRecord = (count: number, value: number): Record<string, number> => {
        const out: Record<string, number> = {};
        for (let i = 0; i < count; i += 1) out[String(i)] = value;
        return out;
    };

    const readDimensionRecordFromSnap = (
        snap: unknown,
        key: "colWidths" | "rowHeights",
        count: number,
        fallback: number,
    ): number[] => {
        const out: number[] = [];
        const ui = is_record(snap) && is_record(snap.ui) ? snap.ui : undefined;
        const record = ui && is_record(ui[key]) ? ui[key] : undefined;

        for (let i = 0; i < count; i += 1) {
            const value = record?.[String(i)];
            out.push(typeof value === "number" && Number.isFinite(value) ? value : fallback);
        }

        return out;
    };

    const ensureDimensionState = (): void => {
        const snap = map.snap();
        if (!is_record(snap) || !is_record(snap.ui)) return;

        const ui = snap.ui;
        const nextUi: Record<string, unknown> = { ...ui };

        if (!is_record(ui.colWidths)) nextUi.colWidths = makeDimensionRecord(COLS, DEFAULT_COL_WIDTH);
        if (!is_record(ui.rowHeights)) nextUi.rowHeights = makeDimensionRecord(ROWS, DEFAULT_ROW_HEIGHT);

        if (nextUi.colWidths !== ui.colWidths || nextUi.rowHeights !== ui.rowHeights) {
            const uiHandle = map.at(["ui"]);
            uiHandle.replace(nextUi as Parameters<typeof uiHandle.replace>[0]);
        }
    };

    const renderGridDimensionsFromMap = (): void => {
        const snap = map.snap();
        const colWidths = readDimensionRecordFromSnap(snap, "colWidths", COLS, DEFAULT_COL_WIDTH);
        const rowHeights = readDimensionRecordFromSnap(snap, "rowHeights", ROWS, DEFAULT_ROW_HEIGHT);

        grid.css.setMany({
            gridTemplateColumns: colWidths.map((width) => `${width}px`).join(" "),
            gridTemplateRows: rowHeights.map((height) => `${height}px`).join(" "),
        });
    };

    const writeColumnWidthToMap = (col: number, width: number): void => {
        map.set(["ui", "colWidths", String(col)], clampDimension(width, MIN_COL_WIDTH, MAX_COL_WIDTH));
    };

    const writeRowHeightToMap = (row: number, height: number): void => {
        map.set(["ui", "rowHeights", String(row)], clampDimension(height, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT));
    };

    const writeResolvedColumnWidthToMap = (col: number, width: number): void => {
        map.set(["ui", "colWidths", String(col)], Math.round(width));
    };

    const writeResolvedRowHeightToMap = (row: number, height: number): void => {
        map.set(["ui", "rowHeights", String(row)], Math.round(height));
    };

    const startResize = (
        edge: ResizeEdge,
        target: ResizeTarget,
        startPointer: number,
        startSize: number,
        neighborStartSize: number | undefined,
        takeFromNeighbor: boolean,
    ): void => {
        activeResizeCleanup?.();

        const { axis, index, neighborIndex, sign } = target;
        const min = axis === "col" ? MIN_COL_WIDTH : MIN_ROW_HEIGHT;
        const max = axis === "col" ? MAX_COL_WIDTH : MAX_ROW_HEIGHT;
        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;
        const resizeTarget = activeResizeTarget;
        if (resizeTarget) setResizeEdgeHighlight(resizeTarget, edge, true);
        document.body.style.cursor = axis === "col" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";

        const writeMain = axis === "col" ? writeColumnWidthToMap : writeRowHeightToMap;
        const writeResolvedMain = axis === "col" ? writeResolvedColumnWidthToMap : writeResolvedRowHeightToMap;
        const writeResolvedNeighbor = axis === "col" ? writeResolvedColumnWidthToMap : writeResolvedRowHeightToMap;

        const onMove = (event: PointerEvent): void => {
            const pointer = axis === "col" ? event.clientX : event.clientY;
            const delta = (pointer - startPointer) * sign;

            if (takeFromNeighbor && neighborIndex !== undefined && neighborStartSize !== undefined) {
                const pairTotal = startSize + neighborStartSize;
                const minMainSize = min;
                const maxMainSize = pairTotal - min;
                const nextSize = clampDimension(startSize + delta, minMainSize, maxMainSize);
                const nextNeighborSize = pairTotal - nextSize;

                writeResolvedMain(index, nextSize);
                writeResolvedNeighbor(neighborIndex, nextNeighborSize);
                return;
            }

            const nextSize = clampDimension(startSize + delta, min, max);
            writeMain(index, nextSize);
        };

        const onEnd = (): void => {
            activeResizeCleanup?.();
        };

        activeResizeCleanup = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onEnd);
            document.removeEventListener("pointercancel", onEnd);
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            clearResizeEdgeHighlight(resizeTarget);
            if (activeResizeTarget === resizeTarget) activeResizeTarget = undefined;
            activeResizeCleanup = undefined;
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onEnd);
        document.addEventListener("pointercancel", onEnd);
    };

    const resizeEdgeForEvent = (target: HTMLElement, event: PointerEvent): ResizeEdge | undefined => {
        const rect = target.getBoundingClientRect();
        const candidates: Array<{ edge: ResizeEdge; distance: number }> = [
            { edge: "left", distance: event.clientX - rect.left },
            { edge: "right", distance: rect.right - event.clientX },
            { edge: "top", distance: event.clientY - rect.top },
            { edge: "bottom", distance: rect.bottom - event.clientY },
        ];
        const distances = candidates.filter((item) => item.distance >= 0 && item.distance <= RESIZE_EDGE_PX);

        distances.sort((a, b) => a.distance - b.distance);
        return distances[0]?.edge;
    };

    const cursorForResizeEdge = (edge: ResizeEdge | undefined): string => {
        if (edge === "left" || edge === "right") return "col-resize";
        if (edge === "top" || edge === "bottom") return "row-resize";
        return "text";
    };

    const shadowForResizeEdge = (edge: ResizeEdge, active: boolean): string => {
        const size = active ? 3 : 2;
        const blur = active ? 1 : 0;

        if (edge === "left") return `inset ${size}px 0 ${blur}px ${RESIZE_EDGE_COLOR}`;
        if (edge === "right") return `inset -${size}px 0 ${blur}px ${RESIZE_EDGE_COLOR}`;
        if (edge === "top") return `inset 0 ${size}px ${blur}px ${RESIZE_EDGE_COLOR}`;
        return `inset 0 -${size}px ${blur}px ${RESIZE_EDGE_COLOR}`;
    };

    const setResizeEdgeHighlight = (target: HTMLElement, edge: ResizeEdge | undefined, active: boolean = false): void => {
        target.style.boxShadow = edge ? shadowForResizeEdge(edge, active) : "";
    };

    const clearResizeEdgeHighlight = (target: HTMLElement | undefined): void => {
        if (target) target.style.boxShadow = "";
    };

    const renderCellColors = (cell: CellModel, derived: CellsheetDerivedCellState): void => {
        const input = cell.input;
        if (!input) return;

        const hasRelation = derived.relation !== "none";
        const textColor = derived.error
            ? ERR_TEXT
            : derived.kind === "result"
                ? DER_TEXT
                : derived.kind === "operator"
                    ? OPERATOR_COLOR
                    : AUTH_TEXT;
        const borderColor = derived.error
            ? ERR_BORDER
            : derived.kind === "result"
                ? DER_BORDER
                : hasRelation
                    ? RELAT_EDGE
                    : BORDER;
        const outlineColor = derived.relation === "selected"
            ? SEL_EDGE
            : hasRelation
                ? RELAT_EDGE
                : "transparent";

        input.css.setMany({
            color: textColor,
            borderColor,
            borderStyle: derived.kind === "result" ? "dashed" : "solid",
            outlineColor,
            boxShadow: derived.error ? `inset 0 0 0 1px ${ERR_TEXT}` : "none",
        });
    };

    const readGridDimensions = (): { colWidths: number[]; rowHeights: number[] } => {
        const snap = map.snap();
        return {
            colWidths: readDimensionRecordFromSnap(snap, "colWidths", COLS, DEFAULT_COL_WIDTH),
            rowHeights: readDimensionRecordFromSnap(snap, "rowHeights", ROWS, DEFAULT_ROW_HEIGHT),
        };
    };

    const resizeTargetForCellEdge = (cell: CellModel, edge: ResizeEdge): ResizeTarget => {
        if (edge === "left") {
            const index = cell.col > 0 ? cell.col - 1 : cell.col;
            return {
                axis: "col",
                index,
                neighborIndex: index < COLS - 1 ? index + 1 : undefined,
                sign: cell.col > 0 ? 1 : -1,
            };
        }

        if (edge === "right") {
            return {
                axis: "col",
                index: cell.col,
                neighborIndex: cell.col < COLS - 1 ? cell.col + 1 : undefined,
                sign: 1,
            };
        }

        if (edge === "top") {
            const index = cell.row > 0 ? cell.row - 1 : cell.row;
            return {
                axis: "row",
                index,
                neighborIndex: index < ROWS - 1 ? index + 1 : undefined,
                sign: cell.row > 0 ? 1 : -1,
            };
        }

        return {
            axis: "row",
            index: cell.row,
            neighborIndex: cell.row < ROWS - 1 ? cell.row + 1 : undefined,
            sign: 1,
        };
    };

    const maybeStartCellResize = (cell: CellModel, event: PointerEvent): boolean => {
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement)) return false;

        const edge = resizeEdgeForEvent(target, event);
        if (!edge) return false;

        event.preventDefault();
        event.stopPropagation();
        activeResizeTarget = target;
        setResizeEdgeHighlight(target, edge, true);

        const dimensions = readGridDimensions();
        const targetInfo = resizeTargetForCellEdge(cell, edge);
        const sizes = targetInfo.axis === "col" ? dimensions.colWidths : dimensions.rowHeights;
        const fallbackSize = targetInfo.axis === "col" ? DEFAULT_COL_WIDTH : DEFAULT_ROW_HEIGHT;
        const startSize = sizes[targetInfo.index] ?? fallbackSize;
        const neighborStartSize = event.shiftKey && targetInfo.neighborIndex !== undefined
            ? sizes[targetInfo.neighborIndex]
            : undefined;
        const startPointer = targetInfo.axis === "col" ? event.clientX : event.clientY;

        startResize(
            edge,
            targetInfo,
            startPointer,
            startSize,
            neighborStartSize,
            event.shiftKey,
        );
        return true;
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
        statusText.css.setMany({ color: summary.errors > 0 ? ERR_TEXT : DER_TEXT });
    };

    const renderSelectionFromMap = (snap: unknown): void => {
        const selectedKey = read_selected_from_snap(snap);
        if (!selectedKey) {
            selectionText.text.set("Select a cell to inspect its derived operation links.");
            selectionText.css.setMany({ color: AUTH_TEXT });
            return;
        }

        const operationsFromMap = read_operations_from_snap(snap);
        const touchedOperations = Object.values(operationsFromMap)
            .filter((operation) => operation_touches_cell(operation, selectedKey));

        if (touchedOperations.length === 0) {
            selectionText.text.set(`${selectedKey}: no derived operation links.`);
            selectionText.css.setMany({ color: AUTH_TEXT });
            return;
        }

        selectionText.text.set(`${selectedKey}\n${touchedOperations.map(format_operation_state).join("\n")}`);
        selectionText.css.setMany({
            color: touchedOperations.some((operation) => operation.error) ? ERR_TEXT : DER_TEXT,
        });
    };

    const renderFromMap = (): void => {
        const snap = map.snap();
        for (const cell of cells) {
            const derived = read_derived_cell_from_snap(snap, cell.key);
            if (derived) {
                render_cell_from_derived(cell, derived);
                renderCellColors(cell, derived);
            }
        }
        renderStatusFromMap(snap);
        renderSelectionFromMap(snap);
    };

    const operandsCanApplyOperator = (op: Operator, left: CellModel, right: CellModel): boolean => {
        if (left.value === undefined || right.value === undefined) return false;
        if (op === "+") return true;
        return typeof left.value === "number" && typeof right.value === "number";
    };

    const findOperations = (operator: CellModel): OperationModel[] => {
        const op = operator.value;
        if (!is_operator(String(op))) return [];

        const out: OperationModel[] = [];

        const left = getCell(operator.row, operator.col - 1);
        const right = getCell(operator.row, operator.col + 1);
        const horizontalTarget = getCell(operator.row, operator.col + 2);
        if (left && right && horizontalTarget && operandsCanApplyOperator(op as Operator, left, right)) {
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
        if (top && bottom && verticalTarget && operandsCanApplyOperator(op as Operator, top, bottom)) {
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
            tx.set(["ui", "colWidths"], makeDimensionRecord(COLS, DEFAULT_COL_WIDTH));
            tx.set(["ui", "rowHeights"], makeDimensionRecord(ROWS, DEFAULT_ROW_HEIGHT));
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
            input.css.setMany(CELLcss)
                .css.setMany({
                    width: "100%",
                    height: "100%",
                    inlineSize: "100%",
                    blockSize: "100%",
                    minWidth: "0",
                    minHeight: "0",
                    boxSizing: "border-box",
                    alignSelf: "stretch",
                    justifySelf: "stretch",
                });
            input.listen.on("focus", () => {
                selectCell(cell.key);
            });
            input.listen.on("input", () => {
                writeRawToMap(cell.key, input.form.getValue() ?? "");
            });
            input.listen.on("pointerdown", (event: PointerEvent) => {
                maybeStartCellResize(cell, event);
            });
            input.listen.on("pointermove", (event: PointerEvent) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLElement)) return;
                if (activeResizeTarget) return;

                const edge = resizeEdgeForEvent(target, event);
                target.style.cursor = cursorForResizeEdge(edge);
                setResizeEdgeHighlight(target, edge);
            });
            input.listen.on("pointerleave", (event: PointerEvent) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLElement)) return;
                if (activeResizeTarget === target) return;

                target.style.cursor = "text";
                clearResizeEdgeHighlight(target);
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

    ensureDimensionState();
    renderGridDimensionsFromMap();

    seed(0, 0, "1");
    seed(0, 1, "+");
    seed(0, 2, "2");
    seed(2, 0, "egg");
    seed(2, 1, "+");
    seed(2, 2, "shell");
    seed(4, 3, "8");
    seed(5, 3, "/");
    seed(6, 3, "2");

    const subscribePath = (path: string[], listener: () => void): (() => void) => {
        return map.sub.path(path, listener);
    };

    disposers.push(derive_from_paths({
        paths: [
            ["cells"],
            ["ui", "selected"],
        ],
        subscribePath,
        derive: () => {
            if (!disposed) evaluate();
        },
        schedule: make_microtask_scheduler,
        immediate: true,
    }));

    disposers.push(bind_paths({
        paths: [
            ["ui", "colWidths"],
            ["ui", "rowHeights"],
        ],
        subscribePath,
        read: () => undefined,
        render: () => {
            renderGridDimensionsFromMap();
        },
        schedule: make_microtask_scheduler,
        immediate: true,
    }));

    const dispose = (): void => {
        disposed = true;
        activeResizeCleanup?.();
        clearResizeEdgeHighlight(activeResizeTarget);
        activeResizeTarget = undefined;
        for (const stop of disposers.splice(0)) stop();
    };

    const panel = { branch, reset, dispose };
    return panel;
}
