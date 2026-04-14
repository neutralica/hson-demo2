import { _COLS } from "../core/consts/ui-consts";

export function log_oklch_palette(palette: Record<string, string>, label?: string): void {

  // ADDED: extract OKLCH lightness (first channel)
  function get_oklch_lightness(color: string): number | null {
    const m = color.match(
      /oklch\(\s*([0-9]*\.?[0-9]+%?)\s+[0-9]*\.?[0-9]+\s+[0-9]*\.?[0-9]+(?:\s*\/\s*[0-9]*\.?[0-9]+)?\s*\)/i
    );

    if (!m || !m[1]) return null;

    const raw = m[1].trim();

    // ADDED: support both 0–1 and % formats
    if (raw.endsWith("%")) {
      return Number(raw.slice(0, -1)) / 100;
    }

    return Number(raw);
  }

  function get_contrast_text(color: string): "black" | "white" {
    const l = get_oklch_lightness(color);

    if (l === null) return "white";


    return l >= 0.72 ? "black" : "white";
  }

  console.groupCollapsed("color swatches: " + label);

  Object.entries(palette).forEach(([name, color]) => {
    const textColor = get_contrast_text(color);
    console.log(
      `%c ${name}: ${color} `,
      [
        `background: ${color}`,     
        `color: ${textColor}`,     
        `padding: 2px 6px`,
        `margin: 1px`,
        `display: inline-block`,
        `font-family: monospace`
      ].join("; ")
    );
  });
  console.groupEnd()
}