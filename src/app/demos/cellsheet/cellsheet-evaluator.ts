export const ROWS = 8;
export const COLS = 8;
export const MAX_EVALUATION_PASSES = ROWS * COLS;

export type Operator = "+" | "-" | "*" | "/";
export type CellKind = "blank" | "text" | "number" | "operator" | "result" | "error";
export type Direction = "horizontal" | "vertical";
export type CellRelation = "none" | "selected" | "operand" | "operator" | "target" | "blocked";

export type CellsheetRawRow = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export type CellsheetRawGrid = readonly [
  CellsheetRawRow,
  CellsheetRawRow,
  CellsheetRawRow,
  CellsheetRawRow,
  CellsheetRawRow,
  CellsheetRawRow,
  CellsheetRawRow,
  CellsheetRawRow,
];

export type CellsheetCellRef = Readonly<{
  row: number;
  col: number;
  key: string;
}>;

export type CellsheetEvaluatedCell = Readonly<{
  value: string | number | undefined;
  display: string;
  kind: CellKind;
  authored: boolean;
  resultOf: string | undefined;
  error: string | undefined;
}>;

export type CellsheetOperation = Readonly<{
  key: string;
  op: Operator;
  direction: Direction;
  left: CellsheetCellRef;
  right: CellsheetCellRef;
  operator: CellsheetCellRef;
  target: CellsheetCellRef;
  result: string | number | undefined;
  error: string | undefined;
}>;

export type CellsheetEvaluation = Readonly<{
  cells: readonly (readonly CellsheetEvaluatedCell[])[];
  operations: readonly CellsheetOperation[];
  summary: Readonly<{
    authored: number;
    operations: number;
    results: number;
    errors: number;
  }>;
}>;

export type CellsheetRelationships = Readonly<{
  relations: readonly (readonly CellRelation[])[];
  selected: CellsheetCellRef | undefined;
  touchedOperations: readonly CellsheetOperation[];
  selectionText: string;
  selectionHasError: boolean;
}>;

type SemanticCellKind = Exclude<CellKind, "error">;

type WorkingCell = {
  ref: CellsheetCellRef;
  display: string;
  value: string | number | Operator | undefined;
  kind: SemanticCellKind;
  authored: boolean;
  resultOf: string | undefined;
  error: string | undefined;
};

type WorkingOperation = {
  key: string;
  op: Operator;
  direction: Direction;
  left: WorkingCell;
  right: WorkingCell;
  operator: WorkingCell;
  target: WorkingCell;
  result: string | number | undefined;
  error: string | undefined;
};

const OPERATORS = new Set<string>(["+", "-", "*", "/"]);

