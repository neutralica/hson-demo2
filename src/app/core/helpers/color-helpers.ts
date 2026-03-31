import { _clampLoHi, _clamp01, _wrap360 } from "../../utils/helpers";

export function parse_oklch(src: string) {
  const m = /^oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\s*\)$/i.exec(src.trim());
  if (!m) {
    throw new Error(`parse_oklch(): invalid OKLCH string: ${src}`);
  }

  return {
    l: Number(m[1]),
    c: Number(m[2]),
    h: Number(m[3]),
    a: m[4] != null ? Number(m[4]) : undefined,
  };
}
export function format_oklch(color: { l: number; c: number; h: number; a?: number }): string {
  const l = _clamp01(color.l);
  const c = Math.max(0, color.c);
  const h = _wrap360(color.h);

  if (color.a != null) {
    const a = _clamp01(color.a);
    return `oklch(${l} ${c} ${h} / ${a})`;
  }

  return `oklch(${l} ${c} ${h})`;
}

export function parse_rgba(src: string) {
  const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i.exec(src.trim());
  if (!m) {
    throw new Error(`parse_rgba(): invalid rgb/rgba string: ${src}`);
  }

  return {
    r: _clampLoHi(Number(m[1]), 0, 255),
    g: _clampLoHi(Number(m[2]), 0, 255),
    b: _clampLoHi(Number(m[3]), 0, 255),
    a: m[4] != null ? _clamp01(Number(m[4])) : undefined,
  };
}

export function format_rgba(color: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(_clampLoHi(color.r, 0, 255));
  const g = Math.round(_clampLoHi(color.g, 0, 255));
  const b = Math.round(_clampLoHi(color.b, 0, 255));

  if (color.a != null) {
    const a = _clamp01(color.a);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export function set_alpha(color: string, alpha: number): string {
  const a = _clamp01(alpha);
  const src = color.trim().toLowerCase();

  if (src.startsWith("rgb")) {
    const rgb = parse_rgba(color);
    return format_rgba({ ...rgb, a });
  }

  if (src.startsWith("oklch")) {
    const oklch = parse_oklch(color);
    return format_oklch({ ...oklch, a });
  }

  console.warn(`set_alpha(): unsupported color format: ${color}`);
  return color;
}

export function adjustOklch(
  color: string,
  delta: {
    l?: number;
    c?: number;
    h?: number;
    a?: number;
  }
): string {
  let src;

  try {
    src = parse_oklch(color);
  } catch {
    return color;
  }

  return format_oklch({
    l: _clamp01(src.l + (delta.l ?? 0)),
    c: Math.max(0, src.c + (delta.c ?? 0)),
    h: _wrap360(src.h + (delta.h ?? 0)),
    a: src.a != null || delta.a != null
      ? _clamp01((src.a ?? 1) + (delta.a ?? 0))
      : 1,
  });
}