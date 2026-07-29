// mount-color-sudoku.ts

import { hson } from "hson-live";
import type { LiveTree } from "hson-live/livetree";
import type { CssMap } from "hson-live/types";

type Oklab = {
  l: number;
  a: number;
  b: number;
};

type Field = [
  Oklab,
  Oklab,
  Oklab,
  Oklab,
];

type Trend = -1 | 0 | 1;

type GameState = {
  order: number[];
  target: Field;
  field: Field;
  selected: number | null;
  moves: number;
  solved: boolean;
  trend: Trend;
};

type Token = Readonly<{
  name: string;
  short: string;
  color: Oklab;
}>;

type Slot = Readonly<{
  name:
    | "N1"
    | "N2"
    | "E1"
    | "E2"
    | "S1"
    | "S2"
    | "W1"
    | "W2";
  row: number;
  column: number;
}>;

export type ColorSudokuRig = Readonly<{
  root: LiveTree;
  scramble(): void;
  dispose(): void;
}>;

const FIELD_PX = 161;
const MATCH_EPSILON = 1e-7;
const CHANGE_EPSILON = 1e-12;

const TARGET_ORDER = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
] as const;

const START_ORDER = [
  4,
  2,
  7,
  1,
  6,
  0,
  3,
  5,
] as const;

// Equal orthogonal influence makes each corner-adjacent source pair unordered.
//
// N1 / W1
// N2 / E1
// W2 / S1
// E2 / S2
//
// The target therefore has 2^4 = 16 exact field-equivalent arrangements.
// This prototype accepts any arrangement whose four canonical colors match.

const TOKENS: readonly Token[] = [
  {
    name: "Ruby",
    short: "Ru",
    color: oklch(0.67, 0.18, 25),
  },
  {
    name: "Amber",
    short: "Am",
    color: oklch(0.78, 0.15, 70),
  },
  {
    name: "Citrine",
    short: "Ci",
    color: oklch(0.86, 0.13, 100),
  },
  {
    name: "Emerald",
    short: "Em",
    color: oklch(0.72, 0.16, 145),
  },
  {
    name: "Turquoise",
    short: "Tu",
    color: oklch(0.76, 0.14, 190),
  },
  {
    name: "Sapphire",
    short: "Sa",
    color: oklch(0.64, 0.18, 255),
  },
  {
    name: "Amethyst",
    short: "Ae",
    color: oklch(0.67, 0.17, 300),
  },
  {
    name: "Magenta",
    short: "Ma",
    color: oklch(0.70, 0.18, 340),
  },
];

// Game-state order:
//
// 0 = N1
// 1 = N2
// 2 = E1
// 3 = E2
// 4 = S1
// 5 = S2
// 6 = W1
// 7 = W2

const SLOTS: readonly Slot[] = [
  {
    name: "N1",
    row: 1,
    column: 2,
  },
  {
    name: "N2",
    row: 1,
    column: 3,
  },
  {
    name: "E1",
    row: 2,
    column: 4,
  },
  {
    name: "E2",
    row: 3,
    column: 4,
  },
  {
    name: "S1",
    row: 4,
    column: 2,
  },
  {
    name: "S2",
    row: 4,
    column: 3,
  },
  {
    name: "W1",
    row: 2,
    column: 1,
  },
  {
    name: "W2",
    row: 3,
    column: 1,
  },
];

