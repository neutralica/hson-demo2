import type { LiveTree } from "hson-live";
import type { CssMap, JsonValue } from "hson-live/types";
import type { JsonRenderKind, JsonPathPart, JsonRenderDraft, JsonRenderRole, JsonRenderPart, JsonRenderOptions, JsonRender, ConnectorPosition } from "./render.types";
import { COMPLEX_VALUE_CSS, CONNECTOR_CSS, CONNECTOR_RAIL_CLEAR_CSS,  DEMO_COLUMN_CSS, DEMO_ERROR_CSS, DEMO_LABEL_CSS, DEMO_OUTPUT_CSS, DEMO_ROOT_CSS, DEMO_TEXTAREA_CSS, HIGHLIGHT_CLEAR_CSS, HIGHLIGHT_CONNECTOR_CSS, HIGHLIGHT_RELATED_CSS, HIGHLIGHT_SELF_CSS, KEY_CSS, NODE_HIT_CSS, PATH_TEXT_CSS, PRIMITIVE_CSS, ROOT_CSS, ROW_CSS, TRIGGER_CSS, VALUE_CSS } from "./render.css";
import { _cols } from "../../core/consts/colors.consts";
import { connectorPosition, isHighlightContainer, isHighlightNode, isHighlightText, setMeta, kindOf, makeBuckets, makeGroup, pathFromInput, pathKey, pathsEqual, pathText, label_trees_by_path, clear_path_overlay, draw_path_overlay, make_path_overlay, type PathOverlay, } from "./render-helpers";
import { nodeCss } from "./render.css";
import { $RENDER_STRING_DEF } from "./render.consts";

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

type ConnectorPositionValue = ReturnType<typeof connectorPosition>;

type ConnectorRenderInfo = Readonly<{
    position: ConnectorPositionValue;
    parentPath: readonly JsonPathPart[];
    path: readonly JsonPathPart[];
    index: number;
    count: number;
}>;

const connectorStyles = new WeakMap<LiveTree, CssMap>();
const connectorPositions = new WeakMap<LiveTree, ConnectorPositionValue>();
const connectorInfos = new WeakMap<LiveTree, ConnectorRenderInfo>();
const connectorIndexes = new Map<string, number>();

const connectorRails = new WeakMap<LiveTree, LiveTree>();
const connectorRailTrees = new Set<LiveTree>();
export const pathLineY = "1.55em";
export const pathLineCornerStub = "0.42em";
const pathLineThickness = "1px";
const pathLineOpacity = "0.38";
const pathLineFilter = `drop-shadow(0 0 0.035rem ${_cols.yellowlike}) drop-shadow(0 0 0.09rem ${_cols.yellowlike})`;

const activeLinesEnabled = false;
export function pathContains(parent: readonly JsonPathPart[], child: readonly JsonPathPart[]): boolean {
    if (parent.length > child.length) return false;
    return parent.every((part, i) => part === child[i]);
}
export function pathsRelated(a: readonly JsonPathPart[], b: readonly JsonPathPart[]): boolean {
    return pathContains(a, b);
}

export const CONNECTOR_RAIL_CSS: CssMap = {
    position: "absolute",
    gridColumn: "1 / 3",
    left: "0.38rem",
    right: "-0.18rem",
    top: pathLineY,
    height: pathLineCornerStub,
    opacity: "0",
    background: "transparent",
    filter: "",
    pointerEvents: "none",
    zIndex: "0",
};

function connectorTargetIndex(info: ConnectorRenderInfo, target: readonly JsonPathPart[]): number | undefined {
    if (!pathContains(info.parentPath, target)) return undefined;
    if (target.length <= info.parentPath.length) return undefined;

    const targetPart = target[info.parentPath.length];
    if (targetPart === undefined) return undefined;

    const targetChildPath = [...info.parentPath, targetPart];
    return connectorIndexes.get(pathKey(targetChildPath));
}

