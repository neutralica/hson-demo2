import { LiveTree } from "hson-live";
import type { CssMap } from "hson-live/types";
import { øHSON_COL } from "../../core/consts/colors.consts";

/**
 * Temporary visual sampler for overlay/dialog panel treatments.
 *
 * This is intentionally ad-hoc: it clears the stage and creates a grid of
 * random panel-style combinations so we can visually choose a preset direction.
 */
export function mount_panel_spawner(stage: LiveTree): void {
  stage.empty();

  const host = stage.create.div()
    .id.set("panel-spawner-host")
    .css.setMany({
      position: "fixed",
      inset: "0",
      zIndex: "9999",
      pointerEvents: "auto",
      padding: "1.1rem",
      background: "radial-gradient(circle at 50% 105%, oklch(30% 0.055 160 / 0.12), transparent 58%), oklch(4% 0.012 270 / 0.98)",
      boxSizing: "border-box",
    });

  const grid = host.create.div()
    .id.set("panel-spawner-grid")
    .css.setMany({
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      gridAutoRows: "minmax(11rem, 1fr)",
      overflow: "auto",
      gap: "0.8rem",
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
    });

  for (let ix = 0; ix < 15; ix += 1) {
    if (Math.random() < 0.34) {
      grid.create.div()
        .classlist.add("panel-spawner-empty")
        .css.setMany(EMPTY_PANEL_CSS);
      continue;
    }

    const sample = get_random_panel_config(ix);
    const panel = grid.create.div()
      .classlist.add("panel-spawner-sample")
      .css.setMany(sample.css);

    panel.create.div()
      .classlist.add("panel-spawner-copy")
      .css.setMany({
        position: "relative",
        zIndex: "2",
      })
      .text.set(format_panel_config(ix, sample.label));

    if (sample.hasActionCorner) {
      const diode = panel.create.div()
        .classlist.add("panel-spawner-diode")
        .css.setMany(make_diode_css(øHSON_COL.h));

      let active = false;
      const el = diode.dom.el();
      if (el instanceof HTMLElement) {
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          active = !active;
          diode.css.setMany(make_diode_css(active ? øHSON_COL.n : øHSON_COL.h));
        });
      }
    }
  }
}

type PanelPart = Readonly<{
  label: string;
  css: CssMap;
}>;

type PanelSample = Readonly<{
  label: readonly string[];
  css: CssMap;
  hasActionCorner: boolean;
}>;

const EMPTY_PANEL_CSS: CssMap = {
  minWidth: "0",
  minHeight: "0",
  border: "1px solid oklch(80% 0.04 250 / 0.045)",
  background: "radial-gradient(circle at 50% 50%, oklch(80% 0.04 250 / 0.018), transparent 55%)",
  boxSizing: "border-box",
};

const PANEL_MATERIALS: readonly PanelPart[] = [
  {
    label: "dead crt glass",
    css: {
      background: "radial-gradient(circle at 50% 120%, oklch(62% 0.12 150 / 0.10), transparent 42%), linear-gradient(135deg, oklch(6% 0.022 250 / 0.98), oklch(2.5% 0.016 286 / 0.99))",
    },
  },
  {
    label: "blueprint acetate",
    css: {
      background: "linear-gradient(135deg, oklch(10% 0.055 235 / 0.98), oklch(3.5% 0.024 265 / 0.99))",
    },
  },
  {
    label: "rose mineral velvet",
    css: {
      background: "radial-gradient(circle at 82% 8%, oklch(72% 0.18 350 / 0.18), transparent 38%), radial-gradient(circle at 20% 110%, oklch(58% 0.12 35 / 0.10), transparent 44%), oklch(5% 0.035 320 / 0.98)",
    },
  },
  {
    label: "phosphor black enamel",
    css: {
      background: "radial-gradient(circle at 12% 90%, oklch(74% 0.18 145 / 0.14), transparent 46%), linear-gradient(180deg, oklch(5% 0.018 205 / 0.99), oklch(2.8% 0.014 250 / 0.99))",
    },
  },
  {
    label: "violet instrument well",
    css: {
      background: "radial-gradient(circle at 50% 45%, oklch(46% 0.12 300 / 0.14), transparent 34%), oklch(4.5% 0.032 290 / 0.985)",
    },
  },
  {
    label: "amber smoked lacquer",
    css: {
      background: "radial-gradient(circle at 100% 100%, oklch(72% 0.13 82 / 0.13), transparent 46%), linear-gradient(145deg, oklch(7% 0.035 70 / 0.98), oklch(3% 0.02 35 / 0.99))",
    },
  },
] as const;

