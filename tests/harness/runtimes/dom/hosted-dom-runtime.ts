import { JSDOM } from "jsdom";
import { install_hosted_dom_geometry, type HostedDomGeometry } from "./hosted-dom-geometry";
import { install_hosted_canvas_runtime } from "./canvas/hosted-canvas-runtime";
import type { HostedCanvasRuntime } from "./canvas/hosted-canvas.types";

export type HostedDomRuntimeOptions = Readonly<{
  html?: string;
  url?: string;
  beforeInstallGlobal?: (name: string) => void;
}>;

export type HostedDomRuntime = Readonly<{
  window: Window;
  document: Document;
  geometry: HostedDomGeometry;
  canvas: HostedCanvasRuntime;
  reset_document(): void;
  dispose(): void;
}>;

export const HOSTED_DOM_GLOBAL_NAMES = Object.freeze([
  "window", "document", "DOMParser", "XMLSerializer", "Node", "Element", "HTMLElement", "SVGElement",
  "Document", "HTMLDivElement", "HTMLButtonElement", "HTMLInputElement", "HTMLTextAreaElement",
  "HTMLSelectElement", "HTMLOptionElement", "HTMLTemplateElement", "HTMLFormElement", "HTMLStyleElement",
  "HTMLCanvasElement", "CanvasRenderingContext2D",
  "DocumentFragment", "Text", "Comment", "Attr", "EventTarget", "Event", "CustomEvent", "KeyboardEvent",
  "MouseEvent", "FocusEvent", "InputEvent", "MutationObserver", "DOMTokenList", "NodeList", "HTMLCollection",
  "CSSStyleDeclaration", "CSSRule", "CSSStyleSheet", "CSS", "navigator", "getComputedStyle", "PointerEvent", "ResizeObserver",
  "requestAnimationFrame", "cancelAnimationFrame",
] as const);

type GlobalRecord = Readonly<{
  name: string;
  descriptor: PropertyDescriptor | undefined;
}>;

type FrameRequestCallback = (time: number) => void;

type CssSupportsSurface = Readonly<{
  supports(property: string, value: string): boolean;
}>;

function normalize_xml_parser_error(document: Document, input: string): void {
  const error = document.querySelector("parsererror");
  if (error === null) return;
  const message = error.textContent ?? "";
  if (/documents may contain only one root/i.test(message)) {
    error.textContent = `extra content: ${message}`;
    return;
  }
  if (
    /unexpected close tag/i.test(message)
    && /<(?:li|p|td|th|tr|table|thead|tbody|tfoot)\b/i.test(input)
  ) {
    error.textContent = `expected optional HTML end tag (li p td th tr table): ${message}`;
  }
}

function install_value(records: GlobalRecord[], name: string, value: unknown): void {
  records.push({ name, descriptor: Object.getOwnPropertyDescriptor(globalThis, name) });
  Object.defineProperty(globalThis, name, { configurable: true, enumerable: false, writable: true, value });
}

function restore_globals(records: readonly GlobalRecord[]): void {
  for (const record of [...records].reverse()) {
    if (record.descriptor === undefined) delete (globalThis as Record<string, unknown>)[record.name];
    else Object.defineProperty(globalThis, record.name, record.descriptor);
  }
}