const ROOT_CSS: CssMap = {
  width: "100%",
  minHeight: "680px",
  boxSizing: "border-box",
  display: "grid",
  placeItems: "center",
  padding: "clamp(18px, 4vw, 48px)",
  background: "#10110f",
  color: "#ece9df",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const SHELL_CSS: CssMap = {
  width: "min(1080px, 100%)",
  display: "grid",
  gridTemplateColumns:
    "minmax(280px, 1fr) minmax(320px, 1.35fr)",
  gap: "clamp(24px, 5vw, 64px)",
  alignItems: "center",
};

const PANEL_CSS: CssMap = {
  minWidth: "0",
};

const EYEBROW_CSS: CssMap = {
  marginBottom: "8px",
  color: "#aaa594",
  fontSize: "12px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

const TITLE_CSS: CssMap = {
  margin: "0 0 12px",
  fontFamily: "Georgia, Times New Roman, serif",
  fontSize: "clamp(38px, 6vw, 72px)",
  fontWeight: "500",
  lineHeight: "0.95",
  letterSpacing: "-0.04em",
};

const COPY_CSS: CssMap = {
  maxWidth: "48ch",
  margin: "0 0 24px",
  color: "#c6c1b2",
  fontSize: "15px",
  lineHeight: "1.55",
};

const TARGET_LABEL_CSS: CssMap = {
  marginBottom: "8px",
  color: "#aaa594",
  fontSize: "12px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const TARGET_CSS: CssMap = {
  width: "min(220px, 70vw)",
  aspectRatio: "1",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  overflow: "hidden",
  border: "1px solid #45463d",
  borderRadius: "12px",
  boxShadow: "0 18px 54px rgb(0 0 0 / 0.28)",
};

const META_CSS: CssMap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 18px",
  marginTop: "18px",
  color: "#aaa594",
  fontSize: "13px",
};

const STATUS_CSS: CssMap = {
  minHeight: "44px",
  marginTop: "18px",
  color: "#ece9df",
  fontSize: "15px",
  lineHeight: "1.45",
};

const CONTROL_CSS: CssMap = {
  marginTop: "16px",
  padding: "10px 14px",
  border: "1px solid #555648",
  borderRadius: "999px",
  background: "transparent",
  color: "#ece9df",
  font: "inherit",
  cursor: "pointer",
};

const BOARD_CSS: CssMap = {
  width: "min(620px, 100%)",
  aspectRatio: "1",
  display: "grid",
  gridTemplateColumns:
    "0.78fr 1fr 1fr 0.78fr",
  gridTemplateRows:
    "0.78fr 1fr 1fr 0.78fr",
  gap: "clamp(8px, 1.4vw, 14px)",
  alignItems: "stretch",
  touchAction: "none",
  userSelect: "none",
};

const FIELD_FRAME_CSS: CssMap = {
  gridColumn: "2 / 4",
  gridRow: "2 / 4",
  position: "relative",
  overflow: "hidden",
  border: "1px solid #555648",
  borderRadius: "22px",
  background: "#1b1c18",
  boxShadow:
    "0 30px 90px rgb(0 0 0 / 0.36), " +
    "inset 0 0 36px rgb(255 255 255 / 0.05)",
  transition:
    "border-color 220ms ease, " +
    "box-shadow 220ms ease",
};

const CANVAS_CSS: CssMap = {
  display: "block",
  width: "100%",
  height: "100%",
};

const TOKEN_CSS: CssMap = {
  minWidth: "0",
  minHeight: "0",
  display: "grid",
  placeItems: "center",
  padding: "8px",
  border: "1px solid rgb(255 255 255 / 0.16)",
  borderRadius: "18px",
  boxShadow: "0 10px 26px rgb(0 0 0 / 0.24)",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: "clamp(11px, 1.6vw, 15px)",
  fontWeight: "750",
  letterSpacing: "0.02em",
  whiteSpace: "pre-line",
  cursor: "grab",
  transition:
    "transform 150ms ease, " +
    "box-shadow 150ms ease, " +
    "border-color 150ms ease",
};

const TOKEN_SELECTED_CSS: CssMap = {
  transform: "translateY(-3px) scale(1.025)",
  borderColor: "#ffffff",
  boxShadow:
    "0 0 0 3px rgb(255 255 255 / 0.22), " +
    "0 16px 34px rgb(0 0 0 / 0.34)",
};

const FIELD_SOLVED_CSS: CssMap = {
  borderColor: "#f2ead0",
  boxShadow:
    "0 0 0 3px rgb(242 234 208 / 0.22), " +
    "0 30px 90px rgb(0 0 0 / 0.36), " +
    "inset 0 0 42px rgb(255 255 255 / 0.10)",
};

function oklch(
  l: number,
  c: number,
  hueDegrees: number,
): Oklab {
  const h = hueDegrees * Math.PI / 180;

  return {
    l,
    a: c * Math.cos(h),
    b: c * Math.sin(h),
  };
}

function add_color(
  x: Oklab,
  y: Oklab,
): Oklab {
  return {
    l: x.l + y.l,
    a: x.a + y.a,
    b: x.b + y.b,
  };
}

function scale_color(
  color: Oklab,
  weight: number,
): Oklab {
  return {
    l: color.l * weight,
    a: color.a * weight,
    b: color.b * weight,
  };
}

function weighted_color(
  ...terms: readonly [Oklab, number][]
): Oklab {
  let l = 0;
  let a = 0;
  let b = 0;

  for (const [color, weight] of terms) {
    l += color.l * weight;
    a += color.a * weight;
    b += color.b * weight;
  }

  return {
    l,
    a,
    b,
  };
}

function token_for_order(
  order: readonly number[],
  slotIndex: number,
): Token {
  const tokenIndex = order[slotIndex];

  if (tokenIndex === undefined) {
    throw new Error(
      `Color Sudoku: missing token at slot ${slotIndex}.`,
    );
  }

  const token = TOKENS[tokenIndex];

  if (token === undefined) {
    throw new Error(
      `Color Sudoku: invalid token index ${tokenIndex}.`,
    );
  }

  return token;
}

/**
 * Solves the simultaneous field equations directly.
 *
 * qA = (N1 + W1) / 4
 * qB = (N2 + E1) / 4
 * qC = (W2 + S1) / 4
 * qD = (E2 + S2) / 4
 *
 * The four returned colors are:
 *
 * A
 * B
 * C
 * D
 *
 * in row-major order.
 */
function solve_field(
  order: readonly number[],
): Field {
  const n1 = token_for_order(order, 0).color;
  const n2 = token_for_order(order, 1).color;
  const e1 = token_for_order(order, 2).color;
  const e2 = token_for_order(order, 3).color;
  const s1 = token_for_order(order, 4).color;
  const s2 = token_for_order(order, 5).color;
  const w1 = token_for_order(order, 6).color;
  const w2 = token_for_order(order, 7).color;

  const qA = scale_color(
    add_color(n1, w1),
    1 / 4,
  );

  const qB = scale_color(
    add_color(n2, e1),
    1 / 4,
  );

  const qC = scale_color(
    add_color(w2, s1),
    1 / 4,
  );

  const qD = scale_color(
    add_color(e2, s2),
    1 / 4,
  );

  return [
    weighted_color(
      [qA, 7 / 6],
      [qB, 1 / 3],
      [qC, 1 / 3],
      [qD, 1 / 6],
    ),

    weighted_color(
      [qA, 1 / 3],
      [qB, 7 / 6],
      [qC, 1 / 6],
      [qD, 1 / 3],
    ),

    weighted_color(
      [qA, 1 / 3],
      [qB, 1 / 6],
      [qC, 7 / 6],
      [qD, 1 / 3],
    ),

    weighted_color(
      [qA, 1 / 6],
      [qB, 1 / 3],
      [qC, 1 / 3],
      [qD, 7 / 6],
    ),
  ];
}

function color_distance(
  x: Oklab,
  y: Oklab,
): number {
  return Math.hypot(
    x.l - y.l,
    x.a - y.a,
    x.b - y.b,
  );
}

function field_distance(
  x: Field,
  y: Field,
): number {
  return Math.max(
    color_distance(x[0], y[0]),
    color_distance(x[1], y[1]),
    color_distance(x[2], y[2]),
    color_distance(x[3], y[3]),
  );
}

function clone_field(
  field: Field,
): Field {
  return field.map(
    color => ({ ...color }),
  ) as Field;
}

function lerp_color(
  from: Oklab,
  to: Oklab,
  t: number,
): Oklab {
  return {
    l: from.l + (to.l - from.l) * t,
    a: from.a + (to.a - from.a) * t,
    b: from.b + (to.b - from.b) * t,
  };
}

function lerp_field(
  from: Field,
  to: Field,
  t: number,
): Field {
  return [
    lerp_color(from[0], to[0], t),
    lerp_color(from[1], to[1], t),
    lerp_color(from[2], to[2], t),
    lerp_color(from[3], to[3], t),
  ];
}

function clamp01(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(1, value),
  );
}

