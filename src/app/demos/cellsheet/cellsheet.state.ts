import { hson } from "hson-live";
import type { InferLiveMapSchema } from "hson-live/livemap";

export const CELLSHEET_ROW_SCHEMA = hson.liveMap.schema.define((s) => s.tuple(
  s.string,
  s.string,
  s.string,
  s.string,
  s.string,
  s.string,
  s.string,
  s.string,
));

export const CELLSHEET_WORKBOOK_SCHEMA = hson.liveMap.schema.define((s) => s.object.exact({
  cells: s.tuple(
    CELLSHEET_ROW_SCHEMA,
    CELLSHEET_ROW_SCHEMA,
    CELLSHEET_ROW_SCHEMA,
    CELLSHEET_ROW_SCHEMA,
    CELLSHEET_ROW_SCHEMA,
    CELLSHEET_ROW_SCHEMA,
    CELLSHEET_ROW_SCHEMA,
    CELLSHEET_ROW_SCHEMA,
  ),
}));

export type CellsheetWorkbook = InferLiveMapSchema<typeof CELLSHEET_WORKBOOK_SCHEMA>;
type CellsheetWorkbookRow = CellsheetWorkbook["cells"][number];
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
