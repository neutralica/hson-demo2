

const invalidRed = "rgba(200, 50, 50, 1)"


const greenDragon = "rgba(24, 201, 137, 1)";
const greenEaster = "rgba(120,255,180,0.40)";
const greenBleach = "rgba(228, 244, 228, 1)";
const greenCandy = "rgba(88, 215, 151, 1)";
const greenMuted = "rgba(96, 193, 141, 1)";
const greenFaded = "rgba(80, 163, 119, 1)";
const greenStd = "rgb(0, 255, 120)";

const blueEaster = "rgba(80,200,255,0.55)";
const blueSky = "rgba(68, 149, 255, 1)";
const blueBaby = "rgba(125, 169, 228, 1)";
const blueCandy = "rgba(46, 167, 255, 1)";
const bluePastel = "rgba(146, 193, 255, 1)";
const blueBleach = "rgba(221, 221, 249, 1)";
const blueMuted = "rgba(96, 182, 196, 1)";
const blueFaded = "rgba(77, 150, 161, 1)";
const blueStd = "rgb(0, 220, 255)";

const richCrimson = "rgba(228, 34, 125, 1)"
const redHeartsBlood = "rgba(161, 49, 49, 1)"

const pinkCandy = "rgba(233, 123, 209, 1)";
const pinkEaster = "rgba(255,140,200,0.40)";
const pinkBleach = "rgba(255,225,232,1)";
const pinkMuted = "rgba(180, 114, 144, 1)";
const pinkFaded = "rgba(180, 114, 144, 1)";
const pinkStd = "rgb(255, 100, 170)"

const purpleStoner = "rgba(126, 40, 143, 1)"

const yellowEaster = "rgba(255,210,80,0.45)";
const yellowBleach = "rgba(255, 252, 233, 1)";
const yellowStd = "rgb(255, 210, 0)";
const yellowCandy = "rgba(231, 223, 116, 1)";
const yellowMuted = "rgba(189, 171, 92, 1)";
const yellowFaded = "rgba(163, 145, 64, 1)";

const greyLite = "rgba(230, 230, 230, 1)"
const greyMid = "rgba(82, 82, 82, 1)"
const grey = "rgba(114, 114, 114, 1) 1)"
const greyDim = "rgba(58, 58, 58, 1)"
const greyDimmer = "rgba(40, 38, 38, 1)"
const greyBlack = "rgba(26, 26, 26, 1)"
const deepBack = "#07070a"

const bckColorR = 12;
const bckColorG = 19;
const bckColorB = 26;

const bckAlpha = 1;
const bckColor = `rgba(${bckColorR}, ${bckColorG}, ${bckColorB}, ${bckAlpha})`;

export const _setBckgdAlpha = (n: number) => {
  return `rgba(${bckColorR}, ${bckColorG}, ${bckColorB}, ${n <= 1 ? n : 1})`;
}

export const bckRGB = {
  r: bckColorR,
  g: bckColorG,
  b: bckColorB,
}
const txtMain = greyLite;

export const LETTER_COLORstd = {
  h: blueStd,
  s: yellowStd,
  o: greenStd,
  n: pinkStd,
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

export const $cols_ = {
  txtmain: txtMain,
  bckgd: bckColor,
  backdeep: deepBack,
  txtarea: $grn_.faded,
  sysInvalid: invalidRed,


};

