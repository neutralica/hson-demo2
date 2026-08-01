import {
  HOSTED_TEST_GEOMETRY_SERVICE,
  type HostedTestElementRect,
} from "../../app/demos/test/hosted-test-geometry";

export type HostedElementRect = HostedTestElementRect;

export type HostedDomGeometry = Readonly<{
  set_element_rect(element: Element, rect: HostedElementRect): void;
  clear_element_rect(element: Element): void;
  clear_all_element_rects(): void;
  dispose(): void;
}>;

type PrototypeRecord = Readonly<{
  target: object;
  key: PropertyKey;
  descriptor: PropertyDescriptor | undefined;
}>;

function assert_rect(rect: HostedElementRect): void {
  const values = Object.freeze([
    ["x", rect.x], ["y", rect.y], ["width", rect.width], ["height", rect.height],
  ] as const);
  for (const [key, value] of values) {
    if (!Number.isFinite(value)) throw new TypeError(`Hosted element rect ${key} must be finite.`);
  }
  if (rect.width < 0 || rect.height < 0) {
    throw new RangeError("Hosted element rect width and height must be non-negative.");
  }
}

function restore(records: readonly PrototypeRecord[]): void {
  for (const record of [...records].reverse()) {
    if (record.descriptor === undefined) Reflect.deleteProperty(record.target, record.key);
    else Object.defineProperty(record.target, record.key, record.descriptor);
  }
}

/** Install explicit geometry only for elements registered by the owning hosted DOM action. */
export function install_hosted_dom_geometry(window: Window & typeof globalThis): HostedDomGeometry {
  let rects = new WeakMap<Element, HostedElementRect>();
  const orderedElements = new Set<Element>();
  const records: PrototypeRecord[] = [];
  const serviceDescriptor = Object.getOwnPropertyDescriptor(globalThis, HOSTED_TEST_GEOMETRY_SERVICE);
  let disposed = false;

  const originalBoundingRect = window.Element.prototype.getBoundingClientRect;
  const clientWidthDescriptor = Object.getOwnPropertyDescriptor(window.Element.prototype, "clientWidth");
  const clientHeightDescriptor = Object.getOwnPropertyDescriptor(window.Element.prototype, "clientHeight");
  const originalSvgBBox = Object.getOwnPropertyDescriptor(window.SVGElement.prototype, "getBBox");
  const originalElementFromPoint = Object.getOwnPropertyDescriptor(window.Document.prototype, "elementFromPoint");
  const originalElementsFromPoint = Object.getOwnPropertyDescriptor(window.Document.prototype, "elementsFromPoint");

  const remember = (target: object, key: PropertyKey): void => {
    records.push({ target, key, descriptor: Object.getOwnPropertyDescriptor(target, key) });
  };
  const rect_for = (element: Element): DOMRect | undefined => {
    const rect = rects.get(element);
    return rect === undefined ? undefined : new window.DOMRect(rect.x, rect.y, rect.width, rect.height);
  };
  const hits_at = (document: Document, x: number, y: number): Element[] => [...orderedElements]
    .filter((element) => element.ownerDocument === document && element.isConnected)
    .filter((element) => {
      const rect = rects.get(element);
      return rect !== undefined
        && x >= rect.x
        && x <= rect.x + rect.width
        && y >= rect.y
        && y <= rect.y + rect.height;
    })
    .reverse();

  try {
    Object.defineProperty(globalThis, HOSTED_TEST_GEOMETRY_SERVICE, {
      configurable: true,
      value: Object.freeze({
        set_element_rect(element: Element, rect: HostedElementRect): void {
          api.set_element_rect(element, rect);
        },
      }),
    });
    remember(window.Element.prototype, "getBoundingClientRect");
    Object.defineProperty(window.Element.prototype, "getBoundingClientRect", {
      configurable: true,
      writable: true,
      value(this: Element): DOMRect {
        return rect_for(this) ?? originalBoundingRect.call(this);
      },
    });

    remember(window.Element.prototype, "clientWidth");
    Object.defineProperty(window.Element.prototype, "clientWidth", {
      configurable: true,
      get(this: Element): number {
        return rects.get(this)?.width ?? clientWidthDescriptor?.get?.call(this) ?? 0;
      },
    });
    remember(window.Element.prototype, "clientHeight");
    Object.defineProperty(window.Element.prototype, "clientHeight", {
      configurable: true,
      get(this: Element): number {
        return rects.get(this)?.height ?? clientHeightDescriptor?.get?.call(this) ?? 0;
      },
    });

    remember(window.SVGElement.prototype, "getBBox");
    Object.defineProperty(window.SVGElement.prototype, "getBBox", {
      configurable: true,
      writable: true,
      value(this: SVGElement): DOMRect {
        const registered = rect_for(this);
        if (registered !== undefined) return registered;
        if (typeof originalSvgBBox?.value === "function") {
          return Reflect.apply(originalSvgBBox.value, this, []) as DOMRect;
        }
        throw new Error("Hosted SVG geometry requires an explicit element rectangle.");
      },
    });

    remember(window.Document.prototype, "elementFromPoint");
    Object.defineProperty(window.Document.prototype, "elementFromPoint", {
      configurable: true,
      writable: true,
      value(this: Document, x: number, y: number): Element | null {
        return hits_at(this, x, y)[0] ?? (
          typeof originalElementFromPoint?.value === "function"
            ? Reflect.apply(originalElementFromPoint.value, this, [x, y]) as Element | null
            : null
        );
      },
    });
    remember(window.Document.prototype, "elementsFromPoint");
    Object.defineProperty(window.Document.prototype, "elementsFromPoint", {
      configurable: true,
      writable: true,
      value(this: Document, x: number, y: number): Element[] {
        const registered = hits_at(this, x, y);
        if (registered.length > 0) return registered;
        return typeof originalElementsFromPoint?.value === "function"
          ? Reflect.apply(originalElementsFromPoint.value, this, [x, y]) as Element[]
          : [];
      },
    });
  } catch (error) {
    if (serviceDescriptor === undefined) Reflect.deleteProperty(globalThis, HOSTED_TEST_GEOMETRY_SERVICE);
    else Object.defineProperty(globalThis, HOSTED_TEST_GEOMETRY_SERVICE, serviceDescriptor);
    restore(records);
    throw error;
  }

  const api: HostedDomGeometry = Object.freeze({
    set_element_rect(element, rect) {
      if (disposed) throw new Error("Hosted DOM geometry is disposed.");
      if (element.ownerDocument.defaultView !== window) {
        throw new Error("Hosted element rect belongs to a different window.");
      }
      assert_rect(rect);
      const detached = Object.freeze({ ...rect });
      rects.set(element, detached);
      orderedElements.delete(element);
      orderedElements.add(element);
    },
    clear_element_rect(element) {
      if (disposed) return;
      rects.delete(element);
      orderedElements.delete(element);
    },
    clear_all_element_rects() {
      if (disposed) return;
      rects = new WeakMap<Element, HostedElementRect>();
      orderedElements.clear();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      rects = new WeakMap<Element, HostedElementRect>();
      orderedElements.clear();
      restore(records);
      if (serviceDescriptor === undefined) Reflect.deleteProperty(globalThis, HOSTED_TEST_GEOMETRY_SERVICE);
      else Object.defineProperty(globalThis, HOSTED_TEST_GEOMETRY_SERVICE, serviceDescriptor);
    },
  });
  return api;
}