export function install_hosted_dom_runtime(options: HostedDomRuntimeOptions = {}): HostedDomRuntime {
  const dom = new JSDOM(
    options.html ?? "<!doctype html><html><head></head><body></body></html>",
    { url: options.url ?? "http://hosted-test.local/", pretendToBeVisual: true },
  );
  const window = dom.window;
  const NativeDOMParser = window.DOMParser;
  const HostedDOMParser = class {
    parseFromString(input: string, type: DOMParserSupportedType): Document {
      const parsed = new NativeDOMParser().parseFromString(input, type);
      if (type === "application/xml" || type === "text/xml" || type === "image/svg+xml") {
        normalize_xml_parser_error(parsed, input);
      }
      return parsed;
    }
  };
  const validationStyle = window.document.createElement("div").style;
  const cssSupportCache = new Map<string, boolean>();
  const hostedCss: CssSupportsSurface = Object.freeze({
    supports(property: string, value: string): boolean {
      const key = `${property}\u0000${value}`;
      const cached = cssSupportCache.get(key);
      if (cached !== undefined) return cached;
      try {
        validationStyle.removeProperty(property);
        validationStyle.setProperty(property, value);
        const supported = validationStyle.getPropertyValue(property) !== "";
        validationStyle.removeProperty(property);
        cssSupportCache.set(key, supported);
        return supported;
      } catch {
        cssSupportCache.set(key, false);
        return false;
      }
    },
  });
  const HostedPointerEvent = class extends window.MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? false;
    }
  };
  const records: GlobalRecord[] = [];
  let geometry: HostedDomGeometry | undefined;
  let canvas: HostedCanvasRuntime | undefined;
  try {
    geometry = install_hosted_dom_geometry(window);
    canvas = install_hosted_canvas_runtime(window);
  } catch (error) {
    geometry?.dispose();
    window.close();
    throw error;
  }
  if (geometry === undefined || canvas === undefined) {
    window.close();
    throw new Error("Hosted DOM runtime failed to install its deterministic capabilities.");
  }
  let disposed = false;
  let nextFrameId = 0;
  const pendingFrames = new Map<number, ReturnType<typeof setImmediate>>();
  const requestAnimationFrame = (callback: FrameRequestCallback): number => {
    nextFrameId += 1;
    const id = nextFrameId;
    const timer = setImmediate(() => {
      pendingFrames.delete(id);
      if (!disposed) callback(performance.now());
    });
    pendingFrames.set(id, timer);
    return id;
  };
  const cancelAnimationFrame = (id: number): void => {
    const timer = pendingFrames.get(id);
    if (timer === undefined) return;
    clearImmediate(timer);
    pendingFrames.delete(id);
  };

  try {
    const globals: readonly Readonly<[string, unknown]>[] = [
      ["window", window], ["document", window.document], ["DOMParser", HostedDOMParser],
      ["XMLSerializer", window.XMLSerializer], ["Node", window.Node], ["Element", window.Element],
      ["HTMLElement", window.HTMLElement], ["SVGElement", window.SVGElement], ["Document", window.Document],
      ["HTMLDivElement", window.HTMLDivElement], ["HTMLButtonElement", window.HTMLButtonElement],
      ["HTMLInputElement", window.HTMLInputElement], ["HTMLTextAreaElement", window.HTMLTextAreaElement],
      ["HTMLSelectElement", window.HTMLSelectElement], ["HTMLOptionElement", window.HTMLOptionElement],
      ["HTMLTemplateElement", window.HTMLTemplateElement], ["HTMLFormElement", window.HTMLFormElement],
      ["HTMLStyleElement", window.HTMLStyleElement],
      ["HTMLCanvasElement", window.HTMLCanvasElement], ["CanvasRenderingContext2D", canvas.CanvasRenderingContext2D],
      ["DocumentFragment", window.DocumentFragment], ["Text", window.Text], ["Comment", window.Comment],
      ["Attr", window.Attr], ["EventTarget", window.EventTarget], ["Event", window.Event],
      ["CustomEvent", window.CustomEvent], ["KeyboardEvent", window.KeyboardEvent], ["MouseEvent", window.MouseEvent],
      ["FocusEvent", window.FocusEvent], ["InputEvent", window.InputEvent], ["MutationObserver", window.MutationObserver],
      ["DOMTokenList", window.DOMTokenList], ["NodeList", window.NodeList], ["HTMLCollection", window.HTMLCollection],
      ["CSSStyleDeclaration", window.CSSStyleDeclaration], ["CSSRule", window.CSSRule],
      ["CSSStyleSheet", window.CSSStyleSheet], ["CSS", hostedCss],
      ["navigator", window.navigator], ["getComputedStyle", window.getComputedStyle.bind(window)],
      ["PointerEvent", HostedPointerEvent], ["ResizeObserver", window.ResizeObserver],
      ["requestAnimationFrame", requestAnimationFrame], ["cancelAnimationFrame", cancelAnimationFrame],
    ];
    if (globals.map(([name]) => name).join("\n") !== HOSTED_DOM_GLOBAL_NAMES.join("\n")) {
      throw new Error("Hosted DOM global installation list is inconsistent.");
    }
    Object.defineProperty(window, "DOMParser", { configurable: true, value: HostedDOMParser });
    Object.defineProperty(window, "CSS", { configurable: true, value: hostedCss });
    for (const [name, value] of globals) {
      options.beforeInstallGlobal?.(name);
      install_value(records, name, value);
    }
    Object.defineProperty(window, "PointerEvent", { configurable: true, value: HostedPointerEvent });
    Object.defineProperty(window, "requestAnimationFrame", { configurable: true, value: requestAnimationFrame });
    Object.defineProperty(window, "cancelAnimationFrame", { configurable: true, value: cancelAnimationFrame });
  } catch (error) {
    restore_globals(records);
    canvas.dispose();
    geometry.dispose();
    window.close();
    throw error;
  }

  return Object.freeze({
    window,
    document: window.document,
    geometry,
    canvas,
    reset_document() {
      if (disposed) throw new Error("Hosted DOM runtime is disposed.");
      geometry.clear_all_element_rects();
      canvas.clear_all_canvases();
      window.document.head.replaceChildren();
      window.document.body.replaceChildren();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const timer of pendingFrames.values()) clearImmediate(timer);
      pendingFrames.clear();
      canvas.dispose();
      geometry.dispose();
      restore_globals(records);
      window.close();
    },
  });
}
