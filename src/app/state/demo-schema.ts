// demo-schema.ts

import type { HsonNode, JsonValue } from "hson-live/types";
import type { NodeState, NodeStateSlot, StateCommit, StateMutation, StatePath } from "./state.types";
import { path_to_parts } from "./path-to-parts";
import type { InferShape, InferShapeValue, NodeSchema, SchemaContext, SchemaIssue, SchemaMatch, SchemaPath, SchemaRule, SchemaSegment, SchemaShape, SchemaShapeValue, SchemaToken, SchemaValidation, SchemaValueType, TypedNodeSchema } from "./schema.types";
import { allowed_types, make_token } from "./schema-helpers";
import { validateOklchValue } from "../core/helpers/color-helpers";


export const SCHEMA_CONTEXT: SchemaContext = Object.freeze({
  string: make_token<string>({ type: "string" }),
  number: make_token<number>({ type: "number" }),
  boolean: make_token<boolean>({ type: "boolean" }),
  null: make_token<null>({ type: "null" }),
  unknown: make_token<JsonValue>({ type: "unknown" }),
  oklch: make_token<string>({ type: "string", validate: validateOklchValue }),

  record<const V extends SchemaShapeValue>(value: V): SchemaToken<Record<string, InferShapeValue<V>>> {
    return make_token<Record<string, InferShapeValue<V>>>({ type: "object" }, false, value);
  },

  pick<const T extends readonly JsonValue[]>(...values: T): SchemaToken<T[number]> {
    return make_token<T[number]>({ literals: values });
  },
});


function freezeValidation(issues: SchemaIssue[]): SchemaValidation {
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}

function schemaPathParts(path: SchemaPath): SchemaSegment[] {
  return typeof path === "string" ? path_to_parts(path) : [...path];
}

function statePathParts(path: StatePath): (string | number)[] {
  return typeof path === "string" ? path_to_parts(path) : [...path];
}

function schemaKey(parts: readonly SchemaSegment[]): string {
  return JSON.stringify(parts);
}


function pathMatches(schemaPath: readonly SchemaSegment[], valuePath: readonly (string | number)[]): boolean {
  if (schemaPath.length !== valuePath.length) return false;

  for (let i = 0; i < schemaPath.length; i += 1) {
    const expected = schemaPath[i];
    if (expected === "*") continue;
    if (expected !== valuePath[i]) return false;
  }

  return true;
}

function hasWildcard(parts: readonly SchemaSegment[]): boolean {
  return parts.includes("*");
}

function isJsonContainer(value: JsonValue): value is JsonValue[] | Record<string, JsonValue> {
  return value !== null && typeof value === "object";
}

function jsonValueAtPath(root: JsonValue, path: readonly (string | number)[]): JsonValue | undefined {
  let current: JsonValue | undefined = root;

  for (const part of path) {
    if (current === undefined || !isJsonContainer(current)) return undefined;

    if (Array.isArray(current)) {
      if (typeof part !== "number") return undefined;
      current = current[part];
      continue;
    }

    current = current[part];
  }

  return current;
}

function expandSchemaPath(root: JsonValue, schemaPath: readonly SchemaSegment[]): (string | number)[][] {
  const paths: (string | number)[][] = [];

  const walk = (value: JsonValue, index: number, actualPath: (string | number)[]): void => {
    if (index >= schemaPath.length) {
      paths.push(actualPath);
      return;
    }

    const part = schemaPath[index];
    if (part === undefined) return;

    if (part === "*") {
      if (!isJsonContainer(value)) return;

      if (Array.isArray(value)) {
        value.forEach((item, itemIndex) => {
          walk(item, index + 1, [...actualPath, itemIndex]);
        });
        return;
      }

      for (const [key, item] of Object.entries(value)) {
        walk(item as JsonValue, index + 1, [...actualPath, key]);
      }

      return;
    }

    if (!isJsonContainer(value)) return;

    if (Array.isArray(value)) {
      if (typeof part !== "number") return;
      const next = value[part];
      if (next === undefined) return;
      walk(next, index + 1, [...actualPath, part]);
      return;
    }

    if (typeof part === "number") return;

    const next = value[part];
    if (next === undefined) return;
    walk(next, index + 1, [...actualPath, part]);
  };

  walk(root, 0, []);
  return paths;
}

