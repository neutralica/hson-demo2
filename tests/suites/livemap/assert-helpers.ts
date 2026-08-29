import type { TestAssertRow } from "../../harness/core/test-contracts";

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

/** SameValue assertion for projected primitives, including exact negative zero. */
export function same_value_row(label: string, actual: unknown, expected: unknown): TestAssertRow {
  return {
    ok: Object.is(actual, expected),
    label,
    actual: exact_primitive_preview(actual),
    expected: exact_primitive_preview(expected),
  };
}

/** Exact own string-key order without JSON serialization or host value coercion. */
export function ordered_keys_row(
  label: string,
  actual: object,
  expected: readonly string[],
): TestAssertRow {
  const keys = Reflect.ownKeys(actual).filter((key): key is string => typeof key === "string");
  const ok = keys.length === expected.length && keys.every((key, index) => key === expected[index]);
  return {
    ok,
    label,
    actual: keys.map(exact_primitive_preview).join(", "),
    expected: expected.map(exact_primitive_preview).join(", "),
  };
}

/** Own-property SameValue assertion for prototype-sensitive data keys. */
export function own_value_row(
  label: string,
  actual: object,
  key: string,
  expected: unknown,
): TestAssertRow {
  const value = Reflect.getOwnPropertyDescriptor(actual, key)?.value;
  return {
    ok: Object.hasOwn(actual, key) && Object.is(value, expected),
    label,
    actual: Object.hasOwn(actual, key) ? exact_primitive_preview(value) : "absent",
    expected: exact_primitive_preview(expected),
  };
}

function exact_primitive_preview(value: unknown): string {
  if (typeof value === "number" && Object.is(value, -0)) return "-0";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `string(${value.length})`;
  return String(value);
}
