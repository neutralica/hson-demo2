import { type InferLiveMapSchemaToken, hson, type InferLiveMapSchema, type LiveMapSchemaValue } from "hson-live";
import type { TypeExpect, TypeExtends } from "./api-suite";

type _ApiSchemaTokenString = TypeExpect<TypeExtends<InferLiveMapSchemaToken<typeof hson.liveMap.schema.string>, string>>;
type _ApiSchemaTokenStringArray = TypeExpect<TypeExtends<InferLiveMapSchemaToken<typeof hson.liveMap.schema.string.array>, readonly string[]>>;
type _ApiSchemaTokenOptionalNumber = TypeExpect<TypeExtends<InferLiveMapSchemaToken<typeof hson.liveMap.schema.number.optional>, number | undefined>>;
type _ApiSchemaTokenNullableBoolean = TypeExpect<TypeExtends<InferLiveMapSchemaToken<typeof hson.liveMap.schema.boolean.nullable>, boolean | null>>;
const API_SCHEMA_TYPE_SAMPLE = hson.liveMap.schema.define((s) => ({
  user: {
    id: s.string,
    name: s.string,
    age: s.number.optional,
    role: s.pick("admin", "user"),
    tags: s.array(s.string),
    settings: s.record(s.pick(s.string, s.number)),
    patch: s.partial({
      name: s.string,
      age: s.number,
    }),
    deepPatch: s.deepPartial({
      profile: {
        displayName: s.string,
        links: s.array({
          label: s.string,
          href: s.string,
        }),
      },
    }),
    status: s.literal("draft", "published", null),
    result: s.tagged("kind", {
      success: {
        value: s.string,
      },
      failure: {
        code: s.number,
      },
    }),
  },
}));
type ApiSchemaTypeSample = InferLiveMapSchema<typeof API_SCHEMA_TYPE_SAMPLE>;
type ApiSchemaTypeSampleValue = LiveMapSchemaValue<typeof API_SCHEMA_TYPE_SAMPLE>;
type _ApiSchemaValueAlias = TypeExpect<TypeExtends<ApiSchemaTypeSampleValue, ApiSchemaTypeSample>>;
type _ApiSchemaUserId = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["id"], string>>;
type _ApiSchemaUserName = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["name"], string>>;
type _ApiSchemaUserAge = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["age"], number | undefined>>;
type _ApiSchemaUserRole = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["role"], "admin" | "user">>;
type _ApiSchemaUserTags = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["tags"], readonly string[]>>;
type _ApiSchemaUserSettings = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["settings"], Readonly<Record<string, string | number>>>>;
type _ApiSchemaUserPatch = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["patch"], { name?: string; age?: number; }>>;
type _ApiSchemaUserDeepPatch = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["deepPatch"], { profile?: { displayName?: string; links?: readonly { label?: string; href?: string; }[]; }; }>>;
type _ApiSchemaUserStatus = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["status"], "draft" | "published" | null>>;
type _ApiSchemaUserResult = TypeExpect<TypeExtends<ApiSchemaTypeSample["user"]["result"], { kind: "success"; value: string; } | { kind: "failure"; code: number; }>>;
const API_TYPED_MAP_SAMPLE = hson.liveMap
  .fromJson({ user: { name: "Ada" } })
  .schema.use(hson.liveMap.schema.define((s) => ({
    user: {
      name: s.string,
      age: s.number.optional,
    },
  })));
type ApiTypedMapRootSnap = ReturnType<typeof API_TYPED_MAP_SAMPLE.snap>;

type _ApiTypedMapRootSnap = TypeExpect<TypeExtends<ApiTypedMapRootSnap, { user: { name: string; age?: number; }; }>>;
const API_TYPED_MAP_USER_HANDLE = API_TYPED_MAP_SAMPLE.at(["user"]);
const API_TYPED_MAP_USER_NAME_HANDLE = API_TYPED_MAP_SAMPLE.at(["user", "name"]);
type ApiTypedMapUserSnap = ReturnType<typeof API_TYPED_MAP_USER_HANDLE.snap>;
type ApiTypedMapUserNameSnap = ReturnType<typeof API_TYPED_MAP_USER_NAME_HANDLE.snap>;
type _ApiTypedMapUserSnap = TypeExpect<TypeExtends<ApiTypedMapUserSnap, { name: string; age?: number; }>>;
type _ApiTypedMapUserNameSnap = TypeExpect<TypeExtends<ApiTypedMapUserNameSnap, string>>;

const API_TYPED_ARRAY_MAP_SAMPLE = hson.liveMap
  .fromJson({
    items: [
      { id: "a", count: 1 },
      { id: "b", count: 2 },
    ],
  })
  .schema.use(hson.liveMap.schema.define((s) => ({
    items: s.array({
      id: s.string,
      count: s.number,
      label: s.string.optional,
    }),
  })));
  
const API_TYPED_ARRAY_ITEMS_HANDLE = API_TYPED_ARRAY_MAP_SAMPLE.at(["items"]);
const API_TYPED_ARRAY_ITEM_HANDLE = API_TYPED_ARRAY_MAP_SAMPLE.at(["items", 0]);
const API_TYPED_ARRAY_ITEM_ID_HANDLE = API_TYPED_ARRAY_MAP_SAMPLE.at(["items", 0, "id"]);
const API_TYPED_ARRAY_ITEM_LABEL_HANDLE = API_TYPED_ARRAY_MAP_SAMPLE.at(["items", 0, "label"]);
type ApiTypedArrayItemsSnap = ReturnType<typeof API_TYPED_ARRAY_ITEMS_HANDLE.snap>;
type ApiTypedArrayItemSnap = ReturnType<typeof API_TYPED_ARRAY_ITEM_HANDLE.snap>;
type ApiTypedArrayItemIdSnap = ReturnType<typeof API_TYPED_ARRAY_ITEM_ID_HANDLE.snap>;
type ApiTypedArrayItemLabelSnap = ReturnType<typeof API_TYPED_ARRAY_ITEM_LABEL_HANDLE.snap>;
type _ApiTypedArrayItemsSnap = TypeExpect<TypeExtends<ApiTypedArrayItemsSnap, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArrayItemSnap = TypeExpect<TypeExtends<ApiTypedArrayItemSnap, { id: string; count: number; label?: string; }>>;
type _ApiTypedArrayItemIdSnap = TypeExpect<TypeExtends<ApiTypedArrayItemIdSnap, string>>;
type _ApiTypedArrayItemLabelSnap = TypeExpect<TypeExtends<ApiTypedArrayItemLabelSnap, string | undefined>>;
