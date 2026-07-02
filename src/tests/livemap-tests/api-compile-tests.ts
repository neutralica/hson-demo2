import { type InferLiveMapSchemaToken, hson, type InferLiveMapSchema, type LiveMapSchemaValue } from "hson-live";
import type { JsonValue } from "hson-live/types";
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

const API_TYPED_MAP_USER_OBJECT = API_TYPED_MAP_USER_HANDLE.object.toObject();
const API_TYPED_MAP_USER_OBJECT_NAME = API_TYPED_MAP_USER_HANDLE.object.getKey("name");
const API_TYPED_MAP_USER_OBJECT_AGE = API_TYPED_MAP_USER_HANDLE.object.getKey("age");
const API_TYPED_MAP_USER_OBJECT_UNKNOWN = API_TYPED_MAP_USER_HANDLE.object.getKey("missing");
const API_TYPED_MAP_USER_OBJECT_PICK = API_TYPED_MAP_USER_HANDLE.object.pick(["name"] as const);
const API_TYPED_MAP_USER_OBJECT_OMIT = API_TYPED_MAP_USER_HANDLE.object.omit(["age"] as const);
const API_TYPED_MAP_USER_OBJECT_KEYS = API_TYPED_MAP_USER_HANDLE.object.keys();
const API_TYPED_MAP_USER_OBJECT_VALUES = API_TYPED_MAP_USER_HANDLE.object.values();
const API_TYPED_MAP_USER_OBJECT_ENTRIES = API_TYPED_MAP_USER_HANDLE.object.entries();

type ApiTypedMapUserObject = typeof API_TYPED_MAP_USER_OBJECT;
type ApiTypedMapUserObjectName = typeof API_TYPED_MAP_USER_OBJECT_NAME;
type ApiTypedMapUserObjectAge = typeof API_TYPED_MAP_USER_OBJECT_AGE;
type ApiTypedMapUserObjectUnknown = typeof API_TYPED_MAP_USER_OBJECT_UNKNOWN;
type ApiTypedMapUserObjectPick = typeof API_TYPED_MAP_USER_OBJECT_PICK;
type ApiTypedMapUserObjectOmit = typeof API_TYPED_MAP_USER_OBJECT_OMIT;
type ApiTypedMapUserObjectKeys = typeof API_TYPED_MAP_USER_OBJECT_KEYS;
type ApiTypedMapUserObjectValues = typeof API_TYPED_MAP_USER_OBJECT_VALUES;
type ApiTypedMapUserObjectEntries = typeof API_TYPED_MAP_USER_OBJECT_ENTRIES;

type _ApiTypedMapUserObject = TypeExpect<TypeExtends<ApiTypedMapUserObject, { name: string; age?: number; }>>;
type _ApiTypedMapUserObjectName = TypeExpect<TypeExtends<ApiTypedMapUserObjectName, string>>;
type _ApiTypedMapUserObjectAge = TypeExpect<TypeExtends<ApiTypedMapUserObjectAge, number | undefined>>;
type _ApiTypedMapUserObjectUnknown = TypeExpect<TypeExtends<ApiTypedMapUserObjectUnknown, JsonValue | undefined>>;
type _ApiTypedMapUserObjectPick = TypeExpect<TypeExtends<ApiTypedMapUserObjectPick, { name: string; }>>;
type _ApiTypedMapUserObjectOmit = TypeExpect<TypeExtends<ApiTypedMapUserObjectOmit, { name: string; }>>;
type _ApiTypedMapUserObjectKeys = TypeExpect<TypeExtends<ApiTypedMapUserObjectKeys, readonly ("name" | "age")[]>>;
type _ApiTypedMapUserObjectValues = TypeExpect<TypeExtends<ApiTypedMapUserObjectValues, readonly (string | number | undefined)[]>>;
type _ApiTypedMapUserObjectEntries = TypeExpect<TypeExtends<ApiTypedMapUserObjectEntries, readonly (readonly ["name", string] | readonly ["age", number | undefined])[]>>;

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

// --- Array API compile-only probe ---

const API_TYPED_ARRAY_TO_ARRAY = API_TYPED_ARRAY_ITEMS_HANDLE.array.toArray();
const API_TYPED_ARRAY_SLICE = API_TYPED_ARRAY_ITEMS_HANDLE.array.slice(1);
const API_TYPED_ARRAY_TAKE = API_TYPED_ARRAY_ITEMS_HANDLE.array.take(1);
const API_TYPED_ARRAY_DROP = API_TYPED_ARRAY_ITEMS_HANDLE.array.drop(1);
const API_TYPED_ARRAY_TAKE_LAST = API_TYPED_ARRAY_ITEMS_HANDLE.array.takeLast(1);
const API_TYPED_ARRAY_DROP_LAST = API_TYPED_ARRAY_ITEMS_HANDLE.array.dropLast(1);
const API_TYPED_ARRAY_AT = API_TYPED_ARRAY_ITEMS_HANDLE.array.at(0);
const API_TYPED_ARRAY_FIRST = API_TYPED_ARRAY_ITEMS_HANDLE.array.first();
const API_TYPED_ARRAY_LAST = API_TYPED_ARRAY_ITEMS_HANDLE.array.last();

