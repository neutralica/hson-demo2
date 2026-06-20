import type { HsonNode, JsonValue } from "hson-live/types";
import type { NodeState, NodeStateSlot, StateCommit, StateMutation, StatePath } from "./state.types";
import { path_to_parts } from "./path-to-parts";

type SchemaSegment = string | number | "*";
export type SchemaPath = string | readonly SchemaSegment[];

export type SchemaValueType =
  | "unknown"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array";

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
}>;

export type SchemaToken<T = JsonValue> = Readonly<{
  __schemaToken: true;
  __type?: T;
  __optional?: boolean;
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
  pick<const T extends readonly JsonValue[]>(...values: T): SchemaToken<T[number]>;
}>;
export interface SchemaShape {
  readonly [key: string]: SchemaShapeValue;
}

export type SchemaShapeValue =
  | SchemaToken
  | readonly JsonValue[]
  | SchemaRule
  | SchemaShape;
export type TypedNodeSchema<T> = NodeSchema & Readonly<{
  __type?: T;
}>;

type OptionalKeys<T extends SchemaShape> = {
  [K in keyof T]: T[K] extends { readonly __optional: true } ? K : never
}[keyof T];

type RequiredKeys<T extends SchemaShape> = Exclude<keyof T, OptionalKeys<T>>;

type InferShapeValue<T> =
  T extends SchemaToken<infer V> ? V :
  T extends readonly (infer V)[] ? V :
  T extends SchemaShape ? InferShape<T> :
  JsonValue;

export type InferShape<T extends SchemaShape> =
  & { [K in RequiredKeys<T>]: InferShapeValue<T[K]> }
  & { [K in OptionalKeys<T>]?: InferShapeValue<T[K]> };

export type InferSchema<T> =
  T extends TypedNodeSchema<infer V> ? V :
  T extends SchemaToken<infer V> ? V :
  never;

function freeze_validation(issues: SchemaIssue[]): SchemaValidation {
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}

function schema_path_parts(path: SchemaPath): SchemaSegment[] {
  return typeof path === "string" ? path_to_parts(path) : [...path];
}

function state_path_parts(path: StatePath): (string | number)[] {
  return typeof path === "string" ? path_to_parts(path) : [...path];
}

function schema_key(parts: readonly SchemaSegment[]): string {
  return JSON.stringify(parts);
}

function path_matches(schemaPath: readonly SchemaSegment[], valuePath: readonly (string | number)[]): boolean {
  if (schemaPath.length !== valuePath.length) return false;

  for (let i = 0; i < schemaPath.length; i += 1) {
    const expected = schemaPath[i];
    if (expected === "*") continue;
    if (expected !== valuePath[i]) return false;
  }

  return true;
}

function specificity(parts: readonly SchemaSegment[]): number {
  let score = parts.length * 10;

  for (const part of parts) {
    if (part !== "*") score += 1;
  }

  return score;
}

function value_type(value: JsonValue): SchemaValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "object";
}

function allowed_types(rule: SchemaRule): readonly SchemaValueType[] {
  if (!rule.type) return ["unknown"];
  return typeof rule.type === "string" ? [rule.type] : rule.type;
}

function type_allowed(rule: SchemaRule, actual: SchemaValueType): boolean {
  const allowed = allowed_types(rule);
  return allowed.includes("unknown") || allowed.includes(actual);
}

function issue(path: readonly (string | number)[], code: string, message: string): SchemaIssue {
  return Object.freeze({ path: Object.freeze([...path]), code, message });
}

function literal_equal(a: JsonValue, b: JsonValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function is_schema_issue(value: unknown): value is SchemaIssue {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "code" in value &&
    "message" in value
  );
}
function normalize_custom_issues(
  value: JsonValue,
  path: readonly (string | number)[],
  rule: SchemaRule,
): SchemaIssue[] {
  if (!rule.validate) return [];

  const result = rule.validate(value, Object.freeze({ path: Object.freeze([...path]), rule }));
  if (result === undefined) return [];
  if (typeof result === "string") return [issue(path, "custom", result)];
  if (is_schema_issue(result)) return [result];

  return [...result];
}

