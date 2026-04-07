
const greenDragon = "rgba(24, 201, 137, 1)";
const greenEaster = "rgba(120,255,180,1)";
const greenBleach = "rgba(228, 244, 228, 1)";
const greenCandy = "rgba(88, 215, 151, 1)";
const greenMuted = "rgba(96, 193, 141, 1)";
const greenFaded = "rgba(80, 163, 119, 1)";
const greenStd = "rgb(0, 255, 120)";

const blueEaster = "rgba(80,200,255,1)";
const blueSky = "rgba(68, 149, 255, 1)";
const blueBaby = "rgba(125, 169, 228, 1)";
const blueCandy = "rgba(46, 167, 255, 1)";
const bluePastel = "rgba(146, 193, 255, 1)";
const blueBleach = "rgba(221, 221, 249, 1)";
const blueMuted = "rgba(116, 152, 216, 1)";
const blueFaded = "rgba(97, 130, 231, 1)";
const blueStd = "rgb(0, 220, 255)";

const richCrimson = "rgba(228, 34, 125, 1)"
const redHeartsBlood = "rgba(161, 49, 49, 1)"

const pinkCandy = "rgba(233, 123, 209, 1)";
const pinkEaster = "rgba(255,140,200,1)";
const pinkBleach = "rgba(255,225,232,1)";
const pinkMuted = "rgba(180, 114, 144, 1)";
const pinkFaded = "rgba(180, 114, 144, 1)";
const pinkStd = "rgb(255, 100, 170)"

const purpleStoner = "rgba(126, 40, 143, 1)"

const yellowEaster = "rgba(255,210,80,1)";
const yellowBleach = "rgba(255, 252, 233, 1)";
const yellowStd = "rgb(255, 210, 0)";
const yellowCandy = "rgba(231, 223, 116, 1)";
const yellowMuted = "rgba(189, 171, 92, 1)";
const yellowFaded = "rgba(163, 145, 64, 1)";

const greyLite = "rgba(230, 230, 230, 1)"
const grey = "rgba(202, 202, 202, 1)"
const greyMid = "rgba(182, 182, 182, 1)"
const greyDim = "rgba(134, 134, 134, 1)"
const greyDimmer = "rgba(58, 58, 58, 1)"
const greyDark = "rgba(40, 38, 38, 1)"
const greyBlack = "rgba(26, 26, 26, 1)"
const deepBack = "rgba(7, 7, 10, 1)"

const bckColorR = 12;
const bckColorG = 19;
const bckColorB = 26;
const bcklight = `rgba(${bckColorR * 1.2}, ${bckColorG * 1.2}, ${bckColorB * 1.2}, 1)`;

const bckAlpha = 1;
const bckColor = `rgba(${bckColorR}, ${bckColorG}, ${bckColorB}, ${bckAlpha})`;

export const back_w_alpha = (num: number) => `rgba(${bckColorR}, ${bckColorG}, ${bckColorB}, ${num})`;

const oddYellow = "rgba(120, 180, 60, 1)"
const oddPurple = "rgba(170, 100, 230, 1)"
const oddPeriwinkle = "rgba(120, 180, 230, 1)"
const oddUmbre = "rgba(205, 145, 130, 1)"
const oddSeagreen = "rgba(90, 235, 170,1)"


export const _setBckgdAlpha = (n: number) => {
  return `rgba(${bckColorR}, ${bckColorG}, ${bckColorB}, ${n <= 1 ? n : 1})`;
}

export const bckRGB = {
  r: bckColorR,
  g: bckColorG,
  b: bckColorB,
}

export const LETTER_COLORstd = {
  h: blueStd,
  s: yellowStd,
  o: pinkStd,
  n: greenStd,
};


export const LETTER_COLORmuted = {
  h: blueMuted,
  s: yellowMuted,
  o: greenMuted,
  n: pinkMuted,
};
export const LETTER_COLORfaded = {
  h: blueFaded,
  s: yellowFaded,
  o: greenFaded,
  n: pinkFaded,
};

export const LETTER_COLORwashed = {
  h: "rgba(53, 107, 115, 1)",
  s: "rgba(107, 95, 41, 1)",
  o: "rgba(45, 94, 68, 1)",
  n: "rgba(110, 66, 86, 1)",
};

export const LETTER_COLORbleach = {
  h: blueBleach,
  s: yellowBleach,
  o: greenBleach,
  n: pinkBleach,
} as const;


