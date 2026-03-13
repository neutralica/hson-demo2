// demo.consts.ts


/* GOOD SEEDS: 1129, 3577 */
export const PAL_SEED = "3577";
export const PAL_CONFIG = { volatility: 1, grayWarmth: 0.35 };

const DEMO_STRINGS = {
  stage: "stage",
  demo: "demo",
  wall: "wall",
  wallFx: "wall-fx",
  inset: "screen-inset",
  screen: "demo-screen",
  screenFx: "screen-fx",
  menuBox: "menu-box",
} as const;
export const $DS = DEMO_STRINGS;


export const shade_class = (l: string) => {
  let shadeClass: string;
  switch (l) {
    case "h":
      return "blue-shade";
    case "s":
      return "yellow-shade";
    case "o":
      return "green-shade";
    case "n":
      return "pink-shade";
  }
  console.warn("shadeClass function failed");
  return "shadeClass function failed"
};

export const $PARSE = "parse";
export const $TEST = "test";
export const $BUILD = "build";
export const $FLEURS = "fleurs";
export const $OKLCH = "oklch";
export const $MOUSE = "mouse";
export const $ABOUT = "about";
export const MENU_OPTIONS = [
  $ABOUT,
  $TEST,
  $PARSE,
  $BUILD,
  $FLEURS,
  $OKLCH,
  $MOUSE,
] as const;

export const $PARSING_PANELS_ROOT = "parsing-panels-root";

export const $PP_HEAD = "pp-head";

export const HSON_LIVE_GRAFFITIstr = `

               .x+=:.                                        ..      .       _                    
  .uef^"      z'    ^%                                    x .d88"    @88>    u                     
:d88E            .   <k        u.      u.    u.            5888R     %8P    88Nu.   u.             
'888E          .@8Ned8"  ...ue888b   x@88k u@88c.          '888R      .    '88888.o888c      .u    
 888E .z8k   .@^%8888"   888R Y888r ^"8888""8888"           888R    .@88u   ^8888  8888   ud8888.  
 888E~?888L x88:  ')8b.  888R I888>   8888  888R            888R   ''888E'   8888  8888 :888'8888. 
 888E  888E 8888N=*8888  888R I888>   8888  888R            888R     888E    8888  8888 d888 '88%" 
 888E  888E  %8"    R88  888R I888>   8888  888R            888R     888E    8888  8888 8888.+"    
 888E  888E   @8Wou 9%  u8888cJ888    8888  888R   dR888b   888R     888E   .8888b.888P 8888L      
 888E  888E .888888P'    "*888*P"    "*88*" 8888"  tN888N  .888B .   888&    ^Y8888*""  '8888c. .+ 
m888N= 888> '   ^"F        'Y"         ""   'Y"            ^*888%    R888"     'Y"       "88888%   
 'Y"   888                                                   "%       ""                   "YP'    
      J88"                                                                                        
      @%                                                                                            
    :"                      Hypertext Structured Object Notation 
                                          2.0.26
                                          
`