function validate_rule_value(
  rule: SchemaRule,
  path: readonly (string | number)[],
  value: JsonValue,
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const actual = value_type(value);

  if (rule.type && !type_allowed(rule, actual)) {
    issues.push(issue(
      path,
      "type",
      `Expected ${allowed_types(rule).join(" | ")}, got ${actual}`,
    ));
  }

  if (rule.literals && !rule.literals.some((literal) => literal_equal(literal, value))) {
    issues.push(issue(path, "literal", "Value is not one of the allowed literal choices"));
  }

  if (rule.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      issues.push(...validate_rule_value(rule.items!, [...path, index], item));
    });
  }

  issues.push(...normalize_custom_issues(value, path, rule));
  return issues;
}

function schema_error(validation: SchemaValidation): Error {
  const message = validation.issues.map((i) => `${i.code}: ${i.message}`).join("; ");
  return new Error(`Schema validation failed: ${message}`);
}

function merge_type(rule: SchemaRule, nextType: SchemaValueType): readonly SchemaValueType[] {
  const current = allowed_types(rule);
  return current.includes(nextType) ? current : [...current, nextType];
}

function make_token<T>(rule: SchemaRule, optional = false): SchemaToken<T> {
  const token = {} as SchemaToken<T>;

  Object.defineProperties(token, {
    __schemaToken: { value: true, enumerable: false },
    __optional: { value: optional, enumerable: false },
    rule: { value: rule, enumerable: true },

    optional: {
      enumerable: true,
      get() {
        return make_token<T>({ ...rule, optional: true }, true);
      },
    },

    array: {
      enumerable: true,
      get() {
        return make_token<T[]>({ type: "array", items: rule });
      },
    },

    nullable: {
      enumerable: true,
      get() {
        const nextRule: SchemaRule = rule.literals
          ? { ...rule, literals: [...rule.literals, null], type: merge_type(rule, "null") }
          : { ...rule, type: merge_type(rule, "null") };

        return make_token<T | null>(nextRule, optional);
      },
    },

    readonly: {
      enumerable: true,
      get() {
        return make_token<T>({ ...rule, readonly: true }, optional);
      },
    },

    lazy: {
      enumerable: true,
      get() {
        return make_token<T>({ ...rule, storage: "lazy" }, optional);
      },
    },

    opaque: {
      enumerable: true,
      get() {
        return make_token<T>({ ...rule, storage: "opaque" }, optional);
      },
    },
  });

  return Object.freeze(token);
}

export const schema_context: SchemaContext = Object.freeze({
  string: make_token<string>({ type: "string" }),
  number: make_token<number>({ type: "number" }),
  boolean: make_token<boolean>({ type: "boolean" }),
  null: make_token<null>({ type: "null" }),
  unknown: make_token<JsonValue>({ type: "unknown" }),

  pick<const T extends readonly JsonValue[]>(...values: T): SchemaToken<T[number]> {
    return make_token<T[number]>({ literals: values });
  },
});

export const scm = schema_context;

function is_schema_token(value: unknown): value is SchemaToken {
  return typeof value === "object" && value !== null && "__schemaToken" in value;
}

function is_schema_rule(value: unknown): value is SchemaRule {
  return typeof value === "object" && value !== null && (
    "type" in value ||
    "optional" in value ||
    "readonly" in value ||
    "label" in value ||
    "storage" in value ||
    "items" in value ||
    "literals" in value ||
    "validate" in value
  );
}

function compile_shape(schema: NodeSchema, basePath: readonly (string | number)[], shape: SchemaShape): void {
  for (const [key, value] of Object.entries(shape)) {
    const path = [...basePath, key];

    if (is_schema_token(value)) {
      schema.set(path, {
        ...value.rule,
        optional: value.__optional === true || value.rule.optional === true,
      });
      continue;
    }

    if (Array.isArray(value)) {
      schema.set(path, { literals: value });
      continue;
    }

    if (is_schema_rule(value)) {
      schema.set(path, value);
      continue;
    }

    schema.set(path, { type: "object" });
    compile_shape(schema, path, value as SchemaShape);
  }
}

