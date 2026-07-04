import { CssManager, LiveTree, hson } from "hson-live";
import { _colors } from "../../core/consts/colors.consts";
import { OKLCH_NEUTRALS } from "../../core/consts/oklch.consts";
import { CURRENT_OKLCHname } from "../../core/consts/ui-consts";
import { parse_oklch } from "../../core/helpers/color-helpers";
import { mk_div_cls, mk_div_cls_txt } from "../../utils/makers";
import { OKLCH_COLOR_TARGETS } from "./link-colors";
import { ROOT_CSS, PANEL_CSS, TITLE_CSS, ROW_CSS, RANGE_CSS, PREVIEW_PANEL_CSS, PREVIEW_CSS, RESET_CSS, TARGET_ROW_CSS, TARGET_ROW_ACTIVE_CSS } from "./oklch.css";
import type { OklchRig, OklchValues, OklchPickerModel, OklchInputRig, OklchChannel, OklchTarget, OklchDemoOpts } from "./oklch.types";


const gcss = CssManager.api();

type OklchRigWithReset = OklchRig & Readonly<{
  resetBtn: LiveTree;
}>;

type OklchToken = Readonly<{
  path: string;
  initial: string;
  value: string;
}>;

type OklchLocalState = Readonly<{
  current: OklchValues;
  activePath: string | null;
  tokens: Record<string, OklchToken>;
}>;

function makeInitialOklchLocalState(model: OklchPickerModel): OklchLocalState {
  const tokens: Record<string, OklchToken> = {};

  for (const target of model.targets) {
    tokens[target.path] = Object.freeze({
      path: target.path,
      initial: target.initial,
      value: target.initial,
    });
  }

  return Object.freeze({
    current: model.state,
    activePath: model.targets[0]?.path ?? null,
    tokens,
  });
}

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


function oklchFactory(stage: LiveTree, model: OklchPickerModel): OklchRigWithReset {
  const inputs: OklchInputRig[] = [];
  const channels: OklchChannel[] = ["l", "c", "h", "a"];

  const root = mk_div_cls(stage, "oklch-demo-root").css.setMany(ROOT_CSS);
  const controls = mk_div_cls(root, "oklch-demo-controls").css.setMany(PANEL_CSS);
  const code = mk_div_cls(controls, "oklch-demo-title")
    .attr.set("role", "button")
    .css.setMany({
      ...TITLE_CSS,
      cursor: "copy",
    });
  for (const channel of channels) {
    const row = mk_div_cls_txt(controls, `oklch-row-${channel}`, channel).css.setMany(ROW_CSS);
    const input = row.create.input()
      .attr.setMany(mk_rangeAttrs(channel))
      .form.setValue(String(model.state[channel]))
      .css.setMany(RANGE_CSS);
    const value = mk_div_cls(row, `oklch-value-${channel}`);
    inputs.push({ channel, input, value });
  }

  const previewPanel = mk_div_cls(root, "oklch-demo-preview-panel").css.setMany(PREVIEW_PANEL_CSS);
  const preview = mk_div_cls(previewPanel, "oklch-demo-preview").css.setMany(PREVIEW_CSS);
  const resetBtn = mk_div_cls_txt(previewPanel, "oklch-demo-factory", "[reset]")
    .attr.set("role", "button")
    .css.setMany(RESET_CSS);
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

  return Object.freeze({ root, preview, code, inputs, targetRows, resetBtn });
}

