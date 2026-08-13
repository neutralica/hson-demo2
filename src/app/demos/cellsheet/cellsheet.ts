// cellsheet.ts

import { CELLcss, PANELcss, HEADERcss, TITLEcss, SUBTITLEcss, BODYcss, GRIDcss, CARDcss, LABELcss, METAcss, RESETcss, FOOTERcss, RESIZE_EDGE, SEL_EDGE, AUTH_TEXT, DER_TEXT, OPERATOR_COLOR, ERR_TEXT, RELAT_EDGE, BORDER, DER_BORDER, ERR_BORDER } from "./cellsheet.css";
import {
    ROWS,
    COLS,
    cell_key,
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

type CellsheetDimensionTuple = [number, number, number, number, number, number, number, number];

type CellViewModel = Readonly<{
    row: number;
    col: number;
    input: LiveTree;
}>;

type CellsheetPanel = Readonly<{
    branch: LiveTree;
    reset: () => void;
    activate: () => void;
    deactivate: () => void;
    dispose: () => void;
}>;

export function create_cellsheet_panel(stage: LiveTree): CellsheetPanel {
    const cells: CellViewModel[] = [];
    const workbook = create_cellsheet_workbook_store();
    const workbookCells = workbook.locations.cells;
    const listenerDisposers: Array<() => void> = [];
    let disposed = false;
    let interactionEnabled = true;
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

    type ResizeGesture = Readonly<{
        pointerId: number;
        axis: ResizeAxis;
        index: number;
        neighborIndex: number | undefined;
        sign: 1 | -1;
        edge: ResizeEdge;
        startPointer: number;
        startPrimarySize: number;
        startNeighborSize: number | undefined;
        shift: boolean;
        row: number;
        col: number;
        ownerInput: LiveTree;
    }>;

    type ResizeHover = Readonly<{
        edge: ResizeEdge;
        row: number;
        col: number;
        ownerInput: LiveTree;
    }>;

    let activeResize: ResizeGesture | undefined;
    let resizeHover: ResizeHover | undefined;

    const branch = stage.create.div()
        .id.set("cellsheet-panel")
        .css.setMany(PANELcss);
    const activeResizeSurface = branch.css.selector("&, & *");

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

    const resizeEdgeForEvent = (input: LiveTree, event: PointerEvent): ResizeEdge | undefined => {
        const rect = input.dom.must.rect("Cellsheet resize input geometry");
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

    const resizePresentationForCell = (
        row: number,
        col: number,
        evaluated: CellsheetEvaluatedCell,
    ): { cursor: string; boxShadow: string } => {
        if (activeResize?.row === row && activeResize.col === col) {
            return {
                cursor: cursorForResizeEdge(activeResize.edge),
                boxShadow: shadowForResizeEdge(activeResize.edge, true),
            };
        }
        if (resizeHover?.row === row && resizeHover.col === col) {
            return {
                cursor: cursorForResizeEdge(resizeHover.edge),
                boxShadow: shadowForResizeEdge(resizeHover.edge, false),
            };
        }
        return {
            cursor: "text",
            boxShadow: evaluated.error ? `inset 0 0 0 1px ${ERR_TEXT}` : "none",
        };
    };

    const projectCellResizePresentation = (row: number, col: number, input: LiveTree): void => {
        const evaluated = evaluation.cells[row]?.[col];
        if (!evaluated) return;
        input.css.setMany(resizePresentationForCell(row, col, evaluated));
    };

    const clearResizeHover = (ownerInput?: LiveTree): void => {
        const previous = resizeHover;
        if (!previous || (ownerInput !== undefined && previous.ownerInput !== ownerInput)) return;
        resizeHover = undefined;
        projectCellResizePresentation(previous.row, previous.col, previous.ownerInput);
    };

    const setResizeHover = (cell: CellViewModel, edge: ResizeEdge | undefined): void => {
        if (activeResize !== undefined) return;
        if (!edge) {
            clearResizeHover(cell.input);
            projectCellResizePresentation(cell.row, cell.col, cell.input);
            return;
        }

        const previous = resizeHover;
        resizeHover = { edge, row: cell.row, col: cell.col, ownerInput: cell.input };
        if (previous && previous.ownerInput !== cell.input) {
            projectCellResizePresentation(previous.row, previous.col, previous.ownerInput);
        }
        projectCellResizePresentation(cell.row, cell.col, cell.input);
    };

    const finishResize = (releaseCapture: boolean = true): void => {
        const gesture = activeResize;
        const hover = resizeHover;
        activeResize = undefined;
        resizeHover = undefined;
        activeResizeSurface.remove("cursor");
        activeResizeSurface.remove("userSelect");

        if (gesture && releaseCapture) {
            const pointerOwner = gesture.ownerInput.dom.htmlEl();
            if (pointerOwner?.hasPointerCapture(gesture.pointerId)) {
                pointerOwner.releasePointerCapture(gesture.pointerId);
            }
        }
        if (hover && hover.ownerInput !== gesture?.ownerInput) {
            projectCellResizePresentation(hover.row, hover.col, hover.ownerInput);
        }
        if (!gesture) return;
        projectCellResizePresentation(gesture.row, gesture.col, gesture.ownerInput);
    };

    const updateResize = (event: PointerEvent, ownerInput: LiveTree): void => {
        const gesture = activeResize;
        if (
            disposed
            || !interactionEnabled
            || !gesture
            || gesture.ownerInput !== ownerInput
            || gesture.pointerId !== event.pointerId
        ) return;

        const pointer = gesture.axis === "col" ? event.clientX : event.clientY;
        const delta = (pointer - gesture.startPointer) * gesture.sign;
        const sizes = gesture.axis === "col" ? colWidths : rowHeights;
        const min = gesture.axis === "col" ? MIN_COL_WIDTH : MIN_ROW_HEIGHT;
        const max = gesture.axis === "col" ? MAX_COL_WIDTH : MAX_ROW_HEIGHT;

        if (gesture.shift && gesture.neighborIndex !== undefined && gesture.startNeighborSize !== undefined) {
            const pairTotal = gesture.startPrimarySize + gesture.startNeighborSize;
            const nextPrimary = clampDimension(gesture.startPrimarySize + delta, min, pairTotal - min);
            sizes[gesture.index] = nextPrimary;
            sizes[gesture.neighborIndex] = pairTotal - nextPrimary;
        } else {
            sizes[gesture.index] = clampDimension(gesture.startPrimarySize + delta, min, max);
        }
        projectGridDimensions();
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
        const resizePresentation = resizePresentationForCell(cell.row, cell.col, evaluated);

        input.css.setMany({
            color: textColor,
            borderColor,
            borderStyle: evaluated.kind === "result" ? "dashed" : "solid",
            outlineColor,
            ...resizePresentation,
        });
    };

    const projectCellRelation = (
        cell: CellViewModel,
        evaluated: CellsheetEvaluatedCell,
        relation: CellRelation,
    ): void => {
        const status = evaluated.kind;
        cell.input.attrs.set("data-cellsheet-relation", relation);
        cell.input.css.setMany({
            ...CELLcss,
            ...(status === "operator" ? { fontWeight: "700", opacity: "1" } : {}),
            ...(status === "result" ? { opacity: "0.68", fontStyle: "italic" } : {}),
            ...(status === "error" ? { opacity: "1", textDecoration: "underline" } : {}),
            borderStyle: evaluated.resultOf ? "dashed" : "solid",
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
        });
    };

    const projectCell = (
        cell: CellViewModel,
        evaluated: CellsheetEvaluatedCell,
        relation: CellRelation,
    ): void => {
        cell.input.form.setValue(evaluated.display, { silent: true });
        cell.input.attrs.set("data-cellsheet-cell", evaluated.kind);
        projectCellRelation(cell, evaluated, relation);
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
        if (disposed || !interactionEnabled) return false;
        const input = cell.input;
        const edge = resizeEdgeForEvent(input, event);
        if (!edge) return false;

        event.preventDefault();
        event.stopPropagation();
        finishResize();

        const targetInfo = resizeTargetForCellEdge(cell, edge);
        const sizes = targetInfo.axis === "col" ? colWidths : rowHeights;
        const fallbackSize = targetInfo.axis === "col" ? DEFAULT_COL_WIDTH : DEFAULT_ROW_HEIGHT;
        const startSize = sizes[targetInfo.index] ?? fallbackSize;
        const neighborStartSize = event.shiftKey && targetInfo.neighborIndex !== undefined
            ? sizes[targetInfo.neighborIndex]
            : undefined;
        const startPointer = targetInfo.axis === "col" ? event.clientX : event.clientY;

        activeResize = {
            pointerId: event.pointerId,
            axis: targetInfo.axis,
            index: targetInfo.index,
            neighborIndex: targetInfo.neighborIndex,
            sign: targetInfo.sign,
            edge,
            startPointer,
            startPrimarySize: startSize,
            startNeighborSize: neighborStartSize,
            shift: event.shiftKey,
            row: cell.row,
            col: cell.col,
            ownerInput: input,
        };
        resizeHover = undefined;
        const cursor = cursorForResizeEdge(edge);
        activeResizeSurface.setMany({ cursor, userSelect: "none" });
        projectCellResizePresentation(cell.row, cell.col, input);

        const pointerOwner = input.dom.must.htmlEl("Cellsheet resize pointer owner");
        pointerOwner.setPointerCapture(event.pointerId);
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
            projectCell(cell, evaluated, relation);
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
            projectCellRelation(cell, evaluated, relation);
            renderCellColors(cell, evaluated, relation);
        }
        renderSelection(relationships);
    };

    const reset = (): void => {
        finishResize();
        clearResizeHover();
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
                if (disposed || !interactionEnabled) return;
                if (activeResize) {
                    updateResize(event, input);
                    return;
                }
                setResizeHover(cell, resizeEdgeForEvent(input, event));
            });
            const pointerUpListener = input.listen.on("pointerup", (event: PointerEvent) => {
                if (activeResize?.ownerInput === input && activeResize.pointerId === event.pointerId) {
                    finishResize();
                }
            });
            const pointerCancelListener = input.listen.on("pointercancel", (event: PointerEvent) => {
                if (activeResize?.ownerInput === input && activeResize.pointerId === event.pointerId) {
                    finishResize();
                }
            });
            const lostPointerCaptureListener = input.listen.on("lostpointercapture", (event: PointerEvent) => {
                if (activeResize?.ownerInput === input && activeResize.pointerId === event.pointerId) {
                    finishResize(false);
                }
            });
            const pointerLeaveListener = input.listen.on("pointerleave", () => {
                if (disposed || !interactionEnabled || activeResize) return;
                clearResizeHover(input);
            });
            listenerDisposers.push(
                () => focusListener.off(),
                () => inputListener.off(),
                () => pointerDownListener.off(),
                () => pointerMoveListener.off(),
                () => pointerUpListener.off(),
                () => pointerCancelListener.off(),
                () => lostPointerCaptureListener.off(),
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

    const activate = (): void => {
        if (disposed) return;
        interactionEnabled = true;
    };

    const deactivate = (): void => {
        interactionEnabled = false;
        finishResize();
        clearResizeHover();
    };

    const dispose = (): void => {
        if (disposed) return;
        disposed = true;
        stopCells();
        deactivate();
        for (const stop of listenerDisposers.splice(0)) stop();
        if (!branch.isDisposed) branch.remove();
    };

    const panel = { branch, reset, activate, deactivate, dispose };
    return panel;
}
