import type { TestCase, TestSuite } from "../../harness/core/test-contracts";
import {
  cellsheet_cell_ref_from_key,
  derive_cellsheet_relations,
  evaluate_cellsheet,
  type CellsheetEvaluation,
  type CellsheetRawGrid,
} from "../../../src/app/demos/cellsheet/cellsheet-evaluator";

const EVALUATOR_SUITE = "unit/cellsheet-evaluator";
const RELATION_SUITE = "unit/cellsheet-relations";

function fail(message: string): never {
  throw new Error(message);
}

function equal<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) fail(`${message}: expected ${String(expected)}, received ${String(actual)}`);
}

function deep_equal(actual: unknown, expected: unknown, message: string): void {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) fail(`${message}: expected ${expectedText}, received ${actualText}`);
}

function raw_grid(values: Readonly<Record<string, string>> = {}): CellsheetRawGrid {
  const rows = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ""));
  for (const [key, value] of Object.entries(values)) {
    const ref = cellsheet_cell_ref_from_key(key) ?? fail(`invalid test cell ${key}`);
    rows[ref.row]![ref.col] = value;
  }
  return rows as unknown as CellsheetRawGrid;
}

function evaluated(values: Readonly<Record<string, string>>): CellsheetEvaluation {
  return evaluate_cellsheet(raw_grid(values));
}

function cell(evaluation: CellsheetEvaluation, key: string) {
  const ref = cellsheet_cell_ref_from_key(key) ?? fail(`invalid test cell ${key}`);
  return evaluation.cells[ref.row]?.[ref.col] ?? fail(`missing evaluated cell ${key}`);
}

function operation(evaluation: CellsheetEvaluation, key: string) {
  return evaluation.operations.find((item) => item.key === key) ?? fail(`missing operation ${key}`);
}

