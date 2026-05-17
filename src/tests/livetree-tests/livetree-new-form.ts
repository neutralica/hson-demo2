import type { LiveTree } from "hson-live";
import type { TestSuite, LiveTreeCaseSpec } from "../tests.types";
import { make_livetree_suite } from "./livetree-testkit";

export function livetree_new_form_api(): TestSuite {
    const SUITE = "livetree/form";

    const cases: readonly LiveTreeCaseSpec[] = [
        {
            suite: SUITE,
            name: "setValue writes input value attr and getValue reads it",
            html: `<div id="root"><input id="field" /></div>`,
            fixture: "form/value",
            sub: "input-set-get",

            act(tree: LiveTree) {
                const field = tree.find.must.byId("field");

                field.form.setValue("abc");
            },

            assert(tree: LiveTree, t) {
                const field = tree.find.must.byId("field");

                t.eq(`value attr written`, field.attr.get("value"), "abc");
                t.eq(`form.getValue() reads value`, field.form.getValue(), "abc");
            },
        },

        {
            suite: SUITE,
            name: "setValue returns tree for chaining",
            html: `<div id="root"><input id="field" /></div>`,
            fixture: "form/value",
            sub: "input-chain",

            act(tree: LiveTree) {
                const field = tree.find.must.byId("field");

                field.form.setValue("abc").attr.set("data-after", "ok");
            },

            assert(tree: LiveTree, t) {
                const field = tree.find.must.byId("field");

                t.eq(`chained attr write works`, field.attr.get("data-after"), "ok");
                t.eq(`value retained`, field.form.getValue(), "abc");
            },
        },

        {
            suite: SUITE,
            name: "getValue reads existing input value attr",
            html: `<div id="root"><input id="field" value="preset" /></div>`,
            fixture: "form/value",
            sub: "input-existing",

            act(_tree: LiveTree) {
                // read-only case
            },

            assert(tree: LiveTree, t) {
                const field = tree.find.must.byId("field");

                t.eq(`existing value read`, field.form.getValue(), "preset");
            },
        },

        {
            suite: SUITE,
            name: "textarea setValue roundtrips through form api",
            html: `<div id="root"><textarea id="field"></textarea></div>`,
            fixture: "form/value",
            sub: "textarea-set-get",

            act(tree: LiveTree) {
                const field = tree.find.must.byId("field");

                field.form.setValue("hello textarea");
            },

            assert(tree: LiveTree, t) {
                const field = tree.find.must.byId("field");

                t.eq(`textarea form value`, field.form.getValue(), "hello textarea");
            },
        },

        {
            suite: SUITE,
            name: "setChecked true writes checked state",
            html: `<div id="root"><input id="check" type="checkbox" /></div>`,
            fixture: "form/checked",
            sub: "checkbox-true",

            act(tree: LiveTree) {
                const check = tree.find.must.byId("check");

                check.form.setChecked(true);
            },

            assert(tree: LiveTree, t) {
                const check = tree.find.must.byId("check");

                t.eq(`checked state true`, check.form.getChecked(), true);
                t.ok(`checked attr present`, check.attr.get("checked") !== undefined);
            },
        },
        {
            suite: SUITE,
            name: "setChecked false updates checked state",
            html: `<div id="root"><input id="check" type="checkbox" checked /></div>`,
            fixture: "form/checked",
            sub: "checkbox-false",

            act(tree: LiveTree) {
                const check = tree.find.must.byId("check");

                check.form.setChecked(false);
            },

            assert(tree: LiveTree, t) {
                const check = tree.find.must.byId("check");

                t.eq(`checked state false`, check.form.getChecked(), false);
            },
        },
        {
            suite: SUITE,
            name: "setChecked returns tree for chaining",
            html: `<div id="root"><input id="check" type="checkbox" /></div>`,
            fixture: "form/checked",
            sub: "checkbox-chain",

            act(tree: LiveTree) {
                const check = tree.find.must.byId("check");

                check.form.setChecked(true).attr.set("data-after", "ok");
            },

            assert(tree: LiveTree, t) {
                const check = tree.find.must.byId("check");

                t.eq(`checked state true`, check.form.getChecked(), true);
                t.eq(`chained attr write works`, check.attr.get("data-after"), "ok");
            },
        },
        {
            suite: SUITE,
            name: "getSelected reads selected single select value from mounted DOM",
            html: `
    <div id="root">
      <select id="choice">
        <option value="a">A</option>
        <option value="b" selected>B</option>
      </select>
    </div>
  `,
            fixture: "form/selected",
            sub: "select-existing",
            dom: true,

            act(_tree: LiveTree) {
                // read-only case
            },

            assert(tree: LiveTree, t) {
                const choice = tree.find.must.byId("choice");

                t.eq(`selected value read`, choice.form.getSelected(), "b");
            },
        },

        {
            suite: SUITE,
            name: "setSelected writes single select value",
            html: `
    <div id="root">
      <select id="choice">
        <option value="a">A</option>
        <option value="b">B</option>
      </select>
    </div>
  `,
            fixture: "form/selected",
            sub: "select-set",

            act(tree: LiveTree) {
                const choice = tree.find.must.byId("choice");

                choice.form.setSelected("b");
            },

            assert(tree: LiveTree, t) {
                const choice = tree.find.must.byId("choice");
                const selected = choice.form.getSelected();

                if (Array.isArray(selected)) {
                    t.eq(`selected count`, selected.length, 1);
                    t.eq(`selected value written`, selected[0], "b");
                } else {
                    t.eq(`selected value written`, selected, "b");
                }
            },
        },

        {
            suite: SUITE,
            name: "setSelected writes multiple select values",
            html: `
        <div id="root">
          <select id="choice" multiple>
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
          </select>
        </div>
      `,
            fixture: "form/selected",
            sub: "select-multiple-set",

            act(tree: LiveTree) {
                const choice = tree.find.must.byId("choice");

                choice.form.setSelected(["a", "c"]);
            },

            assert(tree: LiveTree, t) {
                const choice = tree.find.must.byId("choice");
                const selected = choice.form.getSelected();

                t.ok(`selected result is array`, Array.isArray(selected));

                if (Array.isArray(selected)) {
                    t.eq(`selected count`, selected.length, 2);
                    t.ok(`selected includes a`, selected.includes("a"));
                    t.ok(`selected includes c`, selected.includes("c"));
                }
            }
        },
    ];

    return make_livetree_suite(SUITE, cases);
}