function highlightedConnectorBackground(position: ConnectorPositionValue): string {
    const color = _cols.yellowlike;
    const verticalFull = `linear-gradient(to bottom, ${color}, ${color}) 0.38rem 0 / ${pathLineThickness} 100% no-repeat`;
    const verticalDown = `linear-gradient(to bottom, ${color}, ${color}) 0.38rem calc(${pathLineY} - ${pathLineThickness}) / ${pathLineThickness} calc(100% - ${pathLineY} + ${pathLineThickness}) no-repeat`;
    const verticalUp = `linear-gradient(to bottom, ${color}, ${color}) 0.38rem 0 / ${pathLineThickness} calc(${pathLineY} + ${pathLineThickness}) no-repeat`;
    const horizontal = `linear-gradient(to right, ${color}, ${color}) 0.38rem ${pathLineY} / 0.62rem ${pathLineThickness} no-repeat`;
    const horizontalFull = `linear-gradient(to right, ${color}, ${color}) 0 ${pathLineY} / 0.9rem ${pathLineThickness} no-repeat`;

    if (position === "single") return horizontal;
    if (position === "first") return `${verticalDown}, ${horizontalFull}`;
    if (position === "last") return `${verticalUp}, ${horizontal}`;
    return `${verticalFull}, ${horizontal}`;
}

