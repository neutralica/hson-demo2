const ID_SEGMENT = /^[a-z0-9][a-z0-9._-]*$/;

export type CanonicalCaseIdentity = Readonly<{
  suiteId: string;
  caseId: string;
}>;

export function validate_test_id_segment(value: string, label = "test identity segment"): string {
  if (!ID_SEGMENT.test(value) || value.includes("::")) {
    throw new Error(`Invalid ${label} "${value}". Expected [a-z0-9][a-z0-9._-]*.`);
  }
  return value;
}

export function validate_test_suite_id(value: string): string {
  if (value.includes("::")) throw new Error(`Invalid test suite ID "${value}": :: is reserved for case identity.`);
  const segments = value.split("/");
  if (segments.length === 0 || segments.some((segment) => segment.length === 0)) {
    throw new Error(`Invalid test suite ID "${value}": empty path segments are not allowed.`);
  }
  for (const segment of segments) validate_test_id_segment(segment, "test suite path segment");
  return value;
}

export function validate_test_case_id(value: string): string {
  return validate_test_id_segment(value, "test case ID");
}

export function format_test_case_id(suiteId: string, caseId: string): string {
  return `${validate_test_suite_id(suiteId)}::${validate_test_case_id(caseId)}`;
}

export function parse_test_case_id(value: string): CanonicalCaseIdentity {
  const pieces = value.split("::");
  if (pieces.length !== 2 || pieces[0] === undefined || pieces[1] === undefined) {
    throw new Error(`Invalid canonical test case ID "${value}". Expected suiteId::caseId.`);
  }
  return Object.freeze({
    suiteId: validate_test_suite_id(pieces[0]),
    caseId: validate_test_case_id(pieces[1]),
  });
}

export function is_test_suite_id(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { validate_test_suite_id(value); return true; } catch { return false; }
}

export function is_test_case_id(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { parse_test_case_id(value); return true; } catch { return false; }
}
