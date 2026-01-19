// parse-panel.ts

import { hson, LiveTree } from "hson-live";

type Fmt = "json" | "hson" | "html";

type PanelParts = {
  fmt: Fmt;
  panel: LiveTree;
  input: LiveTree;
  chip: LiveTree;
  bytes: LiveTree;
  // CHANGED: exactOptionalPropertyTypes requires you omit the prop when missing,
  // OR declare it as possibly undefined. We choose explicit undefined.
  copyBtn?: LiveTree;
};

type Panels = {
  root: LiveTree;
  json: PanelParts;
  hson: PanelParts;
  html: PanelParts;
  // CHANGED: same deal
  nodeOut?: LiveTree;
};

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
export function init_parsing_panels(panelsRoot: LiveTree) {
  // CHANGED: accept the widget root, not an arbitrary branch
  const panels = ensure_parsing_panels(panelsRoot);

  // CHANGED: no delegation needed; bind direct listeners
  bind_panel_inputs(panels);
  bind_copy_buttons(panels);

  // Optional initial sync: whichever panel already has content wins.
  // CHANGED: prefer JSON > HSON > HTML as a deterministic tie-breaker.
  hydrate_initial(panels);
}

// ------------------------------------------------------------
// Ensure + discovery
// ------------------------------------------------------------
function ensure_parsing_panels(root: LiveTree): Panels {
  if (!root) throw new Error("no panelsRoot");

  const json = ensure_panel(root, "json");
  const hsonP = ensure_panel(root, "hson");
  const html = ensure_panel(root, "html");

  // Optional node output area (within this widget only)
  const nodeOut = root.find("#node-output") ?? undefined;

  return {
    root,
    json,
    hson: hsonP,
    html,
    ...(nodeOut ? { nodeOut } : {}), // CHANGED: omit when undefined (exactOptionalPropertyTypes-friendly)
  };
}

function ensure_panel(root: LiveTree, fmt: Fmt): PanelParts {
  const panel = root.find.must({ attrs: { "data-role": `panel-${fmt}` } });

  const input =
    panel.find({ tag: "textarea", attrs: { "data-input": fmt } }) ??
    panel.find.must({ tag: "textarea" }); // fallback if you forgot data-input

  const chip =
    panel.find({ tag: "span", attrs: { class: "chip validity" } }) ??
    panel.find.must({ tag: "span", attrs: { class: "chip" } }); // fallback

  const bytes =
    panel.find({ attrs: { "data-field": `${fmt}-bytes` } }) ??
    panel.find.must({ attrs: { "data-field": `${fmt}-bytes` } });

  const copyBtn = panel.find({ attrs: { "data-action": `copy-${fmt}` } }) ?? undefined;

  return {
    fmt,
    panel,
    input,
    chip: chip,
    bytes,
    ...(copyBtn ? { copyBtn } : {}), // CHANGED: omit unless present
  };
}

// ------------------------------------------------------------
// Wiring
// ------------------------------------------------------------
function bind_panel_inputs(panels: Panels) {
  const parts = [panels.json, panels.hson, panels.html] as const;

  // CHANGED: tiny debounce per-panel; keeps UX smooth on pastes
  const makeDebounced = (fn: () => void, ms = 90) => {
    let t: number | undefined;
    return () => {
      if (t !== undefined) window.clearTimeout(t);
      t = window.setTimeout(() => {
        t = undefined;
        fn();
      }, ms);
    };
  };

  // CHANGED: shared update pipeline with reentrancy guard
  let inProgress = false;

  const update_from = (origin: Fmt) => {
    if (inProgress) return;
    inProgress = true;

    try {
      const originPanel = get_panel(panels, origin);
      const src = (originPanel.input.getFormValue() ?? "") as string;
      const bytesNow = enc_bytes(src);

      // short-circuit empty
      if (src.trim().length === 0) {
        mark(originPanel, { state: "invalid", bytes: bytesNow });
        mark_stale_others(panels, origin);
        return;
      }

      const tree =
        origin === "json"
          ? hson.fromJson(src)
          : origin === "hson"
            ? hson.fromHson(src)
            : hson.fromTrustedHtml(src);

      // origin OK
      mark(originPanel, { state: "valid", bytes: bytesNow });

      // sync others
      const outJson = origin === "json" ? src : tree.toJson().serialize();
      const outHson = origin === "hson" ? src : tree.toHson().serialize();
      const outHtml = origin === "html" ? src : tree.toHtml().serialize();

      set_panel(panels.json, outJson);
      set_panel(panels.hson, outHson);
      set_panel(panels.html, outHtml);

      mark(panels.json, { state: "valid", bytes: enc_bytes(outJson) });
      mark(panels.hson, { state: "valid", bytes: enc_bytes(outHson) });
      mark(panels.html, { state: "valid", bytes: enc_bytes(outHtml) });

      // optional node output
      if (panels.nodeOut) {
        // CHANGED: keep this cheap; serialize parse result, not DOM
        const dump = tree.toHson().parse();
        panels.nodeOut.setText(JSON.stringify(dump, null, 2));
      }
    } catch {
      const originPanel = get_panel(panels, origin);
      const src = (originPanel.input.getFormValue() ?? "") as string;
      mark(originPanel, { state: "invalid", bytes: enc_bytes(src) });
      mark_stale_others(panels, origin);
    } finally {
      inProgress = false;
    }
  };

  for (const p of parts) {
    const debounced = makeDebounced(() => update_from(p.fmt));
    p.input.listen.on("input", debounced);
  }
}

