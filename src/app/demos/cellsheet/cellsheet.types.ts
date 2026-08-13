import type { LiveTree } from "hson-live/livetree";
import type { CellKind, CellRelation, Direction, Operator } from "./cellsheet-evaluator";

export type { CellKind, CellRelation, Direction, Operator } from "./cellsheet-evaluator";

export type CellViewModel = {
    row: number;
    col: number;
    key: string;
    input: LiveTree;
};
export type CellsheetCellState = {
    raw: string;
};
export type CellsheetDerivedCellState = {
    display: string;
    kind: CellKind;
    authored: boolean;
    resultOf: string | null;
    error: string | null;
    relation: CellRelation;
};
export type CellsheetOperationState = {
    op: Operator;
    direction: Direction;
    left: string;
    right: string;
    operator: string;
    target: string;
    result: string | number | null;
    error: string | null;
};
export type CellsheetSummaryState = {
    authored: number;
    operators: number;
    results: number;
    errors: number;
};
export type CellsheetState = {
    cells: Record<string, CellsheetCellState>;
    ui: {
        selected: string | null;
        colWidths?: Record<string, number>;
        rowHeights?: Record<string, number>;
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
    deactivate: () => void;
    dispose: () => void;
}>;
