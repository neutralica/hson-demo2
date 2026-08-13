import type { LiveTree } from "hson-live/livetree";

export type Operator = "+" | "-" | "*" | "/";
export type CellKind = "blank" | "text" | "number" | "operator" | "result" | "error";
export type Direction = "horizontal" | "vertical";
export type CellRelation = "none" | "selected" | "operand" | "operator" | "target" | "blocked";
type CellValue = string | number | Operator | undefined;
export type CellModel = {
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
export type OperationModel = {
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
