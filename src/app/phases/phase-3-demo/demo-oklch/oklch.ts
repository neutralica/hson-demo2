import { LiveTree, CssManager } from "hson-live";
import { oklch_to_css } from "./mount-oklch";
import type { OklchChannel, OklchRig, OklchPickerModel, OklchValues, OklchTarget } from "./oklch.types";
import { CURRENT_OKLCH, CURRENT_OKLCHname } from "../../../core/consts/ui-consts";


const css = CssManager.api();

export const make_range_attrs = (channel: OklchChannel): Record<string, string> => {
  if (channel === "l") return { type: "range", min: "0", max: "100", step: "0.1" };
  if (channel === "c") return { type: "range", min: "0", max: "1", step: "0.001" };
  if (channel === "h") return { type: "range", min: "0", max: "360", step: "0.1" };
  return { type: "range", min: "0", max: "1", step: "0.01" };
};

export const read_input_number = (input: LiveTree): number => {
  return Number(input.form.getValue());
};

const write_input_number = (input: LiveTree, n: number): void => {
  input.form.setValue(String(n));

};

export const render_prev = (rig: OklchRig, model: OklchPickerModel, state: OklchValues): void => {
  const value = oklch_to_css(state);

  
  css.var.set(CURRENT_OKLCHname, value);
  rig.code.text.set(value);

  for (const item of rig.inputs) {
    const n = state[item.channel];
    write_input_number(item.input, n);
    item.value.text.set(String(n));
  }

  for (let i = 0; i < model.targets.length; i += 1) {
    const target = model.targets[i];
    const row = rig.targetRows[i];
    if (!row) continue;

    row.text.set(`${target!.label}: ${css.var.get(target!.varName)}`);
  }
};

export const apply_to_target = (target: OklchTarget, state: OklchValues): void => {
  CssManager.api().var.set(target.varName, oklch_to_css(state));
};

