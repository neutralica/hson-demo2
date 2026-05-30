import { CssManager, LiveTree } from "hson-live";
import type { OklchChannel, OklchRig, OklchPickerModel, OklchValues, OklchTarget, OklchDemoOpts, OklchInputRig } from "./oklch.types";
import { mk_div_cls, mk_div_cls_txt, mk_div_id } from "../../../utils/makers";
import {  TXTcol_MENU, TXTcol_CODE, TXTcol_ACTIVE, MAIN_OKLCHname, MENU_OKLCHname, SUBMENU_OKLCHname, BACK_OKLCHname } from "../../../core/consts/ui-consts";
import { ROOT_CSS, PANEL_CSS, ROW_CSS, RANGE_CSS, PREVIEW_CSS, TITLE_CSS, CODE_CSS, TARGET_ROW_CSS, TARGET_ROW_ACTIVE_CSS } from "./oklch.css";
import { make_range_attrs, render_prev, read_input_number, apply_to_target } from "./oklch";
import { parse_oklch } from "../../../core/helpers/color-helpers";
import { OKLCH_NEUTRALS, OKLCH_VIBRANT } from "../../../core/consts/oklch";


const normalize_parsed_lightness = (l: number): number => {
  // CHANGED: parse_oklch() may return CSS number lightness as 0–1.
  // The picker state stores lightness as 0–100 because oklch_to_css() emits `%`.
  if (l >= 0 && l <= 1) return l * 100;
  return l;
};
const defOk = parse_oklch(TXTcol_MENU);

export const OKLCH_DEFAULT_STATE: OklchValues = Object.freeze({
  l: normalize_parsed_lightness(defOk.l),
  c: defOk.c,
  h: defOk.h,
  a: defOk.a ?? 1,
});

function parsed_state_or_default(value: string | undefined, fallback: OklchValues): OklchValues {
  // CHANGED: this helper accepts concrete OKLCH strings only. Do not pass
  // CssManager.api().var.get(...) here; that returns a CSS var reference such as
  // `var(--hson-color-main-text)`, not the current stored value.
  if (value === undefined) return fallback;
  if (value.trim().startsWith("var(")) return fallback;

  try {
    const parsed = parse_oklch(value);

    return normalize_oklch_state({
      ...parsed,
      // CHANGED: convert parsed CSS-number lightness into the picker scale.
      l: normalize_parsed_lightness(parsed.l),
      a: parsed.a ?? 1,
    });
  } catch {
    return fallback;
  }
}


export function oklch_factory(stage: LiveTree, model: OklchPickerModel): OklchRig {
  const inputs: OklchInputRig[] = [];
  const channels: OklchChannel[] = ["l", "c", "h", "a"];

  const root = mk_div_cls(stage, "oklch-demo-root").css.setMany(ROOT_CSS);
  const controls = mk_div_cls(root, "oklch-demo-controls").css.setMany(PANEL_CSS);
  mk_div_cls(controls, "oklch-demo-title").css.setMany(TITLE_CSS).text.set("OKLCH color picker");
  for (const channel of channels) {
    console.log(">>>> model.state[channel]")
    console.log(model.state[channel])
    const row = mk_div_cls_txt(controls, `oklch-row-${channel}`, channel).css.setMany(ROW_CSS);
    const input = row.create.input()
      .attr.setMany(make_range_attrs(channel))
      .form.setValue(String(model.state[channel]))
      .css.setMany(RANGE_CSS);
    const value = mk_div_cls(row, `oklch-value-${channel}`);
    inputs.push({ channel, input, value });
  }

  const code = mk_div_cls(controls, "oklch-demo-code").css.setMany(CODE_CSS);
  const targetPanel = mk_div_cls(controls, "oklch-demo-targets").css.setMany(PANEL_CSS);

  const targetRows = model.targets.map((target) => {
    const row = mk_div_cls_txt(targetPanel, "oklch-demo-target-row", target.label)
      .attr.set("role", "button")
      .css.setMany(TARGET_ROW_CSS);
    return row;
  });
  const previewPanel = mk_div_cls(root, "oklch-demo-preview-panel").css.setMany(PANEL_CSS);
  const preview = mk_div_cls(previewPanel, "oklch-demo-preview").css.setMany(PREVIEW_CSS);

  return Object.freeze({ root, preview, code, inputs, targetRows });
}

