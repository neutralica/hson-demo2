import type { LiveTree } from "hson-live";
import type { CssMap, JsonValue } from "hson-live/types";
import { _cols } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { øfontSize } from "../../core/consts/ui-consts";

type JsonPathPart = string | number;
type JsonRenderKind = "array" | "boolean" | "null" | "number" | "object" | "string";
type JsonRenderRole = "array" | "connector" | "item" | "key" | "object" | "primitive" | "property" | "root" | "value";
type ConnectorPosition = "first" | "last" | "middle" | "single";

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

type JsonRenderBuckets = {
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

type JsonRenderDraft = {
    parts: JsonRenderPart[];
    buckets: JsonRenderBuckets;
    byPath: Map<string, LiveTree>;
};

const ROOT_CSS: CssMap = {
    ...FONT_FAM_MONO,
    fontSize: øfontSize.smol,
    display: "grid",
    gap: "0.35rem",
    alignContent: "start",
    lineHeight: "1.35",
    color: _cols.fade,
    userSelect: "none",
};

const NODE_CSS: CssMap = {
    display: "grid",
    gap: "0",
    boxSizing: "border-box",
    width: "max-content",
    minWidth: "max-content",
    border: "0",
    borderRadius: "0.18rem",
    background: "transparent",
};

function nodeCss(depth: number): CssMap {
    const safeDepth = Math.min(depth, 12);
    const rightPadding = `${0.72 + safeDepth * 0.18}rem`;
    const leftPadding = `${0.25 + safeDepth * 0.02}rem`;
    const shadeStop = `${180 - safeDepth * 4}%`;
    return {
        ...NODE_CSS,
        // padding: `0.06rem ${rightPadding} 0.08rem ${leftPadding}`,
        background: `linear-gradient(to bottom right, transparent 0%, ${_cols.backhi} ${shadeStop})`,
    };
}

const ROW_CSS: CssMap = {
    display: "grid",
    gridTemplateColumns: "0.9rem max-content max-content",
    gap: "0",
    alignItems: "stretch",
    width: "max-content",
    minWidth: "max-content",
};

const CONNECTOR_CSS: CssMap = {
    alignSelf: "stretch",
    minHeight: "1.35em",
    width: "0.9rem",
};

function connectorBackground(position: ConnectorPosition): string {
    const verticalFull = `linear-gradient(to bottom, ${_cols.fade}, ${_cols.fade}) 0.38rem 0 / 1px 100% no-repeat`;
    const verticalDown = `linear-gradient(to bottom, ${_cols.fade}, ${_cols.fade}) 0.38rem 0.72em / 1px calc(100% - 0.72em) no-repeat`;
    const verticalUp = `linear-gradient(to bottom, ${_cols.fade}, ${_cols.fade}) 0.38rem 0 / 1px 0.72em no-repeat`;
    const horizontal = `linear-gradient(to right, ${_cols.fade}, ${_cols.fade}) 0.38rem 0.72em / 0.52rem 1px no-repeat`;
    const horizontalFull = `linear-gradient(to right, ${_cols.fade}, ${_cols.fade}) 0 0.72em / 0.9rem 1px no-repeat`;

    if (position === "single") return horizontal;
    if (position === "first") return `${verticalDown}, ${horizontalFull}`;
    if (position === "last") return `${verticalUp}, ${horizontal}`;
    return `${verticalFull}, ${horizontal}`;
}

function connectorCss(depth: number, position: ConnectorPosition): CssMap {
    const safeDepth = Math.min(depth, 8);
    return {
        ...CONNECTOR_CSS,
        opacity: String(0.24 + safeDepth * 0.035),
        background: connectorBackground(position),
    };
}

function connectorPosition(index: number, count: number): ConnectorPosition {
    if (count <= 1) return "single";
    if (index === 0) return "first";
    if (index === count - 1) return "last";
    return "middle";
}

const KEY_CSS: CssMap = {
    color: _cols.fmt.json,
    opacity: "0.72",
    overflow: "visible",
    whiteSpace: "nowrap",
    paddingRight: "0.36rem",
    display: "flex",
    alignItems: "flex-start",
    boxSizing: "border-box",
};

const VALUE_CSS: CssMap = {
    minWidth: "0",
    width: "max-content",
    overflow: "visible",
    alignSelf: "start",
};

const PRIMITIVE_CSS: CssMap = {
    color: _cols.yellowlike,
    paddingRight: "0.36rem",
    overflow: "visible",
    whiteSpace: "nowrap",
};

const DEMO_ROOT_CSS: CssMap = {
    ...FONT_FAM_MONO,
    display: "grid",
    gridTemplateColumns: "minmax(16rem, 0.45fr) minmax(0, 1fr)",
    gap: "0.75rem",
    height: "100%",
    minHeight: "0",
    boxSizing: "border-box",
    padding: "0.75rem",
    color: _cols.fade,
};

const DEMO_COLUMN_CSS: CssMap = {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: "0.45rem",
    minHeight: "0",
};

const DEMO_LABEL_CSS: CssMap = {
    color: _cols.fade,
    opacity: "0.58",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: "0.68rem",
};

const DEMO_TEXTAREA_CSS: CssMap = {
    width: "100%",
    height: "100%",
    minHeight: "0",
    boxSizing: "border-box",
    resize: "none",
    padding: "0.75rem",
    border: `1px solid ${_cols.bluelike}`,
    background: _cols.backlo,
    color: _cols.fmt.json,
    outline: "none",
    ...FONT_FAM_MONO,
    fontSize: øfontSize.smol,
};

const DEMO_OUTPUT_CSS: CssMap = {
    minHeight: "0",
    overflow: "auto",
    boxSizing: "border-box",
    padding: "0.75rem",
    border: "0",
    borderRadius: "0.18rem",
    background: `linear-gradient(to bottom right, ${_cols.backlo} 0%, ${_cols.backlo} 72%, ${_cols.backhi} 135%)`,
};

const DEMO_ERROR_CSS: CssMap = {
    color: _cols.red,
    whiteSpace: "pre-wrap",
};

const HIGHLIGHT_CLEAR_CSS: CssMap = {
    boxShadow: "",
    filter: "",

};

const HIGHLIGHT_RELATED_CSS: CssMap = {
    boxShadow: `inset 0 0 0 1px ${_cols.fade}`,
};

const HIGHLIGHT_SELF_CSS: CssMap = {
    boxShadow: `inset 0 0 0 1px ${_cols.red}`,
};

const HIGHLIGHT_TEXT_CSS: CssMap = {

};

const HIGHLIGHT_CONNECTOR_CSS: CssMap = {
    filter: `drop-shadow(0 0 0.08rem ${_cols.red})`,
};

const SAMPLE_JSON_TEXT = JSON.stringify({
    title: "LiveMap render sketch",
    status: "draft",
    metrics: {
        nodes: 7,
        depth: 3,
        synced: true,
    },
    views: ["outline", "boxes", "selectors"],
    next: {
        patching: false,
        templates: null,
    },
}, null, 2);

function makeBuckets(): JsonRenderBuckets {
    return {
        all: [],
        arrays: [],
        connectors: [],
        items: [],
        keys: [],
        objects: [],
        primitives: [],
        properties: [],
        values: [],
    };
}

function makeGroup(items: LiveTree[]): JsonRenderGroup {
    return Object.freeze({
        items: Object.freeze(items),
        each(fn: (tree: LiveTree) => void): void {
            for (const item of items) fn(item);
        },
        css: Object.freeze({
            setMany(styles: CssMap): void {
                for (const item of items) item.css.setMany(styles);
            },
        }),
    });
}

function kindOf(value: JsonValue): JsonRenderKind {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value as JsonRenderKind;
}

function pathKey(path: readonly JsonPathPart[]): string {
    return JSON.stringify(path);
}

function pathText(path: readonly JsonPathPart[]): string {
    if (path.length === 0) return "$";

    let text = "$";

    for (const part of path) {
        if (typeof part === "number") {
            text += `[${part}]`;
            continue;
        }

        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part)) {
            text += `.${part}`;
            continue;
        }

        text += `[${JSON.stringify(part)}]`;
    }

    return text;
}

