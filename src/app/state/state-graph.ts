import type { JsonValue } from "hson-live/types";
import { allowed_types } from "./schema-helpers";
import type { NodeSchema, SchemaMatch, SchemaRule, SchemaSegment } from "./schema.types";

export type StateGraphPathPart = string | number;

export type StateGraphValueKind =
  | "array"
  | "boolean"
  | "null"
  | "number"
  | "object"
  | "string";

export type StateGraphSchemaInfo = Readonly<{
  path: readonly SchemaSegment[];
  types: readonly string[];
  optional: boolean;
  readonly: boolean;
  literalCount: number;
  hasCustomValidation: boolean;
}>;

export type StateGraphEntry = Readonly<{
  key: string;
  path: readonly StateGraphPathPart[];
  pathText: string;
  depth: number;
  kind: StateGraphValueKind;
  isContainer: boolean;
  isLeaf: boolean;
  childCount: number;
  value: JsonValue;
  valuePreview: string;
  schema?: StateGraphSchemaInfo;
}>;

export type StateGraphOptions = Readonly<{
  includeContainers?: boolean;
  maxPreviewLength?: number;
  schema?: NodeSchema;
}>;

const DEFAULT_MAX_PREVIEW_LENGTH = 80;

function value_kind(value: JsonValue): StateGraphValueKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  const kind = typeof value;
  if (kind === "boolean") return "boolean";
  if (kind === "number") return "number";
  if (kind === "string") return "string";
  return "object";
}

function is_container_kind(kind: StateGraphValueKind): boolean {
  return kind === "array" || kind === "object";
}

function child_count(value: JsonValue): number {
  if (Array.isArray(value)) return value.length;
  if (value !== null && typeof value === "object") return Object.keys(value).length;
  return 0;
}

function truncate_preview(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  if (maxLength <= 1) return "…";
  return `${value.slice(0, maxLength - 1)}…`;
}

function value_preview(value: JsonValue, maxLength: number): string {
  if (Array.isArray(value)) return `[array:${value.length}]`;

  if (value !== null && typeof value === "object") {
    return `{object:${Object.keys(value).length}}`;
  }

  return truncate_preview(JSON.stringify(value), maxLength);
}

function path_part_to_text(part: StateGraphPathPart): string {
  if (typeof part === "number") return `[${part}]`;
  if (/^[A-Za-z_$][\w$]*$/.test(part)) return `.${part}`;
  return `[${JSON.stringify(part)}]`;
}

export function state_graph_path_to_text(path: readonly StateGraphPathPart[]): string {
  if (path.length === 0) return "$";
  return `$${path.map(path_part_to_text).join("")}`;
}

export function state_graph_key(path: readonly StateGraphPathPart[]): string {
  return JSON.stringify(path);
}

function schema_info(match: SchemaMatch | undefined): StateGraphSchemaInfo | undefined {
  if (!match) return undefined;

  const rule: SchemaRule = match.rule;

  return {
    path: match.path,
    types: allowed_types(rule),
    optional: rule.optional === true,
    readonly: rule.readonly === true,
    literalCount: rule.literals?.length ?? 0,
    hasCustomValidation: rule.validate !== undefined,
  };
}

function make_entry(
  value: JsonValue,
  path: readonly StateGraphPathPart[],
  depth: number,
  options: Required<Pick<StateGraphOptions, "includeContainers" | "maxPreviewLength">> & Pick<StateGraphOptions, "schema">,
): StateGraphEntry {
  const kind = value_kind(value);
  const isContainer = is_container_kind(kind);
  const match = options.schema?.match(path);
  const schema = schema_info(match);

  return {
    key: state_graph_key(path),
    path: Object.freeze([...path]),
    pathText: state_graph_path_to_text(path),
    depth,
    kind,
    isContainer,
    isLeaf: !isContainer,
    childCount: child_count(value),
    value,
    valuePreview: value_preview(value, options.maxPreviewLength),
    ...(schema !== undefined ? { schema } : {}),
  };
}

function sorted_object_entries(value: Record<string, JsonValue>): [string, JsonValue][] {
  return Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
}

function walk_state_graph(
  value: JsonValue,
  path: readonly StateGraphPathPart[],
  depth: number,
  options: Required<Pick<StateGraphOptions, "includeContainers" | "maxPreviewLength">> & Pick<StateGraphOptions, "schema">,
  out: StateGraphEntry[],
): void {
  const kind = value_kind(value);
  const isContainer = is_container_kind(kind);

  if (options.includeContainers || !isContainer) {
    out.push(make_entry(value, path, depth, options));
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walk_state_graph(item, [...path, index], depth + 1, options, out);
    });
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, item] of sorted_object_entries(value as Record<string, JsonValue>)) {
      walk_state_graph(item, [...path, key], depth + 1, options, out);
    }
  }
}

export function state_graph_entries(
  root: JsonValue,
  options: StateGraphOptions = {},
): readonly StateGraphEntry[] {
  const resolved = {
    includeContainers: options.includeContainers ?? true,
    maxPreviewLength: options.maxPreviewLength ?? DEFAULT_MAX_PREVIEW_LENGTH,
    ...(options.schema !== undefined ? { schema: options.schema } : {}),
  };
  const entries: StateGraphEntry[] = [];

  walk_state_graph(root, [], 0, resolved, entries);
  return Object.freeze(entries);
}
