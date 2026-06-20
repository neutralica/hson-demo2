import { type SchemaShapeValue, type SchemaToken } from "./schema.types";
import { type SchemaRule, type SchemaValueType } from "./schema.types";


export function make_token<T>(rule: SchemaRule, optional = false, recordShape?: SchemaShapeValue): SchemaToken<T> {
  const token = {} as SchemaToken<T>;

  Object.defineProperties(token, {
    __schemaToken: { value: true, enumerable: false },
    __optional: { value: optional, enumerable: false },
    __recordShape: { value: recordShape, enumerable: false },
    rule: { value: rule, enumerable: true },

    optional: {
      enumerable: true,
      get() {
        return make_token<T>({ ...rule, optional: true }, true, recordShape);
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

        return make_token<T | null>(nextRule, optional, recordShape);
      },
    },

    readonly: {
      enumerable: true,
      get() {
        return make_token<T>({ ...rule, readonly: true }, optional, recordShape);
      },
    },

    lazy: {
      enumerable: true,
      get() {
        return make_token<T>({ ...rule, storage: "lazy" }, optional, recordShape);
      },
    },

    opaque: {
      enumerable: true,
      get() {
        return make_token<T>({ ...rule, storage: "opaque" }, optional, recordShape);
      },
    },
  });

  return Object.freeze(token);
}

export function merge_type(rule: SchemaRule, nextType: SchemaValueType): readonly SchemaValueType[] {
  const current = allowed_types(rule);
  return current.includes(nextType) ? current : [...current, nextType];
}
export function allowed_types(rule: SchemaRule): readonly SchemaValueType[] {
  if (!rule.type) return ["unknown"];
  return typeof rule.type === "string" ? [rule.type] : rule.type;
}

