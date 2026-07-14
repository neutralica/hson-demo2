import { JSDOM } from "jsdom";

export type HostedDomRuntimeOptions = Readonly<{
  html?: string;
  url?: string;
  beforeInstallGlobal?: (name: string) => void;
}>;

export type HostedDomRuntime = Readonly<{
  window: Window;
  document: Document;
  reset_document(): void;
  dispose(): void;
}>;

export const HOSTED_DOM_GLOBAL_NAMES = Object.freeze([
  "window", "document", "DOMParser", "XMLSerializer", "Node", "Element", "HTMLElement", "SVGElement",
  "Document", "HTMLDivElement", "HTMLButtonElement", "HTMLInputElement", "HTMLTextAreaElement",
  "HTMLSelectElement", "HTMLOptionElement", "HTMLTemplateElement", "HTMLFormElement", "HTMLStyleElement",
  "DocumentFragment", "Text", "Comment", "Attr", "EventTarget", "Event", "CustomEvent", "KeyboardEvent",
  "MouseEvent", "FocusEvent", "InputEvent", "MutationObserver", "DOMTokenList", "NodeList", "HTMLCollection",
  "CSSStyleDeclaration", "CSSRule", "CSSStyleSheet", "navigator", "getComputedStyle", "PointerEvent",
  "requestAnimationFrame", "cancelAnimationFrame",
] as const);

type GlobalRecord = Readonly<{
  name: string;
  descriptor: PropertyDescriptor | undefined;
}>;

type FrameRequestCallback = (time: number) => void;

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
  let disposed = false;
  let nextFrameId = 0;
  const cancelledFrames = new Set<number>();
  const requestAnimationFrame = (callback: FrameRequestCallback): number => {
    nextFrameId += 1;
    const id = nextFrameId;
    queueMicrotask(() => {
      if (!disposed && !cancelledFrames.has(id)) callback(performance.now());
      cancelledFrames.delete(id);
    });
    return id;
  };
  const cancelAnimationFrame = (id: number): void => { cancelledFrames.add(id); };

  try {
    const globals: readonly Readonly<[string, unknown]>[] = [
      ["window", window], ["document", window.document], ["DOMParser", window.DOMParser],
      ["XMLSerializer", window.XMLSerializer], ["Node", window.Node], ["Element", window.Element],
      ["HTMLElement", window.HTMLElement], ["SVGElement", window.SVGElement], ["Document", window.Document],
      ["HTMLDivElement", window.HTMLDivElement], ["HTMLButtonElement", window.HTMLButtonElement],
      ["HTMLInputElement", window.HTMLInputElement], ["HTMLTextAreaElement", window.HTMLTextAreaElement],
      ["HTMLSelectElement", window.HTMLSelectElement], ["HTMLOptionElement", window.HTMLOptionElement],
      ["HTMLTemplateElement", window.HTMLTemplateElement], ["HTMLFormElement", window.HTMLFormElement],
      ["HTMLStyleElement", window.HTMLStyleElement],
      ["DocumentFragment", window.DocumentFragment], ["Text", window.Text], ["Comment", window.Comment],
      ["Attr", window.Attr], ["EventTarget", window.EventTarget], ["Event", window.Event],
      ["CustomEvent", window.CustomEvent], ["KeyboardEvent", window.KeyboardEvent], ["MouseEvent", window.MouseEvent],
      ["FocusEvent", window.FocusEvent], ["InputEvent", window.InputEvent], ["MutationObserver", window.MutationObserver],
      ["DOMTokenList", window.DOMTokenList], ["NodeList", window.NodeList], ["HTMLCollection", window.HTMLCollection],
      ["CSSStyleDeclaration", window.CSSStyleDeclaration], ["CSSRule", window.CSSRule],
      ["CSSStyleSheet", window.CSSStyleSheet],
      ["navigator", window.navigator], ["getComputedStyle", window.getComputedStyle.bind(window)],
      ["PointerEvent", HostedPointerEvent],
      ["requestAnimationFrame", requestAnimationFrame], ["cancelAnimationFrame", cancelAnimationFrame],
    ];
    if (globals.map(([name]) => name).join("\n") !== HOSTED_DOM_GLOBAL_NAMES.join("\n")) {
      throw new Error("Hosted DOM global installation list is inconsistent.");
    }
    for (const [name, value] of globals) {
      options.beforeInstallGlobal?.(name);
      install_value(records, name, value);
    }
    Object.defineProperty(window, "PointerEvent", { configurable: true, value: HostedPointerEvent });
    Object.defineProperty(window, "requestAnimationFrame", { configurable: true, value: requestAnimationFrame });
    Object.defineProperty(window, "cancelAnimationFrame", { configurable: true, value: cancelAnimationFrame });
  } catch (error) {
    restore_globals(records);
    window.close();
    throw error;
  }

  return Object.freeze({
    window,
    document: window.document,
    reset_document() {
      if (disposed) throw new Error("Hosted DOM runtime is disposed.");
      window.document.head.replaceChildren();
      window.document.body.replaceChildren();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelledFrames.clear();
      restore_globals(records);
      window.close();
    },
  });
}
