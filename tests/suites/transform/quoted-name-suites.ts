import { hson } from "hson-live";
import type { HsonNode } from "hson-live/types";
import type { TestCase, TestSuite } from "../../harness/core/test-contracts";

function fail(message: string): never {
  throw new Error(message);
}

function expect_equal(actual: unknown, expected: unknown, label = "value"): void {
  if (!Object.is(actual, expected)) {
    fail(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function expect_json(actual: unknown, expected: unknown, label = "value"): void {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) fail(`${label}: expected ${expectedText}, received ${actualText}`);
}

function expect(condition: unknown, label: string): asserts condition {
  if (!condition) fail(label);
}

function parse(source: string): HsonNode {
  return hson.fromHson(source).toNode();
}

function compact(source: string): string {
  return hson.fromNode(parse(source)).toHson().noBreak().serialize();
}

function first_property_name(source: string): string {
  const property = parse(source).$_content[0];
  if (typeof property !== "object" || property === null || !("$_tag" in property)) {
    fail("expected first object property node");
  }
  return String(property.$_tag);
}

function test_case(suite: string, caseId: string, name: string, body: () => void, input?: string): TestCase {
  return Object.freeze({
    suite,
    caseId,
    name,
    ...(input === undefined ? {} : { meta: Object.freeze({ input, preview: input }) }),
    run: body,
  });
}

function error_record(error: unknown): Readonly<Record<string, unknown>> {
  if (typeof error !== "object" || error === null) fail("expected structured TransformError");
  return error as Record<string, unknown>;
}

function expect_rejection(
  source: string,
  code: string,
  location?: Readonly<{ index: number; line: number; column: number }>,
): void {
  try {
    parse(source);
  } catch (error) {
    const record = error_record(error);
    expect_equal(record.code, code, "diagnostic code");
    if (location !== undefined) expect_json(record.source, location, "diagnostic source location");
    return;
  }
  fail(`expected ${code} rejection`);
}

export function transform_quoted_name_acceptance_suite(): TestSuite {
  const suite = "transform/hson/quoted-name-acceptance";
  const cases = [
    test_case(suite, "established-bare-names-remain-canonical", "established bare names remain canonical", () => {
      expect_equal(compact("<bareName 1>"), "<bareName 1>");
    }, "<bareName 1>"),
    test_case(suite, "single-quoted-object-member-names-admit-spaces", "single-quoted object member names admit spaces", () => {
      expect_equal(first_property_name("<'white space' 1>"), "white space");
    }, "<'white space' 1>"),
    test_case(suite, "single-quoted-element-names-admit-spaces", "single-quoted element names admit spaces", () => {
      const element = parse("<'white space' \"value\"/>").$_content[0];
      expect(typeof element === "object" && element !== null && "$_tag" in element, "expected element node");
      expect_equal(element.$_tag, "white space");
    }, "<'white space' \"value\"/>"),
    test_case(suite, "punctuation-bearing-names-remain-quoted", "punctuation-bearing names remain quoted", () => {
      expect_equal(compact("<'major problem here:' \"\">"), "<'major problem here:' \"\">");
    }),
    test_case(suite, "apostrophe-escapes-decode", "apostrophe escapes decode", () => {
      expect_equal(first_property_name("<'don\\'t' 1>"), "don't");
    }),
    test_case(suite, "backslash-escapes-decode", "backslash escapes decode", () => {
      expect_equal(first_property_name("<'back\\\\slash' 1>"), "back\\slash");
    }),
    test_case(suite, "backspace-escapes-decode", "backspace escapes decode", () => {
      expect_equal(first_property_name("<'back\\bspace' 1>"), "back\bspace");
    }),
    test_case(suite, "form-feed-escapes-decode", "form-feed escapes decode", () => {
      expect_equal(first_property_name("<'form\\ffeed' 1>"), "form\ffeed");
    }),
    test_case(suite, "line-feed-escapes-decode", "line-feed escapes decode", () => {
      expect_equal(first_property_name("<'line\\nname' 1>"), "line\nname");
    }),
    test_case(suite, "carriage-return-escapes-decode", "carriage-return escapes decode", () => {
      expect_equal(first_property_name("<'line\\rname' 1>"), "line\rname");
    }),
    test_case(suite, "horizontal-tab-escapes-decode", "horizontal-tab escapes decode", () => {
      expect_equal(first_property_name("<'line\\tname' 1>"), "line\tname");
    }),
    test_case(suite, "unicode-escapes-decode-one-utf-16-code-unit", "Unicode escapes decode one UTF-16 code unit", () => {
      expect_equal(first_property_name("<'unicode\\u2028name' 1>"), "unicode\u2028name");
    }),
    test_case(suite, "isolated-surrogate-escapes-survive", "isolated surrogate escapes survive", () => {
      const high = first_property_name("<'high\\uD800name' 1>");
      const low = first_property_name("<'low\\uDC00name' 1>");
      expect_equal(high.charCodeAt(4), 0xd800, "high surrogate");
      expect_equal(low.charCodeAt(3), 0xdc00, "low surrogate");
    }),
    test_case(suite, "backticks-are-ordinary-quoted-name-data", "backticks are ordinary quoted-name data", () => {
      expect_equal(first_property_name("<'contains ` a backtick' 1>"), "contains ` a backtick");
    }),
    test_case(suite, "backticks-are-ordinary-string-value-data", "backticks are ordinary string-value data", () => {
      expect_json(JSON.parse(hson.fromHson("<message \"contains ` a backtick\">").toJson().serialize()), {
        message: "contains ` a backtick",
      });
    }),
    test_case(suite, "empty-object-member-names-preserve-established-behavior", "empty object member names preserve established behavior", () => {
      expect_equal(compact("<'' 1>"), "<'' 1>");
    }),
    test_case(suite, "canonical-serialization-escapes-apostrophes", "canonical serialization escapes apostrophes", () => {
      expect_equal(compact("<'don\\'t' true>"), "<'don\\'t' true>");
    }),
    test_case(suite, "canonical-serialization-escapes-backslashes-but-not-backticks", "canonical serialization escapes backslashes but not backticks", () => {
      expect_equal(compact("<'back\\\\slash ` data' 1>"), "<'back\\\\slash ` data' 1>");
    }),
    test_case(suite, "canonical-quoted-name-output-is-byte-deterministic", "canonical quoted-name output is byte-deterministic", () => {
      const node = parse("<'major problem here:' \"\">");
      const first = hson.fromNode(node).toHson().serialize();
      const second = hson.fromNode(node).toHson().serialize();
      expect_equal(first, "<'major problem here:' \"\">");
      expect_equal(second, first);
    }),
    test_case(suite, "authored-parse-serialize-reparse-closes", "authored parse serialize reparse closes", () => {
      const source = "<'white space' 1 'don\\'t' 2 'back\\\\slash' 3 'tick`name' 4 'line\\nname' 5 'unicode\\u2028name' 6 'isolated\\uD800surrogate' 7 'problem:' 8>";
      const first = hson.fromNode(parse(source)).toHson().serialize();
      const second = hson.fromNode(parse(first)).toHson().serialize();
      expect_equal(second, first);
      expect(!first.includes("<`"), "canonical wire must not emit a backtick delimiter");
    }),
    test_case(suite, "json-retains-decoded-demanding-property-names", "JSON retains decoded demanding property names", () => {
      const value = JSON.parse(hson.fromHson("<'space key' 1 'don\\'t' 2 'back\\\\slash' 3 'tick`name' 4>").toJson().serialize());
      expect_json(value, { "space key": 1, "don't": 2, "back\\slash": 3, "tick`name": 4 });
    }),
    test_case(suite, "html-retains-decoded-demanding-property-names", "HTML retains decoded demanding property names", () => {
      const html = hson.fromHson("<'space key' 1 'don\\'t' 2 'tick`name' 3>").toHtml().serialize();
      expect(html.includes("space_x20-key"), "missing encoded space key");
      expect(html.includes("don_x27-t"), "missing encoded apostrophe key");
      expect(html.includes("tick_x60-name"), "missing encoded backtick key");
    }),
    test_case(suite, "ordinary-quoted-names-embed-directly-in-a-javascript-template-literal", "ordinary quoted names embed directly in a JavaScript template literal", () => {
      const source = `
<
  'major problem here:' ""
  'ordinary quoted name' "value"
>
`;
      expect_json(JSON.parse(hson.fromHson(source).toJson().serialize()), {
        "major problem here:": "",
        "ordinary quoted name": "value",
      });
    }),
    test_case(suite, "host-and-hson-escaping-layer-once-for-an-apostrophe", "host and HSON escaping layer once for an apostrophe", () => {
      const source = `<'don\\'t' 1>`;
      expect_equal(first_property_name(source), "don't");
      expect_equal(hson.transform.string(source), "<'don\\'t' 1>");
    }),
  ];
  return Object.freeze({ suite, cases: Object.freeze(cases) });
}

export function transform_quoted_name_rejection_suite(): TestSuite {
  const suite = "transform/hson/quoted-name-rejection";
  const rows: readonly Readonly<{
    caseId: string;
    name: string;
    source: string;
    code: string;
    location?: Readonly<{ index: number; line: number; column: number }>;
  }>[] = Object.freeze([
    { caseId: "legacy-object-name", name: "legacy backtick-delimited object names reject", source: "<`white space` 1>", code: "HSON_NAME_LEGACY_BACKTICK" },
    { caseId: "legacy-element-name", name: "legacy backtick-delimited element names reject", source: "<`white space` \"value\"/>", code: "HSON_NAME_LEGACY_BACKTICK" },
    { caseId: "escaped-legacy-delimiter", name: "escaped legacy delimiters do not invoke compatibility syntax", source: "<`tick\\`name` 1>", code: "HSON_NAME_LEGACY_BACKTICK" },
    { caseId: "raw-root-backtick", name: "raw root backticks reject", source: "`name`", code: "HSON_NAME_LEGACY_BACKTICK" },
    { caseId: "raw-array-backtick", name: "raw array backticks reject", source: "[1,`name`]", code: "HSON_NAME_LEGACY_BACKTICK" },
    { caseId: "raw-object-value-backtick", name: "raw backticks cannot become object values", source: "<name `value`>", code: "HSON_NAME_LEGACY_BACKTICK" },
    { caseId: "unterminated-single-quoted-name", name: "unterminated single-quoted names reject", source: "<'unterminated 1>", code: "HSON_NAME_UNTERMINATED" },
    { caseId: "raw-apostrophe", name: "raw apostrophes do not double themselves", source: "<'don't' 1>", code: "HSON_NAME_UNTERMINATED" },
    { caseId: "invalid-letter-escape", name: "invalid quoted-name letter escapes reject", source: "<'bad\\qescape' 1>", code: "invalid-name-escape" },
    { caseId: "escaped-backtick", name: "escaped backticks are not a quoted-name escape", source: "<'bad\\`escape' 1>", code: "invalid-name-escape" },
    { caseId: "zero-digit-unicode-escape", name: "zero-digit Unicode escapes reject", source: "<'bad\\u' 1>", code: "invalid-name-escape" },
    { caseId: "two-digit-unicode-escape", name: "two-digit Unicode escapes reject", source: "<'bad\\u12' 1>", code: "invalid-name-escape" },
    { caseId: "malformed-unicode-escape", name: "malformed Unicode escapes reject", source: "<'bad\\u12xz' 1>", code: "invalid-name-escape" },
    { caseId: "trailing-backslash", name: "trailing quoted-name backslashes reject", source: "<'bad\\", code: "invalid-name-escape" },
    { caseId: "raw-horizontal-tab", name: "raw horizontal tabs inside quoted names reject", source: "<'bad\tname' 1>", code: "HSON_NAME_CONTROL_UNESCAPED" },
    { caseId: "raw-line-feed", name: "raw line feeds inside quoted names reject", source: "<'bad\nname' 1>", code: "HSON_NAME_CONTROL_UNESCAPED" },
    { caseId: "raw-carriage-return", name: "raw carriage returns inside quoted names reject", source: "<'bad\rname' 1>", code: "HSON_NAME_CONTROL_UNESCAPED" },
    { caseId: "single-quoted-root-string", name: "single quotes do not delimit root string values", source: "'value'", code: "HSON_QUOTE_KIND_UNSUPPORTED" },
    { caseId: "single-quoted-object-string", name: "single quotes do not delimit object string values", source: "<'name' 'value'>", code: "HSON_QUOTE_KIND_UNSUPPORTED" },
    { caseId: "single-quoted-attribute", name: "single quotes do not delimit attribute values", source: "<name attr='value'/>", code: "HSON_QUOTE_KIND_UNSUPPORTED" },
    { caseId: "double-quoted-member-name", name: "double quotes do not delimit object member names", source: "<\"name\" 1>", code: "HSON_OBJECT_EXTRA_VALUE" },
    { caseId: "member-without-value", name: "quoted object members require owned values", source: "<'name'>", code: "missing-object-member-value" },
    { caseId: "sibling-without-trivia", name: "quoted sibling ownership requires trivia", source: "<'left' 1'right' 2>", code: "HSON_REQUIRED_TRIVIA_MISSING" },
    { caseId: "legacy-location", name: "legacy rejection owns exact source location", source: "\n  <`legacy` 1>", code: "HSON_NAME_LEGACY_BACKTICK", location: { index: 4, line: 2, column: 4 } },
    { caseId: "escape-location", name: "escape rejection owns exact backslash location", source: "\n  <'bad\\q' 1>", code: "invalid-name-escape", location: { index: 8, line: 2, column: 8 } },
  ]);
  const cases = rows.map((row) => test_case(
    suite,
    row.caseId,
    row.name,
    () => expect_rejection(row.source, row.code, row.location),
    row.source,
  ));
  return Object.freeze({ suite, cases: Object.freeze(cases) });
}