function linear_to_srgb(
  value: number,
): number {
  const out = value <= 0.0031308
    ? 12.92 * value
    : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;

  return clamp01(out);
}

function oklab_to_rgb(
  color: Oklab,
): readonly [number, number, number] {
  const l_ =
    color.l +
    0.3963377774 * color.a +
    0.2158037573 * color.b;

  const m_ =
    color.l -
    0.1055613458 * color.a -
    0.0638541728 * color.b;

  const s_ =
    color.l -
    0.0894841775 * color.a -
    1.2914855480 * color.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = linear_to_srgb(
    +4.0767416621 * l -
    3.3077115913 * m +
    0.2309699292 * s,
  );

  const g = linear_to_srgb(
    -1.2684380046 * l +
    2.6097574011 * m -
    0.3413193965 * s,
  );

  const b = linear_to_srgb(
    -0.0041960863 * l -
    0.7034186147 * m +
    1.7076147010 * s,
  );

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}

function color_css(
  color: Oklab,
): string {
  const [r, g, b] = oklab_to_rgb(color);

  return `rgb(${r} ${g} ${b})`;
}

function text_color(
  color: Oklab,
): string {
  return color.l >= 0.74
    ? "#171814"
    : "#fffdf6";
}

/**
 * Interpolates between the four canonical field colors.
 *
 * The interpolation coordinates are arranged so that:
 *
 * 25%, 25% = A
 * 75%, 25% = B
 * 25%, 75% = C
 * 75%, 75% = D
 *
 * FIELD_PX is 161 so all four points land on exact integer pixels.
 */
