// mount-demo.ts

import { CssManager, hson, type LiveTree } from "hson-live";
import { makeDivClass, makeDivId, makeDivIdTxt, makeSpanId } from "../../utils/makers";
import { relay, type OutcomeAsync } from "intrastructure";
import { $T$GHSONcss, BELT_HOLDERcss, HEADLINEcss, MAIN_CONTAINERcss, MAIN_TEXTcss, MENU_BOXcss, TITLE_BOXcss } from "./demo.css";
import { init_parsing_panels } from "../../widgets/parse-panel/init.pp";
import { pp_factory } from "../../widgets/parse-panel/pp-factory";
import { style_parsing_panels } from "../../widgets/parse-panel/style-pp";
import { bud_node as bud_node } from "../../config/bud-config";
import { DEMO_BUDS } from "./demo.buds";
import { shade_class } from "./demo.consts";
import { _clamp01, _clampN1P1, keys_of } from "../../utils/helpers";
import { LAYOUT_GRIDcss, PANEL_FRAMEcss, PANEL_OUTERcss, TEST_BODY_OVERRIDEScss, UI_ROOTcss } from "./demo-panels.css";
import { INSPECTOR_PANEL, PARSE_PANEL, TEST_PANEL } from "./demo-panels";
import { mount_panel } from "../../ui/make-panel";
import { test_panel_factory_offdom } from "./test-panel-factory";
import { create_console } from "../../console/console";
import { build_suites_for_mode, make_test_suite, make_generated_fixtures_suite } from "../../../tests/suite-builder";
import { run_suites } from "../../../tests/test-runner";
import { _test_full_loop } from "hson-live/diagnostics";
import { FIXTURES_GENERATED } from "../../../fixtures/generate-fixtures";
import type { TestEvent, TestSuite } from "../../../tests/tests.types";
import { $PANEL_HIDDEN } from "../../consts/ui-consts";
import { HSONlower, LETTER_LOWS } from "../../consts/config.consts";
import { $cols, LETTER_COLORfaded } from "../../consts/colors.consts";
import { FIXTURES_BASIC } from "../../../../data-old/data/json-fixtures";
import type { FixtureAtom } from "../../../../../hson-live/dist/diagnostics/loop-3.test";
import type { Fixture, FixtureFmt } from "../../../fixtures/fixtures.types";
import { create_test_log } from "../../../tests/test-log";
import { create_inspector } from "../../../tests/test-inspector";

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

console.log(FIXTURES_BASIC, FIXTURES_GENERATED)
export type MenuKey = typeof MENU_OPTIONS[number];
// CHANGED: anchor tags once, as readonly string[]
const TAGS_BASIC: readonly string[] = ["basic"];

const basicFixtures: readonly Fixture[] =
  Object.entries(FIXTURES_BASIC).flatMap(([name, atom]) => {
    const fmt: FixtureFmt = name.startsWith("html__") ? "html" : "json";

    // explode bundle objects like {a:"...", b:"..."} into multiple fixtures
    if (atom && typeof atom === "object" && !Array.isArray(atom)) {
      const rec = atom as Record<string, unknown>;
      const entries = Object.entries(rec);

      const allPrimitiveish = entries.every(([, v]) =>
        v === null || ["string", "number", "boolean"].includes(typeof v),
      );

      if (allPrimitiveish) {
        return entries.map(([k, v]) => ({
          name: `${name}.${k}`,
          fmt,
          atom: v as FixtureAtom,
          tags: TAGS_BASIC, // CHANGED
        }));
      }
    }

    // otherwise treat as one fixture
    return [
      {
        name,
        fmt,
        atom: atom as FixtureAtom,
        tags: TAGS_BASIC, // CHANGED
      },
    ];
  });
const testFixtures = [...FIXTURES_GENERATED, ...basicFixtures];

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
  // CHANGED: make a single row container that holds BOTH panels
  const panelsRow = layoutGrid.create.div()
    .id.set("panels-row")
    .css.setMany({
      display: "flex",
      gap: "12px",
      alignItems: "flex-start",

      // mobile: allow stacking
      flexWrap: "wrap",
    });

  // CHANGED: each panel gets a flex column inside the row (so panel can stay “normal”)
  const testCol = panelsRow.create.div().css.setMany({
    flex: "0 0 320px",       // test panel column is “small”
    minWidth: "280px",
  });

  const inspCol = panelsRow.create.div().css.setMany({
    flex: "1 1 520px",       // inspector takes remaining width
    minWidth: "320px",
  });

  // CHANGED: mount test panel into its column
  
  // CHANGED: mount inspector into its column
  const parse = mount_panel(layoutGrid, PARSE_PANEL);
  parse.panel.tree.classlist.add($PANEL_HIDDEN);
  const pp = pp_factory(parse.body.tree);
  init_parsing_panels(pp);
  
  const testwrap = makeDivId(layoutGrid, "test-inspect-wrap")
  const test = mount_panel(testwrap, TEST_PANEL);
  test.panel.tree.classlist.add($PANEL_HIDDEN);
  test.body.tree.css.setMany(TEST_BODY_OVERRIDEScss);
  
  const tp = test_panel_factory_offdom();
  
  // IMPORTANT: mount first so LiveTree ops are DOM-backed
  tp.mount(test.body.tree);
  tp.mount(testCol);

  // CHANGED: create console + log immediately after mount
  const tlog = create_test_log();
  const inspPanel = mount_panel(testwrap, INSPECTOR_PANEL);
  inspPanel.panel.tree.classlist.add($PANEL_HIDDEN);

  const inspector = create_inspector(
    inspPanel.body.tree,
    tlog,
    () => tp.getLevel(),                 // CHANGED
    { hideClass: $PANEL_HIDDEN },
  );

  // CHANGED: module-scope guard (NOT inside mount_demo)
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

      const suites = build_suites_for_mode(tp.getMode(), { _test_full_loop });
      const res = await run_suites(suites, onEvent, { bail: false });

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
      color: $cols.blu.sky,
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