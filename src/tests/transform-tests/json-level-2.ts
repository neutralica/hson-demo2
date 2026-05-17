

const jsonKeyEdgeCases: Record<string, string> = {
  // ----------------------------
  // baseline: ordinary keys
  // ----------------------------

  ordinaryKey: `{
    "key1": "val1"
  }`,

  ordinaryKeyInArray: `[
    { "key1": "val1" }
  ]`,

  ordinaryKeyWithArrayValue: `{
    "key1": ["val1"]
  }`,

  ordinaryKeyNestedObject: `{
    "key1": {
      "key2": "val2"
    }
  }`,

  // ----------------------------
  // underscore-leading keys
  // ----------------------------

  underscoreId: `{
    "_id": "abc123"
  }`,

  doubleUnderscoreTypename: `{
    "__typename": "Recipe"
  }`,

  underscoreNested: `{
    "user": {
      "_id": "abc123",
      "__typename": "User"
    }
  }`,

  underscoreInArrayObject: `[
    { "_id": "a" },
    { "_id": "b" }
  ]`,

  // ----------------------------
  // space-containing keys
  // ----------------------------

  spaceKey: `{
    "a b": "c"
  }`,

  leadingSpaceKey: `{
    " key": "value"
  }`,

  trailingSpaceKey: `{
    "key ": "value"
  }`,

  multipleSpaceKey: `{
    "a plus b is c": true
  }`,

  spaceKeyNested: `{
    "outer key": {
      "inner key": "value"
    }
  }`,

  spaceKeyInArrayObject: `[
    { "a b": "c" }
  ]`,

  spaceKeyWithArrayValue: `{
    "a b": ["c", "d"]
  }`,

  // ----------------------------
  // empty / numeric / punctuation keys
  // ----------------------------

  emptyKey: `{
    "": "empty-name"
  }`,

  numericStringKey: `{
    "000": "numeric-looking key"
  }`,

  plusKey: `{
    "a+b": "plus"
  }`,

  equalsKey: `{
    "a=b": "equals"
  }`,

  dottyKey: `{
    "...": "ellipsis"
  }`,

  // ----------------------------
  // mixed stress object
  // ----------------------------

  mixedWeirdKeys: `{
    "_id": "abc123",
    "__typename": "Thing",
    "a b": "space",
    "": "empty",
    "000": "digits",
    "a+b": "plus",
    "...": "ellipsis",
    "normal": {
      "inner key": [
        { "_id": "nested-a" },
        { "a b": "nested-space" }
      ]
    }
  }`,
};
export const jsonMostHeinous: Record<string, string> = {
  // ----------------------------
  // casing / XML lowercasing pressure
  // ----------------------------

  camelCaseKeys: `{
    "camelCase": "one",
    "PascalCase": "two",
    "SCREAMING": "three",
    "mixedCAPSKey": "four"
  }`,

  camelCaseNested: `{
    "outerKey": {
      "innerKey": {
        "deepKeyValue": "ok"
      }
    }
  }`,

  camelCaseInArray: `[
    { "itemID": 1 },
    { "itemID": 2 }
  ]`,

  // ----------------------------
  // underscores now valid/raw
  // ----------------------------

  underscorePlainVariants: `{
    "_": "single underscore",
    "__": "double underscore",
    "_id": "abc",
    "__typename": "Thing",
    "snake_case_key": "snake",
    "_leading_snake": true,
    "trailing_": false
  }`,

  underscoreNestedMixed: `{
    "_meta": {
      "__typename": "Meta",
      "_id": "m1",
      "inner_key": {
        "_deep_id": "d1"
      }
    }
  }`,

  // ----------------------------
  // empty key positions
  // ----------------------------

  emptyKeyNested: `{
    "": {
      "": "double-empty",
      "normal": "value"
    }
  }`,

  emptyKeyInArrayObjects: `[
    { "": "a" },
    { "": "b", "_id": "two" }
  ]`,

  emptyKeyWithArrayValue: `{
    "": ["x", "y", { "": "z" }]
  }`,

  // ----------------------------
  // spaces / whitespace-like keys
  // ----------------------------

  whitespaceKeyVariants: `{
    " ": "single space",
    "  ": "two spaces",
    "a  b": "double interior",
    "\\t": "literal tab escape key",
    "\\n": "literal newline escape key"
  }`,

  spacesDeepMixed: `{
    "outer key": {
      "inner key": [
        { "array item key": "one" },
        { "array item key": "two" }
      ]
    }
  }`,

  // ----------------------------
  // punctuation keys
  // ----------------------------

  punctuationKeyVariants: `{
    ".": "dot",
    "...": "ellipsis",
    "+": "plus",
    "a+b": "plus inside",
    "=": "equals",
    "a=b": "equals inside",
    "a/b": "slash",
    "a\\\\b": "backslash",
    "a:b": "colon",
    "a;b": "semicolon",
    "a,b": "comma",
    "a?b": "question",
    "a#b": "hash",
    "a&b": "amp"
  }`,

  punctuationNestedArrays: `{
    "a+b": [
      { "x=y": true },
      { "...": null },
      { "a/b": 3 }
    ]
  }`,

  // ----------------------------
  // numeric-looking keys
  // ----------------------------

  numericKeyVariants: `{
    "0": "zero",
    "000": "zero padded",
    "123": "digits",
    "1a": "digit-leading",
    "3.14": "float-looking",
    "-1": "negative-looking"
  }`,

  numericKeysNested: `{
    "2026": {
      "05": {
        "04": "date-ish"
      }
    }
  }`,

  // ----------------------------
  // quote-ish / bracket-ish keys
  // ----------------------------

  quoteAndBracketKeys: `{
    "\\"quoted\\"": "double quotes in key",
    "'single'": "single quotes in key",
    "\`backtick\`": "backticks in key",
    "<tag>": "angle tag-ish",
    "</tag>": "closing tag-ish",
    "[array]": "array-ish",
    "{object}": "object-ish"
  }`,

  nestedQuoteAndAngleKeys: `{
    "<outer>": {
      "\`inner key\`": {
        "\\"deep\\"": "value"
      }
    }
  }`,

  // ----------------------------
  // UTF / non-ASCII
  // ----------------------------

  utfKeyVariants: `{
    "café": "accent composed-ish",
    "漢字": "han",
    "ключ": "cyrillic",
    "δοκιμή": "greek",
    "mañana": "ntilde",
    "emoji_😀": "emoji"
  }`,

  utfNestedArrays: `{
    "世界": [
      { "café key": "one" },
      { "emoji 😀 key": "two" },
      { "漢 字": "three" }
    ]
  }`,

  // ----------------------------
  // values that look like markup/HSON
  // ----------------------------

  weirdKeysWithWeirdValues: `{
    "a b": "<div attr=\\"x\\">hello</div>",
    "_id": "\`\`",
    "...": "<...>",
    "": "\\"quoted value\\"",
    "camelCase": "{\\"jsonish\\":true}"
  }`,

  // ----------------------------
  // collision-ish with HTML key prefix
  // ----------------------------

  // ----------------------------
  // mixed stress
  // ----------------------------

  brutalMixedKeyStress: `{
    "": "empty",
    "_id": "abc123",
    "__typename": "Stress",
    "a b": {
      "camelCase": [
        { "000": "digits" },
        { "a+b": "plus" },
        { "emoji 😀 key": "emoji" }
      ]
    },
    "<tag attr=\\"x\\">": {
      "\`quoted-ish\`": {
        "漢 字": null,
        "SCREAMING": false,
        "snake_case": true
      }
    }
  }`,

  objectsWithinArrays: `
  {"user":
{"name":"bo",
  "age": "32",
  "children": 
[
    {"name":"mo"},
    {"name":"jo"}
  ]
}
}`
};

const json2_INVALID = {
  htmlPrefixLiteralKeys: `{
    "_-_-": "bare prefix-looking key",
    "_-_-literal": "prefix-looking key",
    "_-_-outer_x20-key": "encoded-looking but user-authored key"
  }`,

  htmlPrefixNested: `{
    "_-_-": {
      "_-_-inner": {
        "a b": "value"
      }
    }
  }`,
}
export const JSON_FAIL_FIXTURES = { json2: json2_INVALID }
export const JSON_FIXTURES_LEVEL2 = { level2: { ...jsonKeyEdgeCases, ...jsonMostHeinous } };