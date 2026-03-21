// json-fixtures.ts

import { json_CARS, json_invertebrae } from "./large-fixtures/json-chunks.mock";
import { json_homepage } from "./large-fixtures/json-homepage-string.mock";

import type { FixtureBundle } from "../../src/tests/tests.types";
import { _freeze } from "../../src/tests/tests.consts";


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


export const temp = {
  atoms: {
    "plain": "alpha",
    "empty": "",
    "spaces": "   ",
    "tab": "tab:\tone",
    "newline": "newline:\nline2",
    "crlf": "crlf:\r\nline2",
    "backslash_end": "backslash at end: \\",
    "backslash_runs": "runs: \\\\ \\\\\\\\",
    "quote_dbl": "quote: \"hi\"",
    "quote_sgl": "apostrophe: 'hi'",
    "amp": "ampersand: &",
    "ltgt": "angles: &lt;soon&gt; and &lt;/soon&gt;",
    "combo": "combo: \"hi\" &amp; &lt;soon> \\ /",
    "xml_entities_literal": "literal entities: &lt; &gt; &amp; &quot; (these should stay literal unless you double-escape)",
    "xml_cdata_end": "cdata end marker: ]]> (must be escaped in text context if you ever emit CDATA)",
    "looks_like_tag": "<tag attr=\"x\">inner</tag>",
    "looks_like_hson": "&lt;meta\n  \"x\"\n&gt;",
    "weird_unicode": "unicode: 漢字✓ e\u0301 ZWJ 👩‍💻 ZWNJ \u200C",
    "pathy": "C:\\temp\\file.txt",
    "jsonish": "{\"a\":1,\"b\":\"<x>&</x>\"}"
  },
}

export const JSON_FIXTURES_DEV = _freeze({
  test: {
    unknownFail: {
      "spaces": "   ",
    },
    empty: {
      "objectEmpty": {}
    },
    label: ["xml-escape-regression-sentry"],
    notes: [
      "If XML parse fails, search emitted HTML for raw '&', '<', ']]>' or invalid control chars in text nodes.",
      "Backslashes are usually fine; '&' and '<' are the classic killers."
    ],
    atoms: {
      "plain": "alpha",
      "empty": "",
      // "spaces": "   ",
      "tab": "tab:\tone",
      "newline": "newline:\nline2",
      "crlf": "crlf:\r\nline2",
      "backslash_end": "backslash at end: \\",
      "backslash_runs": "runs: \\\\ \\\\\\\\",
      "quote_dbl": "quote: \"hi\"",
      "quote_sgl": "apostrophe: 'hi'",
      "amp": "ampersand: &",
      "ltgt": "angles: &lt;soon&gt; and &lt;/soon&gt;",
      "combo": "combo: \"hi\" &amp; &lt;soon&gt; \\\\ /",
      "xml_entities_literal": "literal entities: &lt; &gt; &amp; &quot; (these should stay literal unless you double-escape)",
      "xml_cdata_end": "cdata end marker: ]]> (must be escaped in text context if you ever emit CDATA)",
      "looks_like_tag": "<tag attr=\"x\">inner</tag>",
      "weird_unicode": "unicode: 漢字✓ e\u0301 ZWJ 👩‍💻 ZWNJ \u200C",
      "pathy": "C:\\temp\\file.txt",
      "jsonish": "{\"a\":1,\"b\":\"<x>&</x>\"}"
    },
    arrays: [
      "ampersand: &",
      "angles: <x>",
      "backslash: \\",
      [
        "nested-arr: &",
        "nested-arr: <",
        "nested-arr: ]]>",
        "nested-arr: \\"
      ],
      {
        "in_array_obj": "array-obj: \"hi\" & <x> \\"
      }
    ],
    objects: {
      "o1": {
        "k": "obj: & < > \\ \" '",
        "arr": [
          {
            "deep": {
              "deeper": [
                "leaf: &",
                "leaf: <soon>",
                "leaf: backslash \\",
                "leaf: ]]>",
                {
                  "leaf_obj": "leaf-obj: & <soon> \\ \"hi\""
                }
              ]
            }
          }
        ]
      },
      "o2": {
        "data": [
          null,
          true,
          false,
          0,
          -0,
          1.25,
          -3.5,
          1e-9
        ],
        "strings": {
          "s1": "A & B",
          "s2": "A < B",
          "s3": "A > B",
          "s4": "A ]]> B",
          "s5": "A \\ B"
        }
      }
    },
    stress_grid: [
      {
        "a": "&",
        "b": "<",
        "c": ">",
        "d": "]]>",
        "e": "\\",
        "f": "\""
      },
      {
        "a": "mixed: & < > ]]> \\ \"",
        "b": "taggy: <span>ok</span>",
        "c": "entity-ish: &nbsp; &copy; &amp;",
        "d": "path: C:\\\\Users\\\\name\\\\file",
        "e": "jsonish: {\"x\":\"&<\"}",
        "f": "hson-ish: <meta\n  \"x\"\n>"
      }
    ]
  }

} satisfies FixtureBundle);