export function make_schema(initialEntries: readonly SchemaMatch[] = []): NodeSchema {
  const rules = new Map<string, SchemaMatch>();

  const api: NodeSchema = Object.freeze({
    set(path, rule) {
      const parts = schema_path_parts(path);
      rules.set(schema_key(parts), Object.freeze({ path: Object.freeze(parts), rule }));
      return api;
    },

    remove(path) {
      rules.delete(schema_key(schema_path_parts(path)));
      return api;
    },

    get(path) {
      return rules.get(schema_key(schema_path_parts(path)))?.rule;
    },

    match(path) {
      const parts = state_path_parts(path);
      let best: SchemaMatch | undefined;
      let bestScore = -1;

      for (const entry of rules.values()) {
        if (!path_matches(entry.path, parts)) continue;

        const score = specificity(entry.path);
        if (score <= bestScore) continue;

        best = entry;
        bestScore = score;
      }

      return best;
    },

    validateValue(path, value) {
      const parts = state_path_parts(path);
      const match = api.match(parts);
      if (!match) return freeze_validation([]);

      return freeze_validation(validate_rule_value(match.rule, parts, value));
    },

    validateMutation(mutation) {
      const parts = state_path_parts(mutation.path);
      const match = api.match(parts);
      const issues: SchemaIssue[] = [];

      if (match?.rule.readonly) {
        issues.push(issue(parts, "readonly", "Cannot mutate readonly schema path"));
      }

      if (mutation.kind === "remove") {
        if (match && !match.rule.optional) {
          issues.push(issue(parts, "required", "Cannot remove required schema path"));
        }

        return freeze_validation(issues);
      }

      const valueValidation = api.validateValue(parts, mutation.value);
      issues.push(...valueValidation.issues);
      return freeze_validation(issues);
    },

    validateCommit(mutations) {
      const issues: SchemaIssue[] = [];

      for (const mutation of mutations) {
        issues.push(...api.validateMutation(mutation).issues);
      }

      return freeze_validation(issues);
    },

    assertValue(path, value) {
      const validation = api.validateValue(path, value);
      if (!validation.ok) throw schema_error(validation);
    },

    assertMutation(mutation) {
      const validation = api.validateMutation(mutation);
      if (!validation.ok) throw schema_error(validation);
    },

    assertCommit(mutations) {
      const validation = api.validateCommit(mutations);
      if (!validation.ok) throw schema_error(validation);
    },

    entries() {
      return Object.freeze([...rules.values()]);
    },
  });

  for (const entry of initialEntries) {
    api.set(entry.path, entry.rule);
  }

  return api;
}

export function define_schema<const Shape extends SchemaShape>(
  makeShape: (scm: SchemaContext) => Shape,
): TypedNodeSchema<InferShape<Shape>> {
  const shape = makeShape(schema_context);
  const schema = make_schema();

  compile_shape(schema, [], shape);

  return schema as TypedNodeSchema<InferShape<Shape>>;
}

export function with_schema(state: NodeState, schema: NodeSchema): NodeState {
  const makeSlot = (path: StatePath, slot: NodeStateSlot): NodeStateSlot => Object.freeze({
    node: () => slot.node(),
    get: () => slot.get(),
    set(next: JsonValue): StateCommit {
      schema.assertValue(path, next);
      return slot.set(next);
    },
    remove(): StateCommit {
      schema.assertMutation({ kind: "remove", path });
      return slot.remove();
    },
  });
  return Object.freeze({
    root: () => state.root(),
    get: () => state.get(),
    snapshot: () => state.snapshot(),

    update(mut: (root: HsonNode) => void): void {
      state.update(mut);
    },

    replace(next: JsonValue): void {
      schema.assertValue([], next);
      state.replace(next);
    },

    replaceRoot(next: JsonValue): void {
      schema.assertValue([], next);
      state.replaceRoot(next);
    },

    commit(mutations: readonly StateMutation[]): StateCommit {
      schema.assertCommit(mutations);
      return state.commit(mutations);
    },

    at(path: StatePath): NodeStateSlot {
      return makeSlot(path, state.at(path));
    },

    subscribe(fn: (next: HsonNode, prev: HsonNode) => void): () => void {
      return state.subscribe(fn);
    },

    subscribe_change(fn: (commit: StateCommit) => void): () => void {
      return state.subscribe_change(fn);
    },

    subscribe_sel<T>(
      sel: (root: HsonNode) => T,
      onChange: (next: T, prev: T) => void,
    ): () => void {
      return state.subscribe_sel(sel, onChange);
    },
  });
}