export type HostedCanvasMatrix = Readonly<{
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}>;

export type HostedCanvasState = Readonly<{
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
}>;

export type HostedCanvasPathCommand =
  | Readonly<{ kind: "moveTo" | "lineTo"; x: number; y: number }>
  | Readonly<{ kind: "rect"; x: number; y: number; width: number; height: number }>
  | Readonly<{
      kind: "arc";
      x: number;
      y: number;
      radius: number;
      startAngle: number;
      endAngle: number;
      counterclockwise: boolean;
    }>
  | Readonly<{
      kind: "ellipse";
      x: number;
      y: number;
      radiusX: number;
      radiusY: number;
      rotation: number;
      startAngle: number;
      endAngle: number;
      counterclockwise: boolean;
    }>
  | Readonly<{ kind: "quadraticCurveTo"; cpx: number; cpy: number; x: number; y: number }>
  | Readonly<{
      kind: "bezierCurveTo";
      cp1x: number;
      cp1y: number;
      cp2x: number;
      cp2y: number;
      x: number;
      y: number;
    }>
  | Readonly<{ kind: "closePath" }>;

export type HostedCanvasCommand =
  | Readonly<{
      kind: "fillRect" | "strokeRect";
      x: number;
      y: number;
      width: number;
      height: number;
      state: HostedCanvasState;
    }>
  | Readonly<{ kind: "clearRect"; x: number; y: number; width: number; height: number }>
  | Readonly<{ kind: "fill" | "stroke" | "clip"; path: readonly HostedCanvasPathCommand[]; state: HostedCanvasState }>
  | Readonly<{ kind: "beginPath" | "save" | "restore" | "resetTransform" }>
  | Readonly<{ kind: "translate" | "scale"; x: number; y: number; transform: HostedCanvasMatrix }>
  | Readonly<{ kind: "rotate"; angle: number; transform: HostedCanvasMatrix }>
  | Readonly<{ kind: "transform" | "setTransform"; transform: HostedCanvasMatrix }>;

export type HostedCanvasRuntime = Readonly<{
  CanvasRenderingContext2D: abstract new (...args: never[]) => CanvasRenderingContext2D;
  commands_for(canvas: HTMLCanvasElement): readonly HostedCanvasCommand[];
  command_count(): number;
  clear_commands(canvas: HTMLCanvasElement): void;
  clear_all_canvases(): void;
  notify_resize(element: Element): void;
  dispose(): void;
}>;

export class HostedCanvasUnsupportedError extends Error {
  readonly code = "HOSTED_CANVAS_UNSUPPORTED" as const;

  constructor(readonly operation: string) {
    super(`Hosted deterministic canvas does not support ${operation}.`);
    this.name = "HostedCanvasUnsupportedError";
  }
}
