// ui-consts.ts


import type { Fmt } from "../types/core.types";
import { CssManager } from "hson-live";

export const øWATERMARK_FMT_: Record<Fmt, string> = {
  json: "{JSON}",
  hson: "<HSON>",
  html: "<HTML/>",
} as const;

export const _txt = {
  weight: {
    main: "100",
    fat: "900",
  },
  size: {
    smol: "14px",
    sansMain: "16px",
    main: "18px",
    header: "24px",
    title: "76px",
  },

} as const;

export const _fontWeight = {
  main: "100",
  fat: "900",
}

export const _fontSize = {
  smol: "14px",
  sansMain: "16px",
  main: "18px",
  header: "24px",
  title: "56px",
} as const;



export const SYS_MONOfont = "'DM Mono', Monaco, monospace";


// export const $CODE_FONT_SIZE = øTXT.main;

export const GRID_GAPstr = "2px";
export const $SIDEBAR_WIDTH = "15vw";
export const $LOGGER_WIDTH = "23vw"
export const $CONTENT_WIDTH = "90ch";

/* queryable consts */
export const ABOUT_ROOT_ID = "about-root";
export const $PANEL_HIDDEN = 'panel-hidden';

export const CURRENT_OKLCHname = "oklch-demo-current";
export const CURRENT_OKLCH = CssManager.api().var.key(CURRENT_OKLCHname);

export const $MENU_SHADOW = "0 0 55px ";
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
      @%                                                                              v2.3.3                                                                                         
    :"                                                
          
                                                                                                   
`;



