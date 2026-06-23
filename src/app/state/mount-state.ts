import type { LiveTree } from "hson-live";
import { store_graph_entries, demo_subscribe, has_widget } from "./store";
import type { StateGraphEntry } from "./state-graph";
import { register_state_source, state_source_entries, subscribe_state_sources } from "./state-sources";
import type { CssMap } from "hson-live/types";
import { _colors } from "../core/consts/colors.consts";

type StateGraphMode = "all" | "leaves" | "containers";
const STATE_PULSE_THROTTLE_MS = 80;

type StatePulseKind = "change" | "remove" | "set";

type StatePulseSnapshot = Readonly<{
  key: string;
  pathText: string;
  text: string;
}>;

type StatePulseRow = Readonly<{
  key: string;
  pathText: string;
  kind: StatePulseKind;
  prev: string;
  next: string;
}>;

const stateGraphModes: readonly StateGraphMode[] = ["all", "leaves", "containers"];
function filterEntries(
  entries: readonly StateGraphEntry[],
  mode: StateGraphMode,
): readonly StateGraphEntry[] {
  if (mode === "leaves") return entries.filter((entry) => entry.isLeaf);
  if (mode === "containers") return entries.filter((entry) => entry.isContainer);
  return entries;
}

const stateGraphRootCss: CssMap = {
  padding: "1rem",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "0.72rem",
  lineHeight: "1.35",
  color: "var(--txt-main, #d8ded8)",
  overflow: "auto",
  background: _colors.backlo
} as const;

const stateGraphTitleCss: CssMap = {
  marginBottom: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  opacity: "0.82",
} as const;

const stateGraphControlsCss: CssMap = {
  display: "flex",
  gap: "0.5rem",
  marginBottom: "0.75rem",
} as const;

const stateGraphButtonCss: CssMap = {
  appearance: "none",
  border: "1px solid color-mix(in oklch, currentColor 22%, transparent)",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  fontSize: "0.68rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "0.2rem 0.45rem",
  cursor: "pointer",
  opacity: "0.62",
} as const;

const stateGraphButtonActiveCss: CssMap = {
  border: "1px solid color-mix(in oklch, currentColor 60%, transparent)",
  opacity: "0.95",
  textDecoration: "underline",
  textUnderlineOffset: "0.18em",
} as const;

const stateGraphGridCss: CssMap = {
  display: "grid",
  gridTemplateColumns: "minmax(14rem, 2fr) 6rem minmax(10rem, 1fr) minmax(10rem, 1fr)",
  gap: "0.75rem",
} as const;

const stateGraphHeaderCss: CssMap = {
  ...stateGraphGridCss,
  padding: "0.35rem 0",
  borderBottom: "1px solid color-mix(in oklch, currentColor 30%, transparent)",
  opacity: "0.72",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
} as const;

const stateGraphRowCss: CssMap = {
  ...stateGraphGridCss,
  padding: "0.28rem 0",
  borderBottom: "1px solid color-mix(in oklch, currentColor 10%, transparent)",
} as const;

const statePulseRootCss: CssMap = {
  padding: "0.75rem",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "0.68rem",
  lineHeight: "1.35",
  color: "var(--txt-main, #d8ded8)",
  overflow: "auto",
  height: "100%",
  boxSizing: "border-box",
  border: "4px ridge " + _colors.yellowlike,
} as const;

const statePulseTitleCss: CssMap = {
  marginBottom: "0.55rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  opacity: "0.86",
} as const;

const statePulseMetaCss: CssMap = {
  display: "flex",
  gap: "0.75rem",
  marginBottom: "0.55rem",
  opacity: "0.62",
} as const;

const statePulseRowCss: CssMap = {
  padding: "0.35rem 0",
  borderTop: "1px solid color-mix(in oklch, currentColor 12%, transparent)",
} as const;

const statePulsePathCss: CssMap = {
  marginBottom: "0.12rem",
  opacity: "0.9",
} as const;

