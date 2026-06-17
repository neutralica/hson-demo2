import { CssManager, LiveTree } from "hson-live";
import type { OklchChannel, OklchRig, OklchPickerModel, OklchValues, OklchTarget, OklchDemoOpts, OklchInputRig } from "./oklch.types";
import { mk_div_cls, mk_div_cls_txt, mk_div_id } from "../../../utils/makers";
import { CURRENT_OKLCHname } from "../../../core/consts/ui-consts";
import { ROOT_CSS, PANEL_CSS, ROW_CSS, RANGE_CSS, PREVIEW_CSS, TITLE_CSS, CODE_CSS, TARGET_ROW_CSS, TARGET_ROW_ACTIVE_CSS } from "./oklch.css";
import { parse_oklch} from "../../../core/helpers/color-helpers";
import { OKLCH_COLOR_TARGETS } from "./link-colors";

const gcss = CssManager.api();

const normalizeLightness = (l: number): number => {
  // CHANGED: parse_oklch() may return CSS number lightness as 0–1.
  // The picker state stores lightness as 0–100 because oklch_to_css() emits `%`.
  if (l >= 0 && l <= 1) return l * 100;
  return l;
};
const DEFAULT_OKLCH_STRING = OKLCH_COLOR_TARGETS[0]?.initial ?? "oklch(80% 0 0)";
const defOk = parse_oklch(DEFAULT_OKLCH_STRING);

const OKLCH_DEFAULT_STATE: OklchValues = Object.freeze({
  l: normalizeLightness(defOk.l),
  c: defOk.c,
  h: defOk.h,
  a: defOk.a ?? 1,
});

function stateOrDefault(value: string | undefined, fallback: OklchValues): OklchValues {
  // CHANGED: this helper accepts concrete OKLCH strings only. Do not pass
  // CssManager.api().var.get(...) here; that returns a CSS var reference such as
  // `var(--hson-color-main-text)`, not the current stored value.
  if (value === undefined) return fallback;
  if (value.trim().startsWith("var(")) return fallback;

  try {
    const parsed = parse_oklch(value);

    return normalizeOklch({
      ...parsed,
      // CHANGED: convert parsed CSS-number lightness into the picker scale.
      l: normalizeLightness(parsed.l),
      a: parsed.a ?? 1,
    });
  } catch {
    return fallback;
  }
}


