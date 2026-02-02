// json-fixtures.ts

export type JsonFixtureKey = keyof typeof JSON_FIXTURES;

export const JSON_FIXTURES = {
  hello: `{"hello":"world"}`,
  primitives: `{"n":1,"f":1.5,"b":true,"z":null,"a":[1,2,3]}`,
  pretty: `{
    "a": 1,
    "b": [true, false, null],
    "c": { "d": "ok" }
  }`,
  escapes: `{"q":"\\"","slash":"\\\\","nl":"\\n","tab":"\\t","u":"\\u263A"}`,
  deep: `{"a":{"b":{"c":{"d":{"e":[{"x":1},{"y":2}]}}}}}`,
  empties: `{"s":"","arr":[],"obj":{}}`,

  invalid_trailing_comma: `{"a":1,}`,
  invalid_unquoted_key: `{a:1}`,
} as const;

export const LOOP_FIXTURES = {
  json_basic: `{"hello":"world"}`,
  json_deep: `{"a":{"b":{"c":[1,2,{"x":"y"}]}}}`,
  html_basic: `<div><span>hi</span></div>`,
//   hson_basic_elem: `<div "hson"/>`,
// hson_basic_obj: `<div "hson">`,
} as const;

export type LoopFixtureKey = keyof typeof LOOP_FIXTURES;