function bilerp(
  a: Oklab,
  b: Oklab,
  c: Oklab,
  d: Oklab,
  u: number,
  v: number,
): Oklab {
  return lerp_color(
    lerp_color(a, b, u),
    lerp_color(c, d, u),
    v,
  );
}

function draw_field(
  ctx: CanvasRenderingContext2D,
  field: Field,
): void {
  const image = ctx.createImageData(
    FIELD_PX,
    FIELD_PX,
  );

  const denominator = FIELD_PX - 1;

  for (
    let y = 0;
    y < FIELD_PX;
    y += 1
  ) {
    const v = clamp01(
      (
        y / denominator -
        0.25
      ) / 0.5,
    );

    for (
      let x = 0;
      x < FIELD_PX;
      x += 1
    ) {
      const u = clamp01(
        (
          x / denominator -
          0.25
        ) / 0.5,
      );

      const color = bilerp(
        field[0],
        field[1],
        field[2],
        field[3],
        u,
        v,
      );

      const [r, g, b] =
        oklab_to_rgb(color);

      const offset =
        (
          y * FIELD_PX +
          x
        ) * 4;

      image.data[offset] = r;
      image.data[offset + 1] = g;
      image.data[offset + 2] = b;
      image.data[offset + 3] = 255;
    }
  }

  ctx.putImageData(
    image,
    0,
    0,
  );
}

function shuffled_order(): number[] {
  const order = [...TARGET_ORDER];
  const target = solve_field(TARGET_ORDER);

  do {
    for (
      let i = order.length - 1;
      i > 0;
      i -= 1
    ) {
      const j = Math.floor(
        Math.random() * (i + 1),
      );

      const left = order[i];
      const right = order[j];

      if (
        left === undefined ||
        right === undefined
      ) {
        continue;
      }

      order[i] = right;
      order[j] = left;
    }
  } while (
    field_distance(
      solve_field(order),
      target,
    ) <= MATCH_EPSILON
  );

  return order;
}

function state_from(
  value: unknown,
): GameState {
  return value as GameState;
}