export const LETTER_COLORsubdued = {
  h: blueEaster,
  s: yellowEaster,
  o: greenEaster,
  n: pinkEaster,
} as const;

export const LETTER_COLORcandy = {
  h: blueCandy, // darker
  s: yellowCandy, // slightly cool
  o: greenCandy, // bright
  n: pinkCandy, // slightly warm
} as const;



export const $blu_ = {
  sky: blueSky,
  pastel: bluePastel,
  baby: blueBaby,
  bleach: blueBleach,
  candy: blueCandy,
  easter: blueEaster,
  faded: blueFaded,
  muted: blueMuted,
  std: blueStd

};
export const $grn_ = {
  dragon: greenDragon,
  bleach: greenBleach,
  candy: greenCandy,
  easter: greenEaster,
  faded: greenFaded,
  muted: greenMuted,
  std: greenStd
};
export const $gry_ = {
  std: grey,
  lite: greyLite,
  mid: greyMid,
  dim: greyDim,
  dimmer: greyDimmer,
  dark: greyDark,
  black: greyBlack,
};
export const $ylw_ = {
  bleach: yellowBleach,
  candy: yellowCandy,
  easter: yellowEaster,
  faded: yellowFaded,
  muted: yellowMuted,
  std: yellowStd
};
export const $pnk_ = {
  bleach: pinkBleach,
  candy: pinkCandy,
  easter: pinkEaster,
  faded: pinkFaded,
  muted: pinkMuted,
  std: pinkStd
};

export const $red_etc_ = {
  richCrimson,
  heartsBlood: redHeartsBlood,
  stonerPurple: purpleStoner,
}



export const ACID_WASH_RGBA = {
  paleGrey: "rgba(190,200,210,0.85)",
  coolMist: "rgba(170,190,205,0.85)",
  dimIce: "rgba(160,185,210,0.82)",

  fadedMint: "rgba(140,200,175,0.88)",
  oxidized: "rgba(120,175,155,0.86)",
  seafoam: "rgba(150,210,195,0.82)",

  softBlue: "rgba(135,175,215,0.88)",
  denimDust: "rgba(120,155,200,0.85)",
  slateBlue: "rgba(140,160,220,0.80)",

  mutedViolet: "rgba(175,140,215,0.85)",
  wornPurple: "rgba(160,130,190,0.83)",
  fadedMagenta: "rgba(210,140,200,0.82)",

  warmAsh: "rgba(205,180,150,0.88)",
  dullAmber: "rgba(220,185,120,0.85)",
  strawSmoke: "rgba(210,205,130,0.80)",

  oxidizedRed: "rgba(200,140,140,0.84)",
  brickDust: "rgba(185,125,115,0.82)",

  neonGhost: "rgba(120,240,210,0.70)",  // faint phosphor effect
  terminalGreen: "rgba(150,220,150,0.78)",

  dimWhite: "rgba(225,230,235,0.90)",
};

