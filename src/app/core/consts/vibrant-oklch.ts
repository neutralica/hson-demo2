

export const OKLCH_VIBRANT = {
  // --- neutrals / anchors ---
  voidInk: "oklch(0.18 0.030 255)", // near-black blue-black
  graphite: "oklch(0.28 0.018 250)", // dark cool graphite
  ghost: "oklch(0.84 0.020 260)", // pale cool off-white


  // --- reds ---
  redOxide: "oklch(0.62 0.080 20)", // muted structural red
  redBrick: "oklch(0.58 0.110 25)", // deeper grounded red
  redInfra: "oklch(0.55 0.160 10)", // darker synthetic red
  redSignal: "oklch(0.66 0.180 25)", // assertive UI red
  redLaser: "oklch(0.70 0.230 20)", // high-chroma spike
  redRustBloom: "oklch(0.60 0.095 15)", // dusty red-brown
  roseSmoke: "oklch(0.73 0.090 350)", // desaturated red-rose
  roseNeon: "oklch(0.74 0.200 355)", // hot pink-red glow


  // --- oranges / ambers ---
  orangeEmber: "oklch(0.68 0.125 25)", // orange-red ember
  orangeTangerine: "oklch(0.76 0.145 45)", // bright synthetic orange
  amberPulse: "oklch(0.82 0.125 75)", // warm amber accent
  yellowBrass: "oklch(0.70 0.090 85)", // darker metallic yellow
  yellowPollen: "oklch(0.82 0.110 90)", // softened warm yellow
  yellowSodium: "oklch(0.88 0.140 95)", // streetlight yellow
  yellowCanary: "oklch(0.90 0.160 100)", // bright signal yellow
  yellowVolt: "oklch(0.86 0.200 105)", // electric yellow spike


  // --- yellow-greens / greens ---
  limeChartreuse: "oklch(0.84 0.180 115)", // yellow-green bridge color
  limeAcid: "oklch(0.84 0.175 125)", // synthetic acid lime
  mossToxic: "oklch(0.72 0.100 145)", // murky cyberpunk green
  fernStatic: "oklch(0.76 0.095 160)", // greener cool accent
  mintIce: "oklch(0.80 0.090 175)", // pale mint-green


  // --- cyans ---
  cyanSeaLaser: "oklch(0.74 0.125 190)", // vivid cyan accent
  cyanGlass: "oklch(0.78 0.110 215)", // clean glassy cyan


  // --- blues ---
  blueGlacier: "oklch(0.82 0.060 220)", // pale icy blue
  blueHorizon: "oklch(0.76 0.080 230)", // soft mid blue
  blueSignal: "oklch(0.70 0.135 240)", // bright UI blue
  blueCobalt: "oklch(0.68 0.120 255)", // richer anchor blue
  blueNavyVoid: "oklch(0.42 0.090 250)", // deep structural blue
  blueYves: "oklch(0.52 0.10 250)", // richer anchor blue


  // --- indigo / violet ---
  indigoDeepSignal: "oklch(0.60 0.140 260)", // blue-violet accent
  violetTwilight: "oklch(0.66 0.085 270)", // muted twilight violet
  violetIon: "oklch(0.72 0.155 285)", // energized violet
  plumBruised: "oklch(0.62 0.115 305)", // darker purple-plum
  orchidWire: "oklch(0.76 0.145 320)", // bright orchid-magenta
};

export const OKLCH_NEUTRALS = {
  // --- absolute anchors ---
  black: "oklch(0.04 0.005 260)", // near-true black (very slight cool bias)
  white: "oklch(0.96 0.005 260)", // near-true white


  // --- dark scale ---
  void: "oklch(0.08 0.010 255)", // primary background
  ink: "oklch(0.12 0.015 255)", // elevated background
  charcoal: "oklch(0.18 0.018 250)", // panels / containers
  graphite: "oklch(0.26 0.020 250)", // borders / low-contrast UI


  // --- mid scale ---
  slate: "oklch(0.38 0.018 255)", // dividers / inactive elements
  steel: "oklch(0.48 0.015 255)", // subdued text / icons
  ash: "oklch(0.60 0.012 260)", // secondary text


  // --- light scale ---
  silver: "oklch(0.72 0.010 260)", // primary text on dark
  frost: "oklch(0.82 0.010 260)", // bright UI text
  paper: "oklch(0.82 0.02 260)", // light surfaces


  // --- tinted neutrals (subtle personality) ---
  blueTint: "oklch(0.70 0.020 240)", // cool UI wash
  violetTint: "oklch(0.68 0.022 280)", // slight cyberpunk flavor
  greenTint: "oklch(0.72 0.020 160)", // pairs with acid accents


  // --- utility ---
  border: "oklch(0.30 0.015 255)", // consistent border tone
  overlay: "oklch(0.04 0.010 260 / 0.65)", // modal overlays
};
