import type { LiveTree } from "hson-live";
import { _colors } from "../../../core/consts/colors.consts";
import { mk_div_id, mk_div_cls } from "../../../utils/makers";
import type { TestSummary } from "../../../../shared/testing/test-contracts";
import { TEST_CHIP_ROWcss, TEST_CHIP_DEFcss, TEST_CHIP_VALUEcss, TEST_CHIP_LABELcss } from "./tp.css";
import { format_hosted_test_duration } from "../../../../shared/hosted-tests/hosted-test-timing";

export type ChipDisplay = Readonly<{
  clear: () => void;
  render: (s: TestSummary) => void;
  renderEntries: (entries: readonly TestSummaryEntry[]) => void;
  metrics: () => Readonly<{ layoutBuilds: 1; labelUpdates: number; valueUpdates: number }>;
}>;

export const TEST_SUMMARY_ENTRY_ORDER = Object.freeze([
  "suites",
  "tests",
  "passed",
  "failed",
  "elapsed",
] as const);

export type TestSummaryEntryKey = typeof TEST_SUMMARY_ENTRY_ORDER[number];
export type TestSummaryEntry = Readonly<{
  key: TestSummaryEntryKey;
  label: string;
  value: string | number;
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
      show(visible: boolean) {
        chip.css.set.display(visible ? "grid" : "none");
      },
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
  const definitions: Readonly<Record<TestSummaryEntryKey, string>> = Object.freeze({
    suites: "suites",
    tests: "tests",
    passed: "passed",
    failed: "failed",
    elapsed: "elapsed",
  });
  const slots = new Map(TEST_SUMMARY_ENTRY_ORDER.map((key) => [key, makeChip(definitions[key])] as const));
  const initial: readonly TestSummaryEntry[] = [
    { key: "suites", label: "suites", value: "—" },
    { key: "tests", label: "tests", value: "—" },
    { key: "passed", label: "passed", value: "—" },
    { key: "failed", label: "failed", value: "—" },
    { key: "elapsed", label: "elapsed", value: "—" },
  ] as const;
  const renderEntries = (entries: readonly TestSummaryEntry[]): void => {
    const keys = entries.map((entry) => entry.key);
    if (new Set(keys).size !== keys.length) {
      throw new Error("Hosted summary entry keys must be unique.");
    }
    const indices = keys.map((key) => TEST_SUMMARY_ENTRY_ORDER.indexOf(key));
    if (indices.some((index) => index < 0) || indices.some((index, position) => position > 0 && index <= (indices[position - 1] ?? -1))) {
      throw new Error("Hosted summary entry keys must follow the stable semantic order.");
    }
    const visible = new Set(keys);
    for (const [key, slot] of slots) slot.show(visible.has(key));
    for (const entry of entries) slots.get(entry.key)?.update(entry.label, entry.value);
  };

  renderEntries(initial);

  return {
    clear: () => renderEntries(initial),
    render: (s) => {
      renderEntries([
        { key: "suites", label: "suites", value: s.suites },
        { key: "tests", label: "tests", value: s.cases },
        { key: "passed", label: "passed", value: s.pass },
        { key: "failed", label: "failed", value: s.fail },
        { key: "elapsed", label: "elapsed", value: format_hosted_test_duration(s.msTotal) },
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