function specificity(parts: readonly SchemaSegment[]): number {
  let score = parts.length * 10;

  for (const part of parts) {
    if (part !== "*") score += 1;
  }

  return score;
}

function valueType(value: JsonValue): SchemaValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "object";
}

function typeAllowed(rule: SchemaRule, actual: SchemaValueType): boolean {
  const allowed = allowed_types(rule);
  return allowed.includes("unknown") || allowed.includes(actual);
}

function issue(path: readonly (string | number)[], code: string, message: string): SchemaIssue {
  return Object.freeze({ path: Object.freeze([...path]), code, message });
}

function literalEqual(a: JsonValue, b: JsonValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isSchemaIssue(value: unknown): value is SchemaIssue {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "code" in value &&
    "message" in value
  );
}
function normalizeCustomIssues(
  value: JsonValue,
  path: readonly (string | number)[],
  rule: SchemaRule,
): SchemaIssue[] {
  if (!rule.validate) return [];

  const result = rule.validate(value, Object.freeze({ path: Object.freeze([...path]), rule }));
  if (result === undefined) return [];
  if (typeof result === "string") return [issue(path, "custom", result)];
  if (isSchemaIssue(result)) return [result];

  return [...result];
}


function validateRuleValue(
  rule: SchemaRule,
  path: readonly (string | number)[],
  value: JsonValue,
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const actual = valueType(value);

  if (rule.type && !typeAllowed(rule, actual)) {
    issues.push(issue(
      path,
      "type",
      `Expected ${allowed_types(rule).join(" | ")}, got ${actual}`,
    ));
  }

  if (rule.literals && !rule.literals.some((literal) => literalEqual(literal, value))) {
    issues.push(issue(path, "literal", "Value is not one of the allowed literal choices"));
  }

  if (rule.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      issues.push(...validateRuleValue(rule.items!, [...path, index], item));
    });
  }

  issues.push(...normalizeCustomIssues(value, path, rule));
  return issues;
}

function validateRootValue(schema: NodeSchema, value: JsonValue): SchemaValidation {
  const issues: SchemaIssue[] = [];

  for (const entry of schema.entries()) {
    const paths = expandSchemaPath(value, entry.path);

    if (paths.length === 0) {
      if (!hasWildcard(entry.path) && !entry.rule.optional) {
        issues.push(issue(
          entry.path.filter((part): part is string | number => part !== "*"),
          "required",
          "Required schema path is missing from replacement value",
        ));
      }

      continue;
    }

    for (const path of paths) {
      const next = jsonValueAtPath(value, path);
      if (next === undefined) continue;
      issues.push(...validateRuleValue(entry.rule, path, next));
    }
  }

  return freezeValidation(issues);
}

function schemaError(validation: SchemaValidation): Error {
  const message = validation.issues.map((i) => `${i.code}: ${i.message}`).join("; ");
  return new Error(`Schema validation failed: ${message}`);
}

function schemaUpdateError(): Error {
  return new Error(
    "Cannot call update() on schema-wrapped state; use at(...).set(...), commit(...), replace(...), or replaceRoot(...) so schema validation can run.",
  );
}

function compileShapeValue(schema: NodeSchema, path: readonly SchemaSegment[], value: SchemaShapeValue): void {
  if (isSchemaToken(value)) {
    schema.set(path, {
      ...value.rule,
      optional: value.__optional === true || value.rule.optional === true,
    });

    if (value.__recordShape !== undefined) {
      compileShapeValue(schema, [...path, "*"], value.__recordShape);
    }

    return;
  }

  if (Array.isArray(value)) {
    schema.set(path, { literals: value });
    return;
  }

  if (isSchemaRule(value)) {
    schema.set(path, value);
    return;
  }

  schema.set(path, { type: "object" });
  compileShape(schema, path, value as SchemaShape);
}

