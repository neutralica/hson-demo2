import { CssManager, hson, type LiveTree } from "hson-live";
import type { TestSummary } from "../tests.types";
import { makeGem } from "../../app/widgets/gems/make-gems";
import { makeDivClass, makeDivId } from "../../app/utils/makers";


export type GemDisplay = Readonly<{
  clear: () => void;
  render: (s: TestSummary) => void;
}>;

export function create_test_gems(host: LiveTree): GemDisplay {
  const box = makeDivId(host, "test-gems")
    .css.setMany({
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gap: "8px",
      gridRow: "4",
      gridColumn: "1 / 5",
      padding: "0"
    });

  const makeGem = (label: string) => {
    const gem = makeDivClass(box, `${label}-gem`).css.setMany({
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

    const val = makeDivClass(gem, `${label}-gem gem-value`).setText("—").css.setMany({
      fontSize: "14px",
      fontWeight: "700",
      lineHeight: "1",
      letterSpacing: "0.01em",
    });

    const lbl = makeDivClass(gem, `${label}-gem gem-label`).setText(label).css.setMany({
      opacity: "0.65",
      fontSize: "10px",
      lineHeight: "1",
      marginTop: "4px",
      whiteSpace: "nowrap",
    });
    // CHANGED: gem becomes a positioned stacking context
    gem.css.setMany({
      position: "relative",
      transition: "transform 90ms ease, filter 160ms ease",
    });

    gem.listen.onPointerDown(() => gem.classlist.add("pressed"));
    gem.listen.onPointerUp(() => gem.classlist.remove("pressed"));
    gem.listen.onPointerLeave(() => gem.classlist.remove("pressed"));

    // ADDED: overlay layer (SVG lives here)
    const fx = makeDivClass(gem, "gem-fx").classlist.set("gem-fx");
    fx.css.setMany({
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "1",
      transition: "transform 90ms ease, opacity 160ms ease",
      opacity: "0.92",

    });

    // CHANGED: text should be above FX
    val.css.setMany({ position: "relative", zIndex: "2" });
    lbl.css.setMany({ position: "relative", zIndex: "2" });

    const gem_svg = (): string => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none">
          <defs>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="rgba(255,255,255,0.38)"/>
              <stop offset="0.35" stop-color="rgba(255,255,255,0.08)"/>
              <stop offset="1" stop-color="rgba(255,255,255,0)"/>
            </linearGradient>

            <radialGradient id="spec" cx="22%" cy="18%" r="28%">
              <stop offset="0" stop-color="rgba(255,255,255,0.85)"/>
              <stop offset="0.35" stop-color="rgba(255,255,255,0.22)"/>
              <stop offset="1" stop-color="rgba(255,255,255,0)"/>
            </radialGradient>

            <radialGradient id="core" cx="52%" cy="48%" r="70%">
              <stop offset="0" stop-color="rgba(255,255,255,0.06)"/>
              <stop offset="1" stop-color="rgba(0,0,0,0)"/>
            </radialGradient>
          </defs>

          <!-- soft core refraction -->
          <rect x="0" y="0" width="100" height="60" fill="url(#core)"/>

          <!-- top-left facet planes -->
          <polygon points="0,0 52,0 20,22" fill="rgba(255,255,255,0.06)"/>
          <polygon points="0,0 20,22 0,40" fill="rgba(255,255,255,0.04)"/>

          <!-- crisp edge glints -->
          <polyline points="0,6 40,6" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
          <polyline points="6,0 6,32" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
          <polyline points="62,58 100,58" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>
          <polyline points="96,28 96,60" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

          <!-- specular hits (tiny, high-believability) -->
          <circle cx="18" cy="12" r="10" fill="url(#spec)"/>
          <circle cx="28" cy="16" r="2.2" fill="rgba(255,255,255,0.85)"/>
        </svg>
`.trim();

    const pressedCss = {
      transform: "translateY(1px)",
      filter: "brightness(1.02)",
    } as const;

    const fxPressedCss = {
      transform: "translate(1px, 1px)",
      opacity: "0.82",
    } as const;
    const cssman = CssManager.globals.invoke();
    cssman.rule("pressed-css", ".pressed").setMany(fxPressedCss);

    // if you have a class->css helper, map `.pressed` to these;
    // otherwise just setMany in the event handlers.
    const gemTree = hson.fromTrustedHtml(gem_svg()).liveTree().asBranch()
    fx.append(gemTree);
    return {
      set: (v: string | number) => val.setText(String(v)),
      clear: () => val.setText("—"),
      // optional: expose g if you want to color pass/fail later
      _node: gem,
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
