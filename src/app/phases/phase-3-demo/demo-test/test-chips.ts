import { type LiveTree } from "hson-live";
import type { TestSummary } from "../../../../tests/tests.types";
import { $cols_, $red_etc_ } from "../../../core/consts/colors.consts";
import { $txt_ } from "../../../core/consts/ui-consts";
import { mk_div_id, mk_div_cls } from "../../../utils/makers";
import { MAKE_CHIP_DEFAULTcss, TEST_BUTTON_BORDER, TEST_CHIP_ROWcss } from "./tp.css";


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
      .css.setMany({
        fontSize: $txt_.unter,
        fontWeight: "700",
        lineHeight: "1",
        letterSpacing: "0.01em",
      });

    const lbl = mk_div_cls(chip, "test-chip-label")
      .text.set(label)
      .css.setMany({
        marginTop: "4px",
        fontSize: $txt_.unter,
        lineHeight: "1",
        letterSpacing: "0.06em",
        textTransform: "lowercase",
        whiteSpace: "nowrap",
      });

    // ADDED: pressed feedback without global CSS manager dependency
    const press = (on: boolean): void => {
      chip.css.setMany(on
        ? { transform: "translateY(1px)", filter: "brightness(0.98)" }
        : { transform: "translateY(0px)", filter: "brightness(1.0)" });
    };

    chip.listen.onPointerDown(() => press(true));
    chip.listen.onPointerUp(() => press(false));
    chip.listen.onPointerLeave(() => press(false));
    chip.listen.onPointerCancel(() => press(false));

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