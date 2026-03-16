import { type LiveTree } from "hson-live";
import type { TestSummary } from "../../../../tests/tests.types";
import { $cols_, $red_etc_ } from "../../../consts/colors.consts";
import { $txt_ } from "../../../consts/ui-consts";
import { make_div_id, make_div_class } from "../../../utils/makers";


export type ChipDisplay = Readonly<{
  clear: () => void;
  render: (s: TestSummary) => void;
}>;


export function create_test_chips(host: LiveTree): ChipDisplay {
  // keep the same grid placement but make it read like a HUD row
  const box = make_div_id(host, "test-chips").css.setMany({
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "8px",
    gridRow: "4",
    gridColumn: "1 / 5",
    padding: "0",
  });

  // ADDED: small helper so all chips share the same visual language
  const makeChip = (label: string) => {
    const chip = make_div_class(box, "test-chip").css.setMany({
      padding: "8px 8px",
      borderRadius: "18px",
      display: "grid",
      gridTemplateRows: "auto auto",
      justifyItems: "center",
      alignContent: "center",
      minHeight: "44px",
      minWidth: "44px",
      boxSizing: "border-box",
      overflow: "hidden",
      border: `1px solid ${$red_etc_.stonerPurple}`,
      background: $cols_.bckdeep,
      transition: "transform 90ms ease, filter 140ms ease",
    });

    const val = make_div_class(chip, "test-chip-value")
      .text.set("—")
      .css.setMany({
        fontSize: $txt_.unter,
        fontWeight: "700",
        lineHeight: "1",
        letterSpacing: "0.01em",
      });

    const lbl = make_div_class(chip, "test-chip-label")
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