type ApiTypedArrayToArray = typeof API_TYPED_ARRAY_TO_ARRAY;
type ApiTypedArraySlice = typeof API_TYPED_ARRAY_SLICE;
type ApiTypedArrayTake = typeof API_TYPED_ARRAY_TAKE;
type ApiTypedArrayDrop = typeof API_TYPED_ARRAY_DROP;
type ApiTypedArrayTakeLast = typeof API_TYPED_ARRAY_TAKE_LAST;
type ApiTypedArrayDropLast = typeof API_TYPED_ARRAY_DROP_LAST;
type ApiTypedArrayAt = typeof API_TYPED_ARRAY_AT;
type ApiTypedArrayFirst = typeof API_TYPED_ARRAY_FIRST;
type ApiTypedArrayLast = typeof API_TYPED_ARRAY_LAST;
type _ApiTypedArrayToArray = TypeExpect<TypeExtends<ApiTypedArrayToArray, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArraySlice = TypeExpect<TypeExtends<ApiTypedArraySlice, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArrayTake = TypeExpect<TypeExtends<ApiTypedArrayTake, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArrayDrop = TypeExpect<TypeExtends<ApiTypedArrayDrop, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArrayTakeLast = TypeExpect<TypeExtends<ApiTypedArrayTakeLast, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArrayDropLast = TypeExpect<TypeExtends<ApiTypedArrayDropLast, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArrayAt = TypeExpect<TypeExtends<ApiTypedArrayAt, { id: string; count: number; label?: string; }>>;
type _ApiTypedArrayFirst = TypeExpect<TypeExtends<ApiTypedArrayFirst, { id: string; count: number; label?: string; }>>;
type _ApiTypedArrayLast = TypeExpect<TypeExtends<ApiTypedArrayLast, { id: string; count: number; label?: string; }>>;

const API_TYPED_ARRAY_ITEM_OBJECT = API_TYPED_ARRAY_ITEM_HANDLE.object.toObject();
const API_TYPED_ARRAY_ITEM_OBJECT_ID = API_TYPED_ARRAY_ITEM_HANDLE.object.getKey("id");
const API_TYPED_ARRAY_ITEM_OBJECT_COUNT = API_TYPED_ARRAY_ITEM_HANDLE.object.getKey("count");
const API_TYPED_ARRAY_ITEM_OBJECT_LABEL = API_TYPED_ARRAY_ITEM_HANDLE.object.getKey("label");
const API_TYPED_ARRAY_ITEM_OBJECT_MISSING = API_TYPED_ARRAY_ITEM_HANDLE.object.getKey("missing");
const API_TYPED_ARRAY_ITEM_OBJECT_PICK = API_TYPED_ARRAY_ITEM_HANDLE.object.pick(["id", "label"] as const);
const API_TYPED_ARRAY_ITEM_OBJECT_OMIT = API_TYPED_ARRAY_ITEM_HANDLE.object.omit(["count"] as const);
const API_TYPED_ARRAY_ITEM_OBJECT_KEYS = API_TYPED_ARRAY_ITEM_HANDLE.object.keys();
const API_TYPED_ARRAY_ITEM_OBJECT_VALUES = API_TYPED_ARRAY_ITEM_HANDLE.object.values();
const API_TYPED_ARRAY_ITEM_OBJECT_ENTRIES = API_TYPED_ARRAY_ITEM_HANDLE.object.entries();

type ApiTypedArrayItemObject = typeof API_TYPED_ARRAY_ITEM_OBJECT;
type ApiTypedArrayItemObjectId = typeof API_TYPED_ARRAY_ITEM_OBJECT_ID;
type ApiTypedArrayItemObjectCount = typeof API_TYPED_ARRAY_ITEM_OBJECT_COUNT;
type ApiTypedArrayItemObjectLabel = typeof API_TYPED_ARRAY_ITEM_OBJECT_LABEL;
type ApiTypedArrayItemObjectMissing = typeof API_TYPED_ARRAY_ITEM_OBJECT_MISSING;
type ApiTypedArrayItemObjectPick = typeof API_TYPED_ARRAY_ITEM_OBJECT_PICK;
type ApiTypedArrayItemObjectOmit = typeof API_TYPED_ARRAY_ITEM_OBJECT_OMIT;
type ApiTypedArrayItemObjectKeys = typeof API_TYPED_ARRAY_ITEM_OBJECT_KEYS;
type ApiTypedArrayItemObjectValues = typeof API_TYPED_ARRAY_ITEM_OBJECT_VALUES;
type ApiTypedArrayItemObjectEntries = typeof API_TYPED_ARRAY_ITEM_OBJECT_ENTRIES;
type _ApiTypedArrayItemObject = TypeExpect<TypeExtends<ApiTypedArrayItemObject, { id: string; count: number; label?: string; }>>;
type _ApiTypedArrayItemObjectId = TypeExpect<TypeExtends<ApiTypedArrayItemObjectId, string>>;
type _ApiTypedArrayItemObjectCount = TypeExpect<TypeExtends<ApiTypedArrayItemObjectCount, number>>;
type _ApiTypedArrayItemObjectLabel = TypeExpect<TypeExtends<ApiTypedArrayItemObjectLabel, string | undefined>>;
type _ApiTypedArrayItemObjectMissing = TypeExpect<TypeExtends<ApiTypedArrayItemObjectMissing, JsonValue | undefined>>;
type _ApiTypedArrayItemObjectPick = TypeExpect<TypeExtends<ApiTypedArrayItemObjectPick, { id: string; label?: string; }>>;
type _ApiTypedArrayItemObjectOmit = TypeExpect<TypeExtends<ApiTypedArrayItemObjectOmit, { id: string; label?: string; }>>;
type _ApiTypedArrayItemObjectKeys = TypeExpect<TypeExtends<ApiTypedArrayItemObjectKeys, readonly ("id" | "count" | "label")[]>>;
type _ApiTypedArrayItemObjectValues = TypeExpect<TypeExtends<ApiTypedArrayItemObjectValues, readonly (string | number | undefined)[]>>;
type _ApiTypedArrayItemObjectEntries = TypeExpect<TypeExtends<ApiTypedArrayItemObjectEntries, readonly (readonly ["id", string] | readonly ["count", number] | readonly ["label", string | undefined])[]>>;
