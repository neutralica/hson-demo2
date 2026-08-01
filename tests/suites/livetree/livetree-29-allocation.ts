import {  hsonLiveTree, LiveTree } from "hson-live/livetree";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import type { TestSuite } from "../../harness/core/test-contracts";
import { make_livetree_suite } from "./make-livetree-suite";

function fresh_shape_case(suite: string): LiveTreeCaseSpec {
  let compact = false;

  return {
    suite,
    name: "fresh LiveTree retains only construction identity state",
    html: `<main><span id="child"></span></main>`,
    act(tree) {
      const values = Object.values(Object.getOwnPropertyDescriptors(tree))
        .flatMap((descriptor) => "value" in descriptor ? [descriptor.value] : []);
      compact = Object.keys(tree).length === 2
        && values.every((value) => typeof value !== "function")
        && !Object.hasOwn(tree, "append")
        && !Object.hasOwn(tree, "empty")
        && !Object.hasOwn(tree, "find")
        && !Object.hasOwn(tree, "findAll");
    },
    assert(_tree, t) {
      t.eq("bare wrapper has two own data properties and no own functions", compact, true);
    },
  };
}

function lazy_find_case(suite: string): LiveTreeCaseSpec {
  let independent = false;
  let functional = false;

  return {
    suite,
    name: "find and findAll allocate independently and cache stable surfaces",
    html: `<main><span id="one" class="hit"></span><span id="two" class="hit"></span></main>`,
    act(tree) {
      const before = Object.keys(tree);
      const find = tree.find;
      const afterFind = Object.keys(tree);
      const findAll = tree.findAll;
      const afterBoth = Object.keys(tree);

      independent = before.length === 2
        && afterFind.length === 3
        && afterBoth.length === 4
        && tree.find === find
        && tree.findAll === findAll;
      functional = find.must.byId("one").id.get() === "one"
        && findAll.byClass("hit").length === 2;
    },
    assert(_tree, t) {
      t.eq("each finder adds only its own stable cache", independent, true);
      t.eq("lazy finder behavior matches the existing query API", functional, true);
    },
  };
}

function prototype_methods_case(suite: string): LiveTreeCaseSpec {
  let prototypeBacked = false;
  let behavior = false;

  return {
    suite,
    name: "append and empty are prototype-backed without changing chaining",
    html: `<main></main>`,
    act(tree) {
      const branch = hsonLiveTree.create.span();
      prototypeBacked = !Object.hasOwn(tree, "append")
        && !Object.hasOwn(tree, "empty")
        && tree.append === LiveTree.prototype.append
        && tree.empty === LiveTree.prototype.empty;
      behavior = tree.append(branch) === tree
        && tree.content.all().length === 1
        && tree.empty() === tree
        && tree.content.all().length === 0;
    },
    assert(_tree, t) {
      t.eq("append and empty live on the LiveTree prototype", prototypeBacked, true);
      t.eq("prototype methods retain mutation and chaining behavior", behavior, true);
    },
  };
}

function css_laziness_case(suite: string): LiveTreeCaseSpec {
  let lazy = false;
  let stable = false;

  return {
    suite,
    name: "CSS getter variable and animation surfaces instantiate on demand",
    html: `<main></main>`,
    act(tree) {
      const css = tree.css;
      const beforeGet = Object.getOwnPropertyDescriptor(css, "get");
      const beforeVar = Object.getOwnPropertyDescriptor(css, "var");
      const beforeAnim = Object.getOwnPropertyDescriptor(css, "anim");
      const getter = css.get;
      const vars = css.var;
      const anim = css.anim;
      const afterGet = Object.getOwnPropertyDescriptor(css, "get");
      const afterVar = Object.getOwnPropertyDescriptor(css, "var");
      const afterAnim = Object.getOwnPropertyDescriptor(css, "anim");

      lazy = typeof beforeGet?.get === "function"
        && typeof beforeVar?.get === "function"
        && typeof beforeAnim?.get === "function"
        && afterGet?.get === undefined && typeof afterGet?.value === "object"
        && afterVar?.get === undefined && typeof afterVar?.value === "object"
        && afterAnim?.get === undefined && typeof afterAnim?.value === "object";
      stable = css.get === getter && css.var === vars && css.anim === anim;
    },
    assert(_tree, t) {
      t.eq("CSS sub-surfaces replace lazy accessors only when touched", lazy, true);
      t.eq("materialized CSS sub-surfaces remain stable", stable, true);
    },
  };
}

function listen_decision_case(suite: string): LiveTreeCaseSpec {
  let eagerPerAccess = false;

  return {
    suite,
    name: "listen remains collectible per access pending prototype backing",
    html: `<main></main>`,
    act(tree) {
      eagerPerAccess = tree.listen !== tree.listen
        && Object.keys(tree).length === 2;
    },
    assert(_tree, t) {
      t.eq("unused listener builders are not retained on LiveTree", eagerPerAccess, true);
    },
  };
}

export function livetree_allocation(): TestSuite {
  const suite = "livetree/allocation";
  return make_livetree_suite(suite, [
    fresh_shape_case(suite),
    lazy_find_case(suite),
    prototype_methods_case(suite),
    css_laziness_case(suite),
    listen_decision_case(suite),
  ]);
}
