import type { TestSuite } from "../../harness/core/test-contracts";
import type { LiveTreeCaseSpec } from "../livemap/livemap-tests.types";
import { make_livetree_suite } from "./make-livetree-suite";
import { hson_quid_selector } from "../../helpers/hson/hson-metadata-helpers";

export function livetree_anim_key_preservation(): TestSuite {
  const SUITE = "livetree/animation-identifier-preservation";
  const ANIM_UNDERSCORE = "lt_probe_anim_7a3_loop";
  const ANIM_HYPHEN = "lt-probe-anim-7a3-loop";
  const MANUAL_UNDERSCORE = "lt_manual_probe_name";

  const ruleFor = (snapshot: string, quid: string): string => {
    const selector = hson_quid_selector(quid);
    return snapshot.split("\n").find(line => line.startsWith(selector)) ?? "";
  };

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "keyframes manager preserves underscore names in rendered CSS",
      dom: true,
      fixture: "css/animation-identifiers",
      sub: "keyframes-underscore-name-preserved",

      html: `
    <main id="root">
      <div id="box">x</div>
    </main>
  `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.keyframes.set({
          name: "under_probe_7a3_loop",
          steps: {
            from: { opacity: "0" },
            to: { opacity: "1" },
          },
        });

        const rendered = box.css.keyframes.renderOne("under_probe_7a3_loop");
        const snapshot = box.css.devSnapshot();

        (tree as any).__result = {
          rendered,
          snapshot,
          renderedHasUnderscoreName: rendered.includes("@keyframes under_probe_7a3_loop"),
          renderedHasHyphenatedName: rendered.includes("@keyframes under-probe-7a3-loop"),
          snapshotHasUnderscoreName: snapshot.includes("@keyframes under_probe_7a3_loop"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("keyframes renderOne preserves underscore name", r.renderedHasUnderscoreName, true);
        t.eq("keyframes renderOne does not hyphenate name", r.renderedHasHyphenatedName, false);
        t.eq("keyframes snapshot includes underscore name", r.snapshotHasUnderscoreName, true);
      },
    },
    {
      suite: SUITE,
      name: "anim.beginName preserves underscore animation-name value",
      dom: true,
      fixture: "css/animation-identifiers",
      sub: "begin-name-underscore-preserved",

      html: `
    <main id="root">
      <div id="box">x</div>
    </main>
  `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.anim.beginName(ANIM_UNDERSCORE);

        const animationName = box.css.get.animationName();
        const many = box.css.getMany();
        const snapshot = box.css.devSnapshot();
        const quid = (box as any).quid as string;
        const rule = ruleFor(snapshot, quid);

        (tree as any).__result = {
          quid,
          animationName,
          many,
          snapshot,
          rule,
          animationNameLines: snapshot.split("\n").filter(line => line.includes("animation-name")),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("animationName getter preserves underscore value", r.animationName, ANIM_UNDERSCORE);
        t.eq("getMany preserves underscore animationName value", r.many.animationName, ANIM_UNDERSCORE);
        t.eq("snapshot has a rule for the current box", r.rule.length > 0, true);
        t.eq("current box rule contains emitted animation-name with underscore value", r.rule.includes(`animation-name: ${ANIM_UNDERSCORE};`), true);
        t.eq(
          [
            "current box rule does not hyphenate animation-name value",
            "",
            "current rule:",
            r.rule,
            "",
            "all animation-name lines:",
            ...r.animationNameLines,
          ].join("\n"),
          r.rule.includes(`animation-name: ${ANIM_HYPHEN};`),
          false,
        );
      },
    },
    {
      suite: SUITE,
      name: "anim.begin spec preserves underscore animation-name value",
      dom: true,
      fixture: "css/animation-identifiers",
      sub: "begin-spec-underscore-preserved",

      html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.anim.begin({
          name: ANIM_UNDERSCORE,
          duration: "2s",
          timingFunction: "ease-in-out",
          iterationCount: "infinite",
        });

        const many = box.css.getMany();
        const snapshot = box.css.devSnapshot();
        const quid = (box as any).quid as string;
        const rule = ruleFor(snapshot, quid);

        (tree as any).__result = {
          animationName: box.css.get.animationName(),
          animationDuration: box.css.get.animationDuration(),
          animationTimingFunction: box.css.get.animationTimingFunction(),
          animationIterationCount: box.css.get.animationIterationCount(),
          many,
          snapshot,
          rule,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("begin spec preserves underscore animationName", r.animationName, ANIM_UNDERSCORE);
        t.eq("begin spec writes duration", r.animationDuration, "2s");
        t.eq("begin spec writes timing function", r.animationTimingFunction, "ease-in-out");
        t.eq("begin spec writes iteration count", r.animationIterationCount, "infinite");
        t.eq("getMany preserves underscore animationName", r.many.animationName, ANIM_UNDERSCORE);
        t.eq("current box rule contains animation-name with underscore value", r.rule.includes(`animation-name: ${ANIM_UNDERSCORE};`), true);
        t.eq("current box rule does not hyphenate animation-name value", r.rule.includes(`animation-name: ${ANIM_HYPHEN};`), false);
      },
    },
    {
      suite: SUITE,
      name: "anim.restartName preserves underscore animation-name value",
      dom: true,
      fixture: "css/animation-identifiers",
      sub: "restart-name-underscore-preserved",

      html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.anim.beginName("lt_old_probe_loop");
        box.css.anim.restartName(ANIM_UNDERSCORE);

        const snapshot = box.css.devSnapshot();
        const quid = (box as any).quid as string;
        const rule = ruleFor(snapshot, quid);

        (tree as any).__result = {
          animationName: box.css.get.animationName(),
          snapshot,
          rule,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("restartName preserves final underscore animationName", r.animationName, ANIM_UNDERSCORE);
        t.eq("current box rule contains final underscore animation-name", r.rule.includes(`animation-name: ${ANIM_UNDERSCORE};`), true);
        t.eq("current box rule does not contain hyphenated final animation-name", r.rule.includes(`animation-name: ${ANIM_HYPHEN};`), false);
      },
    },
    {
      suite: SUITE,
      name: "animation identifier trimming preserves internal underscores",
      dom: true,
      fixture: "css/animation-identifiers",
      sub: "animation-name-trim-only",

      html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.anim.beginName(`  ${ANIM_UNDERSCORE}  `);

        const snapshot = box.css.devSnapshot();
        const quid = (box as any).quid as string;
        const rule = ruleFor(snapshot, quid);

        (tree as any).__result = {
          animationName: box.css.get.animationName(),
          snapshot,
          rule,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("animation name is trimmed", r.animationName, ANIM_UNDERSCORE);
        t.eq("animation name internal underscores are preserved", r.rule.includes(`animation-name: ${ANIM_UNDERSCORE};`), true);
      },
    },
    {
      suite: SUITE,
      name: "hyphenated animation identifiers remain hyphenated",
      dom: true,
      fixture: "css/animation-identifiers",
      sub: "hyphen-name-preserved",

      html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.keyframes.set({
          name: ANIM_HYPHEN,
          steps: {
            from: { opacity: "0" },
            to: { opacity: "1" },
          },
        });

        box.css.anim.beginName(ANIM_HYPHEN);

        const snapshot = box.css.devSnapshot();
        const quid = (box as any).quid as string;
        const rule = ruleFor(snapshot, quid);

        (tree as any).__result = {
          animationName: box.css.get.animationName(),
          hasHyphenKeyframes: snapshot.includes(`@keyframes ${ANIM_HYPHEN}`),
          hasHyphenAnimationName: rule.includes(`animation-name: ${ANIM_HYPHEN};`),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("hyphen animation name remains hyphenated", r.animationName, ANIM_HYPHEN);
        t.eq("hyphen keyframes name remains hyphenated", r.hasHyphenKeyframes, true);
        t.eq("hyphen animation-name value remains hyphenated", r.hasHyphenAnimationName, true);
      },
    },
    {
      suite: SUITE,
      name: "animation property key normalizes but animation name value is untouched",
      dom: true,
      fixture: "css/animation-identifiers",
      sub: "property-key-normalizes-value-untouched",

      html: `
        <main id="root">
          <div id="box">x</div>
        </main>
      `,

      async act(tree) {
        const box = tree.find.must.byId("box");

        box.css.set.animationName(MANUAL_UNDERSCORE);

        const snapshot = box.css.devSnapshot();
        const quid = (box as any).quid as string;
        const rule = ruleFor(snapshot, quid);

        (tree as any).__result = {
          animationName: box.css.get.animationName(),
          rule,
          hasCssProperty: rule.includes(`animation-name: ${MANUAL_UNDERSCORE};`),
          hasCamelProperty: rule.includes(`animationName: ${MANUAL_UNDERSCORE};`),
          hasHyphenatedValue: rule.includes("animation-name: lt-manual-probe-name;"),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("getter preserves manually set underscore animationName value", r.animationName, MANUAL_UNDERSCORE);
        t.eq("snapshot emits normalized CSS property key", r.hasCssProperty, true);
        t.eq("snapshot does not emit camelCase CSS property key", r.hasCamelProperty, false);
        t.eq("snapshot does not hyphenate animation name value", r.hasHyphenatedValue, false);
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}


// ADDED: listener API behavior coverage, especially propagation/default/once/off semantics.
export function livetree_listener_api_surface(): TestSuite {
  const SUITE = "livetree/listen-api-surface";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "listen.onClick and listen.on generic handlers receive native events and bubble normally",
      dom: true,
      fixture: "listen/api",
      sub: "generic-and-convenience-click-bubble",

      html: `
        <main id="root">
          <section id="parent">
            <button id="child">Click</button>
          </section>
        </main>
      `,

      async act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");
        const childEl = child.dom.must.el();

        let parentGeneric = 0;
        let parentConvenience = 0;
        let childGeneric = 0;
        let childConvenience = 0;
        let childEventType = "";
        let childTargetId = "";
        let childCurrentTargetId = "";
        let parentSawChildTarget = false;

        parent.listen.on("click", (ev) => {
          parentGeneric += 1;
          parentSawChildTarget = ev.target instanceof Element && ev.target.id === "child";
        });

        parent.listen.onClick(() => {
          parentConvenience += 1;
        });

        child.listen.on("click", (ev) => {
          childGeneric += 1;
          childEventType = ev.type;
          childTargetId = ev.target instanceof Element ? ev.target.id : "";
          childCurrentTargetId = ev.currentTarget instanceof Element ? ev.currentTarget.id : "";
        });

        child.listen.onClick(() => {
          childConvenience += 1;
        });

        childEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

        (tree as any).__result = {
          parentGeneric,
          parentConvenience,
          childGeneric,
          childConvenience,
          childEventType,
          childTargetId,
          childCurrentTargetId,
          parentSawChildTarget,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("child generic listener fires", r.childGeneric, 1);
        t.eq("child convenience listener fires", r.childConvenience, 1);
        t.eq("parent generic listener receives bubbled click", r.parentGeneric, 1);
        t.eq("parent convenience listener receives bubbled click", r.parentConvenience, 1);
        t.eq("event type is preserved", r.childEventType, "click");
        t.eq("event target is original child", r.childTargetId, "child");
        t.eq("event currentTarget is listener host", r.childCurrentTargetId, "child");
        t.eq("parent sees original child target", r.parentSawChildTarget, true);
      },
    },

    {
      suite: SUITE,
      name: "event.stopPropagation prevents ancestor LiveTree listeners from firing",
      dom: true,
      fixture: "listen/api",
      sub: "stop-propagation-blocks-ancestor",

      html: `
        <main id="root">
          <section id="grandparent">
            <section id="parent">
              <button id="child">Click</button>
            </section>
          </section>
        </main>
      `,

      async act(tree) {
        const grandparent = tree.find.must.byId("grandparent");
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");
        const childEl = child.dom.must.el();

        let childHits = 0;
        let parentHits = 0;
        let grandparentHits = 0;
        let nativeParentHits = 0;

        parent.dom.must.el().addEventListener("pointerdown", () => {
          nativeParentHits += 1;
        });

        grandparent.listen.onPointerDown(() => {
          grandparentHits += 1;
        });

        parent.listen.onPointerDown(() => {
          parentHits += 1;
        });

        child.listen.onPointerDown((ev) => {
          childHits += 1;
          ev.stopPropagation();
        });

        childEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));

        (tree as any).__result = {
          childHits,
          parentHits,
          grandparentHits,
          nativeParentHits,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("child listener fires before stopping", r.childHits, 1);
        t.eq("parent LiveTree listener is blocked by stopPropagation", r.parentHits, 0);
        t.eq("grandparent LiveTree listener is blocked by stopPropagation", r.grandparentHits, 0);
        t.eq("native parent listener is also blocked", r.nativeParentHits, 0);
      },
    },

    {
      suite: SUITE,
      name: "event.stopImmediatePropagation prevents later same-target listeners and ancestors",
      dom: true,
      fixture: "listen/api",
      sub: "stop-immediate-propagation-blocks-same-target",

      html: `
        <main id="root">
          <section id="parent">
            <button id="child">Click</button>
          </section>
        </main>
      `,

      async act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");
        const childEl = child.dom.must.el();

        let firstChildHits = 0;
        let secondChildHits = 0;
        let parentHits = 0;

        parent.listen.onPointerDown(() => {
          parentHits += 1;
        });

        child.listen.onPointerDown((ev) => {
          firstChildHits += 1;
          ev.stopImmediatePropagation();
        });

        child.listen.onPointerDown(() => {
          secondChildHits += 1;
        });

        childEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));

        (tree as any).__result = {
          firstChildHits,
          secondChildHits,
          parentHits,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("first same-target listener fires", r.firstChildHits, 1);
        t.eq("second same-target listener is blocked", r.secondChildHits, 0);
        t.eq("ancestor listener is blocked", r.parentHits, 0);
      },
    },

    {
      suite: SUITE,
      name: "event.preventDefault marks cancelable events as defaultPrevented",
      dom: true,
      fixture: "listen/api",
      sub: "prevent-default",

      html: `
        <main id="root">
          <a id="link" href="#next">Link</a>
        </main>
      `,

      async act(tree) {
        const link = tree.find.must.byId("link");
        const linkEl = link.dom.must.el();

        let listenerSawCancelable = false;
        let listenerSawBeforePrevented = true;
        let listenerSawAfterPrevented = false;

        link.listen.onClick((ev) => {
          listenerSawCancelable = ev.cancelable;
          listenerSawBeforePrevented = ev.defaultPrevented;
          ev.preventDefault();
          listenerSawAfterPrevented = ev.defaultPrevented;
        });

        const event = new MouseEvent("click", { bubbles: true, cancelable: true });
        const dispatchResult = linkEl.dispatchEvent(event);

        (tree as any).__result = {
          listenerSawCancelable,
          listenerSawBeforePrevented,
          listenerSawAfterPrevented,
          finalDefaultPrevented: event.defaultPrevented,
          dispatchResult,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("listener sees cancelable event", r.listenerSawCancelable, true);
        t.eq("listener sees not prevented before preventDefault", r.listenerSawBeforePrevented, false);
        t.eq("listener sees prevented after preventDefault", r.listenerSawAfterPrevented, true);
        t.eq("event remains defaultPrevented after dispatch", r.finalDefaultPrevented, true);
        t.eq("dispatchEvent returns false when default is prevented", r.dispatchResult, false);
      },
    },

    {
      suite: SUITE,
      name: "listen.once removes listener after first event and does not block normal listeners",
      dom: true,
      fixture: "listen/api",
      sub: "once-and-normal-listeners",

      html: `
        <main id="root">
          <button id="button">Click</button>
        </main>
      `,

      async act(tree) {
        const button = tree.find.must.byId("button");
        const buttonEl = button.dom.must.el();

        let onceHits = 0;
        let normalHits = 0;

        button.listen.once().onClick(() => {
          onceHits += 1;
        });

        button.listen.onClick(() => {
          normalHits += 1;
        });

        buttonEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        buttonEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        buttonEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

        (tree as any).__result = {
          onceHits,
          normalHits,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("once listener fires once", r.onceHits, 1);
        t.eq("normal listener fires for every dispatch", r.normalHits, 3);
      },
    },

    {
      suite: SUITE,
      name: "subscription off is idempotent and removes only its own listener",
      dom: true,
      fixture: "listen/api",
      sub: "off-idempotent-single-subscription",

      html: `
        <main id="root">
          <button id="button">Click</button>
        </main>
      `,

      async act(tree) {
        const button = tree.find.must.byId("button");
        const buttonEl = button.dom.must.el();

        let removedHits = 0;
        let keptHits = 0;

        const removed = button.listen.onClick(() => {
          removedHits += 1;
        });

        button.listen.onClick(() => {
          keptHits += 1;
        });

        buttonEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        removed.off();
        removed.off();
        buttonEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

        (tree as any).__result = {
          removedHits,
          keptHits,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("removed listener only fires before off", r.removedHits, 1);
        t.eq("kept listener survives another subscription off", r.keptHits, 2);
      },
    },

    {
      suite: SUITE,
      name: "listen options: capture listener fires before bubble listener and can be removed",
      dom: true,
      fixture: "listen/api",
      sub: "capture-option-order-and-off",

      html: `
        <main id="root">
          <section id="parent">
            <button id="child">Click</button>
          </section>
        </main>
      `,

      async act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");
        const childEl = child.dom.must.el();

        const order: string[] = [];

        const captureSub = parent.listen.capture().on("pointerdown", () => {
          order.push("capture");
        });

        parent.listen.onPointerDown(() => {
          order.push("bubble");
        });

        childEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
        captureSub.off();
        childEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));

        (tree as any).__result = {
          order,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("capture fires before bubble on first dispatch", r.order.slice(0, 2).join(","), "capture,bubble");
        t.eq("capture off removes capture listener only", r.order.join(","), "capture,bubble,bubble");
      },
    },

    {
      suite: SUITE,
      name: "listen options: passive listener receives event without changing target/currentTarget semantics",
      dom: true,
      fixture: "listen/api",
      sub: "passive-option-basic-semantics",

      html: `
        <main id="root">
          <section id="parent">
            <button id="child">Click</button>
          </section>
        </main>
      `,

      async act(tree) {
        const parent = tree.find.must.byId("parent");
        const child = tree.find.must.byId("child");
        const childEl = child.dom.must.el();

        let hits = 0;
        let targetId = "";
        let currentTargetId = "";

        parent.listen.passive().on("pointerdown", (ev) => {
          hits += 1;
          targetId = ev.target instanceof Element ? ev.target.id : "";
          currentTargetId = ev.currentTarget instanceof Element ? ev.currentTarget.id : "";
        });

        childEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));

        (tree as any).__result = {
          hits,
          targetId,
          currentTargetId,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("passive listener fires", r.hits, 1);
        t.eq("passive listener sees original event target", r.targetId, "child");
        t.eq("passive listener sees parent currentTarget", r.currentTargetId, "parent");
      },
    },

    {
      suite: SUITE,
      name: "form and keyboard convenience listeners route expected event types",
      dom: true,
      fixture: "listen/api",
      sub: "input-change-keyboard-convenience",

      html: `
        <main id="root">
          <input id="input" value="a" />
          <button id="button">Click</button>
        </main>
      `,

      async act(tree) {
        const input = tree.find.must.byId("input");
        const button = tree.find.must.byId("button");
        const inputEl = input.dom.must.el();
        const buttonEl = button.dom.must.el();

        let inputHits = 0;
        let changeHits = 0;
        let keyDownHits = 0;
        let keyUpHits = 0;
        let keyDownKey = "";
        let keyUpKey = "";

        input.listen.onInput((ev) => {
          inputHits += 1;
          if (ev.target instanceof HTMLInputElement) ev.target.value = "b";
        });

        input.listen.onChange(() => {
          changeHits += 1;
        });

        button.listen.onKeyDown((ev) => {
          keyDownHits += 1;
          keyDownKey = ev.key;
        });

        button.listen.onKeyUp((ev) => {
          keyUpHits += 1;
          keyUpKey = ev.key;
        });

        inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
        inputEl.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
        buttonEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        buttonEl.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true, cancelable: true }));

        (tree as any).__result = {
          inputHits,
          inputValue: inputEl instanceof HTMLInputElement ? inputEl.value : "",
          changeHits,
          keyDownHits,
          keyUpHits,
          keyDownKey,
          keyUpKey,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("onInput fires", r.inputHits, 1);
        t.eq("onInput receives input target", r.inputValue, "b");
        t.eq("onChange fires", r.changeHits, 1);
        t.eq("onKeyDown fires", r.keyDownHits, 1);
        t.eq("onKeyDown receives key", r.keyDownKey, "Enter");
        t.eq("onKeyUp fires", r.keyUpHits, 1);
        t.eq("onKeyUp receives key", r.keyUpKey, "Escape");
      },
    },

    {
      suite: SUITE,
      name: "document listener receives outside events and off removes it",
      dom: true,
      fixture: "listen/api",
      sub: "document-listener-outside-event-and-off",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");
        const panelEl = panel.dom.must.el();

        let documentHits = 0;
        let documentTargetId = "";

        const sub = panel.listen.document.onPointerDown((ev) => {
          documentHits += 1;
          documentTargetId = ev.target instanceof Element ? ev.target.id : "";
        });

        panelEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
        sub.off();
        panelEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));

        (tree as any).__result = {
          documentHits,
          documentTargetId,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("document pointer listener receives bubbled document event", r.documentHits, 1);
        t.eq("document listener sees original target", r.documentTargetId, "panel");
      },
    },
  ];

  return make_livetree_suite(SUITE, cases);
}
export function livetree_dom_contains_surface(): TestSuite {
  const SUITE = "livetree/dom-contains-surface";

  const cases: readonly LiveTreeCaseSpec[] = [
    {
      suite: SUITE,
      name: "dom.contains supports callable, tree, node, and target for descendants",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-descendant-surfaces",

      html: `
        <main id="root">
          <section id="panel">
            <button id="button">
              <span id="label">Click</span>
            </button>
          </section>
          <aside id="outside">Outside</aside>
        </main>
      `,

      async act(tree) {
        const root = tree.find.must.byId("root");
        const panel = tree.find.must.byId("panel");
        const button = tree.find.must.byId("button");
        const label = tree.find.must.byId("label");
        const outside = tree.find.must.byId("outside");

        const panelEl = panel.dom.must.el();
        const buttonEl = button.dom.must.el();
        const labelEl = label.dom.must.el();
        const outsideEl = outside.dom.must.el();

        (tree as any).__result = {
          legacyPanel: root.dom.contains(panel),
          explicitPanel: root.dom.contains.tree(panel),
          nodePanel: root.dom.contains.node(panelEl),
          targetPanel: root.dom.contains.target(panelEl),

          legacyButton: panel.dom.contains(button),
          explicitButton: panel.dom.contains.tree(button),
          nodeButton: panel.dom.contains.node(buttonEl),
          targetButton: panel.dom.contains.target(buttonEl),

          legacyLabel: panel.dom.contains(label),
          explicitLabel: panel.dom.contains.tree(label),
          nodeLabel: panel.dom.contains.node(labelEl),
          targetLabel: panel.dom.contains.target(labelEl),

          panelContainsOutsideTree: panel.dom.contains(outside),
          panelContainsOutsideTreeExplicit: panel.dom.contains.tree(outside),
          panelContainsOutsideNode: panel.dom.contains.node(outsideEl),
          panelContainsOutsideTarget: panel.dom.contains.target(outsideEl),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("legacy callable contains descendant tree", r.legacyPanel, true);
        t.eq("explicit tree contains descendant tree", r.explicitPanel, true);
        t.eq("node contains descendant element", r.nodePanel, true);
        t.eq("target contains descendant EventTarget element", r.targetPanel, true);

        t.eq("panel legacy contains button tree", r.legacyButton, true);
        t.eq("panel explicit contains button tree", r.explicitButton, true);
        t.eq("panel node contains button element", r.nodeButton, true);
        t.eq("panel target contains button EventTarget", r.targetButton, true);

        t.eq("panel legacy contains nested label tree", r.legacyLabel, true);
        t.eq("panel explicit contains nested label tree", r.explicitLabel, true);
        t.eq("panel node contains nested label element", r.nodeLabel, true);
        t.eq("panel target contains nested label EventTarget", r.targetLabel, true);

        t.eq("panel legacy does not contain sibling tree", r.panelContainsOutsideTree, false);
        t.eq("panel explicit tree does not contain sibling tree", r.panelContainsOutsideTreeExplicit, false);
        t.eq("panel node does not contain sibling element", r.panelContainsOutsideNode, false);
        t.eq("panel target does not contain sibling EventTarget", r.panelContainsOutsideTarget, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains treats self containment consistently",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-self",

      html: `
        <main id="root">
          <section id="panel">
            <button id="button">Click</button>
          </section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");
        const panelEl = panel.dom.must.el();

        (tree as any).__result = {
          legacySelf: panel.dom.contains(panel),
          explicitSelf: panel.dom.contains.tree(panel),
          nodeSelf: panel.dom.contains.node(panelEl),
          targetSelf: panel.dom.contains.target(panelEl),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("legacy callable contains self", r.legacySelf, true);
        t.eq("explicit tree contains self", r.explicitSelf, true);
        t.eq("node contains self element", r.nodeSelf, true);
        t.eq("target contains self EventTarget", r.targetSelf, true);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains.target safely rejects null and non-Node EventTargets",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-target-invalid",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");

        const abort = new AbortController();
        const signal = abort.signal;

        (tree as any).__result = {
          nullTarget: panel.dom.contains.target(null),
          signalTarget: panel.dom.contains.target(signal),
          windowTarget: panel.dom.contains.target(window),
          documentTarget: panel.dom.contains.target(document),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("target rejects null", r.nullTarget, false);
        t.eq("target rejects AbortSignal EventTarget", r.signalTarget, false);
        t.eq("target rejects window EventTarget", r.windowTarget, false);
        t.eq("target rejects document when it is not a Node in this context", r.documentTarget, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains.node handles text nodes and detached nodes",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-node-edge-cases",

      html: `
        <main id="root">
          <section id="panel"><span id="label">hello</span></section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");
        const label = tree.find.must.byId("label");

        const labelEl = label.dom.must.el();
        const textNode = labelEl.firstChild;
        const detached = document.createElement("div");
        const detachedText = document.createTextNode("detached");

        (tree as any).__result = {
          textNodeIsNode: textNode instanceof Node,
          containsTextNode: textNode ? panel.dom.contains.node(textNode) : false,
          containsTextTarget: textNode ? panel.dom.contains.target(textNode) : false,

          containsDetachedElement: panel.dom.contains.node(detached),
          containsDetachedTarget: panel.dom.contains.target(detached),

          containsDetachedText: panel.dom.contains.node(detachedText),
          containsDetachedTextTarget: panel.dom.contains.target(detachedText),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("fixture text child is a Node", r.textNodeIsNode, true);
        t.eq("node contains descendant text node", r.containsTextNode, true);
        t.eq("target contains descendant text EventTarget", r.containsTextTarget, true);

        t.eq("node rejects detached element", r.containsDetachedElement, false);
        t.eq("target rejects detached element EventTarget", r.containsDetachedTarget, false);
        t.eq("node rejects detached text node", r.containsDetachedText, false);
        t.eq("target rejects detached text EventTarget", r.containsDetachedTextTarget, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains works for document-level outside-click style checks",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-outside-click-shape",

      html: `
        <main id="root">
          <section id="dialog">
            <button id="inside-button">Inside</button>
          </section>
          <button id="outside-button">Outside</button>
        </main>
      `,

      async act(tree) {
        const dialog = tree.find.must.byId("dialog");
        const inside = tree.find.must.byId("inside-button");
        const outside = tree.find.must.byId("outside-button");

        const insideEl = inside.dom.must.el();
        const outsideEl = outside.dom.must.el();

        const insideEvent = new PointerEvent("pointerdown", { bubbles: true });
        const outsideEvent = new PointerEvent("pointerdown", { bubbles: true });

        insideEl.dispatchEvent(insideEvent);
        outsideEl.dispatchEvent(outsideEvent);

        (tree as any).__result = {
          insideTargetCheck: dialog.dom.contains.target(insideEvent.target),
          outsideTargetCheck: dialog.dom.contains.target(outsideEvent.target),

          insideNodeCheck: insideEvent.target instanceof Node
            ? dialog.dom.contains.node(insideEvent.target)
            : false,

          outsideNodeCheck: outsideEvent.target instanceof Node
            ? dialog.dom.contains.node(outsideEvent.target)
            : false,
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("dialog contains inside event target", r.insideTargetCheck, true);
        t.eq("dialog does not contain outside event target", r.outsideTargetCheck, false);
        t.eq("dialog contains inside event target after Node narrowing", r.insideNodeCheck, true);
        t.eq("dialog rejects outside event target after Node narrowing", r.outsideNodeCheck, false);
      },
    },

    {
      suite: SUITE,
      name: "dom.contains.tree returns false for tree handles without comparable DOM elements",
      dom: true,
      fixture: "dom/contains",
      sub: "contains-tree-no-dom",

      html: `
        <main id="root">
          <section id="panel">Panel</section>
        </main>
      `,

      async act(tree) {
        const panel = tree.find.must.byId("panel");

        const detachedEl = document.createElement("div");
        const detachedTree = panel.dom.must.treeFromEl(panel.dom.must.el());

        detachedEl.id = "detached";

        (tree as any).__result = {
          comparableCloneContains: panel.dom.contains.tree(detachedTree),
          legacyComparableCloneContains: panel.dom.contains(detachedTree),
          detachedNode: panel.dom.contains.node(detachedEl),
          detachedTarget: panel.dom.contains.target(detachedEl),
        };
      },

      assert(tree, t) {
        const r = (tree as any).__result;

        t.eq("explicit tree contains resolved comparable self tree", r.comparableCloneContains, true);
        t.eq("legacy callable contains resolved comparable self tree", r.legacyComparableCloneContains, true);
        t.eq("node rejects detached DOM element", r.detachedNode, false);
        t.eq("target rejects detached DOM element", r.detachedTarget, false);
      },
    },

  ];

  return make_livetree_suite(SUITE, cases);
}
