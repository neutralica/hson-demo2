import { JSDOM } from "jsdom";
import { pathToFileURL } from "node:url";

const modulePath = process.argv[2];
const count = Number(process.argv[3] ?? 100);
if (!modulePath) throw new Error("Pass the absolute hson-live dist/index.js path");
if (typeof globalThis.gc !== "function") throw new Error("Run with node --expose-gc");

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { pretendToBeVisual: true });
const names = [
  "window", "document", "DOMParser", "XMLSerializer", "Node", "Element", "HTMLElement", "SVGElement",
  "Document", "HTMLDivElement", "HTMLButtonElement", "HTMLInputElement", "HTMLTextAreaElement",
  "HTMLSelectElement", "HTMLOptionElement", "HTMLTemplateElement", "HTMLFormElement", "HTMLStyleElement",
  "DocumentFragment", "Text", "Comment", "Attr", "EventTarget", "Event", "CustomEvent", "KeyboardEvent",
  "MouseEvent", "FocusEvent", "InputEvent", "MutationObserver", "DOMTokenList", "NodeList", "HTMLCollection",
  "CSSStyleDeclaration", "CSSRule", "CSSStyleSheet",
];
for (const name of names) {
  const value = name === "window" ? dom.window : name === "document" ? dom.window.document : dom.window[name];
  if (value !== undefined) Object.defineProperty(globalThis, name, { configurable: true, value, writable: true });
}
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: dom.window.getComputedStyle.bind(dom.window) });
Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => true } });
Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (callback) => setTimeout(() => callback(performance.now()), 0) });
Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: clearTimeout });

const { hson } = await import(pathToFileURL(modulePath).href);
const fixture = `<section>${Array.from({ length: 20 }, (_, index) => `<div data-index="${index}"><span>item-${index}</span></div>`).join("")}</section>`;
const collect = () => { for (let index = 0; index < 6; index += 1) globalThis.gc(); };

collect();
const before = process.memoryUsage().heapUsed;
const started = performance.now();
const retained = Array.from({ length: count }, () => hson.liveTree.fromTrustedHtml(fixture));
const constructionMs = performance.now() - started;
collect();

console.log(JSON.stringify({
  count,
  mode: "projection",
  constructionMs,
  retainedHeapBytes: process.memoryUsage().heapUsed - before,
  ownProperties: Object.keys(retained[0].node).length,
  serializedSize: retained[0].content.markup.outerHTML.length,
}));

for (const tree of retained) tree.remove();
dom.window.close();
