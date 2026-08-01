import {
  HOSTED_TEST_RESIZE_SERVICE,
  type HostedTestResizeService,
} from "../../../app/demos/test/hosted-test-geometry";
import {
  HostedCanvasUnsupportedError,
  type HostedCanvasCommand,
  type HostedCanvasMatrix,
  type HostedCanvasPathCommand,
  type HostedCanvasRuntime,
  type HostedCanvasState,
} from "./hosted-canvas.types";

type MutableCanvasState = {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  direction: CanvasDirection;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;
  transform: HostedCanvasMatrix;
};

type PrototypeRecord = Readonly<{
  target: object;
  key: PropertyKey;
  descriptor: PropertyDescriptor | undefined;
}>;

const IDENTITY: HostedCanvasMatrix = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`Hosted canvas ${label} must be finite.`);
  return value;
}

function matrix(a: number, b: number, c: number, d: number, e: number, f: number): HostedCanvasMatrix {
  return Object.freeze({
    a: finite(a, "matrix.a"), b: finite(b, "matrix.b"), c: finite(c, "matrix.c"),
    d: finite(d, "matrix.d"), e: finite(e, "matrix.e"), f: finite(f, "matrix.f"),
  });
}

function multiply(left: HostedCanvasMatrix, right: HostedCanvasMatrix): HostedCanvasMatrix {
  return matrix(
    left.a * right.a + left.c * right.b,
    left.b * right.a + left.d * right.b,
    left.a * right.c + left.c * right.d,
    left.b * right.c + left.d * right.d,
    left.a * right.e + left.c * right.f + left.e,
    left.b * right.e + left.d * right.f + left.f,
  );
}

function make_state(): MutableCanvasState {
  return {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    miterLimit: 10,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    direction: "inherit",
    shadowBlur: 0,
    shadowColor: "rgba(0, 0, 0, 0)",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "low",
    transform: IDENTITY,
  };
}

function copy_state(source: MutableCanvasState): MutableCanvasState {
  return { ...source, transform: matrix(
    source.transform.a, source.transform.b, source.transform.c,
    source.transform.d, source.transform.e, source.transform.f,
  ) };
}

function snapshot_state(source: MutableCanvasState): HostedCanvasState {
  return Object.freeze(copy_state(source));
}

function snapshot_path(path: readonly HostedCanvasPathCommand[]): readonly HostedCanvasPathCommand[] {
  return Object.freeze(path.map((command) => Object.freeze({ ...command })));
}

function restore(records: readonly PrototypeRecord[]): void {
  for (const record of [...records].reverse()) {
    if (record.descriptor === undefined) Reflect.deleteProperty(record.target, record.key);
    else Object.defineProperty(record.target, record.key, record.descriptor);
  }
}

