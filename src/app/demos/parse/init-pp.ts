// init-pp.ts

import { hson } from "hson-live";
import { _colors } from "../../core/consts/colors.consts";
import type { Fmt } from "../../core/types/core.types";
import type { PanelShell, Panels } from "../../ui/panels/panels.types";
import { PP_ACTIVE_INVALIDcss, PP_ACTIVE_VALIDcss, PP_INACTIVE_VALIDcss, PP_INACTIVE_INVALIDcss, PP_IDLEcss } from "./pp.css";

type PrimParse =
  | { ok: true; value: string | number | boolean | null; kind: "string" | "scalar" }
  | { ok: false };

type ParsePanelControlState = {
  inProgress: boolean;
  active: Fmt | null;
  isValid: boolean;
  invalidOwner: Fmt | null;
};

const PARSE_PANEL_CONTROL_SCHEMA = hson.liveMap.schema.define((scm) => ({
  inProgress: scm.boolean,
  active: scm.pick("json", "hson", "html").nullable,
  isValid: scm.boolean,
  invalidOwner: scm.pick("json", "hson", "html").nullable,
}));

function makeInitialParsePanelControlState(): ParsePanelControlState {
  return {
    inProgress: false,
    active: null,
    isValid: false,
    invalidOwner: null,
  };
}

const isJsonStringLiteral = (s: string): boolean => /^"(?:\\.|[^"\\])*"$/.test(s);
const isScalarLiteral = (s: string): boolean =>
  s === "null" ||
  s === "true" ||
  s === "false" ||
  /^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s);

const encBytes = (s: string) => new TextEncoder().encode(s).length;

const getValue = (p: PanelShell): string => p.textarea.form.getValue() ?? "";
const setValue = (p: PanelShell, v: string): void =>
  void p.textarea.form.setValue(v, { silent: true });

const tryParse = (raw: string): PrimParse => {
  const t = raw.trim();
  if (!t) return { ok: false };

  if (isJsonStringLiteral(t)) {
    try {
      const v = JSON.parse(t);
      if (typeof v === "string") return { ok: true, value: v, kind: "string" };
      return { ok: false };
    } catch {
      return { ok: false };
    }
  }

  if (isScalarLiteral(t)) {
    try {
      const v = JSON.parse(t);
      if (v === null || typeof v === "number" || typeof v === "boolean") {
        return { ok: true, value: v, kind: "scalar" };
      }
      return { ok: false };
    } catch {
      return { ok: false };
    }
  }

  return { ok: false };
};