function bind_copy_buttons(panels: Panels) {
  const parts = [panels.json, panels.hson, panels.html] as const;

  const flash = (p: PanelParts) => {
    if (!p.copyBtn) return;
    const prev = p.copyBtn.getText() ?? "";
    p.copyBtn.setAttrs("data-busy", "true").setText("copied");
    window.setTimeout(() => {
      p.copyBtn?.setAttrs("data-busy", "false");
      if (prev) p.copyBtn?.setText(prev);
    }, 800);
  };

  for (const p of parts) {
    if (!p.copyBtn) continue;

    p.copyBtn.listen.onClick(() => {
      const raw = (p.input.getFormValue() ?? "") as string;
      const txt = p.fmt === "json" ? compact_json(raw) : compact_loose(raw);
      navigator.clipboard?.writeText(txt).then(() => flash(p));
    });
  }
}

// ------------------------------------------------------------
// Initial hydration
// ------------------------------------------------------------
function hydrate_initial(panels: Panels) {
  // CHANGED: deterministic priority order
  const order: Fmt[] = ["json", "hson", "html"];

  for (const fmt of order) {
    const p = get_panel(panels, fmt);
    const v = ((p.input.getFormValue() ?? "") as string).trim();
    if (!v.length) continue;

    // run one update pass by simulating input (without needing extra exported functions)
    // We do the cheap version: parse and set all.
    try {
      const t =
        fmt === "json"
          ? hson.fromJson(v)
          : fmt === "hson"
            ? hson.fromHson(v)
            : hson.fromTrustedHtml(v);

      const outJson = t.toJson().serialize();
      const outHson = t.toHson().serialize();
      const outHtml = t.toHtml().serialize();

      set_panel(panels.json, outJson);
      set_panel(panels.hson, outHson);
      set_panel(panels.html, outHtml);

      mark(panels.json, { state: "valid", bytes: enc_bytes(outJson) });
      mark(panels.hson, { state: "valid", bytes: enc_bytes(outHson) });
      mark(panels.html, { state: "valid", bytes: enc_bytes(outHtml) });
      return;
    } catch {
      // keep looking
      mark(p, { state: "invalid", bytes: enc_bytes(v) });
    }
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function get_panel(panels: Panels, fmt: Fmt): PanelParts {
  return fmt === "json" ? panels.json : fmt === "hson" ? panels.hson : panels.html;
}

function set_panel(p: PanelParts, v: string) {
  // CHANGED: silent write to avoid triggering your own listeners
  p.input.setFormValue(v, { silent: true });
}

type MarkState = "valid" | "invalid" | "stale";
function mark(p: PanelParts, opts: { state?: MarkState; bytes?: number }) {
  if (opts.state) {
    p.chip.setAttrs("data-valid", opts.state);
    p.chip.setText(opts.state);
  }
  if (opts.bytes !== undefined) {
    p.bytes.setText(`${opts.bytes} bytes`);
  }
}

function mark_stale_others(panels: Panels, origin: Fmt) {
  const all: PanelParts[] = [panels.json, panels.hson, panels.html];
  for (const p of all) {
    if (p.fmt === origin) continue;
    mark(p, { state: "stale" });
  }
}

function enc_bytes(s: string) {
  return new TextEncoder().encode(s).length;
}

function compact_json(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw));
  } catch {
    return compact_loose(raw);
  }
}

function compact_loose(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}