/** Install a deterministic command/state recorder. It intentionally performs no rasterization. */
export function install_hosted_canvas_runtime(window: Window & typeof globalThis): HostedCanvasRuntime {
  let contexts = new WeakMap<HTMLCanvasElement, HostedContext2D>();
  const canvases = new Set<HTMLCanvasElement>();
  const observers = new Set<HostedResizeObserver>();
  const records: PrototypeRecord[] = [];
  const resizeServiceDescriptor = Object.getOwnPropertyDescriptor(globalThis, HOSTED_TEST_RESIZE_SERVICE);
  let disposed = false;

  class HostedContext2D {
    readonly canvas: HTMLCanvasElement;
    private state = make_state();
    private readonly stack: MutableCanvasState[] = [];
    private path: HostedCanvasPathCommand[] = [];
    private commands: HostedCanvasCommand[] = [];

    constructor(canvas: HTMLCanvasElement) {
      this.canvas = canvas;
    }

    get fillStyle(): string { return this.state.fillStyle; }
    set fillStyle(value: string | CanvasGradient | CanvasPattern) { this.state.fillStyle = String(value); }
    get strokeStyle(): string { return this.state.strokeStyle; }
    set strokeStyle(value: string | CanvasGradient | CanvasPattern) { this.state.strokeStyle = String(value); }
    get lineWidth(): number { return this.state.lineWidth; }
    set lineWidth(value: number) { if (Number.isFinite(value) && value > 0) this.state.lineWidth = value; }
    get lineCap(): CanvasLineCap { return this.state.lineCap; }
    set lineCap(value: CanvasLineCap) { this.state.lineCap = value; }
    get lineJoin(): CanvasLineJoin { return this.state.lineJoin; }
    set lineJoin(value: CanvasLineJoin) { this.state.lineJoin = value; }
    get miterLimit(): number { return this.state.miterLimit; }
    set miterLimit(value: number) { if (Number.isFinite(value) && value > 0) this.state.miterLimit = value; }
    get globalAlpha(): number { return this.state.globalAlpha; }
    set globalAlpha(value: number) { if (Number.isFinite(value) && value >= 0 && value <= 1) this.state.globalAlpha = value; }
    get globalCompositeOperation(): GlobalCompositeOperation { return this.state.globalCompositeOperation; }
    set globalCompositeOperation(value: GlobalCompositeOperation) { this.state.globalCompositeOperation = value; }
    get font(): string { return this.state.font; }
    set font(value: string) { this.state.font = value; }
    get textAlign(): CanvasTextAlign { return this.state.textAlign; }
    set textAlign(value: CanvasTextAlign) { this.state.textAlign = value; }
    get textBaseline(): CanvasTextBaseline { return this.state.textBaseline; }
    set textBaseline(value: CanvasTextBaseline) { this.state.textBaseline = value; }
    get direction(): CanvasDirection { return this.state.direction; }
    set direction(value: CanvasDirection) { this.state.direction = value; }
    get shadowBlur(): number { return this.state.shadowBlur; }
    set shadowBlur(value: number) { if (Number.isFinite(value) && value >= 0) this.state.shadowBlur = value; }
    get shadowColor(): string { return this.state.shadowColor; }
    set shadowColor(value: string) { this.state.shadowColor = value; }
    get shadowOffsetX(): number { return this.state.shadowOffsetX; }
    set shadowOffsetX(value: number) { if (Number.isFinite(value)) this.state.shadowOffsetX = value; }
    get shadowOffsetY(): number { return this.state.shadowOffsetY; }
    set shadowOffsetY(value: number) { if (Number.isFinite(value)) this.state.shadowOffsetY = value; }
    get imageSmoothingEnabled(): boolean { return this.state.imageSmoothingEnabled; }
    set imageSmoothingEnabled(value: boolean) { this.state.imageSmoothingEnabled = Boolean(value); }
    get imageSmoothingQuality(): ImageSmoothingQuality { return this.state.imageSmoothingQuality; }
    set imageSmoothingQuality(value: ImageSmoothingQuality) { this.state.imageSmoothingQuality = value; }

    reset(): void {
      this.state = make_state();
      this.stack.length = 0;
      this.path = [];
      this.commands = [];
    }

    command_snapshot(): readonly HostedCanvasCommand[] {
      return Object.freeze([...this.commands]);
    }

    clear_command_history(): void { this.commands = []; }

    private record(command: HostedCanvasCommand): void { this.commands.push(Object.freeze(command)); }

    save(): void {
      this.stack.push(copy_state(this.state));
      this.record({ kind: "save" });
    }

    restore(): void {
      const prior = this.stack.pop();
      if (prior !== undefined) this.state = prior;
      this.record({ kind: "restore" });
    }

    beginPath(): void {
      this.path = [];
      this.record({ kind: "beginPath" });
    }

    closePath(): void { this.path.push(Object.freeze({ kind: "closePath" })); }
    moveTo(x: number, y: number): void { this.path.push(Object.freeze({ kind: "moveTo", x: finite(x, "moveTo.x"), y: finite(y, "moveTo.y") })); }
    lineTo(x: number, y: number): void { this.path.push(Object.freeze({ kind: "lineTo", x: finite(x, "lineTo.x"), y: finite(y, "lineTo.y") })); }
    rect(x: number, y: number, width: number, height: number): void {
      this.path.push(Object.freeze({ kind: "rect", x: finite(x, "rect.x"), y: finite(y, "rect.y"), width: finite(width, "rect.width"), height: finite(height, "rect.height") }));
    }
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise = false): void {
      if (radius < 0) throw new RangeError("Hosted canvas arc radius must be non-negative.");
      this.path.push(Object.freeze({ kind: "arc", x: finite(x, "arc.x"), y: finite(y, "arc.y"), radius: finite(radius, "arc.radius"), startAngle: finite(startAngle, "arc.startAngle"), endAngle: finite(endAngle, "arc.endAngle"), counterclockwise }));
    }
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise = false): void {
      if (radiusX < 0 || radiusY < 0) throw new RangeError("Hosted canvas ellipse radii must be non-negative.");
      this.path.push(Object.freeze({ kind: "ellipse", x: finite(x, "ellipse.x"), y: finite(y, "ellipse.y"), radiusX: finite(radiusX, "ellipse.radiusX"), radiusY: finite(radiusY, "ellipse.radiusY"), rotation: finite(rotation, "ellipse.rotation"), startAngle: finite(startAngle, "ellipse.startAngle"), endAngle: finite(endAngle, "ellipse.endAngle"), counterclockwise }));
    }
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
      this.path.push(Object.freeze({ kind: "quadraticCurveTo", cpx: finite(cpx, "quadraticCurveTo.cpx"), cpy: finite(cpy, "quadraticCurveTo.cpy"), x: finite(x, "quadraticCurveTo.x"), y: finite(y, "quadraticCurveTo.y") }));
    }
    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
      this.path.push(Object.freeze({ kind: "bezierCurveTo", cp1x: finite(cp1x, "bezierCurveTo.cp1x"), cp1y: finite(cp1y, "bezierCurveTo.cp1y"), cp2x: finite(cp2x, "bezierCurveTo.cp2x"), cp2y: finite(cp2y, "bezierCurveTo.cp2y"), x: finite(x, "bezierCurveTo.x"), y: finite(y, "bezierCurveTo.y") }));
    }

    fill(): void { this.record({ kind: "fill", path: snapshot_path(this.path), state: snapshot_state(this.state) }); }
    stroke(): void { this.record({ kind: "stroke", path: snapshot_path(this.path), state: snapshot_state(this.state) }); }
    clip(): void { this.record({ kind: "clip", path: snapshot_path(this.path), state: snapshot_state(this.state) }); }
    fillRect(x: number, y: number, width: number, height: number): void { this.record({ kind: "fillRect", x: finite(x, "fillRect.x"), y: finite(y, "fillRect.y"), width: finite(width, "fillRect.width"), height: finite(height, "fillRect.height"), state: snapshot_state(this.state) }); }
    strokeRect(x: number, y: number, width: number, height: number): void { this.record({ kind: "strokeRect", x: finite(x, "strokeRect.x"), y: finite(y, "strokeRect.y"), width: finite(width, "strokeRect.width"), height: finite(height, "strokeRect.height"), state: snapshot_state(this.state) }); }
    clearRect(x: number, y: number, width: number, height: number): void { this.record({ kind: "clearRect", x: finite(x, "clearRect.x"), y: finite(y, "clearRect.y"), width: finite(width, "clearRect.width"), height: finite(height, "clearRect.height") }); }

    translate(x: number, y: number): void {
      this.state.transform = multiply(this.state.transform, matrix(1, 0, 0, 1, finite(x, "translate.x"), finite(y, "translate.y")));
      this.record({ kind: "translate", x, y, transform: this.state.transform });
    }
    scale(x: number, y: number): void {
      this.state.transform = multiply(this.state.transform, matrix(finite(x, "scale.x"), 0, 0, finite(y, "scale.y"), 0, 0));
      this.record({ kind: "scale", x, y, transform: this.state.transform });
    }
    rotate(angle: number): void {
      const value = finite(angle, "rotate.angle");
      const cosine = Math.cos(value);
      const sine = Math.sin(value);
      this.state.transform = multiply(this.state.transform, matrix(cosine, sine, -sine, cosine, 0, 0));
      this.record({ kind: "rotate", angle: value, transform: this.state.transform });
    }
    transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
      this.state.transform = multiply(this.state.transform, matrix(a, b, c, d, e, f));
      this.record({ kind: "transform", transform: this.state.transform });
    }
    setTransform(a: number | DOMMatrix2DInit, b?: number, c?: number, d?: number, e?: number, f?: number): void {
      this.state.transform = typeof a === "number"
        ? matrix(a, b ?? 0, c ?? 0, d ?? 1, e ?? 0, f ?? 0)
        : matrix(a.a ?? a.m11 ?? 1, a.b ?? a.m12 ?? 0, a.c ?? a.m21 ?? 0, a.d ?? a.m22 ?? 1, a.e ?? a.m41 ?? 0, a.f ?? a.m42 ?? 0);
      this.record({ kind: "setTransform", transform: this.state.transform });
    }
    resetTransform(): void {
      this.state.transform = IDENTITY;
      this.record({ kind: "resetTransform" });
    }
    getTransform(): DOMMatrix {
      const value = this.state.transform;
      return Object.freeze({ ...value, is2D: true, isIdentity: Object.is(value.a, 1) && Object.is(value.b, 0) && Object.is(value.c, 0) && Object.is(value.d, 1) && Object.is(value.e, 0) && Object.is(value.f, 0) }) as DOMMatrix;
    }

    getImageData(): never { throw new HostedCanvasUnsupportedError("getImageData pixel output"); }
    putImageData(): never { throw new HostedCanvasUnsupportedError("putImageData pixel output"); }
    createImageData(): never { throw new HostedCanvasUnsupportedError("createImageData pixel allocation"); }
    drawImage(): never { throw new HostedCanvasUnsupportedError("drawImage image loading/rasterization"); }
    measureText(): never { throw new HostedCanvasUnsupportedError("measureText font metrics"); }
    fillText(): never { throw new HostedCanvasUnsupportedError("fillText font rendering"); }
    strokeText(): never { throw new HostedCanvasUnsupportedError("strokeText font rendering"); }
  }

  type ResizeCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;
  class HostedResizeObserver {
    private readonly elements = new Set<Element>();
    private active = true;

    constructor(private readonly callback: ResizeCallback) { observers.add(this); }
    observe(element: Element): void { if (this.active) this.elements.add(element); }
    unobserve(element: Element): void { this.elements.delete(element); }
    disconnect(): void { this.active = false; this.elements.clear(); observers.delete(this); }
    notify(element: Element): void {
      if (!this.active || !this.elements.has(element) || disposed) return;
      const contentRect = element.getBoundingClientRect();
      const size = Object.freeze({ inlineSize: contentRect.width, blockSize: contentRect.height });
      const entry = Object.freeze({
        target: element,
        contentRect,
        borderBoxSize: Object.freeze([size]),
        contentBoxSize: Object.freeze([size]),
        devicePixelContentBoxSize: Object.freeze([size]),
      }) as ResizeObserverEntry;
      this.callback([entry], this as unknown as ResizeObserver);
    }
  }

  const remember = (target: object, key: PropertyKey): void => {
    records.push({ target, key, descriptor: Object.getOwnPropertyDescriptor(target, key) });
  };
  const context_for = (canvas: HTMLCanvasElement): HostedContext2D => {
    const existing = contexts.get(canvas);
    if (existing !== undefined) return existing;
    const created = new HostedContext2D(canvas);
    contexts.set(canvas, created);
    canvases.add(canvas);
    return created;
  };
  const reset_canvas = (canvas: HTMLCanvasElement): void => { contexts.get(canvas)?.reset(); };
  const originalWidth = Object.getOwnPropertyDescriptor(window.HTMLCanvasElement.prototype, "width");
  const originalHeight = Object.getOwnPropertyDescriptor(window.HTMLCanvasElement.prototype, "height");
  const originalWindowContext = Object.getOwnPropertyDescriptor(window, "CanvasRenderingContext2D");
  const originalWindowResize = Object.getOwnPropertyDescriptor(window, "ResizeObserver");

  try {
    remember(window.HTMLCanvasElement.prototype, "getContext");
    Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      writable: true,
      value(this: HTMLCanvasElement, contextId: string): RenderingContext | null {
        return contextId === "2d" ? context_for(this) as unknown as CanvasRenderingContext2D : null;
      },
    });
    for (const [key, descriptor] of [["width", originalWidth], ["height", originalHeight]] as const) {
      if (descriptor?.get === undefined || descriptor.set === undefined) continue;
      remember(window.HTMLCanvasElement.prototype, key);
      Object.defineProperty(window.HTMLCanvasElement.prototype, key, {
        configurable: descriptor.configurable ?? false,
        enumerable: descriptor.enumerable ?? false,
        get: descriptor.get,
        set(this: HTMLCanvasElement, value: number) {
          descriptor.set?.call(this, value);
          reset_canvas(this);
        },
      });
    }
    Object.defineProperty(window, "CanvasRenderingContext2D", { configurable: true, value: HostedContext2D });
    Object.defineProperty(window, "ResizeObserver", { configurable: true, value: HostedResizeObserver });
    Object.defineProperty(globalThis, HOSTED_TEST_RESIZE_SERVICE, {
      configurable: true,
      value: Object.freeze<HostedTestResizeService>({
        notify_resize(element) { for (const observer of [...observers]) observer.notify(element); },
      }),
    });
  } catch (error) {
    restore(records);
    if (originalWindowContext === undefined) Reflect.deleteProperty(window, "CanvasRenderingContext2D");
    else Object.defineProperty(window, "CanvasRenderingContext2D", originalWindowContext);
    if (originalWindowResize === undefined) Reflect.deleteProperty(window, "ResizeObserver");
    else Object.defineProperty(window, "ResizeObserver", originalWindowResize);
    if (resizeServiceDescriptor === undefined) Reflect.deleteProperty(globalThis, HOSTED_TEST_RESIZE_SERVICE);
    else Object.defineProperty(globalThis, HOSTED_TEST_RESIZE_SERVICE, resizeServiceDescriptor);
    throw error;
  }

  return Object.freeze({
    CanvasRenderingContext2D: HostedContext2D as unknown as HostedCanvasRuntime["CanvasRenderingContext2D"],
    commands_for(canvas) { return contexts.get(canvas)?.command_snapshot() ?? Object.freeze([]); },
    command_count() {
      let total = 0;
      for (const canvas of canvases) total += contexts.get(canvas)?.command_snapshot().length ?? 0;
      return total;
    },
    clear_commands(canvas) { contexts.get(canvas)?.clear_command_history(); },
    clear_all_canvases() {
      contexts = new WeakMap<HTMLCanvasElement, HostedContext2D>();
      canvases.clear();
    },
    notify_resize(element) { for (const observer of [...observers]) observer.notify(element); },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const observer of [...observers]) observer.disconnect();
      contexts = new WeakMap<HTMLCanvasElement, HostedContext2D>();
      canvases.clear();
      restore(records);
      if (originalWindowContext === undefined) Reflect.deleteProperty(window, "CanvasRenderingContext2D");
      else Object.defineProperty(window, "CanvasRenderingContext2D", originalWindowContext);
      if (originalWindowResize === undefined) Reflect.deleteProperty(window, "ResizeObserver");
      else Object.defineProperty(window, "ResizeObserver", originalWindowResize);
      if (resizeServiceDescriptor === undefined) Reflect.deleteProperty(globalThis, HOSTED_TEST_RESIZE_SERVICE);
      else Object.defineProperty(globalThis, HOSTED_TEST_RESIZE_SERVICE, resizeServiceDescriptor);
    },
  });
}
