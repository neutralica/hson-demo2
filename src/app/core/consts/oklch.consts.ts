

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
  redSignal2: "oklch(0.16 0.90 25)", // assertive UI red ... 2
  redLaser: "oklch(0.70 0.230 20)", // high-chroma spike
  redRustBloom: "oklch(0.60 0.095 15)", // dusty red-brown
  roseSmoke: "oklch(0.73 0.090 350)", // desaturated red-rose
  roseNeon: "oklch(0.74 0.200 355)", // hot pink-red glow
  roseNeon2: "oklch(0.7 0.170 355)", // hot pink-red glow


  // --- oranges / ambers ---
  orangeEmber: "oklch(0.68 0.125 25)", // orange-red ember
  orangeTangerine: "oklch(0.76 0.145 45)", // bright synthetic orange
  amberPulse: "oklch(0.82 0.125 75)", // warm amber accent
  yellowBrass: "oklch(0.70 0.090 85)", // darker metallic yellow
  yellowPollen: "oklch(0.79 0.110 90)", // softened warm yellow
  yellowSodium: "oklch(0.8 0.170 100)", // streetlight yellow
  yellowCanary: "oklch(0.90 0.160 100)", // bright signal yellow
  yellowVolt: "oklch(0.86 0.200 105)", // electric yellow spike
  yellowSunStaringEyesBright: "oklch(0.7 0.001 101)", // electric yellow spike


  // --- yellow-greens / greens ---
  limeChartreuse: "oklch(0.84 0.180 115)", // yellow-green bridge color
  limeAcid: "oklch(0.84 0.175 125)", // synthetic acid lime
  mossToxic: "oklch(0.72 0.100 145)", // murky cyberpunk green
  fernStatic: "oklch(0.76 0.095 160)", // greener cool accent
  mintIce: "oklch(0.70 0.10 175)", // pale mint-green


  // --- cyans ---
  cyanSeaLaser: "oklch(0.74 0.125 190)", // vivid cyan accent
  cyanGlass: "oklch(0.78 0.110 215)", // clean glassy cyan


  // --- blues ---
  blueGlacier: "oklch(0.82 0.060 220)", // pale icy blue
  blueHorizon: "oklch(0.62 0.280 230)", // soft mid blue
  blueSignal: "oklch(0.70 0.135 240)", // bright UI blue
  blueCobalt: "oklch(0.68 0.120 255)", // richer anchor blue
  blueNavyVoid: "oklch(0.42 0.090 250)", // deep structural blue
  blueYves: "oklch(0.52 0.10 250)", // richer anchor blue
  blueElecky: "oklch(0.82 0.210 250)", // richer anchor blue


  // --- indigo / violet ---
  indigoDeepSignal: "oklch(0.60 0.140 260)", // blue-violet accent
  violetTwilight: "oklch(0.66 0.085 270)", // muted twilight violet
  violetIon: "oklch(0.72 0.155 285)", // energized violet
  plumBruised: "oklch(0.62 0.115 305)", // darker purple-plum
  orchidWire: "oklch(0.76 0.145 320)", // bright orchid-magenta
  royalBlueGraffiti: "oklch(0.001 0.22 300)"
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
  frost: "oklch(0.8 0.030 260)", // bright UI text
  frost2: "oklch(0.82 0.040 260)", // bright UI text
  paper: "oklch(0.82 0.02 260)", // light surfaces

  /* beige-brown conteingent */
 pearlIvory: "oklch(.94 0.025 92)",
  oldPaper: "oklch(.90 0.035 88)",
  strawWash: "oklch(.86 0.052 86)",
  paleVellum: "oklch(.82 0.040 78)",
  champagneAsh: "oklch(.76 0.045 78)",
  mothTaupe: "oklch(.68 0.035 70)",
  dryReed: "oklch(.82 0.055 75)",
  mutedOchre: "oklch(.56 0.072 72)",
  tarnishedBrass: "oklch(.50 0.070 77)",
  tobaccoBrown: "oklch(.6 0.16 64)",
  smokedUmber: "oklch(.34 0.045 58)",
  walnutBlack: "oklch(.24 0.030 55)",

  // --- tinted neutrals (subtle personality) ---
  blueTint: "oklch(0.70 0.020 240)", // cool UI wash
  violetTint: "oklch(0.68 0.022 280)", // slight cyberpunk flavor
  greenTint: "oklch(0.72 0.020 160)", // pairs with acid accents


  // --- utility ---
  border: "oklch(0.30 0.015 255)", // consistent border tone
  overlay: "oklch(0.04 0.010 260 / 0.65)", // modal overlays
};

