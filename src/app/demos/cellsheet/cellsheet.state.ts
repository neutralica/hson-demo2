import { Hson, hson, type HsonSchema } from "hson-live";

export const CELLSHEET_WORKBOOK_SCHEMA: HsonSchema<CELLSHEET_WORKBOOK_SCHEMAType, "data"> = Hson`
  <type "data" defs <
    Row <tuple ["string", "string", "string", "string", "string", "string", "string", "string"]>
  > content <cells <tuple [
    <ref "Row">, <ref "Row">, <ref "Row">, <ref "Row">,
    <ref "Row">, <ref "Row">, <ref "Row">, <ref "Row">
  ]>>>
`;

export type CellsheetWorkbookRow = readonly [string, string, string, string, string, string, string, string];
export type CellsheetWorkbook = Readonly<{ cells: readonly [
  CellsheetWorkbookRow, CellsheetWorkbookRow, CellsheetWorkbookRow, CellsheetWorkbookRow,
  CellsheetWorkbookRow, CellsheetWorkbookRow, CellsheetWorkbookRow, CellsheetWorkbookRow,
] }>;
type Mutable<TValue> = TValue extends object
  ? { -readonly [TKey in keyof TValue]: Mutable<TValue[TKey]> }
  : TValue;
type CellsheetWorkbookInput = Mutable<CellsheetWorkbook>;

function empty_row(): Mutable<CellsheetWorkbookRow> {
  return ["", "", "", "", "", "", "", ""];
}

export function create_seeded_cellsheet_workbook(): CellsheetWorkbookInput {
  return {
    cells: [
      ["1", "+", "2", "", "", "", "", ""],
      empty_row(),
      ["egg", "+", "shell", "", "", "", "", ""],
      empty_row(),
      ["", "", "", "8", "", "", "", ""],
      ["", "", "", "/", "", "", "", ""],
      ["", "", "", "2", "", "", "", ""],
      empty_row(),
    ],
  };
}

export function create_empty_cellsheet_workbook(): CellsheetWorkbookInput {
  return {
    cells: [
      empty_row(),
      empty_row(),
      empty_row(),
      empty_row(),
      empty_row(),
      empty_row(),
      empty_row(),
      empty_row(),
    ],
  };
}

export function create_cellsheet_workbook_store(
  initial: CellsheetWorkbookInput = create_seeded_cellsheet_workbook(),
) {
  const map = hson.liveMap.fromJson(initial).schema.use(CELLSHEET_WORKBOOK_SCHEMA);
  const cells = map.at(["cells"]);
  return Object.freeze({ map, locations: Object.freeze({ cells }) });
}

// @hson-schema generated type exports
import type { CELLSHEET_WORKBOOK_SCHEMAType, CELLSHEET_WORKBOOK_SCHEMAHson } from "./cellsheet.state.CELLSHEET_WORKBOOK_SCHEMA.hson-schema.generated.js";
export type { CELLSHEET_WORKBOOK_SCHEMAType, CELLSHEET_WORKBOOK_SCHEMAHson };
// @hson-schema end generated type exports
