
/**
 * Compile-only LiveMap public API probes.
 *
 * This file is intentionally not a runtime suite. Its job is to fail TypeScript
 * when public API inference regresses. `TypeExpect<TypeExtends<...>>` checks the
 * positive inferred types, while `@ts-expect-error` checks that invalid writes
 * are still rejected by the type surface.
 */

import { type InferLiveMapSchema, type LiveMapSchemaValue, hsonLiveMap } from "hson-live/livemap";
import type { JsonValue } from "hson-live/types";
import type { TypeExpect, TypeExtends } from "./api-suite";

// --- Defined schema inference ---
// If this section fails, start in hson-live's unified schema builder types and
// confirm `hsonLiveMap.schema.define` preserves the returned expression evidence.
const API_STRING_SCHEMA = hsonLiveMap.schema.define((s) => s.string);
const API_STRING_ARRAY_SCHEMA = hsonLiveMap.schema.define((s) => s.string.array);
const API_OPTIONAL_NUMBER_SCHEMA = hsonLiveMap.schema.define((s) => s.number.optional);
const API_NULLABLE_BOOLEAN_SCHEMA = hsonLiveMap.schema.define((s) => s.boolean.nullable);
type _ApiSchemaString = TypeExpect<TypeExtends<InferLiveMapSchema<typeof API_STRING_SCHEMA>, string>>;
type _ApiSchemaStringArray = TypeExpect<TypeExtends<InferLiveMapSchema<typeof API_STRING_ARRAY_SCHEMA>, readonly string[]>>;
type _ApiSchemaOptionalNumber = TypeExpect<TypeExtends<InferLiveMapSchema<typeof API_OPTIONAL_NUMBER_SCHEMA>, number | undefined>>;
type _ApiSchemaNullableBoolean = TypeExpect<TypeExtends<InferLiveMapSchema<typeof API_NULLABLE_BOOLEAN_SCHEMA>, boolean | null>>;
const API_SCHEMA_TYPE_SAMPLE = hsonLiveMap.schema.define((s) => ({
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
// --- Schema-bound map/root/path inference ---
// If this section fails, inspect the public factories and schema binding path:
// `hson.ts` for `hsonLiveMap.fromJson(...)`, then `api/livemap/core.ts` and
// `api/livemap/livemap.types.ts` for `LiveMap<TValue>`, `schema.use(...)`,
// `schema.use(...)`, `snap()`, `at(...)`, and `LiveMapPathValue`.
const API_TYPED_MAP_SAMPLE = hsonLiveMap
  .fromJson({ user: { name: "Ada" } })
  .schema.use(hsonLiveMap.schema.define((s) => ({
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

// --- Object read API inference ---
// If this section fails, start in `api/livemap/livemap.types.ts` around
// `LiveMapPathObjectApi`, `LiveMapObjectShape`, `LiveMapObjectValue`, and
// related object helper types. Then check `api/livemap/handle.ts` passes `TValue`
// into `make_livemap_object_api<TValue>(...)`, and `handle-object.ts` preserves it.
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

// --- Array schema/path inference setup ---
// If this setup fails, check schema array inference in `api/livemap/schema.ts`,
// then `LiveMapPathValue` in `api/livemap/livemap.types.ts` for numeric path parts.
const API_TYPED_ARRAY_MAP_SAMPLE = hsonLiveMap
  .fromJson({
    items: [
      { id: "a", count: 1 },
      { id: "b", count: 2 },
    ],
  })
  .schema.use(hsonLiveMap.schema.define((s) => ({
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
type _ApiTypedArrayItemSnap = TypeExpect<TypeExtends<ApiTypedArrayItemSnap, { id: string; count: number; label?: string; } | undefined>>;
type _ApiTypedArrayItemIdSnap = TypeExpect<TypeExtends<ApiTypedArrayItemIdSnap, string | undefined>>;
type _ApiTypedArrayItemLabelSnap = TypeExpect<TypeExtends<ApiTypedArrayItemLabelSnap, string | undefined>>;

// --- Array read API inference ---
// If this section fails, start in `api/livemap/livemap.types.ts` around
// `LiveMapPathArrayApi`, `LiveMapArrayShape`, and `LiveMapArrayItem`. Then check
// `api/livemap/handle.ts` passes `TValue` into `make_livemap_array_api<TValue>(...)`,
// and `api/livemap/handle-array.ts` preserves typed read returns.

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

// --- Object read API through array item paths ---
// If this section fails but the direct object-read section passes, inspect
// `LiveMapPathValue` for array item traversal and confirm numeric path parts
// flow into object handles as the array item type.
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

// --- Proxy read API inference ---
// If this section fails, start in `api/livemap/livemap.types.ts` around
// `LiveMapProxy`, `LiveMapProxyObjectChildren`, and `LiveMapProxyArrayChildren`.
// Then check `api/livemap/proxy.ts` for typed path accumulation and `$_` returning
// `LiveMapPathHandle<LiveMapPathValue<TValue, TPath>>`.

const API_TYPED_MAP_PROXY = API_TYPED_MAP_SAMPLE.proxy();
const API_TYPED_MAP_PROXY_USER_SNAP = API_TYPED_MAP_PROXY.user.$_.snap();
const API_TYPED_MAP_PROXY_USER_NAME_SNAP = API_TYPED_MAP_PROXY.user.name.$_.snap();
const API_TYPED_MAP_PROXY_USER_OBJECT = API_TYPED_MAP_PROXY.user.$_.object.toObject();
const API_TYPED_MAP_PROXY_USER_OBJECT_NAME = API_TYPED_MAP_PROXY.user.$_.object.getKey("name");
const API_TYPED_MAP_PROXY_USER_OBJECT_AGE = API_TYPED_MAP_PROXY.user.$_.object.getKey("age");
const API_TYPED_MAP_PROXY_USER_OBJECT_MISSING = API_TYPED_MAP_PROXY.user.$_.object.getKey("missing");

type ApiTypedMapProxyUserSnap = typeof API_TYPED_MAP_PROXY_USER_SNAP;
type ApiTypedMapProxyUserNameSnap = typeof API_TYPED_MAP_PROXY_USER_NAME_SNAP;
type ApiTypedMapProxyUserObject = typeof API_TYPED_MAP_PROXY_USER_OBJECT;
type ApiTypedMapProxyUserObjectName = typeof API_TYPED_MAP_PROXY_USER_OBJECT_NAME;
type ApiTypedMapProxyUserObjectAge = typeof API_TYPED_MAP_PROXY_USER_OBJECT_AGE;
type ApiTypedMapProxyUserObjectMissing = typeof API_TYPED_MAP_PROXY_USER_OBJECT_MISSING;
type _ApiTypedMapProxyUserSnap = TypeExpect<TypeExtends<ApiTypedMapProxyUserSnap, { name: string; age?: number; }>>;
type _ApiTypedMapProxyUserNameSnap = TypeExpect<TypeExtends<ApiTypedMapProxyUserNameSnap, string>>;
type _ApiTypedMapProxyUserObject = TypeExpect<TypeExtends<ApiTypedMapProxyUserObject, { name: string; age?: number; }>>;
type _ApiTypedMapProxyUserObjectName = TypeExpect<TypeExtends<ApiTypedMapProxyUserObjectName, string>>;
type _ApiTypedMapProxyUserObjectAge = TypeExpect<TypeExtends<ApiTypedMapProxyUserObjectAge, number | undefined>>;
type _ApiTypedMapProxyUserObjectMissing = TypeExpect<TypeExtends<ApiTypedMapProxyUserObjectMissing, JsonValue | undefined>>;

const API_TYPED_ARRAY_PROXY = API_TYPED_ARRAY_MAP_SAMPLE.proxy();
const API_TYPED_ARRAY_PROXY_ITEMS_SNAP = API_TYPED_ARRAY_PROXY.items.$_.snap();
const API_TYPED_ARRAY_PROXY_ITEMS_ARRAY = API_TYPED_ARRAY_PROXY.items.$_.array.toArray();
const API_TYPED_ARRAY_PROXY_ITEM_SNAP = API_TYPED_ARRAY_PROXY.items[0]!.$_.snap();
const API_TYPED_ARRAY_PROXY_ITEM_ID_SNAP = API_TYPED_ARRAY_PROXY.items[0]!.id.$_.snap();
const API_TYPED_ARRAY_PROXY_ITEM_LABEL_SNAP = API_TYPED_ARRAY_PROXY.items[0]!.label.$_.snap();
const API_TYPED_ARRAY_PROXY_ITEM_OBJECT = API_TYPED_ARRAY_PROXY.items[0]!.$_.object.toObject();
const API_TYPED_ARRAY_PROXY_ITEM_OBJECT_ID = API_TYPED_ARRAY_PROXY.items[0]!.$_.object.getKey("id");
const API_TYPED_ARRAY_PROXY_ITEM_OBJECT_LABEL = API_TYPED_ARRAY_PROXY.items[0]!.$_.object.getKey("label");

type ApiTypedArrayProxyItemsSnap = typeof API_TYPED_ARRAY_PROXY_ITEMS_SNAP;
type ApiTypedArrayProxyItemsArray = typeof API_TYPED_ARRAY_PROXY_ITEMS_ARRAY;
type ApiTypedArrayProxyItemSnap = typeof API_TYPED_ARRAY_PROXY_ITEM_SNAP;
type ApiTypedArrayProxyItemIdSnap = typeof API_TYPED_ARRAY_PROXY_ITEM_ID_SNAP;
type ApiTypedArrayProxyItemLabelSnap = typeof API_TYPED_ARRAY_PROXY_ITEM_LABEL_SNAP;
type ApiTypedArrayProxyItemObject = typeof API_TYPED_ARRAY_PROXY_ITEM_OBJECT;
type ApiTypedArrayProxyItemObjectId = typeof API_TYPED_ARRAY_PROXY_ITEM_OBJECT_ID;
type ApiTypedArrayProxyItemObjectLabel = typeof API_TYPED_ARRAY_PROXY_ITEM_OBJECT_LABEL;
type _ApiTypedArrayProxyItemsSnap = TypeExpect<TypeExtends<ApiTypedArrayProxyItemsSnap, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArrayProxyItemsArray = TypeExpect<TypeExtends<ApiTypedArrayProxyItemsArray, readonly { id: string; count: number; label?: string; }[]>>;
type _ApiTypedArrayProxyItemSnap = TypeExpect<TypeExtends<ApiTypedArrayProxyItemSnap, { id: string; count: number; label?: string; } | undefined>>;
type _ApiTypedArrayProxyItemIdSnap = TypeExpect<TypeExtends<ApiTypedArrayProxyItemIdSnap, string | undefined>>;
type _ApiTypedArrayProxyItemLabelSnap = TypeExpect<TypeExtends<ApiTypedArrayProxyItemLabelSnap, string | undefined>>;
type _ApiTypedArrayProxyItemObject = TypeExpect<TypeExtends<ApiTypedArrayProxyItemObject, { id: string; count: number; label?: string; }>>;
type _ApiTypedArrayProxyItemObjectId = TypeExpect<TypeExtends<ApiTypedArrayProxyItemObjectId, string>>;
type _ApiTypedArrayProxyItemObjectLabel = TypeExpect<TypeExtends<ApiTypedArrayProxyItemObjectLabel, string | undefined>>;

// --- Path/handle/proxy write inference ---
// If this section fails, inspect `LiveMapWriteValue`, `LiveMapPathWriteValue`,
// `LiveMapCore.set`, and `LiveMapPathHandle.set/update` in
// `api/livemap/livemap.types.ts`. If bad writes are not rejected, check for a
// missing `NoInfer` on value parameters.
API_TYPED_MAP_SAMPLE.set(["user", "name"], "Grace");
API_TYPED_MAP_SAMPLE.set(["user", "age"], 38);
API_TYPED_MAP_SAMPLE.set(["user"], { name: "Grace" });
API_TYPED_MAP_SAMPLE.set(["user"], { name: "Grace", age: 38 });
API_TYPED_MAP_USER_HANDLE.set({ name: "Grace" });
API_TYPED_MAP_USER_HANDLE.set({ name: "Grace", age: 38 });
API_TYPED_MAP_USER_HANDLE.update((value) => ({ ...value, name: "Grace" }));
API_TYPED_MAP_USER_NAME_HANDLE.set("Grace");
API_TYPED_MAP_USER_NAME_HANDLE.update((value) => `${value}!`);
API_TYPED_MAP_PROXY.user.name.$_.set("Grace");
API_TYPED_MAP_PROXY.user.$_.set({ name: "Grace", age: 38 });
API_TYPED_ARRAY_MAP_SAMPLE.set(["items", 0], { id: "z", count: 3 });
API_TYPED_ARRAY_MAP_SAMPLE.set(["items", 0, "id"], "z");
API_TYPED_ARRAY_MAP_SAMPLE.set(["items", 0, "count"], 3);
API_TYPED_ARRAY_ITEMS_HANDLE.set([{ id: "a", count: 1 }, { id: "b", count: 2, label: "B" }]);
API_TYPED_ARRAY_ITEM_HANDLE.set({ id: "z", count: 3 });
API_TYPED_ARRAY_ITEM_HANDLE.update((value) => ({ ...value, count: value!.count + 1 }));
API_TYPED_ARRAY_PROXY.items[0]!.$_.set({ id: "z", count: 3 });
API_TYPED_ARRAY_PROXY.items[0]!.id.$_.set("z");
API_TYPED_ARRAY_PROXY.items[0]!.count.$_.set(3);
// @ts-expect-error typed map.set rejects wrong primitive value for string path
API_TYPED_MAP_SAMPLE.set(["user", "name"], 38);
// @ts-expect-error typed map.set rejects wrong primitive value for number path
API_TYPED_MAP_SAMPLE.set(["user", "age"], "38");
// @ts-expect-error typed handle.update rejects wrong primitive return value
API_TYPED_MAP_USER_NAME_HANDLE.update(() => 38);
// @ts-expect-error typed proxy handle.set rejects wrong primitive value
API_TYPED_MAP_PROXY.user.name.$_.set(38);
// @ts-expect-error typed map.set rejects wrong array item property value
API_TYPED_ARRAY_MAP_SAMPLE.set(["items", 0, "count"], "3");

// @ts-expect-error typed array proxy handle.set rejects wrong primitive value
API_TYPED_ARRAY_PROXY.items[0]!.count.$_.set("3");

// --- Batch write inference ---
// If this section fails, inspect `LiveMapBatchTx`, `LiveMapCore.batch`, and
// `make_batch_tx(...)` in `api/livemap/livemap.types.ts` and
// `api/livemap/core.ts`. Batch tx.set should preserve the same path/value
// inference as map.set.
API_TYPED_MAP_SAMPLE.batch((tx) => {
  tx.set(["user", "name"], "Grace");
  tx.set(["user", "age"], 38);
  tx.set(["user"], { name: "Grace" });
  tx.set(["user"], { name: "Grace", age: 38 });
  tx.setMany(["user"], { name: "Grace", age: 38 });
  tx.delete(["user", "name"]);
  tx.setMany(["user"], { name: "Grace" });
  tx.setMany(["user"], { age: 38 });
});

API_TYPED_ARRAY_MAP_SAMPLE.batch((tx) => {
  tx.set(["items", 0], { id: "z", count: 3 });
  tx.set(["items", 0, "id"], "z");
  tx.set(["items", 0, "count"], 3);
  tx.setMany(["items", 0], { id: "z", count: 3 });
  tx.delete(["items", 0, "label"]);
  tx.setMany(["items", 0], { id: "z" });
  tx.setMany(["items", 0], { count: 3 });
  tx.setMany(["items", 0], { label: "Z" });
});

API_TYPED_MAP_SAMPLE.batch((tx) => {
  // @ts-expect-error typed batch tx.set rejects wrong primitive value for string path
  tx.set(["user", "name"], 38);
  // @ts-expect-error typed batch tx.set rejects wrong primitive value for number path
  tx.set(["user", "age"], "38");
  // @ts-expect-error typed batch tx.setMany rejects wrong primitive value for string property
  tx.setMany(["user"], { name: 38 });
  // @ts-expect-error typed batch tx.setMany rejects wrong primitive value for number property
  tx.setMany(["user"], { age: "38" });
  // @ts-expect-error typed batch tx.setMany rejects unknown keys for schema-shaped object paths
  tx.setMany(["user"], { missing: "dynamic" });
});

API_TYPED_ARRAY_MAP_SAMPLE.batch((tx) => {
  // @ts-expect-error typed batch tx.set rejects wrong array item property value
  tx.set(["items", 0, "count"], "3");
  // @ts-expect-error typed batch tx.setMany rejects wrong array item property value
  tx.setMany(["items", 0], { count: "3" });
  // @ts-expect-error typed batch tx.setMany rejects unknown keys for typed array item paths
  tx.setMany(["items", 0], { missing: "dynamic" });
});

// --- Object setKey write inference ---
// If this section fails, inspect `LiveMapObjectWriteValue`, `LiveMapObjectKey`,
// and `LiveMapPathObjectApi.setKey` in `api/livemap/livemap.types.ts`, then
// `api/livemap/handle-object.ts`. Schema-shaped objects should reject unknown
// keys; dynamic record-like objects are covered below. */

API_TYPED_MAP_USER_HANDLE.object.setKey("name", "Grace");
API_TYPED_MAP_USER_HANDLE.object.setKey("age", 38);
// @ts-expect-error typed object.setMany rejects unknown keys for schema-shaped objects
API_TYPED_MAP_USER_HANDLE.object.setMany({ missing: "dynamic" });
// @ts-expect-error typed object.setMany rejects unknown keys for schema-shaped objects
API_TYPED_MAP_USER_HANDLE.object.setMany({ missing: { nested: true } });
API_TYPED_MAP_PROXY.user.$_.object.setKey("name", "Grace");
API_TYPED_MAP_PROXY.user.$_.object.setKey("age", 38);
API_TYPED_ARRAY_ITEM_HANDLE.object.setKey("id", "z");
API_TYPED_ARRAY_ITEM_HANDLE.object.setKey("count", 3);
API_TYPED_ARRAY_ITEM_HANDLE.object.setKey("label", "Z");
API_TYPED_ARRAY_PROXY.items[0]!.$_.object.setKey("id", "z");
API_TYPED_ARRAY_PROXY.items[0]!.$_.object.setKey("count", 3);
API_TYPED_ARRAY_PROXY.items[0]!.$_.object.setKey("label", "Z");

// --- Dynamic object write inference ---
// If this section fails, the strict-object policy may be over-tightened.
// Unschemaed/dynamic object handles should still allow arbitrary string keys
// with JsonValue writes via `LiveMapObjectShape<TValue>` / `LiveMapObjectKey<TValue>`.
const API_DYNAMIC_OBJECT_MAP = hsonLiveMap.fromJson({ bag: {} });
const API_DYNAMIC_OBJECT_HANDLE = API_DYNAMIC_OBJECT_MAP.at(["bag"]);

API_DYNAMIC_OBJECT_HANDLE.object.setKey("missing", "dynamic");
API_DYNAMIC_OBJECT_HANDLE.object.setKey("nested", { ok: true });
API_DYNAMIC_OBJECT_HANDLE.object.setMany({ missing: "dynamic" });
API_DYNAMIC_OBJECT_HANDLE.object.setMany({ nested: { ok: true } });

// @ts-expect-error typed object.setKey rejects wrong primitive value for string property
API_TYPED_MAP_USER_HANDLE.object.setKey("name", 38);

// @ts-expect-error typed object.setKey rejects wrong primitive value for number property
API_TYPED_MAP_USER_HANDLE.object.setKey("age", "38");

// @ts-expect-error typed proxy object.setKey rejects wrong primitive value for string property
API_TYPED_MAP_PROXY.user.$_.object.setKey("name", 38);

// @ts-expect-error typed array item object.setKey rejects wrong primitive value for string property
API_TYPED_ARRAY_ITEM_HANDLE.object.setKey("id", 3);

// @ts-expect-error typed array item object.setKey rejects wrong primitive value for number property
API_TYPED_ARRAY_ITEM_HANDLE.object.setKey("count", "3");

// @ts-expect-error typed array proxy object.setKey rejects wrong primitive value for optional string property
API_TYPED_ARRAY_PROXY.items[0]!.$_.object.setKey("label", 3);

// --- Array write inference ---
// If this section fails, inspect `LiveMapArrayWriteItem` and the write methods
// on `LiveMapPathArrayApi` in `api/livemap/livemap.types.ts`, then
// `api/livemap/handle-array.ts` for `arraySplice<TValue>(...)` and item-write methods.

API_TYPED_ARRAY_ITEMS_HANDLE.array.push({ id: "c", count: 3 });
API_TYPED_ARRAY_ITEMS_HANDLE.array.push({ id: "c", count: 3, label: "C" });
API_TYPED_ARRAY_ITEMS_HANDLE.array.pushMany([{ id: "c", count: 3 }, { id: "d", count: 4, label: "D" }]);
API_TYPED_ARRAY_ITEMS_HANDLE.array.unshift({ id: "z", count: 0 });
API_TYPED_ARRAY_ITEMS_HANDLE.array.unshiftMany([{ id: "y", count: 0 }, { id: "z", count: 1 }]);
API_TYPED_ARRAY_ITEMS_HANDLE.array.insert(0, { id: "x", count: 1 });
API_TYPED_ARRAY_ITEMS_HANDLE.array.replace(0, { id: "x", count: 1, label: "X" });
API_TYPED_ARRAY_ITEMS_HANDLE.array.splice(0);
API_TYPED_ARRAY_ITEMS_HANDLE.array.splice(0, 1);
API_TYPED_ARRAY_ITEMS_HANDLE.array.splice(0, 1, { id: "x", count: 1 });
API_TYPED_ARRAY_ITEMS_HANDLE.array.splice(0, 1, { id: "x", count: 1 }, { id: "y", count: 2, label: "Y" });

API_TYPED_ARRAY_PROXY.items.$_.array.push({ id: "c", count: 3 });
API_TYPED_ARRAY_PROXY.items.$_.array.insert(0, { id: "x", count: 1 });
API_TYPED_ARRAY_PROXY.items.$_.array.replace(0, { id: "x", count: 1 });

// @ts-expect-error typed array.push rejects missing required item property
API_TYPED_ARRAY_ITEMS_HANDLE.array.push({ id: "c" });

// @ts-expect-error typed array.push rejects wrong item property type
API_TYPED_ARRAY_ITEMS_HANDLE.array.push({ id: "c", count: "3" });

// @ts-expect-error typed array.push rejects wrong item primitive
API_TYPED_ARRAY_ITEMS_HANDLE.array.push("c");

// @ts-expect-error typed array.pushMany rejects bad member shape
API_TYPED_ARRAY_ITEMS_HANDLE.array.pushMany([{ id: "c", count: 3 }, { id: "d" }]);

// @ts-expect-error typed array.unshift rejects wrong item property type
API_TYPED_ARRAY_ITEMS_HANDLE.array.unshift({ id: "z", count: "0" });

// @ts-expect-error typed array.insert rejects missing required item property
API_TYPED_ARRAY_ITEMS_HANDLE.array.insert(0, { id: "x" });

// @ts-expect-error typed array.replace rejects wrong item property type
API_TYPED_ARRAY_ITEMS_HANDLE.array.replace(0, { id: "x", count: "1" });

// @ts-expect-error typed array.splice rejects wrong inserted item shape
API_TYPED_ARRAY_ITEMS_HANDLE.array.splice(0, 1, { id: "x" });

// @ts-expect-error typed proxy array.push rejects wrong item shape
API_TYPED_ARRAY_PROXY.items.$_.array.push({ id: "c" });

// --- Object setMany write inference ---
// If this section fails, inspect `LiveMapObjectSetManyValues<TValue>` and
// `LiveMapPathObjectApi.setMany` in `api/livemap/livemap.types.ts`, then
// `api/livemap/handle-object.ts`. Schema-shaped objects should accept partial
// known-key patches and reject unknown keys; dynamic objects should remain loose.

API_TYPED_MAP_USER_HANDLE.object.setMany({ name: "Grace" });
API_TYPED_MAP_USER_HANDLE.object.setMany({ age: 38 });
API_TYPED_MAP_USER_HANDLE.object.setMany({ name: "Grace", age: 38 });
// @ts-expect-error typed object.setKey rejects unknown keys for schema-shaped objects
API_TYPED_MAP_USER_HANDLE.object.setKey("missing", "dynamic");
// @ts-expect-error typed object.setKey rejects unknown keys for schema-shaped objects
API_TYPED_MAP_USER_HANDLE.object.setKey("missing", { nested: true });
API_TYPED_MAP_PROXY.user.$_.object.setMany({ name: "Grace", age: 38 });

API_TYPED_ARRAY_ITEM_HANDLE.object.setMany({ id: "z" });
API_TYPED_ARRAY_ITEM_HANDLE.object.setMany({ count: 3 });
API_TYPED_ARRAY_ITEM_HANDLE.object.setMany({ label: "Z" });
API_TYPED_ARRAY_ITEM_HANDLE.object.setMany({ id: "z", count: 3, label: "Z" });
API_TYPED_ARRAY_PROXY.items[0]!.$_.object.setMany({ id: "z", count: 3 });

// @ts-expect-error typed object.setMany rejects wrong primitive value for string property
API_TYPED_MAP_USER_HANDLE.object.setMany({ name: 38 });

// @ts-expect-error typed object.setMany rejects wrong primitive value for number property
API_TYPED_MAP_USER_HANDLE.object.setMany({ age: "38" });

// @ts-expect-error typed proxy object.setMany rejects wrong primitive value for string property
API_TYPED_MAP_PROXY.user.$_.object.setMany({ name: 38 });

// @ts-expect-error typed array item object.setMany rejects wrong primitive value for string property
API_TYPED_ARRAY_ITEM_HANDLE.object.setMany({ id: 3 });

// @ts-expect-error typed array item object.setMany rejects wrong primitive value for number property
API_TYPED_ARRAY_ITEM_HANDLE.object.setMany({ count: "3" });

// @ts-expect-error typed array proxy object.setMany rejects wrong primitive value for optional string property
API_TYPED_ARRAY_PROXY.items[0]!.$_.object.setMany({ label: 3 });


// --- Subscription API inference ---
// If this section fails, inspect `LiveMapSubApi`, `LiveMapStoreApi`, and the
// `sub` wiring in `api/livemap/livemap.types.ts` and `api/livemap/core.ts`.
API_TYPED_MAP_SAMPLE.sub((state) => {
  const root: { user: { name: string; age?: number; }; } = state;
  void root;
});

API_TYPED_MAP_SAMPLE.sub.diff((next, prev) => {
  const nextRoot: { user: { name: string; age?: number; }; } = next;
  const prevRoot: { user: { name: string; age?: number; }; } = prev;
  void nextRoot;
  void prevRoot;
});

API_TYPED_MAP_SAMPLE.sub.sel(
  (state) => state.user.name,
  (next, prev, state) => {
    const nextName: string = next;
    const prevName: string = prev;
    const root: { user: { name: string; age?: number; }; } = state;
    void nextName;
    void prevName;
    void root;
  },
);

API_TYPED_MAP_SAMPLE.sub.sel(
  (state) => state.user.name,
  () => undefined,
  {
    equal: (next, prev) => {
      const nextName: string = next;
      const prevName: string = prev;
      void nextName;
      void prevName;
      return next === prev;
    },
  },
);

API_TYPED_MAP_SAMPLE.sub.path(["user", "name"], (next, prev) => {
  const nextName: string = next;
  const prevName: string = prev;
  void nextName;
  void prevName;
});

API_TYPED_MAP_SAMPLE.sub.path(["user", "name"], () => undefined, {
  equal: (next, prev) => {
    const nextName: string = next;
    const prevName: string = prev;
    void nextName;
    void prevName;
    return next === prev;
  },
});

API_TYPED_MAP_SAMPLE.sub.path(["user", "name"], () => undefined, {
  // @ts-expect-error typed sub.path equality receives string at user.name, not numbers
  equal: (next: number, prev: number) => next === prev,
});

API_TYPED_MAP_SAMPLE.setMany(["user"], { name: "Grace" });
API_TYPED_MAP_SAMPLE.setMany(["user"], { age: 38 });
API_TYPED_MAP_SAMPLE.setMany(["user"], { name: "Grace", age: 38 });

API_TYPED_MAP_USER_HANDLE.setMany({ name: "Grace" });
API_TYPED_MAP_USER_HANDLE.setMany({ age: 38 });
API_TYPED_MAP_USER_HANDLE.setMany({ name: "Grace", age: 38 });

API_TYPED_ARRAY_MAP_SAMPLE.setMany(["items", 0], { id: "z" });
API_TYPED_ARRAY_MAP_SAMPLE.setMany(["items", 0], { count: 3 });
API_TYPED_ARRAY_MAP_SAMPLE.setMany(["items", 0], { label: "Z" });
API_TYPED_ARRAY_MAP_SAMPLE.setMany(["items", 0], { id: "z", count: 3, label: "Z" });

// @ts-expect-error typed sub root listener receives the schema-bound root, not a primitive
API_TYPED_MAP_SAMPLE.sub((state: string) => {
  void state;
});

// @ts-expect-error typed sub.sel listener receives selected string values, not numbers
API_TYPED_MAP_SAMPLE.sub.sel((state) => state.user.name, (next: number) => {
  void next;
});

// @ts-expect-error typed sub.sel equality receives selected string values, not numbers
API_TYPED_MAP_SAMPLE.sub.sel((state) => state.user.name, () => undefined, {
  equal: (next: number, prev: number) => next === prev,
});

// @ts-expect-error typed sub.path listener receives string at user.name, not number
API_TYPED_MAP_SAMPLE.sub.path(["user", "name"], (next: number) => {
  void next;
});

// @ts-expect-error typed map.setMany rejects wrong primitive value for string property
API_TYPED_MAP_SAMPLE.setMany(["user"], { name: 38 });

// @ts-expect-error typed map.setMany rejects wrong primitive value for number property
API_TYPED_MAP_SAMPLE.setMany(["user"], { age: "38" });

// @ts-expect-error typed map.setMany rejects unknown keys for schema-shaped object paths
API_TYPED_MAP_SAMPLE.setMany(["user"], { missing: "dynamic" });

// @ts-expect-error typed handle.setMany rejects wrong primitive value for string property
API_TYPED_MAP_USER_HANDLE.setMany({ name: 38 });

// @ts-expect-error typed handle.setMany rejects unknown keys for schema-shaped object paths
API_TYPED_MAP_USER_HANDLE.setMany({ missing: "dynamic" });

// @ts-expect-error typed map.setMany rejects wrong array item property value
API_TYPED_ARRAY_MAP_SAMPLE.setMany(["items", 0], { count: "3" });

// @ts-expect-error typed map.setMany rejects unknown keys for typed array item paths
API_TYPED_ARRAY_MAP_SAMPLE.setMany(["items", 0], { missing: "dynamic" });

API_TYPED_MAP_SAMPLE.replace({
  user: { name: "Grace", age: 38 },
});

API_TYPED_ARRAY_MAP_SAMPLE.replace({
  items: [{ id: "z", count: 3 }],
});

// @ts-expect-error typed replace rejects wrong root shape
API_TYPED_MAP_SAMPLE.replace({ user: { age: 38 } });

// @ts-expect-error typed replace rejects wrong nested primitive
API_TYPED_MAP_SAMPLE.replace({ user: { name: "Grace", age: "38" } });
