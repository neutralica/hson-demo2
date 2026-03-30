

export function set_alpha(color: string, alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));

  const c = color.trim().toLowerCase();

  // -------------------------
  // rgba / rgb
  // -------------------------
  if (c.startsWith("rgb")) {
    const m = color.match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i
    );

    if (!m) {
      console.warn(`set_alpha(): invalid rgb/rgba format: ${color}`);
      return color;
    }

    const r = m[1];
    const g = m[2];
    const b = m[3];

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // -------------------------
  // oklch
  // supports:
  //   oklch(L C H)
  //   oklch(L C H / A)
  // -------------------------
  if (c.startsWith("oklch")) {
    const m = color.match(
      /^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\s*\)$/i
    );

    if (!m) {
      console.warn(`set_alpha(): invalid oklch format: ${color}`);
      return color;
    }

    const l = m[1]; // may include %
    const cVal = m[2];
    const h = m[3];

    return `oklch(${l} ${cVal} ${h} / ${a})`;
  }

  // -------------------------
  // fallback
  // -------------------------
  console.warn(`set_alpha(): unsupported color format: ${color}`);
  return color;
}

// small deterministic OKLCH adjuster for already-OKLCH color strings.
// Supports:
//   oklch(L C H)
//   oklch(L C H / A)
// If parsing fails, returns the original color unchanged.
export function adjustOklch(
  color: string,
  delta: {
    l?: number;
    c?: number;
    h?: number;
    a?: number;
  }
): string {
  const src = color.trim();

  const m = /^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/)]+)(?:\s*\/\s*([^)]+))?\s*\)$/i.exec(src);
  if (!m) return color;

  const l0 = Number.parseFloat(m[1] ?? "");
  const c0 = Number.parseFloat(m[2] ?? "");
  const h0 = Number.parseFloat(m[3] ?? "");
  const a0 = m[4] != null ? Number.parseFloat(m[4]) : undefined;

  if (!Number.isFinite(l0) || !Number.isFinite(c0) || !Number.isFinite(h0)) {
    return color;
  }

  //  clamp inline; no external helpers needed
  let l = l0 + (delta.l ?? 0);
  let c = c0 + (delta.c ?? 0);
  let h = h0 + (delta.h ?? 0);
  let a = a0 != null ? a0 + (delta.a ?? 0) : undefined;

  l = Math.max(0, Math.min(1, l));
  c = Math.max(0, c);

  //  wrap hue into [0, 360)
  h = ((h % 360) + 360) % 360;

  if (a != null && Number.isFinite(a)) {
    a = Math.max(0, Math.min(1, a));
  }

  const lStr = l.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  const cStr = c.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  const hStr = h.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");

  if (a != null && Number.isFinite(a)) {
    const aStr = a.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return `oklch(${lStr} ${cStr} ${hStr} / ${aStr})`;
  }

  return `oklch(${lStr} ${cStr} ${hStr})`;
}
