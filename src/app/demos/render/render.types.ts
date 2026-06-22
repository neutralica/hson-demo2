import type { LiveTree } from "hson-live";
import type { CssMap } from "hson-live/types";

export type JsonPathPart = string | number;
export type JsonRenderKind = "array" | "boolean" | "null" | "number" | "object" | "string";
export type JsonRenderRole = "array" | "connector" | "item" | "key" | "object" | "primitive" | "property" | "root" | "trigger" | "value";
export type ConnectorPosition = "first" | "last" | "middle" | "single";

export type JsonRenderOptions = Readonly<{
    clearHost?: boolean;
}>;

export type JsonRenderPart = Readonly<{
    tree: LiveTree;
    path: readonly JsonPathPart[];
    pathText: string;
    role: JsonRenderRole;
    kind: JsonRenderKind;
}>;

export type JsonRenderGroup = Readonly<{
    items: readonly LiveTree[];
    each: (fn: (tree: LiveTree) => void) => void;
    css: Readonly<{
        setMany: (styles: CssMap) => void;
    }>;
}>;

export type JsonRender = Readonly<{
    root: LiveTree;
    parts: readonly JsonRenderPart[];
    all: JsonRenderGroup;
    arrays: JsonRenderGroup;
    connectors: JsonRenderGroup;
    items: JsonRenderGroup;
    keys: JsonRenderGroup;
    objects: JsonRenderGroup;
    primitives: JsonRenderGroup;
    properties: JsonRenderGroup;
    values: JsonRenderGroup;
    byPath: (path: string | readonly JsonPathPart[]) => LiveTree | undefined;
}>;
export type JsonRenderBuckets = {
    all: LiveTree[];
    arrays: LiveTree[];
    connectors: LiveTree[];
    items: LiveTree[];
    keys: LiveTree[];
    objects: LiveTree[];
    primitives: LiveTree[];
    properties: LiveTree[];
    values: LiveTree[];
};
export type JsonRenderDraft = {
    parts: JsonRenderPart[];
    buckets: JsonRenderBuckets;
    byPath: Map<string, LiveTree>;
};
