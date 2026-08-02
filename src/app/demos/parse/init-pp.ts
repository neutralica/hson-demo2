import { hson } from "hson-live";
import type { HsonNode } from "hson-live/types";
import { _colors } from "../../core/consts/colors.consts";
import type { Fmt } from "../../core/types/core.types";
import type { PanelShell, Panels } from "../../ui/panels/panels.types";
import { certify_browser_circuit_boundary, type BrowserCircuitAdmission } from "./browser-circuit-certificate";
import { create_browser_circuit_verification_transport } from "./circuit-verification-browser-transport";
import {
  create_parsing_verification_coordinator,
  type ParsingVerificationCoordinator,
  type ParsingVerificationCoordinatorOptions,
  type ParsingVerificationFailure,
  type ParsingVerificationState,
  type ParsingVerificationTransport,
} from "./parsing-verification-coordinator";
import { PP_ACTIVE_INVALIDcss, PP_ACTIVE_VALIDcss, PP_INACTIVE_VALIDcss, PP_IDLEcss } from "./pp.css";

const INVALID_SOURCE_RETENTION_MS = 30_000;
let parsingPanelInstance = 0;

const encBytes = (source: string): number => new TextEncoder().encode(source).length;
const getValue = (panel: PanelShell): string => panel.textarea.form.getValue() ?? "";
const setValue = (panel: PanelShell, value: string): void => {
  void panel.textarea.form.setValue(value, { silent: true });
};

export type ParsingPanelsController = Readonly<{
  verification: ParsingVerificationCoordinator;
  dispose(): void;
}>;

export type ParsingPanelsInitOptions = Readonly<{
  panelId?: string;
  debounceMs?: number;
  scheduler?: ParsingVerificationCoordinatorOptions<BrowserCircuitAdmission>["scheduler"];
  transport?: ParsingVerificationTransport;
  certify?: ParsingVerificationCoordinatorOptions<BrowserCircuitAdmission>["certify"];
}>;

function make_panel_id(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid !== undefined) return `parsing-panel-${uuid}`;
  parsingPanelInstance += 1;
  return `parsing-panel-${Date.now().toString(36)}-${parsingPanelInstance.toString(36)}`;
}

function immediate_failure(entry: Fmt, error?: unknown): ParsingVerificationFailure {
  const candidate = error as { code?: unknown };
  const parserCode = typeof candidate?.code === "string" && candidate.code.length <= 64
    ? candidate.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
    : undefined;
  return Object.freeze({
    category: "immediate",
    code: parserCode === undefined ? "IMMEDIATE_PARSE_FAILED" : `IMMEDIATE_${parserCode}`,
    message: `${entry.toUpperCase()} source could not be admitted by the browser Transform facade.`,
    stage: "immediate-admission",
  });
}

function state_label(state: ParsingVerificationState): string {
  if (state.status === "idle") return "--";
  if (state.status === "invalid") return "Invalid";
  if (state.status === "parsed") return "Parsed · waiting";
  if (state.status === "queued") return "Queued";
  if (state.status === "verifying") {
    const completed = Math.min(6, state.progress?.completed ?? 0);
    return `Verifying ${completed}/6`;
  }
  if (state.status === "browser-check") return "Checking browser";
  if (state.status === "verified") return "Verified";
  if (state.status === "failed") return "Verification failed";
  return "Verification unavailable";
}

function state_failure(state: ParsingVerificationState): ParsingVerificationFailure | undefined {
  if (state.status === "invalid") return state.diagnostic;
  if (state.status === "failed" || state.status === "unavailable") return state.failure;
  return undefined;
}

