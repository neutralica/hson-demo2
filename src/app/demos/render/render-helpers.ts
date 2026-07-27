import type { CssMap, JsonValue, SvgLiveTree } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import { CONNECTOR_CSS, PATH_OVERLAY_CSS, PATH_OVERLAY_SVG_CSS } from "./render.css";
import type { ConnectorPosition, JsonPathPart, JsonRenderBuckets, JsonRenderGroup, JsonRenderKind, JsonRenderPart, JsonRenderRole } from "./render.types";
import type { LiveTree } from "hson-live/livetree";


export function connectorPosition(index: number, count: number): ConnectorPosition {
    if (count <= 1) return "single";
    if (index === 0) return "first";
    if (index === count - 1) return "last";
    return "middle";
}

export function isHighlightContainer(role: JsonRenderRole): boolean {
    return role === "item" || role === "property";
}
export function isHighlightNode(role: JsonRenderRole): boolean {
    return role === "array" || role === "object";
}
export function isHighlightText(role: JsonRenderRole): boolean {
    return role === "key" || role === "primitive";
}
export function setMeta(
    tree: LiveTree,
    path: readonly JsonPathPart[],
    role: JsonRenderRole,
    kind: JsonRenderKind,
): void {
    tree.attrs.setMany({
        "data-json-role": role,
        "data-json-kind": kind,
        "data-json-path": pathText(path),
    });
}
export function makeBuckets(): JsonRenderBuckets {
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
export function makeGroup(items: LiveTree[]): JsonRenderGroup {
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
export function kindOf(value: JsonValue): JsonRenderKind {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value as JsonRenderKind;
}
export function pathKey(path: readonly JsonPathPart[]): string {
    return JSON.stringify(path);
}

export function pathText(path: readonly JsonPathPart[]): string {
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
export function pathFromInput(path: string | readonly JsonPathPart[]): string {
    if (typeof path === "string") return path;
    return pathKey(path);
}
export function pathsEqual(a: readonly JsonPathPart[], b: readonly JsonPathPart[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((part, i) => part === b[i]);
}

export function pathContains(parent: readonly JsonPathPart[], child: readonly JsonPathPart[]): boolean {
    if (parent.length > child.length) return false;
    return parent.every((part, i) => part === child[i]);
}


export type RectLike = Readonly<{
    left: number;
    top: number;
    width: number;
    height: number;
}>;

export type PathPoint = Readonly<{
    x: number;
    y: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
}>;

export type PathOverlay = Readonly<{
    tree: LiveTree;
    svg: SvgLiveTree;
    path: SvgLiveTree;
}>;

function tree_rect(tree: LiveTree): RectLike {
    const dom = tree.dom as unknown as {
        rect?: RectLike | (() => RectLike);
    };

    if (typeof dom.rect === "function") return dom.rect();
    if (dom.rect) return dom.rect;
    return { left: 0, top: 0, width: 0, height: 0 };
}

function sync_overlay_viewbox(root: LiveTree, overlay: PathOverlay): RectLike {
    const rootRect = tree_rect(root);
    const width = Math.max(rootRect.width, 1);
    const height = Math.max(rootRect.height, 1);

    // CHANGED: keep SVG user units aligned with DOM pixel coordinates.
    overlay.svg.attrs.setMany({
        viewBox: `0 0 ${width} ${height}`,
    });

    return rootRect;
}

export function make_path_overlay(root: LiveTree): PathOverlay | undefined {
    const tree = root.create.div().css.setMany(PATH_OVERLAY_CSS);
    const svg = tree.create.svg()
        .attrs.setMany({
            width: "100%",
            height: "100%",
            viewBox: "0 0 1 1",
            preserveAspectRatio: "none",
        })
        .css.setMany(PATH_OVERLAY_SVG_CSS);

    const path = svg.create.path()
        .attrs.setMany({
            d: "",
            fill: "none",
            stroke: _colors.yellowlike,
            // CHANGED: make the trace hold up deeper into large JSON renders.
            "stroke-width": "1.45",
            "stroke-linecap": "square",
            "stroke-linejoin": "miter",
            opacity: "0.62",
        })
        .css.setMany({
            filter: `drop-shadow(0 0 0.06rem ${_colors.yellowlike})`,
        });

    return { tree, svg, path };
}

export function clear_path_overlay(overlay: PathOverlay | undefined): void {
    overlay?.path.svg.d.clear();
}

function label_priority(role: JsonRenderRole): number {
    if (role === "key" || role === "primitive") return 3;
    if (role === "item" || role === "property") return 2;
    if (role === "array" || role === "object") return 1;
    return 0;
}

export function label_trees_by_path(parts: readonly JsonRenderPart[]): Map<string, LiveTree> {
    const labels = new Map<string, LiveTree>();
    const priorities = new Map<string, number>();

    for (const part of parts) {
        const priority = label_priority(part.role);
        if (priority === 0) continue;

        const key = pathKey(part.path);
        const currentPriority = priorities.get(key) ?? 0;
        if (currentPriority > priority) continue;

        // CHANGED: include item/property labels so the trace can start at the
        // actual top-left node, not only at the first key/primitive descendant.
        labels.set(key, part.tree);
        priorities.set(key, priority);
    }

    return labels;
}

export function path_prefixes(path: readonly JsonPathPart[]): readonly JsonPathPart[][] {
    const prefixes: JsonPathPart[][] = [];

    for (let i = 1; i <= path.length; i += 1) {
        prefixes.push([...path.slice(0, i)]);
    }

    return prefixes;
}

export function label_anchor(rootRect: RectLike, label: LiveTree): PathPoint {
    const labelRect = tree_rect(label);
    const isContainerAnchor = labelRect.height > 36 || labelRect.width > 420;
    const width = isContainerAnchor ? Math.min(labelRect.width, 132) : labelRect.width;
    const height = isContainerAnchor ? Math.min(labelRect.height, 22) : labelRect.height;

    const left = labelRect.left - rootRect.left - 4;
    const top = labelRect.top - rootRect.top + height * 0.14;
    const right = labelRect.left - rootRect.left + width + 4;
    const bottom = labelRect.top - rootRect.top + height * 0.86;

    // CHANGED: item/property anchors may be full row/container trees rather
    // than the small visible label. Clamp oversized rects to a label-sized box
    // at the container origin so the trace starts at the top-left node without
    // drawing a giant rectangle around the whole rendered branch.
    return {
        x: right,
        y: bottom,
        left,
        top,
        right,
        bottom,
    };
}

export function stepped_path(points: readonly PathPoint[]): string {
    if (points.length === 0) return "";

    const [first, ...rest] = points;
    if (!first) return "";

    // CHANGED: start at the first node label itself, border its left edge,
    // and underline it before travelling to descendants.
    let previous = first;
    let d = `M ${first.left} ${first.top} V ${first.bottom} H ${first.right}`;

    for (const point of rest) {
        const railX = previous.right + 16;

        // CHANGED: each descendant is entered from its left edge and then
        // underlined, matching the highlighted word path instead of drawing
        // a detached rail from the middle of the page.
        d += ` H ${railX} V ${point.top} H ${point.left} V ${point.bottom} H ${point.right}`;
        previous = point;
    }

    return d;
}

export function draw_path_overlay(
    root: LiveTree,
    overlay: PathOverlay | undefined,
    labels: ReadonlyMap<string, LiveTree>,
    target: readonly JsonPathPart[],
): void {
    if (!overlay) return;

    const rootRect = sync_overlay_viewbox(root, overlay);

    const points = path_prefixes(target)
        .map((prefix) => labels.get(pathKey(prefix)))
        .filter((tree): tree is LiveTree => tree !== undefined)
        .map((tree) => label_anchor(rootRect, tree));

    overlay.path.svg.d.set(stepped_path(points));
}
