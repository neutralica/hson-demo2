// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { makeDivClass, makeDivId, makeDivIdTxt, makeSpanId } from "../../utils/makers";
import { relay, type OutcomeAsync } from "intrastructure";
import { $T$GHSONcss, BELT_HOLDERcss, HEADLINEcss, MAIN_CONTAINERcss, MAIN_TEXTcss, MENU_BOXcss, TITLE_BOXcss } from "./demo.css";
import { init_parsing_panels } from "../../widgets/parse/init.pp";
import { pp_factory } from "../../widgets/parse/pp-factory";
import { bud_node as bud_node } from "../../config/bud-config";
import { DEMO_BUDS } from "./demo.buds";
import { shade_class } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";
import { LAYOUT_GRIDcss, PANEL_FRAMEcss, PANEL_OUTERcss, TEST_BODY_OVERRIDEScss, UI_ROOTcss } from "./demo-panels.css";
import { INSPECTOR_PANEL, PARSE_PANEL, TEST_PANEL } from "./demo-panels";
import { mount_panel } from "../../ui/make-panel";
import { test_panel_factory_offdom } from "../../../tests/test-panel-factory";
import { run_test_suites } from "../../../tests/test-runner";
import { _test_full_loop } from "hson-live/diagnostics";
import type { CaseKey, TestEvent, TestSuite } from "../../../tests/tests.types";
import { $PANEL_HIDDEN } from "../../consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../consts/config.consts";
import { $blu_, $cols, LETTER_COLORfaded } from "../../consts/colors.consts";
import { create_test_log } from "../../../tests/test-log";
import { create_inspector } from "../../../tests/inspector/test-inspector";
import type { LoopReport } from "../../../../../hson-live/dist/diagnostics/loop-3.test";
import { build_suites_for_mode } from "../../../tests/suite-builder";

export const $PARSE = "parse";
export const $TEST = "test";
export const $BUILD = "build";
export const $CONSOLE = "console";
export const $OKLCH = "oklch";
export const $MOUSE = "mouse";
export const $ABOUT = "about";

const MENU_OPTIONS = [
  $PARSE,
  $TEST,
  $BUILD,
  $OKLCH,
  $MOUSE,
  $ABOUT,
  $CONSOLE
] as const;

export type MenuKey = typeof MENU_OPTIONS[number];
// anchor tags once, as readonly string[]
// const TAGS_BASIC: readonly string[] = ["basic"];

// const basicFixtures: readonly Fixture[] =
//   Object.entries(JSON_FIXTURES_LEGACY).flatMap(([name, atom]) => {
//     const fmt: FixtureFmt = name.startsWith("html__") ? "html" : "json";

//     // explode bundle objects like {a:"...", b:"..."} into multiple fixtures
//     if (atom && typeof atom === "object" && !Array.isArray(atom)) {
//       const rec = atom as Record<string, unknown>;
//       const entries = Object.entries(rec);

//       const allPrimitiveish = entries.every(([, v]) =>
//         v === null || ["string", "number", "boolean"].includes(typeof v),
//       );

//       if (allPrimitiveish) {
//         return entries.map(([k, v]) => ({
//           name: `${name}.${k}`,
//           fmt,
//           atom: v as FixtureAtom,
//           tags: TAGS_BASIC, // CHANGED
//         }));
//       }
//     }

//     // otherwise treat as one fixture
//     return [
//       {
//         name,
//         fmt,
//         atom: atom as FixtureAtom,
//         tags: TAGS_BASIC, // CHANGED
//       },
//     ];
//   });
// const testFixtures = [...FIXTURES_GENERATED, ...basicFixtures];

