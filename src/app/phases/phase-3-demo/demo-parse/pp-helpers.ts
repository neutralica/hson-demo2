// import type { Fmt } from "../../../core/types/core.types";

// export const setFocusedOnly = (fmt: Fmt | null): void => {
//     for (const f of FMTS) {
//         const p = pp.panels[f];
//         const on = fmt === f;

//         p.status.css.setMany({ opacity: on ? "1" : "0" });
//     }
// };

// export const setStatus = (fmt: Fmt, kind: "idle" | "typing" | "valid" | "invalid"): void => {
//     const p = pp.panels[fmt];

//     if (kind === "idle") {
//         p.status.text.set("");
//         p.status.css.setMany({ opacity: "0" });
//         return;
//     }
//     if (kind === "typing") {
//         p.status.text.set("...");
//         p.status.css.setMany({ opacity: "1", color: "dodgerblue" });
//         return;
//     }
//     if (kind === "valid") {
//         p.status.text.set("valid");
//         p.status.css.setMany({ opacity: "1", color: "lime" });
//         return;
//     }
//     p.status.text.set("invalid");
//     p.status.css.setMany({ opacity: "1", color: "red" });
// };

// // CENTRAL: derive muting + interactivity from (active, activeIsInvalid)
// // TODO-- this is a mess 
// export const syncUiState = (): void => {
//     const hasActive = active !== null;

//     for (const f of FMTS) {
//         const p = pp.panels[f];
//         const isActive = active === f;

//         if (isActive) {
//             p.wrap.css.setMany(PP_UNMUTEDcss(f));
//             unlockTextarea(p);
//             continue;
//         }

//         if (hasActive) {
//             p.wrap.css.setMany(PP_MUTEDcss(f));
//             lockTextarea(p);
//             continue;
//         }

//         p.wrap.css.setMany(PP_MUTEDcss(f));
//         unlockTextarea(p);
//     }
// };
// export const clearOthers = (origin: Fmt): void => {
//     for (const f of FMTS) {
//         if (f === origin) continue;
//         setValue(pp.panels[f], "");
//         pp.panels[f].bytes.text.set("0 bytes");
//     }

//     return;
// };


// const encBytes = (s: string) => new TextEncoder().encode(s).length;

// const getValue = (p: PanelShell): string => p.textarea.getFormValue() ?? "";
// const setValue = (p: PanelShell, v: string): void =>
//     void p.textarea.setFormValue(v, { silent: true });

// const clearTimer = (): void => {
//     if (invalidClearTimer) clearTimeout(invalidClearTimer);
//     invalidClearTimer = null;
//     invalidOwner = null;
// };

// const scheduleClearInvalid = (fmt: Fmt): void => {
//     clearTimer();
//     invalidOwner = fmt;
//     invalidClearTimer = setTimeout(() => {
//         // only clear if it’s still invalid and still the same box that “owns” the invalid
//         if (invalidOwner !== fmt) return;
//         if (active === fmt) {
//             // if they refocused the same box and fixed it, this should not run
//             if (!activeIsInvalid) return;
//         }
//         setValue(pp.panels[fmt], "");
//         pp.panels[fmt].bytes.text.set("0 bytes");
//         // if it was unfocused already, nothing else needed
//     }, 30000);
// };


// const isJsonStringLiteral = (s: string): boolean => /^"(?:\\.|[^"\\])*"$/.test(s);
// const isScalarLiteral = (s: string): boolean =>
//     s === "null" ||
//     s === "true" ||
//     s === "false" ||
//     /^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s);

// const tryParse = (origin: Fmt, raw: string): PrimParse => {
//     const t = raw.trim();
//     if (!t) return { ok: false };

//     // Strings: JSON requires quotes; HSON we require quotes too (your rule)
//     if (isJsonStringLiteral(t)) {
//         try {
//             // JSON.parse is safe here; it produces the actual string value without quotes
//             const v = JSON.parse(t);
//             if (typeof v === "string") return { ok: true, value: v, kind: "string" };
//             return { ok: false };
//         } catch {
//             return { ok: false };
//         }
//     }