import { HOSTED_DOM_GLOBAL_NAMES, install_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-runtime";
import {
  with_hosted_dom_lock,
  with_hosted_dom_runtime,
  with_hosted_node_globals,
} from "../../hosted-test/dom/hosted-dom-mutex";

function expect_runtime(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted jsdom runtime: ${message}`);
}

function same_descriptor(left: PropertyDescriptor | undefined, right: PropertyDescriptor | undefined): boolean {
  if (left === undefined || right === undefined) return left === right;
  return left.configurable === right.configurable
    && left.enumerable === right.enumerable
    && left.writable === right.writable
    && Object.is(left.value, right.value)
    && Object.is(left.get, right.get)
    && Object.is(left.set, right.set);
}

const before = new Map(HOSTED_DOM_GLOBAL_NAMES.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const runtime = install_hosted_dom_runtime();
expect_runtime(runtime.document === globalThis.document && runtime.window === globalThis.window, "runtime installs its own window and document");
expect_runtime(new DOMParser().parseFromString("<x/>", "application/xml").documentElement.tagName === "x", "DOMParser is operational");
expect_runtime(new PointerEvent("pointerdown", { pointerId: 7 }).pointerId === 7, "PointerEvent shim preserves supported identity fields");
runtime.document.body.innerHTML = "<div id='run-a'></div>";
runtime.reset_document();
expect_runtime(runtime.document.head.childNodes.length === 0 && runtime.document.body.childNodes.length === 0, "reset clears head and body");
let frameCalled = false;
requestAnimationFrame(() => { frameCalled = true; });
runtime.dispose();
runtime.dispose();
await Promise.resolve();
expect_runtime(!frameCalled, "disposed runtime cancels queued animation frames");
for (const name of HOSTED_DOM_GLOBAL_NAMES) {
  expect_runtime(
    same_descriptor(Object.getOwnPropertyDescriptor(globalThis, name), before.get(name)),
    `${name} descriptor is restored exactly`,
  );
}

let thrownCleanup = false;
try {
  await with_hosted_dom_runtime((owned) => {
    owned.document.body.dataset.throwing = "yes";
    throw new Error("synthetic DOM runner failure");
  });
} catch (error) {
  thrownCleanup = error instanceof Error && error.message === "synthetic DOM runner failure";
}
expect_runtime(thrownCleanup && typeof window === "undefined" && typeof document === "undefined", "throwing run restores globals");

let partialFailed = false;
try {
  install_hosted_dom_runtime({
    beforeInstallGlobal(name) {
      if (name === "Node") throw new Error("synthetic partial installation failure");
    },
  });
} catch (error) {
  partialFailed = error instanceof Error && error.message === "synthetic partial installation failure";
}
expect_runtime(partialFailed && typeof window === "undefined" && typeof document === "undefined", "partial installation restores earlier globals");
for (const name of HOSTED_DOM_GLOBAL_NAMES) {
  expect_runtime(same_descriptor(Object.getOwnPropertyDescriptor(globalThis, name), before.get(name)), `partial failure restores ${name}`);
}

const order: string[] = [];
let releaseFirstDom: (() => void) | undefined;
const firstDomGate = new Promise<void>((resolve) => { releaseFirstDom = resolve; });
const firstDom = with_hosted_dom_lock(async () => {
  order.push("dom-a:start");
  await firstDomGate;
  order.push("dom-a:end");
});
const secondDom = with_hosted_dom_lock(() => { order.push("dom-b"); });
await Promise.resolve();
expect_runtime(order.join(",") === "dom-a:start", "second DOM owner waits for the first");
releaseFirstDom?.();
await Promise.all([firstDom, secondDom]);
expect_runtime(order.join(",") === "dom-a:start,dom-a:end,dom-b", "DOM owners execute serially");

const readers: string[] = [];
let releaseReader: (() => void) | undefined;
const readerGate = new Promise<void>((resolve) => { releaseReader = resolve; });
const readerA = with_hosted_node_globals(async () => { readers.push("a"); await readerGate; });
const readerB = with_hosted_node_globals(() => { readers.push("b"); });
await Promise.resolve();
expect_runtime(readers.includes("a") && readers.includes("b"), "non-DOM readers retain concurrency");
releaseReader?.();
await Promise.all([readerA, readerB]);

const documentA = await with_hosted_dom_runtime((owned) => {
  owned.document.body.dataset.run = "a";
  return owned.document;
});
await with_hosted_dom_runtime((owned) => {
  expect_runtime(owned.document !== documentA && owned.document.body.dataset.run === undefined, "sequential runs receive fresh documents");
});

console.log("hosted jsdom runtime: ok");