export function init_parsing_panels(
  pp: Panels,
  options: ParsingPanelsInitOptions = {},
): ParsingPanelsController {
  const formats = Object.keys(pp.panels) as readonly Fmt[];
  let active: Fmt | null = null;
  let invalidOwner: Fmt | null = null;
  let invalidClearTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  function clear_invalid_timer(): void {
    if (invalidClearTimer === undefined) return;
    clearTimeout(invalidClearTimer);
    invalidClearTimer = undefined;
  }

  function setPanelValueAndBytes(format: Fmt, value: string): void {
    setValue(pp.panels[format], value);
    pp.panels[format].bytes.text.set(`${encBytes(value)}`);
  }

  function setNodeViewForAll(node: HsonNode): void {
    const nodeText = JSON.stringify(node, null, 2);
    for (const format of formats) pp.panels[format].nodeText.text.set(nodeText);
  }

  function admit(entry: Fmt, source: string) {
    if (source.trim().length === 0) return Object.freeze({ ok: false as const, diagnostic: immediate_failure(entry) });
    try {
      const transformed = entry === "json"
        ? hson.fromJson(source)
        : entry === "hson"
          ? hson.fromHson(source)
          : hson.fromTrustedHtml(source);
      let node = transformed.toNode();
      let derivedHson: string | undefined;
      if (entry !== "hson") {
        derivedHson = transformed.toHson().serialize();
        node = hson.fromHson(derivedHson).toNode();
      }
      if (entry !== "json") setPanelValueAndBytes("json", transformed.toJson().serialize());
      if (entry !== "hson") setPanelValueAndBytes("hson", derivedHson ?? transformed.toHson().serialize());
      if (entry !== "html") setPanelValueAndBytes("html", transformed.toHtml().serialize());
      setNodeViewForAll(node);
      invalidOwner = null;
      clear_invalid_timer();
      return Object.freeze({ ok: true as const, admission: Object.freeze({ node }) });
    } catch (error) {
      invalidOwner = entry;
      return Object.freeze({ ok: false as const, diagnostic: immediate_failure(entry, error) });
    }
  }

  function render(state: ParsingVerificationState): void {
    if (disposed) return;
    const origin = state.status === "idle" ? undefined : state.entry;
    const label = state_label(state);
    const failure = state_failure(state);
    pp.root.data.set("verification-status", state.status);
    pp.root.attrs.set("data-verification-revision", state.status === "idle" ? "0" : `${state.inputRevision}`);
    if (origin === undefined) pp.root.attrs.drop("data-verification-origin");
    else pp.root.attrs.set("data-verification-origin", origin);
    if (state.status === "verified") {
      pp.root.attrs.setMany({
        "data-worker-duration-ms": `${state.certificate.workerDurationMs}`,
        "data-browser-check-duration-ms": `${state.certificate.browserCheckDurationMs}`,
        "data-circuit-serializations": `${state.certificate.operationCounts.serializations}`,
        "data-circuit-parses": `${state.certificate.operationCounts.parses}`,
        "data-circuit-comparisons": `${state.certificate.operationCounts.comparisons}`,
      });
    } else {
      pp.root.attrs.drop("data-worker-duration-ms");
      pp.root.attrs.drop("data-browser-check-duration-ms");
      pp.root.attrs.drop("data-circuit-serializations");
      pp.root.attrs.drop("data-circuit-parses");
      pp.root.attrs.drop("data-circuit-comparisons");
    }
    for (const format of formats) {
      const panel = pp.panels[format];
      const ownsState = origin === format;
      panel.status.text.set(ownsState ? label : "--");
      panel.status.attrs.setMany({
        "aria-label": ownsState ? label : `${format.toUpperCase()} has no authored verification state`,
        "data-verification-status": ownsState ? state.status : "derived",
        "data-verification-revision": ownsState && state.status !== "idle" ? `${state.inputRevision}` : "0",
        "title": ownsState && failure !== undefined ? failure.message : "",
      });
      panel.status.css.setMany({
        opacity: ownsState ? "1" : "0",
        color: state.status === "verified"
          ? _colors.hson.n
          : state.status === "failed" || state.status === "invalid"
            ? "red"
            : state.status === "unavailable"
              ? _colors.yellowlike
              : _colors.txt.code,
      });

      if (origin === format && state.status === "invalid") {
        panel.textBox.css.setMany(PP_ACTIVE_INVALIDcss(format));
        panel.wmFmt.style.set.color("transparent");
      } else if (origin === format) {
        panel.textBox.css.setMany(PP_ACTIVE_VALIDcss(format));
        panel.wmFmt.style.set.color("transparent");
      } else if (origin !== undefined) {
        panel.textBox.css.setMany(PP_INACTIVE_VALIDcss(format));
        panel.wmFmt.style.set.color("transparent");
      } else {
        panel.textBox.css.setMany(PP_IDLEcss(format));
        panel.wmFmt.style.set.color(_colors.txt.grey);
      }

      // All three explicit origins remain editable. Silent derived writes do
      // not dispatch input events, so editability does not create update loops.
      panel.textarea.flags.clear("readonly");
      panel.textarea.css.setMany({ pointerEvents: "auto", userSelect: "text", caretColor: "auto" });
    }
  }

  const transport = options.transport ?? create_browser_circuit_verification_transport();
  const verification = create_parsing_verification_coordinator<BrowserCircuitAdmission>({
    panelId: options.panelId ?? make_panel_id(),
    ...(options.debounceMs === undefined ? {} : { debounceMs: options.debounceMs }),
    ...(options.scheduler === undefined ? {} : { scheduler: options.scheduler }),
    transport,
    admit,
    certify: options.certify ?? ((input) => certify_browser_circuit_boundary(input)),
    onState: render,
  });

  function handleFocus(format: Fmt): void {
    if (disposed) return;
    active = format;
    clear_invalid_timer();
  }

  function handleInput(format: Fmt): void {
    if (disposed) return;
    active = format;
    const source = getValue(pp.panels[format]);
    pp.panels[format].bytes.text.set(`${encBytes(source)}`);
    verification.edit(format, source);
  }

  function handleBlur(format: Fmt): void {
    if (disposed || active !== format) return;
    active = null;
    verification.flush();
    if (invalidOwner !== format) return;
    clear_invalid_timer();
    invalidClearTimer = setTimeout(() => {
      if (disposed || invalidOwner !== format) return;
      setValue(pp.panels[format], "");
      pp.panels[format].bytes.text.set("0");
      invalidOwner = null;
      invalidClearTimer = undefined;
    }, INVALID_SOURCE_RETENTION_MS);
  }

  for (const format of formats) {
    const panel = pp.panels[format];
    panel.textarea.listen.onFocus(() => handleFocus(format));
    panel.textarea.listen.onBlur(() => handleBlur(format));
    panel.textarea.listen.onInput(() => handleInput(format));
    panel.bytes.text.set(`${encBytes(getValue(panel))}`);
  }
  render(verification.snapshot());

  return Object.freeze({
    verification,
    dispose() {
      if (disposed) return;
      disposed = true;
      clear_invalid_timer();
      verification.dispose();
      pp.root.data.set("verification-status", "disposed");
    },
  });
}
