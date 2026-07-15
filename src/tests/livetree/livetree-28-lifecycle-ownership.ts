import { hson } from "hson-live";
import {
  _lifecycle_resource_counts_for_owner,
} from "hson-live/diagnostics";
import type { LiveTreeCaseSpec } from "../../app/demos/test/livemap-tests.types";
import type { TestSuite } from "../../app/demos/test/tests.types";
import { make_livetree_suite } from "./make-livetree-suite";

function binding_lifecycle_case(suite: string): LiveTreeCaseSpec {
  let detachPreserved = false;
  let removeTerminated = false;

  return {
    suite,
    name: "LiveMap binding ownership preserves detach and terminates remove",
    dom: true,
    html: `<main><section id="source"><span id="bound"></span></section><section id="target"></section></main>`,
    act(tree) {
      const branch = tree.find.must.byId("bound");
      const target = tree.find.must.byId("target");
      const map = hson.liveMap.fromJson({ label: "initial" });
      const quid = branch.quid;
      let callbacks = 0;

      branch.bind.path(map, ["label"], (owner, value) => {
        callbacks += 1;
        owner.text.set(String(value ?? ""));
      });

      branch.detach();
      map.set(["label"], "detached update");
      detachPreserved = callbacks === 2
        && branch.text.get() === "detached update"
        && _lifecycle_resource_counts_for_owner(quid).binding === 1;

      target.append(branch);
      branch.remove();
      const callbacksAtRemoval = callbacks;
      map.set(["label"], "must not reach disposed branch");
      removeTerminated = callbacks === callbacksAtRemoval
        && _lifecycle_resource_counts_for_owner(quid).total === 0;
    },
    assert(_tree, t) {
      t.eq("detach keeps binding active against detached HSON", detachPreserved, true);
      t.eq("remove unsubscribes before later LiveMap updates", removeTerminated, true);
    },
  };
}

function manual_unsubscribe_case(suite: string): LiveTreeCaseSpec {
  let manualState = false;
  let terminalState = false;

  return {
    suite,
    name: "manual LiveMap unsubscribe unregisters lifecycle ownership idempotently",
    dom: true,
    html: `<main><span id="bound"></span></main>`,
    act(tree) {
      const branch = tree.find.must.byId("bound");
      const map = hson.liveMap.fromJson({ value: "one" });
      const quid = branch.quid;
      let callbacks = 0;
      const off = branch.bind.path(map, ["value"], () => { callbacks += 1; });

      off();
      off();
      map.set(["value"], "two");
      manualState = callbacks === 1
        && _lifecycle_resource_counts_for_owner(quid).binding === 0;

      branch.remove();
      map.set(["value"], "three");
      terminalState = callbacks === 1
        && _lifecycle_resource_counts_for_owner(quid).total === 0;
    },
    assert(_tree, t) {
      t.eq("manual unsubscribe is idempotent and unregisters ownership", manualState, true);
      t.eq("later terminal cleanup does not repeat the binding disposer", terminalState, true);
    },
  };
}

function listener_bookkeeping_case(suite: string): LiveTreeCaseSpec {
  let onceState = false;
  let removedState = false;

  return {
    suite,
    name: "element and ambient listener cleanup keeps ListenerSub state honest",
    dom: true,
    html: `<main><button id="owner">go</button></main>`,
    act(tree) {
      const owner = tree.find.must.byId("owner");
      const quid = owner.quid;
      let calls = 0;
      const elementSub = owner.listen.onClick(() => { calls += 1; });
      const documentSub = owner.listen.document.onCustom("owned-document", () => { calls += 1; });
      const windowSub = owner.listen.window.onCustom("owned-window", () => { calls += 1; });
      const onceSub = owner.listen.once().onClick(() => { calls += 1; });

      owner.dom.must.el().dispatchEvent(new MouseEvent("click"));
      onceState = calls === 2
        && !onceSub.ok
        && onceSub.count === 0
        && _lifecycle_resource_counts_for_owner(quid).listener === 3;

      owner.remove();
      document.dispatchEvent(new Event("owned-document"));
      window.dispatchEvent(new Event("owned-window"));
      elementSub.off();
      documentSub.off();
      windowSub.off();
      removedState = calls === 2
        && !elementSub.ok && elementSub.count === 0
        && !documentSub.ok && documentSub.count === 0
        && !windowSub.ok && windowSub.count === 0
        && _lifecycle_resource_counts_for_owner(quid).total === 0;
    },
    assert(_tree, t) {
      t.eq("native once removal updates subscription and ownership state", onceState, true);
      t.eq("terminal element and ambient cleanup updates every handle", removedState, true);
    },
  };
}

function tree_events_case(suite: string): LiveTreeCaseSpec {
  let detachState = false;
  let removeState = false;

  return {
    suite,
    name: "TreeEvents subscriptions survive detach and terminate on remove",
    dom: true,
    html: `<main><section id="source"><span id="owner"></span></section><section id="target"></section></main>`,
    act(tree) {
      const owner = tree.find.must.byId("owner");
      const target = tree.find.must.byId("target");
      const events = owner.events;
      const quid = owner.quid;
      let calls = 0;
      const off = events.on("tick", () => { calls += 1; });
      events.once("tick", () => { calls += 1; });

      owner.detach();
      events.emit("tick");
      target.append(owner);
      events.emit("tick");
      detachState = calls === 3
        && _lifecycle_resource_counts_for_owner(quid).treeEvent === 1;

      owner.remove();
      off();
      off();
      removeState = _lifecycle_resource_counts_for_owner(quid).total === 0;
    },
    assert(_tree, t) {
      t.eq("TreeEvents subscriptions and once semantics survive detach", detachState, true);
      t.eq("remove clears TreeEvents ownership and manual off stays harmless", removeState, true);
    },
  };
}

function repeated_lifecycle_case(suite: string): LiveTreeCaseSpec {
  let stable = false;

  return {
    suite,
    name: "repeated bind detach reattach remove cycles retain no callbacks",
    dom: true,
    html: `<main><section id="owner"></section></main>`,
    act(tree) {
      const owner = tree.find.must.byId("owner");
      let allStable = true;

      for (let index = 0; index < 12; index += 1) {
        const branch = owner.create.span();
        const map = hson.liveMap.fromJson({ value: index });
        const quid = branch.quid;
        let callbacks = 0;
        branch.bind.path(map, ["value"], () => { callbacks += 1; });
        branch.listen.onCustom("cycle", () => { callbacks += 100; });

        branch.detach();
        map.set(["value"], index + 1);
        owner.append(branch);
        branch.remove();
        map.set(["value"], index + 2);

        allStable = allStable
          && callbacks === 2
          && _lifecycle_resource_counts_for_owner(quid).total === 0;
      }

      stable = allStable;
    },
    assert(_tree, t) {
      t.eq("cycles leave neither callbacks nor lifecycle ownership", stable, true);
    },
  };
}

export function livetree_lifecycle_ownership(): TestSuite {
  const suite = "livetree/lifecycle-ownership";
  return make_livetree_suite(suite, [
    binding_lifecycle_case(suite),
    manual_unsubscribe_case(suite),
    listener_bookkeeping_case(suite),
    tree_events_case(suite),
    repeated_lifecycle_case(suite),
  ]);
}
