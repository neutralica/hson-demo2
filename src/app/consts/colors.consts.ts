
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

export const LETTER_COLOR_std = {
  H: "rgb(0, 220, 255)",
  S: "rgb(255, 210, 0)",
  O: "rgb(0, 255, 120)",
  N: "rgb(255, 100, 170)",
};



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