export function mount_color_sudoku(
  host: LiveTree,
): ColorSudokuRig {
  host.empty();

  const target =
    solve_field(TARGET_ORDER);

  const startField =
    solve_field(START_ORDER);

  const map = hson.liveMap.fromJson({
    order: [...START_ORDER],
    target,
    field: startField,
    selected: null,
    moves: 0,
    solved:
      field_distance(
        startField,
        target,
      ) <= MATCH_EPSILON,
    trend: 0,
  });

  const root = host
    .create
    .div()
    .id
    .set("color-sudoku-root")
    .css
    .setMany(ROOT_CSS);

  const shell = root
    .create
    .div()
    .css
    .setMany(SHELL_CSS);

  const panel = shell
    .create
    .div()
    .css
    .setMany(PANEL_CSS);

  panel
    .create
    .div()
    .text
    .set("FIELD EQUILIBRIUM STUDY")
    .css
    .setMany(EYEBROW_CSS);

  panel
    .create
    .h1()
    .text
    .set("Color Sudoku")
    .css
    .setMany(TITLE_CSS);

  panel
    .create
    .p()
    .text
    .set(
      "Rearrange the eight sources. " +
      "The center cannot be painted directly; " +
      "it settles into the equilibrium produced " +
      "by the perimeter.",
    )
    .css
    .setMany(COPY_CSS);

  panel
    .create
    .div()
    .text
    .set("Target")
    .css
    .setMany(TARGET_LABEL_CSS);

  const targetView = panel
    .create
    .div()
    .attrs
    .set(
      "aria-label",
      "Target four-color pattern",
    )
    .css
    .setMany(TARGET_CSS);

  const targetCells = target.map(
    (color, index) => targetView
      .create
      .div()
      .attrs
      .set(
        "aria-label",
        `Target cell ${index + 1}`,
      )
      .css
      .setMany({
        background: color_css(color),
      }),
  );

  const meta = panel
    .create
    .div()
    .css
    .setMany(META_CSS);

  const movesText = meta.create.div();
  const revisionText = meta.create.div();

  const status = panel
    .create
    .div()
    .attrs
    .set(
      "aria-live",
      "polite",
    )
    .css
    .setMany(STATUS_CSS);

  const scrambleButton = panel
    .create
    .button()
    .attrs
    .set(
      "type",
      "button",
    )
    .text
    .set("Scramble field")
    .css
    .setMany(CONTROL_CSS);

  const board = shell
    .create
    .div()
    .attrs
    .set(
      "aria-label",
      "Color Sudoku board",
    )
    .css
    .setMany(BOARD_CSS);

  const fieldFrame = board
    .create
    .div()
    .css
    .setMany(FIELD_FRAME_CSS);

  const canvas = fieldFrame
    .create
    .canvas()
    .css
    .setMany(CANVAS_CSS);

  canvas.canvas.width.set(FIELD_PX);
  canvas.canvas.height.set(FIELD_PX);

  const ctx = canvas
    .canvas
    .must
    .ctx2d(
      {
        alpha: false,
      },
      "Color Sudoku field",
    );

  const tokenButtons = SLOTS.map(
    (slot, slotIndex) => {
      const button = board
        .create
        .button()
        .attrs
        .setMany({
          type: "button",
          draggable: "true",
          "aria-label":
            `${slot.name} color source`,
          "data-slot": slot.name,
        })
        .css
        .setMany({
          ...TOKEN_CSS,
          gridRow: String(slot.row),
          gridColumn: String(slot.column),
        });

      button
        .listen
        .onClick(
          () => select_or_swap(slotIndex),
        );

      button
        .listen
        .onDragStart(event => {
          map.set(
            ["selected"],
            slotIndex,
          );

          event
            .dataTransfer
            ?.setData(
              "text/plain",
              String(slotIndex),
            );

          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed =
              "move";
          }
        });

      button
        .listen
        .preventDefault()
        .onDragOver(event => {
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect =
              "move";
          }
        });

      button
        .listen
        .preventDefault()
        .onDrop(event => {
          const raw = event
            .dataTransfer
            ?.getData("text/plain");

          const parsed =
            raw === undefined ||
            raw === ""
              ? undefined
              : Number(raw);

          const current =
            state_from(map.snap());

          const source =
            Number.isInteger(parsed)
              ? parsed
              : current.selected;

          if (
            source !== null &&
            source !== undefined
          ) {
            swap_slots(
              source,
              slotIndex,
            );
          }
        });

      button
        .listen
        .onDragEnd(() => {
          const current =
            state_from(map.snap());

          if (current.selected !== null) {
            map.set(
              ["selected"],
              null,
            );
          }
        });

      return button;
    },
  );

  let displayedField =
    clone_field(startField);

  let animationFrame:
    | number
    | undefined;

  let disposed = false;

  function snapshot(): GameState {
    return state_from(map.snap());
  }

  function animate_to(
    next: Field,
  ): void {
    if (
      field_distance(
        displayedField,
        next,
      ) <= CHANGE_EPSILON
    ) {
      return;
    }

    if (animationFrame !== undefined) {
      cancelAnimationFrame(
        animationFrame,
      );
    }

    const from =
      clone_field(displayedField);

    const startedAt =
      performance.now();

    const duration = 420;

    const frame = (
      now: number,
    ): void => {
      if (disposed) return;

      const linear = clamp01(
        (
          now -
          startedAt
        ) / duration,
      );

      const eased =
        1 -
        Math.pow(
          1 - linear,
          3,
        );

      displayedField = lerp_field(
        from,
        next,
        eased,
      );

      draw_field(
        ctx,
        displayedField,
      );

      if (linear < 1) {
        animationFrame =
          requestAnimationFrame(frame);
      } else {
        animationFrame = undefined;
      }
    };

    animationFrame =
      requestAnimationFrame(frame);
  }

  function render(): void {
    const state = snapshot();

    tokenButtons.forEach(
      (
        button,
        slotIndex,
      ) => {
        const slot =
          SLOTS[slotIndex];

        if (slot === undefined) {
          return;
        }

        const token =
          token_for_order(
            state.order,
            slotIndex,
          );

        const selected =
          state.selected === slotIndex;

        button
          .text
          .set(
            `${slot.name}\n${token.short}`,
          )
          .attrs
          .set(
            "aria-label",
            `${slot.name}: ${token.name}`,
          )
          .attrs
          .set(
            "aria-pressed",
            selected
              ? "true"
              : "false",
          )
          .css
          .setMany({
            ...TOKEN_CSS,
            ...(
              selected
                ? TOKEN_SELECTED_CSS
                : {}
            ),
            gridRow:
              String(slot.row),
            gridColumn:
              String(slot.column),
            background:
              color_css(token.color),
            color:
              text_color(token.color),
          });
      },
    );

    targetCells.forEach(
      (
        cell,
        index,
      ) => {
        const color =
          state.target[index];

        if (color !== undefined) {
          cell.css.setMany({
            background:
              color_css(color),
          });
        }
      },
    );

    movesText
      .text
      .set(
        `moves: ${state.moves}`,
      );

    revisionText
      .text
      .set(
        `revision: ${map.rev}`,
      );

    const message =
      state.solved
        ? (
          `Field matched in ` +
          `${state.moves} ` +
          `move` +
          (
            state.moves === 1
              ? ""
              : "s"
          ) +
          `.`
        )
        : state.selected !== null
          ? (
            "Choose or drag onto " +
            "a second source to swap them."
          )
          : state.trend > 0
            ? "The field settled closer."
            : state.trend < 0
              ? "The field moved farther away."
              : (
                "Select one source, then another, " +
                "or drag a source into a new position."
              );

    status
      .text
      .set(message);

    fieldFrame
      .css
      .setMany(
        state.solved
          ? {
            ...FIELD_FRAME_CSS,
            ...FIELD_SOLVED_CSS,
          }
          : FIELD_FRAME_CSS,
      );

    animate_to(state.field);
  }

  function select_or_swap(
    slotIndex: number,
  ): void {
    const state = snapshot();

    if (state.selected === null) {
      map.set(
        ["selected"],
        slotIndex,
      );

      return;
    }

    if (
      state.selected === slotIndex
    ) {
      map.set(
        ["selected"],
        null,
      );

      return;
    }

    swap_slots(
      state.selected,
      slotIndex,
    );
  }

  function swap_slots(
    from: number,
    to: number,
  ): void {
    if (from === to) {
      map.set(
        ["selected"],
        null,
      );

      return;
    }

    const state = snapshot();
    const nextOrder = [...state.order];

    const fromToken =
      nextOrder[from];

    const toToken =
      nextOrder[to];

    if (
      fromToken === undefined ||
      toToken === undefined
    ) {
      return;
    }

    nextOrder[from] = toToken;
    nextOrder[to] = fromToken;

    const nextField =
      solve_field(nextOrder);

    const beforeError =
      field_distance(
        state.field,
        state.target,
      );

    const nextError =
      field_distance(
        nextField,
        state.target,
      );

    const trend: Trend =
      nextError <
      beforeError -
      MATCH_EPSILON
        ? 1
        : nextError >
          beforeError +
          MATCH_EPSILON
          ? -1
          : 0;

    map.batch(tx => {
      tx.set(
        ["order"],
        nextOrder,
      );

      tx.set(
        ["field"],
        nextField,
      );

      tx.set(
        ["selected"],
        null,
      );

      tx.set(
        ["moves"],
        state.moves + 1,
      );

      tx.set(
        ["solved"],
        nextError <= MATCH_EPSILON,
      );

      tx.set(
        ["trend"],
        trend,
      );
    });
  }

  function scramble(): void {
    const order =
      shuffled_order();

    const field =
      solve_field(order);

    map.batch(tx => {
      tx.set(
        ["order"],
        order,
      );

      tx.set(
        ["field"],
        field,
      );

      tx.set(
        ["selected"],
        null,
      );

      tx.set(
        ["moves"],
        0,
      );

      tx.set(
        ["solved"],
        false,
      );

      tx.set(
        ["trend"],
        0,
      );
    });
  }

  scrambleButton
    .listen
    .onClick(scramble);

  const stopMap =
    map.sub(render);

  draw_field(
    ctx,
    displayedField,
  );

  render();

  function dispose(): void {
    if (disposed) return;

    disposed = true;
    stopMap();

    if (
      animationFrame !== undefined
    ) {
      cancelAnimationFrame(
        animationFrame,
      );
    }

    if (!root.isDisposed) {
      root.remove();
    }
  }

  return {
    root,
    scramble,
    dispose,
  };
}

export default mount_color_sudoku;