import type { LiveTree } from "hson-live/livetree";

export type CellsheetDimensionTuple = [number, number, number, number, number, number, number, number];

export type CellViewModel = {
    row: number;
    col: number;
    key: string;
    input: LiveTree;
};

export type CellsheetPanel = Readonly<{
    branch: LiveTree;
    reset: () => void;
    deactivate: () => void;
    dispose: () => void;
}>;