function pathFromInput(path: string | readonly JsonPathPart[]): string {
    if (typeof path === "string") return path;
    return pathKey(path);
}

function pathsEqual(a: readonly JsonPathPart[], b: readonly JsonPathPart[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((part, i) => part === b[i]);
}

function pathContains(parent: readonly JsonPathPart[], child: readonly JsonPathPart[]): boolean {
    if (parent.length > child.length) return false;
    return parent.every((part, i) => part === child[i]);
}

function pathsRelated(a: readonly JsonPathPart[], b: readonly JsonPathPart[]): boolean {
    return pathContains(a, b);
}

function preview(value: JsonValue): string {
    if (typeof value === "string") return JSON.stringify(value);
    if (value === null) return "null";
    if (typeof value !== "object") return String(value);
    if (Array.isArray(value)) return `[array:${value.length}]`;
    return `{object:${Object.keys(value).length}}`;
}

function addPart(
    draft: JsonRenderDraft,
    tree: LiveTree,
    path: readonly JsonPathPart[],
    role: JsonRenderRole,
    kind: JsonRenderKind,
): void {
    const part = Object.freeze({
        tree,
        path: Object.freeze([...path]),
        pathText: pathText(path),
        role,
        kind,
    });

    draft.parts.push(part);
    draft.buckets.all.push(tree);

    if (role === "array") draft.buckets.arrays.push(tree);
    if (role === "connector") draft.buckets.connectors.push(tree);
    if (role === "item") draft.buckets.items.push(tree);
    if (role === "key") draft.buckets.keys.push(tree);
    if (role === "object") draft.buckets.objects.push(tree);
    if (role === "primitive") draft.buckets.primitives.push(tree);
    if (role === "property") draft.buckets.properties.push(tree);
    if (role === "value") draft.buckets.values.push(tree);

    if (role === "root" || role === "array" || role === "object" || role === "primitive" || role === "value") {
        draft.byPath.set(pathKey(path), tree);
    }
}

function setMeta(
    tree: LiveTree,
    path: readonly JsonPathPart[],
    role: JsonRenderRole,
    kind: JsonRenderKind,
): void {
    tree.attr.setMany({
        "data-json-role": role,
        "data-json-kind": kind,
        "data-json-path": pathText(path),
    });
}

function isHighlightContainer(role: JsonRenderRole): boolean {
    return role === "item" || role === "property" || role === "root";
}

function isHighlightNode(role: JsonRenderRole): boolean {
    return role === "array" || role === "object";
}

function isHighlightText(role: JsonRenderRole): boolean {
    return role === "key" || role === "primitive";
}

function wirePathHighlight(parts: readonly JsonRenderPart[]): void {
    const clear = (): void => {
        for (const part of parts) {
            part.tree.css.setMany(HIGHLIGHT_CLEAR_CSS);
        }
    };

    const highlight = (target: readonly JsonPathPart[]): void => {
        clear();

        for (const part of parts) {
            if (!pathsRelated(part.path, target)) continue;

            if (part.role === "connector") {
                part.tree.css.setMany(HIGHLIGHT_CONNECTOR_CSS);
                continue;
            }

            if (pathsEqual(part.path, target)) {
                if (isHighlightContainer(part.role)) part.tree.css.setMany(HIGHLIGHT_SELF_CSS);
                if (isHighlightText(part.role)) part.tree.css.setMany(HIGHLIGHT_TEXT_CSS);
                continue;
            }

            if (isHighlightNode(part.role)) part.tree.css.setMany(HIGHLIGHT_RELATED_CSS);
        }
    };

    const shouldTrigger = (role: JsonRenderRole): boolean => {
        return role === "connector" || role === "key" || role === "primitive";
    };

    const rootPart = parts.find((part) => part.role === "root");
    rootPart?.tree.listen.onPointerLeave(clear);

    for (const part of parts) {
        if (!shouldTrigger(part.role)) continue;
        part.tree.listen.onPointerEnter(() => highlight(part.path));
    }
}

function renderPrimitive(
    host: LiveTree,
    value: JsonValue,
    path: readonly JsonPathPart[],
    draft: JsonRenderDraft,
): LiveTree {
    const kind = kindOf(value);
    const node = host.create.div()
        .text.set(preview(value))
        .css.setMany(PRIMITIVE_CSS);

    setMeta(node, path, "primitive", kind);
    addPart(draft, node, path, "primitive", kind);
    return node;
}

function renderValue(
    host: LiveTree,
    value: JsonValue,
    path: readonly JsonPathPart[],
    draft: JsonRenderDraft,
    depth: number,
): LiveTree {
    const kind = kindOf(value);

    if (value === null || typeof value !== "object") {
        return renderPrimitive(host, value, path, draft);
    }

    if (Array.isArray(value)) {
        const node = host.create.div().css.setMany(nodeCss(depth));
        setMeta(node, path, "array", kind);
        addPart(draft, node, path, "array", kind);

        for (let i = 0; i < value.length; i += 1) {
            const itemPath = [...path, i];
            const child = value[i] as JsonValue;
            const childKind = kindOf(child);
            const row = node.create.div().css.setMany(ROW_CSS);
            const connector = row.create.div().css.setMany(connectorCss(depth + 1, connectorPosition(i, value.length)));
            const key = row.create.div().text.set(`[${i}]`).css.setMany(KEY_CSS);
            const val = row.create.div().css.setMany(VALUE_CSS);

            setMeta(row, itemPath, "item", childKind);
            setMeta(connector, itemPath, "connector", childKind);
            setMeta(key, itemPath, "key", childKind);
            setMeta(val, itemPath, "value", childKind);
            addPart(draft, row, itemPath, "item", childKind);
            addPart(draft, connector, itemPath, "connector", childKind);
            addPart(draft, key, itemPath, "key", childKind);
            addPart(draft, val, itemPath, "value", childKind);
            renderValue(val, child, itemPath, draft, depth + 1);
        }

        return node;
    }

    const objectValue = value as Record<string, JsonValue>;
    const keys = Object.keys(objectValue);
    const node = host.create.div().css.setMany(nodeCss(depth));
    setMeta(node, path, "object", kind);
    addPart(draft, node, path, "object", kind);

    let keyIndex = 0;
    for (const keyName of keys) {
        const valuePath = [...path, keyName];
        const child = objectValue[keyName] as JsonValue;
        const childKind = kindOf(child);
        const row = node.create.div().css.setMany(ROW_CSS);
        const connector = row.create.div().css.setMany(connectorCss(depth + 1, connectorPosition(keyIndex, keys.length)));
        const key = row.create.div().text.set(keyName).css.setMany(KEY_CSS);
        const val = row.create.div().css.setMany(VALUE_CSS);

        setMeta(row, valuePath, "property", childKind);
        setMeta(connector, valuePath, "connector", childKind);
        setMeta(key, valuePath, "key", childKind);
        setMeta(val, valuePath, "value", childKind);
        addPart(draft, row, valuePath, "property", childKind);
        addPart(draft, connector, valuePath, "connector", childKind);
        addPart(draft, key, valuePath, "key", childKind);
        addPart(draft, val, valuePath, "value", childKind);
        renderValue(val, child, valuePath, draft, depth + 1);
        keyIndex += 1;
    }

    return node;
}

export function render_json(
    host: LiveTree,
    value: JsonValue,
    options: JsonRenderOptions = {},
): JsonRender {
    if (options.clearHost ?? true) host.empty();

    const draft: JsonRenderDraft = {
        parts: [],
        buckets: makeBuckets(),
        byPath: new Map<string, LiveTree>(),
    };

    const root = host.create.div().css.setMany(ROOT_CSS);
    setMeta(root, [], "root", kindOf(value));
    addPart(draft, root, [], "root", kindOf(value));
    renderValue(root, value, [], draft, 0);
    wirePathHighlight(draft.parts);

    return Object.freeze({
        root,
        parts: Object.freeze(draft.parts),
        all: makeGroup(draft.buckets.all),
        arrays: makeGroup(draft.buckets.arrays),
        connectors: makeGroup(draft.buckets.connectors),
        items: makeGroup(draft.buckets.items),
        keys: makeGroup(draft.buckets.keys),
        objects: makeGroup(draft.buckets.objects),
        primitives: makeGroup(draft.buckets.primitives),
        properties: makeGroup(draft.buckets.properties),
        values: makeGroup(draft.buckets.values),
        byPath(path: string | readonly JsonPathPart[]): LiveTree | undefined {
            return draft.byPath.get(pathFromInput(path));
        },
    });
}

export function render_json_text(
    host: LiveTree,
    text: string,
    options: JsonRenderOptions = {},
): JsonRender {
    return render_json(host, JSON.parse(text) as JsonValue, options);
}

export function mount_json_render_demo(host: LiveTree): void {
    host.empty();

    const root = host.create.div().css.setMany(DEMO_ROOT_CSS);
    const inputColumn = root.create.div().css.setMany(DEMO_COLUMN_CSS);
    const outputColumn = root.create.div().css.setMany(DEMO_COLUMN_CSS);

    inputColumn.create.div().text.set("json input").css.setMany(DEMO_LABEL_CSS);
    outputColumn.create.div().text.set("live render").css.setMany(DEMO_LABEL_CSS);

    const input = inputColumn.create.textarea().css.setMany(DEMO_TEXTAREA_CSS);
    const output = outputColumn.create.div().css.setMany(DEMO_OUTPUT_CSS);

    input.form.setValue(SAMPLE_JSON_TEXT);

    const renderInput = (): void => {
        const raw = input.form.getValue();
        const text = typeof raw === "string" ? raw : String(raw ?? "");

        try {
            render_json_text(output, text);
        } catch (err) {
            output.empty();
            output.create.div()
                .text.set(err instanceof Error ? err.message : String(err))
                .css.setMany(DEMO_ERROR_CSS);
        }
    };

    input.listen.on("input", renderInput);
    renderInput();
}
