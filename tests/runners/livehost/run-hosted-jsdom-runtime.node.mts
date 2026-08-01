import { JSDOM } from "jsdom";
import { make_sanitizer } from "hson-live";
import { HOSTED_TEST_GEOMETRY_SERVICE } from "../../harness/runtimes/dom/hosted-test-geometry";
import { HOSTED_DOM_GLOBAL_NAMES, install_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-runtime";
import {
  with_hosted_dom_lock,
  with_hosted_dom_runtime,
  with_hosted_node_globals,
} from "../../harness/runtimes/dom/hosted-dom-mutex";

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
const geometryServiceBefore = Object.getOwnPropertyDescriptor(globalThis, HOSTED_TEST_GEOMETRY_SERVICE);
const purifierDomA = new JSDOM("<!doctype html><p>A</p>");
const purifierDomB = new JSDOM("<!doctype html><p>B</p>");
const sanitizerA = make_sanitizer(purifierDomA.window as unknown as Window);
const sanitizerAAgain = make_sanitizer(purifierDomA.window as unknown as Window);
const sanitizerB = make_sanitizer(purifierDomB.window as unknown as Window);
expect_runtime(sanitizerA === sanitizerAAgain && sanitizerA !== sanitizerB, "sanitizers cache per window and never cross windows");
purifierDomA.window.close();
expect_runtime(sanitizerB.sanitize("<b>B</b>") === "<b>B</b>", "closing window A does not rebind window B's sanitizer");
purifierDomB.window.close();
const runtime = install_hosted_dom_runtime();
expect_runtime(runtime.document === globalThis.document && runtime.window === globalThis.window, "runtime installs its own window and document");
expect_runtime(new DOMParser().parseFromString("<x/>", "application/xml").documentElement.tagName === "x", "DOMParser is operational");
const multiRootError = new DOMParser().parseFromString("<x/><y/>", "application/xml").querySelector("parsererror")?.textContent ?? "";
expect_runtime(multiRootError.includes("extra content"), "XML parser diagnostics activate the existing HSON multi-root repair pass");
expect_runtime(CSS.supports("display", "grid") && !CSS.supports("color", "light-grey"), "CSS.supports shim delegates declaration validity to jsdom");
expect_runtime(new PointerEvent("pointerdown", { pointerId: 7 }).pointerId === 7, "PointerEvent shim preserves supported identity fields");
const rectElement = runtime.document.createElement("div");
runtime.document.body.append(rectElement);
runtime.geometry.set_element_rect(rectElement, { x: 10, y: 20, width: 100, height: 40 });
const rect = rectElement.getBoundingClientRect();
expect_runtime(
  rect.x === 10 && rect.y === 20 && rect.left === 10 && rect.top === 20
    && rect.right === 110 && rect.bottom === 60 && rect.width === 100 && rect.height === 40,
  "registered DOMRect exposes complete deterministic edges",
);
expect_runtime(typeof rect.toJSON === "function" && rectElement.clientWidth === 100 && rectElement.clientHeight === 40, "registered rectangle supplies DOMRect JSON and client size");
expect_runtime(runtime.document.elementFromPoint(50, 30) === rectElement && runtime.document.elementsFromPoint(50, 30)[0] === rectElement, "point queries use only explicitly registered geometry");
let invalidRectRejected = false;
try {
  runtime.geometry.set_element_rect(rectElement, { x: 0, y: 0, width: Number.NaN, height: 1 });
} catch {
  invalidRectRejected = true;
}
expect_runtime(invalidRectRejected, "non-finite injected geometry is rejected");
const svg = runtime.document.createElementNS("http://www.w3.org/2000/svg", "rect") as SVGElement;
runtime.document.body.append(svg);
runtime.geometry.set_element_rect(svg, { x: 1, y: 2, width: 3, height: 4 });
const svgBox = (svg as SVGElement & { getBBox(): DOMRect }).getBBox();
expect_runtime(svgBox.x === 1 && svgBox.y === 2 && svgBox.width === 3 && svgBox.height === 4, "SVG bbox uses explicit registered geometry");
const foreignDom = new JSDOM("<!doctype html><div></div>");
let foreignRejected = false;
try {
  runtime.geometry.set_element_rect(foreignDom.window.document.querySelector("div")!, { x: 0, y: 0, width: 1, height: 1 });
} catch {
  foreignRejected = true;
}
foreignDom.window.close();
expect_runtime(foreignRejected, "geometry rejects elements owned by another window");
runtime.document.body.innerHTML = "<div id='run-a'></div>";
runtime.reset_document();
expect_runtime(runtime.document.head.childNodes.length === 0 && runtime.document.body.childNodes.length === 0, "reset clears head and body");
expect_runtime(runtime.document.elementFromPoint(50, 30) === null, "reset clears registered point geometry");
const frameOrder: string[] = [];
let finishFrames: (() => void) | undefined;
const framesDone = new Promise<void>((resolve) => { finishFrames = resolve; });
requestAnimationFrame(() => {
  frameOrder.push("a");
  requestAnimationFrame(() => { frameOrder.push("c"); finishFrames?.(); });
});
const cancelledFrame = requestAnimationFrame(() => { frameOrder.push("cancelled"); });
requestAnimationFrame(() => { frameOrder.push("b"); });
cancelAnimationFrame(cancelledFrame);
await Promise.resolve();
expect_runtime(frameOrder.length === 0, "RAF callbacks do not run at the microtask boundary");
await framesDone;
expect_runtime(frameOrder.join(",") === "a,b,c", "RAF shim is FIFO, cancellable, and defers nested frames");
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
expect_runtime(same_descriptor(Object.getOwnPropertyDescriptor(globalThis, HOSTED_TEST_GEOMETRY_SERVICE), geometryServiceBefore), "geometry service descriptor is restored exactly");
let disposedGeometryRejected = false;
try {
  runtime.geometry.set_element_rect(rectElement, { x: 0, y: 0, width: 1, height: 1 });
} catch {
  disposedGeometryRejected = true;
}
expect_runtime(disposedGeometryRejected, "disposed geometry rejects later registration");

let thrownCleanup = false;
try {
  await with_hosted_dom_runtime((owned) => {
    const throwingElement = owned.document.createElement("div");
    owned.document.body.append(throwingElement);
    owned.geometry.set_element_rect(throwingElement, { x: 5, y: 5, width: 5, height: 5 });
    expect_runtime(owned.document.elementFromPoint(6, 6) === throwingElement, "throwing owner has its own geometry");
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
  const element = owned.document.createElement("div");
  owned.document.body.append(element);
  owned.geometry.set_element_rect(element, { x: 1, y: 1, width: 10, height: 10 });
  expect_runtime(owned.document.elementFromPoint(2, 2) === element, "run A resolves its registered rectangle");
  return owned.document;
});
await with_hosted_dom_runtime((owned) => {
  expect_runtime(owned.document !== documentA && owned.document.body.dataset.run === undefined, "sequential runs receive fresh documents");
  expect_runtime(owned.document.elementFromPoint(2, 2) === null, "run B receives no run-A rectangle or hit-test state");
});

console.log("hosted jsdom runtime: ok");
