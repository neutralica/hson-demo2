// cellsheet.ts

import type { CellViewModel, CellsheetDimensionTuple, CellsheetPanel } from "./cellsheet.types";
import { CELLcss, PANELcss, HEADERcss, TITLEcss, SUBTITLEcss, BODYcss, GRIDcss, CARDcss, LABELcss, METAcss, RESETcss, FOOTERcss, RESIZE_EDGE, SEL_EDGE, AUTH_TEXT, DER_TEXT, OPERATOR_COLOR, ERR_TEXT, RELAT_EDGE, BORDER, DER_BORDER, ERR_BORDER } from "./cellsheet.css";
import { ROWS, COLS, project_cell, project_cell_relation, cell_key } from "./cellsheet-helpers";
import {
    cellsheet_cell_ref,
    derive_cellsheet_relations,
    evaluate_cellsheet,
    type CellRelation,
    type CellsheetCellRef,
    type CellsheetEvaluatedCell,
    type CellsheetEvaluation,
    type CellsheetRelationships,
} from "./cellsheet-evaluator";
import {
    create_cellsheet_workbook_store,
    create_empty_cellsheet_workbook,
} from "./cellsheet.state";
import type { LiveTree } from "hson-live/livetree";

export function create_cellsheet_panel(stage: LiveTree): CellsheetPanel {
    const cells: CellViewModel[] = [];
    const workbook = create_cellsheet_workbook_store();
    const workbookCells = workbook.locations.cells;
    const listenerDisposers: Array<() => void> = [];
    let activeResizeCleanup: (() => void) | undefined;
    let activeResizeTarget: HTMLElement | undefined;
    let disposed = false;
    let selected: CellsheetCellRef | undefined;

    const DEFAULT_COL_WIDTH = 56;
    const DEFAULT_ROW_HEIGHT = 34;
    const MIN_COL_WIDTH = 34;
    const MAX_COL_WIDTH = 140;
    const MIN_ROW_HEIGHT = 26;
    const MAX_ROW_HEIGHT = 96;
    const RESIZE_EDGE_PX = 7;
    const RESIZE_EDGE_COLOR = RESIZE_EDGE;
    const defaultColumnWidths = (): CellsheetDimensionTuple => [
        DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH,
        DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH,
    ];
    const defaultRowHeights = (): CellsheetDimensionTuple => [
        DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT,
        DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT,
    ];
    let colWidths = defaultColumnWidths();
    let rowHeights = defaultRowHeights();

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

    const clampDimension = (value: number, min: number, max: number): number => {
        return Math.max(min, Math.min(max, Math.round(value)));
    };

    const projectGridDimensions = (): void => {
        grid.css.setMany({
            gridTemplateColumns: colWidths.map((width) => `${width}px`).join(" "),
            gridTemplateRows: rowHeights.map((height) => `${height}px`).join(" "),
        });
    };

    const writeColumnWidth = (col: number, width: number): void => {
        colWidths[col] = clampDimension(width, MIN_COL_WIDTH, MAX_COL_WIDTH);
        projectGridDimensions();
    };

    const writeRowHeight = (row: number, height: number): void => {
        rowHeights[row] = clampDimension(height, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT);
        projectGridDimensions();
    };

    const writeResolvedColumnWidth = (col: number, width: number): void => {
        colWidths[col] = Math.round(width);
        projectGridDimensions();
    };

    const writeResolvedRowHeight = (row: number, height: number): void => {
        rowHeights[row] = Math.round(height);
        projectGridDimensions();
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

        const writeMain = axis === "col" ? writeColumnWidth : writeRowHeight;
        const writeResolvedMain = axis === "col" ? writeResolvedColumnWidth : writeResolvedRowHeight;
        const writeResolvedNeighbor = axis === "col" ? writeResolvedColumnWidth : writeResolvedRowHeight;

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

    const renderCellColors = (
        cell: CellViewModel,
        evaluated: CellsheetEvaluatedCell,
        relation: CellRelation,
    ): void => {
        const input = cell.input;

        const hasRelation = relation !== "none";
        const textColor = evaluated.error
            ? ERR_TEXT
            : evaluated.kind === "result"
                ? DER_TEXT
                : evaluated.kind === "operator"
                    ? OPERATOR_COLOR
                    : AUTH_TEXT;
        const borderColor = evaluated.error
            ? ERR_BORDER
            : evaluated.kind === "result"
                ? DER_BORDER
                : hasRelation
                    ? RELAT_EDGE
                    : BORDER;
        const outlineColor = relation === "selected"
            ? SEL_EDGE
            : hasRelation
                ? RELAT_EDGE
                : "transparent";

        input.css.setMany({
            color: textColor,
            borderColor,
            borderStyle: evaluated.kind === "result" ? "dashed" : "solid",
            outlineColor,
            boxShadow: evaluated.error ? `inset 0 0 0 1px ${ERR_TEXT}` : "none",
        });
    };

    const readGridDimensions = (): { colWidths: CellsheetDimensionTuple; rowHeights: CellsheetDimensionTuple } => {
        return { colWidths, rowHeights };
    };

    const resizeTargetForCellEdge = (cell: CellViewModel, edge: ResizeEdge): ResizeTarget => {
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

    const maybeStartCellResize = (cell: CellViewModel, event: PointerEvent): boolean => {
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

    let evaluation: CellsheetEvaluation = evaluate_cellsheet(workbookCells.snap());

    const renderStatus = (): void => {
        const summary = evaluation.summary;
        statusText.text.set(`${summary.authored} authored / ${summary.operations} operators / ${summary.results} results / ${summary.errors} errors`);
        statusText.css.setMany({ color: summary.errors > 0 ? ERR_TEXT : DER_TEXT });
    };

    const renderSelection = (relationships: CellsheetRelationships): void => {
        selectionText.text.set(relationships.selectionText);
        selectionText.css.setMany({
            color: relationships.selectionHasError
                ? ERR_TEXT
                : relationships.touchedOperations.length > 0
                    ? DER_TEXT
                    : AUTH_TEXT,
        });
    };

    const project = (): void => {
        const relationships = derive_cellsheet_relations(evaluation, selected);
        for (const cell of cells) {
            const evaluated = evaluation.cells[cell.row]?.[cell.col];
            if (!evaluated) continue;
            const relation = relationships.relations[cell.row]?.[cell.col] ?? "none";
            project_cell(cell, evaluated, relation);
            renderCellColors(cell, evaluated, relation);
        }
        renderStatus();
        renderSelection(relationships);
    };

    const projectSelectionOnly = (): void => {
        const relationships = derive_cellsheet_relations(evaluation, selected);
        for (const cell of cells) {
            const evaluated = evaluation.cells[cell.row]?.[cell.col];
            if (!evaluated) continue;
            const relation = relationships.relations[cell.row]?.[cell.col] ?? "none";
            project_cell_relation(cell, evaluated, relation);
            renderCellColors(cell, evaluated, relation);
        }
        renderSelection(relationships);
    };

    const reset = (): void => {
        activeResizeCleanup?.();
        selected = undefined;
        colWidths = defaultColumnWidths();
        rowHeights = defaultRowHeights();
        projectGridDimensions();
        const commit = workbookCells.replace(create_empty_cellsheet_workbook().cells);
        if (!commit.changed) project();
    };

    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            const key = cell_key(row, col);
            const input = grid.create.input();
            const rawCell = workbookCells.at([row, col]);
            const cell: CellViewModel = {
                row,
                col,
                key,
                input,
            };
            input.attrs.set("aria-label", key);
            input.attrs.set("data-cellsheet-key", key);
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
            const focusListener = input.listen.on("focus", () => {
                selected = cellsheet_cell_ref(cell.row, cell.col);
                projectSelectionOnly();
            });
            const inputListener = input.listen.on("input", () => {
                rawCell.set(input.form.getValue() ?? "");
            });
            const pointerDownListener = input.listen.on("pointerdown", (event: PointerEvent) => {
                maybeStartCellResize(cell, event);
            });
            const pointerMoveListener = input.listen.on("pointermove", (event: PointerEvent) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLElement)) return;
                if (activeResizeTarget) return;

                const edge = resizeEdgeForEvent(target, event);
                target.style.cursor = cursorForResizeEdge(edge);
                setResizeEdgeHighlight(target, edge);
            });
            const pointerLeaveListener = input.listen.on("pointerleave", (event: PointerEvent) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLElement)) return;
                if (activeResizeTarget === target) return;

                target.style.cursor = "text";
                clearResizeEdgeHighlight(target);
            });
            listenerDisposers.push(
                () => focusListener.off(),
                () => inputListener.off(),
                () => pointerDownListener.off(),
                () => pointerMoveListener.off(),
                () => pointerLeaveListener.off(),
            );

            cells.push(cell);
        }
    }

    const resetListener = resetButton.listen.onClick(reset);
    listenerDisposers.push(() => resetListener.off());

    projectGridDimensions();
    project();

    const stopCells = workbookCells.watch((nextCells) => {
        if (disposed) return;
        evaluation = evaluate_cellsheet(nextCells);
        project();
    });

    const deactivate = (): void => {
        activeResizeCleanup?.();
        clearResizeEdgeHighlight(activeResizeTarget);
        activeResizeTarget = undefined;
    };

    const dispose = (): void => {
        if (disposed) return;
        disposed = true;
        stopCells();
        deactivate();
        for (const stop of listenerDisposers.splice(0)) stop();
        if (!branch.isDisposed) branch.remove();
    };

    const panel = { branch, reset, deactivate, dispose };
    return panel;
}
