// init.pp.ts
import { hson } from "hson-live";

import type { Panels, PanelShell } from "../../../ui/panels/panels.types";
import type { Fmt } from "../../../core/types/core.types";
import { PP_IDLEcss, PP_ACTIVE_INVALIDcss, PP_ACTIVE_VALIDcss, PP_INACTIVE_VALIDcss, PP_INACTIVE_INVALIDcss } from "./pp.css";

// origin-aware primitive parsing.
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


const encBytes = (s: string) => new TextEncoder().encode(s).length;

const getValue = (p: PanelShell): string => p.textarea.getFormValue() ?? "";
const setValue = (p: PanelShell, v: string): void =>
  void p.textarea.setFormValue(v, { silent: true });


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

const lockTextarea = (p: PanelShell): void => {
  // lock via readonly + no selection, but keep focus/click working
  p.textarea.flag.set("readonly");

  p.textarea.css.setMany({
    pointerEvents: "auto",   // was none (likely)
    userSelect: "none",
    caretColor: "transparent",
  });
};

const unlockTextarea = (p: PanelShell): void => {
  p.textarea.flag.clear("readonly");

  p.textarea.css.setMany({
    pointerEvents: "auto",
    userSelect: "text",
    caretColor: "auto",
  });
};

export function init_parsing_panels(pp: Panels): void {
  const FMTS = Object.keys(pp.panels) as readonly Fmt[];

  let inProgress = false;
  let active: Fmt | null = null;
  let isValid = false;
  function isIdle(): boolean {
    return active === null;
  }

  function isIdleValid(): boolean {
    return active === null && isValid;
  }

  function isIdleInvalid(): boolean {
    return active === null && !isValid;
  }

  function isActiveValid(): boolean {
    return active !== null && isValid;
  }
  function setNodeViewForAll(t: ReturnType<typeof hson.fromJson> | ReturnType<typeof hson.fromHson> | ReturnType<typeof hson.fromTrustedHtml>): void {
    const nodeTxt = JSON.stringify(t.toHson().parse(), null, 2);

    for (const fmt of FMTS) {
      pp.panels[fmt].nodeBox.text.set(nodeTxt);
    }
  }

  function isThisActiveValid(fmt: Fmt): boolean {
    return active === fmt && isValid;
  }

  function isThisActiveInvalid(fmt: Fmt): boolean {
    return active === fmt && !isValid;
  }

  let invalidClearTimer: ReturnType<typeof setTimeout> | null = null;
  let invalidOwner: Fmt | null = null;

  function clearTimer(): void {
    if (invalidClearTimer) clearTimeout(invalidClearTimer);
    invalidClearTimer = null;
  }

  function clearInvalidOwner(): void {
    invalidOwner = null;
    clearTimer();
  }

  function markInvalidOwner(fmt: Fmt): void {
    invalidOwner = fmt;
  }

  function scheduleClearInvalid(fmt: Fmt): void {
    clearTimer();
    invalidOwner = fmt;

    invalidClearTimer = setTimeout(() => {
      if (invalidOwner !== fmt) return;

      setValue(pp.panels[fmt], "");
      pp.panels[fmt].bytes.text.set("0");
      invalidOwner = null;
      invalidClearTimer = null;
    }, 30000);
  }

  function setFocusedOnly(fmt: Fmt | null): void {
    for (const f of FMTS) {
      const p = pp.panels[f];
      // p.status.css.setMany({ opacity: fmt === f ? "1" : "0" });
    }
  }

  function setStatus(fmt: Fmt, kind: "idle" | "typing" | "valid" | "invalid"): void {
    const p = pp.panels[fmt];

    if (kind === "idle") {
      p.status.text.set("");
      // p.status.css.setMany({ opacity: "0" });
      return;
    }

    if (kind === "typing") {
      p.status.text.set("•••");
      p.status.css.setMany({ opacity: "1", color: "dodgerblue" });
      return;
    }

    if (kind === "valid") {
      p.status.text.set("OK");
      p.status.css.setMany({ opacity: "1", color: "lime" });
      return;
    }

    p.status.text.set("XX");
    p.status.css.setMany({ opacity: "1", color: "red" });
  }

  function syncUiState(): void {
    for (const f of FMTS) {
      const p = pp.panels[f];

      if (isThisActiveInvalid(f)) {
        p.textBox.css.setMany(PP_ACTIVE_INVALIDcss(f));
        unlockTextarea(p);
        continue;
      }

      if (isThisActiveValid(f)) {
        p.textBox.css.setMany(PP_ACTIVE_VALIDcss(f));
        unlockTextarea(p);
        continue;
      }
      
      if (isActiveValid()) {
        p.textBox.css.setMany(PP_INACTIVE_VALIDcss(f));
        lockTextarea(p);
        continue;
      }
      if (isIdleInvalid()) {
        p.textBox.css.setMany(PP_INACTIVE_INVALIDcss(f));
        unlockTextarea(p);
}
      if (isIdleValid()) {
        p.textBox.css.setMany(PP_INACTIVE_VALIDcss(f));
        unlockTextarea(p);
        continue;
      }

      // idle invalid, or inactive while another panel is invalid
      p.textBox.css.setMany(PP_IDLEcss(f));
      if (active === null) {
        unlockTextarea(p);
      } else {
        lockTextarea(p);
      }
    }
  }

  function clearOthers(origin: Fmt): void {
    for (const f of FMTS) {
      if (f === origin) continue;
      setValue(pp.panels[f], "");
      pp.panels[f].bytes.text.set("0");
    }
  }

  function setPanelValueAndBytes(fmt: Fmt, value: string): void {
    setValue(pp.panels[fmt], value);
    pp.panels[fmt].bytes.text.set(`${encBytes(value)}`);
  }

  function markActiveValid(fmt: Fmt): void {
    if (active !== fmt) return;
    isValid = true;
    clearInvalidOwner();
    setStatus(fmt, "valid");
    syncUiState();
  }

  function markActiveInvalid(fmt: Fmt): void {
    if (active !== fmt) return;
    isValid = false;
    markInvalidOwner(fmt);
    setStatus(fmt, "invalid");
    syncUiState();
  }

  function update(origin: Fmt): void {
    if (inProgress) return;
    inProgress = true;

    const srcParts = pp.panels[origin];
    const raw = getValue(srcParts);
    srcParts.bytes.text.set(`${encBytes(raw)}`);

    if (active === origin) setStatus(origin, "typing");

    if (raw.trim().length === 0) {
      if (active === origin) {
        isValid = false;
        markInvalidOwner(origin);
        setStatus(origin, "invalid");
        srcParts.bytes.text.set("INVALID");
        syncUiState();
      }
      inProgress = false;
      return;
    }

    try {
      if (origin === "json" || origin === "hson") {
        const prim = tryParse(origin, raw);

        if (prim.ok) {
          const outJ = JSON.stringify(prim.value);
          const outH = outJ;
          const outX =
            prim.kind === "string"
              ? prim.value as string
              : `<_val>${String(prim.value)}</_val>`;

          setPanelValueAndBytes("json", outJ);
          setPanelValueAndBytes("hson", outH);
          setPanelValueAndBytes("html", outX);

          const tPrim = hson.fromJson(outJ);
          setNodeViewForAll(tPrim);

          markActiveValid(origin);
          inProgress = false;
          return;
        }

        if (origin === "hson") {
          const t = raw.trim();
          const looksLikeBareWord = /^[A-Za-z_][A-Za-z0-9_]*$/.test(t);

          if (looksLikeBareWord) {
            markActiveInvalid(origin);
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

      if (origin !== "json") {
        setPanelValueAndBytes("json", t.toJson().serialize());
      }
      if (origin !== "hson") {
        setPanelValueAndBytes("hson", t.toHson().serialize());
      }
      if (origin !== "html") {
        setPanelValueAndBytes("html", t.toHtml().serialize());
      }
      const tNode =
        origin === "json"
          ? hson.fromJson(raw)
          : origin === "hson"
            ? hson.fromHson(raw)
            : hson.fromTrustedHtml(raw);

      setNodeViewForAll(tNode);
      markActiveValid(origin);
    } catch {
      markActiveInvalid(origin);
    } finally {
      inProgress = false;
    }
  }

  function handleFocus(fmt: Fmt): void {
    // if another panel still owns invalid content, clear it now on switch
    if (invalidOwner && invalidOwner !== fmt) {
      setValue(pp.panels[invalidOwner], "");
      pp.panels[invalidOwner].bytes.text.set("0");
      clearInvalidOwner();
    }

    active = fmt;
    clearTimer();

    setFocusedOnly(fmt);
    syncUiState();

    const v = getValue(pp.panels[fmt]);

    if (v.trim().length === 0) {
      isValid = false;
      markInvalidOwner(fmt);
      setStatus(fmt, "invalid");
      syncUiState();
      return;
    }
    setStatus(fmt, "typing");
  }

  function handleBlur(fmt: Fmt): void {
    if (active !== fmt) return;

    const raw = getValue(pp.panels[fmt]);
    const empty = raw.trim().length === 0;

    // while focused, invalid means either parse-invalid state or empty
    const leavingInvalid = empty || !isValid;

    if (leavingInvalid) {
      isValid = false; // CHANGED: prevent idle-valid glow after invalid blur
      clearOthers(fmt);
      scheduleClearInvalid(fmt);
      markInvalidOwner(fmt);
    }

    active = null;

    setFocusedOnly(null);
    setStatus(fmt, "idle");
    syncUiState();
  }

  for (const fmt of FMTS) {
    const p = pp.panels[fmt];

    p.textarea.listen.onFocus(() => handleFocus(fmt));
    p.textarea.listen.onBlur(() => handleBlur(fmt));
    p.textarea.listen.onInput(() => update(fmt));
  }

  active = null;
  isValid = false;
  clearInvalidOwner();
  setFocusedOnly(null);
  syncUiState();

  for (const fmt of FMTS) {
    const parts = pp.panels[fmt];
    parts.bytes.text.set(`${encBytes(getValue(parts))}`);
    parts.status.text.set("");
    // parts.status.css.setMany({ opacity: "0" });
  }
}