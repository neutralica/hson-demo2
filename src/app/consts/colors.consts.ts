
const dragonGreen = "rgba(24, 201, 137, 1)";
const skyBlue = "rgba(68, 149, 255, 1)";
const richCrimson = "rgba(170, 20, 90, 1)"
const heartsBlood = "rgba(161, 49, 49, 1)"
const stonerPurple = "rgba(126, 40, 143, 1)"

const greyLite = "rgba(230, 230, 230, 1)"
const greyMid = "rgba(82, 82, 82, 1)"
const grey = "rgba(114, 114, 114, 1) 1)"
const greyDim = "rgba(58, 58, 58, 1)"
const greyDimmer = "rgba(40, 38, 38, 1)"
const greyBlack = "rgba(26, 26, 26, 1)"

const bckColorR = 12;
const bckColorG = 19;
const bckColorB = 26;
const bckAlpha = 1;
const bckColor = `rgba(${bckColorR}, ${bckColorG}, ${bckColorB}, ${bckAlpha})`;
export const _setBckgdAlpha = (n: number) => {
  return `rgba(${bckColorR}, ${bckColorG}, ${bckColorB}, ${n <= 1 ? n : 1})`;
}
export const _bckRGB = {
  r: bckColorR,
  g: bckColorG,
  b: bckColorB,
}
const txtMain = greyLite;

export const LETTER_COLORstd = {
  h: "rgb(0, 220, 255)",
  s: "rgb(255, 210, 0)",
  o: "rgb(0, 255, 120)",
  n: "rgb(255, 100, 170)",
};

export const LETTER_COLORmuted = {
  h: "rgba(96, 182, 196, 1)",
  s: "rgba(189, 171, 92, 1)",
  o: "rgba(96, 193, 141, 1)",
  n: "rgba(180, 114, 144, 1)",
};

export const LETTER_COLORfaded = {
  h: "rgba(77, 150, 161, 1)",
  s: "rgba(163, 145, 64, 1)",
  o: "rgba(80, 163, 119, 1)",
  n: "rgba(180, 114, 144, 1)",
};

export const LETTER_COLORwashed = {
  h: "rgba(53, 107, 115, 1)",
  s: "rgba(107, 95, 41, 1)",
  o: "rgba(45, 94, 68, 1)",
  n: "rgba(110, 66, 86, 1)",
};

export const LETTER_COLORbright = {
  h: "rgb(230,230,235)",
  s: "rgb(220,220,226)",
  o: "rgb(235,235,240)",
  n: "rgb(255,225,232)",
} as const;


export const LETTER_COLORsubdued = {
  h: "rgba(80,200,255,0.55)",
  s: "rgba(255,210,80,0.45)",
  o: "rgba(120,255,180,0.40)",
  n: "rgba(255,140,200,0.40)",
} as const;

export const LETTER_COLORcandy = {
  h: "rgba(88, 215, 151, 1)", // bright
  s: "rgba(66, 167, 229, 1)", // darker
  o: "rgba(233, 123, 209, 1)", // slightly warm
  n: "rgba(116, 116, 231, 1)" // slightly cool
} as const;



export const $COL = {
  _txtmain: txtMain,
  _bckgd: bckColor,
  dragonGreen,
  skyBlue,
  richCrimson,
  heartsBlood,
  stonerPurple,
  grey,
  greyLite,
  greyMid,
  greyDim,
  greyDimmer,
  greyBlack,


};