export const SCM = SCHEMA_CONTEXT;

function isSchemaToken(value: unknown): value is SchemaToken {
  return typeof value === "object" && value !== null && "__schemaToken" in value;
}

function isSchemaRule(value: unknown): value is SchemaRule {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;

  return (
    "type" in value ||
    "literals" in value ||
    "validate" in value
  );
}

function compileShape(schema: NodeSchema, basePath: readonly SchemaSegment[], shape: SchemaShape): void {
  for (const [key, value] of Object.entries(shape)) {
    compileShapeValue(schema, [...basePath, key], value);
  }
}

export function make_schema(initialEntries: readonly SchemaMatch[] = []): NodeSchema {
  const rules = new Map<string, SchemaMatch>();

  const api: NodeSchema = Object.freeze({
    set(path, rule) {
      const parts = schemaPathParts(path);
      rules.set(schemaKey(parts), Object.freeze({ path: Object.freeze(parts), rule }));
      return api;
    },

    remove(path) {
      rules.delete(schemaKey(schemaPathParts(path)));
      return api;
    },

    get(path) {
      return rules.get(schemaKey(schemaPathParts(path)))?.rule;
    },

    match(path) {
      const parts = statePathParts(path);
      let best: SchemaMatch | undefined;
      let bestScore = -1;

      for (const entry of rules.values()) {
        if (!pathMatches(entry.path, parts)) continue;

        const score = specificity(entry.path);
        if (score <= bestScore) continue;

        best = entry;
        bestScore = score;
      }

      return best;
    },

    validateValue(path, value) {
      const parts = statePathParts(path);
      const match = api.match(parts);
      if (!match) return freezeValidation([]);

      return freezeValidation(validateRuleValue(match.rule, parts, value));
    },

    validateMutation(mutation) {
      const parts = statePathParts(mutation.path);
      const match = api.match(parts);
      const issues: SchemaIssue[] = [];

      if (match?.rule.readonly) {
        issues.push(issue(parts, "readonly", "Cannot mutate readonly schema path"));
      }

      if (mutation.kind === "remove") {
        if (match && !match.rule.optional) {
          issues.push(issue(parts, "required", "Cannot remove required schema path"));
        }

        return freezeValidation(issues);
      }

      const valueValidation = api.validateValue(parts, mutation.value);
      issues.push(...valueValidation.issues);
      return freezeValidation(issues);
    },

    validateCommit(mutations) {
      const issues: SchemaIssue[] = [];

      for (const mutation of mutations) {
        issues.push(...api.validateMutation(mutation).issues);
      }

      return freezeValidation(issues);
    },

    assertValue(path, value) {
      const validation = api.validateValue(path, value);
      if (!validation.ok) throw schemaError(validation);
    },

    assertMutation(mutation) {
      const validation = api.validateMutation(mutation);
      if (!validation.ok) throw schemaError(validation);
    },

    assertCommit(mutations) {
      const validation = api.validateCommit(mutations);
      if (!validation.ok) throw schemaError(validation);
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
  const shape = makeShape(SCHEMA_CONTEXT);
  const schema = make_schema();

  compileShape(schema, [], shape);

  return schema as TypedNodeSchema<InferShape<Shape>>;
}

export function with_schema(state: NodeState, schema: NodeSchema): NodeState {
  const initialValidation = validateRootValue(schema, state.get());
  if (!initialValidation.ok) throw schemaError(initialValidation);
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
      void mut;
      throw schemaUpdateError();
    },

    replace(next: JsonValue): void {
      const validation = validateRootValue(schema, next);
      if (!validation.ok) throw schemaError(validation);
      state.replace(next);
    },

    replaceRoot(next: JsonValue): void {
      const validation = validateRootValue(schema, next);
      if (!validation.ok) throw schemaError(validation);
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