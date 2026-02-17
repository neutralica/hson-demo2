// init.pp.ts
import { hson } from "hson-live";

import { PP_FOCUS_PANELcss, PP_MUTEDcss, PP_UNMUTEDcss } from "./pp.css";
import type { Fmt, Panels, PanelShell } from "../panels.types";

const lockTextarea = (p: PanelShell): void => {
  // CHANGED: lock via readonly + no selection, but keep focus/click working
  p.textarea.setFlags("readonly");

  p.textarea.css.setMany({
    pointerEvents: "auto",   // CHANGED: was none (likely)
    userSelect: "none",
    caretColor: "transparent",
  });
};

const unlockTextarea = (p: PanelShell): void => {
  p.textarea.removeFlags("readonly");

  p.textarea.css.setMany({
    pointerEvents: "auto",
    userSelect: "text",
    caretColor: "auto",
  });
};

export function init_parsing_panels(pp: Panels): void {
  // CHANGED: derive fmts from the Panels object that was actually created
  const FMTS = Object.keys(pp.panels) as readonly Fmt[];
  let inProgress = false;
  let active: Fmt | null = null;
  let activeIsInvalid = false;

  // timer to clear invalid text after blur
  let invalidClearTimer: ReturnType<typeof setTimeout> | null = null;
  let invalidOwner: Fmt | null = null;

  const encBytes = (s: string) => new TextEncoder().encode(s).length;

  const getValue = (p: PanelShell): string => p.textarea.getFormValue() ?? "";
  const setValue = (p: PanelShell, v: string): void =>
    void p.textarea.setFormValue(v, { silent: true });

  const clearTimer = (): void => {
    if (invalidClearTimer) clearTimeout(invalidClearTimer);
    invalidClearTimer = null;
    invalidOwner = null;
  };

  const scheduleClearInvalid = (fmt: Fmt): void => {
    clearTimer();
    invalidOwner = fmt;
    invalidClearTimer = setTimeout(() => {
      // only clear if it’s still invalid and still the same box that “owns” the invalid
      if (invalidOwner !== fmt) return;
      if (active === fmt) {
        // if they refocused the same box and fixed it, this should not run
        if (!activeIsInvalid) return;
      }
      setValue(pp.panels[fmt], "");
      pp.panels[fmt].bytes.text.set("0 bytes");
      // if it was unfocused already, nothing else needed
    }, 30000);
  };

  const setFocusedOnly = (fmt: Fmt | null): void => {
    for (const f of FMTS) {
      const p = pp.panels[f];
      const on = fmt === f;

      p.status.css.setMany({ opacity: on ? "1" : "0" });
      p.panel.css.setMany(on ? PP_FOCUS_PANELcss : { boxShadow: null });
    }
  };

  const setStatus = (fmt: Fmt, kind: "idle" | "typing" | "valid" | "invalid"): void => {
    const p = pp.panels[fmt];

    if (kind === "idle") {
      p.status.text.set("");
      p.status.css.setMany({ opacity: "0" });
      return;
    }
    if (kind === "typing") {
      p.status.text.set("...");
      p.status.css.setMany({ opacity: "1", color: "dodgerblue" });
      return;
    }
    if (kind === "valid") {
      p.status.text.set("valid");
      p.status.css.setMany({ opacity: "1", color: "lime" });
      return;
    }
    p.status.text.set("invalid");
    p.status.css.setMany({ opacity: "1", color: "red" });
  };

  // CENTRAL: derive muting + interactivity from (active, activeIsInvalid)
  const sync_ui_state = (): void => {
    for (const f of FMTS) {
      const p = pp.panels[f];
      const isActive = active === f;

      if (isActive) {
        // focused panel is always interactive
        p.wrap.css.setMany(PP_UNMUTEDcss);
        unlockTextarea(p);
        continue;
      }

      // non-active panels:
      if (active && activeIsInvalid) {
        // muted + locked
        p.wrap.css.setMany(PP_MUTEDcss);
        lockTextarea(p);
      } else {
        // normal + interactive
        p.wrap.css.setMany(PP_UNMUTEDcss);
        unlockTextarea(p);
      }
    }
  };
  for (const f of FMTS) {
    const p = pp.panels[f];
    p.wrap.css.setMany(PP_UNMUTEDcss);
    unlockTextarea(p);
  }
  const clearOthers = (origin: Fmt): void => {
    for (const f of FMTS) {
      if (f === origin) continue;
      setValue(pp.panels[f], "");
      pp.panels[f].bytes.text.set("0 bytes");
    }

    return;
  };

  // primitive support (same as before)
  // CHANGED: origin-aware primitive parsing.
  // - JSON: any JSON primitive is allowed (strings must be quoted because JSON.parse enforces it)
  // - HSON: allow numbers/bool/null unquoted, BUT strings only when explicitly quoted
  type PrimParse =
    | { ok: true; value: string | number | boolean | null; kind: "string" | "scalar" }
    | { ok: false };

  const isJsonStringLiteral = (s: string): boolean => /^"(?:\\.|[^"\\])*"$/.test(s);
  const isScalarLiteral = (s: string): boolean =>
    s === "null" ||
    s === "true" ||
    s === "false" ||
    /^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s);

  const tryParse = (origin: Fmt, raw: string): PrimParse => {
    const t = raw.trim();
    if (!t) return { ok: false };

    // Strings: JSON requires quotes; HSON we require quotes too (your rule)
    if (isJsonStringLiteral(t)) {
      try {
        // JSON.parse is safe here; it produces the actual string value without quotes
        const v = JSON.parse(t);
        if (typeof v === "string") return { ok: true, value: v, kind: "string" };
        return { ok: false };
      } catch {
        return { ok: false };
      }
    }

    // Scalars: allow for both JSON and HSON (unquoted)
    if (isScalarLiteral(t)) {
      try {
        const v = JSON.parse(t); // parses number/bool/null
        if (v === null || typeof v === "number" || typeof v === "boolean") {
          return { ok: true, value: v, kind: "scalar" };
        }
        return { ok: false };
      } catch {
        return { ok: false };
      }
    }

    // Bare words are NEVER primitives for HSON in this widget (prevents empty _obj nonsense)
    // JSON.parse would throw anyway, so we just reject.
    return { ok: false };
  };

  const update = (origin: Fmt): void => {
    if (inProgress) return;
    inProgress = true;

    const srcParts = pp.panels[origin];
    const raw = getValue(srcParts);
    srcParts.bytes.text.set(`${encBytes(raw)} bytes`);

    // While typing, show ...
    if (active === origin) setStatus(origin, "typing");

    // Empty counts as invalid *while focused*, but does not overwrite other panels
    if (raw.trim().length === 0) {
      if (active === origin) {
        activeIsInvalid = true;
        setStatus(origin, "invalid");
        srcParts.bytes.text.set(`INVALID`);
        sync_ui_state();
      }
      inProgress = false;
      return;
    }

    try {
      // primitive bypass for json/hson
      // CHANGED: primitive bypass for json/hson (origin-aware)
      if (origin === "json" || origin === "hson") {
        const prim = tryParse(origin, raw);

        if (prim.ok) {
          // JSON column always uses JSON representation
          const outJ = JSON.stringify(prim.value);

          // HSON column: for this widget, we want the same textual primitive representation
          // (quoted strings stay quoted; numbers/bools/null are bare).
          const outH = outJ;

          // HTML column: strings should be raw (no <_val> wrapper), scalars use <_val>
          const outX =
            prim.kind === "string"
              ? prim.value as string
              : `<_val>${String(prim.value)}</_val>`;

          setValue(pp.panels.json, outJ);
          pp.panels.json.bytes.text.set(`${encBytes(outJ)} bytes`);

          setValue(pp.panels.hson, outH);
          pp.panels.hson.bytes.text.set(`${encBytes(outH)} bytes`);

          setValue(pp.panels.html, outX);
          pp.panels.html.bytes.text.set(`${encBytes(outX)} bytes`);

          if (active === origin) {
            activeIsInvalid = false;
            clearTimer();
            setStatus(origin, "valid");
            sync_ui_state();
          }

          inProgress = false;
          return;
        }

        // ADDED: HSON bare-words should be invalid (prevents the empty <_obj> behavior)
        if (origin === "hson") {
          const t = raw.trim();
          const looksLikeBareWord = /^[A-Za-z_][A-Za-z0-9_]*$/.test(t);
          if (looksLikeBareWord) {
            if (active === origin) {
              activeIsInvalid = true;
              setStatus(origin, "invalid");
              sync_ui_state();
            }
            inProgress = false;
            return;
          }
        }
      }

      const t =
        origin === "json"
          ? hson.fromJson(raw)
          : origin === "hson"
            ? hson.fromHson(raw)
            : hson.fromTrustedHtml(raw);

      // success: update others in real-time (rule #2)
      if (origin !== "json") {
        const outJ = t.toJson().serialize();
        setValue(pp.panels.json, outJ);
        pp.panels.json.bytes.text.set(`${encBytes(outJ)} bytes`);
      }
      if (origin !== "hson") {
        const outH = t.toHson().serialize();
        setValue(pp.panels.hson, outH);
        pp.panels.hson.bytes.text.set(`${encBytes(outH)} bytes`);
      }
      if (origin !== "html") {
        const outX = t.toHtml().serialize();
        setValue(pp.panels.html, outX);
        pp.panels.html.bytes.text.set(`${encBytes(outX)} bytes`);
      }

      if (active === origin) {
        activeIsInvalid = false;
        clearTimer();
        setStatus(origin, "valid");
        sync_ui_state();
      }
    } catch {
      if (active === origin) {
        activeIsInvalid = true;
        setStatus(origin, "invalid");
        sync_ui_state();
      }
      // do NOT overwrite other panels on invalid
    } finally {
      inProgress = false;
    }
  };

  // --- wire focus/blur + input ---
  for (const fmt of FMTS) {
    const p = pp.panels[fmt];

    p.textarea.listen.onFocus( () => {
      // clear previous invalid on focus switch (your rule #4)
      if (active && active !== fmt && activeIsInvalid) {
        const prev = active;
        setValue(pp.panels[prev], "");
        pp.panels[prev].bytes.text.set("0 bytes");
      }

      clearTimer();

      active = fmt;
      setFocusedOnly(fmt);

      // optimistic, but update() will settle it
      activeIsInvalid = false;
      sync_ui_state();

      // now set status
      const v = getValue(p);
      if (v.trim().length === 0) {
        activeIsInvalid = true;
        // setStatus(fmt, "invalid");
        sync_ui_state();
      } else {
        setStatus(fmt, "typing");
      }
    });

    p.textarea.listen.onBlur(() => {
      if (active !== fmt) return;

      // rule #3: if blur while invalid, keep invalid text; clear other panels
      if (activeIsInvalid) {
        clearOthers(fmt);
        scheduleClearInvalid(fmt);
      }

      active = null;
      activeIsInvalid = false;

      setFocusedOnly(null);
      // rule: status only visible on focused panel
      setStatus(fmt, "idle");

      sync_ui_state();
    });

    p.textarea.listen.onInput( () => update(fmt));
  }

  // initial state
  active = null;
  activeIsInvalid = false;
  clearTimer();
  setFocusedOnly(null);
  sync_ui_state();

  for (const fmt of FMTS) {
    const parts = pp.panels[fmt];
    parts.bytes.text.set(`${encBytes(getValue(parts))} bytes`);
    parts.status.text.set("");
    parts.status.css.setMany({ opacity: "0" });
  }
}