import { CssManager, LiveTree } from "hson-live";
import type { OklchChannel, OklchRig, OklchPickerModel, OklchValues, OklchTarget, OklchDemoOpts, OklchInputRig } from "./oklch.types";
import { mk_div_cls, mk_div_cls_txt, mk_div_id } from "../../../utils/makers";
import { TXTcol_ALT } from "../../../core/consts/ui-consts";
import { ROOT_CSS, PANEL_CSS, ROW_CSS, RANGE_CSS, PREVIEW_CSS } from "./oklch.css";
import { make_range_attrs, render_prev, read_input_number, apply_to_target } from "./oklch";


export const OKLCH_DEFAULT_STATE: OklchValues = Object.freeze({
  l: 82,
  c: 0.055,
  h: 82,
  a: 1,
});

export function oklch_factory(stage: LiveTree, model: OklchPickerModel): OklchRig {
  const inputs: OklchInputRig[] = [];
  const channels: OklchChannel[] = ["l", "c", "h", "a"];

  const root = mk_div_cls(stage, "oklch-demo-root").css.setMany(ROOT_CSS);
  const controls = mk_div_cls(root, "oklch-demo-controls").css.setMany(PANEL_CSS);
  mk_div_cls(controls, "oklch-demo-title").text.set("OKLCH color picker");
  for (const channel of channels) {
    const row = mk_div_cls_txt(controls, `oklch-row-${channel}`, channel).css.setMany(ROW_CSS);
    // changed: make the native range input less stock before pseudo-track styling is added globally.
    const input = row.create.input()
      .attr.setMany(make_range_attrs(channel))
      .css.setMany(RANGE_CSS);
    const value = mk_div_cls(row, `oklch-value-${channel}`);
    inputs.push({ channel, input, value });
  }

  const code = mk_div_cls(controls, "oklch-demo-code");
  const targetPanel = mk_div_cls(controls, "oklch-demo-targets").css.setMany(PANEL_CSS);

  const targetRows = model.targets.map((target) => {
    const row = mk_div_cls_txt(targetPanel, "oklch-demo-target-row", target.label).attr.set("role", "button")
    return row;
  });
  const previewPanel = mk_div_cls(root, "oklch-demo-preview-panel").css.setMany(PANEL_CSS);
  const preview = mk_div_cls(previewPanel, "oklch-demo-preview").css.setMany(PREVIEW_CSS);

  mk_div_id(root, "test-div").css.setMany({
    position: "absolute",
    top: "0",
    left: "0",
    height: "100%",
    width: "100%",
    zIndex: "100",
  });

  return Object.freeze({ root, preview, code, inputs, targetRows });
}

export function oklch_init(rig: OklchRig, model: OklchPickerModel): void {
  let state = model.state;

  const render = (): void => render_prev(rig, model, state);

  for (const item of rig.inputs) {
    item.input.listen.onInput(() => {
      state = update_oklch_state(state, item.channel, read_input_number(item.input));
      render();
    });
  }

  for (let i = 0; i < model.targets.length; i += 1) {
    const target = model.targets[i];
    const row = rig.targetRows[i];
    if (!row) continue;

    row.listen.onClick(() => {
      apply_to_target(target!, state);
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
      { label: "main text", varName: "hson-color-main-text" },
      { label: "menu text", varName: "hson-color-menu-text" },
      { label: "active text", varName: "hson-color-active-text" },
      { label: "panel back", varName: "hson-color-panel-back" },
    ],
  });
}


export function mount_oklch(stage: LiveTree, opts: OklchDemoOpts = {}): void {

  const model = make_oklch_model(opts.targets);
  const rig = oklch_factory(stage, model);
  oklch_init(rig, model);
}