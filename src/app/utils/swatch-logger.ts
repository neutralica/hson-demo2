import { $cols_ } from "../core/consts/colors.consts";
export function log_oklch_palette(palette: Record<string, string>): void {

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

  // ADDED: choose readable text color
  function get_contrast_text(color: string): "black" | "white" {
    const l = get_oklch_lightness(color);

    if (l === null) return "white";

    // ADJUSTED: threshold tuned for your palette
    return l >= 0.72 ? "black" : "white";
  }

  // EXISTING LOOP (kept structure minimal)
  Object.entries(palette).forEach(([name, color]) => {

    // ADDED: compute contrast text color
    const textColor = get_contrast_text(color);

    // CHANGED: apply background + dynamic text color
    console.log(
      `%c ${name}: ${color} `,
      [
        `background: ${color}`,     // your swatch
        `color: ${textColor}`,     // computed contrast
        `padding: 2px 6px`,
        `margin: 1px`,
        `display: inline-block`,
        `font-family: monospace`
      ].join("; ")
    );
  });
}