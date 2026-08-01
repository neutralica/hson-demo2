import type { TestAssertRow } from "../../app/demos/test/tests.types";

export function equal_row(label: string, actual: unknown, expected: unknown): TestAssertRow {
  const actualText = preview_value(actual);
  const expectedText = preview_value(expected);

  return {
    ok: actualText === expectedText,
    label,
    actual: actualText,
    expected: expectedText,
  };
}

export function preview_value(value: unknown): string {
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}