function connectorBackground(position: ConnectorPosition): string {
    const verticalFull = `linear-gradient(to bottom, ${_cols.fade}, ${_cols.fade}) 0.38rem 0 / 1px 100% no-repeat`;
    const verticalDown = `linear-gradient(to bottom, ${_cols.fade}, ${_cols.fade}) 0.38rem 0.72em / 1px calc(100% - 0.72em) no-repeat`;
    const verticalUp = `linear-gradient(to bottom, ${_cols.fade}, ${_cols.fade}) 0.38rem 0 / 1px 0.72em no-repeat`;
    const horizontal = `linear-gradient(to right, ${_cols.fade}, ${_cols.fade}) 0.38rem 0.72em / 0.62rem 1px no-repeat`;
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
function highlightedConnectorBranchBackground(info: ConnectorRenderInfo, target: readonly JsonPathPart[]): string | undefined {
    const targetIndex = connectorTargetIndex(info, target);
    if (targetIndex === undefined) return undefined;
    if (info.index > targetIndex) return undefined;

    const color = _cols.yellowlike;
    const verticalFull = `linear-gradient(to bottom, ${color}, ${color}) 0.38rem 0 / ${pathLineThickness} 100% no-repeat`;
    const verticalDown = `linear-gradient(to bottom, ${color}, ${color}) 0.38rem calc(${pathLineY} - ${pathLineThickness}) / ${pathLineThickness} calc(100% - ${pathLineY} + ${pathLineThickness}) no-repeat`;

    if (info.index < targetIndex) {
        if (info.index === 0) return verticalDown;
        return verticalFull;
    }

    const continuesBeyondConnector = pathContains(info.path, target) && target.length > info.path.length;
    if (continuesBeyondConnector) return verticalDown;

    return "none";
}

function highlightedConnectorBranchCss(info: ConnectorRenderInfo, target: readonly JsonPathPart[]): CssMap | undefined {
    const background = highlightedConnectorBranchBackground(info, target);
    if (!background) return undefined;

    return {
        ...HIGHLIGHT_CONNECTOR_CSS,
        opacity: pathLineOpacity,
        filter: pathLineFilter,
        background,
    };
}

function highlightedConnectorRailBackground(): string {
    const color = _cols.yellowlike;
    return `linear-gradient(to right, ${color}, ${color}) 0 0 / 100% ${pathLineThickness} no-repeat`;
}

function highlightedConnectorRailCss(info: ConnectorRenderInfo, target: readonly JsonPathPart[]): CssMap | undefined {
    const targetIndex = connectorTargetIndex(info, target);
    if (targetIndex === undefined) return undefined;
    if (info.index !== targetIndex) return undefined;

    return {
        opacity: pathLineOpacity,
        background: highlightedConnectorRailBackground(),
        filter: pathLineFilter,
    };
}

function highlightedConnectorCss(position: ConnectorPositionValue): CssMap {
    return {
        ...HIGHLIGHT_CONNECTOR_CSS,
        opacity: pathLineOpacity,
        filter: pathLineFilter,
        background: highlightedConnectorBackground(position),
    };
}

function rememberConnector(tree: LiveTree, styles: CssMap, info: ConnectorRenderInfo, rail: LiveTree): void {
    connectorStyles.set(tree, styles);
    connectorPositions.set(tree, info.position);
    connectorInfos.set(tree, info);
    connectorIndexes.set(pathKey(info.path), info.index);
    connectorRails.set(tree, rail);
    connectorRailTrees.add(rail);
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

function wirePathHighlight(parts: readonly JsonRenderPart[], root: LiveTree, overlay: PathOverlay | undefined): void {
    const labels = label_trees_by_path(parts);
    const clear = (): void => {
        clear_path_overlay(overlay);
        for (const rail of connectorRailTrees) {
            rail.css.setMany(CONNECTOR_RAIL_CLEAR_CSS);
        }
        for (const part of parts) {
            if (part.role === "connector") {
                const connectorStyle = connectorStyles.get(part.tree);
                if (connectorStyle) {
                    part.tree.css.setMany({
                        ...connectorStyle,
                        filter: "",
                    });
                    continue;
                }
            }

            part.tree.css.setMany(HIGHLIGHT_CLEAR_CSS);
        }
    };

    const highlight = (target: readonly JsonPathPart[]): void => {
        clear();

        for (const part of parts) {
            if (part.role === "connector") {
                if (!activeLinesEnabled) continue;

                const connectorInfo = connectorInfos.get(part.tree);
                const branchCss = connectorInfo ? highlightedConnectorBranchCss(connectorInfo, target) : undefined;
                if (branchCss) {
                    part.tree.css.setMany(branchCss);
                    const rail = connectorRails.get(part.tree);
                    const railCss = (rail && connectorInfo) ? highlightedConnectorRailCss(connectorInfo, target) : undefined;
                    if (rail && railCss) rail.css.setMany(railCss);
                    continue;
                }
            }

            if (!pathsRelated(part.path, target)) continue;

            if (part.role === "connector") {
                if (!activeLinesEnabled) continue;

                const connectorPositionValue = connectorPositions.get(part.tree);
                part.tree.css.setMany(connectorPositionValue ? highlightedConnectorCss(connectorPositionValue) : HIGHLIGHT_CONNECTOR_CSS);
                const connectorInfo = connectorInfos.get(part.tree);
                const rail = connectorRails.get(part.tree);
                const railCss = connectorInfo && rail ? highlightedConnectorRailCss(connectorInfo, target) : undefined;
                if (rail && railCss) rail.css.setMany(railCss);
                continue;
            }

            if (isHighlightText(part.role)) {
                part.tree.css.setMany(PATH_TEXT_CSS);
                continue;
            }

            if (pathsEqual(part.path, target)) {
                if (isHighlightContainer(part.role)) part.tree.css.setMany(HIGHLIGHT_SELF_CSS);
                continue;
            }

            if (isHighlightNode(part.role)) part.tree.css.setMany(HIGHLIGHT_RELATED_CSS);
        }
        draw_path_overlay(root, overlay, labels, target);
    };

    const shouldTrigger = (role: JsonRenderRole): boolean => {
        return role === "connector" || role === "key" || role === "primitive" || role === "trigger";
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

        const nodeHit = node.create.div().css.setMany(NODE_HIT_CSS);
        setMeta(nodeHit, path, "trigger", kind);
        addPart(draft, nodeHit, path, "trigger", kind);

        for (let i = 0; i < value.length; i += 1) {
            const itemPath = [...path, i];
            const child = value[i] as JsonValue;
            const childKind = kindOf(child);
            const row = node.create.div().css.setMany(ROW_CSS);
            const rail = row.create.div().css.setMany(CONNECTOR_RAIL_CSS);
            const connectorPos = connectorPosition(i, value.length);
            const connectorStyle = connectorCss(depth + 1, connectorPos);
            const connector = row.create.div().css.setMany(connectorStyle);
            rememberConnector(connector, connectorStyle, {
                position: connectorPos,
                parentPath: Object.freeze([...path]),
                path: Object.freeze([...itemPath]),
                index: i,
                count: value.length,
            }, rail);
            const key = row.create.div().text.set(`[${i}]`).css.setMany(KEY_CSS);
            const val = row.create.div().css.setMany(childKind === "array" || childKind === "object" ? COMPLEX_VALUE_CSS : VALUE_CSS);
            const trigger = row.create.div().css.setMany(TRIGGER_CSS);
            const triggerPath = path.length === 0 ? itemPath : path;
            const triggerKind = path.length === 0 ? childKind : kind;

            setMeta(row, itemPath, "item", childKind);
            setMeta(connector, itemPath, "connector", childKind);
            setMeta(key, itemPath, "key", childKind);
            setMeta(val, itemPath, "value", childKind);
            setMeta(trigger, triggerPath, "trigger", triggerKind);
            addPart(draft, row, itemPath, "item", childKind);
            addPart(draft, connector, itemPath, "connector", childKind);
            addPart(draft, key, itemPath, "key", childKind);
            addPart(draft, val, itemPath, "value", childKind);
            addPart(draft, trigger, triggerPath, "trigger", triggerKind);
            renderValue(val, child, itemPath, draft, depth + 1);
        }

        return node;
    }

    const objectValue = value as Record<string, JsonValue>;
    const keys = Object.keys(objectValue);
    const node = host.create.div().css.setMany(nodeCss(depth));
    setMeta(node, path, "object", kind);
    addPart(draft, node, path, "object", kind);

    const nodeHit = node.create.div().css.setMany(NODE_HIT_CSS);
    setMeta(nodeHit, path, "trigger", kind);
    addPart(draft, nodeHit, path, "trigger", kind);

    let keyIndex = 0;
    for (const keyName of keys) {
        const valuePath = [...path, keyName];
        const child = objectValue[keyName] as JsonValue;
        const childKind = kindOf(child);
        const row = node.create.div().css.setMany(ROW_CSS);
        const rail = row.create.div().css.setMany(CONNECTOR_RAIL_CSS);
        const connectorPos = connectorPosition(keyIndex, keys.length);
        const connectorStyle = connectorCss(depth + 1, connectorPos);
        const connector = row.create.div().css.setMany(connectorStyle);
        rememberConnector(connector, connectorStyle, {
            position: connectorPos,
            parentPath: Object.freeze([...path]),
            path: Object.freeze([...valuePath]),
            index: keyIndex,
            count: keys.length,
        }, rail);
        const key = row.create.div().text.set(keyName).css.setMany(KEY_CSS);
        const val = row.create.div().css.setMany(childKind === "array" || childKind === "object" ? COMPLEX_VALUE_CSS : VALUE_CSS);
        const trigger = row.create.div().css.setMany(TRIGGER_CSS);
        const triggerPath = path.length === 0 ? valuePath : path;
        const triggerKind = path.length === 0 ? childKind : kind;

        setMeta(row, valuePath, "property", childKind);
        setMeta(connector, valuePath, "connector", childKind);
        setMeta(key, valuePath, "key", childKind);
        setMeta(val, valuePath, "value", childKind);
        setMeta(trigger, triggerPath, "trigger", triggerKind);
        addPart(draft, row, valuePath, "property", childKind);
        addPart(draft, connector, valuePath, "connector", childKind);
        addPart(draft, key, valuePath, "key", childKind);
        addPart(draft, val, valuePath, "value", childKind);
        addPart(draft, trigger, triggerPath, "trigger", triggerKind);
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
    connectorIndexes.clear();
    connectorRailTrees.clear();

    const draft: JsonRenderDraft = {
        parts: [],
        buckets: makeBuckets(),
        byPath: new Map<string, LiveTree>(),
    };

    const root = host.create.div().css.setMany({
        ...ROOT_CSS,
        position: "relative",
    });
    const overlay = make_path_overlay(root);
    setMeta(root, [], "root", kindOf(value));
    addPart(draft, root, [], "root", kindOf(value));
    renderValue(root, value, [], draft, 0);
    wirePathHighlight(draft.parts, root, overlay);

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

    input.form.setValue($RENDER_STRING_DEF);

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
