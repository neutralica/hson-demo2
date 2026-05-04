

export const jsonKeyEdgeCases: Record<string, string> = {
  // ----------------------------
  // baseline: ordinary keys
  // ----------------------------

  ordinary_key: `{
    "key1": "val1"
  }`,

  ordinary_key_in_array: `[
    { "key1": "val1" }
  ]`,

  ordinary_key_with_array_value: `{
    "key1": ["val1"]
  }`,

  ordinary_key_nested_object: `{
    "key1": {
      "key2": "val2"
    }
  }`,

  // ----------------------------
  // underscore-leading keys
  // ----------------------------

  underscore_id: `{
    "_id": "abc123"
  }`,

  double_underscore_typename: `{
    "__typename": "Recipe"
  }`,

  underscore_nested: `{
    "user": {
      "_id": "abc123",
      "__typename": "User"
    }
  }`,

  underscore_in_array_object: `[
    { "_id": "a" },
    { "_id": "b" }
  ]`,

  // ----------------------------
  // space-containing keys
  // ----------------------------

  space_key: `{
    "a b": "c"
  }`,

  leading_space_key: `{
    " key": "value"
  }`,

  trailing_space_key: `{
    "key ": "value"
  }`,

  multiple_space_key: `{
    "a plus b is c": true
  }`,

  space_key_nested: `{
    "outer key": {
      "inner key": "value"
    }
  }`,

  space_key_in_array_object: `[
    { "a b": "c" }
  ]`,

  space_key_with_array_value: `{
    "a b": ["c", "d"]
  }`,

  // ----------------------------
  // empty / numeric / punctuation keys
  // ----------------------------

  empty_key: `{
    "": "empty-name"
  }`,

  numeric_string_key: `{
    "000": "numeric-looking key"
  }`,

  plus_key: `{
    "a+b": "plus"
  }`,

  equals_key: `{
    "a=b": "equals"
  }`,

  dotty_key: `{
    "...": "ellipsis"
  }`,

  // ----------------------------
  // mixed stress object
  // ----------------------------

  mixed_weird_keys: `{
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

export const JSON_FIXTURES_LEVEL2 = jsonKeyEdgeCases;