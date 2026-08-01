import { JSDOM } from "jsdom";
import { apply_hosted_test_element_rect, notify_hosted_test_resize } from "../../harness/runtimes/dom/hosted-test-geometry";
import { install_hosted_canvas_runtime } from "../../harness/runtimes/dom/canvas/hosted-canvas-runtime";
import { HostedCanvasUnsupportedError } from "../../harness/runtimes/dom/canvas/hosted-canvas.types";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";

function expect_canvas(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted canvas runtime: ${message}`);
}

function same_descriptor(left: PropertyDescriptor | undefined, right: PropertyDescriptor | undefined): boolean {
  if (left === undefined || right === undefined) return left === right;
  return left.configurable === right.configurable
    && left.enumerable === right.enumerable
    && left.writable === right.writable
    && left.value === right.value
    && left.get === right.get
    && left.set === right.set;
}

const beforeGlobals = new Map(["HTMLCanvasElement", "CanvasRenderingContext2D", "ResizeObserver"].map((name) => [
  name,
  Object.getOwnPropertyDescriptor(globalThis, name),
] as const));

await with_hosted_dom_runtime((runtime) => {
  const first = runtime.document.getElementById("first");
  const second = runtime.document.getElementById("second");
  expect_canvas(first instanceof HTMLCanvasElement && second instanceof HTMLCanvasElement, "fixture canvases exist");
  const context = first.getContext("2d");
  const same = first.getContext("2d", { alpha: false });
  const other = second.getContext("2d");
  expect_canvas(context instanceof CanvasRenderingContext2D, "2D context uses hosted constructor");
  expect_canvas(context === same, "one stable context per canvas");
  expect_canvas(other instanceof CanvasRenderingContext2D && other !== context, "different canvas has different context");
  expect_canvas(first.getContext("webgl") === null, "unsupported context ID returns null");
  expect_canvas(context.fillStyle === "#000000" && context.lineWidth === 1 && context.globalAlpha === 1, "state defaults match Canvas 2D");

  context.fillStyle = "red";
  context.lineWidth = 4;
  context.save();
  context.fillStyle = "blue";
  context.translate(10, 20);
  context.scale(2, 3);
  context.beginPath();
  context.moveTo(1, 2);
  context.lineTo(3, 4);
  context.closePath();
  context.fill();
  context.fillRect(5, 6, 7, 8);
  context.restore();
  expect_canvas(context.fillStyle === "red" && context.lineWidth === 4, "save/restore restores detached state");
  const transform = runtime.canvas.commands_for(first).find((command) => command.kind === "scale");
  expect_canvas(transform?.kind === "scale" && transform.transform.a === 2 && transform.transform.d === 3 && transform.transform.e === 10 && transform.transform.f === 20, "transform multiplication order is deterministic");
  const fill = runtime.canvas.commands_for(first).find((command) => command.kind === "fill");
  expect_canvas(fill?.kind === "fill" && fill.path.map((entry) => entry.kind).join(",") === "moveTo,lineTo,closePath", "path order is snapshotted by fill");
  const rect = runtime.canvas.commands_for(first).find((command) => command.kind === "fillRect");
  expect_canvas(rect?.kind === "fillRect" && rect.state.fillStyle === "blue", "draw command captures active state");
  context.fillStyle = "green";
  expect_canvas(rect?.kind === "fillRect" && rect.state.fillStyle === "blue" && Object.isFrozen(rect.state), "records remain detached and frozen");

  const countBeforeClear = runtime.canvas.commands_for(first).length;
  context.clearRect(0, 0, 2, 2);
  expect_canvas(runtime.canvas.commands_for(first).length === countBeforeClear + 1, "clearRect records a command without deleting history");
  first.width = 640;
  expect_canvas(runtime.canvas.commands_for(first).length === 0 && context.fillStyle === "#000000", "width mutation resets state and command history");

  apply_hosted_test_element_rect(first, { x: 10, y: 20, width: 100, height: 50 });
  let resizeCalls = 0;
  const observer = new ResizeObserver((entries) => {
    resizeCalls += 1;
    expect_canvas(entries[0]?.contentRect.width === 140, "resize entry uses explicitly injected rectangle");
  });
  observer.observe(first);
  notify_hosted_test_resize(first, { x: 10, y: 20, width: 140, height: 70 });
  expect_canvas(resizeCalls === 1, "resize notification is explicit and synchronous");
  observer.disconnect();
  notify_hosted_test_resize(first, { x: 10, y: 20, width: 160, height: 80 });
  expect_canvas(resizeCalls === 1, "disconnected observer receives no later notification");

  let unsupported: unknown;
  try {
    context.getImageData(0, 0, 1, 1);
  } catch (error) {
    unsupported = error;
  }
  expect_canvas(unsupported instanceof HostedCanvasUnsupportedError, "pixel API throws stable hosted-canvas error");
  expect_canvas(unsupported.code === "HOSTED_CANVAS_UNSUPPORTED" && unsupported.operation.includes("getImageData"), "unsupported error identifies operation");
}, { html: "<!doctype html><html><body><canvas id=\"first\"></canvas><canvas id=\"second\"></canvas></body></html>" });

for (const [name, descriptor] of beforeGlobals) {
  expect_canvas(same_descriptor(Object.getOwnPropertyDescriptor(globalThis, name), descriptor), `${name} global descriptor restored`);
}

const raw = new JSDOM("<!doctype html><canvas id=\"raw\"></canvas>");
const prototype = raw.window.HTMLCanvasElement.prototype;
const originalGetContext = Object.getOwnPropertyDescriptor(prototype, "getContext");
const originalWidth = Object.getOwnPropertyDescriptor(prototype, "width");
const controller = install_hosted_canvas_runtime(raw.window);
controller.dispose();
controller.dispose();
expect_canvas(same_descriptor(Object.getOwnPropertyDescriptor(prototype, "getContext"), originalGetContext), "getContext prototype descriptor restored exactly");
expect_canvas(same_descriptor(Object.getOwnPropertyDescriptor(prototype, "width"), originalWidth), "width prototype descriptor restored exactly");
raw.window.close();

await with_hosted_dom_runtime((runtime) => {
  const fresh = runtime.document.getElementById("fresh");
  expect_canvas(fresh instanceof HTMLCanvasElement, "sequential runtime canvas exists");
  expect_canvas(runtime.canvas.commands_for(fresh).length === 0, "sequential runtime has no retained commands or contexts");
}, { html: "<!doctype html><html><body><canvas id=\"fresh\"></canvas></body></html>" });

console.log("hosted canvas runtime: ok");