const statePulseValueCss : CssMap= {
  opacity: "0.66",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

let unregisterStoreStateSource: (() => void) | undefined;

function ensureStoreStateSource(): void {
  if (unregisterStoreStateSource) return;

  unregisterStoreStateSource = register_state_source({
    name: "store",
    entries: () => store_graph_entries({ includeContainers: false, maxPreviewLength: 48 }),
    subscribe: (fn) => demo_subscribe(() => fn()),
  });
}

function schemaText(entry: StateGraphEntry): string {
  if (!entry.schema) return "—";

  const types = entry.schema.types.join("|") || "unknown";
  const flags = [
    entry.schema.optional ? "optional" : "",
    entry.schema.readonly ? "readonly" : "",
    entry.schema.hasCustomValidation ? "custom" : "",
  ].filter(Boolean).join(", ");

  return flags ? `${types} (${flags})` : types;
}



function renderModeControls(
  root: LiveTree,
  activeMode: StateGraphMode,
  setMode: (next: StateGraphMode) => void,
): void {
  const controls = root.create.div().css.setMany(stateGraphControlsCss);

  for (const nextMode of stateGraphModes) {
    const button = controls.create.button()
      .text.set(nextMode)
      .css.setMany(
        nextMode === activeMode
          ? { ...stateGraphButtonCss, ...stateGraphButtonActiveCss }
          : stateGraphButtonCss
      );
    button.listen.onPointerDown(() => setMode(nextMode));

  }
}

function pulseText(entry: StateGraphEntry): string {
  return `${entry.kind}:${entry.valuePreview}:${entry.childCount}`;
}

function pulseSnapshot(entries: readonly StateGraphEntry[]): Map<string, StatePulseSnapshot> {
  const map = new Map<string, StatePulseSnapshot>();

  for (const entry of entries) {
    map.set(entry.key, {
      key: entry.key,
      pathText: entry.pathText,
      text: pulseText(entry),
    });
  }

  return map;
}

function pulseDiff(
  prev: Map<string, StatePulseSnapshot>,
  next: Map<string, StatePulseSnapshot>,
): readonly StatePulseRow[] {
  const rows: StatePulseRow[] = [];

  for (const [key, nextEntry] of next) {
    const prevEntry = prev.get(key);
    if (!prevEntry) {
      rows.push({
        key,
        pathText: nextEntry.pathText,
        kind: "set",
        prev: "—",
        next: nextEntry.text,
      });
      continue;
    }

    if (prevEntry.text !== nextEntry.text) {
      rows.push({
        key,
        pathText: nextEntry.pathText,
        kind: "change",
        prev: prevEntry.text,
        next: nextEntry.text,
      });
    }
  }

  for (const [key, prevEntry] of prev) {
    if (next.has(key)) continue;

    rows.push({
      key,
      pathText: prevEntry.pathText,
      kind: "remove",
      prev: prevEntry.text,
      next: "—",
    });
  }

  return rows;
}

function renderPulseRows(root: LiveTree, rows: readonly StatePulseRow[]): void {
  if (rows.length === 0) {
    root.create.div().text.set("no changes observed yet").css.setMany({ opacity: "0.58" });
    return;
  }

  for (const row of rows) {
    const rowTree = root.create.div().css.setMany(statePulseRowCss);
    rowTree.create.div().text.set(`${row.kind} · ${row.pathText}`).css.setMany(statePulsePathCss);
    rowTree.create.div().text.set(`${row.prev} → ${row.next}`).css.setMany(statePulseValueCss);
  }
}


export function mount_state_monitor(host: LiveTree): void {
  ensureStoreStateSource();

  let entries = state_source_entries();
  let snapshot = pulseSnapshot(entries);
  let rows: readonly StatePulseRow[] = [];
  let changeCount = 0;
  let lastRefreshAt = 0;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;

  const render = (): void => {
    host.empty();

    const root = host.create.div().css.setMany(statePulseRootCss);
    root.create.div().text.set("state pulse").css.setMany(statePulseTitleCss);

    const meta = root.create.div().css.setMany(statePulseMetaCss);
    meta.create.div().text.set(`${entries.length} leaves`);
    meta.create.div().text.set(`${changeCount} changes`);

    renderPulseRows(root, rows);
  };

  const refresh = (): void => {
    const nextEntries = state_source_entries();
    const nextSnapshot = pulseSnapshot(nextEntries);
    const nextRows = pulseDiff(snapshot, nextSnapshot);

    entries = nextEntries;
    snapshot = nextSnapshot;

    if (nextRows.length > 0) {
      changeCount += nextRows.length;
      rows = [...nextRows, ...rows].slice(0, 6);
    }

    render();
  };

  const queueRefresh = (): void => {
    if (!has_widget("monitor")) return;
    const now = Date.now();
    const wait = STATE_PULSE_THROTTLE_MS - (now - lastRefreshAt);

    if (wait <= 0) {
      if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer);
        refreshTimer = undefined;
      }

      lastRefreshAt = now;
      refresh();
      return;
    }

    if (refreshTimer !== undefined) return;

    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      lastRefreshAt = Date.now();
      refresh();
    }, wait);
  };

  render();
  subscribe_state_sources(() => queueRefresh());
}