const lockTextarea = (p: PanelShell): void => {
  p.textarea.flag.set("readonly");

  p.textarea.css.setMany({
    pointerEvents: "auto",
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

  const parseState = hson.liveMap
    .fromJson(makeInitialParsePanelControlState())
    .schema.use(PARSE_PANEL_CONTROL_SCHEMA);

  function getParseState(): ParsePanelControlState {
    return parseState.snap() as ParsePanelControlState;
  }

  function getInProgress(): boolean {
    return getParseState().inProgress;
  }

  function setInProgress(next: boolean): void {
    parseState.at(["inProgress"]).set(next);
  }

  function getActive(): Fmt | null {
    return getParseState().active;
  }

  function setActive(next: Fmt | null): void {
    parseState.at(["active"]).set(next);
  }

  function getIsValid(): boolean {
    return getParseState().isValid;
  }

  function setIsValid(next: boolean): void {
    parseState.at(["isValid"]).set(next);
  }

  function getInvalidOwner(): Fmt | null {
    return getParseState().invalidOwner;
  }

  function setInvalidOwner(next: Fmt | null): void {
    parseState.at(["invalidOwner"]).set(next);
  }

  function isIdleValid(): boolean {
    return getActive() === null && getIsValid();
  }

  function isIdleInvalid(): boolean {
    return getActive() === null && !getIsValid();
  }

  function isActiveValid(): boolean {
    return getActive() !== null && getIsValid();
  }
  function setNodeViewForAll(t: ReturnType<typeof hson.fromJson> | ReturnType<typeof hson.fromHson> | ReturnType<typeof hson.fromTrustedHtml>): void {

    const nodeTxt = JSON.stringify(t.toNode(), null, 2);

    for (const fmt of FMTS) {
      pp.panels[fmt].nodeText.text.set(nodeTxt);
    }
  }

  function isThisActiveValid(fmt: Fmt): boolean {
    return getActive() === fmt && getIsValid();
  }

  function isThisActiveInvalid(fmt: Fmt): boolean {
    return getActive() === fmt && !getIsValid();
  }

  let invalidClearTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer(): void {
    if (invalidClearTimer) clearTimeout(invalidClearTimer);
    invalidClearTimer = null;
  }

  function clearInvalidOwner(): void {
    setInvalidOwner(null);
    clearTimer();
  }

  function markInvalidOwner(fmt: Fmt): void {
    setInvalidOwner(fmt);
  }

  function scheduleClearInvalid(fmt: Fmt): void {
    clearTimer();
    setInvalidOwner(fmt);

    invalidClearTimer = setTimeout(() => {
      if (getInvalidOwner() !== fmt) return;

      setValue(pp.panels[fmt], "");
      pp.panels[fmt].bytes.text.set("0");
      setInvalidOwner(null);
      invalidClearTimer = null;
    }, 30000);
  }


  function setStatus(fmt: Fmt, kind: "idle" | "typing" | "valid" | "invalid"): void {
    const p = pp.panels[fmt];

    if (kind === "idle") {
      p.status.text.set("--");
      p.status.css.setMany({ opacity: "0" });
      return;
    }

    if (kind === "typing") {
      p.status.text.set("••");
      p.status.css.setMany({ opacity: "1" });
      return;
    }

    if (kind === "valid") {
      for (const f of FMTS) {
        const fmtt = pp.panels[f];
        fmtt.status.text.set("OK");
      }
      p.status.css.setMany({ opacity: "1", color: _colors.hson.n });
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
        p.wmFmt.style.set.color("transparent")
        unlockTextarea(p);
        continue;
      }

      if (isThisActiveValid(f)) {
        p.textBox.css.setMany(PP_ACTIVE_VALIDcss(f));
        p.wmFmt.style.set.color("transparent")
        unlockTextarea(p);
        continue;
      }

      if (isActiveValid()) {
        p.textBox.css.setMany(PP_INACTIVE_VALIDcss(f));
        p.wmFmt.style.set.color("transparent")
        lockTextarea(p);
        continue;
      }
      if (isIdleInvalid()) {
        p.textBox.css.setMany(PP_INACTIVE_INVALIDcss(f));
        p.wmFmt.style.set.color(_colors.txt.grey)
        unlockTextarea(p);
        continue;
      }

      if (isIdleValid()) {
        p.textBox.css.setMany(PP_INACTIVE_VALIDcss(f));
        p.wmFmt.style.set.color("transparent")
        unlockTextarea(p);
        continue;
      }

      p.textBox.css.setMany(PP_IDLEcss(f));
      p.wmFmt.style.set.color(_colors.txt.grey)
      if (getActive() === null) {
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
      setStatus(f, "idle");
    }
  }

  function setPanelValueAndBytes(fmt: Fmt, value: string): void {
    setValue(pp.panels[fmt], value);
    pp.panels[fmt].bytes.text.set(`${encBytes(value)}`);
  }

  function markActiveValid(fmt: Fmt): void {
    if (getActive() !== fmt) return;
    setIsValid(true);
    clearInvalidOwner();
    setStatus(fmt, "valid");
    syncUiState();
  }

  function markActiveInvalid(fmt: Fmt): void {
    if (getActive() !== fmt) return;
    setIsValid(false);
    markInvalidOwner(fmt);
    setStatus(fmt, "invalid");
    syncUiState();
  }

  function update(origin: Fmt): void {
    if (getInProgress()) return;
    setInProgress(true);

    const srcParts = pp.panels[origin];
    const raw = getValue(srcParts);
    srcParts.bytes.text.set(`${encBytes(raw)}`);

    if (getActive() === origin) setStatus(origin, "typing");

    if (raw.trim().length === 0) {
      if (getActive() === origin) {
        setIsValid(false);
        markInvalidOwner(origin);
        setStatus(origin, "invalid");
        srcParts.bytes.text.set("0");
        syncUiState();
      }
      setInProgress(false);
      return;
    }

    try {
      if (origin === "json" || origin === "hson") {
        const prim = tryParse(raw);

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
          setInProgress(false);
          return;
        }

        if (origin === "hson") {
          const t = raw.trim();
          const looksLikeBareWord = /^[A-Za-z_][A-Za-z0-9_]*$/.test(t);

          if (looksLikeBareWord) {
            markActiveInvalid(origin);
            setInProgress(false);
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

      setNodeViewForAll(t);
      markActiveValid(origin);
    } catch {
      markActiveInvalid(origin);
    } finally {
      setInProgress(false);
    }
  }

  function handleFocus(fmt: Fmt): void {
    const owner = getInvalidOwner();

    if (owner && owner !== fmt) {
      setValue(pp.panels[owner], "");
      pp.panels[owner].bytes.text.set("0");
      clearInvalidOwner();
    }

    setActive(fmt);
    clearTimer();

    syncUiState();

    const v = getValue(pp.panels[fmt]);

    if (v.trim().length === 0) {
      setIsValid(false);
      markInvalidOwner(fmt);
      setStatus(fmt, "invalid");
      syncUiState();
      return;
    }
    setStatus(fmt, "typing");
  }

  function handleBlur(fmt: Fmt): void {
    if (getActive() !== fmt) return;

    const raw = getValue(pp.panels[fmt]);
    const empty = raw.trim().length === 0;

    const leavingInvalid = empty || !getIsValid();

    if (leavingInvalid) {
      setIsValid(false);
      clearOthers(fmt);
      scheduleClearInvalid(fmt);
      markInvalidOwner(fmt);
    }

    setActive(null);

    setStatus(fmt, "idle");
    syncUiState();
  }

  for (const fmt of FMTS) {
    const p = pp.panels[fmt];

    p.textarea.listen.onFocus(() => handleFocus(fmt));
    p.textarea.listen.onBlur(() => handleBlur(fmt));
    p.textarea.listen.onInput(() => update(fmt));
  }

  setActive(null);
  setIsValid(false);
  clearInvalidOwner();
  syncUiState();

  for (const fmt of FMTS) {
    const parts = pp.panels[fmt];
    parts.bytes.text.set(`${encBytes(getValue(parts))}`);
    parts.status.text.set("--");
    parts.status.css.setMany({ opacity: "0" });
  }
}