export function cell_key(row: number, col: number): string {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

export function cellsheet_cell_ref(row: number, col: number): CellsheetCellRef | undefined {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return undefined;
  return Object.freeze({ row, col, key: cell_key(row, col) });
}

export function cellsheet_cell_ref_from_key(key: string): CellsheetCellRef | undefined {
  if (!/^[A-H][1-8]$/.test(key)) return undefined;
  return cellsheet_cell_ref(Number(key.slice(1)) - 1, key.charCodeAt(0) - 65);
}

function is_operator(value: string): value is Operator {
  return OPERATORS.has(value);
}

function parse_cell(raw: string, row: number, col: number): WorkingCell {
  const clean = raw.trim();
  const ref = cellsheet_cell_ref(row, col);
  if (!ref) throw new RangeError(`invalid Cellsheet coordinate ${row},${col}`);

  if (clean === "") {
    return {
      ref,
      display: "",
      value: undefined,
      kind: "blank",
      authored: false,
      resultOf: undefined,
      error: undefined,
    };
  }

  if (is_operator(clean)) {
    return {
      ref,
      display: raw,
      value: clean,
      kind: "operator",
      authored: true,
      resultOf: undefined,
      error: undefined,
    };
  }

  const numeric = Number(clean);
  if (Number.isFinite(numeric)) {
    return {
      ref,
      display: raw,
      value: numeric,
      kind: "number",
      authored: true,
      resultOf: undefined,
      error: undefined,
    };
  }

  return {
    ref,
    display: raw,
    value: clean,
    kind: "text",
    authored: true,
    resultOf: undefined,
    error: undefined,
  };
}

function compute_result(op: Operator, left: WorkingCell, right: WorkingCell): string | number | undefined {
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

function operands_can_apply(op: Operator, left: WorkingCell, right: WorkingCell): boolean {
  if (left.value === undefined || right.value === undefined) return false;
  if (op === "+") return true;
  return typeof left.value === "number" && typeof right.value === "number";
}

function operation_error(
  op: Operator,
  right: WorkingCell,
  result: string | number | undefined,
): string | undefined {
  if (result !== undefined) return undefined;
  if (op === "/" && right.value === 0) return "division by zero";
  return undefined;
}

function result_target_error(operation: WorkingOperation): string | undefined {
  const target = operation.target;
  if (target.kind === "result" && target.resultOf !== undefined && target.resultOf !== operation.key) {
    return `result collision: ${target.ref.key} is already written by ${target.resultOf}`;
  }
  if (target.authored) return `occupied result target for ${operation.operator.ref.key}`;
  return undefined;
}

function find_operations(
  cells: readonly (readonly WorkingCell[])[],
  operator: WorkingCell,
): WorkingOperation[] {
  const op = operator.value;
  if (!is_operator(String(op))) return [];

  const get = (row: number, col: number): WorkingCell | undefined => cells[row]?.[col];
  const out: WorkingOperation[] = [];
  const left = get(operator.ref.row, operator.ref.col - 1);
  const right = get(operator.ref.row, operator.ref.col + 1);
  const horizontalTarget = get(operator.ref.row, operator.ref.col + 2);
  if (left && right && horizontalTarget && operands_can_apply(op as Operator, left, right)) {
    const result = compute_result(op as Operator, left, right);
    out.push({
      key: `${operator.ref.key}:h`,
      op: op as Operator,
      direction: "horizontal",
      left,
      right,
      operator,
      target: horizontalTarget,
      result,
      error: operation_error(op as Operator, right, result),
    });
  }

  const top = get(operator.ref.row - 1, operator.ref.col);
  const bottom = get(operator.ref.row + 1, operator.ref.col);
  const verticalTarget = get(operator.ref.row + 2, operator.ref.col);
  if (top && bottom && verticalTarget && operands_can_apply(op as Operator, top, bottom)) {
    const result = compute_result(op as Operator, top, bottom);
    out.push({
      key: `${operator.ref.key}:v`,
      op: op as Operator,
      direction: "vertical",
      left: top,
      right: bottom,
      operator,
      target: verticalTarget,
      result,
      error: operation_error(op as Operator, bottom, result),
    });
  }

  return out;
}

function value_text(value: string | number | undefined): string {
  return value === undefined ? "" : String(value);
}

function detach_cell(cell: WorkingCell): CellsheetEvaluatedCell {
  return Object.freeze({
    value: cell.value,
    display: cell.display,
    kind: cell.error ? "error" : cell.kind,
    authored: cell.authored,
    resultOf: cell.resultOf,
    error: cell.error,
  });
}

function detach_operation(operation: WorkingOperation): CellsheetOperation {
  return Object.freeze({
    key: operation.key,
    op: operation.op,
    direction: operation.direction,
    left: operation.left.ref,
    right: operation.right.ref,
    operator: operation.operator.ref,
    target: operation.target.ref,
    result: operation.result,
    error: operation.error,
  });
}

export function evaluate_cellsheet(rawGrid: CellsheetRawGrid): CellsheetEvaluation {
  const cells = rawGrid.map((row, rowIndex) => (
    row.map((raw, colIndex) => parse_cell(raw, rowIndex, colIndex))
  ));
  const operations: WorkingOperation[] = [];
  const operationIndexes = new Map<string, number>();

  for (let pass = 0; pass < MAX_EVALUATION_PASSES; pass += 1) {
    let changed = false;

    for (const row of cells) {
      for (const operator of row) {
        if (operator.kind !== "operator") continue;

        for (const operation of find_operations(cells, operator)) {
          const existingIndex = operationIndexes.get(operation.key);
          if (existingIndex === undefined) {
            operationIndexes.set(operation.key, operations.length);
            operations.push(operation);
          } else {
            operations[existingIndex] = operation;
          }

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

          if (
            operation.target.kind !== "result"
            || operation.target.value !== operation.result
            || operation.target.display !== value_text(operation.result)
            || operation.target.resultOf !== operation.key
          ) {
            changed = true;
          }
          operation.target.kind = "result";
          operation.target.value = operation.result;
          operation.target.display = value_text(operation.result);
          operation.target.resultOf = operation.key;
        }
      }
    }

    if (!changed) break;
  }

  const detachedCells = Object.freeze(cells.map((row) => Object.freeze(row.map(detach_cell))));
  const detachedOperations = Object.freeze(operations.map(detach_operation));
  const summary = Object.freeze({
    authored: cells.flat().filter((cell) => cell.authored).length,
    operations: detachedOperations.length,
    results: cells.flat().filter((cell) => cell.kind === "result").length,
    errors: cells.flat().filter((cell) => cell.error).length,
  });

  return Object.freeze({ cells: detachedCells, operations: detachedOperations, summary });
}

function operation_touches_cell(operation: CellsheetOperation, key: string): boolean {
  return operation.left.key === key
    || operation.right.key === key
    || operation.operator.key === key
    || operation.target.key === key;
}

function format_operation(operation: CellsheetOperation): string {
  const arrow = operation.error ? "!" : "→";
  const result = operation.error ?? value_text(operation.result);
  const suffix = result === "" ? "" : ` ${arrow} ${operation.target.key}=${result}`;
  return `${operation.left.key} ${operation.op} ${operation.right.key}${suffix}`;
}

export function derive_cellsheet_relations(
  evaluation: CellsheetEvaluation,
  selected: CellsheetCellRef | undefined,
): CellsheetRelationships {
  const relations: CellRelation[][] = Array.from(
    { length: ROWS },
    () => Array.from({ length: COLS }, () => "none" as CellRelation),
  );

  if (!selected) {
    return Object.freeze({
      relations: Object.freeze(relations.map((row) => Object.freeze(row))),
      selected: undefined,
      touchedOperations: Object.freeze([]),
      selectionText: "Select a cell to inspect its derived operation links.",
      selectionHasError: false,
    });
  }

  relations[selected.row]![selected.col] = "selected";
  const touchedOperations = evaluation.operations.filter((operation) => (
    operation_touches_cell(operation, selected.key)
  ));
  const mark = (ref: CellsheetCellRef, relation: CellRelation): void => {
    const current = relations[ref.row]?.[ref.col];
    if (current === undefined || current === "selected" || current === "blocked") return;
    relations[ref.row]![ref.col] = relation;
  };

  for (const operation of touchedOperations) {
    mark(operation.left, "operand");
    mark(operation.right, "operand");
    mark(operation.operator, "operator");
    const target = evaluation.cells[operation.target.row]?.[operation.target.col];
    mark(operation.target, target?.error ? "blocked" : "target");
  }

  const selectionText = touchedOperations.length === 0
    ? `${selected.key}: no derived operation links.`
    : `${selected.key}\n${touchedOperations.map(format_operation).join("\n")}`;

  return Object.freeze({
    relations: Object.freeze(relations.map((row) => Object.freeze(row))),
    selected,
    touchedOperations: Object.freeze([...touchedOperations]),
    selectionText,
    selectionHasError: touchedOperations.some((operation) => operation.error !== undefined),
  });
}
