import type { TestAssertRow, TestEvent } from "../core/test-contracts";

type CaseEndEvent = Extract<TestEvent, { t: "case_end" }>;

export type AssertRowsStatus = Readonly<{
  assertRows?: readonly TestAssertRow[];
  failedRows: readonly TestAssertRow[];
  malformedRows: readonly TestAssertRow[];
}>;

function as_record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function has_own(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function preview_unknown(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function malformed_assert_row(index: number, reason: string, value: unknown): TestAssertRow {
  return {
    ok: false,
    label: `malformed assertion row #${index}: ${reason}`,
    actual: preview_unknown(value),
    expected: "TestAssertRow",
  };
}

function normalize_assert_row(value: unknown, index: number): Readonly<{
  row: TestAssertRow;
  malformed: boolean;
}> {
  const record = as_record(value);
  if (!record) {
    return {
      row: malformed_assert_row(index, "row is not an object", value),
      malformed: true,
    };
  }

  if (typeof record.ok !== "boolean") {
    return {
      row: malformed_assert_row(index, "ok is not boolean", value),
      malformed: true,
    };
  }

  if (typeof record.label !== "string") {
    return {
      row: malformed_assert_row(index, "label is not string", value),
      malformed: true,
    };
  }

  return {
    row: {
      ok: record.ok,
      label: record.label,
      ...(has_own(record, "actual") ? { actual: record.actual } : {}),
      ...(has_own(record, "expected") ? { expected: record.expected } : {}),
    },
    malformed: false,
  };
}

export function normalize_assert_rows(value: unknown): AssertRowsStatus {
  if (value === undefined) {
    return {
      failedRows: [],
      malformedRows: [],
    };
  }

  if (!Array.isArray(value)) {
    const row = malformed_assert_row(0, "assertRows is not an array", value);
    return {
      assertRows: [row],
      failedRows: [row],
      malformedRows: [row],
    };
  }

  const assertRows: TestAssertRow[] = [];
  const malformedRows: TestAssertRow[] = [];

  value.forEach((rawRow, index) => {
    const normalized = normalize_assert_row(rawRow, index);
    assertRows.push(normalized.row);
    if (normalized.malformed) malformedRows.push(normalized.row);
  });

  return {
    assertRows,
    failedRows: assertRows.filter((row) => row.ok !== true),
    malformedRows,
  };
}

export function assertion_failure_message(failedRows: readonly TestAssertRow[]): string {
  const count = failedRows.length;
  const labels = failedRows
    .slice(0, 5)
    .map((row) => row.label || "(unlabeled assertion)")
    .join("; ");
  const more = count > 5 ? `; +${count - 5} more` : "";

  return `${count} assertion row${count === 1 ? "" : "s"} failed: ${labels}${more}`;
}

export function normalize_case_end_event(e: CaseEndEvent): CaseEndEvent {
  const assertRowsStatus = normalize_assert_rows((e as { assertRows?: unknown }).assertRows);
  const hasFailedRows = assertRowsStatus.failedRows.length > 0;
  const hasMalformedRows = assertRowsStatus.malformedRows.length > 0;
  const isExpectedFailurePass = e.status === "pass" && e.expected === "fail";
  const mustDowngrade =
    e.status !== "fail" &&
    (hasMalformedRows || (hasFailedRows && !isExpectedFailurePass));

  if (!mustDowngrade && assertRowsStatus.assertRows === (e as { assertRows?: unknown }).assertRows) {
    return e;
  }

  const normalizedBase = {
    ...e,
    ...(assertRowsStatus.assertRows !== undefined ? { assertRows: assertRowsStatus.assertRows } : {}),
  };

  if (!mustDowngrade) return normalizedBase;

  return {
    ...normalizedBase,
    status: "fail",
    err: e.err ?? assertion_failure_message(assertRowsStatus.failedRows),
  };
}