export const ACID_WASH_OKLCH = {
  ash: "oklch(0.83 0.0 300)",  // soft neutral grey-blue
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

export const OKLCH_WASHED_NEON_4 = {
  blue: "oklch(0.79 0.085 235)",
  yellow: "oklch(0.83 0.09 100)",
  green: "oklch(0.76 0.08 145)",
  pink: "oklch(0.78 0.09 340)",
};

export const OKLCH_MUTED_PASTEL = {
  blue: "oklch(0.77 0.05 245)",
  yellow: "oklch(0.81 0.055 95)",
  green: "oklch(0.74 0.05 150)",
  pink: "oklch(0.76 0.055 335)",
};
export const COLOR_4WAY = {
  ui: OKLCH_SOFT_CORE_4,
  accent: OKLCH_TERMINAL_4,
  playful: OKLCH_WASHED_NEON_4,
  muted: OKLCH_MUTED_PASTEL
};

export const COLORS_ = {
  bckgd: bckColor,
  bckdeep: deepBack,
  bcklight,
  oddPeriwinkle,
  oddPurple,
  oddSeagreen,
  oddUmbre,
  oddYellow

};


export const CYBERPUNK_2060_OKLCH = {
  // --- neutrals / anchors ---
  voidInk:      "oklch(0.18 0.030 255)", // near-black blue-black
  graphite:     "oklch(0.28 0.018 250)", // dark cool graphite
  ghost:        "oklch(0.84 0.020 260)", // pale cool off-white

  // --- reds ---
  redOxide:     "oklch(0.62 0.080 20)",  // muted structural red
  redBrick:     "oklch(0.58 0.110 25)",  // deeper grounded red
  redInfra:     "oklch(0.55 0.160 10)",  // darker synthetic red
  redSignal:    "oklch(0.66 0.180 25)",  // assertive UI red
  redLaser:     "oklch(0.70 0.230 20)",  // high-chroma spike
  redRustBloom: "oklch(0.60 0.095 15)",  // dusty red-brown
  roseSmoke:    "oklch(0.73 0.090 350)", // desaturated red-rose
  roseNeon:     "oklch(0.74 0.200 355)", // hot pink-red glow

  // --- oranges / ambers ---
  orangeEmber:  "oklch(0.68 0.125 25)",  // orange-red ember
  orangeTangerine: "oklch(0.76 0.145 45)", // bright synthetic orange
  amberPulse:   "oklch(0.82 0.125 75)",  // warm amber accent
  yellowBrass:  "oklch(0.70 0.090 85)",  // darker metallic yellow
  yellowPollen: "oklch(0.82 0.110 90)",  // softened warm yellow
  yellowSodium: "oklch(0.88 0.140 95)",  // streetlight yellow
  yellowCanary: "oklch(0.90 0.160 100)", // bright signal yellow
  yellowVolt:   "oklch(0.86 0.200 105)", // electric yellow spike

  // --- yellow-greens / greens ---
  limeChartreuse: "oklch(0.84 0.180 115)", // yellow-green bridge color
  limeAcid:     "oklch(0.84 0.175 125)", // synthetic acid lime
  mossToxic:    "oklch(0.72 0.100 145)", // murky cyberpunk green
  fernStatic:   "oklch(0.76 0.095 160)", // greener cool accent
  mintIce:      "oklch(0.80 0.090 175)", // pale mint-green

  // --- cyans ---
  cyanSeaLaser: "oklch(0.74 0.125 190)", // vivid cyan accent
  cyanGlass:    "oklch(0.78 0.110 215)", // clean glassy cyan

  // --- blues ---
  blueGlacier:  "oklch(0.82 0.060 220)", // pale icy blue
  blueHorizon:  "oklch(0.76 0.080 230)", // soft mid blue
  blueSignal:   "oklch(0.70 0.135 240)", // bright UI blue
  blueCobalt:   "oklch(0.68 0.120 255)", // richer anchor blue
  blueNavyVoid: "oklch(0.42 0.090 250)", // deep structural blue
  blueYves:   "oklch(0.52 0.10 250)", // richer anchor blue

  // --- indigo / violet ---
  indigoDeepSignal: "oklch(0.60 0.140 260)", // blue-violet accent
  violetTwilight:   "oklch(0.66 0.085 270)", // muted twilight violet
  violetIon:        "oklch(0.72 0.155 285)", // energized violet
  plumBruised:      "oklch(0.62 0.115 305)", // darker purple-plum
  orchidWire:       "oklch(0.76 0.145 320)", // bright orchid-magenta
};

export const CYBERPUNK_2060_NEUTRALS = {
  // --- absolute anchors ---
  black:        "oklch(0.04 0.005 260)", // near-true black (very slight cool bias)
  white:        "oklch(0.96 0.005 260)", // near-true white

  // --- dark scale ---
  void:         "oklch(0.08 0.010 255)", // primary background
  ink:          "oklch(0.12 0.015 255)", // elevated background
  charcoal:     "oklch(0.18 0.018 250)", // panels / containers
  graphite:     "oklch(0.26 0.020 250)", // borders / low-contrast UI

  // --- mid scale ---
  slate:        "oklch(0.38 0.018 255)", // dividers / inactive elements
  steel:        "oklch(0.48 0.015 255)", // subdued text / icons
  ash:          "oklch(0.60 0.012 260)", // secondary text

  // --- light scale ---
  silver:       "oklch(0.72 0.010 260)", // primary text on dark
  frost:        "oklch(0.82 0.010 260)", // bright UI text
  paper:        "oklch(0.82 0.02 260)", // light surfaces

  // --- tinted neutrals (subtle personality) ---
  blueTint:     "oklch(0.70 0.020 240)", // cool UI wash
  violetTint:   "oklch(0.68 0.022 280)", // slight cyberpunk flavor
  greenTint:    "oklch(0.72 0.020 160)", // pairs with acid accents

  // --- utility ---
  border:       "oklch(0.30 0.015 255)", // consistent border tone
  overlay:      "oklch(0.04 0.010 260 / 0.65)", // modal overlays
};