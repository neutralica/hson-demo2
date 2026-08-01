import  { LiveTree } from "hson-live/livetree";
import { _colors } from "../../core/consts/colors.consts";
import { mk_div_id, mk_div_cls } from "../../utils/makers";
import type { TestSummary } from "./tests.types";
import { TEST_CHIP_ROWcss, TEST_CHIP_DEFcss, TEST_CHIP_VALUEcss, TEST_CHIP_LABELcss } from "./tp.css";
import { format_hosted_test_duration } from "../../hosted-test/hosted-test-timing";

export type ChipDisplay = Readonly<{
  clear: () => void;
  render: (s: TestSummary) => void;
  renderEntries: (entries: readonly Readonly<{ label: string; value: string | number }>[]) => void;
  metrics: () => Readonly<{ layoutBuilds: 1; labelUpdates: number; valueUpdates: number }>;
}>;


export function create_test_chips(host: LiveTree): ChipDisplay {
  const box = mk_div_id(host, "test-chips").css.setMany(TEST_CHIP_ROWcss);
  let labelUpdates = 0;
  let valueUpdates = 0;
  const makeChip = (label: string) => {
    const chip = mk_div_cls(box, "test-chip").css.setMany(TEST_CHIP_DEFcss);
    const val = mk_div_cls(chip, "test-chip-value")
      .text.set("—")
      .css.setMany(TEST_CHIP_VALUEcss);
    const lbl = mk_div_cls(chip, "test-chip-label").text.set(label).css.setMany(TEST_CHIP_LABELcss);
    let currentLabel = label;
    let currentValue = "—";
    return {
      update(nextLabel: string, nextValue: string | number) {
        const value = String(nextValue);
        if (nextLabel !== currentLabel) {
          currentLabel = nextLabel;
          labelUpdates += 1;
          lbl.text.set(nextLabel);
        }
        if (value !== currentValue) {
          currentValue = value;
          valueUpdates += 1;
          val.text.set(value);
        }
      },
    };
  };
  const initial = [
    { label: "cases", value: "—" },
    { label: "passed", value: "—" },
    { label: "failed", value: "—" },
    { label: "elapsed", value: "—" },
  ] as const;
  const slots = initial.map((entry) => makeChip(entry.label));
  const renderEntries = (entries: readonly Readonly<{ label: string; value: string | number }>[]): void => {
    if (entries.length !== slots.length) {
      throw new Error(`Hosted summary requires exactly ${slots.length} stable entries, received ${entries.length}.`);
    }
    entries.forEach((entry, index) => slots[index]?.update(entry.label, entry.value));
  };

  return {
    clear: () => renderEntries(initial),
    render: (s) => {
      renderEntries([
        { label: "cases", value: s.cases },
        { label: "passed", value: s.pass },
        { label: "failed", value: s.fail },
        { label: "elapsed", value: format_hosted_test_duration(s.msTotal) },
      ]);
    },
    renderEntries,
    metrics: () => Object.freeze({ layoutBuilds: 1, labelUpdates, valueUpdates }),
  };
}


   export  function get_line_color(line: string): string {
        const head = line.trim().split(/\s+/, 1)[0]?.toUpperCase() ?? "";
        switch (head) {
            case "FAIL": return "red";
            case "PASS": 
          case "OK:":
            case "OK": return _colors.greenlike;
            case "• ": return _colors.txt.main;
            case "SKIP":
                case "WARN": return _colors.yellowlike;
                case "RUN": return _colors.txt.grey;
            case "DONE": return _colors.greenlike;
            case "===":return _colors.txt.grey;
            case "SUITE:":return _colors.txt.main;
            default: return _colors.txt.grey;
        }
    }
