// init.pp.ts
import { hson } from "hson-live";
import type { LiveTree } from "hson-live";
import type { Panels, PanelParts, Fmt } from "./pp.types";

const FMTS: readonly Fmt[] = ["json", "hson", "html"] as const;

type MarkOpts = { valid?: boolean; bytes?: number };

export function init_parsing_panels(pp: Panels): void {
  let inProgress = false;

  const encBytes = (s: string) => new TextEncoder().encode(s).length;

  const getValue = (p: PanelParts): string => p.textarea.getFormValue() ?? "";
  const setValue = (p: PanelParts, v: string): void =>
    void p.textarea.setFormValue(v, { silent: true });

  const compactJSON = (raw: string): string => {
    try {
      return JSON.stringify(JSON.parse(raw));
    } catch {
      return raw.replace(/\s+/g, " ").trim();
    }
  };

  const compactLoose = (raw: string): string => raw.replace(/\s+/g, " ").trim();

  const markPanel = (p: PanelParts, opts: MarkOpts): void => {
    if (opts.valid !== undefined) {
      p.chip
        .setAttrs("data-valid", String(opts.valid))
        .setText(opts.valid ? "valid" : "invalid");
    }
    if (opts.bytes !== undefined) {
      p.bytes.setText(`${opts.bytes} bytes`);
    }
  };

  const update = (origin: Fmt): void => {
    if (inProgress) return;
    inProgress = true;

    const srcParts = pp.panels[origin];
    const src = getValue(srcParts);
    const bytesNow = encBytes(src);

    // Empty: mark origin invalid; do not overwrite others
    if (src.trim().length === 0) {
      markPanel(srcParts, { valid: false, bytes: bytesNow });
      inProgress = false;
      return;
    }

    try {
      const t =
        origin === "json"
          ? hson.fromJson(src)
          : origin === "hson"
            ? hson.fromHson(src)
            : hson.fromTrustedHtml(src);

      markPanel(srcParts, { valid: true, bytes: bytesNow });

      if (origin !== "json") {
        const outJ = t.toJson().serialize();
        setValue(pp.panels.json, outJ);
        markPanel(pp.panels.json, { valid: true, bytes: encBytes(outJ) });
      }

      if (origin !== "hson") {
        const outH = t.toHson().serialize();
        setValue(pp.panels.hson, outH);
        markPanel(pp.panels.hson, { valid: true, bytes: encBytes(outH) });
      }

      if (origin !== "html") {
        const outX = t.toHtml().serialize();
        setValue(pp.panels.html, outX);
        markPanel(pp.panels.html, { valid: true, bytes: encBytes(outX) });
      }
    } catch {
      markPanel(srcParts, { valid: false, bytes: bytesNow });
    } finally {
      inProgress = false;
    }
  };

  // --- wire inputs ---
  for (const fmt of FMTS) {
    const parts = pp.panels[fmt];
    parts.textarea.listen.on("input", () => update(fmt));
  }

  // --- wire copy buttons ---
  for (const fmt of FMTS) {
    const parts = pp.panels[fmt];

    parts.copyBtn.listen.onClick(() => {
      const raw = getValue(parts);
      const txt = fmt === "json" ? compactJSON(raw) : compactLoose(raw);

      const prev = parts.copyBtn.getText() ?? "copy";
      parts.copyBtn.setAttrs("data-busy", "true").setText("copied");

      void navigator.clipboard?.writeText(txt).finally(() => {
        setTimeout(() => {
          parts.copyBtn.setAttrs("data-busy", "false").setText(prev);
        }, 800);
      });
    });
  }

  // --- initial state ---
  for (const fmt of FMTS) {
    const parts = pp.panels[fmt];
    markPanel(parts, { valid: false, bytes: encBytes(getValue(parts)) });
  }

  // --- optional initial normalize ---
  for (const fmt of FMTS) {
    const v = getValue(pp.panels[fmt]);
    if (v.trim().length) {
      update(fmt);
      break;
    }
  }
}