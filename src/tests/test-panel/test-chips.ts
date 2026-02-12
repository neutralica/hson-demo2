import { type LiveTree } from "hson-live";
import type { TestSummary } from "../tests.types";
import { makeDivClass, makeDivId } from "../../app/utils/makers";
import { $red_etc_ } from "../../app/consts/colors.consts";
import { $txt_ } from "../../app/consts/ui-consts";


export type ChipDisplay = Readonly<{
  clear: () => void;
  render: (s: TestSummary) => void;
}>;


export function create_test_chips(host: LiveTree): ChipDisplay {
  // CHANGED: keep the same grid placement but make it read like a HUD row
  const box = makeDivId(host, "test-chips").css.setMany({
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "8px",
    gridRow: "4",
    gridColumn: "1 / 5",
    padding: "0",
  });

  // ADDED: small helper so all chips share the same visual language
  const makeChip = (label: string) => {
    const chip = makeDivClass(box, "test-chip").css.setMany({
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
      border: $red_etc_.stonerPurple,
      transition: "transform 90ms ease, filter 140ms ease",
    });

    const val = makeDivClass(chip, "test-chip-value")
      .setText("—")
      .css.setMany({
        fontSize: $txt_.sub,
        fontWeight: "700",
        lineHeight: "1",
        letterSpacing: "0.01em",
      });

    const lbl = makeDivClass(chip, "test-chip-label")
      .setText(label)
      .css.setMany({
        marginTop: "4px",
        fontSize: $txt_.sub,
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
      set: (v: string | number) => val.setText(String(v)),
      clear: () => val.setText("—"),
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