import { hson } from "hson-live";

type CanvasFidelityCase = "clear-full" | "clear-rectangle" | "plot" | "must-plot";

function pixel(context: CanvasRenderingContext2D, x: number, y: number): readonly number[] {
  return Object.freeze([...context.getImageData(x, y, 1, 1).data]);
}

async function run_canvas_fidelity_case(kind: CanvasFidelityCase): Promise<Readonly<Record<string, unknown>>> {
  const host = hson.liveTree.queryDom("#canvas-fidelity-root").graft();
  host.empty();
  const tree = hson.liveTree.fromTrustedHtml('<canvas id="fidelity-target" width="20" height="20"></canvas>');
  host.append(tree);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const target = tree.find.must.byId("fidelity-target");
  const context = target.canvas.must.ctx2d();
  if (kind === "clear-full") {
    context.fillStyle = "rgb(255, 0, 0)";
    context.fillRect(0, 0, 20, 20);
    target.canvas.clear();
    return Object.freeze({ pixel: pixel(context, 10, 10) });
  }
  if (kind === "clear-rectangle") {
    context.fillStyle = "rgb(255, 0, 0)";
    context.fillRect(0, 0, 20, 20);
    target.canvas.clear(0, 0, 10, 10);
    return Object.freeze({ cleared: pixel(context, 5, 5), untouched: pixel(context, 15, 15) });
  }
  let called = false;
  const color = kind === "plot" ? "rgb(255, 0, 0)" : "rgb(0, 255, 0)";
  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
    called = true;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  if (kind === "plot") target.canvas.plot(draw);
  else target.canvas.must.plot(draw);
  return Object.freeze({ called, pixel: pixel(context, 10, 10) });
}

Object.assign(globalThis, { run_canvas_fidelity_case });