const PANEL_FRAMES: readonly PanelPart[] = [
  {
    label: "surgical cyan hairline",
    css: {
      border: "1px solid oklch(76% 0.095 225 / 0.72)",
      outline: "1px solid oklch(76% 0.095 225 / 0.16)",
      outlineOffset: "-0.32rem",
    },
  },
  {
    label: "green instrument box",
    css: {
      border: "1px solid oklch(78% 0.15 145 / 0.76)",
      outline: "1px solid oklch(78% 0.15 145 / 0.34)",
      outlineOffset: "-0.34rem",
    },
  },
  {
    label: "violet inset lens",
    css: {
      border: "1px solid oklch(74% 0.08 300 / 0.62)",
      boxShadow: "inset 0 0 0 1px oklch(84% 0.05 305 / 0.18), inset 0 0 2.4rem oklch(70% 0.09 300 / 0.08)",
    },
  },
  {
    label: "clipped corner plate",
    css: {
      clipPath: "polygon(0.7rem 0, 100% 0, 100% calc(100% - 0.7rem), calc(100% - 0.7rem) 100%, 0 100%, 0 0.7rem)",
      border: "1px solid oklch(82% 0.055 250 / 0.55)",
    },
  },
  {
    label: "shadow-only bevel",
    css: {
      border: "1px solid oklch(100% 0 0 / 0.08)",
      boxShadow: "inset 0 1px 0 oklch(100% 0 0 / 0.12), inset 0 -1px 0 oklch(0% 0 0 / 0.65)",
    },
  },
] as const;

const PANEL_LIGHTS: readonly PanelPart[] = [
  {
    label: "cold crown bloom",
    css: {
      boxShadow: "0 0 1.4rem oklch(72% 0.12 230 / 0.20), inset 0 1.2rem 2.8rem oklch(72% 0.12 230 / 0.08)",
    },
  },
  {
    label: "green bottom lamp",
    css: {
      boxShadow: "0 0 1.15rem oklch(70% 0.16 145 / 0.16), inset 0 -1.7rem 3.2rem oklch(70% 0.16 145 / 0.13)",
    },
  },
  {
    label: "rose side leak",
    css: {
      boxShadow: "0 0 1rem oklch(75% 0.16 350 / 0.15), inset -1.4rem 0 3rem oklch(75% 0.16 350 / 0.10)",
    },
  },
  {
    label: "amber buried lamp",
    css: {
      boxShadow: "0 0 1.2rem oklch(78% 0.14 80 / 0.13), inset 0 -1.6rem 3rem oklch(78% 0.14 80 / 0.10)",
    },
  },
  {
    label: "dry black lens",
    css: {
      boxShadow: "inset 0 0 1.2rem oklch(85% 0.02 260 / 0.04)",
    },
  },
] as const;

const PANEL_CORNERS: readonly (PanelPart & Readonly<{ hasActionCorner: boolean }>)[] = [
  {
    label: "open inert corner",
    hasActionCorner: false,
    css: {
      clipPath: "polygon(0.7rem 0, 100% 0, 100% calc(100% - 0.7rem), calc(100% - 0.7rem) 100%, 0 100%, 0 0.7rem)",
    },
  },
  {
    label: "closed action corner",
    hasActionCorner: true,
    css: {
      clipPath: "polygon(0.7rem 0, calc(100% - 0.7rem) 0, 100% 0.7rem, 100% 100%, 0 100%, 0 0.7rem)",
      __after: {
        content: `""`,
        position: "absolute",
        top: "0",
        right: "0",
        width: "1.25rem",
        height: "1.25rem",
        pointerEvents: "none",
        background: "linear-gradient(135deg, oklch(92% 0.04 250 / 0.22), oklch(92% 0.04 250 / 0.06))",
        clipPath: "polygon(0 0, 100% 0, 100% 100%)",
        opacity: "0.65",
      },
    },
  },
] as const;

const PANEL_INSTRUMENTS: readonly PanelPart[] = [
  {
    label: "bottom calibration ticks",
    css: {
      __before: {
        content: `""`,
        position: "absolute",
        left: "0.85rem",
        right: "0.85rem",
        bottom: "0.64rem",
        height: "0.45rem",
        background: "repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 0.62rem)",
        opacity: "0.24",
        pointerEvents: "none",
      },
    },
  },
  {
    label: "left signal rail",
    css: {
      __before: {
        content: `""`,
        position: "absolute",
        left: "0.48rem",
        top: "0.85rem",
        bottom: "0.85rem",
        width: "1px",
        background: "linear-gradient(180deg, transparent, currentColor 16%, currentColor 84%, transparent)",
        opacity: "0.34",
        pointerEvents: "none",
      },
    },
  },
  {
    label: "unmetered surface",
    css: {},
  },
] as const;