function oklchInit(rig: OklchRigWithReset, model: OklchPickerModel): void {
  const stateMap = hson.liveMap.fromJson(makeInitialOklchLocalState(model));
  const storedActivePath = stateMap.at(["activePath"]).snap() as string | null;
  const storedActiveIndex = storedActivePath === null
    ? -1
    : model.targets.findIndex((target) => target.path === storedActivePath);
  let activeTargetIndex = storedActiveIndex >= 0 ? storedActiveIndex : 0;

  const readCurrentState = (): OklchValues => stateMap.at(["current"]).snap() as OklchValues;
  const writeCurrentState = (next: OklchValues): void => {
    stateMap.at(["current"]).set(next);
  };

  const getToken = (path: string): OklchToken | undefined => {
    return stateMap.at(["tokens", path]).snap() as OklchToken | undefined;
  };

  const getTokenValue = (path: string): string | undefined => getToken(path)?.value;

  const setTokenValue = (path: string, value: string): void => {
    const token = getToken(path);
    if (!token) return;

    stateMap.at(["tokens", path]).set({
      ...token,
      value,
    });
  };

  const isTokenChanged = (path: string): boolean => {
    const token = getToken(path);
    return !!token && token.value !== token.initial;
  };

  const resetTokenValues = (): void => {
    const tokens = stateMap.at(["tokens"]).snap() as Record<string, OklchToken>;
    const nextTokens: Record<string, OklchToken> = {};

    for (const token of Object.values(tokens)) {
      nextTokens[token.path] = {
        ...token,
        value: token.initial,
      };
    }

    stateMap.at(["tokens"]).set(nextTokens);
  };

  const getTargetState = (index: number, fallback: OklchValues): OklchValues => {
    const target = model.targets[index];
    if (!target) return fallback;

    const targetDefault = stateOrDefault(target.initial, fallback);
    return stateOrDefault(getTokenValue(target.path), targetDefault);
  };

  const getCurrentState = (): OklchValues => readCurrentState();

  writeCurrentState(getTargetState(activeTargetIndex, OKLCH_DEFAULT_STATE));

  const activeTarget = model.targets[activeTargetIndex];
  if (activeTarget) stateMap.at(["activePath"]).set(activeTarget.path);

  const syncInputsToState = (): void => {
    const state = getCurrentState();
    // CHANGED: selecting a target should pull that color into both the preview
    // and the slider/value controls.
    for (const item of rig.inputs) {
      const value = state[item.channel];
      item.input.form.setValue(String(value));
      item.value.text.set(String(value));
    }
  };

  const persistActiveState = (): void => {
    const target = model.targets[activeTargetIndex];
    if (!target) return;
    const state = readCurrentState();

    const value = oklchToCss(state);
    setTokenValue(target.path, value);
    applyToTarget(target, value);
  };

  const render = (): void => {
    const state = getCurrentState();
    renderPrev(rig, model, state);
    syncInputsToState();

    const changedCount = model.targets.filter((target) => isTokenChanged(target.path)).length;
    rig.resetBtn.text.set(changedCount > 0 ? `[reset ${changedCount}]` : "reset");
    rig.resetBtn.style.set.color(changedCount > 0 ? _colors.hson.n : OKLCH_NEUTRALS.slate);
    const labelWidth = Math.max(...model.targets.map((target) => target.label.length), 0) + 2;
    for (let i = 0; i < rig.targetRows.length; i += 1) {
      const row = rig.targetRows[i];
      const target = model.targets[i];
      if (!row || !target) continue;

      // CHANGED: each row renders from its own store token. Never use the
      // currently selected state as a row fallback, or target rows visually
      // collapse into the active color while moving through the list.
      const targetState = i === activeTargetIndex
        ? state
        : getTargetState(i, OKLCH_DEFAULT_STATE);
      const targetColor = oklchToCss(targetState);
      const changed = isTokenChanged(target.path);
      row.text.set(`${target.label.padEnd(labelWidth, " ")}${targetColor}`);
      row.attr.set("title", targetColor);
      row.css.setMany(i === activeTargetIndex ? TARGET_ROW_ACTIVE_CSS : TARGET_ROW_CSS);
      row.css.setMany(changed
        ? {
          textDecorationLine: "underline",
          textDecorationStyle: "wavy",
          textDecorationThickness: "0.08em",
          textUnderlineOffset: "0.18em",
        }
        : { textDecorationLine: "none" });
      row.css.setMany({
        whiteSpace: "pre",
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum"',
        color: i === activeTargetIndex ? _colors.txt.menu : _colors.txt.main,
        boxShadow: `inset 0.45rem 0 0 ${targetColor}`,
        paddingLeft: "0.85rem",
      });
    }
  };

  for (const item of rig.inputs) {
    item.input.listen.onInput(() => {
      writeCurrentState(updateOklchState(readCurrentState(), item.channel, readInputValue(item.input)));

      persistActiveState();
      render();
    });
  }

  for (let i = 0; i < model.targets.length; i += 1) {
    const target = model.targets[i];
    const row = rig.targetRows[i];
    if (!row || !target) continue;

    row.listen.onClick(() => {
      activeTargetIndex = i;
      stateMap.at(["activePath"]).set(target.path);
      writeCurrentState(getTargetState(i, OKLCH_DEFAULT_STATE));

      render();
    });
  }

  rig.code.listen.onClick(() => {
    const write = navigator.clipboard?.writeText(oklchToCss(getCurrentState()));
    if (write) void write.catch(() => undefined);
  });

  rig.resetBtn.listen.onClick(() => {
    resetTokenValues();

    for (const target of model.targets) {
      applyToTarget(target, getTokenValue(target.path) ?? target.initial);
    }

    writeCurrentState(getTargetState(activeTargetIndex, OKLCH_DEFAULT_STATE));
    render();
  });

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
    applyToTarget(target);
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
  rig.code.text.set(`[${value}]`);
  rig.code.attr.set("title", `copy ${value}`);

  for (const item of rig.inputs) {
    const n = state[item.channel];
    writeInputValue(item.input, n);
    item.value.text.set(String(n));
  }
};

const applyToTarget = (target: OklchTarget, value: string = target.initial): void => {
  gcss.var.set(target.varName, value);
};