export const OKLCH_ACID_WASHED = {
  ash: "oklch(0.83 0.0 300)", // soft neutral grey-blue
  frost: "oklch(0.82 0.02 210)",
  mist: "oklch(0.78 0.018 260)",

  sage: "oklch(0.75 0.05 155)",
  moss: "oklch(0.72 0.06 145)",
  fern: "oklch(0.70 0.055 165)",

  ice: "oklch(0.80 0.045 220)",
  sky: "oklch(0.77 0.06 240)",
  steel: "oklch(0.74 0.05 250)",

  lilac: "oklch(0.78 0.07 300)",
  orchid: "oklch(0.75 0.08 320)",
  smokeRose: "oklch(0.73 0.06 20)",

  ember: "oklch(0.74 0.07 35)",
  amber: "oklch(0.68 0.08 80)",
  straw: "oklch(0.82 0.07 95)",

  cyanDust: "oklch(0.79 0.055 200)",
  seaGlass: "oklch(0.76 0.06 185)",

  mutedRed: "oklch(0.72 0.07 15)",
  bruisedPlum: "oklch(0.70 0.06 330)",
  twilight: "oklch(0.68 0.045 280)",
};

export const OKLCH_FOREST = {
  blackPine: "oklch(13 0.025 155)",
  deepMossBlack: "oklch(16 0.035 145)",
  spruceNight: "oklch(18 0.040 158)",
  laurelShadow: "oklch(20 0.035 135)",
  bottleGlass: "oklch(22 0.045 165)",
  wetFern: "oklch(25 0.050 148)",
  oldHedge: "oklch(28 0.045 138)",
  cypressInk: "oklch(17 0.030 172)",
} as const;


export const ACID_WASH_OKLCH = {
  ash: "oklch(0.83 0.0 300)", // soft neutral grey-blue
  frost: "oklch(0.82 0.02 210)",
  mist: "oklch(0.78 0.018 260)",

  sage: "oklch(0.75 0.05 155)",
  moss: "oklch(0.72 0.06 145)",
  fern: "oklch(0.70 0.055 165)",

  ice: "oklch(0.80 0.045 220)",
  sky: "oklch(0.77 0.06 240)",
  steel: "oklch(0.74 0.05 250)",

  lilac: "oklch(0.78 0.07 300)",
  orchid: "oklch(0.75 0.08 320)",
  smokeRose: "oklch(0.73 0.06 20)",

  ember: "oklch(0.74 0.07 35)",
  amber: "oklch(0.68 0.08 80)",
  straw: "oklch(0.82 0.07 95)",

  cyanDust: "oklch(0.79 0.055 200)",
  seaGlass: "oklch(0.76 0.06 185)",

  mutedRed: "oklch(0.72 0.07 15)",
  bruisedPlum: "oklch(0.70 0.06 330)",
  twilight: "oklch(0.68 0.045 280)",
};

export const OKLCH_SOFT_CORE_4 = {
  blue: "oklch(0.78 0.065 240)",
  yellow: "oklch(0.82 0.08 95)",
  green: "oklch(0.75 0.06 150)",
  pink: "oklch(0.77 0.075 330)",
};

export const OKLCH_TERMINAL_4 = {
  blue: "oklch(0.76 0.09 245)",
  yellow: "oklch(0.80 0.10 90)",
  green: "oklch(0.73 0.085 155)",
  pink: "oklch(0.75 0.095 335)",
};

// export const OKLCH_WASHED_NEON_4 = {
//   blue: "oklch(0.79 0.085 235)",
//   yellow: "oklch(0.83 0.09 100)",
//   green: "oklch(0.76 0.08 145)",
//   pink: "oklch(0.78 0.09 340)",
// };

// export const OKLCH_MUTED_PASTEL = {
//   blue: "oklch(0.77 0.05 245)",
//   yellow: "oklch(0.81 0.055 95)",
//   green: "oklch(0.74 0.05 150)",
//   pink: "oklch(0.76 0.055 335)",
// };

