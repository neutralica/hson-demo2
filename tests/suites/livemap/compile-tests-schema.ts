import { hson } from "hson-live";
import type { InferLiveMapSchema, LiveMapSchemaValue } from "hson-live/livemap";

type TypeExpect<TValue extends true> = TValue;
type TypeExtends<TActual, TExpected> = TActual extends TExpected ? true : false;
const STRING_SCHEMA = hson.liveMap.schema.define((s) => s.string);
const STRING_ARRAY_SCHEMA = hson.liveMap.schema.define((s) => s.array(s.string));
const NULLABLE_NUMBER_SCHEMA = hson.liveMap.schema.define((s) => s.number.nullable);
const OPTIONAL_BOOLEAN_SCHEMA = hson.liveMap.schema.define((s) => s.boolean.optional);
type _SchemaStringInference = TypeExpect<TypeExtends<InferLiveMapSchema<typeof STRING_SCHEMA>, string>>;
type _SchemaStringArrayInference = TypeExpect<TypeExtends<InferLiveMapSchema<typeof STRING_ARRAY_SCHEMA>, readonly string[]>>;
type _SchemaNullableNumberInference = TypeExpect<TypeExtends<InferLiveMapSchema<typeof NULLABLE_NUMBER_SCHEMA>, number | null>>;
type _SchemaOptionalBooleanInference = TypeExpect<TypeExtends<InferLiveMapSchema<typeof OPTIONAL_BOOLEAN_SCHEMA>, boolean | undefined>>;
const SCHEMA_TYPE_INFERENCE_SAMPLE = hson.liveMap.schema.define((s) => s.object({
  user: s.object({
    id: s.string,
    name: s.string,
    age: s.number.optional,
    role: s.pick("admin", "user"),
    status: s.literal("draft", "published", null),
    tags: s.array(s.string),
    coords: s.tuple(s.number, s.number),
    range: s.tuple(s.number, s.number.optional),
    settings: s.record(s.pick(s.string, s.number)),
    patch: s.partial(s.object({
      displayName: s.string,
      active: s.boolean,
    })),
    deepPatch: s.deepPartial(s.object({
      profile: s.object({
        displayName: s.string,
        links: s.array(s.object({
          label: s.string,
          href: s.string,
        })),
      }),
      flags: s.record(s.object({
        enabled: s.boolean,
      })),
    })),
    result: s.tagged("kind", {
      success: s.object({ value: s.string }),
      failure: s.object({ error: s.string }),
    }),
    objectChoice: s.pick(
      s.object({ ok: s.pick(true), value: s.string }),
      s.object({ ok: s.pick(false), error: s.string })
    ),
    color: s.constrain(
      s.string,
      "oklch string",
      (value) => typeof value === "string" && value.startsWith("oklch(")
    ),
  }),
}));
type SchemaTypeInferenceSample = InferLiveMapSchema<typeof SCHEMA_TYPE_INFERENCE_SAMPLE>;
type SchemaTypeInferenceSampleValueAlias = LiveMapSchemaValue<typeof SCHEMA_TYPE_INFERENCE_SAMPLE>;
type ExpectedSchemaTypeInferenceSample = {
  user: {
    id: string;
    name: string;
    age?: number;
    role: "admin" | "user";
    status: "draft" | "published" | null;
    tags: readonly string[];
    coords: readonly [number, number];
    range: readonly [number, number?];
    settings: Readonly<Record<string, string | number>>;
    patch: Partial<{
      displayName: string;
      active: boolean;
    }>;
    deepPatch: {
      profile?: {
        displayName?: string;
        links?: readonly {
          label?: string;
          href?: string;
        }[];
      };
      flags?: Readonly<Record<string, {
        enabled?: boolean;
      }>>;
    };
    result: { kind: "success"; value: string; } |
    { kind: "failure"; error: string; };
    objectChoice: { ok: true; value: string; } |
    { ok: false; error: string; };
    color: string;
  };
};
type SchemaTypeInferenceUser = SchemaTypeInferenceSample["user"];
type ExpectedSchemaTypeInferenceUser = ExpectedSchemaTypeInferenceSample["user"];
type _SchemaTypeInferenceValueAlias = TypeExpect<TypeExtends<SchemaTypeInferenceSampleValueAlias, SchemaTypeInferenceSample>>;
type _SchemaTypeInferenceId = TypeExpect<TypeExtends<SchemaTypeInferenceUser["id"], ExpectedSchemaTypeInferenceUser["id"]>>;
type _SchemaTypeInferenceName = TypeExpect<TypeExtends<SchemaTypeInferenceUser["name"], ExpectedSchemaTypeInferenceUser["name"]>>;
type _SchemaTypeInferenceAge = TypeExpect<TypeExtends<SchemaTypeInferenceUser["age"], ExpectedSchemaTypeInferenceUser["age"]>>;
type _SchemaTypeInferenceRole = TypeExpect<TypeExtends<SchemaTypeInferenceUser["role"], ExpectedSchemaTypeInferenceUser["role"]>>;
type _SchemaTypeInferenceStatus = TypeExpect<TypeExtends<SchemaTypeInferenceUser["status"], ExpectedSchemaTypeInferenceUser["status"]>>;
type _SchemaTypeInferenceTags = TypeExpect<TypeExtends<SchemaTypeInferenceUser["tags"], ExpectedSchemaTypeInferenceUser["tags"]>>;
type _SchemaTypeInferenceCoords = TypeExpect<TypeExtends<SchemaTypeInferenceUser["coords"], ExpectedSchemaTypeInferenceUser["coords"]>>;
type _SchemaTypeInferenceRange = TypeExpect<TypeExtends<SchemaTypeInferenceUser["range"], ExpectedSchemaTypeInferenceUser["range"]>>;
type _SchemaTypeInferenceSettings = TypeExpect<TypeExtends<SchemaTypeInferenceUser["settings"], ExpectedSchemaTypeInferenceUser["settings"]>>;
type _SchemaTypeInferencePatch = TypeExpect<TypeExtends<SchemaTypeInferenceUser["patch"], ExpectedSchemaTypeInferenceUser["patch"]>>;
type _SchemaTypeInferenceDeepPatch = TypeExpect<TypeExtends<SchemaTypeInferenceUser["deepPatch"], ExpectedSchemaTypeInferenceUser["deepPatch"]>>;
type _SchemaTypeInferenceResult = TypeExpect<TypeExtends<SchemaTypeInferenceUser["result"], ExpectedSchemaTypeInferenceUser["result"]>>;
type _SchemaTypeInferenceObjectChoice = TypeExpect<TypeExtends<SchemaTypeInferenceUser["objectChoice"], ExpectedSchemaTypeInferenceUser["objectChoice"]>>;
type _SchemaTypeInferenceColor = TypeExpect<TypeExtends<SchemaTypeInferenceUser["color"], ExpectedSchemaTypeInferenceUser["color"]>>;
