import type { LiveTree } from "hson-live";
import type { TestSummary } from "./tests.types";
import { makeGem } from "../app/widgets/gems/make-gems";


export type TestGems = Readonly<{
  clear: () => void;
  render: (s: TestSummary) => void;
}>;

export function create_test_gems(host: LiveTree): TestGems {
  const box = host.create.div()
    .id.set("test-gems")
    .css.setMany({
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gap: "8px",
      gridRow: "4",
      gridColumn: "1 / 5",
      padding: "0"
    });

  const makeGem = (label: string) => {
    const g = box.create.div().css.setMany({
      padding: "8px 8px",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      display: "grid",
      gridTemplateRows: "auto auto",
      justifyItems: "center",
      alignContent: "center",
      minHeight: "44px",
      minWidth: "44px",
      boxSizing: "border-box",
      overflow: "hidden",
    });

    const val = g.create.div().setText("—").css.setMany({
      fontSize: "14px",
      fontWeight: "700",
      lineHeight: "1",
      letterSpacing: "0.01em",
    });

    const lbl = g.create.div().setText(label).css.setMany({
      opacity: "0.65",
      fontSize: "10px",
      lineHeight: "1",
      marginTop: "4px",
      whiteSpace: "nowrap",
    });

    return {
      set: (v: string | number) => val.setText(String(v)),
      clear: () => val.setText("—"),
      // optional: expose g if you want to color pass/fail later
      _node: g,
    };
  };

  const total = makeGem("total");
  const pass = makeGem("pass");
  const fail = makeGem("fail");
  const time = makeGem("ms");

  return {
    clear: () => { total.clear(); pass.clear(); fail.clear(); time.clear(); },
    render: (s) => {
      total.set(s.cases);
      pass.set(s.pass);
      fail.set(s.fail);
      time.set(Math.round(s.msTotal));
    },
  };
}