export function oklch_init(rig: OklchRig, model: OklchPickerModel): void {
  let state = model.state;
  let activeTargetIndex = 0;

  const targetStates: OklchValues[] = model.targets.map((target) => {
    const initialState = parsed_state_or_default(target.initial, state);
    // CHANGED: var.value reads the stored declaration value; var.get returns
    // a CSS var(...) reference string for use inside CSS maps.
    return parsed_state_or_default(CssManager.api().var.value(target.varName), initialState);
  });

  const getTargetState = (index: number, fallback: OklchValues): OklchValues => {
    // CHANGED: maintain a local state slot per target. This keeps target
    // selection from collapsing back into the shared CURRENT_OKLCH preview var
    // when a theme var is unset or not parseable as direct OKLCH.
    return targetStates[index] ?? fallback;
  };

  // CHANGED: initial render should adopt the first editable target's current
  // color when available. Otherwise render_prev() writes the fallback model state
  // into CURRENT_OKLCH, which can make the picker open as black.
  state = getTargetState(activeTargetIndex, state);
  targetStates[activeTargetIndex] = state;

  const syncInputsToState = (): void => {
    // CHANGED: selecting a target should pull that color into both the preview
    // and the slider/value controls.
    for (const item of rig.inputs) {
      const value = state[item.channel];
      item.input.form.setValue(String(value));
      item.value.text.set(String(value));
    }
  };

  const render = (): void => {
    render_prev(rig, model, state);
    syncInputsToState();

    for (let i = 0; i < rig.targetRows.length; i += 1) {
      const row = rig.targetRows[i];
      if (!row) continue;
      const target = model.targets[i];
      // CHANGED: row labels should display the resolved target color, not the
      // shared CURRENT_OKLCH preview var.
      const targetColor = target ? CssManager.api().var.value(target.varName) : undefined;
      row.css.setMany(i === activeTargetIndex ? TARGET_ROW_ACTIVE_CSS : TARGET_ROW_CSS);
      if (targetColor !== undefined) row.css.setMany({ color: targetColor });
    }
  };

  for (const item of rig.inputs) {
    item.input.listen.onInput(() => {
      state = update_oklch_state(state, item.channel, read_input_number(item.input));

      targetStates[activeTargetIndex] = state;

      const target = model.targets[activeTargetIndex];
      if (target) apply_to_target(target, state);

      render();
    });
  }

  for (let i = 0; i < model.targets.length; i += 1) {
    const target = model.targets[i];
    const row = rig.targetRows[i];
    if (!row) continue;

    row.listen.onClick(() => {
      activeTargetIndex = i;

      state = getTargetState(i, state);
      CssManager.api().var.set(MENU_OKLCHname, oklch_to_css(state));

      render();
    });
  }
  rig.root.listen.document.onKeyDown((ke: KeyboardEvent) => {
    if (ke.key === "Escape")
      rig.root.removeSelf();
  })
  render();
}

const clamp = (n: number, min: number, max: number): number => {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
};

const round = (n: number, places: number): number => {
  const p = 10 ** places;
  return Math.round(n * p) / p;
};

export function normalize_oklch_state(input: OklchValues): OklchValues {
  return Object.freeze({
    l: round(clamp(input.l, 0, 100), 1),
    c: round(clamp(input.c, 0, 1), 3),
    h: round(((input.h % 360) + 360) % 360, 1),
    a: round(clamp(input.a, 0, 1), 2),
  });
}

export function update_oklch_state(
  prev: OklchValues,
  channel: OklchChannel,
  value: number,
): OklchValues {
  return normalize_oklch_state({
    ...prev,
    [channel]: value,
  });
}

export function oklch_to_css(state: OklchValues): string {
  const s = normalize_oklch_state(state);

  if (s.a >= 1) {
    return `oklch(${s.l}% ${s.c} ${s.h})`;
  }

  return `oklch(${s.l}% ${s.c} ${s.h} / ${s.a})`;
}

export function make_oklch_model(targets?: readonly OklchTarget[]): OklchPickerModel {
  return Object.freeze({
    state: OKLCH_DEFAULT_STATE,
    targets: targets ?? [
      { label: "main text", varName: MAIN_OKLCHname, initial: TXTcol_CODE },
      { label: "menu text", varName: MENU_OKLCHname, initial: TXTcol_MENU },
      { label: "submenu text", varName: SUBMENU_OKLCHname, initial: TXTcol_ACTIVE },
      { label: "panel back", varName: BACK_OKLCHname, initial: OKLCH_NEUTRALS.violetTint },
    ],
  });
}

function seed_target_vars(targets: readonly OklchTarget[]): void {
  const css = CssManager.api();

  for (const target of targets) {
    const current = css.var.value(target.varName);
    if (current !== undefined) continue;
    if (target.initial === undefined) continue;

    // CHANGED: seed only missing vars. var.value reads the stored value;
    // var.get returns a reusable CSS reference and is never undefined.
    css.var.set(target.varName, target.initial);
  }
}

export function mount_oklch(stage: LiveTree, opts: OklchDemoOpts = {}): void {
  const model = make_oklch_model(opts.targets);
  seed_target_vars(model.targets);
  const rig = oklch_factory(stage, model);

  // CHANGED: oklch_init() now chooses the first target's actual current color
  // before first render, so mount should not write the fallback model state into
  // CURRENT_OKLCH here.
  oklch_init(rig, model);
}