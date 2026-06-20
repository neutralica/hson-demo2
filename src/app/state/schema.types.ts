import type { JsonValue } from "hson-live/types";
import type { StatePath, StateMutation } from "./state.types";

export type SchemaSegment = string | number | "*";
export type SchemaPath = string | readonly SchemaSegment[];

export type SchemaValueType = "unknown" |
  "string" |
  "number" |
  "boolean" |
  "null" |
  "object" |
  "array";

export type SchemaStorageMode = "hot" | "lazy" | "opaque";

export type SchemaIssue = Readonly<{
  path: readonly (string | number)[];
  code: string;
  message: string;
}>;

export type SchemaValidation = Readonly<{
  ok: boolean;
  issues: readonly SchemaIssue[];
}>;

export type SchemaRule = Readonly<{
  type?: SchemaValueType | readonly SchemaValueType[];
  optional?: boolean;
  readonly?: boolean;
  label?: string;
  storage?: SchemaStorageMode;
  items?: SchemaRule;
  literals?: readonly JsonValue[];
  validate?: (value: JsonValue, ctx: SchemaValidationContext) => readonly SchemaIssue[] | SchemaIssue | string | undefined;
}>;

export type SchemaValidationContext = Readonly<{
  path: readonly (string | number)[];
  rule: SchemaRule;
}>;

export type SchemaMatch = Readonly<{
  path: readonly SchemaSegment[];
  rule: SchemaRule;
}>;

export type NodeSchema = Readonly<{
  set(path: SchemaPath, rule: SchemaRule): NodeSchema;
  remove(path: SchemaPath): NodeSchema;
  get(path: SchemaPath): SchemaRule | undefined;
  match(path: StatePath): SchemaMatch | undefined;
  validateValue(path: StatePath, value: JsonValue): SchemaValidation;
  validateMutation(mutation: StateMutation): SchemaValidation;
  validateCommit(mutations: readonly StateMutation[]): SchemaValidation;
  assertValue(path: StatePath, value: JsonValue): void;
  assertMutation(mutation: StateMutation): void;
  assertCommit(mutations: readonly StateMutation[]): void;
  entries(): readonly SchemaMatch[];
}>;

export type SchemaOptionalToken<T = JsonValue> = SchemaToken<T> & Readonly<{
  __optional: true;
}>;export type SchemaToken<T = JsonValue> = Readonly<{
  __schemaToken: true;
  __type?: T;
  __optional?: boolean;
  __recordShape?: SchemaShapeValue;
  rule: SchemaRule;
  optional: SchemaOptionalToken<T>;
  array: SchemaToken<T[]>;
  nullable: SchemaToken<T | null>;
  readonly: SchemaToken<T>;
  lazy: SchemaToken<T>;
  opaque: SchemaToken<T>;
}>;

export type SchemaContext = Readonly<{
  string: SchemaToken<string>;
  number: SchemaToken<number>;
  boolean: SchemaToken<boolean>;
  null: SchemaToken<null>;
  unknown: SchemaToken<JsonValue>;
  oklch: SchemaToken<string>;
  record<const V extends SchemaShapeValue>(value: V): SchemaToken<Record<string, InferShapeValue<V>>>;
  pick<const T extends readonly JsonValue[]>(...values: T): SchemaToken<T[number]>;
}>;
export interface SchemaShape {
  readonly [key: string]: SchemaShapeValue;
}

export type SchemaShapeValue = SchemaToken |
  readonly JsonValue[] |
  SchemaRule |
  SchemaShape;
export type TypedNodeSchema<T> = NodeSchema & Readonly<{
  __type?: T;
}>;
type OptionalKeys<T extends SchemaShape> = {
  [K in keyof T]: T[K] extends { readonly __optional: true; } ? K : never;
}[keyof T];
type RequiredKeys<T extends SchemaShape> = Exclude<keyof T, OptionalKeys<T>>;

export type InferShapeValue<T> = T extends SchemaToken<infer V> ? V : T extends readonly (infer V)[] ? V : T extends SchemaShape ? InferShape<T> : JsonValue;

export type InferShape<T extends SchemaShape> = {
  [K in RequiredKeys<T>]: InferShapeValue<T[K]>;
} &
{
  [K in OptionalKeys<T>]?: InferShapeValue<T[K]>;
};

export type InferSchema<T> = T extends TypedNodeSchema<infer V> ? V : T extends SchemaToken<infer V> ? V : never;