export function cellsheet_evaluator_suite(): TestSuite {
  const cases: readonly TestCase[] = [
    {
      suite: EVALUATOR_SUITE,
      name: "zero-padded numeric text keeps authored display and parses numerically",
      run: () => {
        const result = evaluated({ A1: "001.50" });
        equal(cell(result, "A1").display, "001.50", "display spelling");
        equal(cell(result, "A1").value, 1.5, "numeric value");
        equal(cell(result, "A1").kind, "number", "numeric kind");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "numeric interpretation trims without changing authored display",
      run: () => {
        const result = evaluated({ A1: " 001.50 " });
        equal(cell(result, "A1").display, " 001.50 ", "trimmed numeric display");
        equal(cell(result, "A1").value, 1.5, "trimmed numeric value");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "finite exponent forms are numbers while Infinity-like input is text",
      run: () => {
        const result = evaluated({ A1: "1e2", A2: "Infinity", A3: "NaN" });
        equal(cell(result, "A1").value, 100, "exponent value");
        equal(cell(result, "A2").kind, "text", "Infinity kind");
        equal(cell(result, "A3").kind, "text", "NaN kind");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "trimmed operator input is authored while whitespace-only input is blank",
      run: () => {
        const result = evaluated({ A1: " + ", A2: "   " });
        equal(cell(result, "A1").kind, "operator", "trimmed operator kind");
        equal(cell(result, "A1").display, " + ", "trimmed operator display");
        equal(cell(result, "A2").authored, false, "whitespace authorship");
        equal(cell(result, "A2").display, "", "whitespace display");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "horizontal addition produces a numeric result",
      run: () => equal(cell(evaluated({ A1: "8", B1: "+", C1: "2" }), "D1").value, 10, "addition"),
    },
    {
      suite: EVALUATOR_SUITE,
      name: "horizontal subtraction produces a numeric result",
      run: () => equal(cell(evaluated({ A1: "8", B1: "-", C1: "2" }), "D1").value, 6, "subtraction"),
    },
    {
      suite: EVALUATOR_SUITE,
      name: "horizontal multiplication produces a numeric result",
      run: () => equal(cell(evaluated({ A1: "8", B1: "*", C1: "2" }), "D1").value, 16, "multiplication"),
    },
    {
      suite: EVALUATOR_SUITE,
      name: "horizontal division produces a numeric result",
      run: () => equal(cell(evaluated({ A1: "8", B1: "/", C1: "2" }), "D1").value, 4, "division"),
    },
    {
      suite: EVALUATOR_SUITE,
      name: "vertical arithmetic uses top and bottom operands",
      run: () => {
        const result = evaluated({ B1: "8", B2: "-", B3: "2" });
        equal(cell(result, "B4").value, 6, "vertical result");
        equal(operation(result, "B2:v").direction, "vertical", "vertical direction");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "one operator independently discovers horizontal and vertical operations",
      run: () => {
        const result = evaluated({ A1: "3", B1: "4", A2: "5", B2: "+", C2: "6", B3: "2" });
        equal(cell(result, "D2").value, 11, "horizontal branch");
        equal(cell(result, "B4").value, 6, "vertical branch");
        equal(result.summary.operations, 2, "dual operation count");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "operator at a boundary discovers no operation",
      run: () => equal(evaluated({ A1: "+", B1: "1" }).summary.operations, 0, "boundary operation count"),
    },
    {
      suite: EVALUATOR_SUITE,
      name: "missing operands discover no operation or error",
      run: () => {
        const result = evaluated({ B1: "+", C1: "2" });
        equal(result.summary.operations, 0, "missing operand operations");
        equal(result.summary.errors, 0, "missing operand errors");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "nonnumeric subtraction multiplication and division are silently omitted",
      run: () => {
        const result = evaluated({
          A1: "egg", B1: "-", C1: "shell",
          A2: "egg", B2: "*", C2: "shell",
          A3: "egg", B3: "/", C3: "shell",
        });
        equal(result.summary.operations, 0, "nonnumeric operations");
        equal(result.summary.errors, 0, "nonnumeric errors");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "number plus text concatenates semantic spellings",
      run: () => equal(cell(evaluated({ A1: "2", B1: "+", C1: "shell" }), "D1").value, "2shell", "number plus text"),
    },
    {
      suite: EVALUATOR_SUITE,
      name: "text plus number concatenates semantic spellings",
      run: () => equal(cell(evaluated({ A1: "egg", B1: "+", C1: "2" }), "D1").value, "egg2", "text plus number"),
    },
    {
      suite: EVALUATOR_SUITE,
      name: "text plus text concatenates",
      run: () => equal(cell(evaluated({ A1: "egg", B1: "+", C1: "shell" }), "D1").value, "eggshell", "text plus text"),
    },
    {
      suite: EVALUATOR_SUITE,
      name: "division by zero errors the operator and leaves the target blank",
      run: () => {
        const result = evaluated({ A1: "8", B1: "/", C1: "0" });
        equal(operation(result, "B1:h").error, "division by zero", "operation error");
        equal(cell(result, "B1").error, "division by zero", "operator error");
        equal(cell(result, "D1").kind, "blank", "division target kind");
        deep_equal(result.summary, { authored: 3, operations: 1, results: 0, errors: 1 }, "division summary");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "occupied target remains usable authored content and errors both cells",
      run: () => {
        const result = evaluated({ A1: "1", B1: "+", C1: "2", D1: "9" });
        equal(cell(result, "D1").value, 9, "occupied value");
        equal(operation(result, "B1:h").error, "occupied result target for B1", "occupied error");
        deep_equal(result.summary, { authored: 4, operations: 1, results: 0, errors: 2 }, "occupied summary");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "collision preserves first row-major writer and errors the later writer and target",
      run: () => {
        const result = evaluated({ D1: "3", D2: "+", D3: "4", A4: "1", B4: "+", C4: "2" });
        equal(cell(result, "D4").value, 7, "first collision value");
        equal(cell(result, "D4").resultOf, "D2:v", "first collision writer");
        equal(operation(result, "B4:h").error, "result collision: D4 is already written by D2:v", "later collision error");
        deep_equal(result.summary, { authored: 6, operations: 2, results: 1, errors: 2 }, "collision summary");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "errored authored value still participates downstream",
      run: () => {
        const result = evaluated({ A1: "1", B1: "+", C1: "2", D1: "9", E1: "+", F1: "1" });
        equal(cell(result, "D1").kind, "error", "upstream visible kind");
        equal(cell(result, "G1").value, 10, "downstream result");
        deep_equal(result.summary, { authored: 6, operations: 2, results: 1, errors: 2 }, "non-propagation summary");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "fixpoint resolves a producer scanned after its consumer",
      run: () => {
        const result = evaluated({ D1: "4", D2: "+", A3: "1", B3: "+", C3: "2" });
        equal(cell(result, "D3").value, 3, "late producer value");
        equal(cell(result, "D4").value, 7, "later-pass consumer value");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "fixpoint resolves a longer cross-direction dependency chain",
      run: () => {
        const result = evaluated({
          D3: "4", D4: "+",
          A5: "1", B5: "+", C5: "2",
          G4: "10", G5: "+",
          E6: "+", F6: "1",
        });
        equal(cell(result, "D5").value, 3, "first result");
        equal(cell(result, "D6").value, 7, "second result");
        equal(cell(result, "G6").value, 8, "third result");
        equal(cell(result, "G7").value, 18, "later-pass fourth result");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "summary counts discovered operations rather than operator-token cells",
      run: () => {
        const result = evaluated({ A1: "3", B1: "4", A2: "5", B2: "+", C2: "6", B3: "2", H8: "+" });
        equal(result.summary.operations, 2, "discovered operation count");
        equal(result.summary.authored, 7, "authored token count");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "evaluation does not mutate input and repeats deterministically",
      run: () => {
        const input = raw_grid({ A1: "1", B1: "+", C1: "2" });
        const before = JSON.stringify(input);
        const first = evaluate_cellsheet(input);
        const second = evaluate_cellsheet(input);
        equal(JSON.stringify(input), before, "input stability");
        deep_equal(second, first, "repeatability");
      },
    },
    {
      suite: EVALUATOR_SUITE,
      name: "evaluation calls and detached copies cannot leak state",
      run: () => {
        const first = evaluated({ A1: "1", B1: "+", C1: "2" });
        const detachedCopy = JSON.parse(JSON.stringify(first)) as { operations: unknown[]; cells: Array<Array<{ display: string }>> };
        detachedCopy.operations.length = 0;
        detachedCopy.cells[0]![3]!.display = "corrupt";

        const second = evaluated({ H8: "alone" });
        equal(second.operations.length, 0, "operation leakage");
        equal(cell(second, "D1").display, "", "result leakage");
        equal(Object.isFrozen(first), true, "result freeze");
        equal(Object.isFrozen(first.operations[0]?.left), true, "coordinate evidence freeze");
        equal("value" in (first.operations[0]?.left ?? {}), false, "operation ref is not a working-cell alias");
      },
    },
  ];

  return { suite: EVALUATOR_SUITE, cases };
}

export function cellsheet_relations_suite(): TestSuite {
  const collision = evaluated({ D1: "3", D2: "+", D3: "4", A4: "1", B4: "+", C4: "2" });
  const success = evaluated({ A1: "1", B1: "+", C1: "2" });
  const division = evaluated({ A1: "8", B1: "/", C1: "0" });
  const relation = (evaluation: CellsheetEvaluation, selectedKey: string, targetKey: string) => {
    const selected = cellsheet_cell_ref_from_key(selectedKey) ?? fail(`invalid selected key ${selectedKey}`);
    const target = cellsheet_cell_ref_from_key(targetKey) ?? fail(`invalid target key ${targetKey}`);
    return derive_cellsheet_relations(evaluation, selected).relations[target.row]?.[target.col];
  };

  const cases: readonly TestCase[] = [
    {
      suite: RELATION_SUITE,
      name: "no selection produces the default selection prompt",
      run: () => {
        const result = derive_cellsheet_relations(success, undefined);
        equal(result.selectionText, "Select a cell to inspect its derived operation links.", "default prompt");
        equal(result.touchedOperations.length, 0, "default touched operations");
      },
    },
    {
      suite: RELATION_SUITE,
      name: "selected cell retains selected relation over operation roles",
      run: () => equal(relation(success, "B1", "B1"), "selected", "selected relation"),
    },
    {
      suite: RELATION_SUITE,
      name: "successful selection marks operands operator and target",
      run: () => {
        equal(relation(success, "B1", "A1"), "operand", "left operand relation");
        equal(relation(success, "B1", "C1"), "operand", "right operand relation");
        equal(relation(success, "A1", "B1"), "operator", "operator relation");
        equal(relation(success, "A1", "D1"), "target", "target relation");
      },
    },
    {
      suite: RELATION_SUITE,
      name: "errored collision target is blocked",
      run: () => equal(relation(collision, "B4", "D4"), "blocked", "blocked collision target"),
    },
    {
      suite: RELATION_SUITE,
      name: "division-by-zero target remains target rather than blocked",
      run: () => equal(relation(division, "B1", "D1"), "target", "division target relation"),
    },
    {
      suite: RELATION_SUITE,
      name: "successful operation selection text preserves arrow formatting",
      run: () => {
        const selected = cellsheet_cell_ref_from_key("A1") ?? fail("missing A1");
        equal(derive_cellsheet_relations(success, selected).selectionText, "A1\nA1 + C1 → D1=3", "success text");
      },
    },
    {
      suite: RELATION_SUITE,
      name: "erroneous operation selection text preserves error formatting",
      run: () => {
        const selected = cellsheet_cell_ref_from_key("B1") ?? fail("missing B1");
        const result = derive_cellsheet_relations(division, selected);
        equal(result.selectionText, "B1\nA1 / C1 ! D1=division by zero", "error text");
        equal(result.selectionHasError, true, "error color evidence");
      },
    },
    {
      suite: RELATION_SUITE,
      name: "cell without operations receives no-link selection text",
      run: () => {
        const selected = cellsheet_cell_ref_from_key("H8") ?? fail("missing H8");
        equal(derive_cellsheet_relations(success, selected).selectionText, "H8: no derived operation links.", "no-link text");
      },
    },
    {
      suite: RELATION_SUITE,
      name: "shared target selection reports all touching operations in scan order",
      run: () => {
        const selected = cellsheet_cell_ref_from_key("D4") ?? fail("missing D4");
        const result = derive_cellsheet_relations(collision, selected);
        deep_equal(result.touchedOperations.map((item) => item.key), ["D2:v", "B4:h"], "touching order");
        equal(result.selectionHasError, true, "multiple-operation error evidence");
      },
    },
  ];

  return { suite: RELATION_SUITE, cases };
}