let _testsWired = false;
export async function mount_demo(stage: LiveTree): OutcomeAsync<void> {
  stage.empty();

  // needed/optional for bud:
  // makeDivID/Class/etc
  // set CSS
  // [parent].set-keyframes
  // set anim
  // return animate()
  // (teardown??)

  const b = bud_node(stage);
  const demo = b.bud(DEMO_BUDS.demo);
  const screen = demo.bud(DEMO_BUDS.screen);
  const screenFx = screen.bud(DEMO_BUDS.screenFx);
  const mainContainer = makeDivId(screenFx.tree, "main-container")
    .css.setMany(MAIN_CONTAINERcss)
  const titleBox = makeDivId(mainContainer, "title-box");
  titleBox.css.setMany(TITLE_BOXcss)
  const headline = makeDivId(titleBox, "hson-headline");
  headline.css.setMany(HEADLINEcss);
  const uiRoot = makeDivId(screenFx.tree, "ui-root").css.setMany(UI_ROOTcss);
  const layoutGrid = makeDivId(uiRoot, "layout-grid").css.setMany(LAYOUT_GRIDcss);

  // mount inspector into its column
  const parse = mount_panel(layoutGrid, PARSE_PANEL);
  parse.panel.tree.classlist.add($PANEL_HIDDEN);
  const pp = pp_factory(parse.body.tree);
  init_parsing_panels(pp);

  const row = layoutGrid.create.div().classlist.set("test-row");
  row.style.setMany({
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "300px 1fr",
    alignContent: "center"
  });

  // mount inspector into left cell
  const testCell = row.create.div().classlist.set("test-row__panel");
  const inspCell = row.create.div().classlist.set("test-row__insp");

  // mount test panel into right cell
  const test = mount_panel(testCell, TEST_PANEL);
  test.panel.tree.classlist.add($PANEL_HIDDEN);
  test.body.tree.css.setMany(TEST_BODY_OVERRIDEScss);

  const tp = test_panel_factory_offdom();

  // IMPORTANT: mount first so LiveTree ops are DOM-backed
  tp.mount(test.body.tree);
  // tp.mount(testCol);

  // create console + log immediately after mount
  const tlog = create_test_log();
  const inspPanel = mount_panel(inspCell, INSPECTOR_PANEL);
  inspPanel.panel.tree.classlist.add($PANEL_HIDDEN);
  const captureMap = new Map<CaseKey, () => Promise<LoopReport>>();

  const suites = build_suites_for_mode(tp.getMode(), { _test_full_loop }, captureMap);

  // pass capture fn into inspector
  const inspector = create_inspector(
    inspPanel.body.tree,
    tlog,
    () => tp.getLevel(),
    { hideClass: $PANEL_HIDDEN },
    async (key) => {
      const fn = captureMap.get(key);
      if (!fn) throw new Error(`no capture for ${key}`);
      return fn();
    },
  );

  // module-scope guard (NOT inside mount_demo)
  /// let _testsWired = false;  // move this to module scope

  if (!_testsWired) {
    _testsWired = true;

    const onEvent = (e: TestEvent): void => {
      tlog.onEvent(e);
      tp.marquee.setText(tlog.getLastLine());
    };

    tp.runBtn.listen.onClick(async () => {
      tp.setStatus("running");

      tlog.clear();
      tp.gems.clear();
      tp.marquee.setText("running…");

      const suites = build_suites_for_mode(tp.getMode(), { _test_full_loop }, captureMap);
      const res = await run_test_suites(suites, onEvent, { bail: false });

      tp.gems.render(res.summary);
      tp.setStatus(res.ok ? "pass" : "fail");
      tp.marquee.setText(tlog.getLastLine());

      inspector.render();
      if (!res.ok) inspPanel.tree.classlist.remove($PANEL_HIDDEN);
    });
    tp.clearBtn.listen.onClick(() => {
      tlog.clear();
      tp.gems.clear();
      tp.setStatus("idle");
      tp.marquee.setText("idle");

      inspector.clear();
    });

  }

  const gcss = CssManager.globals.invoke();
  LETTER_LOWS.forEach(l => {
    gcss.rule(`demo-${l}-shade`, `.${shade_class(l)}`).setMany({
      color: LETTER_COLORfaded[l]
    });
  });
  gcss.rule('hide-hidden', `.${$PANEL_HIDDEN}`).set.visibility('hidden');
  const [$h, $s, $o, $n] = LETTER_LOWS.map((k) => {
    const span = makeSpanId(headline, `${k}-letter`)
      .setText(HSONlower[k])
      .classlist.add(shade_class(k))
      .css.setMany($T$GHSONcss)
    return span;
  });

  const menuBox = makeDivId(mainContainer, "menu-box")
    .css.setMany(MENU_BOXcss);

  const menu = {
    aboutBtn: makeDivIdTxt(menuBox, `${$ABOUT}-button`, $ABOUT),
    testBtn: makeDivIdTxt(menuBox, `${$TEST}-button`, $TEST),
    parseBtn: makeDivIdTxt(menuBox, `${$PARSE}-button`, $PARSE),
    oklchBtn: makeDivIdTxt(menuBox, `${$OKLCH}-button`, $OKLCH),
    mouseBtn: makeDivIdTxt(menuBox, `${$MOUSE}-button`, $MOUSE),
    consoleBtn: makeDivIdTxt(menuBox, `${$CONSOLE}-button`, $CONSOLE),

  } as const;

  keys_of(menu).forEach((k) => {
    menu[k].css.setMany({
      ...MAIN_TEXTcss,
      color: $blu_.sky,
    });
  });


  menu.parseBtn.listen.stopProp().onClick(ev => {
    parse.panel.tree.classlist.remove($PANEL_HIDDEN)
  });
  menu.testBtn.listen.stopProp().onClick(ev => {
    test.panel.tree.classlist.remove($PANEL_HIDDEN);
    inspPanel.panel.tree.classlist.remove($PANEL_HIDDEN);

  })

  return relay.ok();
}