const PANEL_TEXTURES: readonly PanelPart[] = [
  {
    label: "ordered stipple field",
    css: {
      backgroundImage: "radial-gradient(circle, oklch(88% 0.035 260 / 0.105) 0 0.7px, transparent 1px)",
      backgroundSize: "4px 4px",
      backgroundBlendMode: "screen",
    },
  },
  {
    label: "coarse dither wash",
    css: {
      backgroundImage: "radial-gradient(circle, oklch(90% 0.04 250 / 0.08) 0 1px, transparent 1.3px)",
      backgroundSize: "7px 7px",
      backgroundPosition: "1px 2px",
      backgroundBlendMode: "screen",
    },
  },
  {
    label: "wide instrument grid",
    css: {
      backgroundImage: "linear-gradient(90deg, oklch(95% 0.05 170 / 0.040) 1px, transparent 1px), linear-gradient(0deg, oklch(95% 0.05 170 / 0.030) 1px, transparent 1px)",
      backgroundSize: "1.65rem 1.65rem",
      backgroundBlendMode: "screen",
    },
  },
  {
    label: "pinpoint dust",
    css: {
      backgroundImage: "radial-gradient(circle at 12% 24%, oklch(90% 0.10 210 / 0.18) 0 1px, transparent 2px), radial-gradient(circle at 78% 64%, oklch(90% 0.08 145 / 0.14) 0 1px, transparent 2px), radial-gradient(circle at 46% 88%, oklch(90% 0.08 310 / 0.11) 0 1px, transparent 2px)",
      backgroundBlendMode: "screen",
    },
  },
  {
    label: "clean surface",
    css: {},
  },
] as const;

const PANEL_TEXTS: readonly PanelPart[] = [
  {
    label: "lilac phosphor type",
    css: {
      color: "oklch(79% 0.045 298 / 0.95)",
    },
  },
  {
    label: "blue instrument type",
    css: {
      color: "oklch(75% 0.11 235 / 0.95)",
    },
  },
  {
    label: "green phosphor type",
    css: {
      color: "oklch(78% 0.16 145 / 0.95)",
    },
  },
  {
    label: "amber warning type",
    css: {
      color: "oklch(82% 0.14 86 / 0.94)",
    },
  },
  {
    label: "rose signal type",
    css: {
      color: "oklch(76% 0.14 350 / 0.93)",
    },
  },
  {
    label: "pearl oxide type",
    css: {
      color: "oklch(84% 0.018 285 / 0.88)",
    },
  },
] as const;

const TEXT_SHADOWS: readonly PanelPart[] = [
  {
    label: "dry type",
    css: {
      textShadow: "none",
    },
  },
  {
    label: "small phosphor bloom",
    css: {
      textShadow: "0 0 0.45rem currentColor",
    },
  },
  {
    label: "soft monitor smear",
    css: {
      textShadow: "0.04rem 0 0.32rem currentColor, -0.03rem 0 0.28rem oklch(70% 0.12 230 / 0.35)",
    },
  },
] as const;

function get_random_panel_config(ix: number): PanelSample {
  const material = pick(PANEL_MATERIALS);
  const frame = pick(PANEL_FRAMES);
  const light = pick(PANEL_LIGHTS);
  const texture = pick(PANEL_TEXTURES);
  const corner = pick(PANEL_CORNERS);
  const instrument = pick(PANEL_INSTRUMENTS);
  const text = pick(PANEL_TEXTS);
  const textShadow = pick(TEXT_SHADOWS);

  const css: CssMap = {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    alignContent: "start",
    gap: "0.45rem",
    minWidth: "0",
    minHeight: "0",
    padding: "0.85rem",
    boxSizing: "border-box",
    fontFamily: "monospace",
    fontSize: "0.72rem",
    lineHeight: "1.35",
    letterSpacing: "0.02em",
    whiteSpace: "pre-wrap",
    isolation: "isolate",
    ...material.css,
    ...texture.css,
    ...frame.css,
    ...light.css,
    ...text.css,
    ...textShadow.css,
    ...corner.css,
    ...instrument.css,
  };

  return {
    label: [
      `#${ix + 1}`,
      material.label,
      frame.label,
      light.label,
      texture.label,
      corner.label,
      instrument.label,
      text.label,
      textShadow.label,
    ],
    css,
    hasActionCorner: corner.hasActionCorner,
  };
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]!;
}

function format_panel_config(ix: number, labels: readonly string[]): string {
  return [
    `panel ${ix + 1}`,
    "",
    ...labels.map((label) => `• ${label}`),
  ].join("\n");
}
function make_diode_css(color: string): CssMap {
  return {
    position: "absolute",
    right: "0.53rem",
    top: "0.53rem",
    zIndex: "4",
    width: "0.42rem",
    height: "0.42rem",
    borderRadius: "999px",
    background: color,
    boxShadow: `0 0 0.65rem ${color}, 0 0 0 1px oklch(100% 0 0 / 0.18)`,
    cursor: "pointer",
    pointerEvents: "auto",
  };
}