function oklchFactory(stage: LiveTree, model: OklchPickerModel): OklchRig {
  const inputs: OklchInputRig[] = [];
  const channels: OklchChannel[] = ["l", "c", "h", "a"];

  const root = mk_div_cls(stage, "oklch-demo-root").css.setMany(ROOT_CSS);
  const controls = mk_div_cls(root, "oklch-demo-controls").css.setMany(PANEL_CSS);
  mk_div_cls(controls, "oklch-demo-title").css.setMany(TITLE_CSS).text.set("OKLCH color picker");
  for (const channel of channels) {
    const row = mk_div_cls_txt(controls, `oklch-row-${channel}`, channel).css.setMany(ROW_CSS);
    const input = row.create.input()
      .attr.setMany(mk_rangeAttrs(channel))
      .form.setValue(String(model.state[channel]))
      .css.setMany(RANGE_CSS);
    const value = mk_div_cls(row, `oklch-value-${channel}`);
    inputs.push({ channel, input, value });
  }

  const code = mk_div_cls(controls, "oklch-demo-code").css.setMany(CODE_CSS);
  const targetPanel = mk_div_cls(controls, "oklch-demo-targets").css.setMany({
    ...PANEL_CSS,
    maxHeight: "min(52vh, 28rem)",
    overflowY: "auto",
    overscrollBehavior: "contain",
  });

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

function oklchInit(rig: OklchRig, model: OklchPickerModel): void {
  let state = model.state;
  let activeTargetIndex = 0;

  const targetStates: OklchValues[] = model.targets.map((target) => {
    const initialState = stateOrDefault(target.initial, state);
    // CHANGED: var.value reads the stored declaration value; var.get returns
    // a CSS var(...) reference string for use inside CSS maps.
    return stateOrDefault(gcss.var.value(target.varName), initialState);
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
    renderPrev(rig, model, state);
    syncInputsToState();

    for (let i = 0; i < rig.targetRows.length; i += 1) {
      const row = rig.targetRows[i];
      const target = model.targets[i];
      if (!row || !target) continue;

      // CHANGED: the picker now treats targetStates as the local source of
      // truth. render_prev() no longer rewrites target rows separately, which
      // avoids row labels/colors being updated through two different paths.
      const targetState = getTargetState(i, state);
      const targetColor = oklchToCss(targetState);
      row.text.set(`${target.label}: ${targetColor}`);
      row.css.setMany(i === activeTargetIndex ? TARGET_ROW_ACTIVE_CSS : TARGET_ROW_CSS);
      row.css.setMany({ color: targetColor });
    }
  };

  for (const item of rig.inputs) {
    item.input.listen.onInput(() => {
      state = updateOklchState(state, item.channel, readInputValue(item.input));

      targetStates[activeTargetIndex] = state;

      const target = model.targets[activeTargetIndex];
      if (target) applyToTarget(target, state);

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
      targetStates[i] = state;

      render();
    });
  }

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

function normalizeOklch(input: OklchValues): OklchValues {
  return Object.freeze({
    l: round(clamp(input.l, 0, 100), 1),
    c: round(clamp(input.c, 0, 1), 3),
    h: round(((input.h % 360) + 360) % 360, 1),
    a: round(clamp(input.a, 0, 1), 2),
  });
}

function updateOklchState(
  prev: OklchValues,
  channel: OklchChannel,
  value: number,
): OklchValues {
  return normalizeOklch({
    ...prev,
    [channel]: value,
  });
}

function oklchToCss(state: OklchValues): string {
  const s = normalizeOklch(state);

  if (s.a >= 1) {
    return `oklch(${s.l}% ${s.c} ${s.h})`;
  }

  return `oklch(${s.l}% ${s.c} ${s.h} / ${s.a})`;
}

function makeOklchModel(targets?: readonly OklchTarget[]): OklchPickerModel {
  return Object.freeze({
    state: OKLCH_DEFAULT_STATE,
    targets: targets ?? OKLCH_COLOR_TARGETS,
  });
}

function seedTargetVars(targets: readonly OklchTarget[]): void {

  for (const target of targets) {
    const current = gcss.var.value(target.varName);
    if (current !== undefined) continue;
    if (target.initial === undefined) continue;

    // CHANGED: seed only missing vars. var.value reads the stored value;
    // var.get returns a reusable CSS reference and is never undefined.
    gcss.var.set(target.varName, target.initial);
  }
}

export function mount_oklch(stage: LiveTree, opts: OklchDemoOpts = {}): void {
  const model = makeOklchModel(opts.targets);
  seedTargetVars(model.targets);
  const rig = oklchFactory(stage, model);

  // CHANGED: oklch_init() now chooses the first target's actual current color
  // before first render, so mount should not write the fallback model state into
  // CURRENT_OKLCH here.
  oklchInit(rig, model);
}


const mk_rangeAttrs = (channel: OklchChannel): Record<string, string> => {
  if (channel === "l") return { type: "range", min: "0", max: "100", step: "0.1" };
  if (channel === "c") return { type: "range", min: "0", max: "1", step: "0.001" };
  if (channel === "h") return { type: "range", min: "0", max: "360", step: "0.1" };
  return { type: "range", min: "0", max: "1", step: "0.01" };
};

const readInputValue = (input: LiveTree): number => {
  return Number(input.form.getValue());
};
const writeInputValue = (input: LiveTree, n: number): void => {
  input.form.setValue(String(n));

};

const renderPrev = (rig: OklchRig, model: OklchPickerModel, state: OklchValues): void => {
  const value = oklchToCss(state);


  gcss.var.set(CURRENT_OKLCHname, value);
  rig.code.text.set(value);

  for (const item of rig.inputs) {
    const n = state[item.channel];
    writeInputValue(item.input, n);
    item.value.text.set(String(n));
  }
};

const applyToTarget = (target: OklchTarget, state: OklchValues): void => {
  gcss.var.set(target.varName, oklchToCss(state));
};
