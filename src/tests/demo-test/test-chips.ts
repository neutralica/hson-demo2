import { type LiveTree } from "hson-live";
import type { TestSummary } from "../tests.types";
import { mk_div_id, mk_div_cls } from "../../app/utils/makers";
import { MAKE_CHIP_DEFAULTcss, TEST_CHIP_LABELcss, TEST_CHIP_ROWcss, TEST_CHIP_VALUEcss } from "./tp.css";


export type ChipDisplay = Readonly<{
  clear: () => void;
  render: (s: TestSummary) => void;
}>;


export function create_test_chips(host: LiveTree): ChipDisplay {
  // keep the same grid placement but make it read like a HUD row
  const box = mk_div_id(host, "test-chips").css.setMany(TEST_CHIP_ROWcss);

  // ADDED: small helper so all chips share the same visual language
  const makeChip = (label: string) => {
    const chip = mk_div_cls(box, "test-chip").css.setMany(MAKE_CHIP_DEFAULTcss);

    const val = mk_div_cls(chip, "test-chip-value")
      .text.set("—")
      .css.setMany(TEST_CHIP_VALUEcss);

    const lbl = mk_div_cls(chip, "test-chip-label").text.set(label) .css.setMany(TEST_CHIP_LABELcss);

    return {
      set: (v: string | number) => val.text.set(String(v)),
      clear: () => val.text.set("—"),
      _node: chip,
    };
  };

  const total = makeChip("total");
  const pass = makeChip("pass");
  const fail = makeChip("fail");
  const time = makeChip("ms");

  return {
    clear: () => {
      total.clear();
      pass.clear();
      fail.clear();
      time.clear();
    },
    render: (s) => {
      total.set(s.cases);
      pass.set(s.pass);
      fail.set(s.fail);
      time.set(Math.round(s.msTotal));
    },
  };
}