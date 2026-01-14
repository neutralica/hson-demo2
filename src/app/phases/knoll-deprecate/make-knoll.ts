export type KnollOpts = {
  width: number;
  height: number;
  seed: number;
  grassCount: number;
  pixelSize: number; // "blockiness"
};

function mulberry32(seed: number): () => number {
  // small deterministic RNG
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hillY(x: number, w: number, h: number): number {
  // a “rolling hill” curve: baseline + a few sine layers
  // tweak these constants to taste
  const nx = x / w;
  const horizon = h * 0.55;

  const wave1 = Math.sin((nx * Math.PI) * 1.0) * (h * 0.18);
  const wave2 = Math.sin((nx * Math.PI) * 2.3 + 0.7) * (h * 0.04);
  const wave3 = Math.sin((nx * Math.PI) * 5.2 + 1.9) * (h * 0.015);

  // highest near center-ish; "knoll" feeling
  const bump = Math.exp(-Math.pow((nx - 0.55) / 0.22, 2)) * (h * 0.10);

  return horizon + (h * 0.18) - wave1 - wave2 - wave3 - bump;
}

function ridgeY(x: number, w: number, h: number): number {
  // distant ridge near horizon
  const nx = x / w;
  const base = h * 0.52;
  const wave = Math.sin(nx * Math.PI * 1.2 + 0.4) * (h * 0.02)
             + Math.sin(nx * Math.PI * 3.5 + 1.1) * (h * 0.008);
  return base + wave;
}

function pathFromCurve(
  yAtX: (x: number) => number,
  w: number,
  h: number,
  step: number
): string {
  let d = `M 0 ${yAtX(0).toFixed(2)}`;
  for (let x = step; x <= w; x += step) {
    d += ` L ${x} ${yAtX(x).toFixed(2)}`;
  }
  d += ` L ${w} ${h} L 0 ${h} Z`;
  return d;
}

function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]!;
}

export function make_grassy_knoll_svg(opts: KnollOpts): string {
  const { width: w, height: h, seed, grassCount, pixelSize } = opts;
  const r = mulberry32(seed);

  // palettes (small, on purpose)
  const grassColors = [
    "#2f8f2f", "#2b7f2b", "#3aa33a", "#256f25", "#4ab54a",
    "#2f9c3b", "#1f6a2a"
  ] as const;

  const ridgeColors = ["#7ccf63", "#74c85f", "#6fbe58"] as const;

  const hill = (x: number) => hillY(x, w, h);
  const ridge = (x: number) => ridgeY(x, w, h);

  // Build paths (use a moderate step for smooth curves)
  const hillPath = pathFromCurve(hill, w, h, Math.max(6, Math.floor(w / 140)));
  const ridgePath = pathFromCurve(ridge, w, h, Math.max(10, Math.floor(w / 90)));

  // Grass "pixels"
  // We scatter x uniformly; y is somewhere between hill surface and bottom,
  // biased toward the surface so it looks grassy near the crest.
  const blades: string[] = [];
  for (let i = 0; i < grassCount; i += 1) {
    const x = Math.floor(r() * w);

    const yTop = hill(x);
    const yBottom = h;

    // bias toward the top surface (more detail near the visible hill)
    const t = Math.pow(r(), 2.2); // smaller = closer to top
    const y = lerp(yTop, yBottom, t);

    // skip if we accidentally land above the hill surface
    if (y < yTop) continue;

    // blocky rectangles with tiny jitter
    const px = pixelSize;
    const jitterX = (r() - 0.5) * px * 0.8;
    const jitterY = (r() - 0.5) * px * 0.8;

    const bladeH = clamp(
      px * (1 + r() * 2.8) * (1 - t * 0.55), // shorter deeper down
      px,
      px * 4.5
    );

    const bladeW = clamp(px * (0.8 + r() * 0.8), px * 0.6, px * 1.6);

    const fill = pick(grassColors, r);
    const op = clamp(0.35 + r() * 0.55, 0.35, 0.9);

    blades.push(
      `<rect x="${(x + jitterX).toFixed(1)}" y="${(y - bladeH + jitterY).toFixed(1)}" width="${bladeW.toFixed(1)}" height="${bladeH.toFixed(1)}" fill="${fill}" fill-opacity="${op.toFixed(2)}" shape-rendering="crispEdges" />`
    );
  }

  // A few brighter “sparkles” near the crest for sunlit feel
  const sparkles: string[] = [];
  for (let i = 0; i < Math.floor(grassCount * 0.03); i += 1) {
    const x = Math.floor(r() * w);
    const y = hill(x) + (r() * 18);
    sparkles.push(
      `<rect x="${x}" y="${y.toFixed(1)}" width="${pixelSize}" height="${pixelSize}" fill="#b8ff9c" fill-opacity="${(0.12 + r() * 0.22).toFixed(2)}" shape-rendering="crispEdges" />`
    );
  }

  // light grain (very subtle)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2b7fd6"/>
      <stop offset="65%" stop-color="#7cc7ff"/>
      <stop offset="100%" stop-color="#bfe9ff"/>
    </linearGradient>

    <radialGradient id="sunGlow" cx="20%" cy="20%" r="35%">
      <stop offset="0%" stop-color="#fff7c2" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="#fff1a1" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="hillFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#55c455"/>
      <stop offset="55%" stop-color="#2f9f42"/>
      <stop offset="100%" stop-color="#1e6f2b"/>
    </linearGradient>

    <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.06 0" />
    </filter>
  </defs>

  <!-- sky -->
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${Math.floor(w * 0.22)}" cy="${Math.floor(h * 0.20)}" r="${Math.floor(h * 0.22)}" fill="url(#sunGlow)"/>

  <!-- distant ridge -->
  <path d="${ridgePath}" fill="${pick(ridgeColors, r)}" fill-opacity="0.75"/>

  <!-- main hill -->
  <path d="${hillPath}" fill="url(#hillFill)"/>

  <!-- grass texture -->
  <g>
    ${blades.join("\n    ")}
    ${sparkles.join("\n    ")}
  </g>

  <!-- subtle grain over everything -->
  <rect x="0" y="0" width="${w}" height="${h}" filter="url(#grain)" opacity="0.45"/>
</svg>
`.trim();

  return svg;
}