import type { JsonValue } from "hson-live/types";
import type { NodeState } from "./state.types";
import { state_graph_entries } from "./state-graph";
import type { StateGraphEntry, StateGraphOptions } from "./state-graph";

type StateSourceListener = (sourceName: string) => void;

type StateSourceRecord = Readonly<{
  source: StateSource;
  unsubscribe: () => void;
}>;

export type StateSource = Readonly<{
  name: string;
  entries: () => readonly StateGraphEntry[];
  subscribe: (fn: () => void) => () => void;
}>;

export type StateSourceEntry = StateGraphEntry & Readonly<{
  source: string;
  sourceKey: string;
  sourcePathText: string;
}>;

export type NodeStateSourceOptions = Readonly<{
  name: string;
  state: NodeState;
  schema?: StateGraphOptions["schema"];
  includeContainers?: boolean;
  maxPreviewLength?: number;
}>;

const sourceRecords = new Map<string, StateSourceRecord>();
const sourceListeners = new Set<StateSourceListener>();

function emitSourceChange(sourceName: string): void {
  for (const fn of sourceListeners) fn(sourceName);
}

function sourceEntry(source: StateSource, entry: StateGraphEntry): StateSourceEntry {
  return Object.freeze({
    ...entry,
    source: source.name,
    sourceKey: entry.key,
    sourcePathText: entry.pathText,
    key: `${source.name}:${entry.key}`,
    pathText: `${source.name} · ${entry.pathText}`,
  });
}

export function register_state_source(source: StateSource): () => void {
  const existing = sourceRecords.get(source.name);
  existing?.unsubscribe();

  const unsubscribe = source.subscribe(() => emitSourceChange(source.name));
  sourceRecords.set(source.name, Object.freeze({ source, unsubscribe }));
  emitSourceChange(source.name);

  return () => {
    const current = sourceRecords.get(source.name);
    if (!current || current.source !== source) return;

    current.unsubscribe();
    sourceRecords.delete(source.name);
    emitSourceChange(source.name);
  };
}

export function state_sources(): readonly StateSource[] {
  return Object.freeze([...sourceRecords.values()].map((record) => record.source));
}

export function subscribe_state_sources(fn: StateSourceListener): () => void {
  sourceListeners.add(fn);
  return () => sourceListeners.delete(fn);
}

export function state_source_entries(): readonly StateSourceEntry[] {
  const entries: StateSourceEntry[] = [];

  for (const source of state_sources()) {
    for (const entry of source.entries()) {
      entries.push(sourceEntry(source, entry));
    }
  }

  return Object.freeze(entries);
}

export function register_node_state_source(options: NodeStateSourceOptions): () => void {
  const graphOptions: StateGraphOptions = {
    includeContainers: options.includeContainers ?? false,
    ...(options.maxPreviewLength !== undefined ? { maxPreviewLength: options.maxPreviewLength } : {}),
    ...(options.schema !== undefined ? { schema: options.schema } : {}),
  };

  return register_state_source({
    name: options.name,
    entries: () => state_graph_entries(options.state.get() as JsonValue, graphOptions),
    subscribe: (fn) => options.state.subscribe_change(() => fn()),
  });
}
