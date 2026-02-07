// json-fixtures.ts

import { json_CARS, json_invertebrae } from "./large-fixtures/json-chunks.mock";
import { json_homepage } from "./large-fixtures/json-homepage-string.mock";
import { _freeze } from "../../src/fixtures/generate-fixtures";
import type { FixtureBundle } from "../../src/tests/tests.types";

const jsonRudiments = {
  simpleObject: `{"test_case": "simpleObject", "value": 1}`,
  nestedObject: `{"test_case": "nestedObject", "data": {"nested": true}}`,
  simpleArray: `["simpleArray", "item_one", "item_two"]`,
  arrayOfObjects: `[{"test_case": "arrayOfObjects"}, {"item": 1}, {"item": 2}]`,
  mixedTypes: `{
        "test_case": "mixedTypes",
        "a_string": "string value",
        "a_number": 123,
        "a_boolean": false,
        "a_null": null
    }`,
  emptyObject: `{}`,
  emptyArray: `[]`,
  stringWithEscapes: `{"test_case": "stringWithEscapes", "value": "line one\\nline two"}`,
};

const jsonSamples = {
  "kv": '{ "name": "HSON" }',
  "basicObj": `{ "details": { "version": "1.0" } }`,
  "boolObj": `{ "details": { "boolval": true, "stringbool": "true" } }`,
  "nullObj": `{ "details": { "null": null } }`,
  "prop2Obj": `{ "info": { "name": "HSON", "status": "dev" } }`,
  "arrayObj": `{ "letters": ["alpha", "beta"] }`,

  "primitives": `{
    "parsedDigit": 1,
    "stringDigit": "2",
    "booleanValue": false,
    "nullValue": null,
    "stringNull": "null",
    "stringword": "string"
  }`,
  arrays: `[
    "a", "two", 3, true, "false", "5", null
  ]`,
  complexArrays: `{
    "parent": {
      "subParent": [
        "item 2",
        [],
        "item 3",
        [],
        {
          "subParent2": [
            { "array1": [1, 2, 3, 4] },
            { "array2": ["x", "y", "z", "a"] },
            { "array3": ["x", "y", "z", "a"] }
          ]
        }
      ]

    }
  }`,
  numbers: `{
    "stringNumbers": ["1", "2", "3", "4", "5"],
    "parsedNumbers": [1, 2, 3, 4, 5]
  }`
}


export const nastyJson =
{
  heterogeneousArrayDeep: `[
            { "a": 1 },
            2,
            "x",
            null,
            true,
            { "b": [1, { "c": null }, []] },
            []
        ]`,
  indexWidth: `[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]`,
  emptiesEverywhere: `{
            "emptyObj": {},
            "emptyArr": [],
            "nested": [{}, []],
            "emptyStr": ""
        }`,
  unicodeAndBidi: `{
            "emoji": "🧪🚀",
            "combining": "e\u0301",
            "rtl_override": "\u202Eabc\u202C",
            "astral_pair": "\uD83D\uDE80"
        }`,
  htmlLikeSubstrings: `{
            "looksLikeTag": "<notatag>",
            "commentLike": "<!-- not a comment -->",
            "entities": "&copy; &notanentity;"
        }`,
  numbersCorner: `{
            "int": 0,
            "negZero": -0,
            "float": 1.0,
            "exp": 1e-9,
            "big": 900719925479993
        }`,
  deepNesting: `{ "a": { "b": { "c": { "d": { "e": { "f": 1 } } } } } }`,

  // TODO - fix this case handling, and possibly only this: ("" as key)

  mixedArrayShapes: `[
        [],
        [""],
        ["", ""],
        [null],
        [[1, 2], []]
    ]`,

}

// simple, manual, flat. Keys are case names. Values are atoms.
export const JSON_FIXTURES_LEGACY = _freeze({
  json__Rudiments: jsonRudiments,
  json__Samples: jsonSamples,
  json__nastyJson: nastyJson,
  json__biggish: {
    json__CARS: json_CARS,
    json__invertebrae: json_invertebrae,
    json__homepage: json_homepage
  }
  // Add your “old gold standards” here, but keep them *flat*.
  // html__wikipedia_home: html_wikipedia,  // maybe keep “hero” separate
} satisfies FixtureBundle);
