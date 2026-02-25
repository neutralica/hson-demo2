(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function n(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(i){if(i.ep)return;i.ep=!0;const s=n(i);fetch(i.href,s)}})();var Ii;(function(e){e.INFO="info",e.WARN="warn",e.DEBUG="debug",e.ERROR="error"})(Ii||(Ii={}));var sa;(function(e){e.LOW="low",e.MED="medium",e.HIGH="high",e.CRIT="critical"})(sa||(sa={}));var oa;(function(e){e.CLIENT="client",e.SERVER="server",e.SYSTEM="system",e.UNKNOWN="unknown"})(oa||(oa={}));const ei="$NOVAL",zt={isOutcome(e){return typeof e=="object"&&e!==null&&"success"in e},isData(e){return e.success===!0&&e.data!==ei&&e.data!==void 0},isOK(e){return e.success===!0&&e.__only===!0&&e.data===ei},isErr(e){return e.success===!1&&e.__fail===!0&&e.err instanceof Ot}};class Ot extends Error{message;module;severity;status;stack;timestamp;source;metadata;constructor(t,n,a,i,s){super(t),this.message=t,this.module=n,this.source=a,this.severity=i,this.timestamp=new Date().toISOString(),this.stack=new Error(t).stack??"(no trace available)",s&&Object.assign(this,s)}static create(t){const n=typeof t.message=="string"&&t.message.length>0?t.message:"(/)",a=typeof t.module=="string"&&t.module.length>0?t.module:"unknown",i=t.source??oa.SYSTEM,s=t.severity??sa.MED;return new Ot(n,a,i,s,t)}addMessage(t){const n=typeof t=="string"?t.trim():"";if(n.length===0)return this;const a=this.message.trim();if(n===a)return this;const i=`${a}
${n}`;return Ot.create({...this.toData(),message:i})}addTrace(t){const n=typeof t=="string"&&t.length>0?t:"(empty tag)",a=this.metadata??{},i=a.breadcrumbs,s=Array.isArray(i)?i:typeof i=="string"&&i.length>0?[i]:[],o=s.includes(n)?s:[...s,n];return Ot.create({...this.toData(),metadata:{...a,breadcrumbs:o,enriched:!0}})}toData(){return{message:this.message,module:this.module,source:this.source,severity:this.severity,status:this.status,timestamp:this.timestamp,metadata:this.metadata}}}function bo(e,t){return e}const ne={data:e=>({success:!0,data:e}),ok:()=>({success:!0,data:ei,__only:!0}),err:(e,t)=>{const n=e.trim();let a;return t instanceof Ot?a=t.addMessage(n):a=Ot.create({message:n.length>0?n:"(/)",module:"unknown",source:oa.SYSTEM,severity:sa.MED,metadata:t===void 0?void 0:{cause:t}}),{success:!1,err:a,__fail:!0}}};function He(e,t){const n=a=>{const i=bo(a);if(zt.isErr(i))throw i.err;if(zt.isOK(i))throw ne.err("expected data, got ok").err;return i.data};return e instanceof Promise?e.then(n):n(e)}function Mr(e,t){const n=a=>{const i=bo(a);if(zt.isErr(i))throw i.err;if(zt.isData(i))throw ne.err("expected ok, got data").err;if(zt.isOK(i))return i;throw ne.err("invalid Outcome<void> state")};return e instanceof Promise?e.then(n):n(e)}var ti;(function(e){e.linear="linear",e.exp="exp",e.none="none"})(ti||(ti={}));ti.none;function A(e,t,n){const a=n?`
  :: ${n}`:"",i=`[ERR: transform = ${t}()]:
  -> ${e}${a}`;throw new Error(i)}const{entries:yo,setPrototypeOf:Gi,isFrozen:Er,getPrototypeOf:Or,getOwnPropertyDescriptor:Wr}=Object;let{freeze:_e,seal:$e,create:ni}=Object,{apply:ai,construct:ii}=typeof Reflect<"u"&&Reflect;_e||(_e=function(t){return t});$e||($e=function(t){return t});ai||(ai=function(t,n){for(var a=arguments.length,i=new Array(a>2?a-2:0),s=2;s<a;s++)i[s-2]=arguments[s];return t.apply(n,i)});ii||(ii=function(t){for(var n=arguments.length,a=new Array(n>1?n-1:0),i=1;i<n;i++)a[i-1]=arguments[i];return new t(...a)});const Wn=ke(Array.prototype.forEach),Nr=ke(Array.prototype.lastIndexOf),Hi=ke(Array.prototype.pop),Xt=ke(Array.prototype.push),Cr=ke(Array.prototype.splice),Xn=ke(String.prototype.toLowerCase),Na=ke(String.prototype.toString),Ca=ke(String.prototype.match),Qt=ke(String.prototype.replace),jr=ke(String.prototype.indexOf),Lr=ke(String.prototype.trim),Ie=ke(Object.prototype.hasOwnProperty),ge=ke(RegExp.prototype.test),Yt=Rr(TypeError);function ke(e){return function(t){t instanceof RegExp&&(t.lastIndex=0);for(var n=arguments.length,a=new Array(n>1?n-1:0),i=1;i<n;i++)a[i-1]=arguments[i];return ai(e,t,a)}}function Rr(e){return function(){for(var t=arguments.length,n=new Array(t),a=0;a<t;a++)n[a]=arguments[a];return ii(e,n)}}function H(e,t){let n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:Xn;Gi&&Gi(e,null);let a=t.length;for(;a--;){let i=t[a];if(typeof i=="string"){const s=n(i);s!==i&&(Er(t)||(t[a]=s),i=s)}e[i]=!0}return e}function Pr(e){for(let t=0;t<e.length;t++)Ie(e,t)||(e[t]=null);return e}function Xe(e){const t=ni(null);for(const[n,a]of yo(e))Ie(e,n)&&(Array.isArray(a)?t[n]=Pr(a):a&&typeof a=="object"&&a.constructor===Object?t[n]=Xe(a):t[n]=a);return t}function Zt(e,t){for(;e!==null;){const a=Wr(e,t);if(a){if(a.get)return ke(a.get);if(typeof a.value=="function")return ke(a.value)}e=Or(e)}function n(){return null}return n}const zi=_e(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","search","section","select","shadow","slot","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),ja=_e(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","enterkeyhint","exportparts","filter","font","g","glyph","glyphref","hkern","image","inputmode","line","lineargradient","marker","mask","metadata","mpath","part","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),La=_e(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),$r=_e(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),Ra=_e(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),Fr=_e(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),Bi=_e(["#text"]),Ui=_e(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","exportparts","face","for","headers","height","hidden","high","href","hreflang","id","inert","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","part","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","slot","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns","slot"]),Pa=_e(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","mask-type","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),qi=_e(["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),Nn=_e(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),Dr=$e(/\{\{[\w\W]*|[\w\W]*\}\}/gm),Ir=$e(/<%[\w\W]*|[\w\W]*%>/gm),Gr=$e(/\$\{[\w\W]*/gm),Hr=$e(/^data-[\-\w.\u00B7-\uFFFF]+$/),zr=$e(/^aria-[\-\w]+$/),wo=$e(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),Br=$e(/^(?:\w+script|data):/i),Ur=$e(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),_o=$e(/^html$/i),qr=$e(/^[a-z][.\w]*(-[.\w]+)+$/i);var Ji=Object.freeze({__proto__:null,ARIA_ATTR:zr,ATTR_WHITESPACE:Ur,CUSTOM_ELEMENT:qr,DATA_ATTR:Hr,DOCTYPE_NAME:_o,ERB_EXPR:Ir,IS_ALLOWED_URI:wo,IS_SCRIPT_OR_DATA:Br,MUSTACHE_EXPR:Dr,TMPLIT_EXPR:Gr});const en={element:1,text:3,progressingInstruction:7,comment:8,document:9},Jr=function(){return typeof window>"u"?null:window},Vr=function(t,n){if(typeof t!="object"||typeof t.createPolicy!="function")return null;let a=null;const i="data-tt-policy-suffix";n&&n.hasAttribute(i)&&(a=n.getAttribute(i));const s="dompurify"+(a?"#"+a:"");try{return t.createPolicy(s,{createHTML(o){return o},createScriptURL(o){return o}})}catch{return console.warn("TrustedTypes policy "+s+" could not be created."),null}},Vi=function(){return{afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}};function ko(){let e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:Jr();const t=L=>ko(L);if(t.version="3.3.1",t.removed=[],!e||!e.document||e.document.nodeType!==en.document||!e.Element)return t.isSupported=!1,t;let{document:n}=e;const a=n,i=a.currentScript,{DocumentFragment:s,HTMLTemplateElement:o,Node:r,Element:l,NodeFilter:c,NamedNodeMap:p=e.NamedNodeMap||e.MozNamedAttrMap,HTMLFormElement:u,DOMParser:b,trustedTypes:h}=e,d=l.prototype,m=Zt(d,"cloneNode"),v=Zt(d,"remove"),w=Zt(d,"nextSibling"),k=Zt(d,"childNodes"),y=Zt(d,"parentNode");if(typeof o=="function"){const L=n.createElement("template");L.content&&L.content.ownerDocument&&(n=L.content.ownerDocument)}let g,f="";const{implementation:x,createNodeIterator:S,createDocumentFragment:T,getElementsByTagName:M}=n,{importNode:O}=a;let W=Vi();t.isSupported=typeof yo=="function"&&typeof y=="function"&&x&&x.createHTMLDocument!==void 0;const{MUSTACHE_EXPR:G,ERB_EXPR:R,TMPLIT_EXPR:Z,DATA_ATTR:I,ARIA_ATTR:J,IS_SCRIPT_OR_DATA:$,ATTR_WHITESPACE:re,CUSTOM_ELEMENT:ae}=Ji;let{IS_ALLOWED_URI:We}=Ji,ee=null;const et=H({},[...zi,...ja,...La,...Ra,...Bi]);let Q=null;const Jt=H({},[...Ui,...Pa,...qi,...Nn]);let Y=Object.seal(ni(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),ut=null,wt=null;const Ne=Object.seal(ni(null,{tagCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeCheck:{writable:!0,configurable:!1,enumerable:!0,value:null}}));let Ae=!0,Be=!0,De=!1,An=!0,tt=!1,pt=!0,Ue=!1,_t=!1,kt=!1,ve=!1,B=!1,qe=!1,Mn=!0,Ct=!1;const vt="user-content-";let jt=!0,mt=!1,Ce={},xe=null;const Lt=H({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","style","svg","template","thead","title","video","xmp"]);let Vt=null;const ft=H({},["audio","video","img","source","image","track"]);let nt=null;const xt=H({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),je="http://www.w3.org/1998/Math/MathML",ue="http://www.w3.org/2000/svg",Me="http://www.w3.org/1999/xhtml";let Je=Me,Aa=!1,Ma=null;const _r=H({},[je,ue,Me],Na);let En=H({},["mi","mo","mn","ms","mtext"]),On=H({},["annotation-xml"]);const kr=H({},["title","style","font","a","script"]);let Kt=null;const vr=["application/xhtml+xml","text/html"],xr="text/html";let de=null,Rt=null;const Sr=n.createElement("form"),Ei=function(_){return _ instanceof RegExp||_ instanceof Function},Ea=function(){let _=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};if(!(Rt&&Rt===_)){if((!_||typeof _!="object")&&(_={}),_=Xe(_),Kt=vr.indexOf(_.PARSER_MEDIA_TYPE)===-1?xr:_.PARSER_MEDIA_TYPE,de=Kt==="application/xhtml+xml"?Na:Xn,ee=Ie(_,"ALLOWED_TAGS")?H({},_.ALLOWED_TAGS,de):et,Q=Ie(_,"ALLOWED_ATTR")?H({},_.ALLOWED_ATTR,de):Jt,Ma=Ie(_,"ALLOWED_NAMESPACES")?H({},_.ALLOWED_NAMESPACES,Na):_r,nt=Ie(_,"ADD_URI_SAFE_ATTR")?H(Xe(xt),_.ADD_URI_SAFE_ATTR,de):xt,Vt=Ie(_,"ADD_DATA_URI_TAGS")?H(Xe(ft),_.ADD_DATA_URI_TAGS,de):ft,xe=Ie(_,"FORBID_CONTENTS")?H({},_.FORBID_CONTENTS,de):Lt,ut=Ie(_,"FORBID_TAGS")?H({},_.FORBID_TAGS,de):Xe({}),wt=Ie(_,"FORBID_ATTR")?H({},_.FORBID_ATTR,de):Xe({}),Ce=Ie(_,"USE_PROFILES")?_.USE_PROFILES:!1,Ae=_.ALLOW_ARIA_ATTR!==!1,Be=_.ALLOW_DATA_ATTR!==!1,De=_.ALLOW_UNKNOWN_PROTOCOLS||!1,An=_.ALLOW_SELF_CLOSE_IN_ATTR!==!1,tt=_.SAFE_FOR_TEMPLATES||!1,pt=_.SAFE_FOR_XML!==!1,Ue=_.WHOLE_DOCUMENT||!1,ve=_.RETURN_DOM||!1,B=_.RETURN_DOM_FRAGMENT||!1,qe=_.RETURN_TRUSTED_TYPE||!1,kt=_.FORCE_BODY||!1,Mn=_.SANITIZE_DOM!==!1,Ct=_.SANITIZE_NAMED_PROPS||!1,jt=_.KEEP_CONTENT!==!1,mt=_.IN_PLACE||!1,We=_.ALLOWED_URI_REGEXP||wo,Je=_.NAMESPACE||Me,En=_.MATHML_TEXT_INTEGRATION_POINTS||En,On=_.HTML_INTEGRATION_POINTS||On,Y=_.CUSTOM_ELEMENT_HANDLING||{},_.CUSTOM_ELEMENT_HANDLING&&Ei(_.CUSTOM_ELEMENT_HANDLING.tagNameCheck)&&(Y.tagNameCheck=_.CUSTOM_ELEMENT_HANDLING.tagNameCheck),_.CUSTOM_ELEMENT_HANDLING&&Ei(_.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)&&(Y.attributeNameCheck=_.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),_.CUSTOM_ELEMENT_HANDLING&&typeof _.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements=="boolean"&&(Y.allowCustomizedBuiltInElements=_.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),tt&&(Be=!1),B&&(ve=!0),Ce&&(ee=H({},Bi),Q=[],Ce.html===!0&&(H(ee,zi),H(Q,Ui)),Ce.svg===!0&&(H(ee,ja),H(Q,Pa),H(Q,Nn)),Ce.svgFilters===!0&&(H(ee,La),H(Q,Pa),H(Q,Nn)),Ce.mathMl===!0&&(H(ee,Ra),H(Q,qi),H(Q,Nn))),_.ADD_TAGS&&(typeof _.ADD_TAGS=="function"?Ne.tagCheck=_.ADD_TAGS:(ee===et&&(ee=Xe(ee)),H(ee,_.ADD_TAGS,de))),_.ADD_ATTR&&(typeof _.ADD_ATTR=="function"?Ne.attributeCheck=_.ADD_ATTR:(Q===Jt&&(Q=Xe(Q)),H(Q,_.ADD_ATTR,de))),_.ADD_URI_SAFE_ATTR&&H(nt,_.ADD_URI_SAFE_ATTR,de),_.FORBID_CONTENTS&&(xe===Lt&&(xe=Xe(xe)),H(xe,_.FORBID_CONTENTS,de)),_.ADD_FORBID_CONTENTS&&(xe===Lt&&(xe=Xe(xe)),H(xe,_.ADD_FORBID_CONTENTS,de)),jt&&(ee["#text"]=!0),Ue&&H(ee,["html","head","body"]),ee.table&&(H(ee,["tbody"]),delete ut.tbody),_.TRUSTED_TYPES_POLICY){if(typeof _.TRUSTED_TYPES_POLICY.createHTML!="function")throw Yt('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if(typeof _.TRUSTED_TYPES_POLICY.createScriptURL!="function")throw Yt('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');g=_.TRUSTED_TYPES_POLICY,f=g.createHTML("")}else g===void 0&&(g=Vr(h,i)),g!==null&&typeof f=="string"&&(f=g.createHTML(""));_e&&_e(_),Rt=_}},Oi=H({},[...ja,...La,...$r]),Wi=H({},[...Ra,...Fr]),Tr=function(_){let E=y(_);(!E||!E.tagName)&&(E={namespaceURI:Je,tagName:"template"});const N=Xn(_.tagName),te=Xn(E.tagName);return Ma[_.namespaceURI]?_.namespaceURI===ue?E.namespaceURI===Me?N==="svg":E.namespaceURI===je?N==="svg"&&(te==="annotation-xml"||En[te]):!!Oi[N]:_.namespaceURI===je?E.namespaceURI===Me?N==="math":E.namespaceURI===ue?N==="math"&&On[te]:!!Wi[N]:_.namespaceURI===Me?E.namespaceURI===ue&&!On[te]||E.namespaceURI===je&&!En[te]?!1:!Wi[N]&&(kr[N]||!Oi[N]):!!(Kt==="application/xhtml+xml"&&Ma[_.namespaceURI]):!1},Ve=function(_){Xt(t.removed,{element:_});try{y(_).removeChild(_)}catch{v(_)}},St=function(_,E){try{Xt(t.removed,{attribute:E.getAttributeNode(_),from:E})}catch{Xt(t.removed,{attribute:null,from:E})}if(E.removeAttribute(_),_==="is")if(ve||B)try{Ve(E)}catch{}else try{E.setAttribute(_,"")}catch{}},Ni=function(_){let E=null,N=null;if(kt)_="<remove></remove>"+_;else{const le=Ca(_,/^[\r\n\t ]+/);N=le&&le[0]}Kt==="application/xhtml+xml"&&Je===Me&&(_='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+_+"</body></html>");const te=g?g.createHTML(_):_;if(Je===Me)try{E=new b().parseFromString(te,Kt)}catch{}if(!E||!E.documentElement){E=x.createDocument(Je,"template",null);try{E.documentElement.innerHTML=Aa?f:te}catch{}}const fe=E.body||E.documentElement;return _&&N&&fe.insertBefore(n.createTextNode(N),fe.childNodes[0]||null),Je===Me?M.call(E,Ue?"html":"body")[0]:Ue?E.documentElement:fe},Ci=function(_){return S.call(_.ownerDocument||_,_,c.SHOW_ELEMENT|c.SHOW_COMMENT|c.SHOW_TEXT|c.SHOW_PROCESSING_INSTRUCTION|c.SHOW_CDATA_SECTION,null)},Oa=function(_){return _ instanceof u&&(typeof _.nodeName!="string"||typeof _.textContent!="string"||typeof _.removeChild!="function"||!(_.attributes instanceof p)||typeof _.removeAttribute!="function"||typeof _.setAttribute!="function"||typeof _.namespaceURI!="string"||typeof _.insertBefore!="function"||typeof _.hasChildNodes!="function")},ji=function(_){return typeof r=="function"&&_ instanceof r};function at(L,_,E){Wn(L,N=>{N.call(t,_,E,Rt)})}const Li=function(_){let E=null;if(at(W.beforeSanitizeElements,_,null),Oa(_))return Ve(_),!0;const N=de(_.nodeName);if(at(W.uponSanitizeElement,_,{tagName:N,allowedTags:ee}),pt&&_.hasChildNodes()&&!ji(_.firstElementChild)&&ge(/<[/\w!]/g,_.innerHTML)&&ge(/<[/\w!]/g,_.textContent)||_.nodeType===en.progressingInstruction||pt&&_.nodeType===en.comment&&ge(/<[/\w]/g,_.data))return Ve(_),!0;if(!(Ne.tagCheck instanceof Function&&Ne.tagCheck(N))&&(!ee[N]||ut[N])){if(!ut[N]&&Pi(N)&&(Y.tagNameCheck instanceof RegExp&&ge(Y.tagNameCheck,N)||Y.tagNameCheck instanceof Function&&Y.tagNameCheck(N)))return!1;if(jt&&!xe[N]){const te=y(_)||_.parentNode,fe=k(_)||_.childNodes;if(fe&&te){const le=fe.length;for(let Se=le-1;Se>=0;--Se){const it=m(fe[Se],!0);it.__removalCount=(_.__removalCount||0)+1,te.insertBefore(it,w(_))}}}return Ve(_),!0}return _ instanceof l&&!Tr(_)||(N==="noscript"||N==="noembed"||N==="noframes")&&ge(/<\/no(script|embed|frames)/i,_.innerHTML)?(Ve(_),!0):(tt&&_.nodeType===en.text&&(E=_.textContent,Wn([G,R,Z],te=>{E=Qt(E,te," ")}),_.textContent!==E&&(Xt(t.removed,{element:_.cloneNode()}),_.textContent=E)),at(W.afterSanitizeElements,_,null),!1)},Ri=function(_,E,N){if(Mn&&(E==="id"||E==="name")&&(N in n||N in Sr))return!1;if(!(Be&&!wt[E]&&ge(I,E))){if(!(Ae&&ge(J,E))){if(!(Ne.attributeCheck instanceof Function&&Ne.attributeCheck(E,_))){if(!Q[E]||wt[E]){if(!(Pi(_)&&(Y.tagNameCheck instanceof RegExp&&ge(Y.tagNameCheck,_)||Y.tagNameCheck instanceof Function&&Y.tagNameCheck(_))&&(Y.attributeNameCheck instanceof RegExp&&ge(Y.attributeNameCheck,E)||Y.attributeNameCheck instanceof Function&&Y.attributeNameCheck(E,_))||E==="is"&&Y.allowCustomizedBuiltInElements&&(Y.tagNameCheck instanceof RegExp&&ge(Y.tagNameCheck,N)||Y.tagNameCheck instanceof Function&&Y.tagNameCheck(N))))return!1}else if(!nt[E]){if(!ge(We,Qt(N,re,""))){if(!((E==="src"||E==="xlink:href"||E==="href")&&_!=="script"&&jr(N,"data:")===0&&Vt[_])){if(!(De&&!ge($,Qt(N,re,"")))){if(N)return!1}}}}}}}return!0},Pi=function(_){return _!=="annotation-xml"&&Ca(_,ae)},$i=function(_){at(W.beforeSanitizeAttributes,_,null);const{attributes:E}=_;if(!E||Oa(_))return;const N={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:Q,forceKeepAttr:void 0};let te=E.length;for(;te--;){const fe=E[te],{name:le,namespaceURI:Se,value:it}=fe,Pt=de(le),Wa=it;let pe=le==="value"?Wa:Lr(Wa);if(N.attrName=Pt,N.attrValue=pe,N.keepAttr=!0,N.forceKeepAttr=void 0,at(W.uponSanitizeAttribute,_,N),pe=N.attrValue,Ct&&(Pt==="id"||Pt==="name")&&(St(le,_),pe=vt+pe),pt&&ge(/((--!?|])>)|<\/(style|title|textarea)/i,pe)){St(le,_);continue}if(Pt==="attributename"&&Ca(pe,"href")){St(le,_);continue}if(N.forceKeepAttr)continue;if(!N.keepAttr){St(le,_);continue}if(!An&&ge(/\/>/i,pe)){St(le,_);continue}tt&&Wn([G,R,Z],Di=>{pe=Qt(pe,Di," ")});const Fi=de(_.nodeName);if(!Ri(Fi,Pt,pe)){St(le,_);continue}if(g&&typeof h=="object"&&typeof h.getAttributeType=="function"&&!Se)switch(h.getAttributeType(Fi,Pt)){case"TrustedHTML":{pe=g.createHTML(pe);break}case"TrustedScriptURL":{pe=g.createScriptURL(pe);break}}if(pe!==Wa)try{Se?_.setAttributeNS(Se,le,pe):_.setAttribute(le,pe),Oa(_)?Ve(_):Hi(t.removed)}catch{St(le,_)}}at(W.afterSanitizeAttributes,_,null)},Ar=function L(_){let E=null;const N=Ci(_);for(at(W.beforeSanitizeShadowDOM,_,null);E=N.nextNode();)at(W.uponSanitizeShadowNode,E,null),Li(E),$i(E),E.content instanceof s&&L(E.content);at(W.afterSanitizeShadowDOM,_,null)};return t.sanitize=function(L){let _=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},E=null,N=null,te=null,fe=null;if(Aa=!L,Aa&&(L="<!-->"),typeof L!="string"&&!ji(L))if(typeof L.toString=="function"){if(L=L.toString(),typeof L!="string")throw Yt("dirty is not a string, aborting")}else throw Yt("toString is not a function");if(!t.isSupported)return L;if(_t||Ea(_),t.removed=[],typeof L=="string"&&(mt=!1),mt){if(L.nodeName){const it=de(L.nodeName);if(!ee[it]||ut[it])throw Yt("root node is forbidden and cannot be sanitized in-place")}}else if(L instanceof r)E=Ni("<!---->"),N=E.ownerDocument.importNode(L,!0),N.nodeType===en.element&&N.nodeName==="BODY"||N.nodeName==="HTML"?E=N:E.appendChild(N);else{if(!ve&&!tt&&!Ue&&L.indexOf("<")===-1)return g&&qe?g.createHTML(L):L;if(E=Ni(L),!E)return ve?null:qe?f:""}E&&kt&&Ve(E.firstChild);const le=Ci(mt?L:E);for(;te=le.nextNode();)Li(te),$i(te),te.content instanceof s&&Ar(te.content);if(mt)return L;if(ve){if(B)for(fe=T.call(E.ownerDocument);E.firstChild;)fe.appendChild(E.firstChild);else fe=E;return(Q.shadowroot||Q.shadowrootmode)&&(fe=O.call(a,fe,!0)),fe}let Se=Ue?E.outerHTML:E.innerHTML;return Ue&&ee["!doctype"]&&E.ownerDocument&&E.ownerDocument.doctype&&E.ownerDocument.doctype.name&&ge(_o,E.ownerDocument.doctype.name)&&(Se="<!DOCTYPE "+E.ownerDocument.doctype.name+`>
`+Se),tt&&Wn([G,R,Z],it=>{Se=Qt(Se,it," ")}),g&&qe?g.createHTML(Se):Se},t.setConfig=function(){let L=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};Ea(L),_t=!0},t.clearConfig=function(){Rt=null,_t=!1},t.isValidAttribute=function(L,_,E){Rt||Ea({});const N=de(L),te=de(_);return Ri(N,te,E)},t.addHook=function(L,_){typeof _=="function"&&Xt(W[L],_)},t.removeHook=function(L,_){if(_!==void 0){const E=Nr(W[L],_);return E===-1?void 0:Cr(W[L],E,1)[0]}return Hi(W[L])},t.removeHooks=function(L){W[L]=[]},t.removeAllHooks=function(){W=Vi()},t}var Ki=ko();const Kr=["a","abbr","address","article","aside","b","bdi","bdo","blockquote","br","button","caption","code","col","colgroup","data","dd","del","details","dfn","div","dl","dt","em","figcaption","figure","footer","h1","h2","h3","h4","h5","h6","header","hr","i","img","input","ins","kbd","label","li","main","mark","nav","ol","p","picture","pre","q","rp","rt","ruby","s","samp","section","small","span","strong","sub","summary","sup","table","tbody","td","tfoot","th","thead","time","tr","u","ul","var"],Xr=["href","src","srcset","sizes","alt","title","id","class","role","aria-label","aria-hidden","aria-expanded","aria-controls","target","rel","loading","decoding","data-*"],vo=new Set(["script","style","iframe","object","embed","link","meta","base","form","svg","math","video","audio"]),Qn=/^(?:https?:|mailto:|tel:|data:image\/)/i;function Qr(e){const t=document.createElement("template");t.innerHTML=e;const n=new Set,a=i=>{i.nodeType===Node.ELEMENT_NODE&&n.add(i.tagName.toLowerCase());for(let s=i.firstChild;s;s=s.nextSibling)a(s)};return a(t.content),n}function Yr(e){const t=Qr(e);for(const n of Array.from(t))vo.has(n)&&t.delete(n);return[...new Set([...t])]}function Zr(e){const t=Yr(e);return Ki.addHook("uponSanitizeAttribute",n=>{const a=n,i=n.attrName,s=n.attrValue;if(i==="style"){n.keepAttr=!1;return}if(i==="srcdoc"){n.keepAttr=!1;return}if(/^(href|src|xlink:href|poster)$/i.test(i)&&!Qn.test(s)){n.keepAttr=!1;return}if(/^srcset$/i.test(i)){const o=s.split(/\s*,\s*/);for(let r=0;r<o.length;r++){const l=o[r].trim().split(/\s+/)[0]||"";if(!Qn.test(l)){n.keepAttr=!1;return}}}if(i==="target"&&s==="_blank"){const o=a.getAttribute("rel")||"",r=new Set(o.split(/\s+/).filter(Boolean));r.add("noopener"),r.add("noreferrer"),a.setAttribute("rel",Array.from(r).join(" "))}}),Ki.sanitize(e,{ALLOWED_TAGS:[...Kr],ALLOWED_ATTR:[...Xr],ADD_TAGS:t,FORBID_TAGS:Array.from(vo),FORBID_ATTR:["style","srcdoc"],ALLOWED_URI_REGEXP:Qn,ALLOW_DATA_ATTR:!0,KEEP_CONTENT:!1,WHOLE_DOCUMENT:!1})}const fi=new WeakMap,q="_str",V="_val",K="_root",we="_ii",j="_obj",z="_arr",F="_elem",wa=[we,z,F,j,q,V,K],xo=[F,z,j],el="hson",tl="json",nl="html",rt={HSON:el,HTML:nl,JSON:tl},Qe="data-_",Bt="data-_index",Fe="data-_quid",So="data--",To=`${So}attrmap`,X={OPEN:"OPEN",CLOSE:"CLOSE",ARR_OPEN:"ARR_OPEN",ARR_CLOSE:"ARR_CLOSE",TEXT:"TEXT",EMPTY_OBJ:"EMPTY_OBJ"},Cn={guillemet:"guillemet",bracket:"bracket"},Re={obj:"obj",elem:"elem"},C=(e={})=>({_tag:e._tag??"",_content:e._content??[],_attrs:e._attrs??{},_meta:e._meta??{}}),Xi=(e,t,n)=>({kind:X.OPEN,tag:e,rawAttrs:t,pos:n}),Qi=(e,t)=>({kind:X.CLOSE,close:e,pos:t}),Yi=(e,t)=>({kind:X.ARR_OPEN,symbol:e,pos:t}),Zi=(e,t)=>({kind:X.ARR_CLOSE,symbol:e,pos:t}),jn=(e,t,n)=>t?{kind:X.TEXT,raw:e,quoted:!0,pos:n}:{kind:X.TEXT,raw:e,pos:n},al=(e,t,n)=>t?{kind:X.EMPTY_OBJ,raw:e,quoted:!0,pos:n}:{kind:X.EMPTY_OBJ,raw:e,pos:n};function si(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function Ut(e){return e===null||["string","number","boolean"].includes(typeof e)}function ra(e){return typeof e=="string"}function il(e){return e.replace(/[\r\n\t]/g," ").replace(/ {2,}/g," ").trim()}function Nt(e){if(!e)return e;let t=e.replace(/-+/g,"-");if(t.startsWith("-")){const n=t.slice(1);n.startsWith("ms-")?t="ms-"+n.slice(3):n.length?t=n[0].toUpperCase()+n.slice(1):t=""}return t.replace(/-([a-zA-Z0-9])/g,(n,a)=>a.toUpperCase())}function mn(e){const t={};if(!e)return t;let n="",a=!1,i=null,s=0;const o=()=>{const r=n.trim();if(n="",!r)return;let l=0,c=-1,p=null,u=0;for(;l<r.length;){const w=r[l];if(p){w===p&&(p=null),l++;continue}if(w==='"'||w==="'"){p=w,l++;continue}if(w==="("){u++,l++;continue}if(w===")"){u&&u--,l++;continue}if(w===":"&&u===0){c=l;break}l++}if(c===-1)return;const b=r.slice(0,c).trim(),h=r.slice(c+1).trim();if(!b)return;const m=b.startsWith("--")?b:Nt(b.toLowerCase()),v=h.trim();t[m]=v};for(let r=0;r<e.length;r++){const l=e[r];if(a){l===i&&(a=!1,i=null),n+=l;continue}if(l==='"'||l==="'"){a=!0,i=l,n+=l;continue}if(l==="("){s++,n+=l;continue}if(l===")"){s&&s--,n+=l;continue}if(l===";"&&s===0){o();continue}n+=l}return o(),t}function sl(e){const t={};let n;for(const a of Array.from(e.attributes)){const i=a.name,s=i.toLowerCase(),o=a.value??"";if(!s.startsWith(So)){if(s===Bt){(n??={})[Bt]=o;continue}if(s===Fe){(n??={})[Fe]=o;continue}if(s==="style"){t.style=mn(o);continue}if(!(i==="xmlns"||i.startsWith("xmlns:")||i.startsWith("xml:"))){if(e.namespaceURI==="http://www.w3.org/2000/svg"&&s==="xlink:href"){e.hasAttribute("href")||(t.href=o);continue}if(o===""||o===i){t[s]=i;continue}t[s]=il(o)}}}return{attrs:t,meta:n}}function Yn(e){const t=e.trim();if(t==="")return"";if(t.startsWith('"')&&t.endsWith('"'))try{return JSON.parse(t)}catch(a){const i=a instanceof Error?a.message:a;A(`error in coercion: ${i}`,"coerce",e)}return t==="true"?!0:t==="false"?!1:t==="null"?null:/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(t)?Number(t):t}function D(e){if(!e||typeof e!="object")return!1;const t=e;if(typeof t._tag!="string")return!1;const n=t._meta;return!(n&&typeof n=="object"&&("attrs"in n||"flags"in n))}function Ao(e){return e._tag===we&&Array.isArray(e._content)&&e._content.length===1&&typeof e._meta?.[Bt]=="string"}function ol(e,t=2){return JSON.stringify(_a(e),null,t)}const ce=ol;function rl(e){return e!==null&&(typeof e=="object"||typeof e=="function")}function _a(e,t=new WeakSet){return Array.isArray(e)?e.map(n=>_a(n,t)):rl(e)?t.has(e)?"[[Circular]]":(t.add(e),D(e)?ll(e,t):pl(e,t)):e}function ll(e,t){const n={};return n._tag=e._tag,e._attrs&&Object.keys(e._attrs).length&&(n._attrs=cl(e._attrs)),e._meta&&Object.keys(e._meta).length&&(n._meta=ul(e._meta)),Array.isArray(e._content)&&e._content.length&&(n._content=e._content.map(a=>_a(a,t))),n}function cl(e){const t={};for(const n of Object.keys(e).sort()){const a=e[n];n==="style"&&a&&typeof a=="object"&&!Array.isArray(a)?t[n]=dl(a):t[n]=a}return t}function dl(e){const t={};for(const n of Object.keys(e).sort())t[n]=e[n];return t}function ul(e){const t={},n=[Fe,Bt],a=[...n.filter(i=>i in e),...Object.keys(e).sort().filter(i=>!n.includes(i))];for(const i of a)t[i]=e[i];return t}function pl(e,t){const n={};for(const a of Object.keys(e).sort())n[a]=_a(e[a],t);return n}function dt(e,t="[source fn not given]",n={throwOnFirst:!0}){const a=[];if(fl(e,t),dn(e,"",e._tag,n,a),a.length){const i=a.slice(0,12).join(`
  - `);A(`invariant violation(s):
  - ${i}`,t,ce(e))}}function dn(e,t,n,a,i){const s=t+ml(e._tag);if(e._meta){for(const r of Object.keys(e._meta))if(!r.startsWith(Qe)&&(se(i,a,`${s}@meta:${r}: illegal meta key (only "${Qe}*" allowed)`),a.throwOnFirst))return}if(Mo(e._tag)&&e._attrs&&Object.keys(e._attrs).length&&(se(i,a,`${s}: VSN "${e._tag}" must not have _attrs`),a.throwOnFirst))return;if(e._tag===q||e._tag===V){const r=e._content??[];if(r.length!==1){if(se(i,a,`${s}: ${e._tag} must have exactly one item in _content`),a.throwOnFirst)return}else{const l=r[0];if(e._tag===q&&typeof l!="string"&&(se(i,a,`${s}: _str payload must be string`),a.throwOnFirst)||e._tag===V&&typeof l=="string"&&(se(i,a,`${s}: _val payload must be non-string primitive`),a.throwOnFirst))return}return}if(e._tag===we){if(n!==z&&(se(i,a,`${s}: _ii must appear directly under _arr`),a.throwOnFirst)||e._attrs&&Object.keys(e._attrs).length&&(se(i,a,`${s}: _ii must not have _attrs`),a.throwOnFirst)||typeof(e._meta?.[`${Qe}index`]??e._meta?.[Bt])!="string"&&(se(i,a,`${s}: _ii must carry "${Qe}index" as a string in _meta`),a.throwOnFirst))return;const l=e._content;if(l.length!==1&&(se(i,a,`${s}: _ii must contain exactly one child node`),a.throwOnFirst))return;const c=l[0];if(!D(c)&&(se(i,a,`${s}: _ii child must be a node (found primitive/null)`),a.throwOnFirst))return}if(e._tag===z){const r=e._content;for(let l=0;l<r.length;l++){const c=r[l],p=`${t}/_arr/[${l}]`;if(!D(c)){if(se(i,a,`${p}: primitive/null outside _str/_val`),a.throwOnFirst)return;continue}if(c._tag!==we&&(se(i,a,`${p}: only _ii allowed directly under _arr`),a.throwOnFirst)||(dn(c,p,z,a,i),a.throwOnFirst&&i.length))return}return}if(e._tag===F){const r=e._content;for(let l=0;l<r.length;l++){const c=r[l],p=`${t}/_elem/[${l}]`;if(!D(c)){if(se(i,a,`${p}: primitive/null outside _str/_val`),a.throwOnFirst)return;continue}if(c._tag===j||c._tag===z||c._tag===we){if(se(i,a,`${p}: _elem cannot contain ${c._tag} (only _str/_val or normal element tags allowed)`),a.throwOnFirst)return;continue}if(dn(c,p,F,a,i),a.throwOnFirst&&i.length)return}return}if(e._tag===K){const r=e._content;if(r.length>1&&(se(i,a,`${s}: _root must contain at most one child`),a.throwOnFirst))return;if(r.length===1){const l=r[0];if(D(l)){if(!(l._tag===j||l._tag===F||l._tag===z)&&(se(i,a,`${s}: _root child must be one of _obj/_elem/_arr`),a.throwOnFirst))return}else if(se(i,a,`${s}: _root child must be a node; found: primitive (${l})`),a.throwOnFirst)return}}if(e._tag===j){const r=e._content,l=new Set;for(let c=0;c<r.length;c++){const p=r[c],u=`${s}/[${c}]`;if(!D(p)){if(se(i,a,`${u}: [ERR: OBJ001] primitive/null outside _str/_val`),a.throwOnFirst)return;continue}if(p._attrs&&Object.keys(p._attrs).length&&(se(i,a,`${u}: [ERR: OBJ002] _obj children must not have _attrs`),a.throwOnFirst)||p._tag===F&&(se(i,a,`${u}: [ERR: OBJ004] _elem is not allowed directly under _obj`),a.throwOnFirst))return;if(!p._tag.startsWith("_")){if(l.has(p._tag)&&(se(i,a,`${u}: [ERR: OBJ003] duplicate property tag "${p._tag}" inside _obj`),a.throwOnFirst))return;l.add(p._tag)}if(dn(p,u,j,a,i),a.throwOnFirst&&i.length)return}return}const o=e._content??[];for(let r=0;r<o.length;r++){const l=o[r];if(D(l)){if(dn(l,s,e._tag,a,i),a.throwOnFirst&&i.length)return}else if(se(i,a,`${s}/[${r}]: primitive outside _str/_val`),a.throwOnFirst)return}}function Mo(e){return e===q||e===V||e===z||e===j||e===F||e===K||e===we}function ml(e){return e.startsWith("_")?`/${e}`:`/tag:${e}`}function se(e,t,n){e.push(n)}function fl(e,t){const n=[e];for(;n.length;){const a=n.pop();if(!a||typeof a!="object")continue;const i=a._tag,s=a._meta,o=a._attrs;if(s&&("attrs"in s||"flags"in s))throw new Error(`[NEW-only] old-shaped meta in ${t} at <${i??"?"}>
  Found _meta.attrs or _meta.flags`);if(s){for(const l of Object.keys(s))if(!l.startsWith(Qe))throw new Error(`[NEW-only] illegal meta key "${l}" in ${t} at <${i}> (only "data-_*" allowed)`)}i&&Mo(i)&&o&&Object.keys(o).length&&A(` VSN <${i}> with _attrs :  ${t}`,"assertNewShapeQuick",e);const r=a._content;if(Array.isArray(r)&&!(i===q||i===V))for(const l of r)D(l)&&n.push(l)}}const es={copy:"&#169;",nbsp:"&#160;",eacute:"&#233;"};function hl(e){return e.replace(/&([a-zA-Z0-9]+);/g,(t,n)=>["amp","lt","gt","quot","apos"].includes(n)?t:n in es?es[n]:t)}function gl(e){const t=/<([a-zA-Z0-9:_-]+)((?:\s+[a-zA-Z_:][a-zA-Z0-9:_.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s/]*))?)*\s*)(\/?)>/g;return e.replace(t,(n,a,i,s)=>{const o=/\s+([a-zA-Z_:][a-zA-Z0-9:_.-]+)(\s*=\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^>\s/]*))?/g;let r="",l=0,c;for(;(c=o.exec(i))!==null;){const p=c[1],u=c[2];r+=i.substring(l,c.index),u===void 0?r+=` ${p}="${p}"`:r+=` ${p}${u}`,l=o.lastIndex}return r+=i.substring(l),`<${a}${r}${s||""}>`})}function ts(e){const t=new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);return e.replace(/<([A-Za-z][A-Za-z0-9:_-]*)([^<>]*?)>/g,(n,a,i)=>{const s=a.toLowerCase();return!t.has(s)||/\s\/\s*$/.test(i)||new RegExp(`</\\s*${a}\\s*>`,"i").test(e)?n:`<${a}${i} />`})}function bl(e){let t="",n=0,a=e.length,i=!1,s=null;const o=l=>l.replace(/&(?!#\d+;|#x[0-9A-Fa-f]+;|[a-zA-Z][\w.-]*;)/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),r=l=>!!l&&(l===":"||l==="_"||/[A-Za-z]/.test(l)||l==="!"||l==="?"||l==="/");for(;n<a;)if(i){let l=n;for(;l<a;){const c=e[l];if(s){c===s&&(s=null),l++;continue}if(c==='"'||c==="'"){s=c,l++;continue}if(c===">"){l++,i=!1;break}l++}t+=e.slice(n,l),n=l}else{let l=n;for(;l<a&&!(e[l]==="<"&&r(e[l+1]));)l++;l>n&&(t+=o(e.slice(n,l))),l<a?(i=!0,t+="<",n=l+1):n=l}return t}function yl(e){if(!e||e.indexOf("<!--")===-1)return e;let t=e.replace(/<!--[\s\S]*?-->/g,"");return t=t.replace(/<!--[\s\S]*$/g,""),t}function $a(e,t){const n=[];let a;for(;a=t.exec(e);)n.push({start:a.index,end:a.index+a[0].length});return n}function ns(e,t){let n=0,a=e.length-1;for(;n<=a;){const i=n+a>>1,s=e[i];if(t<s.start)a=i-1;else if(t>=s.end)n=i+1;else return!0}return!1}function wl(e){return e.startsWith("_")}function _l(e){return/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(e)}function kl(e){return/^(address|article|aside|blockquote|div|dl|fieldset|figure|footer|form|h[1-6]|header|hr|main|nav|ol|pre|section|table|ul)$/i.test(e)}function as(e){if(!e.includes("<"))return e;const t=/<(script|style|textarea|noscript|xmp|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,n=/<!--[\s\S]*?-->/g,a=/<!\[CDATA\[[\s\S]*?\]\]>/g,i=[...$a(e,t),...$a(e,n),...$a(e,a)].sort((v,w)=>v.start-w.start),s=[],o=[];let r=!1;const l=[],c=()=>l[l.length-1],p=(v,w)=>{w.cellOpen&&(s.push({at:v,text:`</${w.cellOpen}>`}),w.cellOpen=null)},u=(v,w)=>{w.trOpen&&(s.push({at:v,text:"</tr>"}),w.trOpen=!1)},b=(v,w)=>{let k="";w.cellOpen&&(k+=`</${w.cellOpen}>`,w.cellOpen=null),w.trOpen&&(k+="</tr>",w.trOpen=!1),k&&s.push({at:v,text:k})},h=/<\s*(\/)?\s*([a-zA-Z_:][-a-zA-Z0-9_:.]*)\b[^>]*?(\/?)\s*>/g;let d;for(;d=h.exec(e);){const v=d.index;if(ns(i,v))continue;const w=!!d[1],k=d[2],y=!!d[3],g=k.toLowerCase();if(!wl(g)&&!(!w&&(y||_l(g)))){if(!w&&g==="p"){r&&s.push({at:v,text:"</p>"}),r=!0;continue}if(!w&&g==="table"){l.push({trOpen:!1,cellOpen:null});continue}if(!w&&(g==="thead"||g==="tbody"||g==="tfoot")){const f=c();f&&(p(v,f),u(v,f));continue}if(!w&&g==="tr"){const f=c();f&&(p(v,f),b(v,f),f.trOpen=!0);continue}if(!w&&(g==="td"||g==="th")){const f=c();f&&(f.cellOpen&&s.push({at:v,text:`</${f.cellOpen}>`}),f.cellOpen=g);continue}if(w&&(g==="td"||g==="th")){const f=c();f&&(f.cellOpen=null);continue}if(w&&g==="tr"){const f=c();f&&(p(v,f),f.trOpen=!1);continue}if(w&&(g==="table"||g==="thead"||g==="tbody"||g==="tfoot")){const f=c();f&&b(v,f),g==="table"&&l.pop();continue}if(!w&&r&&kl(g)&&(s.push({at:v,text:"</p>"}),r=!1),w&&g==="p"){r=!1;continue}if(!w&&(g==="ul"||g==="ol")){o.push({name:g,liOpen:!1});continue}if(!w&&g==="li"){const f=o[o.length-1];f&&(f.liOpen&&s.push({at:v,text:"</li>"}),f.liOpen=!0);continue}if(w&&g==="li"){const f=o[o.length-1];f&&(f.liOpen=!1);continue}if(w&&(g==="ul"||g==="ol")){const f=o[o.length-1];if(f&&f.liOpen&&(s.push({at:v,text:"</li>"}),f.liOpen=!1),f&&f.name===g)o.pop();else{for(let x=o.length-2;x>=0;x--)if(o[x].name===g){o.length=x;break}o.pop()}continue}}}if(!s.length)return e;s.sort((v,w)=>w.at-v.at);let m=e;for(const v of s)ns(i,v.at)||(m=m.slice(0,v.at)+v.text+m.slice(v.at));return m}function vl(e){let t="",n=!1,a=null;for(let i=0;i<e.length;i++){const s=e[i];if(!n){if(s==="<"){n=!0,t+=s;continue}t+=s;continue}if(a){if(s===a){a=null,t+=s;continue}if(s==="<"){t+="&lt;";continue}if(s===">"){t+="&gt;";continue}t+=s;continue}else{if(s==='"'||s==="'"){a=s,t+=s;continue}if(s===">"){n=!1,t+=s;continue}t+=s;continue}}return t}function xl(e){return e.replace(/<([a-zA-Z][^\s>/]*)([^>]*?)(\s*\/?)>/g,(t,n,a,i)=>{const s=new Map,o=[];let r=0;for(;r<a.length;){const p=/^\s+/.exec(a.slice(r));if(p){r+=p[0].length;continue}const u=/^[^\s"'=\/><]+/.exec(a.slice(r));if(!u){r++;continue}const b=u[0],h=b.toLowerCase();r+=b.length;const d=/^\s*=\s*/.exec(a.slice(r));let m;if(d){r+=d[0].length;const k=a[r];if(k==='"'||k==="'"){r++;const y=a.indexOf(k,r);m=y===-1?a.slice(r):a.slice(r,y),r=y===-1?a.length:y+1}else{const y=/^[^\s>]+/.exec(a.slice(r));m=y?y[0]:"",r+=m.length}}const v=m===void 0||m===""||m.toLowerCase()===h;s.has(h)||(s.set(h,{isFlag:!1}),o.push(h));const w=s.get(h);if(h==="class"){const k=(m??h).split(/\s+/).filter(Boolean);w.classTokens||(w.classTokens=[]);for(const y of k)w.classTokens.includes(y)||w.classTokens.push(y);w.val=w.classTokens.join(" ")}else v?(w.isFlag=!0,w.val=h):w.val=m}let l="";for(const p of o){const u=s.get(p);if(p==="class"&&(!u.val||!u.val.trim()))continue;const b=d=>d.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),h=u.val??p;l+=` ${p}="${b(h)}"`}const c=i&&i.includes("/")?" />":">";return`<${n}${l}${c}`})}function Sl(e){let t="",n=0;for(;n<e.length;){const a=e.indexOf("<",n);if(a<0){t+=e.slice(n);break}const i=e.indexOf(">",a+1);if(i<0){t+=e.slice(n);break}t+=e.slice(n,a);const s=e.slice(a,i+1),o=s.slice(1);if(o.startsWith("/")||o.startsWith("!")||o.startsWith("?")){t+=s,n=i+1;continue}let r=1,l="<";for(;r<s.length&&!/\s|\/|>/.test(s[r]);)l+=s[r++];let c=-1;for(;r<s.length;){if(r===c){l+=s[r],r++;continue}c=r;const p=s[r];if(p===">"||p==="/"&&s[r+1]===">"){l+=s.slice(r),r=s.length;break}if(/\s/.test(p)){l+=p,r++;continue}const u=r;for(;r<s.length&&!/\s|=|\/|>/.test(s[r]);)r++;if(r===u){l+=s[r],r++;continue}for(l+=s.slice(u,r);r<s.length&&/\s/.test(s[r]);)l+=s[r++];if(s[r]!=="=")continue;for(l+=s[r++];r<s.length&&/\s/.test(s[r]);)l+=s[r++];const b=s[r];if(b==='"'||b==="'"){const h=b;for(l+=h,r++;r<s.length&&s[r]!==h;)l+=s[r++];r<s.length&&(l+=s[r++])}else{const h=r;for(;r<s.length&&!/\s|>/.test(s[r]);)r++;const d=s.slice(h,r);l+=`"${d}"`}}t+=l,n=i+1}return t}const Tl=/^[A-Za-z_:\u00C0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][\w.\-:\u00B7\u0300-\u036F\u203F-\u2040]*$/u;function Al(e){let t=!0;if(Tl.test(e)||(t=!1),t)return e;let n="_attr";for(let a=0;a<e.length;a++){const i=e.codePointAt(a),s=e[a];/^[A-Za-z0-9._:\-]$/.test(s)?n+=s:(n+=`_x${i.toString(16)}_`,i>65535&&a++)}return n}function Ml(e){let t="",n=0;for(;n<e.length;){const a=e.indexOf("<",n);if(a<0){t+=e.slice(n);break}t+=e.slice(n,a);const i=Ol(e,a);if(i<0){t+=e.slice(a);break}const s=e.slice(a,i+1);if(El(s)){t+=s,n=i+1;continue}const o=Wl(s);t+=o,n=i+1}return t}function El(e){return!!(e.startsWith("</")||e.startsWith("<!--")||e.startsWith("<!")||e.startsWith("<?"))}function Ol(e,t){let n=null;for(let a=t+1;a<e.length;a++){const i=e[a];if(n){i===n&&(n=null);continue}if(i==='"'||i==="'"){n=i;continue}if(i===">")return a}return-1}function Wl(e){const t=Nl(e);if(!t)return e;const{tagNameEnd:n}=t,a=Cl(e);if(!a)return e;const{closeStart:i,closeText:s}=a,o=e.slice(0,n),r=e.slice(n,i),l=s,{attrsOut:c,attrMap:p,hasTransitAlready:u}=jl(r);if(!u&&Object.keys(p).length>0){const b=JSON.stringify(p).replace(/</g,"\\u003C").replace(/>/g,"\\u003E");return`${o}${c} ${To}='${b}'${l}`}return`${o}${c}${l}`}function Nl(e){let t=1;for(;t<e.length&&Et(e[t]);)t++;const n=t;for(;t<e.length;){const a=e[t];if(Et(a)||a==="/"||a===">")break;t++}return t===n?null:{tagNameEnd:t}}function Cl(e){let t=e.length-1;if(e[t]!==">")return null;const n=t-1;return n>=0&&e[n]==="/"?{closeStart:n,closeText:e.slice(n)}:{closeStart:t,closeText:">"}}function jl(e){let t="",n=0;const a=Object.create(null),i=new Set;let s=!1;for(;n<e.length;){if(Et(e[n])){t+=e[n],n++;continue}const o=n;for(;n<e.length;){const b=e[n];if(Et(b)||b==="="||b==="/"||b===">")break;n++}const r=e.slice(o,n);if(!r)break;r===To&&(s=!0);const l=n;for(;n<e.length&&Et(e[n]);)n++;let c="";if(n<e.length&&e[n]==="="){for(n++;n<e.length&&Et(e[n]);)n++;if(n<e.length&&(e[n]==='"'||e[n]==="'")){const b=e[n];for(n++;n<e.length&&e[n]!==b;)n++;n<e.length&&n++,c=e.slice(l,n)}else{for(;n<e.length;){const b=e[n];if(Et(b)||b==="/"||b===">")break;n++}c=e.slice(l,n)}}else c=e.slice(l,n);const p=Ll(r);let u=p;(u!==r||i.has(u))&&(u=is(p,i,r,a)),i.add(u),u!==r&&(a[u]=r),t+=u+c}return{attrsOut:t,attrMap:a,hasTransitAlready:s}}function Ll(e){return e==="xmlns"||e.startsWith("xmlns:")||e.startsWith("xml:")?e:e.includes(":")?e.replace(/:/g,"__COLON__"):Al(e)}function is(e,t,n,a){if(!t.has(e)&&!(e in a))return e;let i=1;for(;;){const s=`${e}__${i}`;if(!t.has(s)&&!(s in a))return s;i++}}function Et(e){return e===" "||e==="	"||e===`
`||e==="\r"||e==="\f"}function Rl(e){if(!/<svg\b/i.test(e))return e;const t=/<svg\b[^>]*\bxmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(e),n=/\bxlink:/i.test(e),a=/<svg\b[^>]*\bxmlns:xlink\s*=/i.test(e);return e.replace(/<svg\b([^>]*)>/i,(i,s)=>{let o="";return t||(o+=' xmlns="http://www.w3.org/2000/svg"'),n&&!a&&(o+=' xmlns:xlink="http://www.w3.org/1999/xlink"'),`<svg${s}${o}>`})}function Pl(e){const t=/(li|p|td|th|tr|table|thead|tbody|tfoot)\b/i;return/Opening and ending tag mismatch/i.test(e)&&t.test(e)||/Premature end of data in tag/i.test(e)&&t.test(e)||/expected/i.test(e)&&t.test(e)}function $l(e){const t=e.match(/tag mismatch:\s*([A-Za-z0-9:_-]+)/i);if(t?.[1])return t[1].toLowerCase();const n=e.match(/tag mismatch:\s*([A-Za-z0-9:_-]+)/i);if(n?.[1])return n[1].toLowerCase()}function ss(e){const t=new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);if(/Premature end of data in tag/i.test(e)){const a=e.match(/Premature end of data in tag\s+([A-Za-z0-9:_-]+)/i)?.[1]?.toLowerCase();return!!a&&t.has(a)}if(/Opening and ending tag mismatch/i.test(e)){const n=$l(e);return!!n&&t.has(n)}return!1}function Fl(e){for(let t=0;t<e.length;t++){const n=e.charCodeAt(t);if(!(n===9||n===10||n===13||n>=32&&n<=55295||n>=57344&&n<=65533))return{index:t,code:n}}return null}function os(e,t,n=80){const a=Math.max(0,t-n),i=Math.min(e.length,t+n);return e.slice(a,i).replace(/\r/g,"\\r").replace(/\n/g,"\\n")}function ka(e){let t;if(typeof e=="string"){const i=yl(e),s=gl(i),o=bl(s),r=hl(o),l=Rl(r);let p=Ml(l);const u=new DOMParser;let b=u.parseFromString(p,"application/xml"),h=b.querySelector("parsererror");const d=()=>h?.textContent??"",m=()=>!!h,v=(k,y)=>{p=k,b=u.parseFromString(p,"application/xml"),h=b.querySelector("parsererror")},w=k=>k.replace(/&(?!(?:#\d+|#x[0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]{1,31});)/g,"&amp;");if(m()){const k=d(),y=Fl(p);if(y){const g=`0x${y.code.toString(16).toUpperCase()}`,f=os(p,y.index);A(`XML parse failed: invalid control character ${g} at index ${y.index}
Context: “…${f}…”`,"parse-html")}if(/Duplicate|redefined/i.test(k)){const g=xl(p);v(g)}}if(m()){const k=d();/Entity|reference to entity|The entity name must immediately follow the '&' in the entity reference/i.test(k)&&v(w(p))}if(m()){const k=d();if(/AttValue|attribute value|expected ['"]|quotation mark/i.test(k)){const y=Sl(p);v(w(y))}}if(m()){const k=d();/Unescaped/i.test(k)&&/attribute/i.test(k)&&/</.test(p)&&v(vl(p))}if(m()){const k=d();if(ss(k)){const y=ts(p);v(w(y))}}if(m()){const k=d();if(Pl(k)){const y=as(p);v(y)}}if(m()){const k=d();if(/extra content/i.test(k)){let y=`<${K}>
${p}
</${K}>`;if(y=as(y),v(y),m()){const g=d();if(ss(g)){const f=ts(y);v(w(f))}}}}if(m()){const k=d();A(`XML parse failed:
${k}
Snippet:
${os(p,0)}`,"parse-html")}t=b.documentElement}else t=e;const n=Eo(t),a=Dl(n);return dt(a,"parse-html"),a}function Eo(e){e instanceof Element||A("input to convert function is not Element","[(parse-html): convert()]",e);const t=e.tagName,n=t.toLowerCase(),{attrs:a,meta:i}=sl(e);if(n===q&&A("literal <_str> is not allowed in input HTML","parse-html"),n.startsWith("_")&&!wa.includes(n)&&A(`unknown VSN-like tag: <${n}>`,"parse-html"),["style","script"].includes(n)){let l=e.textContent?.trim();if(l?.startsWith("<![CDATA[")){const c=l.indexOf("]]>");c===-1&&A("Malformed CDATA block: missing closing ']]>'","parse-html"),l=l.slice(9,c)}if(l){const c=C({_tag:q,_content:[l]});return C({_tag:t,_attrs:a,_meta:i&&Object.keys(i).length?i:void 0,_content:[c]})}}const o=[],r=Il(e.childNodes,n);for(const l of r)if(Ut(l)){const c=ra(l)?q:V;o.push(C({_tag:c,_content:[l]}))}else o.push(l);if(n===V){o.length!==1&&A("<_val> must contain exactly one value","parse-html");const l=r[0],c=u=>Yn(u);let p;if(Ut(l))p=typeof l=="string"?c(l):l;else if(l&&typeof l=="object"&&"_tag"in l){const u=l;u._tag!==V&&u._tag!==q&&A("<_val> must contain a primitive or _str/_val","parse-html");const b=u._content?.[0];b===void 0&&A("<_val> payload is empty","parse-html"),p=typeof b=="string"?c(b):b}else A("<_val> payload is not an atom","parse-html");return typeof p=="string"&&A("<_val> cannot contain a string after coercion","parse-html",p),C({_tag:V,_content:[p]})}if(n===j)return C({_tag:j,_content:o});if(n===z)return o.every(l=>Ao(l))||A("_array children are not valid index tags","parse-html"),C({_tag:z,_content:o});if(n===we)return o.length!==1&&A("<_ii> must have exactly one child","parse-html"),C({_tag:we,_content:[o[0]],_meta:i&&Object.keys(i).length?i:void 0});if(n===F&&A("_elem tag found in html","parse-html"),o.length===0)return C({_tag:t,_attrs:a,_meta:i&&Object.keys(i).length?i:void 0,_content:[C({_tag:F,_meta:{},_content:[]})]});if(o.length===1){const l=o[0];if(l._tag===j||l._tag===z||l._tag===F)return C({_tag:t,_attrs:a,_meta:i&&Object.keys(i).length?i:void 0,_content:[l]})}return C({_tag:t,_attrs:a,_meta:i&&Object.keys(i).length?i:void 0,_content:[C({_tag:F,_meta:{},_content:o})]})}function Dl(e){return e._tag===K?e:e._tag===j||e._tag===z||e._tag===F?C({_tag:K,_content:[e]}):C({_tag:K,_content:[C({_tag:F,_content:[e]})]})}function Il(e,t){const n=[];for(const a of Array.from(e)){if(a.nodeType===Node.ELEMENT_NODE){n.push(Eo(a));continue}if(a.nodeType===Node.TEXT_NODE){const i=a.textContent??"",s=i.trim();if(s==='""'){n.push(C({_tag:q,_meta:{},_content:[""]}));continue}if(t==="_obj"){let o=i;o=o.replace(/^\r?\n/,""),o=o.replace(/\r?\n$/,""),o.length>0&&n.push(o);continue}s.length>0&&n.push(s);continue}}return n}function hi(e){const t=Zr(e);return t.trim()||A("parse_external_html(): all content removed by sanitizer (forbidden tags/attrs only).","parse_external_html",e.slice(0,200)),ka(t)}function Gl(e){if(e._tag!==K)return e;const t=(e._content??[]).filter(D);if(t.length===0)return C({_tag:j,_meta:{},_content:[]});if(t.length===1){const n=t[0];return n._tag===j||n._tag===z||n._tag===F?n:C({_tag:j,_meta:{},_content:[n]})}return C({_tag:j,_meta:{},_content:t})}function Hl(e){const t=e.trim();if(t.length>=2&&t[0]==='"'&&t[t.length-1]==='"'){const a=JSON.parse(t);if(typeof a!="string")throw new Error("HSON string literal did not parse to string");return a}const n=JSON.parse(`"${t}"`);if(typeof n!="string")throw new Error("HSON inner did not parse to string");return n}function Fa(e,t){return t?Hl(e):e.trim()}function zl(e){const t={},n={};for(const a of e){const i=a.name;if(i.startsWith(Qe)){if(a.value){const o=Fa(a.value.text,a.value.quoted);n[i]=o}continue}if(i==="style"){if(a.value){const o=Fa(a.value.text,a.value.quoted);t.style=mn(o)}else t.style={};continue}if(!a.value){t[i]=i;continue}const s=Fa(a.value.text,a.value.quoted);s===""||s===i?t[i]=i:t[i]=s}return{attrs:t,meta:n}}const Wt=e=>ra(e)?C({_tag:q,_meta:{},_content:[e]}):C({_tag:V,_meta:{},_content:[e]});function Bl(e){const t=[],n=[];let a=0;const i=e.length;function s(){return e[a]}function o(h){const d=e[a++];return d?(h&&d.kind!==h&&A(`expected ${h}, got ${d.kind}`,"parse_tokens"),d):null}function r(h){return!!h&&h.kind===X.OPEN}function l(h){return!!h&&h.kind===X.CLOSE}function c(h){return!!h&&h.kind===X.TEXT}function p(h){return!!h&&h.kind===X.ARR_OPEN}function u(h=!1){const d=o();r(d)||A(`expected OPEN, got ${d?.kind??"eof"}`,"parse_tokens");const m=d,{attrs:v,meta:w}=zl(m.rawAttrs),k=C({_tag:m.tag,_meta:w});!(m.tag===q||m.tag===V||m.tag===z||m.tag===j||m.tag===F||m.tag===K||m.tag===we)&&Object.keys(v).length&&(k._attrs=v);let g=null;const f=[];let x=!1;for(;a<i;){const T=s();if(!T)break;if(l(T)){g=o(X.CLOSE);break}if(T.kind===X.EMPTY_OBJ){o(X.EMPTY_OBJ),x=!0;continue}if(p(T)){f.push(b());continue}if(r(T)){f.push(u(!1).node);continue}if(c(T)){const M=o(X.TEXT),O=M.quoted?JSON.parse(M.raw):Yn(M.raw);f.push(Wt(O));continue}A(`unexpected token ${T.kind} inside <${m.tag}>`,"parse_tokens")}g===null&&A(`missing CLOSE for <${m.tag}>`,"parse_tokens");const S=g.close;if(m.tag===K){if(x)return k._content=[C({_tag:j})],h&&n.push(S),{node:k,closeKind:S};if(f.length===1&&f[0]._tag===z)k._content=f;else if(f.length>0){const T=S===Re.elem?F:j;k._content=[C({_tag:T,_content:f})]}else k._content=[];return h&&n.push(S),{node:k,closeKind:S}}if(m.tag===j||m.tag===z||m.tag===F)return k._content=f,h&&n.push(S),{node:k,closeKind:S};if(m.tag===q||m.tag===V||m.tag===we)return k._content=f,h&&n.push(S),{node:k,closeKind:S};if(S===Re.obj){f.length===1&&(f[0]._tag===j||f[0]._tag===z)?k._content=[f[0]]:k._content=[C({_tag:j,_content:f})];const T=k._content;T.length===1&&(T[0]._tag===j||T[0]._tag===z)||A("object semantics must yield a single _obj/_arr child","parse_tokens.object")}else{f.length===1&&f[0]._tag===F?k._content=f:k._content=[C({_tag:F,_content:f})];const T=k._content;T.length===1&&T[0]._tag===F||A("element semantics must yield a single _elem child","parse_tokens.element")}return h&&n.push(S),{node:k,closeKind:S}}function b(){const h=o();(!h||h.kind!==X.ARR_OPEN)&&A(`expected ARR_OPEN, got ${h?.kind??"eof"}`,"parse_tokens");const d=[];let m=0;for(;a<i;){const v=s();if(!v)break;if(v.kind===X.ARR_CLOSE){o();break}let w;if(v.kind===X.EMPTY_OBJ)o(),w=C({_tag:j,_meta:{},_content:[]});else if(v.kind===X.TEXT){const y=o(),g=y.quoted?JSON.parse(y.raw):Yn(y.raw);w=Wt(g)}else v.kind===X.OPEN?w=u(!1).node:v.kind===X.ARR_OPEN?w=b():A(`unexpected ${v.kind} in array`,"parse_tokens");new Set([j,z,F,q,V]).has(w._tag)||(w=C({_tag:j,_meta:{},_content:[w]})),w=Gl(w),d.push(C({_tag:we,_meta:{[Bt]:String(m)},_content:[w]})),m++}return C({_tag:z,_meta:{},_content:d})}for(;a<i;){const h=s();if(!h)break;if(h.kind===X.OPEN){const{node:d,closeKind:m}=u(!0);t.push(d),n.push(m);continue}if(h.kind===X.ARR_OPEN){t.push(b()),n.push("obj");continue}if(h.kind===X.EMPTY_OBJ){o(X.EMPTY_OBJ),t.push(C({_tag:j,_meta:{},_content:[]})),n.push("obj");continue}if(h.kind===X.TEXT){const d=o(X.TEXT),m=d.quoted?JSON.parse(d.raw):Yn(d.raw);t.push(Wt(m)),n.push("elem");continue}A(`unexpected top-level token ${h.kind}`,"parse_tokens")}if(t.length===1&&t[0]._tag===K)return t[0];{const h=t;if(h.length===1&&(h[0]._tag===j||h[0]._tag===z||h[0]._tag===F)){const w=h[0];return C({_tag:K,_meta:{},_content:[w]})}if(h.length===1&&typeof h[0]._tag=="string"&&!h[0]._tag.startsWith("_")){const w=n[0]===Re.obj?j:F;return C({_tag:K,_meta:{},_content:[C({_tag:w,_meta:{},_content:[h[0]]})]})}if(h.length===0)return C({_tag:K,_meta:{},_content:[C({_tag:j,_meta:{},_content:[]})]});const d=n.length>0&&n.every(w=>w===Re.obj),m=n.length>0&&n.every(w=>w===Re.elem);return C({_tag:K,_meta:{},_content:[C({_tag:d?j:F,_meta:{},_content:h})]})}}function Ul(e){const t=e.trim();if(!t)return{text:"",quoted:!1};const n=t[0];if(n==="'"&&t[t.length-1]==="'"){const i=t.slice(1,-1);return{text:JSON.stringify(i),quoted:!0}}return n==='"'&&t.length>=2&&t[t.length-1]==='"'?{text:t,quoted:!0}:{text:t,quoted:!1}}function ql(e,t,n,a){let i=1,s=t,o=!1,r=!1;for(;s<e.length;){const l=e[s];if(o){r?r=!1:l==="\\"?r=!0:l==='"'&&(o=!1),s++;continue}if(l==='"'){o=!0,s++;continue}if(n.length===1&&l===n){i++,s++;continue}if(a.length===1&&l===a){if(i--,i===0)return{body:e.slice(t,s),endIndex:s};s++;continue}if(n.length>1&&e.startsWith(n,s)){i++,s+=n.length;continue}if(a.length>1&&e.startsWith(a,s)){if(i--,i===0){const c=s;return{body:e.slice(t,c),endIndex:c}}s+=a.length;continue}s++}A(` unmatched ${n}${a} starting at ${t}`,"[scan_balanced_flat]",e)}function rs(e,t){if(!e||e.length===0)return[];const n=[];let a=0,i=0,s=null,o=!1,r=0,l=0,c=!1;for(;i<e.length;){const p=e[i];if(o){o=!1,i++;continue}if(p==="\\"){o=!0,i++;continue}if(s){p===s&&(s=null),i++;continue}if(p==='"'||p==="'"){s=p,i++;continue}if(!c&&p==="<"){c=!0,i++;continue}if(c&&p===">"){c=!1,i++;continue}if(p==="«"){l++,i++;continue}if(p==="»"){l--,i++;continue}if(p==="["){r++,i++;continue}if(p==="]"){r--,i++;continue}if(p===t&&r===0&&l===0&&!c){n.push(e.slice(a,i).trim()),i++,a=i;continue}i++}return n.push(e.slice(a).trim()),n.filter(p=>p.length>0)}function Jl(e){return e==='"'}function Vl(e,t,n){(e[t]??"")[n]!=='"'&&A(`readQuotedSpan: unsupported quote delimiter (use " only) at ${t+1}:${n+1}`,"tokenize_hson.readQuotedSpan");const s='"';let o=t,r=n+1,l='"',c=!1;for(;o<e.length;){const p=e[o];for(;r<p.length;){const u=p[r];if(c){l+="\\"+u,c=!1,r++;continue}if(u==="\\"){c=!0,r++;continue}if(u===s)return l+='"',{raw:l,endLine:o,endCol:r+1,delim:s};if(u==="	"){l+="\\t",r++;continue}if(u==="\r"){l+="\\r",r++;continue}if(u==='"'){l+='\\"',r++;continue}l+=u,r++}l+="\\n",o++,r=0}A("unterminated quoted string","tokenize_hson.readQuotedSpan")}const Ke=(e,t,n)=>({line:e,col:t,index:n}),Kl=/^<\s*$/,Xl=/^\s*<\s*<(\s|$)/;console.log.bind(console,"%c[hson tokenizer]","color: maroon; background: lightblue;");const Da=()=>{};function Zn(e,t=0){t>=50&&A("stopping potentially infinite loop (depth >= 50)","tokenize_hson");const a=[],i=[],s=e.split(/\r\n|\r|\n/);let o=0;Da(`[token_from_hson depth=${t}]; total lines: ${s.length}`);function r(h,d){const m=h.trim();(m.startsWith("'")||m.startsWith("`"))&&A(`[${d}] unsupported quote delimiter (use double quotes only): ${h}`,"tokenize-hson");const v=Ul(h);return m.startsWith('"')&&!v.quoted&&A(`[${d}] unterminated quoted literal: ${h}`,"tokenize-hson"),v}function l(h){const d=h.trim();return d?d==="true"||d==="false"||d==="null"?!0:/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(d):!1}function c(h){b+=h.length+1,o++}function p(h){for(let d=0;d<h;d++){const m=s[o+d]??"";b+=m.length+1}o+=h}function u(h,d,m,v,w){const k=[];let y=d;const g=m;let f=null,x=!1;const S=O=>w+O,T=O=>{const W=S(O);return{line:v,col:W,index:b+W-1}},M=()=>{for(;y<g&&/\s/.test(h[y]);)y++};for(;y<g&&(M(),!(y>=g||!/[A-Za-z_:]/.test(h[y])));){const O=y;for(y++;y<g&&/[\w:.\-]/.test(h[y]);)y++;const W=h.slice(O,y),G=T(O);if(M(),y<g&&h[y]==="="){y++,M();let R=y;if(h[y]==="'"&&A('unsupported single-quoted attribute value (use " only)',"tokenize_hson.readAttrs"),y<g&&h[y]==='"'){for(f=h[y],y++,R=y;y<g;){const J=h[y];if(x){x=!1,y++;continue}if(J==="\\"){x=!0,y++;continue}if(J===f)break;y++}const Z=h.slice(R,y);y<g&&h[y]===f&&y++;const I=T(y);k.push({name:W,value:{text:Z,quoted:!0},start:G,end:I})}else{for(;y<g&&!/\s/.test(h[y]);)y++;const Z=T(y),I=h.slice(R,y),J=f==='"'?`"${I}"`:JSON.stringify(I);k.push({name:W,value:{text:J,quoted:!0},start:G,end:Z})}}else{if(l(W))return{attrs:k,endIx:O};const R=T(y);k.push({name:W,start:G,end:R})}}return{attrs:k,endIx:y}}let b=0;for(;o<s.length;){const h=o,d=s[o],m=d.trim(),v=k=>s[k]??"";if(Da(`[token_from_hson depth=${t} L=${h+1}/${s.length}]: processing: "${m}" (Original: "${d}")`),!m||m.startsWith("//")){c(d);continue}if(Kl.test(d)){i.push({type:"IMPLICIT_OBJECT"}),i.push({type:"CLUSTER",close:Re.obj,implicit:!0});const k=h+1,y=d.search(/\S|$/)+1,g=Ke(k,y,b+y-1);a.push(Xi(j,[],g)),c(d);continue}if(/^«\s*»\s*$/.test(m)||/^\[\s*\]\s*$/.test(m)){const k=m.startsWith("«")?Cn.guillemet:Cn.bracket,y=d.search(/\S|$/)+1,g=Ke(h+1,y,b+y-1);a.push(Yi(k,g)),a.push(Zi(k,g)),c(d);continue}if(m.startsWith("«")||m.startsWith("[")){const k=m.startsWith("«")?"«":"[",y=k==="«"?"»":"]",g=k==="«"?Cn.guillemet:Cn.bracket,f=s.slice(o).join(`
`),x=d.indexOf(k)+1,S=d.indexOf(k)+1,{body:T,endIndex:M}=ql(f,S,k,y),O=f.slice(0,M+1),W=O.split(`
`).length-1,G=Ke(h+1,x,b+x-1),R=Ke(h+1+W,1,b+O.length);a.push(Yi(g,G));const Z=rs(T,",");for(const I of Z){const J=I.trim();if(J)if(J.startsWith("<")||J.startsWith("«")||J.startsWith("["))a.push(...Zn(J,t+1));else{const $=r(J,"array");a.push(jn($.text,$.quoted?!0:void 0,G))}}a.push(Zi(g,R)),p(W+1);continue}const w=d.match(/^\s*(\/?>)\s*(?:\/\/.*)?$/);if(w){const k=w[1];if(k){const y=k==="/>"?Re.elem:Re.obj,g=d.indexOf(k)+1,f=Ke(h+1,g,b+g-1),x=i.pop(),S=y===Re.obj;(!x.implicit||S)&&a.push(Qi(y,f));const T=i[i.length-1];S&&T&&T.type==="IMPLICIT_OBJECT"&&i.pop();const M=i[i.length-1];M&&M.type==="IMPLICIT_OBJECT"&&y===Re.obj&&i.pop(),c(d);continue}}if(m.startsWith("<")){if(/^<>\s*$/.test(m)){const I=h+1,$=d.search(/\S|$/)+1,re=Ke(I,$,b+$-1);a.push(al("<>",!1,re)),c(d);continue}if(Xl.test(m)){i.push({type:"IMPLICIT_OBJECT"}),i.push({type:"CLUSTER"});const I=m.indexOf("<",m.indexOf("<")+1),J=I>=0?m.substring(I).trim():"";if(J){const $=Zn(J,t+1);a.push(...$)}c(d);continue}let k=1;const y=m.length;for(;k<y&&/\s/.test(m[k]);)k++;const g=k;for(;k<y&&/[A-Za-z0-9:._-]/.test(m[k]);)k++;const f=m.slice(g,k);f||A(`[step f depth=${t} L=${h+1}] malformed tag in "${m}"`,"tokenize-hson");const x=h+1,S=d.search(/\S|$/)+1,T=S,M=Ke(x,T,b+T-1),O=d.match(/(\/?>)\s*(?:\/\/.*)?$/),W=O?O[1]:null;let G=[],R="";const Z=d.match(/^\s*/)?.[0].length??0;if(W){const I=d.lastIndexOf(W);I<0&&A(`internal: trailing closer not found in "${d}"`,"tokenize-hson",d);const J=Math.max(0,I-Z),{attrs:$,endIx:re}=u(m,k,J,x,S);G=$,R=m.slice(re,J).trim()}else{const{attrs:I}=u(m,k,m.length,x,S);G=I}if(a.push(Xi(f,G,M)),R)if(R.startsWith("<")||R.startsWith("«")||R.startsWith("["))a.push(...Zn(R,t+1));else{const I=rs(R,",");I.length>1&&A(`[step f] multiple inline items not allowed after <${f}>: "${R}"`,"tokenize-hson");const J=I[0].trim(),$=r(J,"step f");a.push(jn($.text,$.quoted?!0:void 0,M))}if(W){const I=W==="/>"?2:1,J=S+(m.length-I),$=Ke(x,J,b+J-1),re=W==="/>"?Re.elem:Re.obj;a.push(Qi(re,$)),c(d);continue}else{i.push({type:"CLUSTER"}),c(d);continue}}{const k=d.search(/\S|$/),y=d[k];if(Jl(y)){const S=Ke(o+1,k+1,b+k),{raw:T,endLine:M,endCol:O}=Vl(s,o,k);a.push(jn(T,!0,S));const W=v(M).slice(O);/^\s*(?:\/\/.*)?$/.test(W)||A("unexpected trailing characters after quoted text","tokenize_hson");for(let G=o;G<=M;G++)c(v(G));continue}const g=d.match(/^\s*(.+?)(?:\s*\/\/.*)?\s*$/),f=g?g[1]:"";if(/^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(f)){const S=Ke(o+1,(d.match(/^\s*/)?.[0].length??0)+1,b+(d.match(/^\s*/)?.[0].length??0));a.push(jn(f,void 0,S)),c(d);continue}}c(d)}if(Da(`[tokenize_hson depth=${t}] processed all lines
  contextStack size: ${i.length}
  total tokens: ${a.length}`),t===0&&i.length>0){const h=i.map(d=>d.type==="CLUSTER"?`<cluster ${d.close??"pending"}>`:d.type==="IMPLICIT_OBJECT"?"< < (implicit object)":"<tag?>").join(", ");A(`final check failed: tokenizer finished with ${i.length} unclosed items: ${h}`,"tokenize-hson")}return a}function Oo(e){const t=Zn(e),n=Bl(t);return dt(n,"parse hson"),n}function bt(e){return e.replace(/[_\s]+/g,"-").replace(/[_\s]+/g,"-").replace(/([a-z0-9])([A-Z])/g,"$1-$2").replace(/-+/g,"-").toLowerCase()}function wn(e){if(!e||!Object.keys(e).length)return"";const t=[];for(const[n,a]of Object.entries(e)){if(a==null)continue;let i=String(a).trim();if(!i)continue;i.endsWith(";")&&(i=i.replace(/;+$/g,""));const o=n.startsWith("--")?n:n==="cssFloat"?"float":bt(n);t.push([o,i])}return t.sort(([n],[a])=>n<a?-1:n>a?1:0),t.map(([n,a])=>`${n}: ${a}`).join("; ")}function ea(e){if(Array.isArray(e))return z;if(si(e))return j;if(typeof e=="string")return q;if(e===null||typeof e=="number"||typeof e=="boolean")return V;A("invalid value provided","getTag","???")}const Ql=new Set(["_obj","_arr","_ii","_str","_val"]);function ls(e){return Object.keys(e).filter(t=>!t.startsWith("_"))}function cs(e,t){for(const n of Object.keys(e))Ql.has(n)&&A(`JSON input must not contain "${n}" (reserved for HSON/HTML)`,"parse_json",`${t}
${ce(e)}`)}function Dt(e,t){if(t===q||t===V)return t===q?(ra(e)||A(`expected string for ${q}, got ${typeof e}`,"nodeFromJson.primitive"),{node:C({_tag:q,_meta:{},_content:[e]})}):(Ut(e)||A(`expected number|boolean|null for ${V}, got ${typeof e}`,"nodeFromJson.primitive"),{node:C({_tag:V,_meta:{},_content:[e]})});if(t===z){Array.isArray(e)||A("array expected for ARR_TAG parent","parse_json",ce(e));const n=e.map((a,i)=>{const s=ea(a),o=Dt(a,s).node;return C({_tag:we,_meta:{"data-_index":String(i)},_content:[o]})});return{node:C({_tag:z,_content:n})}}if(t===j){(!e||typeof e!="object"||Array.isArray(e))&&A("object expected for OBJ_TAG parent","parse_json",ce(e));const n=e;if(Object.prototype.hasOwnProperty.call(n,K)){const s=ls(n);s.length===0||s.length===1&&s[0]===K||A('"_root" object must not have non-underscore siblings',"parse_json",ce(n));const o=n[K];if(o===void 0)return{node:C({_tag:K,_content:[]})};const r=ea(o),l=Dt(o,r).node,p=l._tag===q||l._tag===V?C({_tag:F,_content:[l]}):l;return{node:C({_tag:K,_content:[p]})}}if(Object.prototype.hasOwnProperty.call(n,F)){const s=n[F];Array.isArray(s)||A('"_elem" must contain an array',"parse_json",ce(s));const o=s.map((r,l)=>{if(ra(r))return C({_tag:q,_meta:{},_content:[r]});if(Ut(r))return C({_tag:V,_meta:{},_content:[r]});if(r&&typeof r=="object"&&!Array.isArray(r)){const c=r;cs(c,`"_elem"[${l}]`);const p=ls(c);p.length!==1&&A("element-object must have exactly one tag key","parse_json",ce(c));const u=p[0],b=c._attrs,h=c._meta,d=b&&typeof b=="object"&&!Array.isArray(b)?b:void 0,m=h&&typeof h=="object"&&!Array.isArray(h)?h:void 0;if(d&&Object.prototype.hasOwnProperty.call(d,"style")){const y=d.style;if(y&&typeof y=="object"&&!Array.isArray(y)){const g=wn(y);d.style=mn(g)}else typeof y=="string"?d.style=mn(y):delete d.style}const v=c[u];let w=[];if(v!==void 0){const y=ea(v);w=[Dt(v,y).node]}const k=C({_tag:u,_content:w});return d&&Object.keys(d).length&&(k._attrs=d),m&&Object.keys(m).length&&(k._meta={...k._meta,...m}),k}A(`invalid item in "_elem"[${l}] (must be string|number|boolean/null or element-object)`,"parse_json",ce(r))});return{node:C({_tag:F,_meta:{},_content:o})}}cs(n,"[generic object check, parseJSON]");const i=Object.keys(n).map(s=>{const o=n[s];let r;typeof o=="string"?r=C({_tag:q,_meta:{},_content:[o]}):typeof o=="number"||typeof o=="boolean"||o===null?r=C({_tag:V,_meta:{},_content:[o]}):Array.isArray(o)?r=Dt(o,z).node:o&&typeof o=="object"?r=Dt(o,j).node:A(`unsupported JSON value for key "${s}"`,"nodeFromJson.object.value");const l=r._tag===j||r._tag===z?[r]:[C({_tag:j,_meta:{},_content:[r]})];return C({_tag:s,_meta:{},_content:l})});return{node:C({_tag:j,_meta:{},_content:i})}}A(`unhandled parentTag ${t}`,"nodeFromJson.dispatch")}function Wo(e){let t;try{t=typeof e=="string"?JSON.parse(e):e}catch(o){A(`invalid JSON input ${ce(e)}`,"parse-json",String(o))}let n=t,a;if(si(t)){const o=t,r=Object.keys(o).filter(l=>l!=="_meta");if(r.length===1&&r[0]===K&&(n=o[K],o._meta&&si(o._meta))){const l={};for(const[c,p]of Object.entries(o._meta))c.startsWith(Qe)&&(l[c]=p);Object.keys(l).length&&(a=l)}}const{node:i}=Dt(n,ea(n)),s=C({_tag:K,_meta:a,_content:[i]});return dt(s,"root"),s}function Ln(e){return typeof e=="string"?JSON.stringify(e):String(e)}const Rn=()=>{};function Yl(){const e=new WeakSet;return{enter(t){e.has(t)&&A("serialize-hson: cycle detected in node graph","serialize_hson.cycleGuard.enter"),e.add(t)},leave(t){e.delete(t)}}}function Zl(e){if(!e)return!0;for(const t in e)return!1;return!0}function ec(e){if(!e)return{};const t={};for(const n of Object.keys(e)){n.startsWith(Qe)||A(`serialize-hson: illegal meta key "${n}" (only "${Qe}*" allowed)`,"serialize_hson");const a=e[n];typeof a!="string"&&A(`serialize-hson: meta "${n}" must be a string`,"serialize_hson"),t[n]=a}return t}function tc(e){if(!e)return"";const t=Object.entries(e);if(!t.length)return"";const n=t.filter(([o,r])=>r!==o),a=t.filter(([o,r])=>r===o),i=(o,r)=>o==="style"&&r&&typeof r=="object"&&!Array.isArray(r)?` style="${wn(r)}"`:typeof r=="string"?` ${o}="${r.replace(/"/g,'\\"')}"`:` ${o}=${String(r)}`,s=[];for(const[o,r]of n)s.push(i(o,r));for(const[o]of a)s.push(` ${o}`);return s.join("")}function nc(e,t){const n=tc(e),a=(()=>{const i=ec(t);return Object.keys(i).length?Object.keys(i).sort().map(o=>` ${o}="${i[o].replace(/"/g,'\\"')}"`).join(""):""})();return`${n}${a}`}function ac(e){if(!Zl(e._attrs)||e._meta&&Object.keys(e._meta).length||!e._content||e._content.length!==1||!D(e._content[0]))return;let t=e._content[0];if(t._tag===j){const a=t._content;if(!a||a.length!==1||!D(a[0]))return;t=a[0]}if(!t._content||t._content.length!==1)return;const n=t._content[0];if(t._tag===q)return typeof n=="string"?n:void 0;if(t._tag===V)return typeof n=="number"||typeof n=="boolean"||n===null?n:void 0}function ot(e,t,n,a){a.enter(e);try{let l=function(v){return!!(v&&Object.keys(v).length)},c=function(v){if(l(v._attrs)||l(v._meta))return;const w=v._content??[];if(w.length===0)return{kind:"void"};if(w.length===1&&typeof w[0]=="object"&&w[0]&&"_tag"in w[0]){let k=w[0];if(k._tag===F){const y=k._content??[];if(y.length===0)return{kind:"void"};if(y.length===1&&typeof y[0]=="object"&&y[0]&&"_tag"in y[0])k=y[0];else return}if(r.has(k._tag)){const y=k._content?.[0];return y===void 0||typeof y=="string"&&y.includes(`
`)?void 0:{kind:"text",value:y}}}};var i=l,s=c;const o="  ".repeat(t);if(e._tag.startsWith("_")&&!wa.includes(e._tag)&&A(`unknown VSN-like tag: <${e._tag}>`,"parse-html"),e._tag===q||e._tag===V){Rn("leaf node detected: ",e._tag),(!e._content||e._content.length!==1)&&A(`serialize-hson: ${e._tag} must contain exactly one primitive`,"serialize_hson.cycleGuard.enter");const v=e._content[0];if(e._tag===q){if(typeof v!="string"){const w=e._content?.[0];console.warn("STR payload not string:",w,e),A("serialize-hson: _str must contain a string","serialize_hson.emitNode()")}return o+JSON.stringify(v)}return typeof v=="number"||typeof v=="boolean"||v===null||A("serialize-hson: _val must contain number|boolean|null : ","serialize_hson.emitNode()",`${v}`),o+String(v)}if(e._tag===we){Rn("index node detected");const v=e._content?.[0];return D(v)||A("serialize-hson: _ii must contain exactly one child node","serialize_hson.emitNode()"),ot(v,t,n,a)}if(e._tag===z){const v=e._content??[];if(!v.length)return`${o}«»`;const w=o+"  ",k=v.map(y=>{D(y)||A("serialize-hson: non-node item in _arr","emitNode"),y._tag!==we&&A("serialize-hson: only _ii allowed directly under _arr","emitNode");let g=y;const f=g._content??[];if((f.length!==1||!D(f[0]))&&A("serialize-hson: _ii must contain exactly one child node","emitNode"),g=f[0],g._tag===j){const x=g._content??[];if(x.length===0)return`${w}<>`;const S=x.map(T=>ot(T,t+2,j,a)).join(`
`);return`${w}<
${S}
${w}>`}return ot(g,t+1,void 0,a)}).join(`,
`);return`${o}«
${k}
${o}»`}if(e._tag===K){const v=e._content??[];if(v.length===0)return"";v.length!==1&&A("_root must have exactly one cluster child","serialize_hson");const w=v[0];xo.includes(w._tag)||A("_root child must be _obj | _elem | _arr","serialize_hson");const k=ot(w,0,w._tag,a);return w._tag===j&&(w._content?.length??0)===0?"<>":k.trim()}if(e._tag===j||e._tag===F){Rn("cluster node detected: ",e._tag),e._attrs&&Object.keys(e._attrs).length&&A(`serialize-hson: ${e._tag} may not carry _attrs`,"serialize_hson.emitNode()");const v=e._content??[];if(e._tag===j&&v.length===0)return`${o}<>`;const w=e._tag;return e._tag===j?v.map(k=>{D(k)||A("serialize-hson: non-node in _obj._content","emitNode");const y=k._tag,g=Array.isArray(k._content)?k._content[0]:null;if(!g)return`${o}<${y} />`;const f=g._tag===j?(()=>{const T=g._content??[];return T.length===0?`${o}  <>`:T.map(M=>ot(M,t+1,w,a)).join(`
`)})():ot(g,t+1,w,a),x=f.trim();return x.length>0&&!x.includes(`
`)?`${o}<${y}  ${x}>`:`${o}<${y}
${f}
${o}>`}).join(`
`):(e._content??[]).map(k=>ot(k,t,F,a)).join(`
`)}const r=new Set([q,V]);Rn("building attrs string for standard tag");const p=nc(e._attrs,e._meta),u=c(e);if(u!==void 0)return n===j?u.kind==="void"?`${o}<${e._tag}${p}  <>`:`${o}<${e._tag}${p}  ${Ln(u.value)}>`:u.kind==="void"?`${o}<${e._tag}${p} />`:`${o}<${e._tag}${p} ${Ln(u.value)}/>`;const b=ac(e);if(b!==void 0)return n===j?`${o}<${e._tag}${p}  ${Ln(b)}>`:`${o}<${e._tag}${p} ${Ln(b)}/>`;const h=e._content??[];if(!h.length)return n===j?`${o}<${e._tag}${p}
${o}  <>
${o}>`:`${o}<${e._tag}${p}/>`;let d="/>";h.length===1&&D(h[0])&&(h[0]._tag===j||h[0]._tag===z||h[0]._tag===F)&&(d=h[0]._tag===F?"/>":">");const m=h.map(v=>ot(v,t+1,v._tag===z?j:n,a)).filter(v=>/\S/.test(v)).join(`
`);return m.length===0?`${o}<${e._tag}${p}${d}`:`${o}<${e._tag}${p}
${m}
${o}${d}`}finally{a.leave(e)}}function ic(e){D(e)||A("serialize-hson: root must be a HsonNode","serialize-hson"),dt(e,"serialize_hson");const t=Yl();return ot(e,0,void 0,t).trim()}function sc(e){const t={},n=e._attrs;if(n)for(const[i,s]of Object.entries(n)){if(i==="style"){s&&typeof s=="object"&&!Array.isArray(s)?t.style=wn(s):typeof s=="string"&&(t.style=s);continue}t[i]=String(s)}const a=e._meta;if(a)for(const[i,s]of Object.entries(a))i.startsWith(Qe)&&(t[i]=String(s));return t}function la(e){return Ut(e)||A("need a string in escape_html","escape_html",e),typeof e!="string"?String(e):e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function No(e){return typeof globalThis.structuredClone=="function"?globalThis.structuredClone(e):JSON.parse(JSON.stringify(e))}const oc=new Set(["style","script"]);function Co(e){if(!e||!e.length)return"";let t="";for(const n of e)if(D(n))if(n._tag===q){const a=n._content?.[0]??"";t+=typeof a=="string"?a:String(a)}else t+=Co(n._content);else t+=String(n);return t}function rc(e){for(let t=0;t<e.length;t++){const n=e.charCodeAt(t);(n>=0&&n<=8||n===11||n===12||n>=14&&n<=31)&&A(`Illegal XML control char U+${n.toString(16).padStart(4,"0")} in attribute value`,"escape_attr",e)}return e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;")}function ds(e){return la(typeof e=="string"?e:String(e))}function un(e){if(Ut(e))return ds(e);e===void 0&&A("undefined node received","serialize_html",e);const{_tag:t,_content:n=[]}=e;switch(t.startsWith("_")&&!wa.includes(t)&&A(`unknown VSN-like tag: <${t}>`,"serialize_html"),t){case q:{(!n||n.length!==1||typeof n[0]!="string")&&A("<_str> must contain exactly one string","serialize_html");const r=n[0];return r===""?'""':la(r)}case V:{(!n||n.length!==1)&&A("<_val> must contain exactly one value","serialize_html");const r=n[0];return`<${V}>${la(String(r))}</${V}>`}case F:return n.map(r=>un(r)).join(`
`);case K:{const r=n;return r.length!==1&&A("_root must have exactly one child","serialize_html"),un(r[0])}case j:{const l=(n??[]).map(un).join(`
`);return`<${j}>
${l}
</${j}>`}}let a=`<${t}`;const i=sc(e);t==="svg"&&("xmlns"in i||(i.xmlns="http://www.w3.org/2000/svg"));for(const r of Object.keys(i).sort())a+=` ${r}="${rc(i[r])}"`;const s=n??[];let o;return oc.has(t.toLowerCase())?o=Co(s).replace(/<\/(style|script)/gi,"<\\/$1>"):o=s.map(r=>D(r)?un(r):ds(r)).join(""),`${a}>${o}</${t}>`}function us(e){const t=No(e);D(t)||A("input node cannot be undefined for node_to_html","serialize_html",ce(e)),dt(t,"serialize_html");const a=un(t).replace(/\b([^\s=]+)="\1"/g,"$1");return/<\s*_str\b/.test(a)&&A("literal <_str> leaked into HTML output","serialize_html",a.slice(0,400)),a.trim()}function lc(e){const t=No(e);dt(t,"serialize_json");const n=ht(t);try{return ce(n)}catch(a){A(`error during final JSON.stringify
 ${a.message}`,"serialize-json")}}function ht(e){switch((!e||typeof e._tag!="string")&&(console.warn("warning! node is type: ",typeof e),A("Invalid node or node tag","serialize_json")),e._tag.startsWith("_")&&!wa.includes(e._tag)&&A(`unknown VSN-like tag: <${e._tag}>`,"parse-html"),e._tag){case K:return(!e._content||e._content.length!==1)&&(console.error(ce(e)),A("malformed _root node -  must have exactly one child","serialize_json")),ht(e._content[0]);case z:{let t=[];if(e._content)for(const n of e._content)Ao(n)?t.push(ht(n._content[0])):A("malformed _ii node in _array","serialize-json");return t}case j:{const t={};if(e._content&&e._content.length===1){const n=e._content[0];if(n._tag===q||n._tag===V||n._tag===z||n._tag===j||n._tag===F)return ht(n)}if(e._content)for(const n of e._content){const a=n._tag;let i={};if(n._content&&n._content.length>0){const s=n._content[0];i=ht(s)}t[a]=i}return t}case q:case V:return e._content[0];case F:{const t=[];for(const n of e._content){const a=ht(n);t.push(a)}return{[F]:t}}case we:return(!e._content||e._content.length!==1)&&A("misconfigured _ii node","serialize_json"),ht(e._content[0]);default:{let t={};if(e._content&&e._content.length===0)t={[e._tag]:""};else if(e._content&&e._content.length===1){const s=ht(e._content[0]);t={[e._tag]:s}}else e._content&&e._content.length>1&&A(`<${e._tag}> has multiple content VSN children`,"serialize_json");const n=e._attrs&&Object.keys(e._attrs).length>0,a=e._meta&&Object.keys(e._meta).length>0,i=t;return n&&(i._attrs={...i._attrs,...e._attrs}),a&&(i._meta=e._meta),i}}}function ta(e){const{frame:t,output:n}=e;return{serialize(){switch(n){case rt.HSON:{if(!t.hson)throw new Error("serialize(): frame is missing HSON data");return t.hson}case rt.JSON:{if(t.json==null)throw new Error("serialize(): frame is missing JSON data");return typeof t.json=="string"?t.json:ce(t.json)}case rt.HTML:{if(t.html==null)throw new Error("serialize(): frame is missing HTML data");return typeof t.html=="string"?t.html:ce(t.html)}default:throw new Error("serialize(): invalid output format")}},parse(){switch(n){case rt.JSON:{if(t.json==null)throw new Error("parse(): frame is missing JSON data");return typeof t.json=="string"?JSON.parse(t.json):t.json}case rt.HSON:{if(!t.node)throw new Error("parse(): frame is missing HSON node data");return t.node}case rt.HTML:throw new Error(`.parse() is not available for the HTML output format.
Use .serialize() to get the HTML string.`);default:throw new Error("parse(): could not find a format to parse")}}}}function cc(e){const{frame:t,output:n}=e;return{withOptions(a){const i={...t,options:{...t.options,...a}};return ta({frame:i,output:n})},noBreak(){const a={...t,options:{...t.options,noBreak:!0}};return ta({frame:a,output:n})},spaced(){const a={...t,options:{...t.options,spaced:!0}};return ta({frame:a,output:n})}}}function va(e){return(Array.isArray(e)?e:[e]).flatMap(n=>{if(n._tag===K){const a=n._content?.[0];if(D(a)&&a._tag===F)return a._content?.filter(D)||[]}return[n]})}function dc(e,t){fi.set(e,t)}function me(e){return fi.get(e)}const jo=new Map,gi=new WeakMap;let uc=0;function pc(){if(typeof crypto<"u"&&crypto.getRandomValues){const e=new Uint8Array(8);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}return`q-${Date.now().toString(36)}-${(uc++).toString(36)}`}function bi(e){const t=e._meta?.[Fe];return typeof t=="string"&&t?t:gi.get(e)}function _n(e,t){const n=t?.persist??!0;let a=bi(e);return a||(a=pc()),jo.set(a,e),gi.set(e,a),n&&((e._meta??={})[Fe]=a),a}function mc(e,t){const n=bi(e);n&&(jo.delete(n),gi.delete(e))}const ca=new WeakMap;function fc(e,t,n,a){e.addEventListener(t,n,a);const i=()=>e.removeEventListener(t,n,a);let s=ca.get(e);return s||(s=new Set,ca.set(e,s)),s.add(i),i}function ps(e){const t=ca.get(e);if(t){for(const n of t)n();ca.delete(e)}}function hc(e){let t=1;const n=[];let a={},i="warn",s=!1,o=!1,r=!1;const l=()=>{b()},c=d=>a.target==="window"?window:a.target==="document"?document:d,p=()=>{const d=e.asDomElement();return d?[d]:[]},u=(d,m)=>{const v=y=>{r&&y.stopImmediatePropagation(),o&&y.stopPropagation(),s&&!a.passive&&y.preventDefault(),m(y),a.once&&(a.target==="window"?window:a.target==="document"?document:y.currentTarget??document).removeEventListener(String(d),v,{capture:!!a.capture})},w={id:t++,sub:null,type:String(d),handler:v,cancelled:!1,offs:null};n.push(w),l();const k={off(){if(w.cancelled=!0,w.offs){for(const y of w.offs)y();w.offs=null}k.count=0,k.ok=!1},count:0,ok:!1};return w.sub=k,k},b=()=>{const d=p();for(const y of d)if(!(y instanceof Element))throw new Error("listen.attach(): non-Element target in selection");if(d.length===0){const y="listen.attach(): no targets in selection";if(i==="throw")throw new Error(y);i==="warn"&&console.warn(y,{tree:e});for(const g of n)g.offs=null,g.sub&&(g.sub.count=0,g.sub.ok=!1);return n.length=0,{off:()=>{},count:0,ok:!1}}const m={capture:!!a.capture,once:!!a.once,passive:!!a.passive},v=n.splice(0,n.length),w=[];for(const y of v){if(y.cancelled){y.offs=null,y.sub&&(y.sub.count=0,y.sub.ok=!1);continue}const g=[];for(const f of d){const x=c(f);g.push(fc(x,y.type,y.handler,m))}y.offs=g,y.sub&&(y.sub.count=g.length,y.sub.ok=g.length>0);for(const f of g)w.push(f)}return{off:()=>{for(const y of w)y()},count:w.length,ok:w.length>0}};let h;return h={on:u,onInput:d=>u("input",m=>d(m)),onChange:d=>u("change",m=>d(m)),onSubmit:d=>u("submit",m=>d(m)),onClick:d=>u("click",m=>d(m)),onDblClick:d=>u("dblclick",m=>d(m)),onContextMenu:d=>u("contextmenu",m=>d(m)),onMouseMove:d=>u("mousemove",m=>d(m)),onMouseDown:d=>u("mousedown",m=>d(m)),onMouseUp:d=>u("mouseup",m=>d(m)),onMouseEnter:d=>u("mouseenter",m=>d(m)),onMouseLeave:d=>u("mouseleave",m=>d(m)),onPointerDown:d=>u("pointerdown",m=>d(m)),onPointerMove:d=>u("pointermove",m=>d(m)),onPointerUp:d=>u("pointerup",m=>d(m)),onPointerEnter:d=>u("pointerenter",m=>d(m)),onPointerLeave:d=>u("pointerleave",m=>d(m)),onPointerCancel:d=>u("pointercancel",m=>d(m)),onTouchStart:d=>u("touchstart",m=>d(m)),onTouchMove:d=>u("touchmove",m=>d(m)),onTouchEnd:d=>u("touchend",m=>d(m)),onTouchCancel:d=>u("touchcancel",m=>d(m)),onWheel:d=>u("wheel",m=>d(m)),onScroll:d=>u("scroll",m=>d(m)),onFocus:d=>u("focus",m=>d(m)),onBlur:d=>u("blur",m=>d(m)),onFocusIn:d=>u("focusin",m=>d(m)),onFocusOut:d=>u("focusout",m=>d(m)),onKeyDown:d=>u("keydown",m=>d(m)),onKeyUp:d=>u("keyup",m=>d(m)),onDragStart:d=>u("dragstart",m=>d(m)),onDragOver:d=>u("dragover",m=>d(m)),onDrop:d=>u("drop",m=>d(m)),onDragEnd:d=>u("dragend",m=>d(m)),onAnimationStart:d=>u("animationstart",m=>d(m)),onAnimationIteration:d=>u("animationiteration",m=>d(m)),onAnimationEnd:d=>u("animationend",m=>d(m)),onAnimationCancel:d=>u("animationcancel",m=>d(m)),onTransitionStart:d=>u("transitionstart",m=>d(m)),onTransitionEnd:d=>u("transitionend",m=>d(m)),onTransitionCancel:d=>u("transitioncancel",m=>d(m)),onTransitionRun:d=>u("transitionrun",m=>d(m)),onCopy:d=>u("copy",m=>d(m)),onCut:d=>u("cut",m=>d(m)),onPaste:d=>u("paste",m=>d(m)),onCustom:(d,m)=>u(d,m),onCustomDetail:(d,m)=>h.onCustom(d,m),once:()=>(a={...a,once:!0},h),passive:()=>(a={...a,passive:!0},h),capture:()=>(a={...a,capture:!0},h),toWindow:()=>(a={...a,target:"window"},h),toDocument:()=>(a={...a,target:"document"},h),strict(d="warn"){return i=d,h},preventDefault(){return s=!0,h},stopProp(){return o=!0,h},stopImmediateProp(){return r=!0,h},stopAll(){return r=o=s=!0,h},clearStops(){return r=o=s=!1,h}},h}function yi(e){const t=e._content;if(Array.isArray(t)&&t.length)for(const a of t)D(a)&&yi(a);const n=me(e);if(n){ps(n);const a=n.querySelectorAll("*");for(let i=0;i<a.length;i++)ps(a[i]);n.remove()}fi.delete(e)}function gc(e,t){return{begin:n=>t.begin(e,n),restart:n=>t.restart(e,n),beginName:n=>t.beginName(e,n),restartName:n=>t.restartName(e,n),end:n=>t.end(e,n),setPlayState:n=>t.setPlayState(e,n),pause:()=>t.pause(e),resume:()=>t.resume(e)}}function Lo(e){const t=e.trim();if(t==="")throw new Error("animation name cannot be empty.");return t}function ms(e,t,n){return n.setStyleProp(e,"animation-name",Lo(t))}function fs(e){const t=Lo(e.name),n=e.duration.trim();if(n==="")throw new Error("begin_animation: spec.duration cannot be empty.");return{...e,name:t,duration:n,timingFunction:e.timingFunction?.trim(),delay:e.delay?.trim(),iterationCount:e.iterationCount?.trim(),direction:e.direction?.trim(),fillMode:e.fillMode?.trim(),playState:e.playState?.trim()}}function hs(e,t,n){return e=n.setStyleProp(e,"animation-name",t.name),t.duration!==void 0&&(e=n.setStyleProp(e,"animation-duration",t.duration.trim())),t.timingFunction!==void 0&&(e=n.setStyleProp(e,"animation-timing-function",t.timingFunction.trim())),t.delay!==void 0&&(e=n.setStyleProp(e,"animation-delay",t.delay.trim())),t.iterationCount!==void 0&&(e=n.setStyleProp(e,"animation-iteration-count",t.iterationCount.trim())),t.direction!==void 0&&(e=n.setStyleProp(e,"animation-direction",t.direction.trim())),t.fillMode!==void 0&&(e=n.setStyleProp(e,"animation-fill-mode",t.fillMode.trim())),t.playState!==void 0&&(e=n.setStyleProp(e,"animation-play-state",t.playState.trim())),e}function gs(e,t){const n=t;if(typeof n.offsetHeight=="number"){n.offsetHeight;return}t.getBoundingClientRect().height}function bc(e){return{begin(t,n){const a=fs(n);return hs(t,a,e)},beginName(t,n){return ms(t,n,e)},end(t,n="name-only"){return t=e.setStyleProp(t,"animation-name","none"),n==="clear-all"&&(t=e.setStyleProp(t,"animation-duration",""),t=e.setStyleProp(t,"animation-timing-function",""),t=e.setStyleProp(t,"animation-delay",""),t=e.setStyleProp(t,"animation-iteration-count",""),t=e.setStyleProp(t,"animation-direction",""),t=e.setStyleProp(t,"animation-fill-mode",""),t=e.setStyleProp(t,"animation-play-state","")),t},restart(t,n){const a=fs(n);t=e.setStyleProp(t,"animation-name","none");const i=e.getFirstDomElement(t);return i&&gs(t,i),hs(t,a,e)},restartName(t,n){t=e.setStyleProp(t,"animation-name","none");const a=e.getFirstDomElement(t);return a&&gs(t,a),ms(t,n,e)},setPlayState(t,n){return e.setStyleProp(t,"animation-play-state",n)},pause(t){return e.setStyleProp(t,"animation-play-state","paused")},resume(t){return e.setStyleProp(t,"animation-play-state","running")}}}function yc(e){return Array.isArray(e)}function bs(e){if(yc(e)){const[s,o,r,l]=e,c=r?.trim(),p=l??!1;if(o!=="*"&&(!c||c===""))throw new Error(`@property ${s}: init is required when syntax is not "*".`);return{name:s,syn:o,inh:p,init:c}}const t=e.name,n=e.syn,a=e.inh??!1,i=e.init?.trim();if(n!=="*"&&(!i||i===""))throw new Error(`@property ${t}: init is required when syntax is not "*".`);return{name:t,syn:n,inh:a,init:i}}function Ia(e){const t=new Map;function n(a){const i=[];return i.push(`@property ${a.name} {`),i.push(`  syntax: "${a.syn}";`),i.push(`  inherits: ${a.inh?"true":"false"};`),a.init!==void 0&&i.push(`  initial-value: ${a.init};`),i.push("}"),i.join(`
`)}return{register(a){const i=bs(a),s=t.get(i.name);s!==void 0&&s.syn===i.syn&&s.inh===i.inh&&s.init===i.init||(t.set(i.name,i),e.onChange())},registerMany(a){for(const i of a){const s=bs(i);t.set(s.name,s)}e.onChange()},unregister(a){t.delete(a)&&e.onChange()},has(a){return t.has(a)},get(a){return t.get(a)},renderOne(a){const i=t.get(a);return i?n(i):""},renderAll(){const a=Array.from(t.keys()).sort(),i=[];for(const s of a){const o=t.get(s);o&&i.push(n(o))}return i.join(`

`)}}}const wc={float:"cssFloat","css-float":"cssFloat"},_c={"-webkit-":"Webkit","-moz-":"Moz","-ms-":"ms","-o-":"O"};function Ro(e){return e.startsWith("--")?e:e==="cssFloat"?"float":bt(e)}function fn(e){const t=e.trim();if(t==="")return"";if(t.startsWith("--"))return t;const n=t.toLowerCase(),a=wc[n];if(a)return a;for(const[i,s]of Object.entries(_c))if(n.startsWith(i)){const o=t.slice(i.length);return s+Nt(o).replace(/^[a-z]/,r=>r.toUpperCase())}return t.includes("-")?Nt(t):t}function kc(e){const t=e.steps[0];return Array.isArray(t)}function ys(e){if(e==="from"||e==="to")return;const t=Number(e.slice(0,-1));if(!Number.isFinite(t))throw new Error(`@keyframes: invalid selector "${e}" (not a number%).`);if(t<0||t>100)throw new Error(`@keyframes: invalid selector "${e}" (must be 0%..100%).`)}function ws(e){const t={};for(const[n,a]of Object.entries(e)){if(!n||n.trim()==="")continue;const i=String(a).trim();i!==""&&(t[n.trim()]=i)}return t}function vc(e){const t=[...e];return t.sort((n,a)=>{if(n.at==="from"&&a.at!=="from")return-1;if(a.at==="from"&&n.at!=="from"||n.at==="to"&&a.at!=="to")return 1;if(a.at==="to"&&n.at!=="to")return-1;const i=Number(n.at.slice(0,-1)),s=Number(a.at.slice(0,-1));return i-s}),t}function _s(e){const t=e.name.trim();if(t==="")throw new Error("@keyframes: name cannot be empty.");const n=[];if(kc(e))for(const[s,o]of e.steps)ys(s),n.push({at:s,decls:ws(o)});else for(const[s,o]of Object.entries(e.steps)){if(!o)continue;const r=s;ys(r),n.push({at:r,decls:ws(o)})}if(n.length===0)throw new Error(`@keyframes ${t}: must have at least one step.`);const a=new Map;for(const s of n)a.set(s.at,s);const i=vc(Array.from(a.values()));return{name:t,steps:i}}function xc(e){return Object.keys(e).sort().map(n=>{const a=Ro(n),i=e[n]??"";return`    ${a}: ${i};`})}function ks(e){const t=[];t.push(`@keyframes ${e.name} {`);for(const n of e.steps)t.push(`  ${n.at} {`),t.push(...xc(n.decls)),t.push("  }");return t.push("}"),t.join(`
`)}function Ga(e){const t=new Map;return{set(n){const a=_s(n),i=t.get(a.name);i!==void 0&&JSON.stringify(i)===JSON.stringify(a)||(t.set(a.name,a),e.onChange())},setMany(n){for(const a of n){const i=_s(a);t.set(i.name,i)}e.onChange()},delete(n){t.delete(n.trim())&&e.onChange()},has(n){return t.has(n.trim())},get(n){return t.get(n.trim())},renderOne(n){const a=t.get(n.trim());return a?ks(a):""},renderAll(){const n=Array.from(t.keys()).sort(),a=[];for(const i of n){const s=t.get(i);s&&a.push(ks(s))}return a.join(`

`)}}}const Sc=e=>{if(!e||typeof e!="object")return!1;const t=e;if(!("value"in t))return!1;const n=t.value;return!(typeof n!="string"&&typeof n!="number"||"unit"in t&&t.unit!==void 0&&typeof t.unit!="string")},Tc=e=>{if(e==null)return!0;const t=typeof e;return t==="string"||t==="number"||t==="boolean"?!0:Sc(e)},Ac=new Set(["_hover","_active","_focus","_focusWithin","_focusVisible","_visited","_checked","_disabled","__before","__after"]),Mc=e=>{if(!e||typeof e!="object")return!1;const t=e;return"value"in t&&(typeof t.value=="string"||typeof t.value=="number")},Ec=e=>!!e&&typeof e=="object"&&!Array.isArray(e)&&!Mc(e);function Oc(e){return new Proxy({},{get(t,n){if(n==="var")return(a,i)=>e(a,i);if(typeof n=="string")return a=>e(n,a)}})}function da(e,t){const n=(i,s)=>{const o=fn(i),r=Wc(s);return r==null?(t.remove(o),e):(t.apply(o,r),e)};return{set:Oc((i,s)=>n(i,s)),setProp:n,setMany(i){for(const[s,o]of Object.entries(i)){if(Ac.has(s)&&Ec(o)){const r=s;t.applyPseudo&&t.applyPseudo(r,o);continue}Tc(o)&&o!=null&&n(s,o)}return e},remove(i){return t.remove(fn(i)),e},clear(){return t.clear(),e}}}function Wc(e){if(e==null)return null;if(typeof e=="string"){const t=e.trim();return t===""?"":t}if(typeof e=="number")return String(e);if(typeof e=="boolean")return e?"true":"false";if(typeof e=="object"){const t=e;if("value"in t){const n=t.value,a=typeof t.unit=="string"?t.unit:"";return`${typeof n=="string"?n.trim():typeof n=="number"?String(n):n==null?"":String(n)}${a}`.trim()}return String(e)}return String(e)}function Nc(e){return{get:()=>{const t=e.getAttr("id");return typeof t=="string"?t:void 0},set:t=>(e.setAttrs("id",t),e),clear:()=>(e.removeAttr("id"),e)}}function Cc(e){const t=()=>{const a=e.getAttr("class");return typeof a=="string"&&a.trim().length>0?a:void 0},n=()=>{const a=t()??"";return new Set(a.split(/\s+/).filter(Boolean))};return{get:()=>t(),has:a=>n().has(a),set:a=>{const i=Array.isArray(a)?a.filter(Boolean).join(" ").trim():(a??"").trim();return i?e.setAttrs("class",i):e.removeAttr("class"),e},add:(...a)=>{const i=n();for(const o of a)o&&i.add(o);const s=[...i].join(" ");return s?e.setAttrs("class",s):e.removeAttr("class"),e},remove:(...a)=>{const i=n();for(const o of a)i.delete(o);const s=[...i].join(" ");return s?e.setAttrs("class",s):e.removeAttr("class"),e},toggle:(a,i)=>{const s=n(),o=s.has(a);(i===void 0?!o:i)?s.add(a):s.delete(a);const l=[...s].join(" ");return l?e.setAttrs("class",l):e.removeAttr("class"),e},clear:()=>(e.removeAttr("class"),e)}}const oi=new Set;let Ha=!1;function tn(){Ha||(Ha=!0,queueMicrotask(()=>{Ha=!1;for(const e of oi)e()}))}function jc(e){if(e==null)return null;if(typeof e=="string")return e.trim();if(typeof e=="number")return String(e);if(typeof e=="boolean")return e?"true":"false";if(typeof e=="object"){const t=e;if("value"in t){const n=t.value,a=typeof t.unit=="string"?t.unit:"";return`${typeof n=="string"?n.trim():typeof n=="number"?String(n):n==null?"":String(n)}${a}`.trim()}}return String(e).trim()}function Lc(e,t){const n=Object.keys(t).map(s=>s.trim()).filter(Boolean).sort();if(n.length===0)return"";const a=[];a.push(`${e} {`);let i=!1;for(const s of n){const o=t[s],r=o==null?"":String(o).trim();if(r.length===0)continue;i=!0;const l=s.startsWith("--")?s:bt(s);a.push(`  ${l}: ${r};`)}return i?(a.push("}"),a.join(`
`)):""}class Gt{static _inst;static invoke(){return this._inst||(this._inst=new Gt),this._inst}static api(t){oi.add(t);const n=()=>Gt.invoke();return{dispose:()=>{oi.delete(t)},rule:(a,i)=>n().rule(a,i),sel:a=>n().sel(a),drop:a=>n().remove(a),clearAll:()=>n().clear(),has:a=>n().has(a),list:()=>n().list(),get:a=>n().get(a),renderAll:()=>n().renderAll()}}rules=new Map;rendered=new Map;rule(t,n){const a=t.trim(),i=n.trim();if(!a)throw new Error("GlobalCss.rule: empty source");if(!i)throw new Error("GlobalCss.rule: empty selector");const s=this.rules.get(a),o=s&&s.selector===i?{...s.decls}:{},r=()=>{const c=Lc(i,o).trim();if(!c){(this.rules.delete(a)||this.rendered.delete(a))&&tn();return}this.rendered.get(a)!==c&&(this.rules.set(a,{selector:i,decls:{...o}}),this.rendered.set(a,c),tn())};return{...da(void 0,{apply:(c,p)=>{const u=jc(p);if(u==null||u.length===0){c in o&&(delete o[c],r());return}o[c]!==u&&(o[c]=u,r())},remove:c=>{c in o&&(delete o[c],r())},clear:()=>{if(Object.keys(o).length>0){for(const p of Object.keys(o))delete o[p];r()}},applyPseudo:(c,p)=>{const u=Po(c),b=`${a}${u}`,h=`${i}${u}`,d=Gt.invoke().rule(b,h);d.setMany(p),(c==="__before"||c==="__after")&&!("content"in p)&&d.setProp("content",'""')}}),ruleKey:a,selector:i,drop:()=>{(this.rules.delete(a)||this.rendered.delete(a))&&tn()}}}static id_for_selector(t){return`sel:${t.trim()}`}sel(t){const n=t.trim();if(!n)throw new Error("GlobalCss.sel: empty selector");return this.rule(Gt.id_for_selector(n),n)}remove(t){const n=t.trim();if(!n)return;(this.rules.delete(n)||this.rendered.delete(n))&&tn()}clear(){this.rules.size===0&&this.rendered.size===0||(this.rules.clear(),this.rendered.clear(),tn())}has(t){const n=t.trim();return n?this.rendered.has(n):!1}list(){return Array.from(this.rendered.keys()).sort()}get(t){const n=t.trim();if(n)return this.rendered.get(n)}renderAll(){return this.list().map(t=>this.rendered.get(t)??"").map(t=>t.trim()).filter(Boolean).join(`

`)}}const vs="hson-_style",xs="css-manager",Ss="_hson",Po=e=>{switch(e){case"_hover":return":hover";case"_active":return":active";case"_focus":return":focus";case"_focusWithin":return":focus-within";case"_focusVisible":return":focus-visible";case"_visited":return":visited";case"_disabled":return":disabled";case"_checked":return":checked";case"__before":return"::before";case"__after":return"::after"}};function Rc(e){return e instanceof gn}function $o(e){if(typeof e=="string")return e.trim();if(typeof e=="number"||typeof e=="boolean"||!e)return"";const t=e.unit==="_"?"":e.unit;return`${e.value}${t}`}function Pn(e){return`[${Fe}="${e}"]`}function Ts(e){return e.startsWith("--")?e:e.includes("-")?e.toLowerCase():bt(e)}class Ge{static instance=null;rulesByQuid=new Map;styleEl=null;atPropManager;keyframeManager;changed=!1;globalCss=new Map;globalsApi;pseudoRulesByQuid=new Map;notify_global_css_changed(){this.markChanged()}scheduled=!1;rafId=null;boundDoc=null;constructor(){this.atPropManager=Ia({onChange:()=>this.markChanged()}),this.keyframeManager=Ga({onChange:()=>this.markChanged()})}markChanged(){this.changed=!0,this.scheduleSync()}scheduleSync(){if(this.scheduled)return;if(this.isNodeRuntime()){this.syncNow();return}const t=globalThis.requestAnimationFrame;if(!t){this.syncNow();return}this.scheduled=!0,this.rafId=t(()=>{this.scheduled=!1,this.rafId=null,this.syncNow()})}ensureBoundDoc(){const t=globalThis.document;t&&this.boundDoc!==t&&(this.boundDoc=t,this.styleEl=null,this.resetManagersAndRules())}resetManagersAndRules(){this.rulesByQuid.clear(),this.changed=!1,this.scheduled=!1,this.atPropManager=Ia({onChange:()=>this.markChanged()}),this.keyframeManager=Ga({onChange:()=>this.markChanged()}),this.styleEl&&this.styleEl.isConnected&&(this.styleEl.textContent="")}ensureStyleElement(){this.ensureBoundDoc();const t=this.boundDoc??globalThis.document;if(!t)return;if(this.boundDoc!==t&&(this.boundDoc=t,this.styleEl=null,this.resetManagersAndRules()),this.styleEl)if(!this.styleEl.isConnected||this.styleEl.ownerDocument!==t)this.styleEl=null;else return this.styleEl;const n=(t.head&&t.head.isConnected?t.head:null)??(t.body&&t.body.isConnected?t.body:null)??t.documentElement;if(!n)throw new Error("CssManager.ensureStyleElement: document has no mount point");let a=t.querySelector(`${vs}#${xs}`);a||(a=t.createElement(vs),a.id=xs,n.appendChild(a));let i=a.querySelector(`style#${Ss}`);return i||(i=t.createElement("style"),i.id=Ss,a.appendChild(i)),this.styleEl=i,i}getPseudoBucket(t,n){let a=this.pseudoRulesByQuid.get(t);a||(a=new Map,this.pseudoRulesByQuid.set(t,a));let i=a.get(n);return i||(i=new Map,a.set(n,i)),i}clearPseudoForQuid(t){this.pseudoRulesByQuid.delete(t)&&this.markChanged()}buildCombinedCss(t){for(const[l,c]of this.rulesByQuid)for(const[p,u]of c)if(typeof u!="string")throw new Error(`CssManager invariant violated: non-string value at ${l}.${p}`);const n=this.atPropManager.renderAll().trim(),a=this.keyframeManager.renderAll().trim(),i=[];for(const[l,c]of this.rulesByQuid.entries()){if(c.size===0)continue;const p=[];for(const[u,b]of c.entries()){const h=Ts(u);p.push(`${h}: ${b};`)}i.push(`${Pn(l)} { ${p.join(" ")} }`)}const s=i.join(`

`).trim(),o=[],r=t?.globalsCss?.trim();r&&o.push(r),n&&o.push(n),a&&o.push(a),s&&o.push(s);for(const[l,c]of this.pseudoRulesByQuid)for(const[p,u]of c){const b=`${Pn(l)}${Po(p)}`,h=this.renderRule(b,Object.fromEntries(u)).trim();h&&o.push(h)}return o.join(`

`)}isNodeRuntime(){return typeof globalThis.process<"u"&&!!globalThis.process?.versions?.node}syncToDom(){const t=this.ensureStyleElement();if(!t)return;const n=this.buildCombinedCss({globalsCss:this.globals_invoke().renderAll()});t.textContent=n,this.changed=!1}makeAnimAdapters(){return{setStyleProp:(t,n,a)=>{for(const i of t.quids)this.setForQuid(i,n,a);return t},forEachDomElement:(t,n)=>{const a=globalThis.document;if(a)for(const i of t.quids){const s=a.querySelector(Pn(i));s&&n(s)}},getFirstDomElement:t=>{const n=globalThis.document;if(n)for(const a of t.quids){const i=n.querySelector(Pn(a));if(i)return i}}}}static invoke(){return Ge.instance||(Ge.instance=new Ge),Ge.instance.ensureBoundDoc(),Ge.instance}getForQuid(t,n){return this.rulesByQuid.get(t)?.get(n)}hasAnyRules(t){return(this.rulesByQuid.get(t)?.size??0)>0}renderCss(){return this.buildCombinedCss()}get atProperty(){return this.atPropManager}get keyframes(){return this.keyframeManager}setForQuid(t,n,a){const i=t.trim();if(!i)return;const s=n.trim();if(!s)return;const o=typeof a=="string"||typeof a=="number"||typeof a=="boolean"?String(a):$o(a);if(o===null){this.unsetForQuid(i,s);return}const r=o.trim();if(r.length===0){this.unsetForQuid(i,s);return}let l=this.rulesByQuid.get(i);l||(l=new Map,this.rulesByQuid.set(i,l)),l.set(s,r),this.markChanged()}animForQuids(t){const n=bc(this.makeAnimAdapters());return gc({quids:t},n)}setManyForQuid(t,n){const a=t.trim();if(!a)throw new Error("CssManager.setManyForQuid: quid must be non-empty");for(const[i,s]of Object.entries(n))this.setForQuid(a,i,s)}unsetForQuid(t,n){const a=this.rulesByQuid.get(t);a&&(a.delete(n),a.size===0&&this.rulesByQuid.delete(t),this.markChanged())}setPseudoForQuid(t,n,a,i){const s=this.getPseudoBucket(t,n);s.get(a)!==i&&(s.set(a,i),this.markChanged())}unsetPseudoForQuid(t,n,a){const i=this.pseudoRulesByQuid.get(t),s=i?.get(n);s&&(s.delete(a)&&this.markChanged(),s.size===0&&i.delete(n),i.size===0&&this.pseudoRulesByQuid.delete(t))}clearPseudoQuid(t,n){const a=this.pseudoRulesByQuid.get(t);a&&(a.delete(n)&&this.markChanged(),a.size===0&&this.pseudoRulesByQuid.delete(t))}clearPseudoAllForQuid(t){this.pseudoRulesByQuid.delete(t)&&this.markChanged()}debug_hardReset(){this.rulesByQuid.clear(),this.changed=!1,this.scheduled=!1,this.rafId!==null&&typeof cancelAnimationFrame=="function"&&cancelAnimationFrame(this.rafId),this.rafId=null,this.atPropManager=Ia({onChange:()=>this.markChanged()}),this.keyframeManager=Ga({onChange:()=>this.markChanged()});const t=this.ensureStyleElement();t&&(t.textContent=""),this.globalCss.clear()}clearQuid(t){this.rulesByQuid.delete(t)&&this.markChanged()}clearAll(){this.rulesByQuid.size!==0&&(this.rulesByQuid.clear(),this.markChanged())}renderRule(t,n){const a=Object.keys(n);if(a.length===0)return"";a.sort();const i=a.map(s=>`${Ts(s)}:${n[s]};`).join("");return`${t}{${i}}`}syncNow(){this.rafId!==null&&typeof cancelAnimationFrame=="function"&&cancelAnimationFrame(this.rafId),this.rafId=null,this.scheduled=!1,this.changed&&this.syncToDom()}globals_invoke(){return this.globalsApi||(this.globalsApi=Gt.api(()=>this.notify_global_css_changed())),this.globalsApi}static globals={invoke(){return Ge.invoke().globals_invoke()}};_copyRulesForQuidMap(t){for(const[n,a]of t){const i=this.rulesByQuid.get(n);i&&this.rulesByQuid.set(a,new Map(i))}this.markChanged()}}const Fo=e=>Object.prototype.toString.call(e)==="[object RegExp]";function Pc(e){const t=me(e);if(t)return t.textContent??"";const n=(e._content??[]).filter(D);for(const a of n)if(a._tag===q&&typeof a._content?.[0]=="string")return a._content[0];return""}function $c(e,t){const n=t.text;if(n==null)return!0;const a=Pc(e);return Fo(n)?n.test(a):typeof n=="string"?a.includes(n):typeof n=="function"?!!n(a):!0}function Fc(e,t){if(!t.attrs)return!0;const n=e._attrs??{};for(const[a,i]of Object.entries(t.attrs)){const s=n[a];if(i instanceof RegExp){if(typeof s!="string"||!i.test(s))return!1}else if(typeof i=="object"&&i!==null){if(typeof s!="object"||s===null)return!1;for(const[o,r]of Object.entries(i))if(s[o]!==r)return!1}else if(i===!0){if(!(a in n))return!1}else if(s!==i)return!1}return!0}function Dc(e,t){if(!t.meta)return!0;const n=e._meta??{},a=t.meta;for(const[i,s]of Object.entries(a)){const o=n[i];if(Fo(s)){if(typeof o!="string"||!s.test(o))return!1}else if(o!==s)return!1}return!0}function Do(e,t,n){const a=[],i=o=>(!t.tag||o._tag.toLowerCase()===t.tag.toLowerCase())&&Fc(o,t)&&Dc(o,t)&&$c(o,t),s=o=>{for(const r of o){if(n.findFirst&&a.length||i(r)&&(a.push(r),n.findFirst))return;const l=(r._content??[]).filter(D);l.length&&s(l)}};return s(e),n.findFirst?a.slice(0,1):a}function Io(e){const t={attrs:{}},n=/^[a-zA-Z0-9]+/,a=/#([a-zA-Z0-9_-]+)/g,i=/\.([a-zA-Z0-9_-]+)/g,s=/\[([a-zA-Z0-9_-]+)(?:="([^"]+)")?\]/g,o=e.match(n);o&&(t.tag=o[0]);let r;for(;(r=a.exec(e))!==null;)t.attrs.id=r[1];for(;(r=i.exec(e))!==null;)t.attrs.class=((t.attrs.class||"")+" "+r[1]).trim();for(;(r=s.exec(e))!==null;){const[,l,c]=r;c!==void 0&&(t.attrs[l]=c)}return t}function Ic(e){const t=me(e);if(!t)return new Set;const n=[t,...Array.from(t.querySelectorAll(`[${Fe}]`))],a=new Set;for(const i of n){const s=i.getAttribute(Fe);s&&a.add(s)}return a}function Gc(e){return me(e)!==void 0}function As(){const e=this.node;if(!Gc(e))return 0;const t=Ge.invoke(),n=Ic(e);for(const i of n)t.clearQuid(i);yi(e),mc(e);const a=this.hostRootNode();return a&&Go(a,e),1}function Go(e,t){const n=e._content;if(!Array.isArray(n))return!1;for(let a=0;a<n.length;a+=1){const i=n[a];if(D(i)){if(i===t)return n.splice(a,1),!0;if(Go(i,t))return!0}}return!1}const Hc=e=>xo.includes(e);function xa(e){const t=e._content.find(a=>D(a)&&Hc(a._tag));if(t)return t;const n=C({_tag:F,_attrs:{},_meta:{},_content:e._content});return e._content=[n],n}function zc(e){return e._attrs||(e._attrs={}),e._attrs}function Ho(e){if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)return e;const t=e.querySelector("input,textarea,select");return t&&(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement)?t:null}function Bc(e){const t=me(e);return t&&(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement)?t:null}function Ms(e,t){const n=e._meta?._quid??"<no-quid>";A(`missing element for node (tag=${e._tag}, quid=${n})`,t,ce(e))}function Uc(e){let t="";const n=a=>{for(const i of a._content??[])if(D(i)){if(i._tag===q||i._tag===V){const s=i._content?.[0];typeof s=="string"&&(t+=s);continue}n(i)}};return n(e),t}function qc(e,t,n){const a=zc(e);a.value=t;const i=Bc(e);if(!i){n?.strict&&Ms(e,"setNodeFormValue"),n?.silent===!1&&Ms(e,"setNodeFormValue");return}const s=Ho(i);s&&(s.value=t)}function Jc(e){const t=me(e);if(t){const i=Ho(t);if(i)return i.value??""}const a=e._attrs?.value;return a==null?"":String(a)}function wi(e){return document.createTextNode(e===null?"":String(e))}function Vc(e){const t=[];for(const n of Array.from(e.childNodes))n.nodeType===Node.TEXT_NODE&&t.push(n);for(const n of t)e.removeChild(n)}function Kc(e){return e==="_str"||e==="_val"}function Xc(e,t){const n=Wt(t),a=xa(e);a._content=a._content.filter(s=>D(s)?!Kc(s._tag):!0),a._content.push(n);const i=me(e);i&&(Vc(i),i.appendChild(wi(t)))}function Qc(e,t){const n=Wt(t);xa(e)._content.push(n);const i=me(e);i&&i.appendChild(wi(t))}function Yc(e,t,n){const a=Wt(n),i=xa(e),s=i._content.length,o=Number.isFinite(t)?Math.max(0,Math.min(s,Math.floor(t))):s;i._content.splice(o,0,a);const r=me(e);if(!r)return;const l=wi(n),c=r.childNodes.item(o)??null;r.insertBefore(l,c)}function Zc(e,t){const n=Wt(t),a=xa(e);a._content=[n];const i=me(e);i&&(i.textContent=t===null?"":String(t))}class ed{liveTree;constructor(t){this.liveTree=t}formatData(t){return`data-${bt(t)}`}set(t,n){const a=this.formatData(t);return n==null?(this.liveTree.setAttrs(a,null),this.liveTree):(this.liveTree.setAttrs(a,String(n)),this.liveTree)}setMany(t){const n={};for(const[a,i]of Object.entries(t)){const s=this.formatData(a);i==null?n[s]=null:n[s]=String(i)}return Object.keys(n).length>0&&this.liveTree.setAttrs(n),this.liveTree}get(t){const n=`data-${t}`;return this.liveTree.getAttr(n)}}function td(){const e=this.node,t=e._content;for(const a of t)D(a)&&yi(a);e._content=[];const n=me(e);if(n)for(;n.firstChild;)n.removeChild(n.firstChild);return this}function $n(e,t){const n=e[0]?t(e[0]):void 0;return n?new Proxy(n,{get(i,s,o){const r=Reflect.get(i,s,o);return typeof r!="function"?r:(...l)=>{let c;for(let p=0;p<e.length;p+=1){const u=t(e[p]),b=u[s];typeof b=="function"&&(c=b.apply(u,l))}return c}}}):new Proxy({},{get(){return()=>{}}})}class _i{items;listen;style;css;data;constructor(t){this.items=[...t],this.listen=$n(this.items,n=>n.listen),this.style=$n(this.items,n=>n.style),this.css=$n(this.items,n=>n.css),this.data=$n(this.items,n=>n.data)}toArray(){return[...this.items]}count(){return this.items.length}first(){return this.items[0]}forEach(t){for(let n=0;n<this.items.length;n+=1)t(this.items[n],n)}map(t){const n=[];for(let a=0;a<this.items.length;a+=1)n.push(t(this.items[a],a));return n}filter(t){const n=[];for(let a=0;a<this.items.length;a+=1)t(this.items[a],a)&&n.push(this.items[a]);return new _i(n)}removeSelf(){let t=0;for(let n=0;n<this.items.length;n+=1){const a=this.items[n];if(typeof a.removeSelf=="function"){a.removeSelf(),t+=1;continue}typeof a.remove=="function"&&(a.remove(),t+=1)}return t}remove(){return this.removeSelf()}}function zo(e){return new _i(e)}function nd(e){return Array.isArray(e)}function ad(e){return nd(e)?e:[e]}function id(e){return typeof e=="string"?Io(e):e}function sd(e){const t=(a=>{const i=typeof a=="string"?Io(a):a,s=Do([e.node],i,{findFirst:!0});if(s.length)return qo(e,s[0])}),n=((a,i)=>{const s=t(a);if(!s){const o=i??(typeof a=="string"?a:JSON.stringify(a));throw new Error(`[LiveTree.find.must] expected match for ${o}`)}return s});return t.byId=a=>t({attrs:{id:a}}),t.byAttrs=(a,i)=>t({attrs:{[a]:i}}),t.byFlags=a=>t({attrs:{[a]:a}}),t.byTag=a=>t({tag:a}),n.byId=a=>n({attrs:{id:a}}),n.byAttrs=(a,i)=>n({attrs:{[a]:i}}),n.byFlags=a=>n({attrs:{[a]:a}}),n.byTag=a=>n({tag:a}),t.must=n,t}function od(e){const t=(a=>{const i=ad(a),s=[];for(const o of i){const r=id(o),l=Do([e.node],r,{findFirst:!1});for(const c of l)s.push(qo(e,c))}return zo(s)}),n=((a,i)=>{const s=t(a);if(s.count()===0){const o=i??"query";throw new Error(`[LiveTree.findAll.must] expected >=1 match for ${o}`)}return s});return t.id=a=>{const i=Array.isArray(a)?a:[a];return t(i.map(s=>({attrs:{id:s}})))},t.byAttribute=(a,i)=>t({attrs:{[a]:i}}),t.byFlag=a=>t({attrs:{[a]:a}}),t.byTag=a=>t({tag:a}),n.id=a=>{const i=Array.isArray(a)?a:[a];return n(i.map(s=>({attrs:{id:s}})))},n.byAttribute=(a,i)=>n({attrs:{[a]:i}}),n.byFlag=a=>n({attrs:{[a]:a}}),n.byTag=a=>n({tag:a}),t.must=n,t}function hn(e,t,n){e._attrs||(e._attrs={});const a=e._attrs,i=t.toLowerCase(),s=me(e);if(n===void 0&&(n=null),n===null||n===!1){i==="style"?(delete a.style,s&&s.removeAttribute("style")):(delete a[i],s&&s.removeAttribute(i));return}if(n===!0){i==="style"?(delete a.style,s&&s.removeAttribute("style")):(a[i]=i,s&&s.setAttribute(i,i));return}const o=String(n);if(i==="style"){const r=mn(o);a.style=r;const l=wn(r);s&&(l?s.setAttribute("style",l):s.removeAttribute("style"))}else a[i]=o,s&&s.setAttribute(i,o)}function rd(e,t){const n=e._attrs;if(!n)return;const a=t.toLowerCase(),i=n[a];if(i!=null)return a==="style"&&typeof i=="object"?wn(i):i}function ld(e,t,n){const a=e.node;if(typeof t=="string")return hn(a,t,n??null),e;for(const[i,s]of Object.entries(t))hn(a,i,s??null);return e}function cd(e,t){const n=e.node;return hn(n,t,null),e}function dd(e,...t){const n=e.node;for(const a of t)hn(n,a,!0);return e}function ud(e,...t){const n=e.node;for(const a of t)hn(n,a,null);return e}function pd(e,t){return rd(e.node,t)}function Bo(e){return{property:a=>{const i=fn(a);return e.read(i)},var:a=>{const i=a.startsWith("--")?a:`--${a}`;return e.read(i)}}}const md=Object.freeze(["color","backgroundColor","borderColor","fontSize","fontWeight","lineHeight","opacity","display","position","top","left","right","bottom","width","height","margin","marginTop","marginRight","marginBottom","marginLeft","padding","paddingTop","paddingRight","paddingBottom","paddingLeft","transform"]),fd=e=>{const t=new Map;if(!e)return t;for(const n of e.split(";")){const a=n.trim();if(!a)continue;const i=a.indexOf(":");if(i<0)continue;const s=a.slice(0,i).trim(),o=a.slice(i+1).trim();s&&t.set(s,o)}return t};function hd(e,t){const n=t.startsWith("--")?t:Nt(t),a=e._attrs,i=a?.style??void 0;i&&(delete i[n],Object.keys(i).length?a&&(a.style=i):a&&delete a.style);const s=me(e);s&&s.style.removeProperty(t)}function gd(){if(typeof document>"u"||!document.documentElement)return md;const e=document.documentElement.style,a=Object.keys(e).filter(i=>i!=="cssText"&&!i.includes("-")).filter(i=>!0);return Object.freeze(Array.from(new Set(a)))}function bd(e){const t=e.style;if(typeof t=="string"){const a=Object.create(null),i=t.trim();if(i)for(const s of i.split(";")){const o=s.trim();if(!o)continue;const r=o.indexOf(":");if(r<=0)continue;const l=o.slice(0,r).trim(),c=o.slice(r+1).trim();if(l){const p=l.startsWith("--")?l:Nt(l);a[p]=c}}return e.style=a,a}if(t&&typeof t=="object"){const a=t;if(!Object.keys(a).some(o=>o.includes("-")))return a;const s=Object.create(null);for(const[o,r]of Object.entries(a)){const l=o.startsWith("--")?o:Nt(o);s[l]=r}return e.style=s,s}const n=Object.create(null);return e.style=n,n}function yd(e,t,n){const a=me(e);a instanceof Element&&(n===""?a.style.removeProperty(t):a.style.setProperty(t,n));const i=e._attrs??={},s=bd(i),o=t.startsWith("--")?t:Nt(t);n===""?Object.prototype.hasOwnProperty.call(s,o)&&delete s[o]:s[o]=n}class wd{tree;runtimeKeys;setter;getter;constructor(t){this.tree=t,this.runtimeKeys=gd(),this.setter=da(t,{keys:this.runtimeKeys,apply:(n,a)=>{this.apply(n,a)},remove:n=>{this.remove(n)},clear:()=>{this.clearAll()}}),this.getter=Bo({read:n=>{const a=this.tree.getAttr("style"),s=fd(typeof a=="string"?a:void 0),o=n.startsWith("--")?n:bt(n);return s.get(o)}})}apply(t,n){const a=t.startsWith("--")?t:bt(t),i=n==null?"":String(n);return yd(this.tree.node,a,i),this.tree}remove(t){const n=t.startsWith("--")?t:bt(t);return hd(this.tree.node,n),this.tree}clearAll(){const t=this.tree.node;if(!t._attrs)return;const n=t._attrs;delete n.style;const a=me(t);a&&a.removeAttribute("style")}}const _d=new Set(["style"]),kd=new Set(["href","src","srcset","sizes"]);function za(e,t,n){const a=t.toLowerCase();if(!(a.startsWith("on")||_d.has(a))){if(kd.has(a)){const i=a==="srcset"?n.split(",").map(s=>s.trim().split(/\s+/)[0]??""):[n.trim()];for(const s of i)if(s&&!Qn.test(s))return;if(a==="href"&&e.target==="_blank"){const s=e,o=(s.rel||"").split(/\s+/);o.includes("noopener")||o.push("noopener"),o.includes("noreferrer")||o.push("noreferrer"),s.rel=o.join(" ").trim()}}e.setAttribute(t,n)}}const vd="http://www.w3.org/2000/svg",ri=e=>/^<\s*svg[\s>]/i.test(e);function ki(e){const t=e.tagName,n={};for(let i=0;i<e.attributes.length;i++){const s=e.attributes[i];n[s.name]=s.value}const a=[];return e.childNodes.forEach(i=>{i.nodeType===Node.ELEMENT_NODE?a.push(ki(i)):i.nodeType===Node.TEXT_NODE&&i.nodeValue&&a.push({_tag:q,_content:[i.nodeValue],_attrs:{},_meta:{}})}),{_tag:t,_attrs:n,_content:a.length?a:[],_meta:{}}}function gt(e,t="html"){if(!D(e))return document.createTextNode(String(e??""));const n=e;if(n._tag===q||n._tag===V){const p=n._content?.[0];return document.createTextNode(String(p??""))}if(n._tag===K||n._tag===j||n._tag===F||n._tag===z){const p=document.createDocumentFragment();if(n._tag===z){for(const u of n._content??[]){const b=D(u)&&Array.isArray(u._content)?u._content[0]:null;b!=null&&p.appendChild(gt(b,t))}return p}for(const u of n._content??[])p.appendChild(gt(u,t));return p}const a=n._tag,i=p=>new Error(`[create_live_tree2] illegal DOM tag "${p}" (node._tag=${n._tag})`);if(a.startsWith("_"))throw i(a);const s=a==="svg"?"svg":t,o=s==="svg"?document.createElementNS(vd,a):document.createElement(a);if(o.tagName.startsWith("_"))throw i(o.tagName);dc(n,o);const r=_n(n);s==="svg"?o.setAttribute(Fe,r):za(o,Fe,r);const l=n._attrs;if(l)for(const[p,u]of Object.entries(l)){if(u==null)continue;if(p==="style"){const h=o;if(typeof u=="string")h.style.cssText=u;else if(u&&typeof u=="object"){const d=u;for(const[m,v]of Object.entries(d)){const w=v==null?"":String(v),k=Ro(fn(m));k&&(w===""?h.style.removeProperty(k):h.style.setProperty(k,w))}}continue}if(u===!0){s==="svg"?o.setAttribute(p,""):za(o,p,"");continue}if(u===!1)continue;const b=String(u);s==="svg"?o.setAttribute(p,b):za(o,p,b)}const c=n._content??[];if(c.length===1&&D(c[0])&&(c[0]._tag===j||c[0]._tag===F||c[0]._tag===z)){const p=c[0];if(p._tag===z)for(const u of p._content??[]){const b=D(u)&&Array.isArray(u._content)?u._content[0]:null;b!=null&&o.appendChild(gt(b,s))}else for(const u of p._content??[])o.appendChild(gt(u,s))}else for(const p of c)o.appendChild(gt(p,s));return o}function Es(e,t){if(t<=0)return 0;if(e>=0)return e>t?t:e;const n=t+e;return n<0?0:n}function xd(e,t,n){e._content||(e._content=[]);let a;const i=e._content[0];i&&typeof i=="object"&&i._tag===F?a=i:(a=C({_tag:F,_content:[]}),e._content=[a,...e._content]),a._content||(a._content=[]);const s=a._content;if(typeof n=="number"){const l=Es(n,s.length);s.splice(l,0,...t)}else s.push(...t);const o=me(e);if(!o)return;const r=Array.from(o.childNodes);if(typeof n=="number"){let l=Es(n,r.length);for(const c of t){const p=gt(c),u=r[l]??null;o.insertBefore(p,u),l+=1}}else for(const l of t){const c=gt(l);o.appendChild(c)}}function Sd(e,t){const n=this.node,a=e.node,i=va(a);return e.adoptRoots(this.hostRootNode()),xd(n,i,t),this}const Td=["html","head","title","base","link","meta","style","body","header","nav","main","section","article","aside","footer","address","h1","h2","h3","h4","h5","h6","p","hr","pre","blockquote","ol","ul","li","dl","dt","dd","figure","figcaption","div","a","em","strong","small","s","cite","q","dfn","abbr","data","time","code","var","samp","kbd","sub","sup","i","b","u","mark","ruby","rt","rp","bdi","bdo","span","br","wbr","ins","del","img","iframe","embed","object","param","video","audio","source","track","picture","table","caption","colgroup","col","tbody","thead","tfoot","tr","td","th","form","label","input","button","select","datalist","optgroup","option","textarea","output","progress","meter","fieldset","legend","details","summary","dialog","script","noscript","template","canvas","menu","menuitem","center","font"];function Ad(e){if(typeof e!="string")return!1;const t=e.trim();return!(t.length===0||/^xml/i.test(t)||!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(t)||t.includes(":"))}function Md(e,t){if(Ad(e))return;const n=` (${t})`;throw new Error(`[LiveTree.create] invalid tag name${n}: ${String(e)}`)}function Ed(e){let t;const n=()=>{const s=t;return t=void 0,s};function a(s,o){const r=Array.isArray(s)?s:[s],l=[];let c=o;for(const p of r){Md(p,"createForTags");const u=`<${p}></${p}>`,b=be.fromTrustedHtml(u).toHson().parse(),h=Array.isArray(b)?b[0]:b,d=Ye(h);typeof c=="number"?e.append(d,c):e.append(d);const m=va(h);for(const v of m){const w=Ye(v);w.adoptRoots(e.hostRootNode()),l.push(w)}typeof c=="number"&&(c+=m.length)}if(!Array.isArray(s)){if(!l.length)throw new Error("[LiveTree.create] no children created");return l[0]}return zo(l)}const i={tags(s,o){return a(s,o)},prepend(){return t=0,i},at(s){return t=s,i}};for(const s of Td)i[s]=o=>{const r=typeof o=="number"?o:n();return a(s,r)};return i}function Os(e,t){const n=t.getAttribute("data-_quid")??void 0;if(n)return e.find.byId?.(n)??e.find({attrs:{"data-_quid":n}})??void 0}function Od(e){const t=()=>e.asDomElement(),n=r=>{const l=t();return l?l.matches(r):!1},a=r=>{const l=t(),c=r.dom?.el?.();return l&&c?l.contains(c):!1},i=(r=>{const l=t();if(!l)return;const c=l.closest(r);if(c)return Os(e,c)});i.must=(r,l)=>{const c=i(r);if(!c)throw new Error(l??`[LiveTree.dom.closest.must] no match for ${r}`);return c};const s=()=>{const r=t();return r instanceof HTMLElement?r:void 0};s.must=()=>{const r=t();if(!(r instanceof HTMLElement))throw new Error("[LiveTree.dom.html.must]Element is not HTML element }");return r};const o=(()=>{const r=t();if(r?.parentElement)return Os(e,r.parentElement)});return o.must=r=>{const l=o();if(!l)throw new Error(r??"[LiveTree.dom.parent.must] no parent");return l},{el:t,html:s,matches:n,contains:a,closest:i,parent:o}}function Wd(){const e=new Map,t=(i,s)=>{let o=e.get(i);return o||(o=new Set,e.set(i,o)),o.add(s),()=>{o.delete(s),o.size===0&&e.delete(i)}};return{on:t,once:(i,s)=>{const o=t(i,r=>{o(),s(r)});return o},emit:(i,s)=>{const o=e.get(i);if(o)for(const r of[...o])r(s)}}}function Uo(e,t,n){const a={...e};e._attrs&&(a._attrs={...e._attrs}),e._meta&&(a._meta={...e._meta}),e._content&&(a._content=e._content.map(o=>typeof o=="object"&&o!==null?Uo(o,t,n):o));const i=bi(e),s=_n(a,{persist:n.persistQuidMeta??!0});return(n.persistQuidMeta??!0)===!1&&a._meta&&Fe in a._meta&&delete a._meta[Fe],i&&t.set(i,s),a}function Nd(e,t){const n=new Map;return{root:Uo(e,n,{persistQuidMeta:!0}),quidMap:n}}function Cd(){const e=this.node,t=Nd(e).root;return be.fromNode(t).liveTree.asBranch()}class jd{owner;constructor(t){this.owner=t}pure_nodes(){return this.owner.node._content??[]}count(){return this.pure_nodes().length}at_node(t){const n=this.pure_nodes();if(!(t<0||t>=n.length))return n[t]}at(t){const n=this.at_node(t);if(!D(n))return;const a=Ye(n);return a.adoptRoots(this.owner.hostRootNode()),a}first(){const t=this.pure_nodes();for(const n of t){if(!D(n))continue;const a=Ye(n);return a.adoptRoots(this.owner.hostRootNode()),a}}all(){const t=[];for(const n of this.pure_nodes()){if(!D(n))continue;const a=Ye(n);a.adoptRoots(this.owner.hostRootNode()),t.push(a)}return t}mustOnly(t){const n=t?.warn??!0;let a,i=0;for(const o of this.pure_nodes())D(o)&&(i+=1,i===1&&(a=o));if(i!==1)throw n&&console.warn(`ContentManager.mustOnly(): expected 1 node-content, got ${i}.
 
          (on: ${this.owner.node._tag})`),new Error(`ContentManager.mustOnly(): expected 1 node-content, got ${i}.
 
          (on: ${this.owner.node._tag})`);const s=Ye(a);return s.adoptRoots(this.owner.hostRootNode()),s}}const Ws=(e,t)=>({apply:(n,a)=>{for(const i of t)e.setForQuid(i,n,a)},remove:n=>{for(const a of t)e.unsetForQuid(a,n)},clear:()=>{for(const n of t)e.clearQuid(n),e.clearPseudoAllForQuid?.(n)},applyPseudo:(n,a)=>{for(const i of t){for(const[s,o]of Object.entries(a)){if(o==null)continue;const r=fn(s),l=$o(o);l==null?e.unsetPseudoForQuid(i,n,r):e.setPseudoForQuid(i,n,r,l)}(n==="__before"||n==="__after")&&!("content"in a)&&e.setPseudoForQuid(i,n,"content",'""')}}});function Ld(e,t){const n=Ge.invoke(),a=r=>{const l=c=>{let p;for(const u of r){const b=n.getForQuid(u,c);if(b===void 0)return;if(p===void 0){p=b;continue}if(b!==p)return}return p};return Bo({read:c=>l(c)})};if(Rc(e)){const r=e,l=(t??[]).map(u=>u.trim()).filter(Boolean),c=da(r,Ws(n,l)),p=a(l);return{...c,get:p,atProperty:n.atProperty,keyframes:n.keyframes,anim:n.animForQuids(l)}}const i=e.map(r=>r.trim()).filter(Boolean),s=da(void 0,Ws(n,i)),o=a(i);return{...s,get:o,atProperty:n.atProperty,keyframes:n.keyframes,anim:n.animForQuids(i)}}function Ns(e){return{q:_n(e),resolveNode(){return e},resolveElement(){return me(e)??void 0}}}class gn{nodeRef;hostRoot;styleApiInternal=void 0;datasetManagerInternal=void 0;contentManager=void 0;cssApiInternal=void 0;eventsInternal;idApi;classApi;setRef(t){if(this.invalidate_dom_api(),t instanceof gn){this.nodeRef=Ns(t.node);return}this.nodeRef=Ns(t)}setRoot(t){if(this.invalidate_dom_api(),t instanceof gn){if(this.hostRoot=t.hostRoot,!this.hostRoot)throw new Error("could not set host root");return}if(this.hostRoot=t,!this.hostRoot)throw new Error("could not set host root")}constructor(t){this.setRoot(t),this.setRef(t)}domApiInternal=void 0;get dom(){return this.domApiInternal||(this.domApiInternal=Od(this)),this.domApiInternal}invalidate_dom_api(){this.domApiInternal=void 0,this.cssApiInternal=void 0}append=Sd;empty=td;removeChildren(){const n=this.nodeRef.resolveNode()._content;if(!Array.isArray(n)||n.length===0)return 0;const a=n.filter(D);if(a.length===0)return 0;let i=0;for(const s of a){const o=Ye(s);o.setRoot(this),i+=As.call(o)}return i}removeSelf(){return As.call(this)}find=sd(this);findAll=od(this);get create(){return Ed(this)}get quid(){return this.nodeRef.q}hostRootNode(){return this.hostRoot}get content(){return this.contentManager??=new jd(this)}adoptRoots(t){return this.hostRoot=t,this}get node(){const t=this.nodeRef.resolveNode();if(!t)throw new Error("LiveTree2.node: ref did not resolve");return t}get style(){if(!this.styleApiInternal){const t=new wd(this);this.styleApiInternal={...t.setter,get:t.getter}}return this.styleApiInternal}get events(){return this.eventsInternal||(this.eventsInternal=Wd()),this.eventsInternal}get data(){return this.datasetManagerInternal||(this.datasetManagerInternal=new ed(this)),this.datasetManagerInternal}get css(){return this.cssApiInternal||(this.cssApiInternal=Ld(this,[this.quid])),this.cssApiInternal}get listen(){return hc(this)}getAttr(t){return pd(this,t)}removeAttr(t){return cd(this,t)}setFlags(...t){return dd(this,...t)}removeFlags(...t){return ud(this,...t)}setAttrs(t,n){return ld(this,t,n)}text={set:t=>(Xc(this.node,t),this),add:t=>(Qc(this.node,t),this),overwrite:t=>(Zc(this.node,t),this),insert:(t,n)=>(Yc(this.node,t,n),this),get:()=>Uc(this.node)};setFormValue(t,n){return qc(this.node,t,n),this}getFormValue(){return Jc(this.node)}get id(){return this.idApi||(this.idApi=Nc(this)),this.idApi}get classlist(){return this.classApi||(this.classApi=Cc(this)),this.classApi}cloneBranch(){return Cd.call(this)}asDomElement(){const t=this.nodeRef;if(t)return t.resolveElement()}}function Ye(e){return _n(e),new gn(e)}function qo(e,t){return _n(t),Ye(t).adoptRoots(e.hostRootNode())}function na(e){const t=va(e);t.length===0&&(console.warn("createBranchFromNode: nothing to unwrap; falling back to rootNode"),t.push(e)),t.length!==1&&A(`createBranchFromNode: expected exactly 1 root for LiveTree.asBranch(), got ${t.length}`,"createBranchFromNode");const n=t[0];return Ye(n)}function Fn(e){function t(a){return{...cc(a),...ta(a)}}function n(a){return{toHson(){const i=ic(a.node),s={frame:{...a,hson:i},output:rt.HSON};return t(s)},toJson(){const i=lc(a.node),s={frame:{...a,json:i},output:rt.JSON};return t(s)},toHtml(){const i=us(a.node),s={frame:{...a,html:i},output:rt.HTML};return t(s)},get liveTree(){return{asBranch(){const i=a.node;if(!i)throw new Error("liveTree().asBranch(): frame is missing HSON node data");return na(i)}}},sanitizeBEWARE(){const i=a.node;if(!i)throw new Error("sanitizeBEWARE(): frame is missing HSON node data");const s=us(i),o=hi(s),r={input:s,node:o,meta:{...a.meta,origin:"html-sanitized-from-node",sanitized:!0,unsafePipeline:!1}};return n(r)}}}return n(e)}function nn(e={unsafe:!1}){return{fromHtml(t,n={sanitize:!0}){const a=typeof t=="string"?t:t.innerHTML,i=a.trimStart();let s,o=!1;if(ri(i)){e.unsafe||A("fromHtml(): external SVG is only allowed on the UNSAFE pipeline or via internal VSN→SVG nodes.","fromHtml",a.slice(0,200));const c=new DOMParser().parseFromString(a,"image/svg+xml").documentElement;s=ki(c),o=!1}else{const c=!e.unsafe&&n.sanitize!==!1;s=c?hi(a):ka(a),o=c}const r={origin:ri(i)?"svg-html":"html",unsafePipeline:e.unsafe,sanitized:o,rawInput:a};return Fn({input:a,node:s,meta:r})},fromJson(t){const n=typeof t=="string"?t:JSON.stringify(t),a=Wo(n),i={input:n,node:a,meta:{origin:"json",unsafePipeline:e.unsafe,sanitized:!1}};return Fn(i)},fromHson(t){const n=Oo(t),a={input:t,node:n,meta:{origin:"hson-text",unsafePipeline:e.unsafe,sanitized:!1}};return Fn(a)},fromNode(t){const n={input:JSON.stringify(t),node:t,meta:{origin:"node",unsafePipeline:e.unsafe,sanitized:!1}};return Fn(n)},queryDOM(t){const n=document.querySelector(t);n||A(`queryDOM(): no element for selector "${t}"`,"queryDOM",t);const a=n.innerHTML;return this.fromHtml(a)},queryBody(){const t=document.body;t||A("queryBody(): document.body is not available","queryBody");const n=t.innerHTML;return this.fromHtml(n)}}}function Cs(e,t={unsafe:!1}){const n=e;n||A("error getting target element","graft",e);const a=n.innerHTML,i=ka(a),s=va(i);s.length!==1&&A(`[ERR: graft()]: expected 1 node, but received ${s.length}. Wrap multiple elements in a single container.`,"graft");const o=s[0],r=document.createDocumentFragment();return r.appendChild(gt(o)),n.replaceChildren(r),Ye(o)}function js(e={unsafe:!1}){return{fromHtml(t){let n;const a=t.trimStart();if(ri(a)){e.unsafe||A("liveTree.fromHtml(): SVG markup is only allowed on UNSAFE pipeline or via internal node_from_svg.","liveTree.fromHtml",t.slice(0,200));const s=new DOMParser().parseFromString(t,"image/svg+xml").documentElement;n=ki(s)}else n=e.unsafe?ka(t):hi(t);const i=na(n);return{asBranch:()=>i}},fromJson(t){const n=Wo(t),a=na(n);return{asBranch:()=>a}},fromHson(t){const n=Oo(t),a=na(n);return{asBranch:()=>a}},queryDom(t){const n=document.querySelector(t);return{graft:()=>{if(!n)throw new Error(`hson.liveTree.queryDom: selector "${t}" not found.`);return Cs(n,e)}}},queryBody(){const t=document.body;return{graft:()=>Cs(t,e)}}}}globalThis._test_ON=()=>{globalThis.test=!0,location.reload()};globalThis._test_OFF=()=>{globalThis.test=!1,location.reload()};const be={fromUntrustedHtml(e){return nn({unsafe:!1}).fromHtml(e,{sanitize:!0})},fromTrustedHtml(e){return nn({unsafe:!0}).fromHtml(e,{sanitize:!1})},fromJson(e){return nn({unsafe:!0}).fromJson(e)},fromHson(e){return nn({unsafe:!0}).fromHson(e)},fromNode(e){return nn({unsafe:!0}).fromNode(e)},queryDOM(e){return document.querySelector(e),{liveTree(){return{graft(){return js({unsafe:!1}).queryDom(e).graft()}}}}},queryBody(){return{liveTree(){return{graft(){return js({unsafe:!1}).queryBody().graft()}}}}}};function Rd(){return be.queryBody().liveTree().graft()}const Pd={amplitude:6,step:6,baselineOffset:2,strokeWidth:1.5,stroke:"#e51400",pad:1.75};function $d(e){const t=e.x0??0,n=Math.max(t+1,e.x1),a=e.baselineY,i=Math.max(.5,e.amplitude),s=Math.max(2,e.step);let o=`M ${t} ${a}`,r=!0,l=t;for(;l<n;){l=Math.min(l+s,n);const c=r?a-i:a;o+=` L ${l} ${c}`,r=!r}return r||(o+=` L ${n} ${a}`),o}function Fd(e){const t=Math.max(1,Math.ceil(e.width)),n=Math.max(3,Math.ceil(e.amplitude+e.baselineOffset+2)),a=n-1,i=Math.max(0,Math.min(e.pad??1.25,(n-1)/2)),s=$d({x1:t,baselineY:a,amplitude:e.amplitude,step:e.step}),o=`errClip${Math.floor(Math.random()*1e9)}`,r=i,l=Math.max(1,n-i*2);return`
<svg xmlns="http://www.w3.org/2000/svg"
     width="${t}" height="${n}"
     viewBox="0 0 ${t} ${n}"
     overflow="hidden"
     aria-hidden="true" focusable="false">
  <defs>
    <clipPath id="${o}" clipPathUnits="userSpaceOnUse">
      <rect x="0" y="${r+2}" width="${t}" height="${l-2}" />
    </clipPath>
  </defs>

  <path d="${s}"
        clip-path="url(#${o})"
        fill="none"
        stroke="${e.stroke}"
        stroke-width="${e.strokeWidth}"
        vector-effect="non-scaling-stroke"
        stroke-linejoin="miter"
        stroke-linecap="butt" />
</svg>`.trim()}function Dd(e,t=Pd){const n=e.asDomElement(),a=Math.ceil(n.getBoundingClientRect().width),i=Fd({width:a,...t}),s=be.fromTrustedHtml(i).liveTree.asBranch(),o=e.create.span().id.set("error-underline").classlist.set("error-underline");o.css.setMany({position:"absolute",left:"0",bottom:"11px",pointerEvents:"none",width:`${Math.ceil(a)}px`,height:`${t.amplitude+t.baselineOffset+2}px`,overflow:"hidden",display:"grid",placeItems:"center"}),o.append(s)}function Id(e){return e>>>0}function kn(e){let t=Id(e);return()=>{t|=0,t=t+1831565813|0;let n=Math.imul(t^t>>>15,1|t);return n^=n+Math.imul(n^n>>>7,61|n),((n^n>>>14)>>>0)/4294967296}}const Gd=["̀","́","̂","̃","̄","̅","̆","̇","̈","̊","̋","̌","̍","̎","̐","̑","̒","̓","̔","̽","̾","̿"],Hd=["̖","̗","̘","̙","̚","̜","̝","̞","̟","̠","̣","̤","̥","̦","̧","̨","̩","̪","̫","̬","̭","̮","̯","̰","̱","̲","̳","̹","̺","̻","̼"],zd=["̴","̵","̶","̷","̸"];function Bd(e,t){return e[Math.floor(t()*e.length)]}function Ba(e,t,n){let a="";for(let i=0;i<e;i+=1)a+=Bd(t,n);return a}function Dn(e,t){const n=t.seed===void 0?Math.random:kn(t.seed),a=t.skipChars??/[\s]/;let i="";for(const s of e){if(a.test(s)){i+=s;continue}i+=s,i+=Ba(t.mid,zd,n),i+=Ba(t.above,Gd,n),i+=Ba(t.below,Hd,n)}return i}const lt=(e,t)=>e.create.div().classlist.set(t),oe=(e,t)=>e.create.div().id.set(t),Tt=(e,t,n)=>e.create.div().id.set(t).text.set(n),an=(e,t)=>e.create.span().classlist.set(t),Ud=(e,t)=>e.create.span().id.set(t);function bn(){return new DOMException("aborted","AbortError")}function Jo(e){if(e?.aborted)throw bn()}function Vo(e,t){const n=t?.timeoutMs,a=t?.signal;return!n&&!a?e:new Promise((i,s)=>{let o=!1,r;const l=p=>{o||(o=!0,r!==void 0&&window.clearTimeout(r),i(p))},c=p=>{o||(o=!0,r!==void 0&&window.clearTimeout(r),s(p))};if(n!==void 0&&n>0&&(r=window.setTimeout(()=>{c(new Error(`wait timeout (${n}ms)`))},n)),a){if(a.aborted){c(bn());return}const p=()=>c(bn());a.addEventListener("abort",p,{once:!0})}e.then(l).catch(c)})}function qd(e,t){return new Promise((n,a)=>{const i=setTimeout(n,e);t?.addEventListener("abort",()=>{clearTimeout(i),a(new DOMException("Aborted","AbortError"))})})}function Ls(e,t,n,a){const i=a?.signal,s=new Promise((o,r)=>{try{Jo(i)}catch(c){r(c);return}const l=t==="start"?e.listen.onAnimationStart(c=>{c.animationName===n&&(l.off(),o(c))}):e.listen.onAnimationEnd(c=>{c.animationName===n&&(l.off(),o(c))});if(i){const c=()=>{l.off(),r(bn())};i.addEventListener("abort",c,{once:!0})}});return Vo(s,a)}function Jd(e,t){const n=t?.signal,a=new Promise((i,s)=>{try{Jo(n)}catch(r){s(r);return}const o=e.listen.onPointerDown(r=>{t?.leftOnly&&"button"in r&&r.button!==0||(o.off(),i(r))});if(n){const r=()=>{o.off(),s(bn())};n.addEventListener("abort",r,{once:!0})}});return Vo(a,t)}function Vd(e,t){const n=t?.signal;return new Promise((a,i)=>{if(n?.aborted){i(new DOMException("aborted","AbortError"));return}const s=window.setTimeout(()=>{n&&n.removeEventListener("abort",o),a()},Math.max(0,e));function o(){window.clearTimeout(s),i(new DOMException("aborted","AbortError"))}n&&n.addEventListener("abort",o,{once:!0})})}const Kd=e=>({anim(t){let n;return typeof t=="string"?n=t:n=t.name,{begin:a=>Ls(e,"start",n,a),end:a=>Ls(e,"end",n,a)}},pointerDown:t=>Jd(e,t),sleep:(t,n)=>Vd(t,n)}),Xd=e=>Promise.race(e),It={timer:qd,for:Kd,race:Xd},Sa=4e3,Rs=["h","s","o","n"],Qd={h:"h",s:"s",o:"o",n:"n"},Yd={name:"logo-fade",steps:{"0%":{opacity:"0"},"02%":{opacity:"0"},"78%":{opacity:"1"},"85%":{opacity:"1"},"98%":{opacity:"0"},"100%":{opacity:"0"}}},Zd={name:"zalgo-fade",steps:{"0%":{opacity:"0",transform:"translateX(1px) rotate(0deg) scale(1)"},"32%":{opacity:"0",transform:"translateX(1px) rotate(0deg) scale(1)"},"80%":{opacity:"0.4",transform:"translateX(3px) rotate(2deg) scale(1.05)"},"98%":{opacity:"0",transform:"translateX(5px) rotate(4deg) scale(1.1)"},"100%":{opacity:"0",transform:"translateX(5px) rotate(4deg) scale(1.1)"}}},eu={name:"zalgo-fade2",steps:{"0%":{opacity:"0",transform:"translateX(1px) rotate(0deg) scale(1.1)"},"32%":{opacity:"0",transform:"translateX(1px) rotate(0deg) scale(1.1)"},"90%":{opacity:"0.3",transform:"translateX(0px) rotate(-2deg)  scale(1.05)"},"98%":{opacity:"0",transform:"translateX(-1px) rotate(-4deg) scale(1.1)"},"100%":{opacity:"0",transform:"translateX(-1px) rotate(-4deg) scale(1.12)"}}},Ua={logobox:Yd,zalgoFade:Zd,zalgoFade_2:eu},tu={name:"logo-fade",duration:`${Sa}ms`,timingFunction:"linear"},nu={name:"zalgo-fade",duration:`${Sa}ms`,timingFunction:"linear"},au={name:"zalgo-fade2",duration:`${Sa}ms`,timingFunction:"linear"},In={zalgo1:nu,zalgo2:au,logobox:tu},iu="rgba(24, 201, 137, 1)",su="rgba(88, 215, 151, 1)",ou="rgba(96, 193, 141, 1)",ru="rgba(80, 163, 119, 1)",Ko="rgb(0, 255, 120)",lu="rgba(68, 149, 255, 1)",cu="rgba(125, 169, 228, 1)",Xo="rgba(46, 167, 255, 1)",Qo="rgb(0, 220, 255)",du="rgba(233, 123, 209, 1)",uu="rgb(255, 100, 170)",pu="rgba(126, 40, 143, 1)",mu="rgba(255,210,80,1)",fu="rgb(255, 210, 0)",Yo="rgba(231, 223, 116, 1)",hu="rgba(189, 171, 92, 1)",gu="rgba(230, 230, 230, 1)",bu="rgba(58, 58, 58, 1)",yu="#07070a",Zo=12,er=19,tr=26,wu=1,_u=`rgba(${Zo}, ${er}, ${tr}, ${wu})`,st={r:Zo,g:er,b:tr},ku=gu,vu={h:Qo,s:fu,o:Ko,n:uu},xu={h:Xo,s:Yo,o:su,n:du},qt={sky:lu,baby:cu,candy:Xo,std:Qo},Ze={dragon:iu,faded:ru,muted:ou,std:Ko},Su={dim:bu},vn={candy:Yo,easter:mu,muted:hu},nr={stonerPurple:pu},U={txtmain:ku,bckgd:_u,backdeep:yu},Tu={display:"flex",placeItems:"center",height:"5rem",position:"fixed",bottom:"2rem",right:"2rem",overflowX:"hidden",overflowY:"hidden",color:"white",width:"25ch",backgroundColor:U.bckgd,fontFamily:"monospace"},Au={height:"3rem",position:"absolute",bottom:"1rem",display:"flex",placeItems:"center",zIndex:50,width:"15ch",color:"light-grey",overflowX:"hidden",filter:`drop-shadow(0 1px 0 rgba(0,0,0,.7))
          drop-shadow(0 0 6px rgba(0,0,0,.35))`},Mu={height:"5rem",position:"absolute",bottom:"0",display:"grid",placeItems:"center",whiteSpace:"pre",pointerEvents:"none",opacity:"0"},Gn={zalgo:Mu,brand:Au,logobox:Tu},sn="TERMINAL_GOTHIC",Eu=qt.sky,Ou=Ze.dragon,Ps={above:6,below:3,mid:8,seed:1007},$s={above:10,below:4,mid:2,seed:9997};async function Wu(e){const t=e;t.empty();const n="// created with hson-live",a=oe(t,"note-box");a.css.setMany({position:"fixed",top:"1rem",left:"1rem",backgroundColor:U.bckgd,padding:"1rem",fontFamily:"monospace",color:Ze.dragon,filter:"blur(0.5px)"}),oe(a,"note-text").text.set(n);const s=oe(t,"logo-box").css.setMany(Gn.logobox),o=oe(s,"z-logo").text.set(Dn(sn,Ps)).css.setMany(Gn.zalgo).css.set.color(Eu),r=oe(s,"z2-logo").text.set(Dn(sn,$s)).css.setMany(Gn.zalgo).css.set.color(Ou),l=oe(s,"logo-text").text.set(sn).css.setMany(Gn.brand);Dd(l);const c=setInterval(()=>{const u=Math.random()*1e3,b=Math.random()*1e3;try{o.text.set(Dn(sn,{...Ps,seed:u})),r.text.set(Dn(sn,{...$s,seed:b}))}catch{clearInterval(c)}},60),p=[Ua.logobox,Ua.zalgoFade,Ua.zalgoFade_2];return s.css.keyframes.setMany(p),s.css.anim.begin(In.logobox),o.css.anim.begin(In.zalgo1),r.css.anim.begin(In.zalgo2),await It.for(s).anim(In.logobox).end(),p.forEach(u=>{s.css.keyframes.delete(u.name)}),t.empty(),ne.ok()}const Nu=96,Cu=`${Nu}px`,ju={display:"block",alignItems:"baseline",lineHeight:"1",position:"relative"},Lu={position:"relative",display:"block",fontSize:Cu,lineHeight:"0.88",fontFamily:"'Times New Roman', Georgia, Iowan Old Style, Palatino, serif, ui-serif",fontWeight:"700",color:U.bckgd,textShadow:"0 0 0 transparent"},Ru={color:"var(--final)",textShadow:"0 0 0 transparent",filter:"brightness(1)"},Pu={position:"relative",display:"grid",gridTemplateColumns:"4.15rem 4.25rem",gridTemplateRows:"5rem 3.96rem",gap:"0",placeItems:"end start",isolation:"isolate",userSelect:"none",zIndex:"-10"},$u={fontSize:"5.7rem",display:"inline-block",transform:"rotate(32deg) translateX(5px) translateY(-6px)",transformOrigin:"50% 55%"},Fu={display:"inline-block",transform:"translateX(0.11em)"},Du={position:"absolute",right:"8px",bottom:"5px",fontFamily:"monospace",fontSize:"1rem",fontWeight:"700",letterSpacing:"-0.19em",color:"white",opacity:"0",whiteSpace:"nowrap",pointerEvents:"none"},ua=400,Iu="rgb(255, 196, 84)",Gu="rgba(255, 196, 84, 0.55)",Hu="linear-gradient(30deg, transparent 0%, transparent 10%, white 100%)",ar="cloud-band-loop",ir="cloud-sun-kiss",sr="cloud-layer-fade",zu=700,li=`${zu}ms`,vi=2e4,Bu=`${vi}ms`,pa=9e3,Uu=`${pa}ms`,or=pa*.5,rr=vi-or,xi=`${rr}ms`,xn=300,qu=`${xn}ms`,Ju=vi*.26,Si=`${Ju}ms`,Vu=.4659,Ku=320,Xu=Math.round(rr*Vu),Qu=`${Ku}ms`,Yu={layers:10,seed:1211,w:ua,circlesMin:10,circlesMax:30},Zu={name:"--layer-fade",syn:"<number>",inh:!0,init:"1"},ep={name:"--kiss",syn:"<number>",inh:!1,init:"0"},tp={name:"--layer-max",syn:"<number>",inh:!0,init:"0.1"},np={name:"hson_sky",duration:Bu,timingFunction:"linear",fillMode:"forwards"},ap={name:"gradient-opacity",duration:xi,timingFunction:"linear",fillMode:"forwards"},ip={name:"hson_letter_starshine",delay:Si,duration:`${xn/2}ms`,timingFunction:"linear",iterationCount:"1",fillMode:"none"},sp={name:"hson_ver",duration:li,delay:Si,timingFunction:"ease-out",fillMode:"forwards"},Fs={name:"hson_letters",duration:li,delay:li,timingFunction:"ease-in-out",fillMode:"forwards"},lr={name:"hson_sun_disk",duration:xi,timingFunction:"ease-in-out",fillMode:"forwards"},op={name:"hson_sun_path",duration:xi,timingFunction:"linear",fillMode:"forwards"},cr={name:"hson_lens_flare",duration:Qu,timingFunction:"cubic-bezier(0.2, 0.9, 0.2, 1)",delay:`${Xu}ms`,iterationCount:"1",fillMode:"both"},Sn={duration:qu,timingFunction:"linear",fillMode:"forwards",delay:Si,iterationCount:"1"},dr={name:"hson_star_move",...Sn},ur={name:"hson_star_head",...Sn},pr={name:"hson_star_tail_a",...Sn,duration:`${xn*2.5}ms`},rp={name:"hson_star_tail_b",...Sn,duration:`${xn*12.5}ms`},Ti={name:"hson_star_tail_c",...Sn,duration:`${xn*23.5}ms`},lp=(e=0)=>({name:sr,duration:Uu,timingFunction:"linear",iterationCount:"1",fillMode:"forwards",delay:`${(e*120).toFixed(0)}ms`}),mr=[{name:"hson_sky",steps:{"0%":{background:U.bckgd},"02%":{background:U.bckgd},"57%":{background:"rgba(0,89,255,1)"},"92%":{background:"rgba(0, 128, 255, 1)"},"100%":{background:U.bckgd}}},{name:"hson_sun_path",steps:{"0%":{offsetDistance:"0%"},"90%":{offsetDistance:"100%"},"100%":{offsetDistance:"100%"}}},{name:"hson_sun_disk",steps:{"0%":{opacity:"0",transform:"scale(3.15)",boxShadow:"0 0 0px rgba(255, 196, 84, 0)"},"12%":{opacity:"0.1",transform:"scale(3)",boxShadow:"0 0 0px rgba(255, 196, 84, 0)"},"74%":{opacity:"1",transform:"scale(2.3)",boxShadow:"0 0 8px rgba(204, 255, 84, 0.8)"},"100%":{opacity:"1",transform:"scale(1.9)",boxShadow:"0 0 48px rgba(204, 255, 84, 1)"}}},{name:"hson_letters",steps:{"0%":{color:"black",textShadow:"0 0 0 transparent",filter:"brightness(1)"},"18%":{color:U.bckgd,textShadow:"0 0 2px var(--glow), 0 0 6px var(--glow), 0 0 12px rgba(255,255,255,0.18)",filter:"brightness(1.25)"},"30%":{color:U.bckgd,textShadow:"0 0 1px var(--glow), 0 0 5px var(--glow), 0 0 10px rgba(255,255,255,0.12)",filter:"brightness(1)"},"50%":{color:U.bckgd,textShadow:"0 0 1px var(--glow), 0 0 6px var(--glow), 0 0 14px rgba(255,255,255,0.10)"},"65%":{color:U.bckgd,textShadow:"0 0 1px var(--glow), 0 0 12px var(--glow), 0 0 20px rgba(255,255,255,0.12)",filter:"brightness(1)"},"75%":{color:U.bckgd,textShadow:"0 0 1px var(--glow), 0 0 2px var(--glow), 0 0 04px rgba(255,255,255,0.12)",filter:"brightness(1)"},"95%":{color:"var(--final)",textShadow:"0 0 1px var(--glow), 0 0 6px var(--glow), 0 0 14px rgba(255,255,255,0.10)"},"100%":{color:"var(--final)",textShadow:"0 0 0 transparent"}}},{name:"hson_letter_starshine",steps:{"0%":{color:"var(--final)",filter:"brightness(1)",textShadow:"0 0 0 transparent"},"62%":{color:"var(--final)",filter:"brightness(1)",textShadow:"0 0 2px var(--starshine), 0 0 2px var(--starshine)"},"75%":{color:"var(--final)",filter:"brightness(1.98)",textShadow:"0 0 1px var(--starshine), 0 0 5px var(--starshine)"},"85%":{color:"var(--final)",filter:"brightness(1)",textShadow:"0 0 1px var(--starshine), 0 0 2px var(--starshine)"},"100%":{color:"var(--final)",filter:"brightness(1)",textShadow:"0 0 0 transparent"}}},{name:"hson_ver",steps:{"0%":{opacity:"0",transform:"translateY(6px)"},"100%":{opacity:"1",transform:"translateY(0)"}}},{name:"hson_star_move",steps:{"0%":{offsetDistance:"0%"},"100%":{offsetDistance:"100%"}}},{name:"hson_star_head",steps:{"0%":{opacity:"0"},"6%":{opacity:"1"},"16%":{opacity:".2"},"36%":{opacity:".4"},"56%":{opacity:"1"},"71%":{opacity:".3"},"75%":{opacity:"0"},"90%":{opacity:"0"},"100%":{opacity:"0"}}},{name:"hson_star_tail_a",steps:{"0%":{opacity:"0",transform:"translate(-100%, -50%) scaleX(0.01)"},"6%":{opacity:"0.9",transform:"translate(-100%, -50%) scaleX(0.8)"},"18%":{opacity:"0.9",transform:"translate(-100%, -50%) scaleX(22)"},"70%":{opacity:"0.05",transform:"translate(-100%, -50%) scaleX(26)"},"100%":{opacity:"0",transform:"translate(-100%, -50%) scaleX(26)"}}},{name:"hson_star_tail_b",steps:{"0%":{opacity:"0",transform:"translate(-100%, -50%) scaleX(0.01)"},"6%":{opacity:"0.55",transform:"translate(-100%, -50%) scaleX(0.7)"},"22%":{opacity:"0.75",transform:"translate(-100%, -50%) scaleX(30)"},"78%":{opacity:"0.05",transform:"translate(-100%, -50%) scaleX(34)"},"100%":{opacity:"0",transform:"translate(-100%, -50%) scaleX(54)"}}},{name:"hson_star_tail_c",steps:{"0%":{opacity:"0",transform:"translate(-100%, -50%) scaleX(0.01)"},"6%":{opacity:"0.28",transform:"translate(-100%, -50%) scaleX(0.6)"},"26%":{opacity:"0.58",transform:"translate(-100%, -50%) scaleX(38)"},"88%":{opacity:"0.32",transform:"translate(-100%, -50%) scaleX(44)"},"100%":{opacity:"0",transform:"translate(-100%, -50%) scaleX(64)"}}},{name:"hson_lens_flare",steps:{"0%":{opacity:"0",transform:"translateX(-25%) translateY(17%) rotate(0deg)"},"20%":{opacity:"0.85",transform:"translateX(-25%) translateY(17%) rotate(0deg)"},"40%":{opacity:"0.25",transform:"translateX(5%) translateY(27%) rotate(30deg)"},"100%":{opacity:"0",transform:"translateX(5%) translateY(27%) rotate(40deg)"}}},{name:"gradient-opacity",steps:{"0%":{opacity:"0"},"02%":{opacity:"0"},"62%":{opacity:".2"},"72%":{opacity:".3"},"85%":{opacity:".8"},"90%":{opacity:".4"},"96%":{opacity:"0"},"100%":{opacity:"0"}}}],cp={name:sr,steps:{"0%":{"--layer-fade":"1"},"30%":{"--layer-fade":"1"},"98%":{"--layer-fade":"0"},"100%":{"--layer-fade":"0"}}},dp={name:ar,steps:{"0%":{"mask-position":"var(--cloud-phase-px) 100%, 0px 100%","-webkit-mask-position":"var(--cloud-phase-px) 100%, 0px 100%"},"100%":{"mask-position":`calc(var(--cloud-phase-px) - ${ua}px) 100%, 0px 100%`,"-webkit-mask-position":`calc(var(--cloud-phase-px) - ${ua}px) 100%, 0px 100%`}}},up={name:ir,steps:{"0%":{"--kiss":"0"},"42%":{"--kiss":"0"},"85%":{"--kiss":"0.8"},"100%":{"--kiss":"0.9"}}};function pp(e){return Object.keys(e)}function mp(e){return e.classlist.has("H")?"h":e.classlist.has("S")?"s":e.classlist.has("O")?"o":e.classlist.has("N")?"n":null}function fp(e){return new Promise(t=>setTimeout(t,e))}function At(e,t,n){return e+(t-e)*n}function ma(e,t=2e3){return e.length>t?`${e.slice(0,t)}…`:e}const hp={position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh",backgroundColor:U.bckgd},gp={position:"relative",width:"100%",minHeight:"calc(var(--frameSize) * 2)",overflow:"hidden","--frameSize":"min(15rem, 520px)"},bp={position:"absolute",inset:"0",pointerEvents:"none",zIndex:"-50",offsetPath:'path("M 30 400 A 400 500 0 0 1 320 -120")',offsetRotate:"0deg",offsetAnchor:"50% 50%",offsetDistance:"0%",willChange:"offset-distance"},yp={width:"5.25em",height:"5.25em",borderRadius:"999px",background:Iu,boxShadow:`0 0 28px ${Gu}`,opacity:"0",transform:"scale(1.06)",willChange:"transform, opacity"},wp={position:"absolute",left:"50%",top:"32%",transform:"translate(-50%, -50%)",width:"calc(var(--frameSize) * 2)",height:"calc(var(--frameSize) * 2)",pointerEvents:"none",overflow:"visible",zIndex:"50"},_p={position:"absolute",inset:"0",pointerEvents:"none",opacity:"0",mixBlendMode:"screen",willChange:"transform, opacity",background:`
    linear-gradient(
      120deg,
      transparent 45%,
      rgba(255,255,255,0.25) 50%,
      transparent 55%
    ),
    radial-gradient(
      circle at 50% 50%,
      rgba(255,255,255,0.35),
      transparent 60%
    )
  `},kp={position:"fixed",left:"50%",top:"32%",borderRadius:"22px",transform:"translate(-50%, -50%)",width:"max-content",height:"max-content",display:"grid",placeItems:"center",overflow:"hidden",padding:"56px 64px",willChange:""},vp={...kp},xp={position:"absolute",left:"0%",top:"0%",width:"100%",height:"100%",zIndex:90,opacity:0,willChange:"opacity",background:Hu},Sp={position:"absolute",left:"0",top:"0",width:"0",height:"0",pointerEvents:"none",zIndex:"100",overflow:"visible",offsetPath:'path("M -40 -30 L 380 160")',offsetRotate:"auto",offsetAnchor:"50% 50%",offsetDistance:"0%",willChange:"offset-distance"},Tp={position:"absolute",left:"0",top:"0",width:"0",height:"0",transform:"none",transformOrigin:"0 0"},Ap={position:"absolute",left:"0",top:"0",width:"6px",height:"6px",borderRadius:"999px",background:"rgba(255,255,255,0.95)",boxShadow:"0 0 10px rgba(255,255,255,0.6)",transform:"translate(-50%, -50%)",opacity:"0",willChange:"opacity"},fr={position:"absolute",left:"0",top:"0",width:"360px",borderRadius:"999px",transformOrigin:"100% 50%",transform:"translate(-100%, -50%) scaleX(0.01)",willChange:"transform, opacity"},Mp={...fr,height:"2px",background:"linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95))",filter:"blur(01.05px)",opacity:"0"},Ep={...fr,height:"9px",background:"linear-gradient(90deg, rgba(255,255,255,0), rgba(180,220,255,0.22))",filter:"blur(14.4px)",opacity:"0"},Op={position:"absolute",inset:"0",pointerEvents:"none",zIndex:"40",overflow:"hidden",transform:"translateZ(0)"},Wp=0,Np=10,Ds=`linear-gradient(to top,
  rgba(255,255,255,1) 0%,
  rgba(255,255,255,1) ${Wp}%,
  ${U.bckgd} ${Np}%,
  ${U.bckgd} 100%
)`;function Cp(e){const t=kn(e.seed),n=e.w,a=e.h,i=2,s=n+i,o=-i/2,r=e.yBandPct/100*a,l=e.ySpreadPct/100*a,p=`
  <filter id="cloud" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${(e.blur??0).toFixed(2)}" result="b"/>
    <feColorMatrix in="b" type="matrix"
      values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 35 -12
      " result="t"/>
    <feComposite in="t" in2="t" operator="over"/>
  </filter>
`;let u="";for(let w=0;w<e.circles;w++){const k=e.rMin+t()*(e.rMax-e.rMin),y=o+t()*(s+k*2)-k,g=r+(t()-.5)*l;u+=`<circle cx="${y.toFixed(2)}" cy="${g.toFixed(2)}" r="${k.toFixed(2)}" fill="white"/>`}const b=e.rMin+.55*(e.rMax-e.rMin),h=Math.min(a,Math.max(0,r+l*.25-b*.2)),d=`<rect x="${o}" y="${h.toFixed(2)}" width="${s}" height="${(a-h).toFixed(2)}" fill="white"/>`,m=`
<svg xmlns="http://www.w3.org/2000/svg"
     width="${s}" height="${a}"
     viewBox="${o} 0 ${s} ${a}"
     preserveAspectRatio="none">  <!-- CHANGED: avoid aspect surprises -->
  ${p}
  <g filter="url(#cloud)">
    ${u}
    ${d}  <!-- CHANGED: use slab var, don’t re-inline a second rect -->
  </g>
</svg>`;return`url("data:image/svg+xml,${encodeURIComponent(m).replace(/'/g,"%27").replace(/"/g,"%22")}")`}function jp(e,t){const n={layers:15,seed:1919,blurTop:1,blurBottom:0,w:ua,h:220,...t},a=oe(e,"cloud-wrapper");for(let i=0;i<n.layers;i++){const s=i/Math.max(1,n.layers-1),o=(n.seed^i*2654435769)>>>0,r=At(15,95,s),l=At(16,34,s),c=Math.round(At(80,140,1-s)),p=At(n.blurTop,n.blurBottom,s),u=Cp({seed:o,w:n.w,h:n.h,circles:c,yBandPct:r,ySpreadPct:l,rMin:At(10,18,s),rMax:At(28,52,s),blur:p}),b=lt(a,["cloud-layer",`cloud-${i}`]),h=Math.round(kn(o)()*n.w);b.css.set.var("--cloud-phase-px",`${h}px`);const d=At(.02,.28,s);b.data.set("cloud-max",d.toFixed(3)),b.css.setMany({"--layer-max":d.toFixed(3),"--layer-fade":"1",opacity:"calc(var(--layer-max) * var(--layer-fade))",position:"absolute",inset:"0",pointerEvents:"none",zIndex:String(35+i),willChange:"opacity, bottom"});const m=25,v=`cloud-paint-${i}`,w=lt(b,v);w.css.setMany({position:"absolute",inset:"0",height:`${100+m}%`,transform:`translateY(${m}%)`,backgroundImage:["linear-gradient(rgba(12, 19, 26, var(--kiss)), rgba(215, 215, 215,var(--kiss)))",`linear-gradient(to bottom,
     rgba(${st.r}, ${st.g}, ${st.b}, 1) 0%,
     rgba(${st.r}, ${st.g}, ${st.b}, 1) 55%,
     rgba(${st.r}, ${st.g}, ${st.b}, 1) 100%)`].join(", "),mixBlendMode:"normal",filter:"none",willChange:"mask-position, -webkit-mask-position, opacity, bottom"});const k=Ge.globals.invoke();k.sel(`.${v}`).setMany({maskImage:`${u}, ${Ds}`,WebkitMaskImage:`${u}, ${Ds}`,maskRepeat:"repeat-x, no-repeat",WebkitMaskRepeat:"repeat-x, no-repeat",maskPosition:"var(--cloud-phase-px) 100%, 0px 100%",WebkitMaskPosition:"var(--cloud-phase-px) 100%, 0px 100%",maskSize:`${n.w}px 100%, 100% 100%`,WebkitMaskSize:`${n.w}px 100%, 100% 100%`,maskComposite:"intersect",WebkitMaskComposite:"source-in"}),k.sel(`.${v}`).setMany({animationName:`${ar}, ${ir}`,animationDuration:`${pa}ms, ${pa}ms`,animationTimingFunction:"linear, linear",animationIterationCount:"infinite, 1",animationFillMode:"both, both",animationDelay:"0s, 0s"}),w.css.setMany({backgroundColor:"rgba(255,0,255,var(--kiss))"}),w.data?.set?.("is-cloud-paint","1")}return a}function hr(e){return{bud:n=>{const a=n.make(e);n.id&&a.id.set(n.id),n.cls&&a.classlist.set(n.cls),n.txt!==void 0&&a.text.set(n.txt),n.css&&a.css.setMany(n.css),n.at?.forEach(o=>a.css.atProperty.register(o)),n.kf?.forEach(o=>a.css.keyframes.set(o));const i=()=>{const o=Array.isArray(n.anim)?n.anim:[n.anim];!o||o.length===0||queueMicrotask(()=>{for(const r of o)a.css.anim.begin(r)})},s=hr(a);return{tree:a,bud:s.bud,animate:i}}}}const Te=e=>e.create.div(),Lp=e=>e.create.section(),he={sky:{name:"sky",make:Lp,id:"sky",css:gp,kf:mr},logoBox:{name:"logoBox",make:Te,id:"hson-logo"},frame:{name:"frame",make:Te,id:"frame",css:vp,anim:np},wordmark:{name:"wordmark",make:Te,id:"wordmark",css:Pu},flareBox:{name:"flareBox",make:Te,id:"flare-box",css:wp},flare:{name:"flare",make:Te,id:"lens-flare",css:_p,anim:cr},gradient:{name:"gradient",make:Te,id:"sky-gradient",css:xp,anim:ap},cloudBox:{name:"cloudBox",make:Te,id:"cloud-box",css:Op,at:[Zu,tp,ep],kf:[dp,up,cp]},sunCarrier:{name:"sunCarrier",make:Te,id:"sun-carrier",css:bp,anim:op},sun:{name:"sun",make:Te,id:"sun",css:yp,anim:lr},starCarrier:{name:"starCarrier",make:Te,id:"star-carrier",css:Sp,anim:dr},starWrap:{name:"starWrap",make:Te,id:"star-wrap",css:Tp},starHead:{name:"starHead",make:Te,id:"star-head",css:Ap,anim:ur},starTailA:{name:"starTailA",make:Te,cls:"star-tail a",css:Mp,anim:pr},starTailC:{name:"starTailC",make:Te,cls:"star-tail c",css:Ep,anim:Ti}};async function Rp(e){e.empty();const n=hr(e).bud(he.sky),i=n.bud(he.logoBox).bud(he.frame),s=i.bud(he.wordmark),o=i.bud(he.cloudBox),r=i.bud(he.flareBox),l=r.bud(he.flare),c=i.bud(he.gradient),p=s.bud(he.sunCarrier),u=p.bud(he.sun),b=i.bud(he.starCarrier),h=b.bud(he.starWrap),d=h.bud(he.starHead),m=h.bud(he.starTailA),v=h.bud(he.starTailA),w=h.bud(he.starTailC),y=jp(o.tree,Yu).content.mustOnly().content.all();if(!y?.length)return ne.err("no clouds created");const g=$=>{const re=an(s.tree,["cell",$]);return[an(re,["letter",$]).text.set($),re]},[f,x]=g("H"),[S,T]=g("S"),[M,O]=g("O"),[W,G]=g("N"),R=[f,S,M,W],Z=[x,T,O,G],I=an(G,["ver"]);an(I,"ver-a").text.set("2.0.2");const J=an(I,"ver-6").text.set("6");return Z.forEach($=>$.css.setMany(ju)),R.forEach($=>{const re=mp($);if(!re)return;const ae=vu[re];$.css.set.var("--glow",ae),$.css.set.var("--final",ae),$.css.set.var("--starshine",ae)}),f.css.set.transform("translateX(13px)"),S.css.set.transform("translateX(6px)"),M.css.setMany($u),R.forEach($=>$.css.setMany(Lu)),I.css.setMany(Du),J.css.setMany(Fu),i.animate(),y.forEach(($,re)=>{$.css.anim.begin(lp(re))}),await It.timer(or),p.animate(),u.animate(),c.animate(),l.animate(),await It.for(r.tree).anim(cr).end(),r.tree.removeSelf(),await It.for(u.tree).anim(lr).end(),p.tree.removeSelf(),R.forEach($=>{$.css.anim.begin(Fs)}),await It.for(f).anim(Fs).end(),I.css.anim.begin(sp),Pp(b.tree,d.tree,m.tree,v.tree,w.tree),R.forEach($=>{$.css.setMany(Ru),$.css.anim.begin(ip)}),await It.for(w.tree).anim(Ti).end(),mr.forEach($=>{n.tree.css.keyframes.delete($.name)}),ne.ok()}function Pp(e,t,n,a,i){e.css.set.offsetDistance("0%"),t.css.set.opacity("0"),n.css.set.opacity("0"),a.css.set.opacity("0"),i.css.set.opacity("0"),e.css.anim.begin(dr),t.css.anim.begin(ur),n.css.anim.begin(pr),a.css.anim.begin(rp),i.css.anim.begin(Ti)}async function qa(e,t,n){const a=await t(e);return zt.isErr(a)||await n(),a}function $p(e){const t=new AbortController;let n;const a=new Promise(o=>{n=o}),i=e.listen.onPointerDown(o=>{"button"in o&&o.button!==0||(n?.("skip"),n=void 0,t.signal.aborted||t.abort())});return{skip:a,cancel:()=>{i.off(),t.signal.aborted||t.abort(),n=void 0}}}const yt="panel-hidden",ze={hsonWord:"80px",heading:"24px",main:"18px",sub:"14px"},Tn="10px",Fp={fontFamily:"monospace",fontSize:ze.heading,fontWeight:"400",_hover:{fontWeight:"700",background:Ze.muted,color:U.backdeep},_active:{background:vn.muted,color:U.backdeep}},Dp={fontSize:ze.hsonWord,fontFamily:"Jacquard12",width:"max-content"},Ip={position:"fixed",width:"100%",height:"100%",inset:"0",overflow:"hidden",background:U.bckgd,pointerEvents:"none"},Gp={position:"relative",width:"100%",height:"100%",overflow:"hidden",isolation:"isolate",pointerEvents:"all",minHeight:"0"},Hp={position:"relative",display:"grid",gridTemplateColumns:"1fr 6fr",gridTemplateRows:"minmax(0, 1fr)",gap:Tn,width:"100%",height:"100%",minHeight:"0",minWidth:"0",paddingLeft:"1rem",pointerEvents:"all"},zp={gridColumn:"1",marginLeft:"2rem",position:"relative",lineHeight:"2.5rem"},Bp={position:"relative",display:"flex",flexDirection:"row"},Up={display:"flex",alignContent:"baseline",justifyContent:"flex-start",fontFamily:"Jacquard12"},qp={position:"absolute",minWidth:"0",minHeight:"0",display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"flex-start",gridColumn:"1 / 2",gridRow:"1 / 2"},Jp={width:"100%",height:"100%",minHeight:"0",minWidth:"0",display:"grid",gridTemplateRows:"3fr minmax(auto, 1fr)",gap:Tn,boxSizing:"border-box",overflow:"hidden"},Vp={position:"relative",minHeight:"0",minWidth:"0",width:"100%",height:"100%",overflow:"hidden",pointerEvents:"auto"},Kp={position:"relative",bottom:"0",minHeight:"0",minWidth:"0",width:"100%",maxHeight:"15rem",overflow:"hidden",pointerEvents:"auto"},Xp={demo:"demo",screen:"demo-screen",screenFx:"screen-fx"},Hn=Xp,Is=e=>{switch(e){case"h":return"blue-shade";case"s":return"yellow-shade";case"o":return"green-shade";case"n":return"pink-shade"}return console.warn("shadeClass function failed"),"shadeClass function failed"},Gs="parse",Hs="test",zs="build",Bs="fleurs",Us="oklch",qs="mouse",Js="about",Vs="parsing-panels-root",Qp="pp-head",Yp=7,Pe=` ${Yp}ch`,Zp={position:"relative",minWidth:"0",minHeight:"0",pointerEvents:"all",gridColumn:"2 / 3",gridRow:"1 / 2"},ci={width:"100%",height:"100%",minWidth:"0",minHeight:"0",borderRadius:"14px",padding:"12px",boxSizing:"border-box",display:"grid",gap:Tn,backgroundColor:U.bckgd,pointerEvents:"all"},di={backdropFilter:"blur(8px)",color:qt.std,fontFamily:"'Inconsolata'"},Ta={display:"grid",placeItems:"center",borderRadius:"12px",userSelect:"none",cursor:"pointer",fontFamily:"monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:ze.sub,letterSpacing:"0.1em",textTransform:"uppercase",background:U.backdeep,boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)"},em={display:"grid",minHeight:"0",minWidth:"0",gridAutoFlow:"column"},gr={display:"grid",gridTemplateRows:"auto 1fr",gap:Tn,minHeight:"0",maxHeight:"100%",minWidth:"0",padding:"10px",borderRadius:"12px",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)"},Ai={minHeight:"0",minWidth:"0",resize:"none",width:"100%",height:"100%",boxSizing:"border-box",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"12px",lineHeight:"1.35",background:U.backdeep,color:Ze.std,border:`1px solid ${nr.stonerPurple}`,borderRadius:"10px",outline:"none"},tm={borderRadius:"12px",padding:"10px",boxSizing:"border-box",background:U.backdeep,boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.05)",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:ze.sub,height:"100%",minHeight:"10rem",maxHeight:"100%",minWidth:"100%",gridColumn:"1 / 5",color:vn.candy,whiteSpace:"wrap",letterSpacing:"0.1em",lineHeight:"1.5rem",opacity:"0.92"},nm={...Ta,borderRadius:"18px",background:"rgba(0,0,0,0.18)",transition:"transform 90ms ease, filter 140ms ease",_hover:{background:"orange",color:U.backdeep}},am={overflow:"hidden",gridColumn:"1 / 5"},im={background:"rgba(255, 0, 0, 0.2)"},sm={background:"rgba(255, 0, 0, 0.3)"},om={background:"rgba(255, 0, 0, 0.4)"},rm={display:"grid",gap:"6px",gridTemplateColumns:Pe+Pe+Pe,width:"100%",boxSizing:"border-box"},lm={display:"grid",gap:"8px",padding:"10px",width:"420px",boxSizing:"border-box",gridTemplateColumns:`${Pe} ${Pe}`,gridTemplateRows:"auto "+Pe},cm={...rm,gridColumn:"1 / 5",display:"grid",gridTemplateColumns:"1fr 2fr 1fr",gap:"10px",padding:"0",background:"transparent",border:"none",boxShadow:"none"},dm={...Ta,borderRadius:"18px",background:"rgba(0,0,0,0.18)",transition:"transform 90ms ease, filter 140ms ease",_hover:{background:Ze.faded,color:U.backdeep}},um={minWidth:"12ch",padding:"10px 8px",borderRadius:"12px",boxSizing:"border-box",fontFamily:"monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:ze.sub,letterSpacing:"0.06em",background:U.backdeep,color:Ze.std,border:"1px solid rgba(255,255,255,0.10)",outline:"none"};function Ks(e,t,n){const a=e.create.div().id.set(t);a.text.set(n);const i={padding:"6px 8px",borderRadius:"10px",userSelect:"none",cursor:"pointer",fontFamily:"monospace, SFMono-Regular, Menlo, monospace",fontSize:"20px",letterSpacing:"0.02em",textAlign:"center",whiteSpace:"nowrap",boxSizing:"border-box"},s={background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)"};return a.css.setMany(i),{node:a,setActive:r=>{a.css.setMany(r?{...i,...s}:i)},setText:r=>a.text.set(r)}}function pm(e){const t=oe(e,"test-chips").css.setMany({display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px",gridRow:"4",gridColumn:"1 / 5",padding:"0"}),n=r=>{const l=lt(t,"test-chip").css.setMany({padding:"8px 8px",borderRadius:"18px",display:"grid",gridTemplateRows:"auto auto",justifyItems:"center",alignContent:"center",minHeight:"44px",minWidth:"44px",boxSizing:"border-box",overflow:"hidden",border:nr.stonerPurple,transition:"transform 90ms ease, filter 140ms ease"}),c=lt(l,"test-chip-value").text.set("—").css.setMany({fontSize:ze.sub,fontWeight:"700",lineHeight:"1",letterSpacing:"0.01em"});lt(l,"test-chip-label").text.set(r).css.setMany({marginTop:"4px",fontSize:ze.sub,lineHeight:"1",letterSpacing:"0.06em",textTransform:"lowercase",whiteSpace:"nowrap"});const p=u=>{l.css.setMany(u?{transform:"translateY(1px)",filter:"brightness(0.98)"}:{transform:"translateY(0px)",filter:"brightness(1.0)"})};return l.listen.onPointerDown(()=>p(!0)),l.listen.onPointerUp(()=>p(!1)),l.listen.onPointerLeave(()=>p(!1)),l.listen.onPointerCancel(()=>p(!1)),{set:u=>c.text.set(String(u)),clear:()=>c.text.set("—"),_node:l}},a=n("total"),i=n("pass"),s=n("fail"),o=n("ms");return{clear:()=>{a.clear(),i.clear(),s.clear(),o.clear()},render:r=>{a.set(r.cases),i.set(r.pass),s.set(r.fail),o.set(Math.round(r.msTotal))}}}const pn=(e,t=100)=>e.length>t?e.slice(0,t)+"…":e,ui=new Set(["_str","_val"]);function Xs(e){return e.replace(/\r\n/g,`
`).replace(/\r/g,`
`)}function Qs(e){const t=(e._content??[]).filter(D);return t.length===1&&t[0]._tag==="_elem"?(t[0]._content??[]).filter(D):t}function Ys(e){if(e._tag==="_elem"){const t=(e._content??[]).filter(D);if(t.length===1&&ui.has(t[0]._tag))return t[0]}return e}function mm(e,t,n,a,i){if(!(ui.has(e._tag)&&ui.has(t._tag)))return!1;const s=e._content?.[0],o=t._content?.[0];if(s===o)return!0;if(i?.allow_html_newline_norm===!0&&typeof s=="string"&&typeof o=="string"&&(s.includes("\r")||o.includes("\r"))){const r=Xs(s),l=Xs(o);if(r===l)return!0}return a.push(`Leaf mismatch @ ${n}: ${JSON.stringify(s)} vs ${JSON.stringify(o)}`),!0}function Zs(e,t,n,a,i){e.length!==t.length&&a.push(`Child count mismatch @ ${n}: ${e.length} vs ${t.length}`);const s=Math.min(e.length,t.length);for(let o=0;o<s;o++)i(e[o],t[o],`${n}._content[${o}]`)}function fm(e,t,n,a,i){const s=new Map,o=new Map;for(const r of e)s.set(r._tag,r);for(const r of t)o.set(r._tag,r);for(const r of s.keys())o.has(r)||a.push(`Key missing in B @ ${n}.${r}`);for(const r of o.keys())s.has(r)||a.push(`Key missing in A @ ${n}.${r}`);for(const r of s.keys()){const l=s.get(r),c=o.get(r);c&&i(l,c,`${n}.${r}`)}}function zn(e){const t=Object.keys(e).sort(),n={};for(const a of t)n[a]=e[a];return JSON.stringify(n)}function hm(e,t,n=""){const a=[],i=e??{},s=t??{},o=new Set([...Object.keys(i),...Object.keys(s)]);for(const r of o){if(!(r in i)){a.push(`Missing attr in A @ ${n}["${r}"]`);continue}if(!(r in s)){a.push(`Missing attr in B @ ${n}["${r}"]`);continue}const l=i[r],c=s[r],p=typeof l=="object"&&l&&typeof c=="object"&&c;if(r==="style"&&p&&!Array.isArray(l)&&!Array.isArray(c)){zn(l)!==zn(c)&&a.push(`Style mismatch @ ${n}["style"]`);continue}p?zn(l)!==zn(c)&&a.push(`Attr object mismatch @ ${n}["${r}"]`):l!==c&&a.push(`Attr value mismatch @ ${n}["${r}"]: ${JSON.stringify(l)} vs ${JSON.stringify(c)}`)}return a}function aa(e,t,n,a){const i=[];e._tag!==t._tag&&i.push(`_tag mismatch @ ${n}: "${e._tag}" vs "${t._tag}"`);const s=Ys(e),o=Ys(t);if(i.push(...hm(s._attrs,o._attrs,`${n}._attrs`)),mm(s,o,n,i,a))return i;const r=Qs(s),l=Qs(o);return s._tag==="_obj"&&o._tag==="_obj"?fm(r,l,n,i,(c,p,u)=>i.push(...aa(c,p,u,a))):s._tag==="_arr"&&o._tag==="_arr"?Zs(r,l,n,i,(c,p,u)=>i.push(...aa(c,p,u,a))):Zs(r,l,n,i,(c,p,u)=>i.push(...aa(c,p,u,a))),i}function fa(e,t,n=!0,a={allow_html_newline_norm:!0}){if(!e||!t)throw new Error(`compare_nodes: missing input (a:${JSON.stringify(e)}, b:${JSON.stringify(t)})`);if(e===t)throw new Error("compareNodes called with identical references");const i=aa(e,t,"/_root",a);if(!n)return i;if(console.groupCollapsed(i.length?`❌ node-compare FAIL  (${i.length} diffs)`:"✅ node-compare OK"),console.log("A (snip):",pn(ce(e)),500),console.log("B (snip):",pn(ce(t)),500),i.length){console.groupCollapsed("diffs");for(let s=0;s<Math.min(i.length,20);s++)console.log(i[s]);i.length>20&&console.log(`… +${i.length-20} more`),console.groupEnd()}return console.groupEnd(),i.length&&(console.error(`FAILED • node-compare: first diff — ${i[0]}`),console.group("node-compare FAIL"),console.log("A:",pn(ce(e),2e3)),console.log("B:",pn(ce(t),2e3)),console.groupEnd()),i}const ha={json:{emit:e=>be.fromNode(e).toJson().serialize(),parse:e=>be.fromJson(e.trim()).toHson().parse()},html:{emit:e=>be.fromNode(e).toHtml().serialize(),parse:e=>be.fromTrustedHtml(e).toHson().parse()},hson:{emit:e=>be.fromNode(e).toHson().serialize(),parse:e=>be.fromHson(e).toHson().parse()}};function Ja(e,t,n,a,i){let s=Va(e,t,`enter:${e}`,i,{lap:0,fmt:e,phase:"parse"});if(!s)return{ok:!1,final:{fmt:e,text:t},finalNode:{_tag:"_bad",_content:[]}};const r=km(n==="cw"?["json","html","hson"]:["json","hson","html"],e);let l=t;for(let c=0;c<a;c++){ct(i,`lap ${c+1}/${a} begin`);for(let u=0;u<r.length;u++){const b=r[u],h=ga(b,s,`emit:${b}`,i,{lap:c,dir:n,phase:"emit"});if(h===void 0)return{ok:!1,final:{fmt:e,text:l},finalNode:s};const d=Va(b,h,`parse:${b}`,i,{lap:c,fmt:b,phase:"parse"});if(!d)return{ok:!1,final:{fmt:e,text:l},finalNode:s};i.capture&&i.capture.artifacts.push({lap:c,fmt:b,text:h,node:ce(d)});const m=fa(s,d,!1);if(m.length){if(ye(i,`diff nodes<ERR>:node -> ${b} -> node`,m[0]),i.stopOnFirstFail)return{ok:!1,final:{fmt:e,text:l},finalNode:s}}else ct(i,`diff nodes<OK>:node -> ${b} -> node`);s=d,l=h}const p=ga(e,s,`return:to:${e}`,i);if(p!==void 0){const u=Va(e,p,`return:from:${e}`,i,{lap:c,fmt:e,phase:"closure"});if(u){const b=fa(s,u,!1);if(b.length){if(ye(i,`closure:${e}`,b[0]),i.stopOnFirstFail)return{ok:!1,final:{fmt:e,text:l},finalNode:s}}else ct(i,`return:check:${e}`);s=u,l=p}}ct(i,`lap ${c+1}/${a} end`)}return{ok:i.failures.length===0,final:{fmt:e,text:l},finalNode:s}}function gm(e,t={}){const n=[],a=[],i=[],s=[],o={trace:n,failures:a,verbose:!!t.verbose,stopOnFirstFail:t.stopOnFirstFail??!1};ct({trace:n,verbose:!0},`debug:opts.entry=${String(t.entry)} typeofAtom=${typeof e}`);const r=t.dual??!0,l=vm(t.times??3,1,1e4),c=t.entry??"auto",p=wm(e,c,o);if(!p)return Ka(!1,l,r?"dual":t.dir??"cw",c,n,a,void 0,void 0,void 0,void 0);const{fmt:u,text:b}=p;if(!r){const M=t.dir??"cw",O={...o,capture:t.capture?{artifacts:i}:void 0,marks:t.paranoid?{nodes:s}:void 0},W=Ja(u,b,M,l,O);return Ka(W.ok,l,M,c,n,a,t.capture?i:void 0,t.paranoid?s:void 0,W.final,void 0)}const h=[],d=[],m=[],v=[],w={...o,capture:t.capture?{artifacts:h}:void 0,marks:t.paranoid?{nodes:m}:void 0},k={...o,capture:t.capture?{artifacts:d}:void 0,marks:t.paranoid?{nodes:v}:void 0},y=Ja(u,b,"cw",l,w),g=Ja(u,b,"ccw",l,k),f=fa(y.finalNode,g.finalNode,!1);if(f.length?ye({trace:n,failures:a,verbose:!!t.verbose},"dual:finalNode cw != ccw",f[0]):ct({trace:n,verbose:!!t.verbose},"dual:finalNode cw == ccw"),t.paranoid){const M=R=>`${R.lap}|${R.fmt}|${R.phase}`,O=new Map;for(const R of m)O.set(M(R),R.node);const W=new Map;for(const R of v)W.set(M(R),R.node);const G=new Set([...O.keys(),...W.keys()]);for(const R of G){const Z=O.get(R),I=W.get(R);if(!Z||!I){ye({trace:n,failures:a,verbose:!!t.verbose},`paranoid:missing mark ${R}`,Z?"missing ccw mark":"missing cw mark");continue}const J=fa(Z,I,!1);if(J.length){if(ye({trace:n,failures:a,verbose:!!t.verbose},`paranoid:mark mismatch ${R}`,J[0]),t.stopOnFirstFail??!0)break}else ct({trace:n,verbose:!!t.verbose},`paranoid:mark ok ${R}`)}}const x=a.length===0&&y.ok&&g.ok,S=t.capture?[...h,...d]:void 0,T=t.paranoid?[...m,...v]:void 0;return Ka(x,l,"dual",c,n,a,S,T,y.final,{cw:y.final,ccw:g.final})}function br(e){const t=e.trim();if(!t)return!1;const n=t[0];return n==="{"||n==="["||n==='"'||n==="-"||n>="0"&&n<="9"?!0:t==="true"||t==="false"||t==="null"}function bm(e){const t=e.trim();return t?!!(/^<\s*[A-Za-z_!/??]/.test(t)||/<\s*[A-Za-z_!/??]/.test(t)):!1}function ym(e){const t=e.trim();if(!br(t))return!1;try{return JSON.parse(t),!0}catch{return!1}}function wm(e,t,n){if(t!=="auto")return _m(e,t,n);if(D(e)){const o=ga("hson",e,"emit:node->hson(entry)",n);return o===void 0?void 0:{fmt:"hson",text:o}}if(pi(e))return{fmt:"html",text:e.outerHTML};if(typeof e!="string")return{fmt:"json",text:JSON.stringify(e)};const a=e.trim(),i=br(a),s=bm(a);if(i){if(!ym(a)){ye(n,"resolve_entry:auto","Looks like JSON but JSON.parse failed (invalid JSON)");return}try{const o=ha.json.parse(a);return dt(o,"auto:json"),{fmt:"json",text:a}}catch(o){ye(n,"resolve_entry:auto",`Looks like JSON but SPIN.json.parse failed: ${Mi(o)}`);return}}if(s)return{fmt:"html",text:a};try{const o=ha.hson.parse(a);return dt(o,"auto:hson"),{fmt:"hson",text:a}}catch{}ye(n,"resolve_entry:auto","Could not detect entry format (shape-gated json/html/hson)")}function _m(e,t,n){if(t==="json")return{fmt:"json",text:typeof e=="string"?e:JSON.stringify(e)};if(t==="html"){if(typeof e=="string")return{fmt:"html",text:e};if(pi(e))return{fmt:"html",text:e.outerHTML};ye(n,"resolve_entry:html","Non-string/non-HTMLElement provided for html entry");return}if(t==="hson"){if(typeof e=="string")return{fmt:"hson",text:e};ye(n,"resolve_entry:hson","Non-string provided for hson entry");return}if(t==="node"){if(!D(e)){ye(n,"resolve_entry:node","Non-HsonNode provided for node entry");return}const a=ga("hson",e,"emit:node->hson(entry)",n);return a===void 0?void 0:{fmt:"hson",text:a}}if(t==="dom"){if(!pi(e)){ye(n,"resolve_entry:dom","Non-HTMLElement provided for dom entry");return}return{fmt:"html",text:e.outerHTML}}ye(n,"resolve_entry",`Unsupported entry: ${String(t)}`)}function ga(e,t,n,a,i){try{const s=ha[e].emit(t);return ct(a,n),a.capture&&i&&a.capture.artifacts.push({lap:i.lap,fmt:e,text:s,node:JSON.stringify(t,null,2)}),s}catch(s){ye(a,n,Mi(s));return}}function Va(e,t,n,a,i){try{const s=ha[e].parse(t);return dt(s,`loop_test:${e}`),ct(a,n),a.marks&&i&&a.marks.nodes.push({...i,node:s}),s}catch(s){ye(a,n,`${Mi(s)} :
 ${pn(t,300)}`);return}}function km(e,t){const n=e.indexOf(t);return n<0?e:[...e.slice(n),...e.slice(0,n)]}function ct(e,t){e.verbose&&e.trace.push({step:t,ok:!0})}function ye(e,t,n){e.failures.push({step:t,ok:!1,error:n}),e.verbose&&e.trace.push({step:t,ok:!1,error:n})}function Ka(e,t,n,a,i,s,o,r,l,c){return{ok:e,times:t,dir:n,entry:a,failures:s,trace:i.length?i:void 0,artifacts:o,marks:r,final:l,dualFinals:c}}function vm(e,t,n){const a=Math.trunc(e);return Number.isNaN(a)||a<t?t:a>n?n:a}function Mi(e){return e instanceof Error&&e.message||String(e)}function pi(e){const n=globalThis.HTMLElement;return typeof n=="function"&&e instanceof n}const xm=`
{
  "lastUpdated": "2025-06-07T15:30:00Z",
  "dataSource": "Internal Market Analysis Group",
  "electricVehicleMarket": {
    "brands": [
      {
        "brandId": "TSLA",
        "brandName": "Tesla, Inc.",
        "countryOfOrigin": "USA",
        "stockSymbol": "TSLA",
        "models": [
          {
            "modelId": "TSLAM3",
            "modelName": "Model 3",
            "vehicleType": "Sedan",
            "productionYears": [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
            "baseMsrp": 38990,
            "trims": [
              {
                "trimId": "M3-RWD",
                "trimName": "Rear-Wheel Drive",
                "price": 38990,
                "isAvailable": true,
                "specs": {
                  "range": {
                    "epaEstimate": 272,
                    "units": "miles"
                  },
                  "battery": {
                    "capacity": 60,
                    "units": "kWh",
                    "chemistry": "LFP"
                  },
                  "motor": {
                    "drivetrain": "RWD",
                    "horsepower": 271,
                    "torque_lb_ft": 310
                  },
                  "performance": {
                    "zeroToSixtyMph": 5.8
                  }
                },
                "standardFeatures": ["18in Aero Wheels", "Glass Roof", "Autopilot", "15-inch Center Touchscreen"],
                "availablePackages": [
                  {
                    "packageId": "TSLA-EAP",
                    "packageName": "Enhanced Autopilot",
                    "packagePrice": 6000,
                    "includedOptions": ["Navigate on Autopilot", "Auto Lane Change", "Autopark", "Summon", "Smart Summon"],
                    "conflictsWith": ["TSLA-FSD"]
                  },
                  {
                    "packageId": "TSLA-FSD",
                    "packageName": "Full Self-Driving Capability",
                    "packagePrice": 12000,
                    "includedOptions": ["All functionality of Basic Autopilot and Enhanced Autopilot", "Traffic Light and Stop Sign Control", "Autosteer on city streets (Beta)"],
                    "conflictsWith": ["TSLA-EAP"]
                  }
                ]
              },
              {
                "trimId": "M3-LR",
                "trimName": "Long Range AWD",
                "price": 47740,
                "isAvailable": true,
                "specs": {
                  "range": {
                    "epaEstimate": 333,
                    "units": "miles"
                  },
                  "battery": {
                    "capacity": 82,
                    "units": "kWh",
                    "chemistry": "NCA"
                  },
                  "motor": {
                    "drivetrain": "Dual Motor AWD",
                    "horsepower": 431,
                    "torque_lb_ft": 376
                  },
                  "performance": {
                    "zeroToSixtyMph": 4.2
                  }
                },
                "standardFeatures": ["18 Aero Wheels", "Glass Roof", "Autopilot", "Premium Interior", "Heated front and rear seats"],
                "availablePackages": ["TSLA-EAP", "TSLA-FSD"]
              }
            ],
            "colorOptions": [
              { "colorName": "Pearl White Multi-Coat", "price": 0, "type": "Solid" },
              { "colorName": "Deep Blue Metallic", "price": 1000, "type": "Metallic" },
              { "colorName": "Solid Black", "price": 1500, "type": "Solid" },
              { "colorName": "Ultra Red", "price": 2000, "type": "Metallic" }
            ]
          }
        ]
      },
      {
        "brandId": "RVN",
        "brandName": "Rivian",
        "countryOfOrigin": "USA",
        "stockSymbol": "RIVN",
        "models": [
          {
            "modelId": "RVN-R1T",
            "modelName": "R1T",
            "vehicleType": "Truck",
            "productionYears": [2022, 2023, 2024, 2025],
            "baseMsrp": 73000,
            "trims": [
              {
                "trimId": "R1T-DM",
                "trimName": "Dual-Motor",
                "price": 79800,
                "isAvailable": true,
                "specs": {
                  "range": null,
                  "battery": {
                    "capacity": 135,
                    "units": "kWh",
                    "packOptions": ["Standard+", "Large", "Max"]
                  },
                  "motor": {
                    "drivetrain": "Dual Motor AWD",
                    "horsepower": 533,
                    "torque_lb_ft": 610
                  },
                  "towingCapacityLb": 11000
                },
                "standardFeatures": ["Gear Tunnel", "Air Suspension", "Driver+ Assist"],
                "availablePackages": []
              },
              {
                "trimId": "R1T-QM",
                "trimName": "Quad-Motor",
                "price": 87000,
                "isAvailable": false,
                "discontinuationNotice": "Temporarily paused for new orders; Quad-Motor configuration being redesigned.",
                "specs": {
                  "range": {
                    "epaEstimate": 328,
                    "units": "miles"
                  },
                  "battery": {
                    "capacity": 135,
                    "units": "kWh",
                    "packOptions": ["Large"]
                  },
                  "motor": {
                    "drivetrain": "Quad Motor AWD",
                    "horsepower": 835,
                    "torque_lb_ft": 908
                  },
                  "performance": {
                    "zeroToSixtyMph": 3.0
                  },
                  "towingCapacityLb": 11000
                },
                "standardFeatures": ["Gear Tunnel", "Air Suspension", "Driver+ Assist", "Per-wheel torque vectoring"],
                "availablePackages": [
                  {
                    "packageId": "RVN-ADV",
                    "packageName": "Adventure Package",
                    "packagePrice": 4500,
                    "includedOptions": ["Meridian Sound System", "Perforated Vegan Leather", "Heated and Ventilated Seats", "Natural-grained ash wood interior"],
                    "conflictsWith": null
                  }
                ]
              }
            ]
          },
          {
            "modelId": "RVN-R1S",
            "modelName": "R1S",
            "vehicleType": "SUV",
            "productionYears": [2022, 2023, 2024, 2025],
            "baseMsrp": 78000,
            "trims": []
          }
        ]
      },
      {
        "brandId": "FORD",
        "brandName": "Ford Motor Company",
        "countryOfOrigin": "USA",
        "stockSymbol": "F",
        "models": [
          {
            "modelId": "FORD-MME",
            "modelName": "Mustang Mach-E",
            "vehicleType": "SUV",
            "productionYears": [2021, 2022, 2023, 2024],
            "baseMsrp": 42995,
            "trims": [
              {
                "trimId": "MME-GT",
                "trimName": "GT",
                "price": 59995,
                "isAvailable": true,
                "specs": {
                  "range": {
                    "epaEstimate": 270,
                    "units": "miles"
                  },
                  "battery": {
                    "capacity": 91,
                    "units": "kWh",
                    "notes": "Extended Range Battery is standard on GT"
                  },
                  "motor": {
                    "drivetrain": "eAWD",
                    "horsepower": 480,
                    "torque_lb_ft": 600
                  },
                  "performance": {
                    "zeroToSixtyMph": 3.8
                  }
                },
                "standardFeatures": ["20 Machined-Face Aluminum Wheels", "Unbridled Extend Drive Mode", "MagneRide Damping System"],
                "availablePackages": [
                  {
                    "packageId": "FORD-GTP",
                    "packageName": "GT Performance Edition",
                    "packagePrice": 6000,
                    "includedOptions": ["Performance Gray ActiveX Seating Material", "Fixed-position front-row head restraints", "Aluminum instrument panel"],
                    "notes": "Increases torque to 634 lb.-ft. and lowers 0-60 to 3.5s"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
`,Sm=`
{
  "kingdom": "Animalia",
  "invertebrates": [
    {
      "phylum": "Arthropoda",
      "characteristics": {
        "segmentedBody": true,
        "exoskeleton": true,
        "jointedAppendages": true,
        "examples": ["insects", "spiders", "crustaceans"]
      },
      "classes": [
        {
          "name": "Insecta",
          "orders": [
            {
              "name": "Lepidoptera",
              "exampleSpecies": [
                {
                  "scientificName": "Danaus plexippus",
                  "commonName": "Monarch butterfly",
                  "wingspanCm": 10.2,
                  "isPollinator": true,
                  "lifespanDays": null
                }
              ]
            },
            {
              "name": "Coleoptera",
              "exampleSpecies": [
                {
                  "scientificName": "Coccinella septempunctata",
                  "commonName": "Seven-spot ladybird",
                  "diet": ["aphids", "mites"],
                  "venomous": false
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "phylum": "Mollusca",
      "characteristics": {
        "softBody": true,
        "mantle": true,
        "shell": "variable"
      },
      "classes": [
        {
          "name": "Cephalopoda",
          "orders": [
            {
              "name": "Octopoda",
              "exampleSpecies": [
                {
                  "scientificName": "Octopus vulgaris",
                  "camouflageAbility": true,
                  "arms": 8,
                  "brainMassG": 10.0
                }
              ]
            }
          ]
        },
        {
          "name": "Gastropoda",
          "orders": [
            {
              "name": "Stylommatophora",
              "exampleSpecies": [
                {
                  "scientificName": "Cornu aspersum",
                  "commonName": "Garden snail",
                  "shellPresent": true,
                  "nocturnal": true,
                  "averageSpeedMph": 0.03
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "phylum": "Cnidaria",
      "characteristics": {
        "radialSymmetry": true,
        "nematocysts": true,
        "bodyForms": ["polyp", "medusa"]
      },
      "classes": [
        {
          "name": "Anthozoa",
          "orders": [],
          "note": "Includes corals and sea anemones, mostly sessile"
        }
      ]
    }
  ],
  "sources": [
    "https://en.wikipedia.org/wiki/Invertebrate",
    "https://animaldiversity.org"
  ],
  "extinctGroups": "null2222"
}
  `,Tm='{"_root":{"_elem":[{"_attrs":{"class":"page","data-role":"page"},"div":{"_elem":[{"_attrs":{"id":"motes-container"},"layer":{"_elem":[]}},{"_attrs":{"class":"brand","data-role":"brand"},"header":{"_elem":[{"_attrs":{"aria-hidden":"true","class":"brand-mark"},"div":{"_elem":["// $T$G"]}},{"_attrs":{"class":"brand-text"},"div":{"_elem":[{"_attrs":{"class":"brand-title"},"h1":{"_elem":["hson studio"]}},{"_attrs":{"class":"brand-sub"},"p":{"_elem":["workspace"]}}]}},{"_attrs":{"class":"brand-status"},"div":{"_elem":[{"_attrs":{"class":"chip status","data-status":"idle"},"span":{"_elem":["IDLE"]}},{"_attrs":{"class":"chip counter","data-key":"3way"},"span":{"_elem":["3-way:",{"_attrs":{"data-field":"count-3way"},"b":{"_elem":["0"]}}]}},{"_attrs":{"class":"chip counter","data-key":"fixtures"},"span":{"_elem":["fixtures:",{"_attrs":{"data-field":"count-fixtures"},"b":{"_elem":["0"]}}]}}]}}]}},{"section":{"_elem":[{"_attrs":{"id":"mouse-tracker"},"div":{"_elem":[{"_attrs":{"id":"coords"},"pre":{"_elem":["X:0000 Y:0000"]}},{"_attrs":{"id":"pointer"},"div":{"_elem":["▲"]}}]}}]}},{"_attrs":{"class":"parsing","data-role":"parsing-row"},"section":{"_elem":[{"_attrs":{"class":"parse-card json","data-role":"panel-json"},"article":{"_elem":[{"_attrs":{"class":"card-head"},"header":{"_elem":[{"_attrs":{"class":"title-json"},"h4":{"_elem":["JSON"]}},{"_attrs":{"class":"actions"},"div":{"_elem":[{"_attrs":{"class":"btn","data-action":"copy-json"},"button":{"_elem":["copy"]}}]}}]}},{"_attrs":{"class":"card-body"},"div":{"_elem":[{"_attrs":{"class":"editor","data-input":"json","placeholder":"{...}","spellcheck":"false"},"textarea":{"_elem":[]}}]}},{"_attrs":{"class":"card-foot"},"footer":{"_elem":[{"_attrs":{"class":"chip validity","data-valid":"false"},"span":{"_elem":["invalid"]}},{"_attrs":{"class":"chip metric bytes","data-field":"json-bytes"},"span":{"_elem":["0 bytes"]}}]}}]}},{"_attrs":{"class":"parse-card hson","data-role":"panel-hson"},"article":{"_elem":[{"_attrs":{"class":"card-head"},"header":{"_elem":[{"_attrs":{"class":"title-hson"},"h4":{"_elem":["HSON"]}},{"_attrs":{"class":"actions"},"div":{"_elem":[{"_attrs":{"class":"btn","data-action":"copy-hson"},"button":{"_elem":["copy"]}}]}}]}},{"_attrs":{"class":"card-body"},"div":{"_elem":[{"_attrs":{"class":"editor","data-input":"hson","placeholder":"‹...›","spellcheck":"false"},"textarea":{"_elem":[]}}]}},{"_attrs":{"class":"card-foot"},"footer":{"_elem":[{"_attrs":{"class":"chip validity","data-valid":"false"},"span":{"_elem":["invalid"]}},{"_attrs":{"class":"chip metric bytes","data-field":"hson-bytes"},"span":{"_elem":["0 bytes"]}}]}}]}},{"_attrs":{"class":"parse-card html","data-role":"panel-html"},"article":{"_elem":[{"_attrs":{"class":"card-head"},"header":{"_elem":[{"_attrs":{"class":"title"},"h4":{"_elem":["HTML"]}},{"_attrs":{"class":"actions"},"div":{"_elem":[{"_attrs":{"class":"btn","data-action":"copy-html"},"button":{"_elem":["copy"]}}]}}]}},{"_attrs":{"class":"card-body"},"div":{"_elem":[{"_attrs":{"class":"editor","data-input":"html","placeholder":"‹...‹/","spellcheck":"false"},"textarea":{"_elem":[]}}]}},{"_attrs":{"class":"card-foot"},"footer":{"_elem":[{"_attrs":{"class":"chip validity","data-valid":"false"},"span":{"_elem":["invalid"]}},{"_attrs":{"class":"chip metric bytes","data-field":"html-bytes"},"span":{"_elem":["0 bytes"]}}]}}]}}]}},{"_attrs":{"class":"main","data-role":"main"},"main":{"_elem":[{"_attrs":{"class":"demo-card","data-role":"demo"},"section":{"_elem":[{"_attrs":{"class":"demo-head"},"header":{"_elem":[{"_attrs":{"class":"title"},"h2":{"_elem":["working"]}},{"_attrs":{"class":"demo-actions"},"div":{"_elem":[{"_attrs":{"class":"btn","data-action":"start"},"button":{"_elem":["start"]}},{"_attrs":{"class":"btn","data-action":"stop"},"button":{"_elem":["stop"]}},{"_attrs":{"class":"btn","data-action":"reset"},"button":{"_elem":["reset"]}}]}}]}},{"_attrs":{"class":"demo-body"},"div":{"_elem":[{"_attrs":{"aria-label":"demo-area","class":"demo-placeholder"},"div":{"_elem":[{"_attrs":{"class":"muted"},"p":{"_elem":["Ready."]}}]}}]}}]}}]}},{"_attrs":{"class":"side","data-role":"side"},"aside":{"_elem":[{"_attrs":{"class":"panel diag","data-role":"diagnostics"},"section":{"_elem":[{"_attrs":{"class":"panel-head"},"header":{"_elem":[{"_attrs":{"class":"title"},"h3":{"_elem":["results"]}}]}},{"_attrs":{"class":"panel-body"},"div":{"_elem":[{"_attrs":{"class":"kv"},"ul":{"_elem":[{"li":{"_elem":[{"_attrs":{"class":"k"},"span":{"_elem":["tests:"]}},{"_attrs":{"class":"v","data-field":"tests-total"},"span":{"_elem":["0"]}}]}},{"li":{"_elem":[{"_attrs":{"class":"k"},"span":{"_elem":["ok:"]}},{"_attrs":{"class":"v ok","data-field":"tests-ok"},"span":{"_elem":["0"]}}]}},{"li":{"_elem":[{"_attrs":{"class":"k"},"span":{"_elem":["fail:"]}},{"_attrs":{"class":"v err","data-field":"tests-fail"},"span":{"_elem":["0"]}}]}},{"li":{"_elem":[{"_attrs":{"class":"k"},"span":{"_elem":["bytes:"]}},{"_attrs":{"class":"v","data-field":"bytes"},"span":{"_elem":["0"]}}]}}]}}]}}]}}]}},{"_attrs":{"class":"panel console","data-role":"console"},"section":{"_elem":[{"_attrs":{"class":"panel-head"},"header":{"_elem":[{"_attrs":{"class":"title"},"h3":{"_elem":["console"]}},{"_attrs":{"class":"actions"},"div":{"_elem":[{"_attrs":{"class":"btn clear","data-action":"console-clear"},"button":{"_elem":["clear"]}}]}}]}},{"_attrs":{"class":"panel-body"},"div":{"_elem":[{"_attrs":{"aria-live":"polite","class":"log","data-field":"console-log"},"pre":{"_elem":[]}}]}},{"_attrs":{"class":"demo-foot"},"footer":{"_elem":[{"_attrs":{"class":"chip mode","data-mode":"html"},"span":{"_elem":["mode: html"]}},{"_attrs":{"class":"chip metric bytes"},"span":{"_elem":["0 bytes"]}}]}}]}}]}}]}}',Am=`
 <div class="page" data-role="page">

    <!-- Brand / heading cluster (top-left ~20%) -->
    <header class="brand" data-role="brand">
      <div class="brand-mark" aria-hidden="true">// $T$G</div>
      <div class="brand-text">
        <h1 class="brand-title">HSON studio</h1>
        <p class="brand-sub">workspace</p>
      </div>
      <div class="brand-status">
        <span class="chip status" data-status="idle">IDLE</span>
        <span class="chip counter" data-key="3way">3-way: <b data-field="count-3way">0</b></span>
        <span class="chip counter" data-key="fixtures">fixtures: <b data-field="count-fixtures">0</b></span>
      </div>
    </header>

    <!-- Main attraction (center ~60%) -->
    <main class="main" data-role="main">
      <section class="demo-card" data-role="demo">
        <header class="demo-head">
          <h2 class="title">working</h2>
          <div class="demo-actions">
            <button class="btn" data-action="start">start</button>
            <button class="btn" data-action="stop">stop</button>
            <button class="btn" data-action="reset">reset</button>
          </div>
        </header>
        <div class="demo-body">
          <div class="demo-placeholder" aria-label="demo-area">
            <!-- LiveTree will mount content here -->
            <p class="muted">Ready.</p>
          </div>
        </div>
      </section>
    </main>
    
    <!-- Diagnostics / console (right column) -->
    <aside class="side" data-role="side">
      <section class="panel diag" data-role="diagnostics">
        <header class="panel-head"><h3 class="title">results</h3></header>
        <div class="panel-body">
          <ul class="kv">
            <li><span class="k">tests:</span><span class="v" data-field="tests-total">0</span></li>
            <li><span class="k">ok:</span><span class="v ok" data-field="tests-ok">0</span></li>
            <li><span class="k">fail:</span><span class="v err" data-field="tests-fail">0</span></li>
            <li><span class="k">bytes:</span><span class="v" data-field="bytes">0</span></li>
          </ul>
        </div>
      </section>
    </aside>
    
    <section class="panel console" data-role="console">
      <header class="panel-head">
        <h3 class="title">console</h3>
        <div class="actions">
          <button class="btn clear" data-action="console-clear">clear</button>
        </div>
      </header>
      <div class="panel-body">
        <pre class="log" data-field="console-log" aria-live="polite"></pre>
      </div>
      <footer class="demo-foot">
        <span class="chip mode" data-mode="html">mode: html</span>
        <span class="chip metric bytes">0 bytes</span>
      </footer>
      </section>

    <!-- Parsing panels row (bottom): JSON → HSON → HTML -->
    <section class="parsing" data-role="parsing-row">
      <article class="parse-card json" data-role="panel-json">
        <header class="card-head">
          <h4 class="title-json">JSON</h4>
          <div class="actions">
            <button class="btn" data-action="copy-json">copy</button>
          </div>
        </header>
        <div class="card-body">
          <textarea class="editor" spellcheck="false" data-input="json" placeholder="{...}"></textarea>
        </div>
        <footer class="card-foot">
          <span class="chip validity" data-valid="false">invalid</span>
          <span class="chip metric bytes" data-field="json-bytes">0 bytes</span>
        </footer>
      </article>

      <article class="parse-card hson" data-role="panel-hson">
        <header class="card-head">
          <h4 class="title-hson">HSON</h4>
          <div class="actions">
            <button class="btn" data-action="copy-hson">copy</button>
          </div>
        </header>
        <div class="card-body">
          <textarea class="editor" spellcheck="false" data-input="hson" placeholder="‹...›"></textarea>
        </div>
        <footer class="card-foot">
          <span class="chip validity" data-valid="false">invalid</span>
          <span class="chip metric bytes" data-field="hson-bytes">0 bytes</span>
        </footer>
      </article>

      <article class="parse-card html" data-role="panel-html">
        <header class="card-head">
          <h4 class="title">HTML</h4>
          <div class="actions">
            <button class="btn" data-action="copy-html">copy</button>
          </div>
        </header>
        <div class="card-body">
          <textarea class="editor" spellcheck="false" data-input="html" placeholder="‹...‹/"></textarea>
        </div>
        <footer class="card-foot">
          <span class="chip validity" data-valid="false">invalid</span>
          <span class="chip metric bytes" data-field="html-bytes">0 bytes</span>
        </footer>
      </article>
    </section>

  </div>


`;function Le(e,t,n){return`<${e}${Mm(t)}>${n}</${e}>`}function Mm(e){const t=[];for(const[n,a]of Object.entries(e))a===!0?t.push(n):t.push(`${n}="${Em(typeof a=="string"?a:String(a))}"`);return t.length?" "+t.join(" "):""}function Em(e){return e.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}const P=e=>Object.freeze(e);function Om(e,t){const n=[];for(const a of e)for(const i of t)n.push({name:`${a.name}_|_${i.name}`,a:a.value,b:i.value});return n.map(a=>P(a))}function Wm(e){const t=[{name:"p",value:"p"},{name:"div",value:"div"},{name:"section",value:"section"},{name:"custom-name",value:"custom-name"},{name:"span",value:"span"},{name:"pre",value:"pre"},{name:"article",value:"article"},{name:"xlinkish",value:"x:tag"},{name:"svga",value:"svga"},{name:"vsn_like",value:"_vsn"}],n=[{name:"none",value:{}},{name:"id",value:{id:"one-attr"}},{name:"class_lang",value:{class:"a b b a",lang:"en"}},{name:"boolean",value:{disabled:!0,required:!0}},{name:"quotes",value:{title:'"no"'}},{name:"empty_attr",value:{title:""}},{name:"data_num",value:{"data-n":"0"}},{name:"data_multi",value:{"data-a":"1","data-b":"two","data-c":"III"}},{name:"attr_punct",value:{"aria-label":"ok","data_x.y":"dot","data_x:y":"colon"}},{name:"bool_mix",value:{disabled:!0,required:!1,readonly:!0}},{name:"attr_amp",value:{title:"A & B"}},{name:"attr_angles",value:{title:"x < y > z"}},{name:"attr_spaces",value:{title:"  lead  mid   tail  "}}],a=[{name:"plain",value:"basic paragraph"},{name:"unicode",value:"é = é; 漢字✓"},{name:"amp_lt_gt",value:"A & B < C > D"},{name:"quotes",value:'He said "hi"'},{name:"empty",value:""},{name:"spaces",value:"   "},{name:"lf",value:`line1
line2`},{name:"crlf",value:`line1\r
line2`},{name:"edge_newlines",value:`
line
`},{name:"tabs",value:"a	b	c"},{name:"spaced_text",value:"  a   b    c  "}],i=[{name:"single",apply:(h,d,m)=>Le(h,d,m)},{name:"wrapped_div",apply:(h,d,m)=>Le("div",{},Le(h,d,m))},{name:"siblings_h2_p",apply:(h,d,m)=>`<root><h2>sib</h2>${Le(h,d,m)}</root>`},{name:"mixed_text_nodes",apply:(h,d,m)=>Le(h,d,`pre ${m} post`)},{name:"void_hr_between",apply:(h,d,m)=>`<root><p>line one</p><hr />${Le(h,d,m)}<p>line two</p></root>`},{name:"deep_nest_3",apply:(h,d,m)=>`<root>${Le("div",{},Le("section",{},Le(h,d,m)))}</root>`},{name:"two_siblings_same",apply:(h,d,m)=>`<root>${Le(h,d,m)}${Le(h,d,m)}</root>`},{name:"void_embed_adjacent",apply:(h,d,m)=>`<root>${Le(h,d,m)}<embed src="x.swf" /></root>`}],s=Om(t,n),o=[];for(const h of s)for(const d of a)for(const m of i)o.push(P({name:`html__${h.name}__${d.name}__${m.name}`,fmt:"html",atom:m.apply(h.a,h.b,d.value),tags:P(["generated","html","base",`shape:${m.name}`])}));if(!e)return P(o);const r=Math.max(0,e.count|0),l=e.seed>>>0;if(r<=o.length)return P(o.slice(0,r));const c=r-o.length,p=kn(l),u=h=>h[Math.floor(p()*h.length)],b=[];for(let h=0;h<c;h++){const d=u(t),m=u(n),v=u(a),w=u(i);b.push(P({name:`html__fuzz__${l}__${String(h).padStart(4,"0")}__${d.name}__${m.name}__${v.name}__${w.name}`,fmt:"html",atom:w.apply(d.value,m.value,v.value),tags:P(["generated","html","fuzz",`seed:${l}`,`shape:${w.name}`])}))}return P([...o,...b].map(P))}const Nm={simpleObject:'{"test_case": "simpleObject", "value": 1}',nestedObject:'{"test_case": "nestedObject", "data": {"nested": true}}',simpleArray:'["simpleArray", "item_one", "item_two"]',arrayOfObjects:'[{"test_case": "arrayOfObjects"}, {"item": 1}, {"item": 2}]',mixedTypes:`{
        "test_case": "mixedTypes",
        "a_string": "string value",
        "a_number": 123,
        "a_boolean": false,
        "a_null": null
    }`,emptyObject:"{}",emptyArray:"[]",stringWithEscapes:'{"test_case": "stringWithEscapes", "value": "line one\\nline two"}'},Cm={kv:'{ "name": "HSON" }',basicObj:'{ "details": { "version": "1.0" } }',boolObj:'{ "details": { "boolval": true, "stringbool": "true" } }',nullObj:'{ "details": { "null": null } }',prop2Obj:'{ "info": { "name": "HSON", "status": "dev" } }',arrayObj:'{ "letters": ["alpha", "beta"] }',primitives:`{
    "parsedDigit": 1,
    "stringDigit": "2",
    "booleanValue": false,
    "nullValue": null,
    "stringNull": "null",
    "stringword": "string"
  }`,arrays:`[
    "a", "two", 3, true, "false", "5", null
  ]`,complexArrays:`{
    "parent": {
      "subParent": [
        "item 2",
        [],
        "item 3",
        [],
        {
          "subParent2": [
            { "array1": [1, 2, 3, 4] },
            { "array2": ["x", "y", "z", "a"] },
            { "array3": ["x", "y", "z", "a"] }
          ]
        }
      ]

    }
  }`,numbers:`{
    "stringNumbers": ["1", "2", "3", "4", "5"],
    "parsedNumbers": [1, 2, 3, 4, 5]
  }`},jm={heterogeneousArrayDeep:`[
            { "a": 1 },
            2,
            "x",
            null,
            true,
            { "b": [1, { "c": null }, []] },
            []
        ]`,indexWidth:"[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]",emptiesEverywhere:`{
            "emptyObj": {},
            "emptyArr": [],
            "nested": [{}, []],
            "emptyStr": ""
        }`,unicodeAndBidi:`{
            "emoji": "🧪🚀",
            "combining": "é",
            "rtl_override": "‮abc‬",
            "astral_pair": "🚀"
        }`,htmlLikeSubstrings:`{
            "looksLikeTag": "<notatag>",
            "commentLike": "<!-- not a comment -->",
            "entities": "&copy; &notanentity;"
        }`,numbersCorner:`{
            "int": 0,
            "negZero": -0,
            "float": 1.0,
            "exp": 1e-9,
            "big": 900719925479993
        }`,deepNesting:'{ "a": { "b": { "c": { "d": { "e": { "f": 1 } } } } } }',mixedArrayShapes:`[
        [],
        [""],
        ["", ""],
        [null],
        [[1, 2], []]
    ]`},eo=P({json__Rudiments:Nm,json__Samples:Cm,json__nastyJson:jm,json__biggish:{json__CARS:xm,json__invertebrae:Sm,json__homepage:Tm}}),to=P({test:{unknownFail:{spaces:"   "},empty:{objectEmpty:{}},label:"xml-escape-regression-sentry",notes:["If XML parse fails, search emitted HTML for raw '&', '<', ']]>' or invalid control chars in text nodes.","Backslashes are usually fine; '&' and '<' are the classic killers."],atoms:{plain:"alpha",empty:"",tab:"tab:	one",newline:`newline:
line2`,crlf:`crlf:\r
line2`,backslash_end:"backslash at end: \\",backslash_runs:"runs: \\\\ \\\\\\\\",quote_dbl:'quote: "hi"',quote_sgl:"apostrophe: 'hi'",amp:"ampersand: &",ltgt:"angles: &lt;soon&gt; and &lt;/soon&gt;",combo:'combo: "hi" &amp; &lt;soon&gt; \\\\ /',xml_entities_literal:"literal entities: &lt; &gt; &amp; &quot; (these should stay literal unless you double-escape)",xml_cdata_end:"cdata end marker: ]]> (must be escaped in text context if you ever emit CDATA)",looks_like_tag:'<tag attr="x">inner</tag>',weird_unicode:"unicode: 漢字✓ é ZWJ 👩‍💻 ZWNJ ‌",pathy:"C:\\temp\\file.txt",jsonish:'{"a":1,"b":"<x>&</x>"}'},arrays:["ampersand: &","angles: <x>","backslash: \\",["nested-arr: &","nested-arr: <","nested-arr: ]]>","nested-arr: \\"],{in_array_obj:'array-obj: "hi" & <x> \\'}],objects:{o1:{k:`obj: & < > \\ " '`,arr:[{deep:{deeper:["leaf: &","leaf: <soon>","leaf: backslash \\","leaf: ]]>",{leaf_obj:'leaf-obj: & <soon> \\ "hi"'}]}}]},o2:{data:[null,!0,!1,0,-0,1.25,-3.5,1e-9],strings:{s1:"A & B",s2:"A < B",s3:"A > B",s4:"A ]]> B",s5:"A \\ B"}}},stress_grid:[{a:"&",b:"<",c:">",d:"]]>",e:"\\",f:'"'},{a:'mixed: & < > ]]> \\ "',b:"taggy: <span>ok</span>",c:"entity-ish: &nbsp; &copy; &amp;",d:"path: C:\\\\Users\\\\name\\\\file",e:'jsonish: {"x":"&<"}',f:`hson-ish: <meta
  "x"
>`}]}}),Lm=`<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SSI: CSS+JS inline for speed -->
  <!-- INLINED-HEAD-BEGIN -->
  <style id="inlined-styles-colors">
:root {
    /*  General.
     */
    --GW-body-background-color: #fff;
    --GW-body-text-color: #000;

    /*  Selection.
     */
    --GW-text-selection-background-color: #333;
    --GW-text-selection-color: #fff;

	/*	Links.
	 */
    --GW-body-link-color: #333;
    --GW-body-link-hover-color: #888;
    --GW-body-link-visited-color: #666;
    --GW-body-link-inverted-color: #eee;
    --GW-body-link-inverted-hover-color: #ccc;
    --GW-body-link-inverted-visited-color: #ddd;

    /*  Blockquotes.
     */
    --GW-blockquote-border-color-level-one: #ccc;
    --GW-blockquote-border-color-level-two: #c4c4c4;
    --GW-blockquote-border-color-level-three: #b3b3b3;
    --GW-blockquote-border-color-level-four: #a6a6a6;
    --GW-blockquote-background-color-level-one: #f8f8f8;
    --GW-blockquote-background-color-level-two: #e6e6e6;
    --GW-blockquote-background-color-level-three: #d8d8d8;

    /*  Abstracts.
     */
    --GW-abstract-border-color: #bbb;

	/*	Block context highlighting.
	 */
	--GW-block-context-span-highlight-color: #ddd;

    /*  Table of contents.
     */
    --GW-TOC-border-color: #ccc;
    --GW-TOC-background-color: #f8f8f8;
    --GW-TOC-collapse-button-text-color: #ccc;
    --GW-TOC-collapse-button-text-hover-color: #fff;
    --GW-TOC-collapse-button-color: rgba(248, 248, 248, 0.8);
    --GW-TOC-collapse-button-hover-color: #ddd;
    --GW-TOC-collapse-button-border-hover-color: #000;
    --GW-TOC-link-hover-background-color: #ececec;
    --GW-TOC-link-hover-color: #000;
    --GW-TOC-link-hover-indicator-bar-color: #ccc;
    --GW-TOC-number-color: #909090;
    --GW-TOC-number-hover-color: #313131;

    /*  Collapse blocks.
        */
	--GW-collapse-abstract-blockquote-hover-color: #eee;
	--GW-collapse-disclosure-button-color: #eee;
	--GW-collapse-disclosure-button-hover-color: #ddd;
	--GW-collapse-in-blockquote-disclosure-button-color: #ddd;
	--GW-collapse-in-blockquote-disclosure-button-hover-color: #ccc;
	--GW-collapse-disclosure-button-text-color: #bbb;
	--GW-collapse-disclosure-button-text-hover-color: #fff;
	--GW-collapse-in-blockquote-disclosure-button-text-color: #999;
	--GW-collapse-in-blockquote-disclosure-button-text-hover-color: #888;

	/*	Inline collapses.
	 */
	--GW-collapse-inline-disclosure-button-text-color: #555;
	--GW-collapse-inline-disclosure-button-text-hover-color: #999;

	/*	Aux-links collapse blocks.
	 */
	--GW-aux-links-collapse-border-color: #c4c4c4;

    /*  Headings.
     */
    --GW-H1-border-color: #888;
    --GW-H2-border-color: #888;

    /*  Comments.
     */
    --GW-comment-section-top-border-color: #999;

    /*  Lists.
     */
    --GW-bulleted-list-marker-color: #808080;

    /*  Figures.
     */
    --GW-figure-outline-color: #888;
    --GW-figure-caption-outline-color: #888;

	/*	Embeds.
	 */
	--GW-embed-border-color: #ddd;

    /*  Epigraphs.
     */
    --GW-epigraph-quotation-mark-color: #808080;

    /*  Footnotes.
     */
    --GW-footnote-border-color: #aaa;
    --GW-footnote-highlighted-border-color: #aaa;
    --GW-footnotes-section-top-rule-color: #ccc;
    --GW-footnote-backlink-border-color: #000;
    --GW-footnote-backlink-border-hover-color: #999;

    /*  Footnote references.
     */
    --GW-highlighted-link-outline-color: #999;

    /*  Sidenotes.
     */
    --GW-sidenote-highlight-box-shadow-color: #aaa;
    --GW-sidenote-border-color: #aaa;
    --GW-sidenote-scrollbar-thumb-color: #aaa;
    --GW-sidenote-scrollbar-thumb-hover-color: #999;
    --GW-sidenote-self-link-border-color: #aaa;

	/*	Annotations.
	 */
	--GW-section-highlighted-border-color: #666;

    /*  Tables.
     */
    --GW-table-border-color: #000;
    --GW-table-caption-border-color: #000;
    --GW-table-row-horizontal-border-color: #000;
    --GW-table-scrollbar-thumb-color: #aaa;
    --GW-table-scrollbar-thumb-hover-color: #999;
    --GW-table-scrollbar-border-color: #000;
    --GW-table-column-heading-hover-background-color: #e2f0f2;
    --GW-table-sorted-column-heading-background-color: #8bd0ed;
    --GW-table-sorted-column-heading-text-color: #fff;
    --GW-table-sorted-column-heading-text-shadow-color: #000;
    --GW-table-zebra-stripe-alternate-row-background-color: #f6f6f6;
    --GW-table-row-hover-outline-color: #000;

    /*  Code blocks.
     */
    --GW-code-element-border-color: #c8c8c8;
    --GW-code-element-background-color: #fafafa;
    --GW-pre-element-border-color: #c8c8c8;
    --GW-pre-element-background-color: #fafafa;
    --GW-pre-element-scrollbar-track-color: #fafafa;
    --GW-pre-element-scrollbar-thumb-color: #ccc;
    --GW-pre-element-scrollbar-thumb-hover-color: #999;
    --GW-code-block-line-highlight-background-color: #ffd;
    --GW-code-block-line-highlight-border-color: #ddd;
    --GW-code-block-line-number-color: #aaa;
    --GW-code-block-line-number-divider-color: #ccc;


    /*  Syntax highlight theme.
     */
    --GW-syntax-highlight-color-normal: #1f1c1b;
    --GW-syntax-highlight-color-attribute: #002561;
    --GW-syntax-highlight-color-data-type: inherit;
    --GW-syntax-highlight-color-variable: #666666;
    --GW-syntax-highlight-color-other: inherit;
    --GW-syntax-highlight-color-preprocessor: inherit;
    --GW-syntax-highlight-color-extension: #777;
    --GW-syntax-highlight-color-comment: #777;
    --GW-syntax-highlight-color-control-flow: #003900;
    --GW-syntax-highlight-color-keyword: #002561;
    --GW-syntax-highlight-color-operator: #002561;
    --GW-syntax-highlight-color-special-char: #607880;
    --GW-syntax-highlight-color-built-in: #002561;
    --GW-syntax-highlight-color-function: #002561;
    --GW-syntax-highlight-color-constant: inherit;
    --GW-syntax-highlight-color-base-n: inherit;
    --GW-syntax-highlight-color-dec-val: inherit;
    --GW-syntax-highlight-color-float: inherit;
    --GW-syntax-highlight-color-information: inherit;
    --GW-syntax-highlight-color-char: inherit;
    --GW-syntax-highlight-color-string: inherit;
    --GW-syntax-highlight-color-verbatim-string: inherit;
    --GW-syntax-highlight-color-alert: #bf0303;
    --GW-syntax-highlight-color-error: #ff0000;
    --GW-syntax-highlight-color-import: #777777;
    --GW-syntax-highlight-color-special-string: #666666;

    /*  Math.
     */
    --GW-math-block-background-color: #f6f6f6;
    --GW-math-block-background-color-flash: #fff;
    --GW-math-block-scrollbar-border-color: #ccc;
    --GW-math-block-scrollbar-thumb-color: #ccc;
    --GW-math-block-scrollbar-thumb-hover-color: #999;

    /*  Dropcaps.
     */
    --GW-dropcaps-goudy-color: #000;
    --GW-dropcaps-yinit-color: #0d0d0d;
    --GW-dropcaps-yinit-text-shadow-color: #777;
    --GW-dropcaps-de-zs-color: #1b1b1b;
    --GW-dropcaps-cheshire-color: #191919;
    --GW-dropcaps-kanzlei-color: #191919;

    /*  Admonitions.
     */
    --GW-admonition-note-left-border-color: #909090;
    --GW-admonition-note-background-color: #d8d8d8;
    --GW-admonition-tip-left-border-color: #d8d8d8;
    --GW-admonition-tip-background-color: #f0f0f0;
    --GW-admonition-warning-left-border-color: #5a5a5a;
    --GW-admonition-warning-background-color: #9a9a9a;
    --GW-admonition-warning-text-color: #fff;
    --GW-admonition-error-left-border-color: #2d2d2d;
    --GW-admonition-error-background-color: #5a5a5a;
    --GW-admonition-error-text-color: #fff;
    --GW-admonition-reversed-link-color: #ddd;
    --GW-admonition-reversed-link-color-hover: #ccc;
    --GW-admonition-reversed-link-underline-gradient-line-color: #ccc;
    --GW-admonition-reversed-link-underline-gradient-line-color-hover: #bbb;

	/*	Footer.
	 */
    --GW-bottom-ornament-line-color: #000;

	/*	Pop-frames (popups or popins).
	 */
    --GW-popframes-object-popframe-background-color: #fff;

    --GW-extracts-options-dialog-backdrop-background-color: rgba(255, 255, 255, 0.95);
    --GW-extracts-options-dialog-background-color: var(--GW-body-background-color);
    --GW-extracts-options-dialog-border-color: #aaa;
    --GW-extracts-options-dialog-box-shadow-color: #444;
    --GW-extracts-options-dialog-horizontal-rule-color: #ccc;
    --GW-extracts-options-dialog-button-background-color: var(--GW-body-background-color);
    --GW-extracts-options-dialog-button-text-color: #000;
    --GW-extracts-options-dialog-button-border-color: #000;
    --GW-extracts-options-dialog-button-hover-box-shadow-color: #000;
    --GW-extracts-options-dialog-option-button-explanation-text-color: #777;
    --GW-extracts-options-dialog-option-button-hover-text-color: #777;
    --GW-extracts-options-dialog-radio-button-border-color: #000;

    /*  Popups.
     */
    --GW-popups-popup-background-color: var(--GW-body-background-color);

    --GW-popups-popup-border-color: #ccc;
    --GW-popups-popup-box-shadow-color: #ccc;
    --GW-popups-popup-border-focused-color: #aaa;
    --GW-popups-popup-box-shadow-focused-color: #aaa;

    --GW-popups-popup-title-bar-background-color: #fff;
    --GW-popups-popup-title-bar-button-color: #bbb;
    --GW-popups-popup-title-bar-button-color-hover: #000;
    --GW-popups-popup-title-bar-button-color-disabled: #eee;
	--GW-popups-popup-title-color: #aaa;
    --GW-popups-popup-title-link-hover-color: var(--GW-body-link-hover-color);
    --GW-popups-popup-title-bar-button-focused-color: #777;
    --GW-popups-popup-title-bar-button-focused-color-hover: #000;
    --GW-popups-popup-title-bar-button-focused-color-disabled: #ddd;
    --GW-popups-popup-title-bar-submenu-box-shadow-color: #ddd;
	--GW-popups-popup-title-focused-color: #000;
    --GW-popups-popup-title-link-hover-focused-color: var(--GW-body-link-hover-color);

    --GW-popups-popup-scrollbar-thumb-color: #ddd;
    --GW-popups-popup-scrollbar-thumb-hover-color: #bbb;
    --GW-popups-popup-scrollbar-thumb-focused-color: #ccc;
    --GW-popups-popup-scrollbar-thumb-hover-focused-color: #999;

    /*  Popins.
     */
    --GW-popins-popin-background-color: var(--GW-body-background-color);

    --GW-popins-popin-border-color: #aaa;
    --GW-popins-popin-backdrop-color: rgba(0, 0, 0, 0.4);
    --GW-popins-popin-box-shadow-color: #aaa;

    --GW-popins-popin-title-bar-background-color: #fff;
    --GW-popins-popin-title-bar-button-color: #777;

    --GW-popins-popin-scrollbar-thumb-color: #ccc;
    --GW-popins-popin-scrollbar-thumb-hover-color: #999;

    --GW-popins-popin-stack-counter-text-color: #fff;
    --GW-popins-popin-stack-counter-background-color: #bbb;

    /*  Image focus.
     */
    --GW-image-focus-image-hover-drop-shadow-color: #777;

	/*	Page toolbar.
	 */
    --GW-page-toolbar-border-color: #aaa;
	--GW-page-toolbar-control-button-color: #aaa;
	--GW-page-toolbar-control-button-active-color: #000;

	/*	Page toolbar widgets.
	 */
	--GW-page-toolbar-button-icon-color: #aaa;
	--GW-page-toolbar-button-selectable-icon-color: #e4e4e4;
	--GW-page-toolbar-button-selected-icon-color: #777;
    --GW-page-toolbar-button-text-color: #666;
    --GW-page-toolbar-button-disabled-text-color: #ccc;
    --GW-page-toolbar-button-highlighted-text-color: #000;

	/*	Reader mode.
	 */
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-background-color: rgba(0, 0, 0, 0.8);
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-text-color: #fff;
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-text-shadow-color: #000;
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-key-icon-border-color: #bbb;
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-key-icon-background-color: #444;

	/*	“Back to top” link.
	 */
	--GW-back-to-top-link-color: #ccc;
	--GW-back-to-top-link-hover-color: #999;

	/*	Mobile floating header.
	 */
	--GW-floating-header-box-shadow-color: #ccc;
	--GW-floating-header-scroll-indicator-color: #999;

	/*	“Skip to content” accessibility link.
	 */
	--GW-skip-to-content-text-color: #fff;
	--GW-skip-to-content-border-color: #fff;
	--GW-skip-to-content-background-color: #bf1722;

	/*	Nav header.
	 */
	--GW-nav-header-link-color: #888;
	--GW-nav-header-link-hover-color: #000;

	/*	X of the day.
	 */
	--GW-x-of-the-day-border-color: #ccc;
}
:root {
    --GW-popups-popup-title-bar-pattern: var(--GW-image-pattern-dotted-e6e6e6-on-fff-2x-gif);
    --GW-popups-popup-title-bar-pattern-focused: var(--GW-image-pattern-dotted-fff-on-e6e6e6-2x-gif);

	--GW-checkerboard-scrollbar-background-image: var(--GW-image-checkerboard-777-fff-2x-gif);
	--GW-checkerboard-scrollbar-hover-background-image: var(--GW-image-checkerboard-000-fff-2x-gif);
}
</style>
<style id="inlined-styles-colors-dark" media="all and (prefers-color-scheme: dark)">
:root {
    /*  General.
     */
    --GW-body-background-color: #000;
    --GW-body-text-color: #fff;

    /*  Selection.
     */
    --GW-text-selection-background-color: #dcdcdc;
    --GW-text-selection-color: #000;

	/*	Links.
	 */
    --GW-body-link-color: #dcdcdc;
    --GW-body-link-hover-color: #999;
    --GW-body-link-visited-color: #b4b4b4;
    --GW-body-link-inverted-color: #333;
    --GW-body-link-inverted-hover-color: #5c5c5c;
    --GW-body-link-inverted-visited-color: #494949;

    /*  Blockquotes.
     */
    --GW-blockquote-border-color-level-one: #5c5c5c;
    --GW-blockquote-border-color-level-two: #646464;
    --GW-blockquote-border-color-level-three: #747474;
    --GW-blockquote-border-color-level-four: #7f7f7f;
    --GW-blockquote-background-color-level-one: #212121;
    --GW-blockquote-background-color-level-two: #3e3e3e;
    --GW-blockquote-background-color-level-three: #4f4f4f;

    /*  Abstracts.
     */
    --GW-abstract-border-color: #6c6c6c;

	/*	Block context highlighting.
	 */
	--GW-block-context-span-highlight-color: #494949;

    /*  Table of contents.
     */
    --GW-TOC-border-color: #5c5c5c;
    --GW-TOC-background-color: #212121;
    --GW-TOC-collapse-button-text-color: #5c5c5c;
    --GW-TOC-collapse-button-text-hover-color: #000;
    --GW-TOC-collapse-button-color: rgba(33, 33, 33, 0.8);
    --GW-TOC-collapse-button-hover-color: #494949;
    --GW-TOC-collapse-button-border-hover-color: #fff;
    --GW-TOC-link-hover-background-color: #363636;
    --GW-TOC-link-hover-color: #fff;
    --GW-TOC-link-hover-indicator-bar-color: #5c5c5c;
    --GW-TOC-number-color: #929292;
    --GW-TOC-number-hover-color: #ddd;

    /*  Collapse blocks.
        */
	--GW-collapse-abstract-blockquote-hover-color: #333;
	--GW-collapse-disclosure-button-color: #333;
	--GW-collapse-disclosure-button-hover-color: #494949;
	--GW-collapse-in-blockquote-disclosure-button-color: #494949;
	--GW-collapse-in-blockquote-disclosure-button-hover-color: #5c5c5c;
	--GW-collapse-disclosure-button-text-color: #6c6c6c;
	--GW-collapse-disclosure-button-text-hover-color: #000;
	--GW-collapse-in-blockquote-disclosure-button-text-color: #8b8b8b;
	--GW-collapse-in-blockquote-disclosure-button-text-hover-color: #999;

	/*	Inline collapses.
	 */
	--GW-collapse-inline-disclosure-button-text-color: #c1c1c1;
	--GW-collapse-inline-disclosure-button-text-hover-color: #8b8b8b;

	/*	Aux-links collapse blocks.
	 */
	--GW-aux-links-collapse-border-color: #646464;

    /*  Headings.
     */
    --GW-H1-border-color: #999;
    --GW-H2-border-color: #999;

    /*  Comments.
     */
    --GW-comment-section-top-border-color: #8b8b8b;

    /*  Lists.
     */
    --GW-bulleted-list-marker-color: #9f9f9f;

    /*  Figures.
     */
    --GW-figure-outline-color: #999;
    --GW-figure-caption-outline-color: #999;

	/*	Embeds.
	 */
	--GW-embed-border-color: #494949;

    /*  Epigraphs.
     */
    --GW-epigraph-quotation-mark-color: #9f9f9f;

    /*  Footnotes.
     */
    --GW-footnote-border-color: #7c7c7c;
    --GW-footnote-highlighted-border-color: #7c7c7c;
    --GW-footnotes-section-top-rule-color: #5c5c5c;
    --GW-footnote-backlink-border-color: #fff;
    --GW-footnote-backlink-border-hover-color: #8b8b8b;

    /*  Footnote references.
     */
    --GW-highlighted-link-outline-color: #8b8b8b;

    /*  Sidenotes.
     */
    --GW-sidenote-highlight-box-shadow-color: #7c7c7c;
    --GW-sidenote-border-color: #7c7c7c;
    --GW-sidenote-scrollbar-thumb-color: #7c7c7c;
    --GW-sidenote-scrollbar-thumb-hover-color: #8b8b8b;
    --GW-sidenote-self-link-border-color: #7c7c7c;

	/*	Annotations.
	 */
	--GW-section-highlighted-border-color: #b4b4b4;

    /*  Tables.
     */
    --GW-table-border-color: #fff;
    --GW-table-caption-border-color: #fff;
    --GW-table-row-horizontal-border-color: #fff;
    --GW-table-scrollbar-thumb-color: #7c7c7c;
    --GW-table-scrollbar-thumb-hover-color: #8b8b8b;
    --GW-table-scrollbar-border-color: #fff;
    --GW-table-column-heading-hover-background-color: #2b3637;
    --GW-table-sorted-column-heading-background-color: #216983;
    --GW-table-sorted-column-heading-text-color: #000;
    --GW-table-sorted-column-heading-text-shadow-color: #fff;
    --GW-table-zebra-stripe-alternate-row-background-color: #252525;
    --GW-table-row-hover-outline-color: #fff;

    /*  Code blocks.
     */
    --GW-code-element-border-color: #606060;
    --GW-code-element-background-color: #1d1d1d;
    --GW-pre-element-border-color: #606060;
    --GW-pre-element-background-color: #1d1d1d;
    --GW-pre-element-scrollbar-track-color: #1d1d1d;
    --GW-pre-element-scrollbar-thumb-color: #5c5c5c;
    --GW-pre-element-scrollbar-thumb-hover-color: #8b8b8b;
    --GW-code-block-line-highlight-background-color: #171600;
    --GW-code-block-line-highlight-border-color: #494949;
    --GW-code-block-line-number-color: #7c7c7c;
    --GW-code-block-line-number-divider-color: #5c5c5c;


    /*  Syntax highlight theme.
     */
    --GW-syntax-highlight-color-normal: #f1edec;
    --GW-syntax-highlight-color-attribute: #b9e8ff;
    --GW-syntax-highlight-color-data-type: inherit;
    --GW-syntax-highlight-color-variable: #b4b4b4;
    --GW-syntax-highlight-color-other: inherit;
    --GW-syntax-highlight-color-preprocessor: inherit;
    --GW-syntax-highlight-color-extension: #a6a6a6;
    --GW-syntax-highlight-color-comment: #a6a6a6;
    --GW-syntax-highlight-color-control-flow: #b4edaf;
    --GW-syntax-highlight-color-keyword: #b9e8ff;
    --GW-syntax-highlight-color-operator: #b9e8ff;
    --GW-syntax-highlight-color-special-char: #94adb6;
    --GW-syntax-highlight-color-built-in: #b9e8ff;
    --GW-syntax-highlight-color-function: #b9e8ff;
    --GW-syntax-highlight-color-constant: inherit;
    --GW-syntax-highlight-color-base-n: inherit;
    --GW-syntax-highlight-color-dec-val: inherit;
    --GW-syntax-highlight-color-float: inherit;
    --GW-syntax-highlight-color-information: inherit;
    --GW-syntax-highlight-color-char: inherit;
    --GW-syntax-highlight-color-string: inherit;
    --GW-syntax-highlight-color-verbatim-string: inherit;
    --GW-syntax-highlight-color-alert: #ff8470;
    --GW-syntax-highlight-color-error: #ff4a39;
    --GW-syntax-highlight-color-import: #a6a6a6;
    --GW-syntax-highlight-color-special-string: #b4b4b4;

    /*  Math.
     */
    --GW-math-block-background-color: #252525;
    --GW-math-block-background-color-flash: #000;
    --GW-math-block-scrollbar-border-color: #5c5c5c;
    --GW-math-block-scrollbar-thumb-color: #5c5c5c;
    --GW-math-block-scrollbar-thumb-hover-color: #8b8b8b;

    /*  Dropcaps.
     */
    --GW-dropcaps-goudy-color: #fff;
    --GW-dropcaps-yinit-color: #f9f9f9;
    --GW-dropcaps-yinit-text-shadow-color: #a6a6a6;
    --GW-dropcaps-de-zs-color: #efefef;
    --GW-dropcaps-cheshire-color: #f1f1f1;
    --GW-dropcaps-kanzlei-color: #f1f1f1;

    /*  Admonitions.
     */
    --GW-admonition-note-left-border-color: #929292;
    --GW-admonition-note-background-color: #4f4f4f;
    --GW-admonition-tip-left-border-color: #4f4f4f;
    --GW-admonition-tip-background-color: #303030;
    --GW-admonition-warning-left-border-color: #bdbdbd;
    --GW-admonition-warning-background-color: #8a8a8a;
    --GW-admonition-warning-text-color: #000;
    --GW-admonition-error-left-border-color: #e1e1e1;
    --GW-admonition-error-background-color: #bdbdbd;
    --GW-admonition-error-text-color: #000;
    --GW-admonition-reversed-link-color: #494949;
    --GW-admonition-reversed-link-color-hover: #5c5c5c;
    --GW-admonition-reversed-link-underline-gradient-line-color: #5c5c5c;
    --GW-admonition-reversed-link-underline-gradient-line-color-hover: #6c6c6c;

	/*	Footer.
	 */
    --GW-bottom-ornament-line-color: #fff;

	/*	Pop-frames (popups or popins).
	 */
    --GW-popframes-object-popframe-background-color: #000;

    --GW-extracts-options-dialog-backdrop-background-color: rgba(0, 0, 0, 0.95);
    --GW-extracts-options-dialog-background-color: var(--GW-body-background-color);
    --GW-extracts-options-dialog-border-color: #7c7c7c;
    --GW-extracts-options-dialog-box-shadow-color: #cecece;
    --GW-extracts-options-dialog-horizontal-rule-color: #5c5c5c;
    --GW-extracts-options-dialog-button-background-color: var(--GW-body-background-color);
    --GW-extracts-options-dialog-button-text-color: #fff;
    --GW-extracts-options-dialog-button-border-color: #fff;
    --GW-extracts-options-dialog-button-hover-box-shadow-color: #fff;
    --GW-extracts-options-dialog-option-button-explanation-text-color: #a6a6a6;
    --GW-extracts-options-dialog-option-button-hover-text-color: #a6a6a6;
    --GW-extracts-options-dialog-radio-button-border-color: #fff;

    /*  Popups.
     */
    --GW-popups-popup-background-color: var(--GW-body-background-color);

    --GW-popups-popup-border-color: #5c5c5c;
    --GW-popups-popup-box-shadow-color: #5c5c5c;
    --GW-popups-popup-border-focused-color: #7c7c7c;
    --GW-popups-popup-box-shadow-focused-color: #7c7c7c;

    --GW-popups-popup-title-bar-background-color: #000;
    --GW-popups-popup-title-bar-button-color: #6c6c6c;
    --GW-popups-popup-title-bar-button-color-hover: #fff;
    --GW-popups-popup-title-bar-button-color-disabled: #333;
	--GW-popups-popup-title-color: #7c7c7c;
    --GW-popups-popup-title-link-hover-color: var(--GW-body-link-hover-color);
    --GW-popups-popup-title-bar-button-focused-color: #a6a6a6;
    --GW-popups-popup-title-bar-button-focused-color-hover: #fff;
    --GW-popups-popup-title-bar-button-focused-color-disabled: #494949;
    --GW-popups-popup-title-bar-submenu-box-shadow-color: #494949;
	--GW-popups-popup-title-focused-color: #fff;
    --GW-popups-popup-title-link-hover-focused-color: var(--GW-body-link-hover-color);

    --GW-popups-popup-scrollbar-thumb-color: #494949;
    --GW-popups-popup-scrollbar-thumb-hover-color: #6c6c6c;
    --GW-popups-popup-scrollbar-thumb-focused-color: #5c5c5c;
    --GW-popups-popup-scrollbar-thumb-hover-focused-color: #8b8b8b;

    /*  Popins.
     */
    --GW-popins-popin-background-color: var(--GW-body-background-color);

    --GW-popins-popin-border-color: #7c7c7c;
    --GW-popins-popin-backdrop-color: rgba(255, 255, 255, 0.4);
    --GW-popins-popin-box-shadow-color: #7c7c7c;

    --GW-popins-popin-title-bar-background-color: #000;
    --GW-popins-popin-title-bar-button-color: #a6a6a6;

    --GW-popins-popin-scrollbar-thumb-color: #5c5c5c;
    --GW-popins-popin-scrollbar-thumb-hover-color: #8b8b8b;

    --GW-popins-popin-stack-counter-text-color: #000;
    --GW-popins-popin-stack-counter-background-color: #6c6c6c;

    /*  Image focus.
     */
    --GW-image-focus-image-hover-drop-shadow-color: #a6a6a6;

	/*	Page toolbar.
	 */
    --GW-page-toolbar-border-color: #7c7c7c;
	--GW-page-toolbar-control-button-color: #7c7c7c;
	--GW-page-toolbar-control-button-active-color: #fff;

	/*	Page toolbar widgets.
	 */
	--GW-page-toolbar-button-icon-color: #7c7c7c;
	--GW-page-toolbar-button-selectable-icon-color: #404040;
	--GW-page-toolbar-button-selected-icon-color: #a6a6a6;
    --GW-page-toolbar-button-text-color: #b4b4b4;
    --GW-page-toolbar-button-disabled-text-color: #5c5c5c;
    --GW-page-toolbar-button-highlighted-text-color: #fff;

	/*	Reader mode.
	 */
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-background-color: rgba(255, 255, 255, 0.8);
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-text-color: #000;
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-text-shadow-color: #fff;
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-key-icon-border-color: #6c6c6c;
	--GW-reader-mode-masked-links-key-toggle-info-alert-panel-key-icon-background-color: #cecece;

	/*	“Back to top” link.
	 */
	--GW-back-to-top-link-color: #5c5c5c;
	--GW-back-to-top-link-hover-color: #8b8b8b;

	/*	Mobile floating header.
	 */
	--GW-floating-header-box-shadow-color: #5c5c5c;
	--GW-floating-header-scroll-indicator-color: #8b8b8b;

	/*	“Skip to content” accessibility link.
	 */
	--GW-skip-to-content-text-color: #000;
	--GW-skip-to-content-border-color: #000;
	--GW-skip-to-content-background-color: #ff847b;

	/*	Nav header.
	 */
	--GW-nav-header-link-color: #999;
	--GW-nav-header-link-hover-color: #fff;

	/*	X of the day.
	 */
	--GW-x-of-the-day-border-color: #5c5c5c;
}
:root {

    --GW-body-text-color: #f1f1f1;

    --GW-popups-popup-title-bar-pattern: var(--GW-image-pattern-dotted-161616-on-252525-2x-gif);
    --GW-popups-popup-title-bar-pattern-focused: var(--GW-image-pattern-dotted-161616-on-3e3e3e-2x-gif);

    --GW-popins-popin-backdrop-color: rgba(0, 0, 0, 0.6);

    --GW-popins-popin-title-bar-button-color: #bbb;

    --GW-checkerboard-scrollbar-background-image: var(--GW-image-checkerboard-888-000-2x-gif);
    --GW-checkerboard-scrollbar-hover-background-image: var(--GW-image-checkerboard-bfbfbf-000-2x-gif);
}

.dark-mode-invert,
.dark-mode-invert::before,
.dark-mode-invert::after {
	filter: var(--dark-mode-invert-filter, none);
}

/*  Admonition icons.
 */
div.admonition.tip::before {
    filter: invert(1);
}
div.admonition.note::before {
    filter: none;
}
div.admonition.warning::before {
    filter: none;
}
div.admonition.error::before {
    filter: none;
}

/*  SVG icons in the two darker styles of admonitions.
 */
div.admonition.warning a[data-link-icon-type='svg'] .link-icon-hook::after,
div.admonition.error a[data-link-icon-type='svg'] .link-icon-hook::after {
    filter: none;
}

/*  For sortable table column headings, we use dark versions of the up/down/both
    arrow icons.
 */
table th.tablesorter-header {
    background-image: url('/static/img/tablesorter/tablesorter-bg-dark.gif');
}
table th.tablesorter-headerAsc {
    background-image: url('/static/img/tablesorter/tablesorter-asc-dark.gif');
}
table th.tablesorter-headerDesc {
    background-image: url('/static/img/tablesorter/tablesorter-desc-dark.gif');
}

/*  Images that are marked as '.invert' by the server are inverted,
    hue-rotated, and desaturated. Other (non-invertible) images are merely
    desaturated. Hovering over an image restores it to its original state.
    Hierarchy: ‘.invert-not’/‘.invert-not-auto’: no inversion or grayscale;
    ‘.invert’/‘.invert-auto’: inverted (uninverted upon mouse hover);
    none: grayscaled (ungrayscaled on hover).
 */
figure img.invert,
figure img.invert-auto {
    filter: grayscale(50%) invert(100%) brightness(95%) hue-rotate(180deg);
}
figure img:not(.invert):not(.invert-auto) {
    filter: grayscale(50%);
}
figure img,
figure img.invert,
figure img.invert-auto {
    transition: filter 0.25s ease;
}
figure img:not(.drop-filter-on-hover-not):hover,
figure img:not(.drop-filter-on-hover-not).invert:hover,
figure img:not(.drop-filter-on-hover-not).invert-auto:hover,
figure img:not(.drop-filter-on-hover-not):not(.invert):not(.invert-auto):hover {
    filter: none;
    transition: filter 0s ease 0.25s;
}

figure img[src$=".svg"].invert:hover,
figure img[src$=".svg"].invert-auto:hover {
    filter: grayscale(50%) invert(100%) brightness(95%) hue-rotate(180deg);
}

/*  Image alt-text.
 */
figure img.invert::before,
figure img.invert-auto::before {
    filter: invert(1);
}
figure img.invert:hover::before,
figure img.invert-auto:hover::before {
    filter: none;
}
/*  Styling the image alt-text interferes with the transitions in dark mode.
    (We include non-classd in this selector for consistency.)

    TEMPORARY until we transition to a color-based instead of filter-based
    scheme for this. —SA 2022-07-29
 */
figure img,
figure img:hover,
figure img.invert,
figure img.invert:hover,
figure img.invert-auto,
figure img.invert-auto:hover {
    transition: none;
}

/*  For images which have been marked up (manually or automatically) with 
	‘.invert-not’, we avoid any filtering at all. If they are manually marked up
	(artwork, diagrams with multiple subtly-different colors matched to a 
	legend/caption), the color is important and shouldn’t be faded out by 
	default. (Or invertOrNot has judged the image to be non-invertible, which
	presumably means something like the above also.)
 */
#markdownBody figure img.invert-not,
#markdownBody figure img.invert-not-auto {
    filter: none;
}

/*  The loading spinner for object popups (image, iframe, object) is inverted
    and made more visible in dark mode.
 */
.popframe.loading::before {
    filter: invert(1);
    opacity: 0.4;
}

/*  “Loading failed” messages for object popups.
 */
.popframe.loading-failed::after {
    opacity: 0.4;
}

/*  Masked links key toggle info alert panel.
 */
div#masked-links-key-toggle-info-alert img {
    filter: drop-shadow(0 0 3px var(--GW-reader-mode-masked-links-key-toggle-info-alert-panel-text-shadow-color));
}

/*  Recently-modified icon, manicule
 */
.has-recently-modified-icon .recently-modified-icon-hook::before,
.manicule svg {
    filter: invert(1);
}

</style>
<link rel="stylesheet" href="/static/css/head.css?v=1748550937">
<script type="text/javascript" async="" src="https://www.google-analytics.com/analytics.js"><\/script><script type="text/javascript" async="" src="https://www.googletagmanager.com/gtag/js?id=G-57C4S96Y26&amp;cx=c&amp;gtm=457e56b1za200&amp;tag_exp=101509157~103116026~103200004~103233427~103351869~103351871~104617979~104617981~104661466~104661468~104718208~104736445~104736447"><\/script><script src="/static/js/head.js?v=1748554774"><\/script>
<link rel="preload" href="/static/img/icon/icons.svg?v=1743875941" as="image">

  <!-- INLINED-HEAD-END -->

  
  <!-- Google Webmaster requires this tag, but only on the index/homepage -->
  <meta name="google-site-verification" content="BOhOQI1uMfsqu_DopVApovk1mJD5ZBLfan0s9go3phk">
  
  <!-- Hint at necessary third-party domains -->
  <link rel="preconnect" href="https://www.googletagmanager.com">

  <meta name="title" content="Essays">
  <meta name="citation_title" content="Essays">
  <meta name="og:title" content="Essays">
  <meta name="twitter:title" content="Essays">
  <meta name="generator" content="https://github.com/gwern/gwern.net/">
  <meta name="creator" content="gwern.net">
  
  <meta name="author" content="Gwern">
  <meta name="citation_author" content="Gwern">
  
  <meta name="contact" content="https://gwern.net/me#contact">
  <link rel="index" title="Gwern.net homepage" href="https://gwern.net/index">
  <link href="https://gwern.substack.com/feed" type="application/rss+xml" rel="alternate" title="ATOM/RSS feed of Gwern.net newsletters with additions and links.">

  <meta name="twitter:creator" content="gwern">
  <meta name="twitter:site" content="gwern.net">
  <meta name="og:site" content="gwern.net">
  <meta name="og:type" content="article">
  <meta name="description" content="Personal website of Gwern Branwen (writer, self-experimenter, and programmer): topics: psychology, statistics, technology, deep learning, anime. This index page is a categorized list of Gwern.net pages.">
  <meta name="og:description" content="Personal website of Gwern Branwen (writer, self-experimenter, and programmer): topics: psychology, statistics, technology, deep learning, anime. This index page is a categorized list of Gwern.net pages.">
  <meta property="og:image" content="https://gwern.net/static/img/logo/logo-whitebg-large-border.png">
  <meta property="og:image:alt" content="Default thumbnail text: the Gwern.net site logo, a logotype of a large blackletter fraktur capital letter 'G' on a white background.">
  <meta property="og:image:height" content="530">
  <meta property="og:image:width" content="441">
  <meta property="gwern:thumbnail:css-classes" content="">
  <meta name="keywords" content="meta">
  <meta name="dc.date.issued" content="2009-01-27">
  
  <meta name="citation_publication_date" content="2009-01-27">
  <meta name="dcterms.modified" content="2025-06-04">
  <link rel="schema.dcterms" href="https://www.dublincore.org/specifications/dublin-core/dcmi-terms/">
  <meta name="dcterms.rights" content="CC PD-0">
  <meta name="dc.rights" content="https://creativecommons.org/publicdomain/zero/1.0/">
  <link rel="canonical" href="https://gwern.net/index">
  <meta name="citation_fulltext_html_url" content="https://gwern.net/index">
  <meta name="og:url" content="https://gwern.net/index">
  <link rel="alternate" type="text/markdown" href="https://gwern.net/index.md" title="Markdown source of ‘Essays’ page">
  <meta name="page-body-classes" content="page-index dropcap-not">
  <meta name="citation_fulltext_world_readable" content="">
  <meta name="color-scheme" content="light dark">

  
  <title>Essays · Gwern.net</title>
  

  <link id="favicon" rel="icon" type="image/png" href="/static/img/logo/logo-favicon-small.png">
  <link id="favicon-dark" rel="icon" type="image/png" href="/static/img/logo/logo-favicon-small-dark.png" media="all and (prefers-color-scheme: dark)">
  <link id="favicon-apple-touch" rel="apple-touch-icon" type="image/png" href="/static/img/logo/logo-favicon-appletouch.png">
  <link id="favicon-apple-touch-dark" rel="apple-touch-icon" type="image/png" href="/static/img/logo/logo-favicon-appletouch-dark.png" media="all and (prefers-color-scheme: dark)">

  <!-- CSS for JS-disabled users: ensure that NoScripters know what they are missing even if they jump to a section & miss the warning at top/bottom. -->
  <noscript>
    <style>
      #markdownBody #noscript-warning-header {
          position: fixed; /* sticky */
          top: 6px; /* at top */
          width: 58%;
          z-index: 99; /* Make sure it is on top */
          background-color: #f8f8f8; /* Set a solid background color so legible while positioned over text */
          border-color: var(--GW-abstract-border-color); /* Make look like theme-toggle/admonitions a bit more */
          border-width: 6px 6px 6px 6px;
          border-style: double;
      }
      #markdownBody #noscript-warning-header p { margin: 10px; }
      nav#sidebar { padding-top: 160px; } /* avoid overlap with page header */
    </style>
  </noscript>
<script src="https://gwern.net/static/js/Hyphenopoly.js"><\/script><link rel="dns-prefetch" href="https://www.google.com/search"><style id="full-width-block-layout-styles">:root {
            --GW-full-width-block-layout-side-margin: 25px;
            --GW-full-width-block-layout-page-width: 926px;
            --GW-full-width-block-layout-left-adjustment: 0px;
        }</style></head>`,Rm=`<html lang="en" style="background: rgb(255, 255, 255);"><head>
        <meta charset="utf-8">
        <meta name="norton-safeweb-site-verification" content="24usqpep0ejc5w6hod3dulxwciwp0djs6c6ufp96av3t4whuxovj72wfkdjxu82yacb7430qjm8adbd5ezlt4592dq4zrvadcn9j9n-0btgdzpiojfzno16-fnsnu7xd">
        
        <link rel="preconnect" href="https://substackcdn.com">
        

        

        <style>
          @layer legacy, tailwind, pencraft;
        </style>

        
        <link rel="preload" as="style" href="https://substackcdn.com/bundle/theme/main.1c1578ff6afc07e439af.css">
        
        
        
        <link rel="preload" as="font" href="https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M5knjsS_ul.woff2" crossorigin="">
        

        
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/2290.30136bb9.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/2184.e5dbf94c.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/5425.77635f80.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/4713.16faf46d.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/8578.6fc5e6b6.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/5080.f77c9ae9.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/3875.18c3fcdc.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/893.c76a7a27.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/3894.216e944d.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/2457.78013e20.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/3218.7f8a394d.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/1400.be5485b6.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/8013.e80700c2.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/2138.6211c7e8.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/3857.c42d35f2.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/8170.560582a9.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/8823.aed2482e.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/9733.1e93cadb.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/9116.b9934d1b.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/3558.9f90bf86.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/8309.0da3ce82.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/6666.aaca9004.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/1300.42c69ef8.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/8617.5cd64b70.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/4769.92492746.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/9314.7ec37487.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/async/8118.d259ab81.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/main.4e313a9e.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/994.64402134.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/735.2e17d4d0.css">
            
                <link rel="stylesheet" type="text/css" href="https://substackcdn.com/bundle/static/css/7536.32b79559.css">
            
        

        
        
        
        
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover">
        <meta name="author" content="Hayden Clarkin">
        <meta property="og:url" content="https://thetransitguy.substack.com/p/dolly-parton-runs-a-train-busier">
        <title>Dolly Parton Runs a Train Busier Than 27 States</title>
        
        <link rel="canonical" href="https://thetransitguy.substack.com/p/dolly-parton-runs-a-train-busier">
        

        

        

        
            
                <link rel="shortcut icon" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Ffavicon.ico">
            
        
            
                <link rel="icon" type="image/png" sizes="16x16" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Ffavicon-16x16.png">
            
        
            
                <link rel="icon" type="image/png" sizes="32x32" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Ffavicon-32x32.png">
            
        
            
                <link rel="icon" type="image/png" sizes="48x48" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Ffavicon-48x48.png">
            
        
            
                <link rel="apple-touch-icon" sizes="57x57" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-57x57.png">
            
        
            
                <link rel="apple-touch-icon" sizes="60x60" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-60x60.png">
            
        
            
                <link rel="apple-touch-icon" sizes="72x72" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-72x72.png">
            
        
            
                <link rel="apple-touch-icon" sizes="76x76" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-76x76.png">
            
        
            
                <link rel="apple-touch-icon" sizes="114x114" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-114x114.png">
            
        
            
                <link rel="apple-touch-icon" sizes="120x120" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-120x120.png">
            
        
            
                <link rel="apple-touch-icon" sizes="144x144" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-144x144.png">
            
        
            
                <link rel="apple-touch-icon" sizes="152x152" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-152x152.png">
            
        
            
                <link rel="apple-touch-icon" sizes="167x167" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-167x167.png">
            
        
            
                <link rel="apple-touch-icon" sizes="180x180" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-180x180.png">
            
        
            
                <link rel="apple-touch-icon" sizes="1024x1024" href="https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F19680952-9f04-4a40-8414-6dacb29401cc%2Fapple-touch-icon-1024x1024.png">
            
        
            
        
            
        
            
        

        

        
            <link rel="alternate" type="application/rss+xml" href="/feed" title="The Transit Guy">
        

        
        
          <style>
            @font-face{font-family:'Spectral';font-style:italic;font-weight:400;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCt-xNNww_2s0amA9M8on7mTNmnUHowCw.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}@font-face{font-family:'Spectral';font-style:italic;font-weight:400;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCt-xNNww_2s0amA9M8onXmTNmnUHowCw.woff2) format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}@font-face{font-family:'Spectral';font-style:italic;font-weight:400;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCt-xNNww_2s0amA9M8onTmTNmnUHowCw.woff2) format('woff2');unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Spectral';font-style:italic;font-weight:400;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCt-xNNww_2s0amA9M8onrmTNmnUHo.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Spectral';font-style:normal;font-weight:400;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M9knjsS_ulYHs.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}@font-face{font-family:'Spectral';font-style:normal;font-weight:400;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M2knjsS_ulYHs.woff2) format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}@font-face{font-family:'Spectral';font-style:normal;font-weight:400;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M3knjsS_ulYHs.woff2) format('woff2');unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Spectral';font-style:normal;font-weight:400;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M5knjsS_ul.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Spectral';font-style:normal;font-weight:600;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCs-xNNww_2s0amA9vmtm3FafaPWnIIMrY.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}@font-face{font-family:'Spectral';font-style:normal;font-weight:600;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCs-xNNww_2s0amA9vmtm3OafaPWnIIMrY.woff2) format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}@font-face{font-family:'Spectral';font-style:normal;font-weight:600;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCs-xNNww_2s0amA9vmtm3PafaPWnIIMrY.woff2) format('woff2');unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Spectral';font-style:normal;font-weight:600;font-display:fallback;src:url(https://fonts.gstatic.com/s/spectral/v13/rnCs-xNNww_2s0amA9vmtm3BafaPWnII.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
            
          </style>
        
        

        <style>:root{--color_theme_bg_pop:#059669;--background_pop:#059669;--cover_bg_color:#FFFFFF;--background_pop_darken:#047d58;--print_on_pop:#ffffff;--color_theme_bg_pop_darken:#047d58;--color_theme_print_on_pop:#ffffff;--border_subtle:rgba(204, 204, 204, 0.5);--background_subtle:rgba(217, 239, 233, 0.4);--print_pop:#059669;--color_theme_accent:#059669;--cover_print_primary:#363737;--cover_print_secondary:#757575;--cover_print_tertiary:#b6b6b6;--cover_border_color:#059669;--home_hero:magaziney;--home_posts:custom;--web_bg_color:#ffffff;--background_contrast_1:#f0f0f0;--color_theme_bg_contrast_1:#f0f0f0;--background_contrast_2:#dddddd;--color_theme_bg_contrast_2:#dddddd;--background_contrast_3:#b7b7b7;--color_theme_bg_contrast_3:#b7b7b7;--background_contrast_4:#929292;--color_theme_bg_contrast_4:#929292;--background_contrast_5:#515151;--color_theme_bg_contrast_5:#515151;--color_theme_bg_elevated:#ffffff;--color_theme_bg_elevated_secondary:#f0f0f0;--color_theme_detail:#e6e6e6;--background_contrast_pop:rgba(5, 150, 105, 0.4);--color_theme_bg_contrast_pop:rgba(5, 150, 105, 0.4);--input_background:#ffffff;--cover_input_background:#ffffff;--tooltip_background:#191919;--web_bg_color_h:0;--web_bg_color_s:0%;--web_bg_color_l:100%;--print_on_web_bg_color:#363737;--print_secondary_on_web_bg_color:#868787;--selected_comment_background_color:#fdf9f3;--background_pop_rgb:5, 150, 105;--background_pop_rgb_pc:5 150 105;--color_theme_bg_pop_rgb:5, 150, 105;--color_theme_bg_pop_rgb_pc:5 150 105;--color_theme_accent_rgb:5, 150, 105;--color_theme_accent_rgb_pc:5 150 105;}</style>

        
            <link rel="stylesheet" href="https://substackcdn.com/bundle/theme/main.1c1578ff6afc07e439af.css">
        

        <style></style>

        

        

        
    <style type="text/css">/*
  code is extracted from Calendly's embed stylesheet: https://assets.calendly.com/assets/external/widget.css
*/

.calendly-inline-widget,
.calendly-inline-widget *,
.calendly-badge-widget,
.calendly-badge-widget *,
.calendly-overlay,
.calendly-overlay * {
    font-size:16px;
    line-height:1.2em
}

.calendly-inline-widget iframe,
.calendly-badge-widget iframe,
.calendly-overlay iframe {
    display:inline;
    width:100%;
    height:100%
}

.calendly-popup-content {
    position:relative
}

.calendly-popup-content.calendly-mobile {
    -webkit-overflow-scrolling:touch;
    overflow-y:auto
}

.calendly-overlay {
    position:fixed;
    top:0;
    left:0;
    right:0;
    bottom:0;
    overflow:hidden;
    z-index:9999;
    background-color:#a5a5a5;
    background-color:rgba(31,31,31,0.4)
}

.calendly-overlay .calendly-close-overlay {
    position:absolute;
    top:0;
    left:0;
    right:0;
    bottom:0
}

.calendly-overlay .calendly-popup {
    box-sizing:border-box;
    position:absolute;
    top:50%;
    left:50%;
    -webkit-transform:translateY(-50%) translateX(-50%);
    transform:translateY(-50%) translateX(-50%);
    width:80%;
    min-width:900px;
    max-width:1000px;
    height:90%;
    max-height:680px
}

@media (max-width: 975px) {
    .calendly-overlay .calendly-popup {
        position:fixed;
        top:50px;
        left:0;
        right:0;
        bottom:0;
        -webkit-transform:none;
        transform:none;
        width:100%;
        height:auto;
        min-width:0;
        max-height:none
    }
}

.calendly-overlay .calendly-popup .calendly-popup-content {
    height:100%;
}

.calendly-overlay .calendly-popup-close {
    position:absolute;
    top:25px;
    right:25px;
    color:#fff;
    width:19px;
    height:19px;
    cursor:pointer;
    background:url(https://assets.calendly.com/assets/external/close-icon.svg) no-repeat;
    background-size:contain
}

@media (max-width: 975px) {
    .calendly-overlay .calendly-popup-close {
        top:15px;
        right:15px
    }
}

.calendly-badge-widget {
    position:fixed;
    right:20px;
    bottom:15px;
    z-index:9998
}

.calendly-badge-widget .calendly-badge-content {
    display:table-cell;
    width:auto;
    height:45px;
    padding:0 30px;
    border-radius:25px;
    box-shadow:rgba(0,0,0,0.25) 0 2px 5px;
    font-family:sans-serif;
    text-align:center;
    vertical-align:middle;
    font-weight:bold;
    font-size:14px;
    color:#fff;
    cursor:pointer
}

.calendly-badge-widget .calendly-badge-content.calendly-white {
    color:#666a73
}

.calendly-badge-widget .calendly-badge-content span {
    display:block;
    font-size:12px
}

.calendly-spinner {
    position:absolute;
    top:50%;
    left:0;
    right:0;
    -webkit-transform:translateY(-50%);
    transform:translateY(-50%);
    text-align:center;
    z-index:-1
}

.calendly-spinner>div {
    display:inline-block;
    width:18px;
    height:18px;
    background-color:#e1e1e1;
    border-radius:50%;
    vertical-align:middle;
    -webkit-animation:calendly-bouncedelay 1.4s infinite ease-in-out;
    animation:calendly-bouncedelay 1.4s infinite ease-in-out;
    -webkit-animation-fill-mode:both;
    animation-fill-mode:both
}

.calendly-spinner .calendly-bounce1 {
    -webkit-animation-delay:-0.32s;
    animation-delay:-0.32s
}

.calendly-spinner .calendly-bounce2 {
    -webkit-animation-delay:-0.16s;
    animation-delay:-0.16s
}

@-webkit-keyframes calendly-bouncedelay {
    0%,80%,100% {
        -webkit-transform:scale(0);
        transform:scale(0)
    } 
    
    40%{
        -webkit-transform:scale(1);
        transform:scale(1)
    }
}

@keyframes calendly-bouncedelay{ 
    0%,80%,100% {
        -webkit-transform:scale(0);
        transform:scale(0)
    }
    
    40% {
        -webkit-transform:scale(1);
        transform:scale(1)
    }
}</style>
<meta property="og:type" content="article" data-preact-helmet="true">
<meta name="theme-color" content="#ffffff" data-preact-helmet="true"><meta name="twitter:card" content="summary_large_image" data-preact-helmet="true"><meta property="og:title" content="Dolly Parton Runs a Train Busier Than 27 States" data-preact-helmet="true"><meta name="twitter:title" content="Dolly Parton Runs a Train Busier Than 27 States" data-preact-helmet="true">
<meta name="description" content="What Dollywood says about the state of America's Transit" data-preact-helmet="true"><meta property="og:description" content="What Dollywood says about the state of America's Transit" data-preact-helmet="true"><meta name="twitter:description" content="What Dollywood says about the state of America's Transit" data-preact-helmet="true">
<meta property="og:image" content="https://substackcdn.com/image/fetch/w_1200,h_600,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fcc3358d7-f47f-4c11-96c4-a5e0727d890e_545x545.png" data-preact-helmet="true"><meta name="twitter:image" content="https://substackcdn.com/image/fetch/f_auto,q_auto:best,fl_progressive:steep/https%3A%2F%2Fthetransitguy.substack.com%2Fapi%2Fv1%2Fpost_preview%2F159437284%2Ftwitter.jpg%3Fversion%3D4" data-preact-helmet="true">
</head>

<body class="">            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/2290.07192e48.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/7710.0af693dc.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/4754.a7c372e8.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/5590.1f69ee6d.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/2667.050bc694.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/2184.b9ea0a7b.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/6175.6ca5b627.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/5425.a9d6a223.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/6993.3a6ad1ba.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/4713.47aa8ddc.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/5871.4a866c47.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/8578.837d03cd.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/5080.d8555c98.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/3875.3ab06b6b.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/893.ef32a348.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/3894.abd1971d.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/3134.ee4cb44f.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/2457.6d896428.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/3218.ae691d2c.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/1400.95bdc1cd.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/8013.8a7ea457.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/4834.f97f50cb.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8176.ff234f34.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6054.0fdd61e8.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/7119.99b4deee.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/5477.46b20692.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3957.9c36f379.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/2138.ae579558.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/4870.ca882502.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5581.1e254400.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/222.bb1a29d1.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/8842.db727af5.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/4990.8f12a59d.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/1266.11e3bb46.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8074.645fad54.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7984.0064aade.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/2622.9b10f906.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3276.20587dd3.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3857.754ec8d5.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9362.10c55d62.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6627.d9f7c6c8.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5042.8eff9d20.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1549.e23e2547.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5053.bb2a9ff8.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5946.f34eee28.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5783.70397610.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8170.41d8e832.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7833.16cb5a56.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6327.c9e656a8.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8796.d4ab48a7.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9762.02918804.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3536.aee94ade.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9517.47438053.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1621.8b495e16.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8453.7fbe5044.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5827.03d719ab.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7184.7ec32501.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/2685.6966eaed.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6595.91d5852f.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3486.97895239.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1761.ddb4d176.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9383.f25adeb7.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6735.3a23004e.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3065.05f57f8e.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/2448.e783c105.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8823.b0393ae2.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6911.d9db40c1.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9733.0de6442b.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7522.17eb50f9.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1262.785b63d3.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7944.a756225c.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5606.626fc1cf.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3184.46e488ae.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7952.40a35a23.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/2643.a1cd96cf.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1516.424f7caa.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9116.8491fc8b.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5330.36c45079.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/6666.33bcc480.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/8427.b11b4d57.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/4899.fd9e94ce.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/1043.8de6744f.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/1300.bd1dea74.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/7152.0ab6d922.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/5850.961b6d5b.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5906.dd11f0c0.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1036.5252e7d5.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7392.c61998af.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3506.31438851.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/1466.6bbfa6d7.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/4043.4bdc9a96.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6336.8996d4aa.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9623.47cf2266.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/4199.c3ead4d1.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9027.b3840e7b.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1998.1aad2487.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5431.22bc02f0.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/2035.58660d40.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/565.db243e90.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1969.f853ceee.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9293.576c946c.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3766.01b6ecb7.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/789.37139d11.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/546.e223c332.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8909.2757a42e.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8375.2964bb56.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5410.383adf41.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3751.1cb41153.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1426.5e43505d.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8117.5cfbde96.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/570.00f60c82.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7023.f06c664d.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/4334.35346230.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1530.fe4bc517.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9022.ccbf4eaf.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9760.3b93fbba.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7768.673ac00f.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8421.8364d0bd.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7455.ace11240.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9505.b7c9cbad.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6535.952c1dec.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/6304.b042bd9a.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/8617.131c92a2.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/9327.5d94bfa3.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/4769.53e5db8b.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/6537.77223370.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/2926.b66edd22.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/9314.7e77435c.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/8118.1652fdf6.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/async/7381.01091de5.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/main.783a31f7.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3937.b62420c7.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5208.e4e6cf93.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/9462.35765a72.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1273.3216b19c.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/8381.d9c18504.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/158.9cad7c72.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/1929.83ac8762.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/32.fea28e91.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/770.f663c9e1.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/4880.fbe2e55d.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/735.c24880ce.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/7536.1648315b.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5654.e6066276.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/3860.d93a0dfa.js" charset="utf-8"><\/script>
            
                <script defer="" src="https://substackcdn.com/bundle/static/js/5129.d564cfbf.js" charset="utf-8"><\/script>
            
        
        <script nomodule="">
            (function() {
                var message = 'Your browser does not support modern JavaScript modules. Please upgrade your browser for the best experience.';
                var warningDiv = document.createElement('div');
                warningDiv.style.color = 'red';
                warningDiv.style.padding = '10px';
                warningDiv.style.margin = '10px 0';
                warningDiv.style.border = '1px solid red';
                warningDiv.style.backgroundColor = 'lightyellow';
                warningDiv.innerText = message;
                document.body.prepend(warningDiv);
            })();
        <\/script>

        
            <!-- Datadog Analytics -->
            <script>
              (function(h,o,u,n,d) {
                h=h[d]=h[d]||{q:[],onReady:function(c){h.q.push(c)}}
                d=o.createElement(u);d.async=1;d.src=n
                n=o.getElementsByTagName(u)[0];n.parentNode.insertBefore(d,n)
              })(window,document,'script','https://www.datadoghq-browser-agent.com/us1/v5/datadog-rum.js','DD_RUM')
              window.DD_RUM.onReady(function() {
                window.DD_RUM.init({
                  clientToken: 'puba71073f072643721169b68f352438710',
                  applicationId: '2e321b35-c76b-4073-8d04-cc9a10461793',
                  site: 'datadoghq.com',
                  service: 'substack-web',
                  env: window._preloads.dd_env,
                  version: '16a202e050c3431c1ff6dd08ff4e66f5a82e2d2a',
                  sessionSampleRate: 1,
                  sessionReplaySampleRate: 100,
                  trackUserInteractions: window._preloads.dd_ti,
                  trackResources: true,
                  trackLongTasks: true,
                  defaultPrivacyLevel: 'mask-user-input',
                  allowedTracingUrls: [/https?://(.+/.)?substack(cdn)?.com/]
                });
              })
            <\/script>
            <!-- End Datadog Analytics -->

            <!-- Cloudflare Web Analytics -->
            <script defer="" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="{&quot;token&quot;: &quot;216309cffb464db4b0e02daf0b8e8060&quot;}"><\/script>
            <!-- End Cloudflare Web Analytics -->
        

        <!-- Fallback tracking pixels -->
        

        

        <noscript>
    <style>
        #nojs-banner {
            position: fixed;
            bottom: 0;
            left: 0;
            padding: 16px 16px 16px 32px;
            width: 100%;
            box-sizing: border-box;
            background: red;
            color: white;
            font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            font-size: 13px;
            line-height: 13px;
        }
        #nojs-banner a {
            color: inherit;
            text-decoration: underline;
        }
    </style>

    <div id="nojs-banner">
        This site requires JavaScript to run correctly. Please <a href="https://enable-javascript.com/" target="_blank">turn on JavaScript</a> or unblock scripts
    </div>
</noscript>


        

        

        
        
   

</body></html>`,Pm=`
<body class="skin--responsive skin-vector skin-vector-search-vue mediawiki ltr sitedir-ltr mw-hide-empty-elt ns-0 ns-subject page-Main_Page rootpage-Main_Page skin-vector-2022 action-view uls-dialog-sticky-hide"><a class="mw-jump-link" href="#bodyContent">Jump to content</a>
<div class="vector-header-container">
	<header class="vector-header mw-header no-font-mode-scale">
		<div class="vector-header-start">
			<nav class="vector-main-menu-landmark" aria-label="Site">
				
<div id="vector-main-menu-dropdown" class="vector-dropdown vector-main-menu-dropdown vector-button-flush-left vector-button-flush-right" title="Main menu">
	<input type="checkbox" id="vector-main-menu-dropdown-checkbox" role="button" aria-haspopup="true" data-event-name="ui.dropdown-vector-main-menu-dropdown" class="vector-dropdown-checkbox " aria-label="Main menu">
	<label id="vector-main-menu-dropdown-label" for="vector-main-menu-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only " aria-hidden="true"><span class="vector-icon mw-ui-icon-menu mw-ui-icon-wikimedia-menu"></span>

<span class="vector-dropdown-label-text">Main menu</span>
	</label>
	<div class="vector-dropdown-content">


				<div id="vector-main-menu-unpinned-container" class="vector-unpinned-container">
		
<div id="vector-main-menu" class="vector-main-menu vector-pinnable-element">
	<div class="vector-pinnable-header vector-main-menu-pinnable-header vector-pinnable-header-unpinned" data-feature-name="main-menu-pinned" data-pinnable-element-id="vector-main-menu" data-pinned-container-id="vector-main-menu-pinned-container" data-unpinned-container-id="vector-main-menu-unpinned-container" data-saved-pinned-state="false">
	<div class="vector-pinnable-header-label">Main menu</div>
	<button class="vector-pinnable-header-toggle-button vector-pinnable-header-pin-button" data-event-name="pinnable-header.vector-main-menu.pin">move to sidebar</button>
	<button class="vector-pinnable-header-toggle-button vector-pinnable-header-unpin-button" data-event-name="pinnable-header.vector-main-menu.unpin">hide</button>
</div>

	
<div id="p-navigation" class="vector-menu mw-portlet mw-portlet-navigation">
	<div class="vector-menu-heading">
		Navigation
	</div>
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="n-mainpage-description" class="mw-list-item"><a href="/wiki/Main_Page" title="Visit the main page [⌃⌥z]" accesskey="z"><span>Main page</span></a></li><li id="n-contents" class="mw-list-item"><a href="/wiki/Wikipedia:Contents" title="Guides to browsing Wikipedia"><span>Contents</span></a></li><li id="n-currentevents" class="mw-list-item"><a href="/wiki/Portal:Current_events" title="Articles related to current events"><span>Current events</span></a></li><li id="n-randompage" class="mw-list-item"><a href="/wiki/Special:Random" title="Visit a randomly selected article [⌃⌥x]" accesskey="x"><span>Random article</span></a></li><li id="n-aboutsite" class="mw-list-item"><a href="/wiki/Wikipedia:About" title="Learn about Wikipedia and how it works"><span>About Wikipedia</span></a></li><li id="n-contactpage" class="mw-list-item"><a href="//en.wikipedia.org/wiki/Wikipedia:Contact_us" title="How to contact Wikipedia"><span>Contact us</span></a></li>
		</ul>
		
	</div>
</div>

<div id="p-interaction" class="vector-menu mw-portlet mw-portlet-interaction">
	<div class="vector-menu-heading">
		Contribute
	</div>
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="n-help" class="mw-list-item"><a href="/wiki/Help:Contents" title="Guidance on how to use and edit Wikipedia"><span>Help</span></a></li><li id="n-introduction" class="mw-list-item"><a href="/wiki/Help:Introduction" title="Learn how to edit Wikipedia"><span>Learn to edit</span></a></li><li id="n-portal" class="mw-list-item"><a href="/wiki/Wikipedia:Community_portal" title="The hub for editors"><span>Community portal</span></a></li><li id="n-recentchanges" class="mw-list-item"><a href="/wiki/Special:RecentChanges" title="A list of recent changes to Wikipedia [⌃⌥r]" accesskey="r"><span>Recent changes</span></a></li><li id="n-upload" class="mw-list-item"><a href="/wiki/Wikipedia:File_upload_wizard" title="Add images or other media for use on Wikipedia"><span>Upload file</span></a></li><li id="n-specialpages" class="mw-list-item"><a href="/wiki/Special:SpecialPages"><span>Special pages</span></a></li>
		</ul>
		
	</div>
</div>

</div>

				</div>

	</div>
</div>

		</nav>
			
<a href="/wiki/Main_Page" class="mw-logo">
	<img class="mw-logo-icon" src="/static/images/icons/wikipedia.png" alt="" aria-hidden="true" height="50" width="50">
	<span class="mw-logo-container skin-invert">
		<img class="mw-logo-wordmark" alt="Wikipedia" src="/static/images/mobile/copyright/wikipedia-wordmark-en.svg" style="width: 7.5em; height: 1.125em;">
		<img class="mw-logo-tagline" alt="The Free Encyclopedia" src="/static/images/mobile/copyright/wikipedia-tagline-en.svg" width="117" height="13" style="width: 7.3125em; height: 0.8125em;">
	</span>
</a>

		</div>
		<div class="vector-header-end">
			
<div id="p-search" role="search" class="vector-search-box-vue  vector-search-box-collapses vector-search-box-show-thumbnail vector-search-box-auto-expand-width vector-search-box">
	<a href="/wiki/Special:Search" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only search-toggle" title="Search Wikipedia [⌃⌥f]" accesskey="f"><span class="vector-icon mw-ui-icon-search mw-ui-icon-wikimedia-search"></span>

<span>Search</span>
	</a>
	<div class="vector-typeahead-search-container">
		<div class="cdx-typeahead-search cdx-typeahead-search--show-thumbnail cdx-typeahead-search--auto-expand-width">
			<form action="/w/index.php" id="searchform" class="cdx-search-input cdx-search-input--has-end-button">
				<div id="simpleSearch" class="cdx-search-input__input-wrapper" data-search-loc="header-moved">
					<div class="cdx-text-input cdx-text-input--has-start-icon">
						<input class="cdx-text-input__input mw-searchInput" type="search" name="search" placeholder="Search Wikipedia" aria-label="Search Wikipedia" autocapitalize="sentences" spellcheck="false" title="Search Wikipedia [⌃⌥f]" accesskey="f" id="searchInput">
						<span class="cdx-text-input__icon cdx-text-input__start-icon"></span>
					</div>
					<input type="hidden" name="title" value="Special:Search">
				</div>
				<button class="cdx-button cdx-search-input__end-button">Search</button>
			</form>
		</div>
	</div>
</div>

			<nav class="vector-user-links vector-user-links-wide" aria-label="Personal tools">
	<div class="vector-user-links-main">
	
<div id="p-vector-user-menu-preferences" class="vector-menu mw-portlet emptyPortlet">
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			
		</ul>
		
	</div>
</div>

	
<div id="p-vector-user-menu-userpage" class="vector-menu mw-portlet emptyPortlet">
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			
		</ul>
		
	</div>
</div>

	<nav class="vector-appearance-landmark" aria-label="Appearance">
		
<div id="vector-appearance-dropdown" class="vector-dropdown " title="Change the appearance of the page's font size, width, and color">
	<input type="checkbox" id="vector-appearance-dropdown-checkbox" role="button" aria-haspopup="true" data-event-name="ui.dropdown-vector-appearance-dropdown" class="vector-dropdown-checkbox " aria-label="Appearance">
	<label id="vector-appearance-dropdown-label" for="vector-appearance-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only " aria-hidden="true"><span class="vector-icon mw-ui-icon-appearance mw-ui-icon-wikimedia-appearance"></span>

<span class="vector-dropdown-label-text">Appearance</span>
	</label>
	<div class="vector-dropdown-content">


			<div id="vector-appearance-unpinned-container" class="vector-unpinned-container">
				
			<div id="vector-appearance" class="vector-appearance vector-pinnable-element">
	<div class="vector-pinnable-header vector-appearance-pinnable-header vector-pinnable-header-unpinned" data-feature-name="appearance-pinned" data-pinnable-element-id="vector-appearance" data-pinned-container-id="vector-appearance-pinned-container" data-unpinned-container-id="vector-appearance-unpinned-container" data-saved-pinned-state="true">
	<div class="vector-pinnable-header-label">Appearance</div>
	<button class="vector-pinnable-header-toggle-button vector-pinnable-header-pin-button" data-event-name="pinnable-header.vector-appearance.pin">move to sidebar</button>
	<button class="vector-pinnable-header-toggle-button vector-pinnable-header-unpin-button" data-event-name="pinnable-header.vector-appearance.unpin">hide</button>
</div>


<div class="mw-portlet mw-portlet-skin-client-prefs-vector-feature-custom-font-size vector-menu" id="skin-client-prefs-vector-feature-custom-font-size"><div class="vector-menu-heading">Text</div><div class="vector-menu-content"><ul class="vector-menu-content-list"><li class="mw-list-item mw-list-item-js"><div class=""><form><div class="cdx-radio"><input name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-0" type="radio" value="0" data-event-name="skin-client-pref-vector-feature-custom-font-size-value-0" class="cdx-radio__input"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-0"><span class="cdx-label__label__text">Small</span></label></div><div class="cdx-radio"><input name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-1" type="radio" value="1" data-event-name="skin-client-pref-vector-feature-custom-font-size-value-1" class="cdx-radio__input"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-1"><span class="cdx-label__label__text">Standard</span></label></div><div class="cdx-radio"><input name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-2" type="radio" value="2" data-event-name="skin-client-pref-vector-feature-custom-font-size-value-2" class="cdx-radio__input"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-2"><span class="cdx-label__label__text">Large</span></label></div></form></div></li></ul><span class="skin-client-pref-exclusion-notice">This page always uses small font size</span></div></div><div class="mw-portlet mw-portlet-skin-client-prefs-vector-feature-limited-width vector-menu" id="skin-client-prefs-vector-feature-limited-width"><div class="vector-menu-heading">Width</div><div class="vector-menu-content"><ul class="vector-menu-content-list"><li class="mw-list-item mw-list-item-js"><div class=""><form><div class="cdx-radio"><input name="skin-client-pref-vector-feature-limited-width-group" id="skin-client-pref-vector-feature-limited-width-value-1" type="radio" value="1" data-event-name="skin-client-pref-vector-feature-limited-width-value-1" class="cdx-radio__input"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-limited-width-value-1"><span class="cdx-label__label__text">Standard</span></label></div><div class="cdx-radio"><input name="skin-client-pref-vector-feature-limited-width-group" id="skin-client-pref-vector-feature-limited-width-value-0" type="radio" value="0" data-event-name="skin-client-pref-vector-feature-limited-width-value-0" class="cdx-radio__input"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-limited-width-value-0"><span class="cdx-label__label__text">Wide</span></label></div></form></div></li></ul><span class="skin-client-pref-exclusion-notice">The content is as wide as possible for your browser window.</span></div></div><div class="mw-portlet mw-portlet-skin-client-prefs-skin-theme vector-menu" id="skin-client-prefs-skin-theme"><div class="vector-menu-heading">Color <span><span>(beta)</span></span></div><div class="vector-menu-content"><ul class="vector-menu-content-list"><li class="mw-list-item mw-list-item-js"><div class=""><form><div class="cdx-radio"><input name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-os" type="radio" value="os" data-event-name="skin-client-pref-skin-theme-value-os" class="cdx-radio__input"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-os"><span class="cdx-label__label__text">Automatic</span></label></div><div class="cdx-radio"><input name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-day" type="radio" value="day" data-event-name="skin-client-pref-skin-theme-value-day" class="cdx-radio__input"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-day"><span class="cdx-label__label__text">Light</span></label></div><div class="cdx-radio"><input name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-night" type="radio" value="night" data-event-name="skin-client-pref-skin-theme-value-night" class="cdx-radio__input"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-night"><span class="cdx-label__label__text">Dark</span></label></div></form><span id="skin-theme-beta-notice"></span></div></li></ul><span class="skin-client-pref-exclusion-notice">This page is always in light mode.</span></div></div></div></div>
		
	</div>
</div>

	</nav>
	
<div id="p-vector-user-menu-notifications" class="vector-menu mw-portlet emptyPortlet">
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			
		</ul>
		
	</div>
</div>

	
<div id="p-vector-user-menu-overflow" class="vector-menu mw-portlet">
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			<li id="pt-sitesupport-2" class="user-links-collapsible-item mw-list-item user-links-collapsible-item"><a data-mw="interface" href="https://donate.wikimedia.org/?wmf_source=donate&amp;wmf_medium=sidebar&amp;wmf_campaign=en.wikipedia.org&amp;uselang=en" class=""><span>Donate</span></a>
</li>
<li id="pt-createaccount-2" class="user-links-collapsible-item mw-list-item user-links-collapsible-item"><a data-mw="interface" href="/w/index.php?title=Special:CreateAccount&amp;returnto=Main+Page" title="You are encouraged to create an account and log in; however, it is not mandatory" class=""><span>Create account</span></a>
</li>
<li id="pt-login-2" class="user-links-collapsible-item mw-list-item user-links-collapsible-item"><a data-mw="interface" href="/w/index.php?title=Special:UserLogin&amp;returnto=Main+Page" title="You're encouraged to log in; however, it's not mandatory. [⌃⌥o]" accesskey="o" class=""><span>Log in</span></a>
</li>

			
		</ul>
		
	</div>
</div>

	</div>
	
<div id="vector-user-links-dropdown" class="vector-dropdown vector-user-menu vector-button-flush-right vector-user-menu-logged-out" title="Log in and more options">
	<input type="checkbox" id="vector-user-links-dropdown-checkbox" role="button" aria-haspopup="true" data-event-name="ui.dropdown-vector-user-links-dropdown" class="vector-dropdown-checkbox " aria-label="Personal tools">
	<label id="vector-user-links-dropdown-label" for="vector-user-links-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only " aria-hidden="true"><span class="vector-icon mw-ui-icon-ellipsis mw-ui-icon-wikimedia-ellipsis"></span>

<span class="vector-dropdown-label-text">Personal tools</span>
	</label>
	<div class="vector-dropdown-content">


		
<div id="p-personal" class="vector-menu mw-portlet mw-portlet-personal user-links-collapsible-item" title="User menu">
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="pt-sitesupport" class="user-links-collapsible-item mw-list-item"><a href="https://donate.wikimedia.org/?wmf_source=donate&amp;wmf_medium=sidebar&amp;wmf_campaign=en.wikipedia.org&amp;uselang=en"><span>Donate</span></a></li><li id="pt-createaccount" class="user-links-collapsible-item mw-list-item"><a href="/w/index.php?title=Special:CreateAccount&amp;returnto=Main+Page" title="You are encouraged to create an account and log in; however, it is not mandatory"><span class="vector-icon mw-ui-icon-userAdd mw-ui-icon-wikimedia-userAdd"></span> <span>Create account</span></a></li><li id="pt-login" class="user-links-collapsible-item mw-list-item"><a href="/w/index.php?title=Special:UserLogin&amp;returnto=Main+Page" title="You're encouraged to log in; however, it's not mandatory. [⌃⌥o]" accesskey="o"><span class="vector-icon mw-ui-icon-logIn mw-ui-icon-wikimedia-logIn"></span> <span>Log in</span></a></li>
		</ul>
		
	</div>
</div>

<div id="p-user-menu-anon-editor" class="vector-menu mw-portlet mw-portlet-user-menu-anon-editor">
	<div class="vector-menu-heading">
		Pages for logged out editors <a href="/wiki/Help:Introduction" aria-label="Learn more about editing"><span>learn more</span></a>
	</div>
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="pt-anoncontribs" class="mw-list-item"><a href="/wiki/Special:MyContributions" title="A list of edits made from this IP address [⌃⌥y]" accesskey="y"><span>Contributions</span></a></li><li id="pt-anontalk" class="mw-list-item"><a href="/wiki/Special:MyTalk" title="Discussion about edits from this IP address [⌃⌥n]" accesskey="n"><span>Talk</span></a></li>
		</ul>
		
	</div>
</div>

	
	</div>
</div>

</nav>

		</div>
	</header>
</div>
<div class="mw-page-container">
	<div class="mw-page-container-inner">
		<div class="vector-sitenotice-container">
			<div id="siteNotice"><div id="centralNotice"></div><!-- CentralNotice --></div>
		</div>
		<div class="vector-column-start">
			<div class="vector-main-menu-container">
		<div id="mw-navigation">
			<nav id="mw-panel" class="vector-main-menu-landmark" aria-label="Site">
				<div id="vector-main-menu-pinned-container" class="vector-pinned-container">
				
				</div>
		</nav>
		</div>
	</div>
</div>
		<div class="mw-content-container">
			<main id="content" class="mw-body">
				<header class="mw-body-header vector-page-titlebar vector-page-titlebar-blank no-font-mode-scale">
					<h1 id="firstHeading" class="firstHeading mw-first-heading" style="display: none"><span class="mw-page-title-main">Main Page</span></h1>
						<div class="mw-indicators">
		</div>
</header>
				<div class="vector-page-toolbar vector-feature-custom-font-size-clientpref--excluded">
					<div class="vector-page-toolbar-container">
						<div id="left-navigation">
							<nav aria-label="Namespaces">
								
<div id="p-associated-pages" class="vector-menu vector-menu-tabs mw-portlet mw-portlet-associated-pages">
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="ca-nstab-main" class="selected vector-tab-noicon mw-list-item"><a href="/wiki/Main_Page" title="View the content page [⌃⌥c]" accesskey="c"><span>Main Page</span></a></li><li id="ca-talk" class="vector-tab-noicon mw-list-item"><a href="/wiki/Talk:Main_Page" rel="discussion" title="Discuss improvements to the content page [⌃⌥t]" accesskey="t"><span>Talk</span></a></li>
		</ul>
		
	</div>
</div>

								
<div id="vector-variants-dropdown" class="vector-dropdown emptyPortlet">
	<input type="checkbox" id="vector-variants-dropdown-checkbox" role="button" aria-haspopup="true" data-event-name="ui.dropdown-vector-variants-dropdown" class="vector-dropdown-checkbox " aria-label="Change language variant">
	<label id="vector-variants-dropdown-label" for="vector-variants-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet" aria-hidden="true"><span class="vector-dropdown-label-text">English</span>
	</label>
	<div class="vector-dropdown-content">


					
<div id="p-variants" class="vector-menu mw-portlet mw-portlet-variants emptyPortlet">
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			
		</ul>
		
	</div>
</div>

				
	</div>
</div>

							</nav>
						</div>
						<div id="right-navigation" class="vector-collapsible">
							<nav aria-label="Views">
								
<div id="p-views" class="vector-menu vector-menu-tabs mw-portlet mw-portlet-views">
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="ca-view" class="selected vector-tab-noicon mw-list-item"><a href="/wiki/Main_Page"><span>Read</span></a></li><li id="ca-viewsource" class="vector-tab-noicon mw-list-item"><a href="/w/index.php?title=Main_Page&amp;action=edit" title="This page is protected.
You can view its source [⌃⌥e]" accesskey="e"><span>View source</span></a></li><li id="ca-history" class="vector-tab-noicon mw-list-item"><a href="/w/index.php?title=Main_Page&amp;action=history" title="Past revisions of this page [⌃⌥h]" accesskey="h"><span>View history</span></a></li>
		</ul>
		
	</div>
</div>

							</nav>
				
							<nav class="vector-page-tools-landmark" aria-label="Page tools">
								
<div id="vector-page-tools-dropdown" class="vector-dropdown vector-page-tools-dropdown">
	<input type="checkbox" id="vector-page-tools-dropdown-checkbox" role="button" aria-haspopup="true" data-event-name="ui.dropdown-vector-page-tools-dropdown" class="vector-dropdown-checkbox " aria-label="Tools">
	<label id="vector-page-tools-dropdown-label" for="vector-page-tools-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet" aria-hidden="true"><span class="vector-dropdown-label-text">Tools</span>
	</label>
	<div class="vector-dropdown-content">


									<div id="vector-page-tools-unpinned-container" class="vector-unpinned-container">
						
<div id="vector-page-tools" class="vector-page-tools vector-pinnable-element">
	<div class="vector-pinnable-header vector-page-tools-pinnable-header vector-pinnable-header-unpinned" data-feature-name="page-tools-pinned" data-pinnable-element-id="vector-page-tools" data-pinned-container-id="vector-page-tools-pinned-container" data-unpinned-container-id="vector-page-tools-unpinned-container" data-saved-pinned-state="false">
	<div class="vector-pinnable-header-label">Tools</div>
	<button class="vector-pinnable-header-toggle-button vector-pinnable-header-pin-button" data-event-name="pinnable-header.vector-page-tools.pin">move to sidebar</button>
	<button class="vector-pinnable-header-toggle-button vector-pinnable-header-unpin-button" data-event-name="pinnable-header.vector-page-tools.unpin">hide</button>
</div>

	
<div id="p-cactions" class="vector-menu mw-portlet mw-portlet-cactions emptyPortlet vector-has-collapsible-items" title="More options">
	<div class="vector-menu-heading">
		Actions
	</div>
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="ca-more-view" class="selected vector-more-collapsible-item mw-list-item"><a href="/wiki/Main_Page"><span>Read</span></a></li><li id="ca-more-viewsource" class="vector-more-collapsible-item mw-list-item"><a href="/w/index.php?title=Main_Page&amp;action=edit"><span>View source</span></a></li><li id="ca-more-history" class="vector-more-collapsible-item mw-list-item"><a href="/w/index.php?title=Main_Page&amp;action=history"><span>View history</span></a></li>
		</ul>
		
	</div>
</div>

<div id="p-tb" class="vector-menu mw-portlet mw-portlet-tb">
	<div class="vector-menu-heading">
		General
	</div>
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="t-whatlinkshere" class="mw-list-item"><a href="/wiki/Special:WhatLinksHere/Main_Page" title="List of all English Wikipedia pages containing links to this page [⌃⌥j]" accesskey="j"><span>What links here</span></a></li><li id="t-recentchangeslinked" class="mw-list-item"><a href="/wiki/Special:RecentChangesLinked/Main_Page" rel="nofollow" title="Recent changes in pages linked from this page [⌃⌥k]" accesskey="k"><span>Related changes</span></a></li><li id="t-upload" class="mw-list-item"><a href="//en.wikipedia.org/wiki/Wikipedia:File_Upload_Wizard" title="Upload files [⌃⌥u]" accesskey="u"><span>Upload file</span></a></li><li id="t-permalink" class="mw-list-item"><a href="https://en.wikipedia.org/w/index.php?title=Main_Page&amp;oldid=1294660424" title="Permanent link to this revision of this page"><span>Permanent link</span></a></li><li id="t-info" class="mw-list-item"><a href="/w/index.php?title=Main_Page&amp;action=info" title="More information about this page"><span>Page information</span></a></li><li id="t-cite" class="mw-list-item"><a href="/w/index.php?title=Special:CiteThisPage&amp;page=Main_Page&amp;id=1294660424&amp;wpFormIdentifier=titleform" title="Information on how to cite this page"><span>Cite this page</span></a></li><li id="t-urlshortener" class="mw-list-item"><a href="/w/index.php?title=Special:UrlShortener&amp;url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FMain_Page" aria-haspopup="dialog"><span>Get shortened URL</span></a></li><li id="t-urlshortener-qrcode" class="mw-list-item"><a href="/w/index.php?title=Special:QrCode&amp;url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FMain_Page"><span>Download QR code</span></a></li>
		</ul>
		
	</div>
</div>

<div id="p-coll-print_export" class="vector-menu mw-portlet mw-portlet-coll-print_export">
	<div class="vector-menu-heading">
		Print/export
	</div>
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li id="coll-download-as-rl" class="mw-list-item"><a href="/w/index.php?title=Special:DownloadAsPdf&amp;page=Main_Page&amp;action=show-download-screen" title="Download this page as a PDF file"><span>Download as PDF</span></a></li><li id="t-print" class="mw-list-item"><a href="/w/index.php?title=Main_Page&amp;printable=yes" title="Printable version of this page [⌃⌥p]" accesskey="p"><span>Printable version</span></a></li>
		</ul>
		
	</div>
</div>

<div id="p-wikibase-otherprojects" class="vector-menu mw-portlet mw-portlet-wikibase-otherprojects">
	<div class="vector-menu-heading">
		In other projects
	</div>
	<div class="vector-menu-content">
		
		<ul class="vector-menu-content-list">
			
			<li class="wb-otherproject-link wb-otherproject-commons mw-list-item"><a href="https://commons.wikimedia.org/wiki/Main_Page" hreflang="en"><span>Wikimedia Commons</span></a></li><li class="wb-otherproject-link wb-otherproject-foundation mw-list-item"><a href="https://foundation.wikimedia.org/wiki/Home" hreflang="en"><span>Wikimedia Foundation</span></a></li><li class="wb-otherproject-link wb-otherproject-mediawiki mw-list-item"><a href="https://www.mediawiki.org/wiki/MediaWiki" hreflang="en"><span>MediaWiki</span></a></li><li class="wb-otherproject-link wb-otherproject-meta mw-list-item"><a href="https://meta.wikimedia.org/wiki/Main_Page" hreflang="en"><span>Meta-Wiki</span></a></li><li class="wb-otherproject-link wb-otherproject-outreach mw-list-item"><a href="https://outreach.wikimedia.org/wiki/Main_Page" hreflang="en"><span>Wikimedia Outreach</span></a></li><li class="wb-otherproject-link wb-otherproject-sources mw-list-item"><a href="https://wikisource.org/wiki/Main_Page" hreflang="en"><span>Multilingual Wikisource</span></a></li><li class="wb-otherproject-link wb-otherproject-species mw-list-item"><a href="https://species.wikimedia.org/wiki/Main_Page" hreflang="en"><span>Wikispecies</span></a></li><li class="wb-otherproject-link wb-otherproject-wikibooks mw-list-item"><a href="https://en.wikibooks.org/wiki/Main_Page" hreflang="en"><span>Wikibooks</span></a></li><li class="wb-otherproject-link wb-otherproject-wikidata mw-list-item"><a href="https://www.wikidata.org/wiki/Wikidata:Main_Page" hreflang="en"><span>Wikidata</span></a></li><li class="wb-otherproject-link wb-otherproject-wikifunctions mw-list-item"><a href="https://www.wikifunctions.org/wiki/Wikifunctions:Main_Page" hreflang="en"><span>Wikifunctions</span></a></li><li class="wb-otherproject-link wb-otherproject-wikinews mw-list-item"><a href="https://en.wikinews.org/wiki/Main_Page" hreflang="en"><span>Wikinews</span></a></li><li class="wb-otherproject-link wb-otherproject-wikiquote mw-list-item"><a href="https://en.wikiquote.org/wiki/Main_Page" hreflang="en"><span>Wikiquote</span></a></li><li class="wb-otherproject-link wb-otherproject-wikisource mw-list-item"><a href="https://en.wikisource.org/wiki/Main_Page" hreflang="en"><span>Wikisource</span></a></li><li class="wb-otherproject-link wb-otherproject-wikiversity mw-list-item"><a href="https://en.wikiversity.org/wiki/Wikiversity:Main_Page" hreflang="en"><span>Wikiversity</span></a></li><li class="wb-otherproject-link wb-otherproject-wikivoyage mw-list-item"><a href="https://en.wikivoyage.org/wiki/Main_Page" hreflang="en"><span>Wikivoyage</span></a></li><li class="wb-otherproject-link wb-otherproject-wiktionary mw-list-item"><a href="https://en.wiktionary.org/wiki/Wiktionary:Main_Page" hreflang="en"><span>Wiktionary</span></a></li><li id="t-wikibase" class="wb-otherproject-link wb-otherproject-wikibase-dataitem mw-list-item"><a href="https://www.wikidata.org/wiki/Special:EntityPage/Q5296" title="Structured data on this page hosted by Wikidata [⌃⌥g]" accesskey="g"><span>Wikidata item</span></a></li>
		</ul>
		
	</div>
</div>

</div>

									</div>
				
	</div>
</div>

							</nav>
						</div>
					</div>
				</div>
				<div class="vector-column-end no-font-mode-scale">
					<div class="vector-sticky-pinned-container">
						<nav class="vector-page-tools-landmark" aria-label="Page tools">
							<div id="vector-page-tools-pinned-container" class="vector-pinned-container">
				
							</div>
		</nav>
						<nav class="vector-appearance-landmark" aria-label="Appearance">
							<div id="vector-appearance-pinned-container" class="vector-pinned-container">
				

							</div>
		</nav>
					</div>
				</div>
				<div id="bodyContent" class="vector-body ve-init-mw-desktopArticleTarget-targetContainer" aria-labelledby="firstHeading" data-mw-ve-target-container="">
					<div class="vector-body-before-content">
					
						<div id="siteSub" class="noprint">From Wikipedia, the free encyclopedia</div>
					</div>
					<div id="contentSub"><div id="mw-content-subtitle"></div></div>
					
					
					<div id="mw-content-text" class="mw-body-content"><div class="mw-content-ltr mw-parser-output" lang="en" dir="ltr"><style data-mw-deduplicate="TemplateStyles:r1292935621">.mw-parser-output .mp-box{border:1px solid #aaa;padding:0 0.5em 0.5em;margin-top:4px}.mw-parser-output .mp-h2,body.skin-timeless .mw-parser-output .mp-h2{border:1px solid #aaa;margin:0.5em 0;padding:0.2em 0.4em;font-size:120%;font-weight:bold;font-family:inherit}.mw-parser-output .mp-later{font-size:85%;font-weight:normal}.mw-parser-output #mp-welcomecount{text-align:center;margin:0.4em}.mw-parser-output #mp-welcome{font-size:162%;padding:0.1em}.mw-parser-output #mp-welcome h1,.mw-parser-output #mp-welcome .mw-heading1{font-size:inherit;font-family:inherit;display:inline;border:none}.mw-parser-output #mp-free{font-size:95%}.mw-parser-output #articlecount{font-size:85%}.mw-parser-output #articlecount>ul{margin:0;padding:0}.mw-parser-output #articlecount>ul>li{margin:0;display:inline}.mw-parser-output #articlecount>ul>li::after{content:" · ";font-weight:bold}.mw-parser-output #articlecount>ul>li:last-child::after{content:""}.mw-parser-output #mp-banner{text-align:center;padding-top:0.5em}.mw-parser-output .mp-contains-float::after{content:"";display:block;clear:both}@media(max-width:875px){.mw-parser-output #mp-tfp table,.mw-parser-output #mp-tfp tr,.mw-parser-output #mp-tfp td,.mw-parser-output #mp-tfp tbody{display:block!important;width:100%!important;box-sizing:border-box}.mw-parser-output #mp-tfp tr:first-child td:first-child a.mw-file-description{text-align:center;display:table;margin:0 auto}.mw-parser-output #articlecount>ul>li::after{content:"";font-weight:normal}.mw-parser-output #articlecount>ul>li{display:block}}@media(min-width:875px){.mw-parser-output #mp-upper{display:flex}.mw-parser-output #mp-left{flex:1 1 55%;margin-right:2px}.mw-parser-output #mp-right{flex:1 1 45%;margin-left:2px}}@media screen{.mw-parser-output #mp-topbanner{background-color:#f9f9f9;border-color:#ddd}.mw-parser-output #mp-banner{background-color:#fffaf5;border-color:#f2e0ce}.mw-parser-output #mp-left{background-color:#f5fffa;border-color:#cef2e0}.mw-parser-output #mp-left .mp-h2{background-color:#cef2e0;border-color:#a3bfb1}.mw-parser-output #mp-right{background-color:#f5faff;border-color:#cedff2}.mw-parser-output #mp-right .mp-h2{background-color:#cedff2;border-color:#a3b0bf}.mw-parser-output #mp-middle{background-color:#fff5fa;border-color:#f2cedd}.mw-parser-output #mp-middle .mp-h2{background-color:#f2cedd;border-color:#bfa3af}.mw-parser-output #mp-lower{background-color:#faf5ff;border-color:#ddcef2}.mw-parser-output #mp-lower .mp-h2{background-color:#ddcef2;border-color:#afa3bf}.mw-parser-output #mp-bottom{border-color:#e2e2e2}.mw-parser-output #mp-bottom .mp-h2{background-color:#eee;border-color:#ddd}html.skin-theme-clientpref-night .mw-parser-output #mp-topbanner{background-color:#171a1d;border-color:#676767}html.skin-theme-clientpref-night .mw-parser-output #mp-banner{background-color:#331a00;border-color:#663428}html.skin-theme-clientpref-night .mw-parser-output #mp-left{background-color:#0b1e1c;border-color:#104437}html.skin-theme-clientpref-night .mw-parser-output #mp-left .mp-h2{background-color:#104437;border-color:#2f4d41}html.skin-theme-clientpref-night .mw-parser-output #mp-right{background-color:#0d1a27;border-color:#082849}html.skin-theme-clientpref-night .mw-parser-output #mp-right .mp-h2{background-color:#082849;border-color:#a3b0bf}html.skin-theme-clientpref-night .mw-parser-output #mp-middle{background-color:#270e1a;border-color:#882c43}html.skin-theme-clientpref-night .mw-parser-output #mp-middle .mp-h2{background-color:#882c43;border-color:#926c80}html.skin-theme-clientpref-night .mw-parser-output #mp-lower{background-color:#130e20;border-color:#7545ab}html.skin-theme-clientpref-night .mw-parser-output #mp-lower .mp-h2{background-color:#7545ab;border-color:#afa3bf}html.skin-theme-clientpref-night .mw-parser-output #mp-bottom{border-color:#676767}html.skin-theme-clientpref-night .mw-parser-output #mp-bottom .mp-h2{background-color:#3d3d3d;border-color:#676767}}@media screen and (prefers-color-scheme:dark){html.skin-theme-clientpref-os .mw-parser-output #mp-topbanner{background-color:#171a1d;border-color:#676767}html.skin-theme-clientpref-os .mw-parser-output #mp-banner{background-color:#331a00;border-color:#663428}html.skin-theme-clientpref-os .mw-parser-output #mp-left{background-color:#0b1e1c;border-color:#104437}html.skin-theme-clientpref-os .mw-parser-output #mp-left .mp-h2{background-color:#104437;border-color:#2f4d41}html.skin-theme-clientpref-os .mw-parser-output #mp-right{background-color:#0d1a27;border-color:#082849}html.skin-theme-clientpref-os .mw-parser-output #mp-right .mp-h2{background-color:#082849;border-color:#a3b0bf}html.skin-theme-clientpref-os .mw-parser-output #mp-middle{background-color:#270e1a;border-color:#882c43}html.skin-theme-clientpref-os .mw-parser-output #mp-middle .mp-h2{background-color:#882c43;border-color:#926c80}html.skin-theme-clientpref-os .mw-parser-output #mp-lower{background-color:#130e20;border-color:#7545ab}html.skin-theme-clientpref-os .mw-parser-output #mp-lower .mp-h2{background-color:#7545ab;border-color:#afa3bf}html.skin-theme-clientpref-os .mw-parser-output #mp-bottom{border-color:#676767}html.skin-theme-clientpref-os .mw-parser-output #mp-bottom .mp-h2{background-color:#3d3d3d;border-color:#676767}}</style>
<div id="mp-topbanner" class="mp-box">
<div id="mp-welcomecount">
<div id="mp-welcome"><div class="mw-heading mw-heading1"><h1 id="Welcome_to_Wikipedia">Welcome to <a href="/wiki/Wikipedia" title="Wikipedia">Wikipedia</a></h1></div>,</div>
<div id="mp-free">the <a href="/wiki/Free_content" title="Free content">free</a> <a href="/wiki/Encyclopedia" title="Encyclopedia">encyclopedia</a> that <a href="/wiki/Help:Introduction_to_Wikipedia" title="Help:Introduction to Wikipedia">anyone can edit</a>.</div>
<div id="articlecount"><ul><li><a href="/wiki/Special:Statistics" title="Special:Statistics">115,439</a> active editors</li> <li><a href="/wiki/Special:Statistics" title="Special:Statistics">7,005,995</a> articles in <a href="/wiki/English_language" title="English language">English</a></li></ul></div>
</div>
</div>
<div id="mp-banner" class="MainPageBG mp-box">
<div>The <a href="/wiki/English_Wikipedia" title="English Wikipedia">English-language Wikipedia</a> thanks its contributors for creating more than seven million articles! <br><b><a href="/wiki/Wikipedia:Seven_million_articles" title="Wikipedia:Seven million articles">Learn how you can take part</a></b> in the encyclopedia's continued improvement.</div>
</div>
<div id="mp-upper">
<div id="mp-left" class="MainPageBG mp-box">
<h2 id="mp-tfa-h2" class="mp-h2 mw-html-heading">From today's featured article</h2>
<div id="mp-tfa" class="mp-contains-float"><div id="mp-tfa-img" style="float: left; margin: 0.5em 0.9em 0.4em 0em;">
<div class="thumbinner mp-thumb" style="background: transparent; color: inherit; border: none; padding: 0; max-width: 121px;">
<span typeof="mw:File"><a href="/wiki/File:Kate_Moss_-_Decort%C3%A9_advertisement_(cropped2).jpg" class="mw-file-description" title="Kate Moss in 2019"><img alt="Kate Moss in 2019" src="//upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Kate_Moss_-_Decort%C3%A9_advertisement_%28cropped2%29.jpg/250px-Kate_Moss_-_Decort%C3%A9_advertisement_%28cropped2%29.jpg" decoding="async" width="121" height="161" class="mw-file-element" data-file-width="658" data-file-height="877"></a></span><div class="thumbcaption" style="padding: 0.25em 0; word-wrap: break-word;"><a href="/wiki/Kate_Moss" title="Kate Moss">Kate Moss</a> in 2019</div></div>
</div>
<p>The <b><a href="/wiki/Illusion_of_Kate_Moss" title="Illusion of Kate Moss">illusion of Kate Moss</a></b> is an art piece first shown at the conclusion of the <a href="/wiki/Alexander_McQueen" title="Alexander McQueen">Alexander McQueen</a> runway show <i><a href="/wiki/The_Widows_of_Culloden" title="The Widows of Culloden">The Widows of Culloden</a></i> (Autumn/Winter<span class="nowrap">&nbsp;</span>2006). It consists of a short film of English model <a href="/wiki/Kate_Moss" title="Kate Moss">Kate Moss</a> dancing slowly while wearing a long, billowing gown of white <a href="/wiki/Chiffon_(fabric)" title="Chiffon (fabric)">chiffon</a>, projected life-size within a glass pyramid in the centre of the show's catwalk. Although sometimes referred to as a <a href="/wiki/Holography" title="Holography">hologram</a>, the illusion was made using a 19th-century theatre technique called <a href="/wiki/Pepper%27s_ghost" title="Pepper's ghost">Pepper's ghost</a>. McQueen conceived the illusion as a gesture of support for Moss; she was a close friend of his and was embroiled in a drug-related scandal at the time of the <i>Widows</i> show. It is regarded by many critics as the highlight of the <i>Widows</i> runway show, and it has been the subject of a great deal of academic analysis, particularly as a <a href="/wiki/Wedding_dress" title="Wedding dress">wedding dress</a> and as a <i><a href="/wiki/Memento_mori" title="Memento mori">memento mori</a></i>. The illusion appeared in both versions of <i><a href="/wiki/Alexander_McQueen:_Savage_Beauty" title="Alexander McQueen: Savage Beauty">Alexander McQueen: Savage Beauty</a></i>, a retrospective exhibition of McQueen's designs. (<b><a href="/wiki/Illusion_of_Kate_Moss" title="Illusion of Kate Moss">Full&nbsp;article...</a></b>)
</p>
<div class="tfa-recent" style="text-align: right;">
Recently featured: <style data-mw-deduplicate="TemplateStyles:r1129693374">.mw-parser-output .hlist dl,.mw-parser-output .hlist ol,.mw-parser-output .hlist ul{margin:0;padding:0}.mw-parser-output .hlist dd,.mw-parser-output .hlist dt,.mw-parser-output .hlist li{margin:0;display:inline}.mw-parser-output .hlist.inline,.mw-parser-output .hlist.inline dl,.mw-parser-output .hlist.inline ol,.mw-parser-output .hlist.inline ul,.mw-parser-output .hlist dl dl,.mw-parser-output .hlist dl ol,.mw-parser-output .hlist dl ul,.mw-parser-output .hlist ol dl,.mw-parser-output .hlist ol ol,.mw-parser-output .hlist ol ul,.mw-parser-output .hlist ul dl,.mw-parser-output .hlist ul ol,.mw-parser-output .hlist ul ul{display:inline}.mw-parser-output .hlist .mw-empty-li{display:none}.mw-parser-output .hlist dt::after{content:": "}.mw-parser-output .hlist dd::after,.mw-parser-output .hlist li::after{content:" · ";font-weight:bold}.mw-parser-output .hlist dd:last-child::after,.mw-parser-output .hlist dt:last-child::after,.mw-parser-output .hlist li:last-child::after{content:none}.mw-parser-output .hlist dd dd:first-child::before,.mw-parser-output .hlist dd dt:first-child::before,.mw-parser-output .hlist dd li:first-child::before,.mw-parser-output .hlist dt dd:first-child::before,.mw-parser-output .hlist dt dt:first-child::before,.mw-parser-output .hlist dt li:first-child::before,.mw-parser-output .hlist li dd:first-child::before,.mw-parser-output .hlist li dt:first-child::before,.mw-parser-output .hlist li li:first-child::before{content:" (";font-weight:normal}.mw-parser-output .hlist dd dd:last-child::after,.mw-parser-output .hlist dd dt:last-child::after,.mw-parser-output .hlist dd li:last-child::after,.mw-parser-output .hlist dt dd:last-child::after,.mw-parser-output .hlist dt dt:last-child::after,.mw-parser-output .hlist dt li:last-child::after,.mw-parser-output .hlist li dd:last-child::after,.mw-parser-output .hlist li dt:last-child::after,.mw-parser-output .hlist li li:last-child::after{content:")";font-weight:normal}.mw-parser-output .hlist ol{counter-reset:listitem}.mw-parser-output .hlist ol>li{counter-increment:listitem}.mw-parser-output .hlist ol>li::before{content:" "counter(listitem)"a0 "}.mw-parser-output .hlist dd ol>li:first-child::before,.mw-parser-output .hlist dt ol>li:first-child::before,.mw-parser-output .hlist li ol>li:first-child::before{content:" ("counter(listitem)"a0 "}</style><div class="hlist inline">
<ul><li><a href="/wiki/Barbara_Bush" title="Barbara Bush">Barbara Bush</a></li>
<li><a href="/wiki/8th_Missouri_Infantry_Regiment_(Confederate)" title="8th Missouri Infantry Regiment (Confederate)">8th Missouri Infantry Regiment (Confederate)</a></li>
<li><a href="/wiki/American_logistics_in_the_Northern_France_campaign" title="American logistics in the Northern France campaign">American logistics in the Northern France campaign</a></li></ul>
</div></div>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist tfa-footer noprint" style="text-align:right;">
<ul><li><b><a href="/wiki/Wikipedia:Today%27s_featured_article/June_2025" title="Wikipedia:Today's featured article/June 2025">Archive</a></b></li>
<li><b><a href="https://lists.wikimedia.org/postorius/lists/daily-article-l.lists.wikimedia.org/" class="extiw" title="mail:daily-article-l">By email</a></b></li>
<li><b><a href="/wiki/Wikipedia:Featured_articles_(linked_from_TFAfooter)" class="mw-redirect" title="Wikipedia:Featured articles (linked from TFAfooter)">More featured articles</a></b></li>
<li><b><a href="/wiki/Wikipedia:About_Today%27s_featured_article" title="Wikipedia:About Today's featured article">About</a></b></li></ul>
</div></div>
<h2 id="mp-dyk-h2" class="mp-h2 mw-html-heading">Did you know&nbsp;...</h2>
<div id="mp-dyk" class="mp-contains-float">
<div class="dyk-img" style="float: right; margin-left: 0.5em;">
<div class="thumbinner mp-thumb" style="background: transparent; color: inherit; border: none; padding: 0; max-width: 115px;">
<span typeof="mw:File"><a href="/wiki/File:Helen_Kendall.jpg" class="mw-file-description" title="Helen Kendall"><img alt="Helen Kendall" src="//upload.wikimedia.org/wikipedia/commons/thumb/1/12/Helen_Kendall.jpg/120px-Helen_Kendall.jpg" decoding="async" width="115" height="171" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/1/12/Helen_Kendall.jpg/250px-Helen_Kendall.jpg 1.5x" data-file-width="570" data-file-height="850"></a></span><div class="thumbcaption" style="padding: 0.25em 0; word-wrap: break-word;">Helen Kendall</div></div>
</div>
<ul><li>... that <b><a href="/wiki/Helen_Kendall" title="Helen Kendall">Helen Kendall</a></b> <i>(pictured)</i> was one of 446 Canadians to receive the <a href="/wiki/Royal_Red_Cross" title="Royal Red Cross">Royal Red Cross</a> for her service in World War&nbsp;I?</li>
<li>... that suggested responses to <b><a href="/wiki/Nihilism" title="Nihilism">nihilism</a></b> include detachment, resignation, defiance, disruption, and the creation of new values?</li>
<li>... that <b><a href="/wiki/Sumahadi" title="Sumahadi">Sumahadi</a></b>, a future Indonesian minister of forestry, was the only person in his cohort to graduate without a thesis?</li>
<li>... that <a href="/wiki/Joe_Pantoliano" title="Joe Pantoliano">Joe Pantoliano</a> thought that he would star in <i><a href="/wiki/This_Is_Us" title="This Is Us">This Is Us</a></i>, not <b><a href="/wiki/The_Price_(The_Last_of_Us)" title="The Price (The Last of Us)">an episode of <i>The Last of Us</i></a></b><span style="padding-left:0.15em;">?</span></li>
<li>... that the <b><a href="/wiki/Kelston_toll_road" title="Kelston toll road">first UK private toll road in a century</a></b> operated for 14 weeks in 2014?</li>
<li>... that <i><b><a href="/wiki/The_Dark_Domain" title="The Dark Domain">The Dark Domain</a></b></i> was said by one critic to have placed its author "within the canon of supernatural greats"?</li>
<li>... that <a href="/wiki/Remedios_Varo" title="Remedios Varo">Remedios Varo</a>'s only sculpture, <i><b><a href="/wiki/Homo_rodans" title="Homo rodans">Homo rodans</a></b></i>, is accompanied by a satirical anthropological manuscript?</li>
<li>... that it was feared that <b><a href="/wiki/Earl_Ohlgren" title="Earl Ohlgren">Earl Ohlgren</a></b> had broken his neck during an <a href="/wiki/NFL_preseason" title="NFL preseason">NFL exhibition</a> game, but he was actually just in <a href="/wiki/Acute_stress_reaction" title="Acute stress reaction">shock</a>?</li></ul>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist dyk-footer noprint" style="margin-top: 0.5em; text-align: right;">
<ul><li><b><a href="/wiki/Wikipedia:Recent_additions" title="Wikipedia:Recent additions">Archive</a></b></li>
<li><b><a href="/wiki/Help:Your_first_article" title="Help:Your first article">Start a new article</a></b></li>
<li><b><a href="/wiki/Template_talk:Did_you_know" title="Template talk:Did you know">Nominate an article</a></b></li></ul>
</div>
</div>
</div>
<div id="mp-right" class="MainPageBG mp-box">
<h2 id="mp-itn-h2" class="mp-h2 mw-html-heading">In the news</h2>
<div id="mp-itn" class="mp-contains-float"><style data-mw-deduplicate="TemplateStyles:r1053378754">.mw-parser-output .itn-img{float:right;margin-left:0.5em;margin-top:0.2em}</style><div role="figure" class="itn-img">
<div class="thumbinner mp-thumb" style="background: transparent; color: inherit; border: none; padding: 0; max-width: 121px;">
<span typeof="mw:File"><a href="/wiki/File:Luvsannamsrain_Oyun-Erdene,_Prime_Minister_of_Mongolia_at_The_Pentagon,_USA_on_August_3,_2023_(cropped).jpg" class="mw-file-description" title="Luvsannamsrain Oyun-Erdene in 2023"><img alt="Luvsannamsrain Oyun-Erdene in 2023" src="//upload.wikimedia.org/wikipedia/commons/thumb/9/97/Luvsannamsrain_Oyun-Erdene%2C_Prime_Minister_of_Mongolia_at_The_Pentagon%2C_USA_on_August_3%2C_2023_%28cropped%29.jpg/250px-Luvsannamsrain_Oyun-Erdene%2C_Prime_Minister_of_Mongolia_at_The_Pentagon%2C_USA_on_August_3%2C_2023_%28cropped%29.jpg" decoding="async" width="121" height="161" class="mw-file-element" data-file-width="1952" data-file-height="2604"></a></span><div class="thumbcaption" style="padding: 0.25em 0; word-wrap: break-word; text-align: left;">Luvsannamsrain Oyun-Erdene</div></div>
</div>
<ul><li><a href="/wiki/Prime_Minister_of_Mongolia" title="Prime Minister of Mongolia">Prime Minister of Mongolia</a> <b><a href="/wiki/Luvsannamsrain_Oyun-Erdene" title="Luvsannamsrain Oyun-Erdene">Luvsannamsrain Oyun-Erdene</a></b> <i>(pictured)</i> resigns after <a href="/wiki/2025_Mongolian_protests" title="2025 Mongolian protests">weeks of protests</a>.</li>
<li>In the Netherlands, <a href="/wiki/2025_Dutch_general_election" title="2025 Dutch general election">an early election</a> is called after the <b><a href="/wiki/Schoof_cabinet" title="Schoof cabinet">Schoof cabinet</a></b> collapses as the <a href="/wiki/Party_for_Freedom" title="Party for Freedom">PVV</a> abandons the governing coalition.</li>
<li><a href="/wiki/Lee_Jae-myung" title="Lee Jae-myung">Lee Jae-myung</a> <b><a href="/wiki/2025_South_Korean_presidential_election" title="2025 South Korean presidential election">is elected</a></b> as <a href="/wiki/President_of_South_Korea" title="President of South Korea">president of South Korea</a>.</li>
<li>In cricket, <a href="/wiki/2025_Indian_Premier_League" title="2025 Indian Premier League">the Indian Premier League</a> concludes with <a href="/wiki/Royal_Challengers_Bengaluru" title="Royal Challengers Bengaluru">Royal Challengers Bengaluru</a> <b><a href="/wiki/2025_Indian_Premier_League_final" title="2025 Indian Premier League final">defeating</a></b> <a href="/wiki/Punjab_Kings" title="Punjab Kings">Punjab Kings</a>.</li>
<li><a href="/wiki/Karol_Nawrocki" title="Karol Nawrocki">Karol Nawrocki</a> <b><a href="/wiki/2025_Polish_presidential_election" title="2025 Polish presidential election">is elected</a></b> as <a href="/wiki/President_of_Poland" title="President of Poland">president of Poland</a>.</li></ul>
<div class="itn-footer" style="margin-top: 0.5em;">
<div><b><a href="/wiki/Portal:Current_events" title="Portal:Current events">Ongoing</a></b>: <link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist inline">
<ul><li><a href="/wiki/Gaza_war" title="Gaza war">Gaza war</a></li>
<li><a href="/wiki/Russian_invasion_of_Ukraine" title="Russian invasion of Ukraine">Russian invasion of Ukraine</a>
<ul><li><a href="/wiki/Timeline_of_the_Russian_invasion_of_Ukraine_(1_June_2025_%E2%80%93_present)" title="Timeline of the Russian invasion of Ukraine (1 June 2025 – present)">timeline</a></li></ul></li>
<li><a href="/wiki/Sudanese_civil_war_(2023%E2%80%93present)" title="Sudanese civil war (2023–present)">Sudanese civil war</a>
<ul><li><a href="/wiki/Timeline_of_the_Sudanese_civil_war_(2025)" title="Timeline of the Sudanese civil war (2025)">timeline</a></li></ul></li></ul></div></div>
<div><b><a href="/wiki/Deaths_in_2025" title="Deaths in 2025">Recent deaths</a></b>: <link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist inline">
<ul><li><a href="/wiki/Edgar_Lungu" title="Edgar Lungu">Edgar Lungu</a></li>
<li><a href="/wiki/Pierre_Nora" title="Pierre Nora">Pierre Nora</a></li>
<li><a href="/wiki/David_Cordier" title="David Cordier">David Cordier</a></li>
<li><a href="/wiki/Jonathan_Joss" title="Jonathan Joss">Jonathan Joss</a></li>
<li><a href="/wiki/John_Brenkus" title="John Brenkus">John Brenkus</a></li>
<li><a href="/wiki/John_Thrasher_(Florida_politician)" title="John Thrasher (Florida politician)">John Thrasher</a></li></ul></div></div></div>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist itn-footer noprint" style="text-align:right;">
<ul><li><b><a href="/wiki/Wikipedia:In_the_news/Candidates" title="Wikipedia:In the news/Candidates">Nominate an article</a></b></li></ul>
</div></div>
<h2 id="mp-otd-h2" class="mp-h2 mw-html-heading">On this day</h2>
<div id="mp-otd" class="mp-contains-float">
<p><b><a href="/wiki/June_9" title="June 9">June 9</a></b>
</p>
<div style="float:right;margin-left:0.5em;" id="mp-otd-img">
<div class="thumbinner mp-thumb" style="background: transparent; color: inherit; border: none; padding: 0; max-width: 116px;">
<span typeof="mw:File"><a href="/wiki/File:Ohio_arch%C3%A6ological_and_historical_quarterly_(1888)_(14771247134).jpg" class="mw-file-description" title="Abraham Whipple"><img alt="Abraham Whipple" src="//upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Ohio_arch%C3%A6ological_and_historical_quarterly_%281888%29_%2814771247134%29.jpg/120px-Ohio_arch%C3%A6ological_and_historical_quarterly_%281888%29_%2814771247134%29.jpg" decoding="async" width="116" height="168" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Ohio_arch%C3%A6ological_and_historical_quarterly_%281888%29_%2814771247134%29.jpg/250px-Ohio_arch%C3%A6ological_and_historical_quarterly_%281888%29_%2814771247134%29.jpg 1.5x" data-file-width="1940" data-file-height="2808"></a></span><div class="thumbcaption" style="padding: 0.25em 0; word-wrap: break-word;">Abraham Whipple</div></div>
</div>
<ul><li><a href="/wiki/1549" title="1549">1549</a> – The <b><a href="/wiki/Book_of_Common_Prayer_(1549)" title="Book of Common Prayer (1549)">first <i>Book of Common Prayer</i></a></b> was legally mandated by Parliament, introducing a fully vernacular <a href="/wiki/Protestant_liturgy" title="Protestant liturgy">Protestant liturgy</a> to the <a href="/wiki/Church_of_England" title="Church of England">Church of England</a>.</li>
<li><a href="/wiki/1772" title="1772">1772</a> – In an act of defiance against the <a href="/wiki/Navigation_Acts" title="Navigation Acts">Navigation Acts</a>, American colonists led by <a href="/wiki/Abraham_Whipple" title="Abraham Whipple">Abraham Whipple</a> <i>(pictured)</i> attacked and burned the British <a href="/wiki/Schooner" title="Schooner">schooner</a> <i><b><a href="/wiki/Gaspee_affair" title="Gaspee affair">Gaspee</a></b></i>.</li>
<li><a href="/wiki/1928" title="1928">1928</a> – Australian aviator <b><a href="/wiki/Charles_Kingsford_Smith" title="Charles Kingsford Smith">Charles Kingsford Smith</a></b> and his crew landed the <i><a href="/wiki/Southern_Cross_(aircraft)" title="Southern Cross (aircraft)">Southern Cross</a></i> in <a href="/wiki/Brisbane" title="Brisbane">Brisbane</a>, completing the first <a href="/wiki/Transpacific_flight" title="Transpacific flight">transpacific flight</a>.</li>
<li><a href="/wiki/1999" title="1999">1999</a> – <a href="/wiki/Yugoslav_Wars" title="Yugoslav Wars">Yugoslav Wars</a>: The <b><a href="/wiki/Kumanovo_Agreement" title="Kumanovo Agreement">Kumanovo Agreement</a></b> was signed, bringing an end to the <a href="/wiki/Kosovo_War" title="Kosovo War">Kosovo War</a> the next day.</li></ul>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist" style="margin-top: 0.5em;"><ul><li><b><a href="/wiki/Sarah_Rapelje" title="Sarah Rapelje">Sarah Rapelje</a></b>  (<abbr title="born">b.</abbr>&nbsp;1625)</li><li><b><a href="/wiki/Doveton_Sturdee" title="Doveton Sturdee">Doveton Sturdee</a></b>  (<abbr title="born">b.</abbr>&nbsp;1859)</li><li><b><a href="/wiki/Charles_Wuorinen" title="Charles Wuorinen">Charles Wuorinen</a></b>  (<abbr title="born">b.</abbr>&nbsp;1938)</li><li><b><a href="/wiki/Brian_Williamson" title="Brian Williamson">Brian Williamson</a></b>  (<abbr title="died">d.</abbr>&nbsp;2004)</li></ul></div>
<div style="margin-top:0.5em;">
More anniversaries: <link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist inline nowraplinks">
<ul><li><a href="/wiki/June_8" title="June 8">June 8</a></li>
<li><b><a href="/wiki/June_9" title="June 9">June 9</a></b></li>
<li><a href="/wiki/June_10" title="June 10">June 10</a></li></ul>
</div></div>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist otd-footer noprint" style="text-align:right;">
<ul><li><b><a href="/wiki/Wikipedia:Selected_anniversaries/June" title="Wikipedia:Selected anniversaries/June">Archive</a></b></li>
<li><b><a href="https://lists.wikimedia.org/postorius/lists/daily-article-l.lists.wikimedia.org/" class="extiw" title="mail:daily-article-l">By email</a></b></li>
<li><b><a href="/wiki/List_of_days_of_the_year" title="List of days of the year">List of days of the year</a></b></li>
<li><b><a href="/wiki/Wikipedia:Selected_anniversaries" title="Wikipedia:Selected anniversaries">About</a></b></li></ul>
</div></div>
</div>
</div>
<div id="mp-middle" class="MainPageBG mp-box">
<h2 id="mp-tfl-h2" class="mp-h2 mw-html-heading">From today's featured list</h2>
<div id="mp-tfl" class="mp-contains-float"><div id="mp-tfl-img" style="float:right;margin:0.5em 0 0.4em 0.9em;"><div class="thumbinner mp-thumb" style="background: transparent; color: inherit; border: none; padding: 0; max-width: 199px;">
<span typeof="mw:File"><a href="/wiki/File:Bini_Billboard_K_POWER_100_(cropped).jpg" class="mw-file-description" title="Bini at Billboard Korea K Power 100 event"><img alt="Bini at Billboard Korea K Power 100 event" src="//upload.wikimedia.org/wikipedia/commons/thumb/9/96/Bini_Billboard_K_POWER_100_%28cropped%29.jpg/250px-Bini_Billboard_K_POWER_100_%28cropped%29.jpg" decoding="async" width="199" height="98" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/9/96/Bini_Billboard_K_POWER_100_%28cropped%29.jpg/330px-Bini_Billboard_K_POWER_100_%28cropped%29.jpg 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/9/96/Bini_Billboard_K_POWER_100_%28cropped%29.jpg/500px-Bini_Billboard_K_POWER_100_%28cropped%29.jpg 2x" data-file-width="1359" data-file-height="672"></a></span><div class="thumbcaption" style="padding: 0.25em 0; word-wrap: break-word;">Bini at <i>Billboard Korea</i> K Power 100 event</div></div>
</div>
<p>Filipino girl group <a href="/wiki/Bini_(group)" title="Bini (group)">Bini</a> <i>(pictured)</i> <b><a href="/wiki/List_of_awards_and_nominations_received_by_Bini" title="List of awards and nominations received by Bini">has won 44 awards from 83 nominations and 8 honorees</a></b>. The group includes <a href="/wiki/Aiah" title="Aiah">Aiah</a>, <a href="/wiki/Maloi" title="Maloi">Maloi</a>, Gwen, <a href="/wiki/Stacey_(singer)" title="Stacey (singer)">Stacey</a>, <a href="/wiki/Mikha_(singer)" title="Mikha (singer)">Mikha</a>, <a href="/wiki/Jhoanna" title="Jhoanna">Jhoanna</a> and <a href="/wiki/Sheena_(singer)" title="Sheena (singer)">Sheena</a>, and debuted on June 11, 2021. They are the recipients of five <a href="/wiki/Awit_Awards" title="Awit Awards">Awit Awards</a>, twelve Ppop Music Awards, and one <a href="/wiki/MTV_Europe_Music_Awards" title="MTV Europe Music Awards">MTV Europe Music Awards</a>. In 2021, Bini released their debut song "<a href="/wiki/Born_to_Win_(song)" title="Born to Win (song)">Born to Win</a>" and was nominated for Wish Pop Song at the <a href="/wiki/Wish_107.5_Music_Awards" title="Wish 107.5 Music Awards">Wish Music Awards</a>. In 2022, they earned multiple nominations at the 2023 Awit Awards for Record of the Year and Song of the Year on their single "<a href="/wiki/Lagi_(song)" title="Lagi (song)">Lagi</a>" (<abbr style="font-size:85%" title="literal translation">lit.</abbr><span style="white-space: nowrap;"> </span><span class="gloss-quot">'</span><span class="gloss-text">Always</span><span class="gloss-quot">'</span>), under their second album, <i><a href="/wiki/Feel_Good_(Bini_album)" title="Feel Good (Bini album)">Feel Good</a></i>. In 2024, Bini became the first Filipino group to win Best Asia Act at the <a href="/wiki/2024_MTV_Europe_Music_Awards" title="2024 MTV Europe Music Awards">2024 MTV Europe Music Awards</a> and was also honored with the Rising Star Award at the <a href="/wiki/Billboard_Philippines_Women_in_Music" title="Billboard Philippines Women in Music"><i>Billboard Philippines</i> Women in Music</a>. In 2025, they also won Top Local Artist of the Year at the launching of the <a href="/wiki/Official_Philippines_Chart" title="Official Philippines Chart">Official Philippines Chart</a>. (<b><a href="/wiki/List_of_awards_and_nominations_received_by_Bini" title="List of awards and nominations received by Bini">Full&nbsp;list...</a></b>)
</p>
<div class="tfl-recent" style="text-align: right;">
Recently featured: <link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist inline">
<ul><li><a href="/wiki/Portland_Trail_Blazers_all-time_roster" title="Portland Trail Blazers all-time roster">Portland Trail Blazers all-time roster</a></li>
<li><a href="/wiki/List_of_hillforts_and_ancient_settlements_in_Somerset" title="List of hillforts and ancient settlements in Somerset">Hillforts and ancient settlements in Somerset</a></li>
<li><a href="/wiki/List_of_Seventeen_live_performances" title="List of Seventeen live performances">Seventeen live performances</a></li></ul>
</div></div>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist tfl-footer noprint" style="text-align:right;">
<ul><li><b><a href="/wiki/Wikipedia:Today%27s_featured_list/June_2025" title="Wikipedia:Today's featured list/June 2025">Archive</a></b></li>
<li><b><a href="/wiki/Wikipedia:Featured_lists" title="Wikipedia:Featured lists">More featured lists</a></b></li></ul>
</div></div>
</div>
<div id="mp-lower" class="MainPageBG mp-box">
<h2 id="mp-tfp-h2" class="mp-h2 mw-html-heading">Today's featured pictures</h2>
<div id="mp-tfp">
<table role="presentation" style="margin:0 3px 3px; width:100%; box-sizing:border-box; text-align:left; border-collapse:collapse;">
<tbody><tr>
<td style="padding:0 0.9em 0 0; width:300px;"><div><span typeof="mw:File"><a href="/wiki/File:Lestes_dryas_male_(side_view)_-_Kulna.jpg" class="mw-file-description" title="Lestes dryas"><img alt="Lestes dryas" src="//upload.wikimedia.org/wikipedia/commons/thumb/7/72/Lestes_dryas_male_%28side_view%29_-_Kulna.jpg/330px-Lestes_dryas_male_%28side_view%29_-_Kulna.jpg" decoding="async" width="300" height="200" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/7/72/Lestes_dryas_male_%28side_view%29_-_Kulna.jpg/500px-Lestes_dryas_male_%28side_view%29_-_Kulna.jpg 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/7/72/Lestes_dryas_male_%28side_view%29_-_Kulna.jpg/960px-Lestes_dryas_male_%28side_view%29_-_Kulna.jpg 2x" data-file-width="8256" data-file-height="5504"></a></span></div><div style="margin-top:0.5em;"><span typeof="mw:File"><a href="/wiki/File:Lestes_dryas_male_(dorsal_view)_-_Kulna.jpg" class="mw-file-description" title="Lestes dryas"><img alt="Lestes dryas" src="//upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Lestes_dryas_male_%28dorsal_view%29_-_Kulna.jpg/330px-Lestes_dryas_male_%28dorsal_view%29_-_Kulna.jpg" decoding="async" width="300" height="240" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Lestes_dryas_male_%28dorsal_view%29_-_Kulna.jpg/500px-Lestes_dryas_male_%28dorsal_view%29_-_Kulna.jpg 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Lestes_dryas_male_%28dorsal_view%29_-_Kulna.jpg/960px-Lestes_dryas_male_%28dorsal_view%29_-_Kulna.jpg 2x" data-file-width="6880" data-file-height="5504"></a></span></div>
</td>
<td style="padding:0 6px 0 0">
<p><i><b><a href="/wiki/Lestes_dryas" title="Lestes dryas">Lestes dryas</a></b></i> is a species of <a href="/wiki/Damselfly" title="Damselfly">damselfly</a> in the family <a href="/wiki/Lestidae" title="Lestidae">Lestidae</a>, the spreadwings. Its common names include emerald spreadwing, scarce emerald damselfly, and robust spreadwing. This species is native to the <a href="/wiki/Holarctic_realm" title="Holarctic realm">Holarctic realm</a>, especially northern parts of Eurasia and North America, and <a href="/wiki/Relict_(biology)" title="Relict (biology)">relictual</a> in <a href="/wiki/North_Africa" title="North Africa">North Africa</a>. It is about 35 to 42 millimetres (1.4 to 1.7&nbsp;in) long, with the males generally longer than the females. The males have a <a href="/wiki/Wingspan" title="Wingspan">wingspan</a> of about 45 millimetres (1.8&nbsp;in), and the females of about 47 millimetres (1.9&nbsp;in). Both sexes of <i>L. dryas</i> have largely metallic green bodies with a bronze <a href="/wiki/Iridescence" title="Iridescence">iridescence</a>, with blue <a href="/wiki/Pruinescence" title="Pruinescence">pruinescence</a> developing as they age. This male emerald spreadwing was photographed in <a href="/wiki/Kulna" title="Kulna">Kulna</a>, Estonia.
</p>
<p style="text-align:left;"><small>Photograph credit: <a href="https://commons.wikimedia.org/wiki/User:Iifar" class="extiw" title="c:User:Iifar">Ivar Leidus</a></small></p>
<div class="potd-recent" style="text-align:right;">
Recently featured: <link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist inline">
<ul><li><a href="/wiki/Template:POTD/2025-06-08" title="Template:POTD/2025-06-08">Gustave III (Auber)</a></li>
<li><a href="/wiki/Template:POTD/2025-06-07" title="Template:POTD/2025-06-07">Mount Rundle</a></li>
<li><a href="/wiki/Template:POTD/2025-06-06" title="Template:POTD/2025-06-06">Bearded vulture</a></li></ul>
</div></div>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist potd-footer noprint" style="text-align:right;">
<ul><li><b><a href="/wiki/Wikipedia:Picture_of_the_day/Archive" title="Wikipedia:Picture of the day/Archive">Archive</a></b></li>
<li><b><a href="/wiki/Wikipedia:Featured_pictures" title="Wikipedia:Featured pictures">More featured pictures</a></b></li></ul>
</div>
</td></tr></tbody></table></div>
</div>
<div id="mp-bottom" class="mp-box">
<h2 id="mp-other" class="mp-h2 mw-html-heading">Other areas of Wikipedia</h2>
<div id="mp-other-content">
<ul><li><b><a href="/wiki/Wikipedia:Community_portal" title="Wikipedia:Community portal">Community portal</a></b> – The central hub for editors, with resources, links, tasks, and announcements.</li>
<li><b><a href="/wiki/Wikipedia:Village_pump" title="Wikipedia:Village pump">Village pump</a></b> – Forum for discussions about Wikipedia itself, including policies and technical issues.</li>
<li><b><a href="/wiki/Wikipedia:News" title="Wikipedia:News">Site news</a></b> – Sources of news about Wikipedia and the broader Wikimedia movement.</li>
<li><b><a href="/wiki/Wikipedia:Teahouse" title="Wikipedia:Teahouse">Teahouse</a></b> – Ask basic questions about using or editing Wikipedia.</li>
<li><b><a href="/wiki/Wikipedia:Help_desk" title="Wikipedia:Help desk">Help desk</a></b> – Ask questions about using or editing Wikipedia.</li>
<li><b><a href="/wiki/Wikipedia:Reference_desk" title="Wikipedia:Reference desk">Reference desk</a></b> – Ask research questions about encyclopedic topics.</li>
<li><b><a href="/wiki/Wikipedia:Contents/Portals" title="Wikipedia:Contents/Portals">Content portals</a></b> – A unique way to navigate the encyclopedia.</li></ul>
</div>
<h2 id="mp-sister" class="mp-h2 mw-html-heading">Wikipedia's sister projects</h2>
<div id="mp-sister-content"><style data-mw-deduplicate="TemplateStyles:r1239335380">.mw-parser-output #sister-projects-list{display:flex;flex-wrap:wrap}.mw-parser-output #sister-projects-list li{display:inline-block}.mw-parser-output #sister-projects-list li span{font-weight:bold}.mw-parser-output #sister-projects-list li>div{display:inline-block;vertical-align:middle;padding:6px 4px}.mw-parser-output #sister-projects-list li>div:first-child{text-align:center}@media screen{.mw-parser-output .sister-projects-wikt-icon-dark,html.skin-theme-clientpref-night .mw-parser-output .sister-projects-wikt-icon-light{display:none}html.skin-theme-clientpref-night .mw-parser-output .sister-projects-wikt-icon-dark{display:inline}}@media screen and (prefers-color-scheme:dark){html.skin-theme-clientpref-os .mw-parser-output .sister-projects-wikt-icon-dark{display:inline}html.skin-theme-clientpref-os .mw-parser-output .sister-projects-wikt-icon-light{display:none}}@media(min-width:360px){.mw-parser-output #sister-projects-list li{width:33%;min-width:20em;white-space:nowrap;flex:1 0 25%}.mw-parser-output #sister-projects-list li>div:first-child{min-width:50px}}</style>
<p>Wikipedia is written by volunteer editors and hosted by the <a href="/wiki/Wikimedia_Foundation" title="Wikimedia Foundation">Wikimedia Foundation</a>, a non-profit organization that also hosts a range of other volunteer <a href="https://wikimediafoundation.org/our-work/wikimedia-projects/" class="extiw" title="foundationsite:our-work/wikimedia-projects/">projects</a>:
</p>
<style data-mw-deduplicate="TemplateStyles:r1126788409">.mw-parser-output .plainlist ol,.mw-parser-output .plainlist ul{line-height:inherit;list-style:none;margin:0;padding:0}.mw-parser-output .plainlist ol li,.mw-parser-output .plainlist ul li{margin-bottom:0}</style><div class="plainlist">
<ul id="sister-projects-list">
<li>
  <div><span typeof="mw:File"><a href="https://commons.wikimedia.org/wiki/" title="Commons"><img alt="Commons logo" src="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/40px-Commons-logo.svg.png" decoding="async" width="31" height="42" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/60px-Commons-logo.svg.png 1.5x, //upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/120px-Commons-logo.svg.png 2x" data-file-width="1024" data-file-height="1376"></a></span></div>
  <div><span><a href="https://commons.wikimedia.org/wiki/" class="extiw" title="c:">Commons</a></span><br>Free media repository</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://www.mediawiki.org/wiki/" title="MediaWiki"><img alt="MediaWiki logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/a/a6/MediaWiki-2020-icon.svg/40px-MediaWiki-2020-icon.svg.png" decoding="async" width="35" height="35" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/a/a6/MediaWiki-2020-icon.svg/60px-MediaWiki-2020-icon.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/a/a6/MediaWiki-2020-icon.svg/70px-MediaWiki-2020-icon.svg.png 2x" data-file-width="100" data-file-height="100"></a></span></div>
  <div><span><a href="https://www.mediawiki.org/wiki/" class="extiw" title="mw:">MediaWiki</a></span><br>Wiki software development</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://meta.wikimedia.org/wiki/" title="Meta-Wiki"><img alt="Meta-Wiki logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/7/75/Wikimedia_Community_Logo.svg/40px-Wikimedia_Community_Logo.svg.png" decoding="async" width="35" height="35" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/7/75/Wikimedia_Community_Logo.svg/60px-Wikimedia_Community_Logo.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/7/75/Wikimedia_Community_Logo.svg/120px-Wikimedia_Community_Logo.svg.png 2x" data-file-width="900" data-file-height="900"></a></span></div>
  <div><span><a href="https://meta.wikimedia.org/wiki/" class="extiw" title="m:">Meta-Wiki</a></span><br>Wikimedia project coordination</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://en.wikibooks.org/wiki/" title="Wikibooks"><img alt="Wikibooks logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Wikibooks-logo.svg/40px-Wikibooks-logo.svg.png" decoding="async" width="35" height="35" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Wikibooks-logo.svg/60px-Wikibooks-logo.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Wikibooks-logo.svg/120px-Wikibooks-logo.svg.png 2x" data-file-width="300" data-file-height="300"></a></span></div>
  <div><span><a href="https://en.wikibooks.org/wiki/" class="extiw" title="b:">Wikibooks</a></span><br>Free textbooks and manuals</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://www.wikidata.org/wiki/" title="Wikidata"><img alt="Wikidata logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Wikidata-logo.svg/60px-Wikidata-logo.svg.png" decoding="async" width="47" height="26" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Wikidata-logo.svg/120px-Wikidata-logo.svg.png 1.5x" data-file-width="1050" data-file-height="590"></a></span></div>
  <div><span><a href="https://www.wikidata.org/wiki/" class="extiw" title="d:">Wikidata</a></span><br>Free knowledge base</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://en.wikinews.org/wiki/" title="Wikinews"><img alt="Wikinews logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/2/24/Wikinews-logo.svg/60px-Wikinews-logo.svg.png" decoding="async" width="51" height="28" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/2/24/Wikinews-logo.svg/120px-Wikinews-logo.svg.png 1.5x" data-file-width="759" data-file-height="415"></a></span></div>
  <div><span><a href="https://en.wikinews.org/wiki/" class="extiw" title="n:">Wikinews</a></span><br>Free-content news</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://en.wikiquote.org/wiki/" title="Wikiquote"><img alt="Wikiquote logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Wikiquote-logo.svg/40px-Wikiquote-logo.svg.png" decoding="async" width="35" height="41" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Wikiquote-logo.svg/60px-Wikiquote-logo.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Wikiquote-logo.svg/120px-Wikiquote-logo.svg.png 2x" data-file-width="300" data-file-height="355"></a></span></div>
  <div><span><a href="https://en.wikiquote.org/wiki/" class="extiw" title="q:">Wikiquote</a></span><br>Collection of quotations</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://en.wikisource.org/wiki/" title="Wikisource"><img alt="Wikisource logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Wikisource-logo.svg/40px-Wikisource-logo.svg.png" decoding="async" width="35" height="37" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Wikisource-logo.svg/60px-Wikisource-logo.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Wikisource-logo.svg/120px-Wikisource-logo.svg.png 2x" data-file-width="410" data-file-height="430"></a></span></div>
  <div><span><a href="https://en.wikisource.org/wiki/" class="extiw" title="s:">Wikisource</a></span><br>Free-content library</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://species.wikimedia.org/wiki/" title="Wikispecies"><img alt="Wikispecies logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/d/df/Wikispecies-logo.svg/40px-Wikispecies-logo.svg.png" decoding="async" width="35" height="41" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/d/df/Wikispecies-logo.svg/60px-Wikispecies-logo.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/d/df/Wikispecies-logo.svg/120px-Wikispecies-logo.svg.png 2x" data-file-width="941" data-file-height="1103"></a></span></div>
  <div><span><a href="https://species.wikimedia.org/wiki/" class="extiw" title="species:">Wikispecies</a></span><br>Directory of species</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://en.wikiversity.org/wiki/" title="Wikiversity"><img alt="Wikiversity logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Wikiversity_logo_2017.svg/60px-Wikiversity_logo_2017.svg.png" decoding="async" width="41" height="34" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Wikiversity_logo_2017.svg/120px-Wikiversity_logo_2017.svg.png 1.5x" data-file-width="626" data-file-height="512"></a></span></div>
  <div><span><a href="https://en.wikiversity.org/wiki/" class="extiw" title="v:">Wikiversity</a></span><br>Free learning tools</div>
</li>
<li>
  <div><span typeof="mw:File"><a href="https://en.wikivoyage.org/wiki/" title="Wikivoyage"><img alt="Wikivoyage logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wikivoyage-Logo-v3-icon.svg/40px-Wikivoyage-Logo-v3-icon.svg.png" decoding="async" width="35" height="35" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wikivoyage-Logo-v3-icon.svg/60px-Wikivoyage-Logo-v3-icon.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wikivoyage-Logo-v3-icon.svg/120px-Wikivoyage-Logo-v3-icon.svg.png 2x" data-file-width="193" data-file-height="193"></a></span></div>
  <div><span><a href="https://en.wikivoyage.org/wiki/" class="extiw" title="voy:">Wikivoyage</a></span><br>Free travel guide</div>
</li>
<li>
  <div><span class="sister-projects-wikt-icon-light"><span typeof="mw:File"><a href="https://en.wiktionary.org/wiki/" title="Wiktionary"><img alt="Wiktionary logo" src="//upload.wikimedia.org/wikipedia/en/thumb/0/06/Wiktionary-logo-v2.svg/40px-Wiktionary-logo-v2.svg.png" decoding="async" width="35" height="35" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/en/thumb/0/06/Wiktionary-logo-v2.svg/60px-Wiktionary-logo-v2.svg.png 1.5x, //upload.wikimedia.org/wikipedia/en/thumb/0/06/Wiktionary-logo-v2.svg/120px-Wiktionary-logo-v2.svg.png 2x" data-file-width="391" data-file-height="391"></a></span></span><span class="sister-projects-wikt-icon-dark"><span typeof="mw:File"><a href="https://en.wiktionary.org/wiki/" title="Wiktionary"><img alt="Wiktionary logo" src="//upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Wiktionary-logo.svg/60px-Wiktionary-logo.svg.png" decoding="async" width="41" height="39" class="mw-file-element" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Wiktionary-logo.svg/120px-Wiktionary-logo.svg.png 1.5x" data-file-width="370" data-file-height="350"></a></span></span></div>
  <div><span><a href="https://en.wiktionary.org/wiki/" class="extiw" title="wikt:">Wiktionary</a></span><br>Dictionary and thesaurus</div>
</li>
</ul>
</div></div>
<h2 id="mp-lang" class="mp-h2 mw-html-heading">Wikipedia languages</h2>
<div><style data-mw-deduplicate="TemplateStyles:r1292222407">.mw-parser-output .wikipedia-languages-complete{font-weight:bold}.mw-parser-output .wikipedia-languages ul{margin-left:0;padding-left:0}.mw-parser-output .wikipedia-languages ul a{white-space:nowrap}.mw-parser-output .wikipedia-languages>ul{list-style:none;text-align:center;clear:both}.mw-parser-output .wikipedia-languages-count-container{width:90%;display:flex;justify-content:center;padding-top:1em;margin:0 auto}.mw-parser-output .wikipedia-languages-prettybars{width:100%;height:1px;margin:0.5em 0;background-color:#c8ccd1;flex-shrink:1;align-self:center}.mw-parser-output .wikipedia-languages-count{padding:0 1em;white-space:nowrap}</style>
<div class="wikipedia-languages nourlexpansion">
<p>This Wikipedia is written in <a href="/wiki/English_language" title="English language">English</a>. Many <a href="https://meta.wikimedia.org/wiki/List_of_Wikipedias" class="extiw" title="meta:List of Wikipedias">other Wikipedias are available</a>; some of the largest are listed below.
</p>
<ul class="plainlinks">
<li>
  <div class="wikipedia-languages-count-container">
    <div class="wikipedia-languages-prettybars"></div>
    <div role="heading" aria-level="3" class="wikipedia-languages-count">1,000,000+ articles</div>
    <div class="wikipedia-languages-prettybars"></div>
  </div>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist wikipedia-languages-langs inline">
<ul><li><a class="external text" href="https://ar.wikipedia.org/wiki/"><span class="autonym" title="Arabic (ar:)" lang="ar">العربية</span></a></li>
<li><a class="external text" href="https://de.wikipedia.org/wiki/"><span class="autonym" title="German (de:)" lang="de">Deutsch</span></a></li>
<li><a class="external text" href="https://es.wikipedia.org/wiki/"><span class="autonym" title="Spanish (es:)" lang="es">Español</span></a></li>
<li><a class="external text" href="https://fa.wikipedia.org/wiki/"><span class="autonym" title="Persian (fa:)" lang="fa">فارسی</span></a>‎</li>
<li><a class="external text" href="https://fr.wikipedia.org/wiki/"><span class="autonym" title="French (fr:)" lang="fr">Français</span></a></li>
<li><a class="external text" href="https://it.wikipedia.org/wiki/"><span class="autonym" title="Italian (it:)" lang="it">Italiano</span></a></li>
<li><a class="external text" href="https://nl.wikipedia.org/wiki/"><span class="autonym" title="Dutch (nl:)" lang="nl">Nederlands</span></a></li>
<li><a class="external text" href="https://ja.wikipedia.org/wiki/"><span class="autonym" title="Japanese (ja:)" lang="ja">日本語</span></a></li>
<li><a class="external text" href="https://pl.wikipedia.org/wiki/"><span class="autonym" title="Polish (pl:)" lang="pl">Polski</span></a></li>
<li><a class="external text" href="https://pt.wikipedia.org/wiki/"><span class="autonym" title="Portuguese (pt:)" lang="pt">Português</span></a></li>
<li><a class="external text" href="https://ru.wikipedia.org/wiki/"><span class="autonym" title="Russian (ru:)" lang="ru">Русский</span></a></li>
<li><a class="external text" href="https://sv.wikipedia.org/wiki/"><span class="autonym" title="Swedish (sv:)" lang="sv">Svenska</span></a></li>
<li><a class="external text" href="https://uk.wikipedia.org/wiki/"><span class="autonym" title="Ukrainian (uk:)" lang="uk">Українська</span></a></li>
<li><a class="external text" href="https://vi.wikipedia.org/wiki/"><span class="autonym" title="Vietnamese (vi:)" lang="vi">Tiếng Việt</span></a></li>
<li><a class="external text" href="https://zh.wikipedia.org/wiki/"><span class="autonym" title="Chinese (zh:)" lang="zh">中文</span></a></li></ul>
</div>
</li>
<li>
  <div class="wikipedia-languages-count-container">
    <div class="wikipedia-languages-prettybars"></div>
    <div role="heading" aria-level="3" class="wikipedia-languages-count">250,000+ articles</div>
    <div class="wikipedia-languages-prettybars"></div>
  </div>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist wikipedia-languages-langs inline">
<ul><li><a class="external text" href="https://id.wikipedia.org/wiki/"><span class="autonym" title="Indonesian (id:)" lang="id">Bahasa Indonesia</span></a></li>
<li><a class="external text" href="https://ms.wikipedia.org/wiki/"><span class="autonym" title="Malay (ms:)" lang="ms">Bahasa Melayu</span></a></li>
<li><a class="external text" href="https://zh-min-nan.wikipedia.org/wiki/"><span class="autonym" title="Minnan (nan:)" lang="nan">Bân-lâm-gú</span></a></li>
<li><a class="external text" href="https://bg.wikipedia.org/wiki/"><span class="autonym" title="Bulgarian (bg:)" lang="bg">Български</span></a></li>
<li><a class="external text" href="https://ca.wikipedia.org/wiki/"><span class="autonym" title="Catalan (ca:)" lang="ca">Català</span></a></li>
<li><a class="external text" href="https://cs.wikipedia.org/wiki/"><span class="autonym" title="Czech (cs:)" lang="cs">Čeština</span></a></li>
<li><a class="external text" href="https://da.wikipedia.org/wiki/"><span class="autonym" title="Danish (da:)" lang="da">Dansk</span></a></li>
<li><a class="external text" href="https://et.wikipedia.org/wiki/"><span class="autonym" title="Estonian (et:)" lang="et">Eesti</span></a></li>
<li><a class="external text" href="https://el.wikipedia.org/wiki/"><span class="autonym" title="Greek (el:)" lang="el">Ελληνικά</span></a></li>
<li><a class="external text" href="https://eo.wikipedia.org/wiki/"><span class="autonym" title="Esperanto (eo:)" lang="eo">Esperanto</span></a></li>
<li><a class="external text" href="https://eu.wikipedia.org/wiki/"><span class="autonym" title="Basque (eu:)" lang="eu">Euskara</span></a></li>
<li><a class="external text" href="https://he.wikipedia.org/wiki/"><span class="autonym" title="Hebrew (he:)" lang="he">עברית</span></a></li>
<li><a class="external text" href="https://hy.wikipedia.org/wiki/"><span class="autonym" title="Armenian (hy:)" lang="hy">Հայերեն</span></a></li>
<li><a class="external text" href="https://ko.wikipedia.org/wiki/"><span class="autonym" title="Korean (ko:)" lang="ko">한국어</span></a></li>
<li><a class="external text" href="https://hu.wikipedia.org/wiki/"><span class="autonym" title="Hungarian (hu:)" lang="hu">Magyar</span></a></li>
<li><a class="external text" href="https://no.wikipedia.org/wiki/"><span class="autonym" title="Norwegian (no:)" lang="no">Norsk bokmål</span></a></li>
<li><a class="external text" href="https://ro.wikipedia.org/wiki/"><span class="autonym" title="Romanian (ro:)" lang="ro">Română</span></a></li>
<li><a class="external text" href="https://simple.wikipedia.org/wiki/"><span class="autonym" title="Simple English (simple:)" lang="en">Simple English</span></a></li>
<li><a class="external text" href="https://sk.wikipedia.org/wiki/"><span class="autonym" title="Slovak (sk:)" lang="sk">Slovenčina</span></a></li>
<li><a class="external text" href="https://sr.wikipedia.org/wiki/"><span class="autonym" title="Serbian (sr:)" lang="sr">Srpski</span></a></li>
<li><a class="external text" href="https://sh.wikipedia.org/wiki/"><span class="autonym" title="Serbo-Croatian (sh:)" lang="sh">Srpskohrvatski</span></a></li>
<li><a class="external text" href="https://fi.wikipedia.org/wiki/"><span class="autonym" title="Finnish (fi:)" lang="fi">Suomi</span></a></li>
<li><a class="external text" href="https://tr.wikipedia.org/wiki/"><span class="autonym" title="Turkish (tr:)" lang="tr">Türkçe</span></a></li>
<li><a class="external text" href="https://uz.wikipedia.org/wiki/"><span class="autonym" title="Uzbek (uz:)" lang="uz">Oʻzbekcha</span></a></li></ul>
</div>
</li>
<li>
  <div class="wikipedia-languages-count-container">
    <div class="wikipedia-languages-prettybars"></div>
    <div role="heading" aria-level="3" class="wikipedia-languages-count">50,000+ articles</div>
    <div class="wikipedia-languages-prettybars"></div>
  </div>
<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r1129693374"><div class="hlist wikipedia-languages-langs inline">
<ul><li><a class="external text" href="https://ast.wikipedia.org/wiki/"><span class="autonym" title="Asturian (ast:)" lang="ast">Asturianu</span></a></li>
<li><a class="external text" href="https://az.wikipedia.org/wiki/"><span class="autonym" title="Azerbaijani (az:)" lang="az">Azərbaycanca</span></a></li>
<li><a class="external text" href="https://bn.wikipedia.org/wiki/"><span class="autonym" title="Bangla (bn:)" lang="bn">বাংলা</span></a></li>
<li><a class="external text" href="https://bs.wikipedia.org/wiki/"><span class="autonym" title="Bosnian (bs:)" lang="bs">Bosanski</span></a></li>
<li><a class="external text" href="https://ckb.wikipedia.org/wiki/"><span class="autonym" title="Central Kurdish (ckb:)" lang="ckb">کوردی</span></a></li>
<li><a class="external text" href="https://fy.wikipedia.org/wiki/"><span class="autonym" title="Western Frisian (fy:)" lang="fy">Frysk</span></a></li>
<li><a class="external text" href="https://ga.wikipedia.org/wiki/"><span class="autonym" title="Irish (ga:)" lang="ga">Gaeilge</span></a></li>
<li><a class="external text" href="https://gl.wikipedia.org/wiki/"><span class="autonym" title="Galician (gl:)" lang="gl">Galego</span></a></li>
<li><a class="external text" href="https://hr.wikipedia.org/wiki/"><span class="autonym" title="Croatian (hr:)" lang="hr">Hrvatski</span></a></li>
<li><a class="external text" href="https://ka.wikipedia.org/wiki/"><span class="autonym" title="Georgian (ka:)" lang="ka">ქართული</span></a></li>
<li><a class="external text" href="https://ku.wikipedia.org/wiki/"><span class="autonym" title="Kurdish (ku:)" lang="ku">Kurdî</span></a></li>
<li><a class="external text" href="https://lv.wikipedia.org/wiki/"><span class="autonym" title="Latvian (lv:)" lang="lv">Latviešu</span></a></li>
<li><a class="external text" href="https://lt.wikipedia.org/wiki/"><span class="autonym" title="Lithuanian (lt:)" lang="lt">Lietuvių</span></a></li>
<li><a class="external text" href="https://ml.wikipedia.org/wiki/"><span class="autonym" title="Malayalam (ml:)" lang="ml">മലയാളം</span></a></li>
<li><a class="external text" href="https://mk.wikipedia.org/wiki/"><span class="autonym" title="Macedonian (mk:)" lang="mk">Македонски</span></a></li>
<li><a class="external text" href="https://my.wikipedia.org/wiki/"><span class="autonym" title="Burmese (my:)" lang="my">မြန်မာဘာသာ</span></a></li>
<li><a class="external text" href="https://nn.wikipedia.org/wiki/"><span class="autonym" title="Norwegian Nynorsk (nn:)" lang="nn">Norsk nynorsk</span></a></li>
<li><a class="external text" href="https://pa.wikipedia.org/wiki/"><span class="autonym" title="Punjabi (pa:)" lang="pa">ਪੰਜਾਬੀ</span></a></li>
<li><a class="external text" href="https://sq.wikipedia.org/wiki/"><span class="autonym" title="Albanian (sq:)" lang="sq">Shqip</span></a></li>
<li><a class="external text" href="https://sl.wikipedia.org/wiki/"><span class="autonym" title="Slovenian (sl:)" lang="sl">Slovenščina</span></a></li>
<li><a class="external text" href="https://th.wikipedia.org/wiki/"><span class="autonym" title="Thai (th:)" lang="th">ไทย</span></a></li>
<li><a class="external text" href="https://te.wikipedia.org/wiki/"><span class="autonym" title="Telugu (te:)" lang="te">తెలుగు</span></a></li>
<li><a class="external text" href="https://ur.wikipedia.org/wiki/"><span class="autonym" title="Urdu (ur:)" lang="ur">اردو</span></a></li></ul>
</div>
</li>
</ul>
</div></div>
</div>                                                
<!-- 
NewPP limit report
Parsed by mw‐web.eqiad.main‐85d784b447‐4cm2h
Cached time: 20250609024928
Cache expiry: 3600
Reduced expiry: true
Complications: [no‐toc]
CPU time usage: 0.406 seconds
Real time usage: 0.527 seconds
Preprocessor visited node count: 6615/1000000
Revision size: 3077/2097152 bytes
Post‐expand include size: 150541/2097152 bytes
Template argument size: 16905/2097152 bytes
Highest expansion depth: 18/100
Expensive parser function count: 15/500
Unstrip recursion depth: 0/20
Unstrip post‐expand size: 46915/5000000 bytes
Lua time usage: 0.085/10.000 seconds
Lua memory usage: 3864850/52428800 bytes
Number of Wikibase entities loaded: 0/500
-->
<!--
Transclusion expansion time report (%,ms,calls,template)
100.00%  376.517      1 -total
 28.74%  108.212      1 Wikipedia:Main_Page/Tomorrow
 21.04%   79.220      1 Wikipedia:Today&#039;s_featured_article/June_9,_2025
 19.73%   74.285      9 Template:Main_page_image
 16.76%   63.088     28 Template:Flatlist
 14.62%   55.057      9 Template:Str_number/trim
 12.09%   45.503      2 Template:Wikipedia_languages
 10.91%   41.089      2 Template:Main_page_image/TFA
 10.73%   40.410      1 Template:Did_you_know/Queue/7
  9.02%   33.965      2 Template:TFArecentlist
-->

<!-- Saved in parser cache with key enwiki:pcache:15580374:|#|:idhash:canonical and timestamp 20250609024928 and revision id 1294660424. Rendering was triggered because: page-view
 -->
</div><!--esi <esi:include src="/esitest-fa8a495983347898/content" /> --><noscript>&lt;img src="https://en.wikipedia.org/wiki/Special:CentralAutoLogin/start?type=1x1&amp;amp;usesul3=1" alt="" width="1" height="1" style="border: none; position: absolute;"&gt;</noscript>
<div class="printfooter" data-nosnippet="">Retrieved from "<a dir="ltr" href="https://en.wikipedia.org/w/index.php?title=Main_Page&amp;oldid=1294660424">https://en.wikipedia.org/w/index.php?title=Main_Page&amp;oldid=1294660424</a>"</div></div>
					<div id="catlinks" class="catlinks catlinks-allhidden" data-mw="interface"></div>
						
<div id="p-lang-btn" class="vector-dropdown mw-portlet mw-portlet-lang">
	<input type="checkbox" id="p-lang-btn-checkbox" role="button" aria-haspopup="true" data-event-name="ui.dropdown-p-lang-btn" class="vector-dropdown-checkbox mw-interlanguage-selector" aria-label="Go to an article in another language. Available in 49 languages">
	<label id="p-lang-btn-label" for="p-lang-btn-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--action-progressive mw-portlet-lang-heading-49" aria-hidden="true"><span class="vector-icon mw-ui-icon-language-progressive mw-ui-icon-wikimedia-language-progressive"></span>

<span class="vector-dropdown-label-text">49 languages</span>
	</label>
	<div class="vector-dropdown-content">

		<div class="vector-menu-content">
			
			<ul class="vector-menu-content-list">
				
				<li class="interlanguage-link interwiki-ar mw-list-item"><a href="https://ar.wikipedia.org/wiki/" title="Arabic" lang="ar" hreflang="ar" data-title="" data-language-autonym="العربية" data-language-local-name="Arabic" class="interlanguage-link-target"><span>العربية</span></a></li><li class="interlanguage-link interwiki-az mw-list-item"><a href="https://az.wikipedia.org/wiki/" title="Azerbaijani" lang="az" hreflang="az" data-title="" data-language-autonym="Azərbaycanca" data-language-local-name="Azerbaijani" class="interlanguage-link-target"><span>Azərbaycanca</span></a></li><li class="interlanguage-link interwiki-bn mw-list-item"><a href="https://bn.wikipedia.org/wiki/" title="Bangla" lang="bn" hreflang="bn" data-title="" data-language-autonym="বাংলা" data-language-local-name="Bangla" class="interlanguage-link-target"><span>বাংলা</span></a></li><li class="interlanguage-link interwiki-bg mw-list-item"><a href="https://bg.wikipedia.org/wiki/" title="Bulgarian" lang="bg" hreflang="bg" data-title="" data-language-autonym="Български" data-language-local-name="Bulgarian" class="interlanguage-link-target"><span>Български</span></a></li><li class="interlanguage-link interwiki-bs mw-list-item"><a href="https://bs.wikipedia.org/wiki/" title="Bosnian" lang="bs" hreflang="bs" data-title="" data-language-autonym="Bosanski" data-language-local-name="Bosnian" class="interlanguage-link-target"><span>Bosanski</span></a></li><li class="interlanguage-link interwiki-ca mw-list-item"><a href="https://ca.wikipedia.org/wiki/" title="Catalan" lang="ca" hreflang="ca" data-title="" data-language-autonym="Català" data-language-local-name="Catalan" class="interlanguage-link-target"><span>Català</span></a></li><li class="interlanguage-link interwiki-cs mw-list-item"><a href="https://cs.wikipedia.org/wiki/" title="Czech" lang="cs" hreflang="cs" data-title="" data-language-autonym="Čeština" data-language-local-name="Czech" class="interlanguage-link-target"><span>Čeština</span></a></li><li class="interlanguage-link interwiki-da mw-list-item"><a href="https://da.wikipedia.org/wiki/" title="Danish" lang="da" hreflang="da" data-title="" data-language-autonym="Dansk" data-language-local-name="Danish" class="interlanguage-link-target"><span>Dansk</span></a></li><li class="interlanguage-link interwiki-de mw-list-item"><a href="https://de.wikipedia.org/wiki/" title="German" lang="de" hreflang="de" data-title="" data-language-autonym="Deutsch" data-language-local-name="German" class="interlanguage-link-target"><span>Deutsch</span></a></li><li class="interlanguage-link interwiki-et mw-list-item"><a href="https://et.wikipedia.org/wiki/" title="Estonian" lang="et" hreflang="et" data-title="" data-language-autonym="Eesti" data-language-local-name="Estonian" class="interlanguage-link-target"><span>Eesti</span></a></li><li class="interlanguage-link interwiki-el mw-list-item"><a href="https://el.wikipedia.org/wiki/" title="Greek" lang="el" hreflang="el" data-title="" data-language-autonym="Ελληνικά" data-language-local-name="Greek" class="interlanguage-link-target"><span>Ελληνικά</span></a></li><li class="interlanguage-link interwiki-es mw-list-item"><a href="https://es.wikipedia.org/wiki/" title="Spanish" lang="es" hreflang="es" data-title="" data-language-autonym="Español" data-language-local-name="Spanish" class="interlanguage-link-target"><span>Español</span></a></li><li class="interlanguage-link interwiki-eo mw-list-item"><a href="https://eo.wikipedia.org/wiki/" title="Esperanto" lang="eo" hreflang="eo" data-title="" data-language-autonym="Esperanto" data-language-local-name="Esperanto" class="interlanguage-link-target"><span>Esperanto</span></a></li><li class="interlanguage-link interwiki-eu mw-list-item"><a href="https://eu.wikipedia.org/wiki/" title="Basque" lang="eu" hreflang="eu" data-title="" data-language-autonym="Euskara" data-language-local-name="Basque" class="interlanguage-link-target"><span>Euskara</span></a></li><li class="interlanguage-link interwiki-fa mw-list-item"><a href="https://fa.wikipedia.org/wiki/" title="Persian" lang="fa" hreflang="fa" data-title="" data-language-autonym="فارسی" data-language-local-name="Persian" class="interlanguage-link-target"><span>فارسی</span></a></li><li class="interlanguage-link interwiki-fr mw-list-item"><a href="https://fr.wikipedia.org/wiki/" title="French" lang="fr" hreflang="fr" data-title="" data-language-autonym="Français" data-language-local-name="French" class="interlanguage-link-target"><span>Français</span></a></li><li class="interlanguage-link interwiki-gl mw-list-item"><a href="https://gl.wikipedia.org/wiki/" title="Galician" lang="gl" hreflang="gl" data-title="" data-language-autonym="Galego" data-language-local-name="Galician" class="interlanguage-link-target"><span>Galego</span></a></li><li class="interlanguage-link interwiki-ko mw-list-item"><a href="https://ko.wikipedia.org/wiki/" title="Korean" lang="ko" hreflang="ko" data-title="" data-language-autonym="한국어" data-language-local-name="Korean" class="interlanguage-link-target"><span>한국어</span></a></li><li class="interlanguage-link interwiki-hr mw-list-item"><a href="https://hr.wikipedia.org/wiki/" title="Croatian" lang="hr" hreflang="hr" data-title="" data-language-autonym="Hrvatski" data-language-local-name="Croatian" class="interlanguage-link-target"><span>Hrvatski</span></a></li><li class="interlanguage-link interwiki-id mw-list-item"><a href="https://id.wikipedia.org/wiki/" title="Indonesian" lang="id" hreflang="id" data-title="" data-language-autonym="Bahasa Indonesia" data-language-local-name="Indonesian" class="interlanguage-link-target"><span>Bahasa Indonesia</span></a></li><li class="interlanguage-link interwiki-it mw-list-item"><a href="https://it.wikipedia.org/wiki/" title="Italian" lang="it" hreflang="it" data-title="" data-language-autonym="Italiano" data-language-local-name="Italian" class="interlanguage-link-target"><span>Italiano</span></a></li><li class="interlanguage-link interwiki-he mw-list-item"><a href="https://he.wikipedia.org/wiki/" title="Hebrew" lang="he" hreflang="he" data-title="" data-language-autonym="עברית" data-language-local-name="Hebrew" class="interlanguage-link-target"><span>עברית</span></a></li><li class="interlanguage-link interwiki-ka mw-list-item"><a href="https://ka.wikipedia.org/wiki/" title="Georgian" lang="ka" hreflang="ka" data-title="" data-language-autonym="ქართული" data-language-local-name="Georgian" class="interlanguage-link-target"><span>ქართული</span></a></li><li class="interlanguage-link interwiki-lv mw-list-item"><a href="https://lv.wikipedia.org/wiki/" title="Latvian" lang="lv" hreflang="lv" data-title="" data-language-autonym="Latviešu" data-language-local-name="Latvian" class="interlanguage-link-target"><span>Latviešu</span></a></li><li class="interlanguage-link interwiki-lt mw-list-item"><a href="https://lt.wikipedia.org/wiki/" title="Lithuanian" lang="lt" hreflang="lt" data-title="" data-language-autonym="Lietuvių" data-language-local-name="Lithuanian" class="interlanguage-link-target"><span>Lietuvių</span></a></li><li class="interlanguage-link interwiki-hu mw-list-item"><a href="https://hu.wikipedia.org/wiki/" title="Hungarian" lang="hu" hreflang="hu" data-title="" data-language-autonym="Magyar" data-language-local-name="Hungarian" class="interlanguage-link-target"><span>Magyar</span></a></li><li class="interlanguage-link interwiki-mk mw-list-item"><a href="https://mk.wikipedia.org/wiki/" title="Macedonian" lang="mk" hreflang="mk" data-title="" data-language-autonym="Македонски" data-language-local-name="Macedonian" class="interlanguage-link-target"><span>Македонски</span></a></li><li class="interlanguage-link interwiki-ms mw-list-item"><a href="https://ms.wikipedia.org/wiki/" title="Malay" lang="ms" hreflang="ms" data-title="" data-language-autonym="Bahasa Melayu" data-language-local-name="Malay" class="interlanguage-link-target"><span>Bahasa Melayu</span></a></li><li class="interlanguage-link interwiki-nl mw-list-item"><a href="https://nl.wikipedia.org/wiki/" title="Dutch" lang="nl" hreflang="nl" data-title="" data-language-autonym="Nederlands" data-language-local-name="Dutch" class="interlanguage-link-target"><span>Nederlands</span></a></li><li class="interlanguage-link interwiki-ja mw-list-item"><a href="https://ja.wikipedia.org/wiki/" title="Japanese" lang="ja" hreflang="ja" data-title="" data-language-autonym="日本語" data-language-local-name="Japanese" class="interlanguage-link-target"><span>日本語</span></a></li><li class="interlanguage-link interwiki-no mw-list-item"><a href="https://no.wikipedia.org/wiki/" title="Norwegian Bokmål" lang="nb" hreflang="nb" data-title="" data-language-autonym="Norsk bokmål" data-language-local-name="Norwegian Bokmål" class="interlanguage-link-target"><span>Norsk bokmål</span></a></li><li class="interlanguage-link interwiki-nn mw-list-item"><a href="https://nn.wikipedia.org/wiki/" title="Norwegian Nynorsk" lang="nn" hreflang="nn" data-title="" data-language-autonym="Norsk nynorsk" data-language-local-name="Norwegian Nynorsk" class="interlanguage-link-target"><span>Norsk nynorsk</span></a></li><li class="interlanguage-link interwiki-pl mw-list-item"><a href="https://pl.wikipedia.org/wiki/" title="Polish" lang="pl" hreflang="pl" data-title="" data-language-autonym="Polski" data-language-local-name="Polish" class="interlanguage-link-target"><span>Polski</span></a></li><li class="interlanguage-link interwiki-pt mw-list-item"><a href="https://pt.wikipedia.org/wiki/" title="Portuguese" lang="pt" hreflang="pt" data-title="" data-language-autonym="Português" data-language-local-name="Portuguese" class="interlanguage-link-target"><span>Português</span></a></li><li class="interlanguage-link interwiki-ro mw-list-item"><a href="https://ro.wikipedia.org/wiki/" title="Romanian" lang="ro" hreflang="ro" data-title="" data-language-autonym="Română" data-language-local-name="Romanian" class="interlanguage-link-target"><span>Română</span></a></li><li class="interlanguage-link interwiki-ru mw-list-item"><a href="https://ru.wikipedia.org/wiki/" title="Russian" lang="ru" hreflang="ru" data-title="" data-language-autonym="Русский" data-language-local-name="Russian" class="interlanguage-link-target"><span>Русский</span></a></li><li class="interlanguage-link interwiki-simple mw-list-item"><a href="https://simple.wikipedia.org/wiki/" title="Simple English" lang="en-simple" hreflang="en-simple" data-title="" data-language-autonym="Simple English" data-language-local-name="Simple English" class="interlanguage-link-target"><span>Simple English</span></a></li><li class="interlanguage-link interwiki-sk mw-list-item"><a href="https://sk.wikipedia.org/wiki/" title="Slovak" lang="sk" hreflang="sk" data-title="" data-language-autonym="Slovenčina" data-language-local-name="Slovak" class="interlanguage-link-target"><span>Slovenčina</span></a></li><li class="interlanguage-link interwiki-sl mw-list-item"><a href="https://sl.wikipedia.org/wiki/" title="Slovenian" lang="sl" hreflang="sl" data-title="" data-language-autonym="Slovenščina" data-language-local-name="Slovenian" class="interlanguage-link-target"><span>Slovenščina</span></a></li><li class="interlanguage-link interwiki-ckb mw-list-item"><a href="https://ckb.wikipedia.org/wiki/" title="Central Kurdish" lang="ckb" hreflang="ckb" data-title="" data-language-autonym="کوردی" data-language-local-name="Central Kurdish" class="interlanguage-link-target"><span>کوردی</span></a></li><li class="interlanguage-link interwiki-sr mw-list-item"><a href="https://sr.wikipedia.org/wiki/" title="Serbian" lang="sr" hreflang="sr" data-title="" data-language-autonym="Српски / srpski" data-language-local-name="Serbian" class="interlanguage-link-target"><span>Српски / srpski</span></a></li><li class="interlanguage-link interwiki-sh mw-list-item"><a href="https://sh.wikipedia.org/wiki/" title="Serbo-Croatian" lang="sh" hreflang="sh" data-title="" data-language-autonym="Srpskohrvatski / српскохрватски" data-language-local-name="Serbo-Croatian" class="interlanguage-link-target"><span>Srpskohrvatski / српскохрватски</span></a></li><li class="interlanguage-link interwiki-fi mw-list-item"><a href="https://fi.wikipedia.org/wiki/" title="Finnish" lang="fi" hreflang="fi" data-title="" data-language-autonym="Suomi" data-language-local-name="Finnish" class="interlanguage-link-target"><span>Suomi</span></a></li><li class="interlanguage-link interwiki-sv mw-list-item"><a href="https://sv.wikipedia.org/wiki/" title="Swedish" lang="sv" hreflang="sv" data-title="" data-language-autonym="Svenska" data-language-local-name="Swedish" class="interlanguage-link-target"><span>Svenska</span></a></li><li class="interlanguage-link interwiki-th mw-list-item"><a href="https://th.wikipedia.org/wiki/" title="Thai" lang="th" hreflang="th" data-title="" data-language-autonym="ไทย" data-language-local-name="Thai" class="interlanguage-link-target"><span>ไทย</span></a></li><li class="interlanguage-link interwiki-tr mw-list-item"><a href="https://tr.wikipedia.org/wiki/" title="Turkish" lang="tr" hreflang="tr" data-title="" data-language-autonym="Türkçe" data-language-local-name="Turkish" class="interlanguage-link-target"><span>Türkçe</span></a></li><li class="interlanguage-link interwiki-uk mw-list-item"><a href="https://uk.wikipedia.org/wiki/" title="Ukrainian" lang="uk" hreflang="uk" data-title="" data-language-autonym="Українська" data-language-local-name="Ukrainian" class="interlanguage-link-target"><span>Українська</span></a></li><li class="interlanguage-link interwiki-vi mw-list-item"><a href="https://vi.wikipedia.org/wiki/" title="Vietnamese" lang="vi" hreflang="vi" data-title="" data-language-autonym="Tiếng Việt" data-language-local-name="Vietnamese" class="interlanguage-link-target"><span>Tiếng Việt</span></a></li><li class="interlanguage-link interwiki-zh mw-list-item"><a href="https://zh.wikipedia.org/wiki/" title="Chinese" lang="zh" hreflang="zh" data-title="" data-language-autonym="中文" data-language-local-name="Chinese" class="interlanguage-link-target"><span>中文</span></a></li>
			</ul>
			
		</div>

	</div>
</div>

				</div>
			</main>
			
		</div>
		<div class="mw-footer-container">
			
<footer id="footer" class="mw-footer">
	<ul id="footer-info">
	<li id="footer-info-lastmod"> This page was last edited on 9 June 2025, at 02:10<span class="anonymous-show">&nbsp;(UTC)</span>.</li>
	<li id="footer-info-copyright">Text is available under the <a href="/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License" title="Wikipedia:Text of the Creative Commons Attribution-ShareAlike 4.0 International License">Creative Commons Attribution-ShareAlike 4.0 License</a>;
additional terms may apply. By using this site, you agree to the <a href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Terms_of_Use" class="extiw" title="foundation:Special:MyLanguage/Policy:Terms of Use">Terms of Use</a> and <a href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy" class="extiw" title="foundation:Special:MyLanguage/Policy:Privacy policy">Privacy Policy</a>. Wikipedia® is a registered trademark of the <a rel="nofollow" class="external text" href="https://wikimediafoundation.org/">Wikimedia Foundation, Inc.</a>, a non-profit organization.</li>
</ul>

	<ul id="footer-places">
	<li id="footer-places-privacy"><a href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy">Privacy policy</a></li>
	<li id="footer-places-about"><a href="/wiki/Wikipedia:About">About Wikipedia</a></li>
	<li id="footer-places-disclaimers"><a href="/wiki/Wikipedia:General_disclaimer">Disclaimers</a></li>
	<li id="footer-places-contact"><a href="//en.wikipedia.org/wiki/Wikipedia:Contact_us">Contact Wikipedia</a></li>
	<li id="footer-places-wm-codeofconduct"><a href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Universal_Code_of_Conduct">Code of Conduct</a></li>
	<li id="footer-places-developers"><a href="https://developer.wikimedia.org">Developers</a></li>
	<li id="footer-places-statslink"><a href="https://stats.wikimedia.org/#/en.wikipedia.org">Statistics</a></li>
	<li id="footer-places-cookiestatement"><a href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Cookie_statement">Cookie statement</a></li>
	<li id="footer-places-mobileview"><a href="//en.m.wikipedia.org/w/index.php?title=Main_Page&amp;mobileaction=toggle_view_mobile" class="noprint stopMobileRedirectToggle">Mobile view</a></li>
<li style="display: none;"><a href="#">Edit preview settings</a></li></ul>

	<ul id="footer-icons" class="noprint">
	<li id="footer-copyrightico"><a href="https://www.wikimedia.org/" class="cdx-button cdx-button--fake-button cdx-button--size-large cdx-button--fake-button--enabled"><picture><source media="(min-width: 500px)" srcset="/static/images/footer/wikimedia-button.svg" width="84" height="29"><img src="/static/images/footer/wikimedia.svg" width="25" height="25" alt="Wikimedia Foundation" lang="en" loading="lazy"></picture></a></li>
	<li id="footer-poweredbyico"><a href="https://www.mediawiki.org/" class="cdx-button cdx-button--fake-button cdx-button--size-large cdx-button--fake-button--enabled"><picture><source media="(min-width: 500px)" srcset="/w/resources/assets/poweredby_mediawiki.svg" width="88" height="31"><img src="/w/resources/assets/mediawiki_compact.svg" alt="Powered by MediaWiki" lang="en" width="25" height="25" loading="lazy"></picture></a></li>
</ul>

</footer>

		</div>
	</div> 
</div> 
<div class="vector-header-container vector-sticky-header-container no-font-mode-scale">
	<div id="vector-sticky-header" class="vector-sticky-header">
		<div class="vector-sticky-header-start">
			<div class="vector-sticky-header-icon-start vector-button-flush-left vector-button-flush-right" aria-hidden="true">
				<button class="cdx-button cdx-button--weight-quiet cdx-button--icon-only vector-sticky-header-search-toggle" tabindex="-1" data-event-name="ui.vector-sticky-search-form.icon"><span class="vector-icon mw-ui-icon-search mw-ui-icon-wikimedia-search"></span>

<span>Search</span>
			</button>
		</div>
			
		<div role="search" class="vector-search-box-vue  vector-search-box-show-thumbnail vector-search-box">
			<div class="vector-typeahead-search-container">
				<div class="cdx-typeahead-search cdx-typeahead-search--show-thumbnail">
					<form action="/w/index.php" id="vector-sticky-search-form" class="cdx-search-input cdx-search-input--has-end-button">
						<div class="cdx-search-input__input-wrapper" data-search-loc="header-moved">
							<div class="cdx-text-input cdx-text-input--has-start-icon">
								<input class="cdx-text-input__input mw-searchInput" type="search" name="search" placeholder="Search Wikipedia">
								<span class="cdx-text-input__icon cdx-text-input__start-icon"></span>
							</div>
							<input type="hidden" name="title" value="Special:Search">
						</div>
						<button class="cdx-button cdx-search-input__end-button">Search</button>
					</form>
				</div>
			</div>
		</div>
		<div class="vector-sticky-header-context-bar">
				<div class="vector-sticky-header-context-bar-primary" aria-hidden="true"><span class="mw-page-title-main">Main Page</span></div>
			</div>
		</div>
		<div class="vector-sticky-header-end" aria-hidden="true">
			<div class="vector-sticky-header-icons">
				<a href="#" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" id="ca-talk-sticky-header" tabindex="-1" data-event-name="talk-sticky-header"><span class="vector-icon mw-ui-icon-speechBubbles mw-ui-icon-wikimedia-speechBubbles"></span>

<span></span>
			</a>
			<a href="#" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" id="ca-subject-sticky-header" tabindex="-1" data-event-name="subject-sticky-header"><span class="vector-icon mw-ui-icon-article mw-ui-icon-wikimedia-article"></span>

<span></span>
			</a>
			<a href="#" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" id="ca-history-sticky-header" tabindex="-1" data-event-name="history-sticky-header"><span class="vector-icon mw-ui-icon-wikimedia-history mw-ui-icon-wikimedia-wikimedia-history"></span>

<span></span>
			</a>
			<a href="#" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only mw-watchlink" id="ca-watchstar-sticky-header" tabindex="-1" data-event-name="watch-sticky-header" aria-controls="mw-watchlink-notification"><span class="vector-icon mw-ui-icon-wikimedia-star mw-ui-icon-wikimedia-wikimedia-star"></span>

<span></span>
			</a>
			<a href="#" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" id="ca-edit-sticky-header" tabindex="-1" data-event-name="wikitext-edit-sticky-header"><span class="vector-icon mw-ui-icon-wikimedia-wikiText mw-ui-icon-wikimedia-wikimedia-wikiText"></span>

<span></span>
			</a>
			<a href="#" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" id="ca-ve-edit-sticky-header" tabindex="-1" data-event-name="ve-edit-sticky-header"><span class="vector-icon mw-ui-icon-wikimedia-edit mw-ui-icon-wikimedia-wikimedia-edit"></span>

<span></span>
			</a>
			<a href="#" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" id="ca-viewsource-sticky-header" tabindex="-1" data-event-name="ve-edit-protected-sticky-header"><span class="vector-icon mw-ui-icon-wikimedia-editLock mw-ui-icon-wikimedia-wikimedia-editLock"></span>

<span></span>
			</a>
		</div>
			<div class="vector-sticky-header-buttons">
				<button class="cdx-button cdx-button--weight-quiet mw-interlanguage-selector" id="p-lang-btn-sticky-header" tabindex="-1" data-event-name="ui.dropdown-p-lang-btn-sticky-header"><span class="vector-icon mw-ui-icon-wikimedia-language mw-ui-icon-wikimedia-wikimedia-language"></span>

<span>49 languages</span>
			</button>
			<a href="#" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--action-progressive" id="ca-addsection-sticky-header" tabindex="-1" data-event-name="addsection-sticky-header"><span class="vector-icon mw-ui-icon-speechBubbleAdd-progressive mw-ui-icon-wikimedia-speechBubbleAdd-progressive"></span>

<span>Add topic</span>
			</a>
		</div>
			<div class="vector-sticky-header-icon-end">
				<div class="vector-user-links">
				</div>
			</div>
		</div>
	</div>
</div>
<div class="mw-portlet mw-portlet-dock-bottom emptyPortlet" id="p-dock-bottom">
	<ul>
		
	</ul>
</div>
<script>(RLQ=window.RLQ||[]).push(function(){mw.config.set({"wgHostname":"mw-web.eqiad.main-85d784b447-9phsh","wgBackendResponseTime":141,"wgPageParseReport":{"limitreport":{"cputime":"0.406","walltime":"0.527","ppvisitednodes":{"value":6615,"limit":1000000},"revisionsize":{"value":3077,"limit":2097152},"postexpandincludesize":{"value":150541,"limit":2097152},"templateargumentsize":{"value":16905,"limit":2097152},"expansiondepth":{"value":18,"limit":100},"expensivefunctioncount":{"value":15,"limit":500},"unstrip-depth":{"value":0,"limit":20},"unstrip-size":{"value":46915,"limit":5000000},"entityaccesscount":{"value":0,"limit":500},"timingprofile":["100.00%  376.517      1 -total"," 28.74%  108.212      1 Wikipedia:Main_Page/Tomorrow"," 21.04%   79.220      1 Wikipedia:Today&#039;s_featured_article/June_9,_2025"," 19.73%   74.285      9 Template:Main_page_image"," 16.76%   63.088     28 Template:Flatlist"," 14.62%   55.057      9 Template:Str_number/trim"," 12.09%   45.503      2 Template:Wikipedia_languages"," 10.91%   41.089      2 Template:Main_page_image/TFA"," 10.73%   40.410      1 Template:Did_you_know/Queue/7","  9.02%   33.965      2 Template:TFArecentlist"]},"scribunto":{"limitreport-timeusage":{"value":"0.085","limit":"10.000"},"limitreport-memusage":{"value":3864850,"limit":52428800}},"cachereport":{"origin":"mw-web.eqiad.main-85d784b447-4cm2h","timestamp":"20250609024928","ttl":3600,"transientcontent":true}}});});<\/script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","name":"Main Page","url":"https://en.wikipedia.org/wiki/Main_Page","sameAs":"http://www.wikidata.org/entity/Q5296","mainEntity":"http://www.wikidata.org/entity/Q5296","author":{"@type":"Organization","name":"Contributors to Wikimedia projects"},"publisher":{"@type":"Organization","name":"Wikimedia Foundation, Inc.","logo":{"@type":"ImageObject","url":"https://www.wikimedia.org/static/images/wmf-hor-googpub.png"}},"datePublished":"2002-01-26T15:28:12Z","dateModified":"2025-06-09T02:10:44Z","image":"https://upload.wikimedia.org/wikipedia/commons/b/bc/Kate_Moss_-_Decort%C3%A9_advertisement_%28cropped2%29.jpg","headline":"Wikimedia project main page"}<\/script>

<div class="rt-overlay"></div><div id="mw-teleport-target" class="vector-body"></div><a accesskey="v" href="https://en.wikipedia.org/wiki/Main_Page?action=edit" class="oo-ui-element-hidden"></a></body>`,$m={simple:"<p>INVALID",meta_quid_on_vsn:'<_array data-_quid="qqq"><_ii data-_index="0"><p>one</p></_ii></_array>',array_indices_ok:`<_array>
    <_ii data-_index="0"><p>A</p></_ii>
    <_ii data-_index="1"><p>B</p></_ii>
    <_ii data-_index="2"><p>C</p></_ii>
  </_array>`,style_edge_values:`<div style="background-image:url('a&b.png'); content:'•' !important">x</div>`,array_indices_gap_INVALID:`<_array>
    <_ii data-_index="0"><p>A</p></_ii>
    <_ii data-_index="2"><p>C</p></_ii>
  </_array>`,literal__elem_INVALID:"<_elem><p>x</p></_elem>",vsn_with_attrs_INVALID:'<_ii class="x" data-_index="0"><p>x</p></_ii>',unknown_vsn_tag_INVALID:"<_foo><p>x</p></_foo>",meta_index_on_standard:'<div data-_index="7">x</div>',attr_order_irrelevant:'<a id="x" class="c b a" href="#">link</a>',void_img_attrs:'<img src="logo.png" alt="Company Logo" />',comment_between_inline:"<span>a<!--c-->b</span>",unquoted_numeric_attr:"<input value=42>",malformed_attr:'<a href="https://ok" onclick="1" <b>>link</a>'},Fm={basic:"<p>basic paragraph</p>",withAttribute:'<div data-test-id="attribute-test">div with attribute</div>',withMultipleAttributes:'<span class="multi-attr-test" lang="en">span with multiple attributes</span>',withFlag:'<button class="flag-test" disabled>button with flag</button>',nested:"<div><p>nested paragraph</p></div>",siblings:"<h2>sibling title</h2><p>sibling paragraph</p>",voidSelfClosing:"<p>line one<hr/>line two</p>",voidExplicitlyClosed:"<p>line one<hr></hr>line two</p>",comment:"<!-- comment test --><p>paragraph after comment</p>",mixedContent:"<header>paragraph with <span>mixed content</span> inside</header>"},Dm={elemSimple:"<p>this is body text</p>",container:`<div id="container">
    <p>A paragraph inside a div.</p>
  </div>`,siblings:`<article>
    <h2>Title</h2>
    <p>First paragraph.</p>
    <p>Second paragraph.</p>
  </article>`,mixed:`<section>
    Intro text <strong>important</strong> followed by more text.
  </section>`,void:'<img src="logo.png" alt="Company Logo" data-type="logo"/>',voidSimple:"<img />",void2:"<button></button>",randomAttrs:`<section id="randomAttrs">
  <div randomAttr1="present"></div>
  </section>`,randomAttrs2:`<section id="randomAttrs2">
  <div _randomAttr2="uncertain"></div>
  </section>`},Im={flagsEquivA:'<input type="text" disabled required checked>',flagsEquivB:'<input type="text" disabled="" required="required" checked="checked">',flagLiteralString:'<input type="text" disabled="true">',classOrderDedupe:'<div class="b a a">x</div>',entitiesTextAndAttr:'<div title="Tom &amp; Jerry &lt;3">Tom &amp; Jerry &lt;3</div>',inlineWhitespace:"<span> a <b>b</b> c </span>",quidTest:'<section data-_quid="abc123">x</section>'},Gm={optional_end_tags1:`
    <ul><li>one<li>two<li>three</ul>
  `,optional_end_tags2:`
    <table><tr><td>A<td>B</table>
  `,class_tokenize_whitespace:`<div class="  a	b
b  a  ">x</div>`,unquoted_attr_ok:"<div data-x=a:b,c.d/e?f=g&h=i#j>y</div>",double_attribute:'<div title="once" titls="twkce">three times a ladyyyyy</div>',attr_with_controls:'<p data-info="line1&#10;line2&#9;tabbed">t</p>',template_shadow:'<div id="host"><template shadowrootmode="open"><style>h1{color:red}</style><h1>Hi</h1></template></div>',template_inert:'<template id="t"><span data-x="1 &amp; 2">&not-parsed</span></template>',boolean_attr_mix:'<input required REQUIRED required="" required="required" required="false">',duplicate_attrs:'<div class="a" class="b" class="a b c">dup</div>',uppercase_tags_attrs:'<DIV CLASS="X" data-FOO="Bar">Up</DIV>',unicode_tricky_text:"<p>é = é; ZWJ: 👩‍💻; ZWNJ:‌between</p>",textarea_crlf:`<textarea>Line1\r
Line2
Line3</textarea>`},Hm={arbitrary_keys_1:"<brand><name>ACME</name><line>Series X</line></brand>",custom_elements_ui:'<sky-back><cloudy-sky><cloud id="c1"></cloud></cloudy-sky></sky-back>',details_summary:"<details open><summary>More</summary><p>Hidden text</p></details>",data_and_aria:'<div data-x="1" data-user="alice" role="button" aria-expanded="false">x</div>',safe_urls:'<div><a href="https://example.com">go</a><a href="mailto:a@b">mail</a><a href="tel:+123">call</a></div>',data_image_ok:'<img alt="dot" src="data:image/png;base64,iVBORw0KGgo=" loading="lazy">',img_srcset_ok:'<img src="https://cdn.site/a.png" srcset="https://cdn.site/a@2x.png 2x, https://cdn.site/a@3x.png 3x" alt="">',target_blank_ok:'<a href="https://example.com" target="_blank">new tab</a>',boolean_attrs:'<input type="checkbox" checked> <button disabled>btn</button>',optional_end_tags2:"<ul><li>one<li>two<li>three<ul><li>sub</ul></ul>",class_tokenize_whitespace:`<div class="  a	b
b  a  ">x</div>`,unquoted_attr_ok:"<div data-x=a:b,c.d/e?f=g&h=i#j>y</div>",mixed_unknown_standard:"<info><status>ok</status><meta2>noop</meta2><p>para</p></info>",harmless_inline:'<p>hello <span id="s" title="t">world</span></p>'},zm={script_tag:"<div>hi</div><script>alert(1)<\/script>",onclick_handler:'<button onclick="alert(1)">click</button>',js_url_href:'<a href="javascript:alert(1)">x</a>',js_in_srcset:'<img src="x" srcset="javascript:alert(1) 1x">',inline_style_attr:'<div style="color:red;transform:rotate(45deg)">x</div>',inline_style_url:'<div style="background:url(//evil.example/x)">x</div>',iframe_with_src:'<iframe src="https://evil.example/x"></iframe>',object_embed:'<object data="https://evil.example/x"></object><embed src="y.swf">',base_tag:'<base href="https://evil.example/">',meta_injection:'<meta http-equiv="refresh" content="0;url=https://evil.example/">',link_injection:'<link rel="preload" as="script" href="https://evil.example/x.js">',iframe_srcdoc:'<iframe srcdoc="<p>hi</p>"></iframe>',style_protocol_relative:'<div style="background-image:url(//cdn.example/a.png)">x</div>',form_injection:'<form action="/do"><input name="x" value="1"></form>',media_tags:'<video src="movie.mp4" controls></video><audio src="a.ogg" controls></audio>'},Bm={unquoted_attr_symbols:"<div data-x=a:b,c.d/e?f=g&h=i#j>ok</div>",boolean_attrs:"<button disabled autofocus>go</button>",class_tokenize:`<div class="  a	b
b  a  ">x</div>`,gt_in_value:'<div data-text="2 > 1 &amp; 3 > 2">y</div>',jsonish_in_attr:`<div data-json="{'ok':'true','n':3,'s':'a:b;c'}">z</div>`,duplicate_attrs_first_wins:'<input TYPE="text" type="password" value="x">',weird_spacing:'<div    data-a =  "1"    data-b=2    data-c =3  >w</div>',punctuation_value:'<meta http-equiv="refresh" content="0; url=https://example.com?a=1,2;mode:x">',empty_unquoted:"<div data-flag=>e</div>",unicode_attrs:'<div data–en-dash="–" lang="ja" title="ひらがな">u</div>',attr_url_mix:'<a href="https://example.com/?q=Tom&amp;Jerry&ref=mail">link</a>'},no=P({html__rudiments:Fm,html_plus:Dm,html__level3:Im,html__edgeCases:Gm,html__shouldPass:Hm,html__attributeCases:Bm,html__problematic:zm,html__largeFormat:{html_homepage:Am,html_wikipedia:Pm,html_hackerNews:Rm,html_gwern:Lm},html_INVALID:$m}),ao=["a","b","c","d"],io=["id","name","meta","data","tags"],Um=["","alpha","two words",'quote: "hi"',"backslash: \\",`newline:
line2`,"tab:	one","unicode: 漢字✓"];function ba(e,t){return t[Math.floor(e()*t.length)]}function qm(e){return JSON.stringify(e,null,2)}const Jm={name:"null",sample:()=>null},Vm={name:"bool",sample:e=>e()<.5},Km={name:"num",sample:e=>Math.floor(e()*6)<=3?Math.floor(e()*20)-10:Math.round((e()*200-100)*100)/100},Xm={name:"str",sample:e=>ba(e,Um)},so=(e,t=0,n=4)=>({name:`arr(${e.name})`,sample:a=>{const i=t+Math.floor(a()*(n-t+1)),s=[];for(let o=0;o<i;o++)s.push(e.sample(a));return s}}),oo=(e,t)=>({name:`obj(${e.name})`,sample:n=>{const a={};for(const i of t)a[i]=e.sample(n);return a}});function Qm(e,t){const n=(i,s)=>{if(s>=t.maxDepth)return i;const o=s===0?[{name:`arr(${i.name})`,sample:r=>so(i,0,t.arrMax).sample(r)},{name:`obj(${i.name})`,sample:r=>oo(i,t.keys).sample(r)}]:[i,{name:`arr(${i.name})`,sample:r=>so(i,0,t.arrMax).sample(r)},{name:`obj(${i.name})`,sample:r=>oo(i,t.keys).sample(r)}];return{name:`shape[d${s}]`,sample:r=>ba(r,o).sample(r)}};let a=e;for(let i=0;i<t.maxDepth;i++)a=n(a,i);return a}const Ym=[{name:"d1-s",o:{maxDepth:1,keys:ao,arrMax:3}},{name:"d2-s",o:{maxDepth:2,keys:ao,arrMax:3}},{name:"d2-m",o:{maxDepth:2,keys:io,arrMax:4}},{name:"d3-m",o:{maxDepth:3,keys:io,arrMax:4}}],Zm=[Xm,Km,Vm,Jm];function ef(e){const t=e.seed>>>0,n=Math.max(0,e.count|0),a=kn(t),i=[];for(let s=0;s<n;s++){const o=ba(a,Zm),r=ba(a,Ym),c=Qm(o,r.o).sample(a),p=qm(c);i.push(P({name:`json__gen__${t}__${String(s).padStart(4,"0")}__${o.name}__${r.name}`,fmt:"json",atom:p,tags:P(["generated","json",`seed:${t}`,`atom:${o.name}`,`shape:${r.name}`])}))}return P(i.map(P))}function yr(e){if(e===null)return"null";const t=typeof e;if(t==="string")return ma(e);if(t==="number"||t==="boolean")return String(e);if(typeof HTMLElement<"u"&&e instanceof HTMLElement)return ma(e.outerHTML);if(e&&t==="object"){const n=e;return typeof n._tag=="string"?`[HsonNode ${n._tag}]`:"[object]"}return String(e)}function $t(e,t,n="fixtures/basic",a,i="auto"){const s=[];for(const[o,r]of Object.entries(t))for(const[l,c]of Object.entries(r)){const p=`${o}.${l}`,u=i,b=`${n}::${p}`;a&&a.set(b,async()=>e._test_full_loop(c,{entry:u,dual:!0,times:3,verbose:!0,capture:!0,stopOnFirstFail:!1})),s.push(P({suite:n,name:p,meta:{fixture:o,sub:l,preview:yr(c)},run:()=>{const h={entry:u,dual:!0,times:3,stopOnFirstFail:!1},d=typeof c=="string"?c:typeof c=="object"&&c&&"text"in c?JSON.stringify(c.text??"",null,2):JSON.stringify(c,null,2),m=e._test_full_loop(c,{...h,verbose:!0,capture:!0});if(!m.ok){const v=m.failures?.[0],w=v?.error?`${v.step}: ${v.error}`:"loop failed (ok=false)";throw new Error(w)}return{metaPatch:P({fixture:o,input:d,sub:l,preview:d.length?ma(d):"—"})}}}))}return P({suite:n,cases:P(s)})}function ro(e,t,n,a){const i="fixtures/generated",s=a?String(a.seed>>>0):"",o=a?String(a.genHtmlCount):"",r=a?String(a.genJsonCount):"";return P({suite:i,cases:P(t.map(l=>{const c=yr(l.atom),p=l.tags?.length?l.tags.join(","):"",u={fmt:l.fmt,preview:c,...p?{tags:p}:{},...a?{seed:s,genHtmlCount:o,genJsonCount:r}:{}},b=`${i}::${l.name}`;return n&&n.set(b,async()=>e._test_full_loop(l.atom,{entry:l.fmt,dual:!0,times:3,verbose:!1,capture:!1,stopOnFirstFail:!1})),P({suite:i,name:l.name,meta:u,run:()=>{const h=typeof l.atom=="string"?l.atom:typeof l.atom=="object"&&l.atom&&"text"in l.atom?JSON.stringify(l.atom.text??"",null,2):JSON.stringify(l.atom,null,2),d=e._test_full_loop(l.atom,{entry:l.fmt,dual:!0,times:3,stopOnFirstFail:!1,verbose:!1,capture:!1});if(!d.ok){const m=d.failures?.[0],v=m?.error?`${m.step}: ${m.error}`:"loop failed (ok=false)";throw new Error(v)}return{metaPatch:P({input:h,preview:h.length?ma(h):"—"})}}})}))})}function tf(e,t,n,a={}){const i=(a.seed??Math.floor(Math.random()*1e9)>>>0)>>>0,s=a.genHtmlCount??2e3,o=a.genJsonCount??2e3,r=P([...Wm({seed:i,count:s}),...ef({seed:i,count:o})]);return P(e==="legacy"?[$t(t,eo,"fixtures/basic/json",n),$t(t,no,"fixtures/basic/html",n)]:e==="generated"?[ro(t,r,n,{seed:i,genHtmlCount:s,genJsonCount:o})]:e==="dev"?[$t(t,to,"fixtures/dev/json",n)]:[$t(t,eo,"fixtures/basic/json",n),$t(t,no,"fixtures/legacy/html",n),ro(t,r,n,{seed:i,genHtmlCount:s,genJsonCount:o}),$t(t,to,"fixtures/dev/json",n)])}function nf(){let e;const t=new Map,n=new Map,a=new Map,i=[];let s=0,o=0,r=0,l=0,c=0,p=0,u="idle";const b=(f,x)=>`${f}::${x}`,h=f=>{a.has(f)||(a.set(f,{suite:f,caseKeys:[],pass:0,fail:0,skip:0}),n.set(f,[]))};return P({onEvent:f=>{if(f.t==="suite_begin"){e=f.suite,s+=1,h(f.suite);const x=a.get(f.suite);f.totalPlanned!==void 0&&(x.totalPlanned=f.totalPlanned),u=`suite ${f.suite}…`;return}if(f.t==="case_begin"){o+=1,h(f.suite);const x=b(f.suite,f.name),S=f.meta,T=a.get(f.suite);n.get(f.suite).push(x),T.caseKeys.push(x);const M={key:x,suite:f.suite,name:f.name};t.set(x,P(S?{...M,meta:S}:M)),u=`… ${f.name}`;return}if(f.t==="case_end"){const x=b(f.suite,f.name),S=t.get(x);f.status==="pass"?r+=1:f.status==="fail"?l+=1:c+=1,h(f.suite);const T=a.get(f.suite);f.status==="pass"?T.pass+=1:f.status==="fail"?T.fail+=1:T.skip+=1;const M=S?.meta,O=M||f.metaPatch?P({...M??{},...f.metaPatch??{}}):void 0,W={key:x,suite:f.suite,name:f.name,status:f.status,ms:f.ms},G=O?{...W,meta:O}:W,R=f.err?{...G,err:f.err}:G;if(t.set(x,P(R)),f.status==="fail"){const Z=S?.meta,I={suite:f.suite,name:f.name,err:f.err??"Unknown error",ms:f.ms};i.push(Z?{...I,meta:Z}:I),u=`FAIL ${f.suite} :: ${f.name}`}else u=`${f.status.toUpperCase()} ${f.name}`;return}if(f.t==="suite_end"){p+=f.ms;const x=a.get(f.suite);x&&(x.ms=f.ms),u=`done ${f.suite} (${f.ms.toFixed(1)}ms)`;return}},getSummary:()=>P({suites:s,cases:o,pass:r,fail:l,skip:c,msTotal:p,failures:P([...i])}),getActiveSuite:()=>e,getLastLine:()=>u,listSuites:()=>P([...a.values()].map(f=>{const x={suite:f.suite,cases:P([...f.caseKeys]),pass:f.pass,fail:f.fail,skip:f.skip},S=f.totalPlanned!==void 0?{...x,totalPlanned:f.totalPlanned}:x,T=f.ms!==void 0?{...S,ms:f.ms}:S;return P(T)})),listCases:f=>{const x=n.get(f)??[],S=[];for(const T of x){const M=t.get(T);M&&S.push(M)}return P(S)},getCase:f=>t.get(f),listFailures:()=>P([...i]),clear:()=>{e=void 0,t.clear(),n.clear(),a.clear(),i.length=0,s=0,o=0,r=0,l=0,c=0,p=0,u="idle"}})}class af{suites=0;cases=0;pass=0;fail=0;skip=0;msTotal=0;failures=[];metaByCase=new Map;ingest(t){if(t.t==="suite_begin"&&(this.suites+=1),t.t==="suite_end"&&(this.msTotal+=t.ms),t.t==="case_begin"){this.cases+=1,this.metaByCase.set(this.key(t.suite,t.name),t.meta);return}if(t.t==="case_end"&&(t.status==="pass"?this.pass+=1:t.status==="fail"?this.fail+=1:this.skip+=1,t.status==="fail")){const n=this.metaByCase.get(this.key(t.suite,t.name)),a={suite:t.suite,name:t.name,err:t.err??"Unknown error",ms:t.ms};this.failures.push(n?{...a,meta:n}:a)}}summary(){return Object.freeze({suites:this.suites,cases:this.cases,pass:this.pass,fail:this.fail,skip:this.skip,msTotal:this.msTotal,failures:Object.freeze([...this.failures])})}key(t,n){return`${t}::${n}`}}async function sf(e,t,n={}){const a=new af,i=Mt();for(const r of e){if(n.filterSuite&&r.suite!==n.filterSuite)continue;const l=Mt();on(a,t,{t:"suite_begin",suite:r.suite,totalPlanned:r.cases.length});for(const c of r.cases){if(n.filterSuite&&c.suite!==n.filterSuite||n.filterCase&&!c.name.includes(n.filterCase))continue;const p=Mt(),u={t:"case_begin",suite:c.suite,name:c.name};on(a,t,c.meta?{...u,meta:c.meta}:u);try{const b=await c.run(),h=b&&typeof b=="object"&&"metaPatch"in b?b.metaPatch:void 0,d={t:"case_end",suite:c.suite,name:c.name,status:"pass",ms:Mt()-p};on(a,t,h?{...d,metaPatch:h}:d)}catch(b){const h=of(b);if(on(a,t,{t:"case_end",suite:c.suite,name:c.name,status:"fail",ms:Mt()-p,err:h}),n.bail)break}}if(on(a,t,{t:"suite_end",suite:r.suite,ms:Mt()-l}),n.bail&&a.summary().fail>0)break}const s=Mt()-i,o=P({...a.summary(),msTotal:s});return P({ok:o.fail===0,summary:o})}function on(e,t,n){e.ingest(n),t(n)}function Mt(){return typeof performance<"u"?performance.now():Date.now()}function of(e){return e instanceof Error?e.stack?`${e.message}
${e.stack}`:e.message:String(e)}const lo="38ch",rf={overflowX:"auto",overflowY:"auto",width:"100%",maxHeight:"70vh"},Bn={padding:"6px 8px",textAlign:"left",fontWeight:"600",borderBottom:"1px solid rgba(255,255,255,0.12)",whiteSpace:"nowrap",opacity:"0.85"},Ee={padding:"6px 8px",verticalAlign:"top",borderBottom:"1px solid rgba(255,255,255,0.08)",whiteSpace:"nowrap"},lf={padding:"8px 12px",whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace",background:U.backdeep,opacity:"0.95"},co={cursor:"pointer",userSelect:"none"},cf={background:U.backdeep,cursor:"pointer"},df={background:U.backdeep,cursor:"pointer"},ia={width:lo,maxWidth:lo,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},uf={...ia,paddingLeft:"18px",opacity:"0.95"},pf=e=>e.empty(),mf=(e,t)=>{const n=e.create.table().classlist.set(`insp-table ${t}`),a=n.create.thead(),i=n.create.tbody();return n.css.setMany({width:"100%",borderCollapse:"collapse"}),{table:n,thead:a,tbody:i}},Ft=(e,t)=>e.create.tr().classlist.set(t),Un=(e,t,n)=>{const a=e.create.th().classlist.set(t);return a.text.set(n),a},Oe=(e,t,n)=>{const a=e.create.td().classlist.set(t);return a.text.set(n),a};function ie(e){return e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function ff(e,t,n,a){const i=`[HSON capture] ${n} :: ${t}`,s=P([`ok: ${String(a.ok)}`,`entry: ${String(a.entry)}`,`dir: ${String(a.dir)}`,`times: ${String(a.times)}`,`failures: ${String(a.failures?.length??0)}`,"hash: —","norm: —"]),r=(a.trace??[]).map((f,x)=>{const S=ie(String(f.step??"")),T=f.ok?"ok":"fail",M=f.error?ie(String(f.error)):"";return`<tr>
      <td class="idx">${x}</td>
      <td class="ok ${T}">${T}</td>
      <td class="step">${S}${M?` <span class="small">— ${M}</span>`:""}</td>
    </tr>`}).join(""),l=a.failures??[],c=l.length?`<details open>
        <summary>failures (${l.length})</summary>
        <div style="overflow:auto; max-height: 26vh;">
          <table>
            <thead><tr><th>#</th><th>step</th><th>error</th></tr></thead>
            <tbody>
              ${l.map((f,x)=>{const S=ie(String(f.step??"")),T=ie(String(f.error??"—"));return`<tr>
                  <td class="idx">${x}</td>
                  <td class="step">${S}</td>
                  <td class="small">${T}</td>
                </tr>`}).join("")}
            </tbody>
          </table>
        </div>
      </details>`:'<div class="small">no failures</div>',p=a.artifacts??[],u=[],b=new Map;for(const f of p){const x=Number(f.lap??0),S=String(f.fmt??"—"),T=`${x}::${S}`;b.has(T)||(b.set(T,[]),u.push(T)),b.get(T).push(f)}const h=new Map,d=new Map,m=(f,x,S)=>{const T=f.get(x);T?T.push(S):f.set(x,[S])};for(const f of u){const[x]=f.split("::"),S=Number(x),T=b.get(f);T[0]&&m(h,S,T[0]),T[1]&&m(d,S,T[1])}const v=f=>[...f.keys()].sort((x,S)=>x-S),w=f=>f==="json"?1:f==="html"?2:f==="hson"?3:9,k=(f,x)=>{const T=[...x].sort((M,O)=>{const W=w(String(M.fmt)),G=w(String(O.fmt));return W!==G?W-G:String(M.fmt).localeCompare(String(O.fmt))}).map(M=>{const O=ie(String(M.fmt)),W=ie(String(M.text??"")),G=String(M.node??""),R=ie(G);return`
      <section class="card artCard" data-mode="text">
  <header class="cardHead">
    <div class="fmt">${O}</div>
    <div class="meta">lap ${f}</div>
  </header>

  <div class="cardTools">
    <div class="seg">
      <button class="btn" data-action="mode" data-mode="text">text</button>
      <button class="btn" data-action="mode" data-mode="node" ${G?"":"disabled"}>node</button>
    </div>
    <button class="btn" data-action="copy">copy</button>
  </div>
<div class="viewBox">
  <pre class="pre viewText" data-view="text">${W}</pre>
  <pre class="pre viewNode" data-view="node">${G?R:"— no node snapshot —"}</pre>
  </div>
</section>`}).join("");return`<h3 class="lapTitle">lap ${f}</h3>
    <div class="grid">${T}</div>`},y=(f,x)=>{const S=v(x);if(!S.length)return`<div class="small">no ${ie(f)} artifacts captured</div>`;const T=S.map(M=>k(M,x.get(M))).join("");return`<section style="margin-top: 14px;">
    <h2 style="margin: 0 0 8px 0;">${ie(f)}</h2>
    ${T}
  </section>`},g=`
  ${y("clockwise (cw)",h)}
  ${y("counterclockwise (ccw)",d)}
`;return P({title:i,pills:s,traceRowsHtml:r,failuresHtml:c,artifactCards:g})}function hf(e,t,n,a,i){const s=ff(e,t,n,a),o=(a.failures??[]).map((h,d)=>`
  <tr>
    <td class="idx">${d}</td>
    <td class="step">${ie(String(h.step??""))}</td>
    <td class="small">${ie(String(h.error??""))}</td>
  </tr>
`).join(""),r=`
<div class="traceWrap">
  <details ${a.failures?.length??0?"open":""}>
    <summary>failures (${a.failures?.length??0})</summary>
    <div style="overflow:auto; max-height: 40vh;">
      <table>
        <thead><tr><th>#</th><th>step</th><th>error</th></tr></thead>
        <tbody>${o||'<tr><td class="small" colspan="3">no failures</td></tr>'}</tbody>
      </table>
    </div>
  </details>
</div>
`,l=`
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${ie(s.title)}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; padding: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px; line-height: 1.35;
      background: ${U.backdeep}; color: #e9e9ee;
    }
    .top{
  display:grid;
  gap:10px;
  grid-template-columns: 1fr 2fr 2fr; /* details | steps | failures */
  align-items:start;
  margin-bottom:12px;
}
@media (max-width: 1100px){
  .top{ grid-template-columns: 1fr; }
}
     .cardTools{
    display:flex; justify-content:space-between; align-items:center;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.02);
    gap: 10px;
  }
  .seg{ display:flex; gap:6px; }
  .btn{
    padding:4px 8px; border-radius:8px;
    border:1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: inherit;
    cursor:pointer;
    user-select:none;
    font: inherit;
  }
.artCard { position: relative; }

.artCard .viewBox{
  position: relative;
  height: 22vh;
  min-height: 180px;
  overflow: hidden;         /* containment */
  padding: 8px 10px;
}

.artCard .viewBox > .pre[data-view]{
  position: absolute;
  inset: 0;
  overflow: auto;
  white-space: pre;
}
.artCard[data-mode="text"] .pre[data-view="text"] { display: block; }
.artCard[data-mode="node"] .pre[data-view="node"] { display: block; }
   .artCard[data-mode="text"] [data-view="node"]{ display:none; }
  .artCard[data-mode="node"] [data-view="text"]{ display:none; }
 .artCard[data-mode="text"] .btn[data-mode="text"],
  .artCard[data-mode="node"] .btn[data-mode="node"]{
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.20);
  }
  .btn[disabled]{ opacity:0.4; cursor:not-allowed; }

    .btn:hover { background: rgba(255,255,255,0.10); }
    .btn:active { transform: translateY(1px); }
    .btn.on {
      background: rgba(255,255,255,0.14);
      border-color: rgba(0,255,255,0.42);
    }

    .viewPane { display: none; }
    .viewPane.on { display: block; }
.finalGrid{
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
}
@media (max-width: 1100px){ .finalGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 720px){ .finalGrid{ grid-template-columns: 1fr; } }
    /* CHANGED: fixed-ish height so toggling doesn’t explode the layout */
    .pre {
      margin: 0;
      padding: 10px;
      border-radius: 8px;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.08);
      overflow: auto;
      max-height: 42vh;
      white-space: pre;
    }
    .pillRow { display: flex; flex-direction: column; flex-wrap: wrap; gap: 8px; }
    .pill {
      padding: 4px 8px; border-radius: 999px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.10);
      white-space: nowrap;
    }
    h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 700; }
    h2 { margin: 0 0 6px 0; font-size: 13px; font-weight: 700; }
    h3 { margin: 14px 0 8px 0; font-size: 12px; font-weight: 700; opacity: 0.9; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 1100px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      overflow: hidden;
    }
    .cardHead {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
    }
    .fmt { font-weight: 700; }
    .meta { opacity: 0.7; }
    details { padding: 8px 10px; }
    summary { cursor: pointer; user-select: none; opacity: 0.9; }
    .traceWrap {
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.07); }
    th { text-align: left; font-weight: 700; background: rgba(255,255,255,0.03); }
    td.idx { width: 5ch; opacity: 0.7; }
    td.ok { width: 7ch; font-weight: 700; }
    td.ok.ok { color: #87f7a6; }
    td.ok.fail { color: #ff6b6b; }
    td.step { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .small { opacity: 0.75; }
  </style>`,c=s.pills.map(h=>`<div class="pill">${ie(h)}</div>`).join("");`${ie(String(a.entry??"—"))}`;const p=i?.fixture??"",u=`
<section class="traceWrap" style="margin: 12px 0;">
  <details open>
    <summary>final outputs</summary>
    <div style="padding: 8px 10px;">

      <div class="finalGrid">

        <section class="artCard" data-mode="text">
          <header class="cardHead">
            <div class="fmt">input</div>
            <div class="meta">
              <button class="btn" data-action="copy">copy</button>
            </div>
          </header>
          <div class="viewBox">
            <pre class="pre" data-view="text">${ie(p||"—")}</pre>
            <pre class="pre" data-view="node" style="display:none;"></pre>
          </div>
        </section>

        <section class="artCard" data-mode="text">
          <header class="cardHead">
            <div class="fmt">final ${a.final?`(${ie(String(a.final.fmt))})`:""}</div>
            <div class="meta">
              <button class="btn" data-action="copy">copy</button>
            </div>
          </header>
          <div class="viewBox">
            <pre class="pre" data-view="text">${a.final?ie(String(a.final.text??"")):"—"}</pre>
            <pre class="pre" data-view="node" style="display:none;"></pre>
          </div>
        </section>

        ${a.dualFinals?.cw?`
        <section class="artCard" data-mode="text">
          <header class="cardHead">
            <div class="fmt">cw final (${ie(String(a.dualFinals.cw.fmt))})</div>
            <div class="meta">
              <button class="btn" data-action="copy">copy</button>
            </div>
          </header>
          <div class="viewBox">
            <pre class="pre" data-view="text">${ie(String(a.dualFinals.cw.text??""))}</pre>
            <pre class="pre" data-view="node" style="display:none;"></pre>
          </div>
        </section>`:""}

        ${a.dualFinals?.ccw?`
        <section class="artCard" data-mode="text">
          <header class="cardHead">
            <div class="fmt">ccw final (${ie(String(a.dualFinals.ccw.fmt))})</div>
            <div class="meta">
              <button class="btn" data-action="copy">copy</button>
            </div>
          </header>
          <div class="viewBox">
            <pre class="pre" data-view="text">${ie(String(a.dualFinals.ccw.text??""))}</pre>
            <pre class="pre" data-view="node" style="display:none;"></pre>
          </div>
        </section>`:""}

      </div>
    </div>
  </details>
</section>
`,b=`
  <div class="top">
    <div>
      <h2>${ie(n)}::</h2>
      <h1>${ie(t)}</h1>
      <h2>3-way test — capture report</h2>

      <div class="pillRow">
        ${c}
      </div>

      
    </div>

    <div class="traceWrap">
      <details ${a.trace?.length?"open":""}>
        <summary>trace (${a.trace?.length??0})</summary>
        <div style="overflow:auto; max-height: 40vh;">
          <table>
            <thead><tr><th>#</th><th>ok</th><th>step</th></tr></thead>
            <tbody>${s.traceRowsHtml||'<tr><td class="small" colspan="3">no trace</td></tr>'}</tbody>
          </table>
        </div>
      </details>
    </div>
        ${r}
  </div>

   ${u}

  ${s.artifactCards||"<div class='small'>no artifacts captured</div>"}
  `;return{title:s.title,html:`<html><head>${l}
  <script>
(() => {
  const findCard = (el) => el && el.closest && el.closest(".artCard");

  document.addEventListener("click", async (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    const action = t.getAttribute("data-action");
    if (!action) return;

    const card = findCard(t);
    if (!card) return;

    if (action === "mode") {
      const mode = t.getAttribute("data-mode");
      if (mode === "text" || mode === "node") card.setAttribute("data-mode", mode);
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }

    if (action === "copy") {
      const mode = card.getAttribute("data-mode") || "text";
      const pre = card.querySelector('[data-view="' + mode + '"]');
      const txt = pre ? pre.textContent : "";
      try {
        await navigator.clipboard.writeText(txt || "");
        t.textContent = "copied";
      } catch (e) {
        console.error(e);
        t.textContent = "failed";
      } finally {
        window.setTimeout(() => (t.textContent = "copy"), 900);
      }
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
  });
})();
<\/script></head><body>${b}</body></html>`}}function gf(e){const t=new Blob([e],{type:"text/html;charset=utf-8"}),n=URL.createObjectURL(t),a=window.open(n,"_blank");window.setTimeout(()=>URL.revokeObjectURL(n),1e4),a||console.warn("[capture:view] popup blocked")}function bf(e){const t=[];t.push(`ok: ${e.ok}`),t.push(`entry: ${String(e.entry)}`),t.push(`dir: ${String(e.dir)}`),t.push(`times: ${String(e.times)}`),t.push(`failures: ${String(e.failures?.length??0)}`),t.push("hash: —"),t.push("norm: —");const n=t.join(`
`),a=(e.trace??[]).map((c,p)=>{const u=c.ok?"OK":"FAIL",b=String(c.step??""),h=c.error?` — ${c.error}`:"";return`${p.toString().padStart(3," ")}  ${u}  ${b}${h}`}).join(`
`)||"—",i=(e.failures??[]).map((c,p)=>{const u=c.ok?"OK":"FAIL",b=String(c.step??""),h=c.error?` — ${c.error}`:"";return`${p.toString().padStart(3," ")}  ${u}  ${b}${h}`}).join(`
`)||"—",o=[...e.artifacts??[]].sort((c,p)=>c.lap!==p.lap?c.lap-p.lap:String(c.fmt).localeCompare(String(p.fmt))),r=o.length?o.map(c=>{const p=c.label??`lap ${c.lap}`,u=String(c.fmt),b=String(c.text??"");return`=== ${p} (${u}) ===
${b}`}).join(`

`):"—",l=(()=>{if(!o.length)return"—";const c=new Map;for(const u of o){const b=String(u.fmt),h=c.get(b);(!h||u.lap>h.lap)&&c.set(b,u)}const p=[];for(const u of["json","hson","html"]){const b=c.get(u);b&&p.push(`--- final ${u} ---
${String(b.text??"")}`)}return p.join(`

`)||"—"})();return P([P({title:"Summary",bodyText:n}),P({title:"Trace",bodyText:a}),P({title:"Failures",bodyText:i}),P({title:"Final artifacts",bodyText:l}),P({title:"All artifacts",bodyText:r})])}let qn=null;const rn=e=>{const t=e;t.preventDefault?.(),t.stopPropagation?.()};function yf(e,t){const n=t?.fixture??"";return bf(e).map(s=>{if(s.title!=="Summary")return s;const o=n.length?`

=== input (as-fed) ===
${n}`:`

=== input (as-fed) ===
—`;return P({...s,bodyText:`${s.bodyText}${o}`})}).map(s=>`## ${s.title}
${s.bodyText}`).join(`

`)}function wf(e,t,n,a){const i=n?.hideClass,s=e.create.div().classlist.set("inspector");s.create.div().classlist.set("insp-header");const r=s.create.div().classlist.set("insp-body").create.div().classlist.set("insp-cols"),l=r.create.div().classlist.set("insp-main"),c=r.create.div().classlist.set("insp-side"),p=l.create.div().classlist.set("insp-table-host"),u=c.create.div().classlist.set("insp-fails"),b=c.create.div().classlist.set("insp-detail");b.text.set("—");const h=new Set,d=new Map,m=new Map,v=M=>{const O=d.get(M);if(O)return O;const W=new Set;return d.set(M,W),W},w=M=>{const O=m.get(M);if(O)return O;const W=new Set;return m.set(M,W),W},k=M=>M?(new TextEncoder().encode(M).length/1024).toFixed(1):"—",y=M=>{const O=M.indexOf(".");if(O>0)return M.slice(0,O);const W=M.split("__").filter(Boolean);return W.length>=3?W.slice(0,3).join("__"):W.length>=2?W.slice(0,2).join("__"):M},g=()=>{const M=qn?.scrollTop??0;pf(p);const O=t.listSuites(),W=t.listFailures(),G=new Set,R=new Map,Z=new Set;for(const ae of W){const We=`${ae.suite}::${ae.name}`;G.add(We),Z.add(ae.suite);const ee=y(ae.name);let et=R.get(ae.suite);et||(et=new Set,R.set(ae.suite,et)),et.add(ee)}const I=p.create.div().classlist.set("insp-scroll main-scroll");I.css.setMany(rf),qn=I.asDomElement();const{thead:J,tbody:$}=mf(I,"insp-main"),re=Ft(J,"insp-head-row");if(Un(re,"c-res","res").css.setMany({...Bn,width:Pe,maxWidth:Pe}),Un(re,"c-name","suite / group / case").css.setMany({...Bn,...ia}),Un(re,"c-kb","kb").css.setMany({...Bn,width:Pe,maxWidth:Pe}),Un(re,"c-ms","ms").css.setMany({...Bn,width:Pe,maxWidth:Pe}),!O.length){const ae=Ft($,"insp-empty");Oe(ae,"c-empty","no suites").css.setMany(Ee);return}for(const ae of O){const We=ae.suite,ee=h.has(We),et=ee?"▼":"▶",Q=Ft($,"insp-suite-row");if(Q.css.setMany(cf),ae.fail>0&&Q.css.setMany(im),Oe(Q,"c-res",et).css.setMany(Ee),Oe(Q,"c-name",`${We}  (${ae.pass}/${ae.fail}/${ae.skip})`).css.setMany({...Ee,...ia}),Oe(Q,"c-kb","—").css.setMany(Ee),Oe(Q,"c-ms",ae.ms!==void 0?ae.ms.toFixed(1):"—").css.setMany(Ee),Q.listen.onClick(Ae=>{rn(Ae),ee?h.delete(We):h.add(We),g()}),!ee)continue;const Jt=t.listCases(We);if(!Jt.length)continue;const Y=new Map,ut=[];for(const Ae of Jt){const Be=y(Ae.name);let De=Y.get(Be);De||(De=[],Y.set(Be,De),ut.push(Be)),De.push(Ae)}const wt=v(We),Ne=w(We);for(const Ae of ut){const Be=Y.get(Ae),De=wt.has(Ae),An=De?"▼":"▶";let tt=0,pt=0,Ue=0,_t=0,kt=0;for(const B of Be){B.status==="pass"?tt+=1:B.status==="fail"?pt+=1:B.status==="skip"&&(Ue+=1),B.ms!==void 0&&(_t+=B.ms);const qe=B.meta?.fixture??"";qe&&(kt+=new TextEncoder().encode(qe).length)}const ve=Ft($,"insp-group-row");if(ve.css.setMany(df),pt>0&&ve.css.setMany(sm),Oe(ve,"c-res",An).css.setMany(Ee),Oe(ve,"c-name",`${Ae}  (${tt}/${pt}/${Ue})`).css.setMany({...Ee,...ia}),Oe(ve,"c-kb",kt?(kt/1024).toFixed(1):"—").css.setMany(Ee),Oe(ve,"c-ms",_t?_t.toFixed(1):"—").css.setMany(Ee),ve.listen.onClick(B=>{B.preventDefault(),B.stopPropagation(),De?wt.delete(Ae):wt.add(Ae),g()}),!!De)for(const B of Be){const qe=B.status??"—",Mn=B.ms!==void 0?B.ms.toFixed(1):"—",Ct=B.meta?.preview??"",vt=Ft($,"insp-case-row");qe==="fail"&&vt.css.setMany(om),Oe(vt,"c-res",qe).css.setMany(Ee);const jt=Oe(vt,"c-name",B.name);if(jt.css.setMany({...Ee,...uf,...co}),Oe(vt,"c-kb",Ct?k(Ct):"—").css.setMany(Ee),Oe(vt,"c-ms",Mn).css.setMany(Ee),jt.listen.onClick(mt=>{rn(mt),Ne.has(B.key)?Ne.delete(B.key):Ne.add(B.key),g()}),Ne.has(B.key)){const Ce=Ft($,"insp-case-preview-row").create.td().classlist.set("insp-case-preview-cell");Ce.setAttrs("colspan","4"),Ce.css.setMany(lf),Ce.empty();const xe=Ce.create.div().classlist.set("insp-cap-row");xe.css.setMany({display:"grid",gridTemplateColumns:"2rem auto auto",gap:"8px",alignItems:"center",marginBottom:"8px"});const Lt=xe.create.div().classlist.set("insp-cap-meta");Lt.css.setMany({opacity:"0.85",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}),Lt.text.set(`${B.suite} :: ${B.name}`);const Vt=je=>{const ue=xe.create.div().classlist.set("insp-cap-btn");return ue.text.set(je),ue.setAttrs("role","button"),ue.css.setMany({padding:"4px 8px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.06)",userSelect:"none",cursor:"pointer",whiteSpace:"nowrap"}),ue},ft=Vt("copy"),nt=Vt("view"),xt=Ce.create.pre().classlist.set("insp-preview-pre");xt.css.setMany({margin:"0",padding:"10px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(0,0,0,0.35)",overflow:"auto",maxHeight:"100%",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}),xt.text.set(Ct||"—"),xt.css.setMany(co),xt.listen.onClick(je=>{rn(je),Ne.delete(B.key),g()}),queueMicrotask(()=>{I.asDomElement().scrollTop=M}),requestAnimationFrame(()=>{requestAnimationFrame(()=>{qn&&(qn.scrollTop=M)})}),ft.listen.onClick(async je=>{if(rn(je),!!a){ft.text.set("copying…");try{const ue=await a(B.key),Me=t.getCase(B.key)?.meta,Je=yf(ue,Me);await navigator.clipboard.writeText(Je),ft.text.set("copied")}catch(ue){console.error(ue),ft.text.set("failed")}finally{window.setTimeout(()=>ft.text.set("copy"),900)}}}),nt.listen.onClick(async je=>{if(rn(je),!!a){nt.text.set("opening…");try{const ue=await a(B.key),Me=t.getCase(B.key)?.meta,Je=hf(B.key,B.name,B.suite,ue,Me);gf(Je.html),nt.text.set("view")}catch(ue){console.error(ue),nt.text.set("failed"),window.setTimeout(()=>nt.text.set("view"),900)}}})}}}}},f=()=>{p.empty(),u.empty(),b.text.set("—"),h.clear(),d.clear(),m.clear()},x=()=>g(),S=()=>s.classlist.remove(i),T=()=>s.classlist.add(i);return s.css.setMany({padding:"10px",fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace",fontSize:ze.main,lineHeight:"1.35"}),l.css.setMany({display:"grid",gap:"6px"}),c.css.setMany({display:"none"}),Object.freeze({render:x,show:S,hide:T,clear:f})}const _f="TRANSFORMER LOOP TEST: parses & serializes an input string through JSON->HSON->HTML->JSON (and the opposite direction) over n iterations, diffs steps (expect 8 errors from invalid HTML)",uo=[{key:"all",label:"all"},{key:"generated",label:"generated"},{key:"legacy",label:"legacy"},{key:"dev",label:"dev"}];function kf(){let e=!1;const t=be.fromTrustedHtml("<div></div>").liveTree.asBranch().id.set("panel-branch");t.css.setMany(lm);const a=t.create.div().id.set("test-marquee-box").css.setMany(am).create.div().id.set("test-marquee").css.setMany({...tm});let i=!1,s="normal",o="all";const r=t.create.div().id.set("test-controls").css.setMany(cm),l=Ks(r,"test-run","run"),c=r.create.select().id.set("test-select").css.setMany(um),p=Ks(r,"test-clear","clear"),u=l.node.css.setMany(dm),b=p.node.css.setMany(nm),h=k=>{e||(e=!0,u.listen.onClick(()=>{k.onRun(o)}),b.listen.onClick(()=>k.onClear()))},d=pm(t),m=k=>{i&&a.text.set(k)},v=()=>{i&&a.text.set("")},w=k=>{if(i)return;k.append(t),i=!0,c.empty();for(const g of uo){const f=c.create.option();f.setAttrs("value",g.key),f.text.set(g.label),g.key===o&&f.setAttrs("selected","selected")}c.listen.on("change",()=>{const g=c.getFormValue()??"all";o=uo.find(f=>f.key===g)?.key??"all"});const y=(g,f)=>{g.css.setMany(f?{transform:"translateY(1px)",filter:"brightness(0.98)"}:{transform:"translateY(0px)",filter:"brightness(1.0)"})};u.listen.onPointerDown(()=>y(u,!0)),u.listen.onPointerUp(()=>y(u,!1)),u.listen.onPointerLeave(()=>y(u,!1)),b.listen.onPointerDown(()=>y(b,!0)),b.listen.onPointerUp(()=>y(b,!1)),b.listen.onPointerLeave(()=>y(b,!1)),b.listen.onClick(()=>{v(),m("idle")})};return a.text.set(_f),ne.data({branch:t,mount:w,init:h,runBtn:u,clearBtn:b,suiteSel:c,marquee:a,chips:d,getLevel:()=>s,getMode:()=>o,setMarquee:m,clearMarquee:v})}function vf(e){try{const t=e.find.byId("test-panels-root");t&&t.removeSelf();const n=e.create.div().id.set("test-panels-root").css.setMany({display:"grid",gap:"12px",minWidth:"0",minHeight:"0",gridTemplateRows:"auto 1fr"}),i=n.create.div().css.setMany(di).create.div().css.setMany(ci),s=n.create.div().css.setMany(di),o=s.create.div().css.setMany({...ci,minHeight:"12rem"}),r=He(kf());r.mount(i);const l=nf(),c=new Map,p=wf(o,l,{hideClass:yt},async b=>{const h=c.get(b);if(!h)throw new Error(`no capture registered for key: ${String(b)}`);return h()}),u=b=>{l.onEvent(b),r.marquee.text.set(l.getLastLine())};return r.runBtn.listen.onClick(async()=>{const b=()=>new Promise(k=>requestAnimationFrame(()=>k()));r.chips.clear(),s.classlist.remove(yt),l.clear(),r.marquee.text.set("running loop test…"),await b();let h=!1;const d=k=>{l.onEvent(k),h&&r.marquee.text.set(l.getLastLine())};await b(),h=!0;const m=r.getMode();c.clear();const v=tf(m,{_test_full_loop:gm},c),w=await sf(v,d,{bail:!1});r.chips.render(w.summary),r.marquee.text.set(l.getLastLine()),p.show(),p.render()}),r.clearBtn.listen.onClick(()=>{l.clear(),r.chips.clear(),r.marquee.text.set("idle"),p.clear(),s.classlist.add(yt)}),ne.data({root:n,testSurface:i,inspectorSurface:o,tp:r,inspector:p})}catch(t){return ne.err(t instanceof Error?t.message:"unknown error:",t)}}const yn={ui:{currentView:null}},mi=new Set,xf=e=>{for(const t of mi)t(yn,e)},Sf=()=>({ui:{...yn.ui}});function Tf(){return yn.ui.currentView}function Af(e){const t=Sf();e(yn),t.ui.currentView!==yn.ui.currentView&&xf(t)}function Jn(e){Af(t=>{t.ui.currentView=e})}function Mf(e){const t=n=>e(n);return mi.add(t),()=>mi.delete(t)}const Ef={display:"flex",alignItems:"baseline",gap:"10px",position:"relative",zIndex:"5",minHeight:"2rem",padding:"6px 8px 8px",borderRadius:"10px",background:"rgba(255,255,255,0.03)",boxShadow:"inset 0 -1px 0 rgba(255,255,255,0.08)",textShadow:"0 0 10px rgba(140,210,255,0.10)"},Of={position:"relative",minHeight:"0",minWidth:"0"},Wf={position:"absolute",inset:"0",color:Su.dim,display:"grid",placeItems:"center",pointerEvents:"none",userSelect:"none",fontFamily:"monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:ze.heading,letterSpacing:"0.12px",textTransform:"uppercase",overflow:"hidden"},Nf={position:"absolute",left:"14px",bottom:"12px",pointerEvents:"none",userSelect:"none",opacity:"0.25",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"14px",letterSpacing:"0.06em"},Cf={position:"absolute",top:"10px",right:"12px",pointerEvents:"none",userSelect:"none",opacity:"0",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"14px",letterSpacing:"0.10em",textTransform:"uppercase"},jf={boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.08)"},Xa={opacity:"1",filter:"none",pointerEvents:"auto",userSelect:"auto"},Lf={filter:"saturate(0.9) brightness(0.8)",pointerEvents:"auto",userSelect:"none"},Rf={marginLeft:"auto",height:"26px",padding:"0 10px",borderRadius:"10px",background:"rgba(0,0,0,0.14)",boxShadow:"inset 0 0 0 1px rgba(120,255,210,0.22)",color:"rgba(170,255,235,0.80)",fontSize:"12px",letterSpacing:"0.04em",cursor:"pointer",userSelect:"none",mixBlendMode:"screen"},Pf=e=>{e.textarea.setFlags("readonly"),e.textarea.css.setMany({pointerEvents:"auto",userSelect:"none",caretColor:"transparent"})},Qa=e=>{e.textarea.removeFlags("readonly"),e.textarea.css.setMany({pointerEvents:"auto",userSelect:"text",caretColor:"auto"})};function $f(e){const t=Object.keys(e.panels);let n=!1,a=null,i=!1,s=null,o=null;const r=g=>new TextEncoder().encode(g).length,l=g=>g.textarea.getFormValue()??"",c=(g,f)=>{g.textarea.setFormValue(f,{silent:!0})},p=()=>{s&&clearTimeout(s),s=null,o=null},u=g=>{p(),o=g,s=setTimeout(()=>{o===g&&(a===g&&!i||(c(e.panels[g],""),e.panels[g].bytes.text.set("0 bytes")))},3e4)},b=g=>{for(const f of t){const x=e.panels[f],S=g===f;x.status.css.setMany({opacity:S?"1":"0"}),x.panel.css.setMany(S?jf:{boxShadow:null})}},h=(g,f)=>{const x=e.panels[g];if(f==="idle"){x.status.text.set(""),x.status.css.setMany({opacity:"0"});return}if(f==="typing"){x.status.text.set("..."),x.status.css.setMany({opacity:"1",color:"dodgerblue"});return}if(f==="valid"){x.status.text.set("valid"),x.status.css.setMany({opacity:"1",color:"lime"});return}x.status.text.set("invalid"),x.status.css.setMany({opacity:"1",color:"red"})},d=()=>{for(const g of t){const f=e.panels[g];if(a===g){f.wrap.css.setMany(Xa),Qa(f);continue}a&&i?(f.wrap.css.setMany(Lf),Pf(f)):(f.wrap.css.setMany(Xa),Qa(f))}};for(const g of t){const f=e.panels[g];f.wrap.css.setMany(Xa),Qa(f)}const m=g=>{for(const f of t)f!==g&&(c(e.panels[f],""),e.panels[f].bytes.text.set("0 bytes"))},v=g=>/^"(?:\\.|[^"\\])*"$/.test(g),w=g=>g==="null"||g==="true"||g==="false"||/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(g),k=(g,f)=>{const x=f.trim();if(!x)return{ok:!1};if(v(x))try{const S=JSON.parse(x);return typeof S=="string"?{ok:!0,value:S,kind:"string"}:{ok:!1}}catch{return{ok:!1}}if(w(x))try{const S=JSON.parse(x);return S===null||typeof S=="number"||typeof S=="boolean"?{ok:!0,value:S,kind:"scalar"}:{ok:!1}}catch{return{ok:!1}}return{ok:!1}},y=g=>{if(n)return;n=!0;const f=e.panels[g],x=l(f);if(f.bytes.text.set(`${r(x)} bytes`),a===g&&h(g,"typing"),x.trim().length===0){a===g&&(i=!0,h(g,"invalid"),f.bytes.text.set("INVALID"),d()),n=!1;return}try{if(g==="json"||g==="hson"){const T=k(g,x);if(T.ok){const M=JSON.stringify(T.value),O=M,W=T.kind==="string"?T.value:`<_val>${String(T.value)}</_val>`;c(e.panels.json,M),e.panels.json.bytes.text.set(`${r(M)} bytes`),c(e.panels.hson,O),e.panels.hson.bytes.text.set(`${r(O)} bytes`),c(e.panels.html,W),e.panels.html.bytes.text.set(`${r(W)} bytes`),a===g&&(i=!1,p(),h(g,"valid"),d()),n=!1;return}if(g==="hson"){const M=x.trim();if(/^[A-Za-z_][A-Za-z0-9_]*$/.test(M)){a===g&&(i=!0,h(g,"invalid"),d()),n=!1;return}}}const S=g==="json"?be.fromJson(x):g==="hson"?be.fromHson(x):be.fromTrustedHtml(x);if(g!=="json"){const T=S.toJson().serialize();c(e.panels.json,T),e.panels.json.bytes.text.set(`${r(T)} bytes`)}if(g!=="hson"){const T=S.toHson().serialize();c(e.panels.hson,T),e.panels.hson.bytes.text.set(`${r(T)} bytes`)}if(g!=="html"){const T=S.toHtml().serialize();c(e.panels.html,T),e.panels.html.bytes.text.set(`${r(T)} bytes`)}a===g&&(i=!1,p(),h(g,"valid"),d())}catch{a===g&&(i=!0,h(g,"invalid"),d())}finally{n=!1}};for(const g of t){const f=e.panels[g];f.textarea.listen.onFocus(()=>{if(a&&a!==g&&i){const S=a;c(e.panels[S],""),e.panels[S].bytes.text.set("0 bytes")}p(),a=g,b(g),i=!1,d(),l(f).trim().length===0?(i=!0,d()):h(g,"typing")}),f.textarea.listen.onBlur(()=>{a===g&&(i&&(m(g),u(g)),a=null,i=!1,b(null),h(g,"idle"),d())}),f.textarea.listen.onInput(()=>y(g))}a=null,i=!1,p(),b(null),d();for(const g of t){const f=e.panels[g];f.bytes.text.set(`${r(l(f))} bytes`),f.status.text.set(""),f.status.css.setMany({opacity:"0"})}}const Ff={json:"{JSON}",hson:"<HSON>",html:"<HTML/>"};function Df(e){const t=He(If(e));return $f(t),ne.data(t)}function If(e,t={}){const n=t.fmts??["json","hson","html"],a=e.find.byId(Vs);a&&a.removeSelf();const i=e.create.div().id.set(Vs).css.setMany(em),s={};for(const o of n){const r=i.create.section().data.set("role",`panel-${o}`).css.setMany(gr),l=r.create.div().data.set("role",Qp).css.setMany(Ef),c=l.create.span();c.data.set("field",`${o}-bytes`),c.text.set("0 bytes");const p=l.create.div().classlist.set("pp-copy").text.set("copy").css.setMany(Rf).setAttrs({role:"button",tabindex:"0","aria-label":`copy ${o}`}),u=r.create.div().classlist.set("pp-textwrap").css.setMany(Of),b=u.create.div().classlist.set("pp-watermark pp-watermark--fmt").text.set(Ff[o]).css.setMany(Wf),h=u.create.div().classlist.set("pp-watermark pp-watermark--empty").css.setMany(Nf),d=u.create.div().classlist.set("pp-status").text.set("").css.setMany(Cf),m=u.create.textarea();m.data.set("input",o),m.css.setMany(Ai);const v=m.create.span();v.classlist.add("chip","validity"),v.text.set(""),p.listen.onClick(()=>{const w=m.getFormValue(),k=globalThis.navigator?.clipboard?.writeText;k&&k.call(navigator.clipboard,w)}),s[o]={fmt:o,panel:r,head:l,textarea:m,chip:v,bytes:c,copyBtn:p,wrap:u,wmFmt:b,wmEmpty:h,status:d}}return ne.data({root:i,panels:s})}function ln(e,t){const n=e.create.div().id.set(`${t}-panel`).classlist.add("panel",t,yt).css.setMany({position:"absolute",inset:"0",minHeight:"0",minWidth:"0",display:"grid",pointerEvents:"auto"}),a=n.create.div().classlist.add("panel-frame",`${t}-frame`).css.setMany({...di,minHeight:"0",minWidth:"0",display:"grid"}),i=a.create.div().classlist.add("panel-body",`${t}-body`).css.setMany({...ci,minHeight:"0",minWidth:"0"});return{panel:n,frame:a,surface:i}}const Gf={width:"100%",height:"100%",minWidth:"0",minHeight:"0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:Tn},Hf={minWidth:"0",minHeight:"0",display:"grid"},zf={display:"flex",alignItems:"center",gap:"10px",minWidth:"0"},Bf={fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"12px",letterSpacing:"0.14em",textTransform:"uppercase",color:qt.std,opacity:"0.9"},Uf={marginLeft:"auto"},po={position:"relative",minWidth:"0",minHeight:"0",width:"100%",height:"100%",display:"grid"},qf={...Ai,color:qt.baby,fontSize:ze.main,padding:"10px"},Jf={position:"absolute",inset:"0",display:"grid",placeItems:"center",pointerEvents:"none",userSelect:"none",opacity:"0.08",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"72px",letterSpacing:"0.12em",textTransform:"uppercase"},Vf={position:"absolute",top:"10px",right:"12px",pointerEvents:"none",userSelect:"none",opacity:"0",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"12px",letterSpacing:"0.12em",textTransform:"uppercase"},mo={...Ta,padding:"8px 10px",borderRadius:"12px",background:U.backdeep,color:vn.candy,boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)"},Kf={display:"grid",gridAutoFlow:"column",gap:"8px",marginLeft:"auto"},fo={...Ta,padding:"8px 10px",borderRadius:"12px",background:"rgba(0,0,0,0.18)",color:Ze.faded},Xf={boxShadow:"inset 0 0 0 1px rgba(120,255,210,0.22)",color:Ze.std},Qf={width:"100%",height:"100%",minWidth:"0",minHeight:"0",overflow:"auto",borderRadius:"10px",boxSizing:"border-box",background:U.backdeep,boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)",padding:"10px"},Yf={...Ai,padding:"10px",color:Ze.std},ho="build-root",Zf=`<div id="build-demo" style="border: 1px solid dodgerblue; box-sizing: border-box; display: grid; height: 100%; padding: 12px; width: 100%"
  <h1 id="build-heading" style="color: rgba(160,220,255,0.95); font-family: monospace; letter-spacing: 0.06em; margin: 0; text-align: center"
    "HSON BUILD DEMO"
  />
  <div style="color: orange; font-family: monospace; font-size: 1rem; line-height: 1.4; text-align: center"
    "<------ edit the HSON string..."
  />
  <hr style="height: 1px; width: 100%"/>
  <div style="display: grid; place-items: center"
    <div style="background-color: dodgerblue; border: 12px solid navy; box-sizing: border-box; height: 300px; position: relative; width: 300px"
      <div style="display: grid; inset: 0; place-items: center; position: absolute"
        <div style="color: navy; font-family: Comic Sans MS; font-size: 52px; letter-spacing: -0.04em; line-height: 0.6; text-align: left"
          <div "hs"/>
          <div "on"/>
        />
      />
      <div style="background: rgba(189,171,92,1); border-radius: 999px; bottom: 5px; color: navy; display: grid; font-family: monospace; font-size: 26px; height: 60px; left: 5px; place-items: center; position: absolute; transform: rotate(90deg); width: 60px"
        ":)"
      />
    />
  />
  <hr style="border: 0; border-top: 2px solid rgba(255,255,255,0.35); margin: 0; width: 100%"/>
  <div style="color: orange; font-family: monospace; font-size: 1rem; letter-spacing: 0.06em; text-align: center"
    "...change HTML in realtime"
  />
/>
`;function eh(e,t={}){const n=e.find.byId(ho);n&&n.removeSelf();const a=e.create.div().id.set(ho).classlist.set("build-root").css.setMany(Gf),i=(g,f)=>{const x=a.create.section().classlist.set(`build-pane build-pane--${g}`).css.setMany(gr),S=x.create.div().classlist.set("build-head").css.setMany(zf),T=S.create.div().classlist.set("build-title").text.set(f).css.setMany(Bf),M=S.create.div().classlist.set("build-spacer").css.setMany(Uf),O=x.create.div().classlist.set("build-body").css.setMany(Hf);return{panel:x,head:S,body:O,title:T,spacer:M}},s=i("src","HSON"),o=i("out","OUTPUT"),r=s.head.create.div().classlist.set("build-btn build-btn--clear").text.set("clear").css.setMany(mo).setAttrs({role:"button",tabindex:"0","aria-label":"clear input"}),l=s.head.create.div().classlist.set("build-btn build-btn--copy").text.set("copy").css.setMany(mo).setAttrs({role:"button",tabindex:"0","aria-label":"copy input"}),c=s.body.create.div().classlist.set("build-textwrap").css.setMany(po),p=c.create.div().classlist.set("build-watermark build-watermark--fmt").text.set("HSON").css.setMany(Jf),u=c.create.div().classlist.set("build-status").text.set("").css.setMany(Vf),b=c.create.textarea().classlist.set("build-textarea").data.set("input","hson").css.setMany(qf),h=t.seed??Zf;b.setFormValue(h,{silent:!0});const d=o.head.create.div().classlist.set("build-toggle").css.setMany(Kf),m=d.create.div().classlist.set("build-tab build-tab--render").data.set("tab","render").text.set("render").css.setMany({...fo,...Xf}).setAttrs({role:"button",tabindex:"0","aria-label":"show render preview"}),v=d.create.div().classlist.set("build-tab build-tab--html").data.set("tab","html").text.set("html").css.setMany(fo).setAttrs({role:"button",tabindex:"0","aria-label":"show html output"}),w=o.body.create.div().classlist.set("build-outwrap").css.setMany(po),k=w.create.div().classlist.set("build-previewHost").css.setMany(Qf),y=w.create.textarea().classlist.set("build-htmlBox").data.set("output","html").css.setMany(Yf);return y.css.setMany({display:"none"}),ne.data({root:a,src:s,out:o,tabs:{render:m,html:v},input:{wrap:c,textarea:b,wmFmt:p,status:u,copyBtn:l,clearBtn:r},output:{wrap:w,previewHost:k,htmlBox:y}})}function th(e){const t=He(eh(e));return nh(t),ne.data(t)}function nh(e){let t=!1,n="render",a=!1;const i=()=>e.input.textarea.getFormValue()??"",s=c=>{e.input.textarea.setFormValue(c,{silent:!0})},o=c=>{if(c==="idle"){e.input.status.text.set(""),e.input.status.css.setMany({opacity:"0"});return}if(c==="typing"){e.input.status.text.set("..."),e.input.status.css.setMany({opacity:"1"});return}if(c==="valid"){e.input.status.text.set("valid"),e.input.status.css.setMany({opacity:"1"});return}e.input.status.text.set("invalid"),e.input.status.css.setMany({opacity:"1"})},r=()=>{const c=n==="render";e.output.previewHost.css.setMany({display:c?"block":"none"}),e.output.htmlBox.css.setMany({display:c?"none":"block"}),e.tabs.render.setAttrs("data-active",String(c)),e.tabs.html.setAttrs("data-active",String(!c))},l=c=>{const u=c.trim().length===0;if(o(a?u?"invalid":"typing":"idle"),!u)try{const b=be.fromHson(c),h=b.toHtml().serialize(),d=b.liveTree.asBranch();e.output.previewHost.empty(),e.output.previewHost.append(d),e.output.htmlBox.text.set(h),o("valid")}catch{o("invalid")}};e.tabs.render.listen.onClick(()=>{n="render",r()}),e.tabs.html.listen.onClick(()=>{n="html",r()}),e.input.textarea.listen.onInput(()=>{if(!t){t=!0;try{a=!0,l(i())}finally{t=!1}}}),e.input.clearBtn.listen.onClick(()=>{a=!1,s(""),e.output.previewHost.empty(),e.output.htmlBox.text.set(""),o("idle")}),e.input.copyBtn.listen.onClick(()=>{const c=globalThis.navigator?.clipboard?.writeText;if(!c)return;const p=n==="html"?e.output.htmlBox.text.get()??"":i();c.call(navigator.clipboard,p)}),r(),l(i())}const go="about-root",ah={display:"grid",gridTemplateRows:"auto 1fr",gap:"10px",minHeight:"0",minWidth:"0",height:"100%"},ih={fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",letterSpacing:"0.08em",textTransform:"uppercase",opacity:"0.9"},sh={display:"grid",gridTemplateColumns:"20ch 1fr",gap:"10px",minHeight:"0",minWidth:"0"},oh={minHeight:"0",minWidth:"0",overflow:"auto",padding:"10px",borderRadius:"12px",background:"rgba(255,255,255,0.03)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)"},rh={minHeight:"0",minWidth:"0",overflow:"auto",padding:"12px 14px",borderRadius:"12px",background:"rgba(0,0,0,0.18)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)",maxWidth:"900ch"};function lh(e){const t=e.find.byId(go);t&&t.removeSelf();const n=e.create.div().id.set(go).css.setMany(ah),a=n.create.div().classlist.add("about-title").css.setMany(ih),i=n.create.div().classlist.add("about-row").css.setMany(sh),s=i.create.div().classlist.add("about-toc").css.setMany(oh),o=i.create.div().classlist.add("about-doc").css.setMany(rh);return ne.data({root:n,toc:s,doc:o,title:a})}const ch={display:"grid",gridTemplateColumns:"3ch 1fr",columnGap:"10px",alignItems:"start",minWidth:"0",maxWidth:"70ch"},dh={opacity:"0.85",color:qt.std,lineHeight:"1.55",textAlign:"right",userSelect:"none",whiteSpace:"pre"},uh={whiteSpace:"pre-wrap",lineHeight:"1.55",color:vn.easter,minWidth:"0"},ph={display:"grid",alignItems:"center",padding:"8px 10px",borderRadius:"10px",cursor:"pointer",userSelect:"none",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"12px",letterSpacing:"0.06em",background:"rgba(0,0,0,0.18)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)"},mh={background:"rgba(120,255,210,0.10)",boxShadow:"inset 0 0 0 1px rgba(120,255,210,0.22)"},fh={background:"rgba(0,0,0,0.18)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)"},hh={whiteSpace:"pre-wrap",lineHeight:"1.55",marginBottom:"10px",color:U.txtmain,textIndent:"4ch",maxWidth:"60ch"},gh={whiteSpace:"pre",overflowX:"hidden",padding:"12px 12px",background:U.backdeep,color:vn.candy,boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)",marginBottom:"12px",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"12px",lineHeight:"1.1",margin:"auto auto",letterSpacing:"0"},bh={whiteSpace:"pre-line",overflowX:"auto",padding:"10px 12px",background:U.backdeep,boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)",marginBottom:"12px",fontweight:300,fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:ze.sub,lineHeight:"1.75"};function yh(e,t){e.empty();const n=t.replace(/\r\n/g,`
`).split(`
`);let a=null,i=!1,s=[],o=[],r=[],l=!1,c=null,p=1;const u=v=>/^[\t ]+/.test(v),b=v=>{if(!l||r.length===0)return;const w=r[r.length-1]??"";r[r.length-1]=`${w}
${v.trim()}`},h=()=>{const v=o.join(" ").trim();if(o=[],!v)return;e.create.div().classlist.add("md-p").css.setMany(hh).text.set(v)},d=()=>{if(!l)return;const v=c??"ul",w=p,k=e.create.div().classlist.add(v==="ul"?"md-ul":"md-ol");k.css.setMany({display:"grid",gap:"6px",marginBottom:"10px",minWidth:"0"});for(let y=0;y<r.length;y++){const g=(r[y]??"").trim(),f=k.create.div().classlist.add("md-li");f.css.setMany(ch);const x=v==="ul"?"•":`${w+y})`;f.create.div().text.set(x).css.setMany(dh),f.create.div().text.set(g).css.setMany(uh)}r=[],l=!1,c=null,p=1},m=()=>{const v=s.slice();if(s=[],v.length===0)return;const w=(a??"").toLowerCase()==="hson",k=e.create.div().classlist.add("md-pre");w&&k.classlist.add("md-logo"),k.css.setMany(w?gh:bh);for(const y of v){const g=k.create.div();g.css.setMany({whiteSpace:"pre"});const f=/(.*?)(\/\/.*|#.*)$/.exec(y);if(f){const x=f[1]??"",S=f[2]??"";x.length>0&&g.create.span().text.set(x),g.create.span().classlist.add("md-comment").css.set.color(Ze.std).text.set(S)}else g.text.set(y)}a=null};for(const v of n){const w=v??"";if(w.trim().startsWith("```"))if(i){i=!1,m();continue}else{h(),d(),i=!0,a=w.trim().slice(3).trim()||null;continue}if(i){s.push(w);continue}const k=/^(#{1,4})\s+(.*)$/.exec(w);if(k){h(),d();const g=(k[1]??"#").length,f=(k[2]??"").trim(),x=e.create.div().classlist.add(`md-h${g}`);x.css.setMany({marginTop:g===1?"6px":"2rem",marginBottom:"8px",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",letterSpacing:"0.06em",textTransform:g===1?"uppercase":"none",fontSize:g===1?"24px":g===2?"19px":g===3?"15px":"12px",fontWeight:g===4?"900":"400"}),x.text.set(f);continue}if(w.trim().length===0){h(),d();continue}{const y=/^([*\-+•])\s+(.*)$/.exec(w),g=/^(\d+)\)\s+(.*)$/.exec(w);if(y){h(),(!l||c!=="ul")&&(d(),l=!0,c="ul",p=1),r.push((y[2]??"").trim());continue}if(g){h();const f=Number.parseInt(g[1]??"1",10),x=Number.isFinite(f)?f:1;(!l||c!=="ol")&&(d(),l=!0,c="ol",p=x),r.push((g[2]??"").trim());continue}if(l&&u(w)){b(w);continue}l&&d()}o.push(w.trim())}h(),d(),i&&m()}function wh(e,t){return e.find(n=>n.key===t)}function _h(e,t){const{docs:n}=t;let i=t.initialDocKey??n[0]?.key??"readme";const s=[];e.toc.empty();for(const r of n){const l=e.toc.create.div().classlist.add("about-doc-btn").data.set("doc-key",r.key).css.setMany(ph);l.text.set(r.title),l.listen.onClick(()=>o(r.key)),s.push({key:r.key,btn:l})}const o=r=>{const l=wh(n,r);if(l){i=r,e.title.text.set(l.title),yh(e.doc,l.body);for(const c of s)c.btn.css.setMany(c.key===i?mh:fh)}};o(i)}function kh(e,t){const n=He(lh(e));return _h({toc:n.toc,doc:n.doc,title:n.title},{docs:t}),ne.data(n)}const vh=`
### hson-live 2.0 / neutralica @ TERMINAL_GOTHIC · 11JAN2026

\`\`\`hson
               .x+=:.                                         ..    .       _                    
  .uef^"      z\`    ^%                                x .d88"    @88>    u                     
:d88E            .   <k        u.      u.    u.        5888R     %8P    88Nu.   u.             
\`888E          .@8Ned8"  ...ue888b   x@88k u@88c.      '888R      .    '88888.o888c      .u    
 888E .z8k   .@^%8888"   888R Y888r ^"8888""8888"       888R    .@88u   ^8888  8888   ud8888.  
 888E~?888L x88:  \`)8b.  888R I888>   8888  888R        888R   ''888E\`   8888  8888 :888'8888. 
 888E  888E 8888N=*8888  888R I888>   8888  888R        888R     888E    8888  8888 d888 '88%" 
 888E  888E  %8"    R88  888R I888>   8888  888R        888R     888E    8888  8888 8888.+"    
 888E  888E   @8Wou 9%  u8888cJ888    8888  888R  HHHH  888R     888E   .8888b.888P 8888L      
 888E  888E .888888P\`    "*888*P"    "*88*" 8888" PPPP .888B .   888&    ^Y8888*""  '8888c. .+ 
m888N= 888> \`   ^"F        'Y"         ""   'Y"        ^*888%    R888"     \`Y"       "88888%   
 \`Y"   888                                               "%       ""                   "YP'    
      J88"                                                                                        
      @%                                                                                            
    :"                      Hypertext Structured Object Notation 
                                          2.0.26                                                                                    
\`\`\`

# HSON: Hypertext Structured Object Notation


## overview
HSON is a glue format: a structural data representation capable of fully expressing both JSON and HTML within a single syntax.

JSON and HTML are fundamentally different domains--data versus markup--yet both are built from hierarchical, tree-structured relationships.

HSON explicitly models that shared structure, allowing JSON and HTML to be translated losslessly, deterministically, and reversibly into one another, preserving data integrity across any number of round-trip transformations.


## view ≡ state
hson-live extends this model into runtime with LiveTree, an extension that parses the DOM and makes it accessible and manipulable as a JS data structure. Markup values like attributes and text content may be directly manipulated in JS code like a state object; changing these values immediately updates the DOM.

With hson.liveTree, view is not a function of state: view *is* state.  Rather than synchronizing separate representations, they are simply projections of the same node graph. Immediate applications include include lightweight reactive UI, but the same guarantees apply to any HTML or JSON data.

## core
HSON is built around a single, explicit intermediate representation (IR), a node graph capable of representing:

* JSON objects and arrays
* HTML and SVG elements
* mixed markup content (text + elements)
* attributes, values, and ordering
* namespaced markup including XML and SVG

This representation is stable under repeated transformations. Serializing to another format and back does not degrade, reorder, or reinterpret the data. The result is a format that serves as both data and markup without collapsing one into the other or privileging either.

## hson.transform
hson.transform is a set of core transformers responsible for:

* parsing HTML, JSON, SVG, XML, and HSON strings into a shared HsonNode IR
* serializing the nodes from any supported format to any other
* performing repeated round-trip conversions without data loss or structural drift
* preserving mixed content, attributes, ordering, and unique node ids

This includes cases that are often lossy or ambiguous in conventional tooling, such as embedded markup in JSON, boolean attributes, void elements, or SVG namespace handling.

Using hson-live’s transformers, arbitrary HTML can be rendered as a valid JSON representation, manipulated via standard JS object methods, and re-rendered on the DOM in its new form. The inverse — treating structured data as markup to be rendered — works equally well. 

Joining two incompatible notations in a single unified format opens up new ways of creating the web. hson-live's LiveTree extension explores the possibilities this unlocks.



## hson.liveTree
LiveTree is an interface that projects live DOM elements from HsonNodes, using the HsonNode graph as the source of truth and updating the DOM when changes are made. LiveTree allows the DOM to be accessible and editable directly via JS (with a few other unexpected bonuses thrown in).

Rather than maintaining separate virtual ui and state model that must be kept in sync, LiveTree works by:

1) ingesting any existing HTMLElement within document.body (or <body> itself) and parsing it (and all nested content) to HsonNodes
2) re-emitting those nodes as HTML back into the DOM, structurally identical to the original
3) binding a fluent, typed API directly to the underlying node graph that updates the DOM in realtime

Attributes, text content, child nodes, CSS and styles, animations and keyframes, and events and listeners--all are accessible using ordinary JavaScript and TypeScript semantics.

 Once grafted onto document.body, changes to LiveTree's node graph are immediately reflected in the DOM. Complex documents can be created, transformed, and animated without relying on templates, reconciliation layers, or shadow DOM, and without any direct use of low-level DOM construction APIs or the complexity and heft of a framework.

\`\`\`ts
const tree = hson.queryBody()  // or \`.queryDom(/*selector*/)\`
      .liveTree()  
        // replace contents of document.body with identical LiveTree projection
      .graft()  

      // LiveTree extends many basic JS document methods
    const branchDiv = tree.create.div()  
        .setText('hello world'); 
        .css.set.backgroundColor("pink")
          // liveTree methods return \`this\`, enabling complex chained operations

      // liveTree's ListenerManager exposes event listeners and handling
    tree.listen           
          // event listener options are fully represented in liveTree's .listen toolchain 
        .once()           
          // listener teardown/cleanup occurs automatically on node removal
        .onClick(       
          branchDiv.setText('goodbye world') 
          // changes to the node graph are instantaneously expressed in the DOM
         ); 
\`\`\`


## LiveTree capabilities
LiveTree supports:

* creating, removing, and rearranging nodes and child nodes
* reading and writing attributes, text content, and tag names
* scoped CSS manipulation without Shadow DOM
* declarative animation control via CSS keyframes
* typed event listener management with automatic teardown
* SVG creation and animation
* deterministic cleanup of removed nodes

The API is intentionally conservative. It often mirrors established JavaScript document methods and avoids introducing abstractions that stray too far from familiar DOM APIs.

## first-class CSS
hson-live exposes CSS not as a string-based side channel, but as a typed surface that can be read, written, created, and reasoned about directly, all within JS/TS. Style rules, keyframes, custom properties, and scoped selectors are all constructed and managed programmatically in LiveTree, without sacrificing any of the expressiveness of native CSS.

LiveTree's CssManager uses each a node's "quantum unique ID" (quids) as its selector. Local CSS scoping emerges naturally fcrom this: Rules apply only on the node where they are defined, without requiring Shadow DOM boundaries, naming conventions, or build-time transformations. Cleanup is built-in: rules are automatically deleted from the <hson-_style> stylesheet on node removal. CSS remains CSS, but its lifetime, scope, and validity can be governed programmatically by LiveTree.

hson-live's CssManager, KeyframesManager, StyleManager, and (@)PropertyManager together enable typed style management, deterministic cleanup, dynamic rule composition, and animation systems that can be defined, sequenced, and controlled without fragile string concatenation.


## significance
Treating JSON and HTML as different representations of the same underlying structure removes a long-standing obstacle in web development. hson-live suggests a new paradigm of view and data alignment:

* state and view cannot diverge; there is only one data node structure of which they are both projections
* serialization is no longer an edge operation, but a core function
* reactive systems and interfaces requiring no reconciliation step
* DOM manipulation becomes authoritative and first-class rather than a side effect
* non-JS runtimes (including WASM) gain a clear, stable target for DOM-adjacent interaction


## status and safety
### HSON-LIVE IS EXPERIMENTAL - USE WITH CAUTION
The transformation core is stable, but the surrounding APIs are still evolving. The project is suitable for exploration, prototyping, and controlled environments. ***hson-live is not currently recommended for processing untrusted HTML or for security-critical production use.*** 


## installation
\`\`\`bash
npm install hson-live
\`\`\`


## build
hson-live is written in TypeScript.
\`\`\`ts
npm install
npx tsc
\`\`\`
Compiled output is written to dist/.


## demo
The HSON demo site demonstrates LiveTree in a deliberately minimal environment, without frameworks or any other dependencies.
<!-- demo url coming soon -->


## documentation
Detailed documentation of the HSON syntax, transformer behavior, and LiveTree API is available in /src/docs.
`,xh=`// hson-livetree-api.md

# hson.livetree
LiveTree API (Current)

Overview

LiveTree is a mutable handle to a single HsonNode.
It provides structured, opt-in access to DOM synchronization, styling, data, events, and traversal while remaining safe to use without a DOM (Node/test/runtime-agnostic).

A LiveTree always represents one node and operates relative to a host root.

⸻

Construction

constructor(input: HsonNode | LiveTree)

Creates a LiveTree handle.
*	If constructed from a HsonNode, the node becomes both the reference node and host root.
*	If constructed from another LiveTree, the new instance points at the same node and adopts the same host root.

⸻

Identity & Core Accessors

- node: HsonNode

Returns the resolved node.
Throws if the reference cannot be resolved.

- quid: string
Returns the node’s QUID (stable identity token).

- hostRootNode(): HsonNode
Returns the current host root node.

- adoptRoots(root: HsonNode): this
Replaces the host root and returns this.

⸻

DOM Access

- dom: LiveTreeDom
Returns the lazily-created DOM helper API for this node.
*	Cached per LiveTree
*	Created only on first access

- asDomElement(): Element | undefined
Returns the underlying DOM element if it exists.
Returns undefined if the node is not mounted or no DOM is available.

⸻

Tree Mutation

- append
Alias for append_branch.
Appends child node(s) to this node and mirrors to DOM when present.

- empty
Alias for empty_contents.
Removes all content from this node.

- removeChildren(): number
Removes all child nodes (ignores primitives).
Returns the number of nodes removed.

- removeSelf(): number
Removes this node from its parent.
Returns the number of nodes removed.

⸻

Querying

- find
Finds a single descendant node.
Provided by make_find_for(this).
Returns a LiveTree or undefined depending on method used.

- findAll
Finds multiple descendant nodes.
Returns a multi-selection object (TreeSelector) supporting iteration and broadcast APIs.

⸻

Creation Helpers

- create: LiveTreeCreateHelper
Fluent helper for creating and appending new nodes under this tree.

⸻

Styling

Inline Style (element-local)

- style: StyleSetter<LiveTree>
Returns the inline style setter for this node.
*	Lazily created
*	Applies styles via style="" semantics
*	Coexists with QUID-scoped CSS

⸻

QUID-Scoped CSS (stylesheet)

- css: CssHandle
Returns a cached QUID-scoped CSS handle.
*	Rules are written to a managed <style> element
*	Selectors use [_quid="…"]
*	Safe to call before DOM mount
*	Supports animations, keyframes, and @property

The handle exposes:
*	Style setter methods (setProp, setMany, remove, clear)
*	atProperty
*	keyframes
*	anim
*	Debug helpers (if enabled)

see: css-manager-api.md

⸻

Data Attributes

- data: DataManager

Manages data-* attributes.
*	Lazily created
*	Keeps node attrs and DOM dataset in sync
*	Supports single and multi-set operations

⸻

Attributes & Flags

- getAttr(name: string): Primitive | undefined

Returns an attribute value or undefined.

- removeAttr(name: string): LiveTree

Removes an attribute and returns this.

- setAttrs(...)

Overloads:

- setAttrs(name: string, value: string | boolean | null): LiveTree
- setAttrs(map: Record<string, string | boolean | null>): LiveTree
null removes the attribute
Returns this

- setFlags(...names: string[]): LiveTree
Sets boolean attributes (HTML flag semantics).

- removeFlags(...names: string[]): LiveTree
Clears boolean attributes.

⸻

Text & Form Helpers

- text(value: Primitive): LiveTree

Replaces node content with a primitive leaf.

getText(): string

Returns textual content.

setFormValue(value: string, opts?): LiveTree

Sets form-related value and mirrors to DOM/attrs.

Options:
*	silent?: boolean
*	strict?: boolean

getFormValue(): string

Returns current form value.

⸻

ID & Class APIs

id: IdApi

Cached helper for the id attribute.

get(): string | undefined
set(id: string): LiveTree
clear(): LiveTree


⸻

classlist: ClassApi

Cached helper for the class attribute.

get(): string | undefined
has(name: string): boolean
set(cls: string | string[]): LiveTree
add(...names: string[]): LiveTree
remove(...names: string[]): LiveTree
toggle(name: string, force?): LiveTree
clear(): LiveTree


⸻

DOM Event Listeners

listen: ListenerBuilder

Fluent, typed DOM event registration.
*	Supports mouse, pointer, keyboard, focus, animation, transition, clipboard, custom events
*	Supports options (once, passive, capture, etc.)
*	Returns detachable listener handles

⸻

Tree-Local Events

events: TreeEvents

Lightweight pub/sub system scoped to this LiveTree.

Typical surface:

on(type, handler): unsubscribe
once(type, handler): unsubscribe
emit(type, payload): void

Used for application-level signaling independent of DOM events.

⸻

Lifecycle Notes
*	All sub-APIs are lazy
*	DOM interaction is best-effort
*	Safe to use in Node / test environments
*	QUID-scoped CSS survives pre-mount usage

⸻
`,Sh=`// hson-transform-api.md

# hson-live 
## Transformater API

The hson object is the public transformation facade for HSON-LIVE.
It provides a fluent, deterministic pipeline for converting between:
*	HTML
*	JSON
*	HSON
*	Live DOM projection (LiveTree)

The API is deliberately linear and explicit. Every transformation follows the same four conceptual stages:
	1.	Select source format
	2.	Select output format
	3.	(Optionally: configure formatting or safety)
	4.	Select render method & render

This design avoids implicit behavior, hidden sanitization, and format-specific shortcuts.

⸻

## Conceptual Model

At the center of all transformations is a stable intermediate representation: HsonNode.

All supported formats—HTML, JSON, SVG, XML-like markup, and HSON itself—are parsed into this shared node graph. All outputs are derived from that graph.

No format is treated as canonical and no transformation path is privileged.

⸻

##  1. Choosing a Source

Every transformation begins by declaring the format of provided input.

This step is mandatory and establishes both parsing semantics and the security model.

### HTML Sources

\`\`\`ts
hson.fromUntrustedHtml(html: string)
\`\`\`
Use this for external, user-supplied, or otherwise untrusted HTML.
*	HTML is sanitized via DOMPurify
*	Unsafe elements and attributes are removed
*	The resulting node graph reflects the sanitized markup only

This is the default choice for:
*	CMS input
*	user content
*	third-party embeds
*	stored HTML of unknown provenance

⸻

\`\`\`
hson.fromTrustedHtml(html: string)
\`\`\`
Use this only for developer-authored or fully trusted HTML.
*	No sanitization is performed
*	SVG, scripts, and advanced markup are preserved
*	The resulting nodes faithfully represent the input

This path exists to avoid silently degrading internal documents.

⸻

### Data Sources
\`\`\`ts
hson.fromJson(value: JSONValue)
\`\`\`
Treats the input strictly as data.
*	No HTML semantics are assumed
*	No sanitization is applied
*	Object structure, arrays, primitives, and ordering are preserved

Optional (destructive) sanitation can be applied via the .sanitizeBEWARE() option. 

⸻

\`\`\`ts
hson.fromHson(hsonText: string)
\`\`\`
Parses HSON syntax strings into nodes.

⸻

\`\`\`ts
hson.fromNode(node: HsonNode)
\`\`\`
Accepts and validates an existing HsonNode graph.

Useful for:
*	programmatic node construction
*	intermediate transforms
*	advanced pipelines

⸻

### DOM Query Sources

To create LiveTree, hson-live queries the DOM and uses the selected node and all descendants as its target. The target and all elements it contains are parsed into a faithful representation of the existing DOM which is then projected to replace the original. 

\`\`\`ts
hson.queryDOM(selector: string)
\`\`\`
Selects an existing DOM subtree and parses it into nodes.

⸻

\`\`\`ts
hson.queryBody()
\`\`\`
A convenience wrapper for document.body.

These sources are typically used as entry points for LiveTree workflows.

⸻

## 2. Choosing an Output Representation

Every source method returns an output builder.

### HTML Output
\`\`\`ts
.toHtml()
\`\`\`
Prepares an HTML output pipeline.
*	Produces serialized HTML or parsed DOM
*	Honors formatting and sanitization options

⸻

### JSON Output
\`\`\`ts
.toJson()
\`\`\`
Produces structured JSON values derived from the node graph.
*	Ordering is preserved
*	Mixed content is represented explicitly
*	No implicit coercion or template flattening occurs

⸻

### HSON Output
\`\`\`ts
.toHson()
\`\`\`
Returns HSON’s pared syntax or underlying nodes, depending on finalization.

⸻

### LiveTree Output
\`\`\`ts
.liveTree()
\`\`\`
Creates a LiveTree projection of the node graph.

This path diverges slightly in finalization (see below).

⸻

### 3. Optional Configuration

After selecting an output, you may apply optional modifiers.

These affect serialization only, not the underlying node graph.

#### Formatting Controls

* .spaced()

Pretty-prints output for human readability.


* .noBreak()

Forces single-line output.


* .withOptions(options)

Applies fine-grained control over serialization behavior.

⸻

(The specific options depend on the output format and is minimally furnished for now.)

⸻

### Explicit Sanitization Escape Hatch
\`\`\`ts
.sanitizeBEWARE()
\`\`\`
Forces sanitization: this method exists for edge cases only.

Use cases:
*	JSON or HSON that may conceal HTML payloads
*	Legacy datasets of unknown provenance
*	Defensive re-sanitization before DOM emission

Important notes:
*	This may destroy non-HTML content
*	Applying it to JSON or HSON is allowed but lossy
*	It is intentionally named to discourage casual use

⸻

### 4. Finalizing the Transformation

The final step materializes the result.

### String Serialization
\`\`\`ts
.serialize()
\`\`\`
Returns a string:
*	HTML text
*	JSON text
*	HSON text

⸻

### Structured Output
\`\`\`ts
.parse()
\`\`\`
Returns structured data:
*	JSONValue
*	HsonNode

No stringification occurs. To avoid enabling XSS and UI injection, hson-live does not make available a 'mount to DOM' method. 

⸻

### LiveTree Finalization

\`\`\`ts
.asBranch()
\`\`\`
For .liveTree() outputs. Creates an unattached LiveTree instance without mutating the DOM.

⸻

\`\`\`ts
.graft()
\`\`\`
Replaces the original DOM subtree with LiveTree’s rendered clone.

This is a destructive operation by design and marks the transition to a managed LiveTree lifecycle.

⸻

### Security Model Summary

HTML sources are not interchangeable.

#### Method, Sanitized?, Intended Use
* fromUntrustedHtml, Yes, External / user content
* fromTrustedHtml, No, Developer-authored HTML
* fromJson, No, Data
* fromHson, No, Data
* fromNode, No, Internal graph
* queryDOM, No, Existing DOM

Sanitization is explicit, predictable, and opt-in outside HTML parsing.

⸻

### Design Notes
*	Transformations are deterministic
*	Round-trip conversions do not drift
*	No format is treated as canonical or 'true'
*	Serialization is not a special case—it is a first-class operation
*	The API favors explicit intent over convenience

`,Th='// css-manager-api.md\n\n# CSS APIs\n\nThis document covers the CssManager API (both QUID-scoped and global), differences between stylesheet-based CssManager vs the inline StyleManager, the shared StyleSetter surface, and KeyframesManager, AnimationManager, and (@)PropertyManager.\n\n---\n\n## StyleSetter\n\nStyleSetter is the shared fluent write surface used by `LiveTree.style` (StyleManager), `LiveTree.css` (CssManager), and `GlobalCss` rule handles. It is stateless: it normalizes keys and values, then delegates writes to a backend adapter.\n\n### Surface\n\n* `set` Proxy surface that returns all valid CSS properties (`tree.style.set.backgroundColor("red")`).\n* `set.var("--x", 10)` convenience setter for CSS variables.\n* `setProp(prop: string, value: string)` write one property.\n* `setMany(map)` write many properties in one call.\n* `remove(prop: string)` remove one property.\n* `clear()` clear all properties for the handle.\n \nMethods usually return `this`, enabling chaining with other LiveTree methods.\n\n\n### Key normalization\n\n* setMany accepts only camelCase.\n* `float` and `css-float` normalize to `cssFloat`.\n* Keys are normalized to canonical CSSOM form before being applied to the backend, which varies per caller.\n\n\n### Value normalization\n`CssValue` is `string | number | boolean | null | undefined | { value, unit? }`.\n\n* `null` or `undefined` means remove when used with `setProp`.\n* Strings are trimmed; numbers and booleans are stringified.\n* `{ value, unit }` renders as `${value}: ${unit}`.\n* `setMany` skips `null` and `undefined`\n\n### Pseudo blocks in `setMany()`\n`setMany` can write route pseudoelement rule blocks. As pseudo-elements are not accepted in inline style attributes, only managers with access to the hson-_style stylesheet element (CssManager & GlobalCss) can manipulate them.\nSupported keys are:\n`_hover`, `_active`, `_focus`, `_focusWithin`, `_disabled`, `_before`, `_after`.\n\nA pseudo block must be a plain object map of declarations, not a `{ value, unit }` object. Psuedoelements are only supported via get/setMany. \n\n#### Example:\n```ts\n// applies CSS rules scoped to tree\'s QUID via CssManager\ntree.css.setMany({\n  _hover: { \n    opacity: 1,\n    background: "orange" },\n});\n```\n\nthis appears in the style element as\n```ts\n[data-_quid="dbb9b6ce017707c9"]:hover{background:orange;opacity:1;}\n```\n\n---\n\n## CssManager\n\n`CssManager` owns QUID-scoped stylesheet rules. It stores rule maps in memory and renders a\nsingle `<style>` element in the current document:\n\n`<hson-_style id="css-manager"><style id="_hson">...</style></hson-_style>`\n\nEach QUID maps to a selector `[data-_quid="..."]`.\n\nUsing liveTree.css.setMany, CSS can be set locally, per-node.\n\n### Primary entry points\n\n* `LiveTree.css` returns a `CssHandle` bound to the node\'s QUID.\n* `CssManager.invoke()` returns the singleton manager.\n\nA `CssHandle` is `StyleSetter + get + atProperty + keyframes + anim`.\n\n( **In the near future, `.css` may only return `StyleSetter + get + atProperty`, and keyframes + animation would be under the `.anim` namespace** )\n\n### Setting CSS rules\n\nHandle surface:\n\n```ts\n// Single-QUID handle\ntree.css.set.backgroundColor("black");\ntree.css.setMany({ opacity: 0.5, "--phase": 1 });\ntree.css.remove("opacity");\ntree.css.clear();\n```\n\n#### Manager methods (typically internal):\n\n* `setForQuid(quid, propCanon, value)`\n* `setManyForQuid(quid, decls)`\n* `unsetForQuid(quid, propCanon)`\n* `clearQuid(quid)`\n* `clearAll()`\n* `getForQuid(quid, propCanon)` returns the last written value\n* `hasAnyRules(quid)` returns whether any rules exist\n\n### Read semantics\n\n`CssHandle.get.property(...)` reads the stored value, not computed style.\n\nFor multi-QUID handles, `get.property(...)` returns a consensus value:\n\n* If any QUID is missing the property, the result is `undefined`.\n* If values differ between QUIDs, the result is `undefined`.\n\n### Value and key behavior\n\n* Property keys are normalized to canonical CSSOM form when written.\n* At render time, canonical keys are emitted as CSS property names\n  (custom properties preserved, camelCase converted to kebab-case).\n* `setForQuid` treats empty strings as delete and `null` or `undefined` as delete.\n\n### Scheduling and rendering\n\n* Mutations mark the manager as changed.\n* In browsers, a single `requestAnimationFrame` flush batches updates.\n* In Node/test environments, writes flush immediately.\n* `syncNow()` forces an immediate flush if anything changed.\n* `renderCss()` returns the combined CSS text for inspection.\n* `debug_hardReset()` clears all CSS state and the managed style element.\n\n## Sub-managers\n\n* `atProperty` exposes the `@property` registration manager.\n* `keyframes` exposes the keyframes manager.\n* `animForQuids(...)` returns a `CssAnimHandle` wired to QUID scopes.\n* `CssHandle.anim` is a pre-wired animation handle for the bound QUIDs.\n\nAt some point in the future, animation and keyframes may both be relocated under the `liveTree.anim` namespace\n\n---\n\n### PropertyManager\n\nThe `atProperty` manager owns `@property` registrations. It is intended for declaring custom\nproperties with type, syntax, and inheritance metadata so animations and transitions can\ninterpolate correctly.\n\n#### Usage pattern:\n```ts\nconst css = tree.css;\ncss.atProperty\n  .set("--phase", { syntax: "<number>", inherits: false, initial: 0 })\n  .set("--speed", { syntax: "<number>", inherits: true, initial: 1 });\n```\n\n#### Behavior notes:\n* Writes are centralized in `CssManager`, not per-node.\n* Changes are rendered into the same managed `<style>` element.\n* You can treat registrations as global for the current document.\n\n---\n\n### KeyframesManager\n\nThe `.keyframes` manager owns named keyframe definitions.\n\n#### Usage pattern:\n\n```ts\nconst css = tree.css;\ncss.keyframes.set({\n  name: "fade",\n  steps: {\n    "0%": { opacity: 0 },\n    "100%": { opacity: 1 },\n  },\n});\n```\n\n#### Behavior notes:\n\n* Definitions are stored in memory and rendered into the managed stylesheet.\n* Updating a keyframe name replaces the prior definition.\n* The manager only writes the keyframe blocks; it does not start animations.\n\nAutomated teardown and cleanup of keyframes is planned but not begun.\n\n\n### AnimationManager\n\n`CssHandle.anim` and `CssManager.animForQuids(...)` return a `CssAnimHandle` bound to one\nor more QUIDs. It is a small control surface for applying, starting, or clearing animations\nagainst those targets.\n\n#### Typical usage:\n\n```ts\nconst anim = tree.css.anim;\nanim.begin({ name: "fade", duration: "300ms", easing: "ease-out" });\n```\n\n#### Behavior notes:\n\n* Animation writes flow through `CssManager` and are scoped to the QUID selector(s).\n* DOM element discovery for animation side effects uses the current document.\n\n---\n\n## Globals\n\nGlobal rules are selector-based (not QUID-scoped) and can be rendered into the same\nstylesheet when used through `CssManager.globals`.\n\nRecommended entry:\n\n```ts\nconst globals = CssManager.globals.invoke();\n```\n\nThis returns the `GlobalCss.api(...)` surface wired to notify `CssManager` on change.\n\n### GlobalCss API\n\n`globals` (or `GlobalCss.api(...)`) exposes:\n\n* `rule(ruleKey, selector)` returns a `GlobalRuleHandle`.\n* `sel(selector)` returns a rule handle with a stable key `sel:<selector>`.\n* `drop(ruleKey)` removes an entire rule.\n* `clearAll()`, `has(ruleKey)`, `list()`, `get(ruleKey)`, `renderAll()`.\n* `dispose()` unregisters the change listener (useful for tests).\n\n`GlobalRuleHandle` is a `StyleSetter` plus:\n\n* `ruleKey` and `selector`\n* `drop()` to remove the rule\n\nRules are rendered with deterministic property ordering. Empty rules are dropped.\n\nAutomated rule teardown & cleanup is on the roadmap but not begun. \n\n\n---\n\n\n## Pseudos in globals\n\n`setMany` supports the same pseudo block keys as `StyleSetter` and will create sibling rules\nlike `selector:hover` or `selector::before`.\n\nFor `::before` and `::after`, `GlobalCss` will default to `content: ""` if it is not provided.\n\n---\n\n### StyleManager Differences\n\n`LiveTree.style` uses the same `StyleSetter` surface but targets inline `style=""` on the element - `_attrs.style` on the HSON node.\n\nKey differences from `LiveTree.css`:\n\n* Inline only. Does not touch QUID-scoped rules or global rules.\n* No pseudo blocks. `_hover` or `_before` maps in `style.setMany` are ignored.\n* The `set` proxy is constrained by runtime keys. In browser runtimes it uses\n  `document.documentElement.style` for the key list; in Node/tests it falls back to a small,\n  fixed list.\n* `style.get.*` reads from the serialized inline style attribute, not computed style.\n  It will not reflect rules set through `CssManager` or `GlobalCss`.\n',Ah=`// hson-spec-0-syntax.md

# HSON Spec
# 0 - Serialized Syntax

This section describes the serialized textual form of HSON: the string format produced when a HsonNode graph is serialized to HSON, and the format accepted by the HSON parser.

HSON is an HTML-like syntax designed to serialize either JSON-derived or HTML-derived node graphs without introducing format-specific scaffolding. It is not HTML, though it resembles a pared-down dialect of it.

⸻
## 1. Basic Form

HSON is a tree of nodes. Each node has:

- a tag name  
- optional attributes  
- optional child content  

Every serialized HSON document corresponds 1:1 to a node graph. A HsonNode’s _tag and _content properties directly represent the serialized structure. 

### Canonical Form
\`\`\`
<tag attrs? flags?
  "…content"?
>
\`\`\`
Unlike HTML or XML, tag names appear only once. All attributes and content are contained within that single construct. There is no separate closing tag.

Nodes are terminated by one of two explicit closers. The chosen closer encodes the structural model (see below). There is no 'implicit' closure.

---

## 2. Node Closure Rules

HSON's two closure symbols are structural markers that carry strict meaning.

### 2.1 \`_elem\` nodes (\`/>\`)

Nodes sourced from html elements terminate with \`/>\`. 

### 2.2 \`_obj\` nodes (\`>\`)
Nodes sourced from JSON terminate with \`>\`. This includes arrays (see below). The use of angle brackets in HSON closely tracks the use of curly braces in JSON. 


A single serialized HSON string must use one model consistently. Mixing \`/>\` and \`>\` within the same document is invalid and will throw.

---

## 3. Primitive Content and Inline Form

If a node contains either attributes XOR one primitive value it uses the inline closure form:

\`\`\`
<tag primitive/>
<tag primitive>
\`\`\`
A space before the closure (\`<tag primitive />\`) is also valid)

Examples:
HTML:
\`\`\`
<title "On Trees and Structure"/>
<section id="hson-spec-1-syntax"/>
<generator disabled/>
\`\`\`

JSON:
\`\`\`
<author "neutralica">
<views 18342>
<updated null>
\`\`\`

#### Rules:
*	A node may contain at most one primitive value to close inline.
*	It may not contain both attributes and inline primitive content.
*	It may not contain a child node.

If a node contains:
*	child nodes,
*	multiple primitives,
*	or both attributes and primitive content,

then its content must be serialized on subsequent lines and the closer must appear on its own line, similar to a JSON object.

#### HTML:
\`\`\`
<title
  <h1 "overview"/>
  <div
    <button id="weird-button"
      "press me"
    />
  />
/>
\`\`\`

#### JSON:
\`\`\`
<user
  <name "bo">
  <age "32">
  <children
    <name "mo">
    <name "jo">
  >
>
\`\`\`


## HsonNode IR Representation

Internally, in the HsonNode graph:
- Primitive values are always wrapped in \`_str\` or \`_val\` leaf nodes.
- Other nodes never store raw primitives directly.
- HTML has no native type information. When serializing JSON values to HTML, numbers, booleans, or null are wrapped in \`<_val>\` tags to maintain their types.
- A \`_val\` node explicitly signals that its content should be parsed. If a number, boolean, or \`null\` is not wrapped in \`<_val>\` in HTML it will reenter the node graph as a string .


## HSON Serialization Rules

HSON's syntax is designed to express both HTML and JSON without requiring structural hints like leaf nodes. _str or _val nodes (or any other underscored structural node like _elem, _obj, _arr) will never appear in serialized HSON.

Within the serialized HSON:
- String content must always be quoted.
- Numbers, booleans, and \`null\` are always unquoted.

* “name”   → string
* 42       → number
* “42”     → string
* true     → boolean
* “false”  → string
* null     → null
* “null”   → string


---

## 4. Children

A node’s \`_content\` property consists of ordered child nodes, which may be:

- standard container nodes, or
- primitive leaf nodes (\`<_str>\` / \`<_val>\`)

\`\`\`
<p
  "JSON and"
  <em "HTML"/>
  "are often treated as opposites."
/>
\`\`\`

Content order is preserved when parsing HSON. Text and nested nodes coexist naturally, as they do in HTML: text is simply a primitive leaf node within the tree.


## 5. Attributes

Attributes appear inside the opening tag, before content. When attributes and content are both present, the node introduces the content on a newline, to maintain clear visual separation. When only attributes or primitive content is present on a node, it is serialized as a single line

\`\`\`
<article id="post-042" class="entry featured"
  ...
>
\`\`\`

#### Attributes:
*	are HTML-derived metadata, not content
  *	are stored in the _attrs property, not in _content
*	are not ordered semantically
*	are serialized in HSON tags as \`foo="bar"\`

Attributes never appear as child nodes.


## Flags (Boolean Attributes)

Flags are boolean attributes whose presence implies \`true\`.

#### HTML:
\`\`\`
<details disabled>
  ...
</details>
\`\`\`

#### HSON:
\`\`\`
<details disabled
  ...
/>
\`\`\`

Internally, flags are stored in XML form, \`key="key"\`:
\`\`\`
{
  _attrs: {
    disabled: disabled
  }
}
\`\`\`

Like attributes--which they are--flags are not child nodes and never appear in _content.

⸻

## 6. Arrays (« » syntax)

HSON provides a compact array literal syntax.
\`\`\`
<tags
  «
    "hson",
    "json",
    "html",
    "structure"
  »
>
\`\`\`

This is equivalent to an internal _arr node with _iindexed children.
HSON parsers accept brackets as array delimiters provided the closer is consistent. If reserialized, all arrays use guillemet delimiters regardless of input symbol. 

#### Notes:
*	« » is purely a serialization convenience and minor visual flourish
*	internally, arrays are still represented structurally via VSNs
*	array order is preserved through the use of internal _ii nodes
*	array items may be primitives or full nodes, and may be mixed
*	newline separation of array items is not required

Nested arrays and objects within arrays are permitted exactly as with JSON. Arrays are represented in HSON's node graph as \`_arr\` tags.

⸻

## 7. Objects as Nodes

When serializing JSON-derived data to HSON, object properties are represented as named child nodes.

#### JSON:
\`\`\`ts
{
  "author": {
    "handle": "Neutralica",
    "org": "@terminal_gothic",
    "roles": [
      "author",
      "maintainer"
    ]
  }
}
\`\`\`

#### HSON:
\`\`\`
<author
  <handle "Neutralica">
  <org "@terminal_gothic">
  <roles
    «
      "author",
      "maintainer"
    »
 >
>
\`\`\`

hson-lives's HSON parser accepts arrays with or without newline separators; arrays in HSON are reserialized with newlines. Like JSON, commas are required between items.
⸻

## 8. Structural Nodes and VSNs

Some nodes exist solely to preserve structure across formats. These are Virtual Structural Nodes (VSNs).

#### Common examples:
*	_obj — object container
*	_arr — array container
*	_ii  — array item
*	_str — string primitive
*	_val — non-string primitive

#### VSNs:
*	are always structural
*	always close with>
*	never use/>
*	are required when serializing HTML or JSON into the other format
*	are unnecessary in HSON serialization: syntax expresses structure

VSNs are required when serializing HTML into JSON or vice-versa. The HSON syntax expresses either format cleanly without VSN clutter.

⸻

## 9. Identity (data-_quid)

Nodes may carry a stable identity token called a \`quantum unique ID\` (quid):
\`\`\`
<p data-_quid="Q7f3c"
  "Hello"
>
\`\`\`

quids are an internal identity marker. They function as a query term to locate a node that has been moved or mutated and enable reliable referencing of nodes and their assignment to JS variables. 

quids are stored in a node's _meta property and may or may not be serialized depending on context or options. quids are serialized as a data-attribute, \`data-_quid="..."\`.	they are not part of the semantic data model and	users rarely need to know about them or interact with them directly.

⸻

## 10. XML Correctness
HTML is ultimately parsed via XML and must be XML-valid to be accepted.
*	tags must be properly nested
*	attributes must be well-formed

This enforces a modicum of consistency and reliability in markup structure; it also sidesteps the unpredictable parsing rules of individual browsers.


⸻

## 11. What HSON is at the syntax level
*	HSON is not HTML
*	HSON is not JSON
*	HSON is a serialization of a unified node graph that can project cleanly to either

It exists to serialize HsonNode graphs without introducing format-specific scaffolding, not to replace HTML or JSON as external interchange formats.
`,Mh=`// hson-spec-1-nodes.md

# HSON Spec[1]
##Nodes, Structure, and Invariants

## 1. Overview

HSON is defined around a single structural intermediate representation (IR): the HsonNode graph.

All supported formats—JSON, HTML, SVG, XML, and HSON’s own surface syntax—are parsed into this representation before any transformation, rendering, or serialization occurs. All output formats are derived from this same representation.

The HsonNode graph is lossless, order-preserving, and round-trip stable. This section defines the structure, invariants, and semantics of that graph.

⸻

## 2. Fundamental Properties

An HsonNode graph must satisfy the following properties:

####  Tree-structured
The graph forms a rooted, ordered tree. Cycles are not permitted.

####  Order-preserving
The relative order of child nodes is significant and must be preserved across transformations.

####  Typed by role, not by syntax
Nodes encode semantic roles (element, object, array, value) independently of their source format.

####  Format-neutral
No node implicitly “belongs” to JSON, HTML, or any other surface syntax.

⸻

## 3. HsonNode Structure

An HsonNode is a structured object with the following conceptual components:

### 3.1 Required Fields

Every HsonNode must contain:

#### _tag
A string identifying the node’s role or semantic type.

#### _content: may be \`[]\` (empty)
An ordered list of child entries.
_content values may be:
*	other HsonNodes
*	primitive values (string, number, boolean, null) -- IF contained in the _content of a string or value node (see below)
*	HSON accepts all valid JSON values. Typed values (1 vs "1") are preserved via the use of <_str> and <_val> VSNs (see §4, below)

HSON's \`_tag:_content\` structure mirrors JSON's \`key:value\` pair and HTML's \`parent/child node\` relationships exactly. 

### 3.2 Optional Fields

HsonNodes may additionally contain two other properties:

#### _attrs
A map of HTML attributes and/or boolean attributes ("flags") to their primitive values.

#### _meta

Internal metadata used to preserve structural distinctions (e.g., array indexes, _quids: 'Quantum Unique IDs').

_meta is considered structural support data and not part of the node's semantic content.

⸻

## 4. Virtual Structural  Nodes (VSNs)

Certain _tag values are reserved to encode structure that does not correspond to a literal HTML tag or JSON key. These are referred to as Virtual Structural Nodes (VSNs). Specifically, HSON forbids all underscored tags in user data, reserving those for structure-preserving elements as described below:

### 4.1 Core VSN Tags

VSNs define and preserve the structural meaning of content in the node graph. The following VSN tags are normative:

#### <_elem>
Element: Represents an HTML Element 'cluster'.
*	<_elem> tags can contain multiple of the same key/_tag.

#### <_obj>
Object: Represents a JSON object 'cluster'.
*	encodes key–value pairs as child nodes.
*	child nodes must have unique key/_tags.

<_obj> and <_elem> are required for disambiguation of HsonNode 'clusters'. Though the shapes of <_elem> and <_obj> structures are very similar, each have differences that cause fatal errors in the other (such as JSON objects' requirement for unique keys, whereas HTML elements may contain multiple 'button' tags).

#### <_arr>
Array: Represents a JSON array.
*	must contain only <_ii>-wrapped children.
*	Order of items is preserved by <_ii> nodes' _meta.data-_index properties.

#### <_ii>
Index Item: Represents a single array item and carries the index number.
*	must appear only as a child of <_arr>.
*	must contain exactly one semantic value (primitive or node).
*	must have a '_meta.data-_index' property carrying the item's order in the array sequence

#### <_str>
String: Represents a string literal. Only <<_str>> tags may contain raw string primitives in its _content property.

#### <_val>
Value: Represents a non-string primitive literal (number, boolean, null). Only <_val> tags may contain raw non-string data in its _content property

#### <_root>
Root: Represents the base 'wrapper' node of a HSON tree undergoing transformation. 
*	To survive XML parsing, all HSON content must be contained within a single element
*	To ensure consistency, HSON's transformers wrap content under operation in a <_root> tag during processin. This tag is unwrapped on serialization or appending to other nodes and is usually not exposed publicly. 


### Note:
<_elem> tags, as well as _attrs properties, will only be derived from HTML sources of data. 
<_obj> tags, <_arr>/<_ii> tags will only be derived from JSON data. 

⸻

## 5. Primitive Values

Primitive values may only appear wrapped inside <_str> or <_val> nodes. Primitives appearing in the _content of other tags will cause an error in the HSON parser. HSON's transformer chain handles all creation of such nodes and they are effectively hidden from the user. 

#### Maxims:
*	Strings must be representable without loss of encoding.
*	Numbers must preserve numeric identity (no unintended stringification or coercion) across transforms.
*	Boolean and null values must also be preserved distinctly, rather than e.g. as strings.

⸻

## 6. HTML Attributes

Attributes are represented as data, not syntax.
*	Attribute ordering must be preserved where the source format defines ordering.
*	Boolean attributes must be representable distinctly from string-valued attributes.
*	Attribute names are case-sensitive unless the source format specifies otherwise.

Attribute ordering is canonicalized on first parsing for consistency. Attribute data is never coerced into _tag or _content values; it is always mapped within the _attrs/HsonAttrs propertry.

⸻

## 7. Mixed Content

Especially When derived from native HTML, HsonNode _content may contain a mix of HsonNodes and primitive values (typically strings) - these must always be contained within <_str> or <_val> tags, as noted above

Attempting this mixed content within a JSON could lead to creation of an invalid object with duplicated keys, or a keyless value like an array:
{a: "1", b: "2", "no key", d: "4"  }
Permitting and preserving this mixed structure in <_elem>, but not in <_obj> - even when that HTML element is parsed into JSON - is one of the main reasons for the existence of these VSN tags and allows faithful representation of:
*	HTML mixed content
*	text interleaved with elements
*	markup embedded within data structures

⸻

## 8. Identity and Stability

HSON nodes may carry a stable identity token, referred to as a QUID (Quantum Unique ID).

A QUID preserves the continuity of node identity across transformations and runtime projections. When present, it allows a node to be recognized as “the same thing” even if it is rebuilt, moved, or re-emitted in a different form.

QUIDs are optional and assigned lazily. Most transformations do not require it, but runtime systems such as LiveTree use QUIDs to support stable styling, event binding, and structural updates without reconciliation. They are created when a node is queried or created, so that the variable reference stays fresh even after redrawing of the LiveTree during mutation. 

QUIDs are properties for LiveTree's internal use and are contained within a node's \`_meta.data-_quid\` property. They may appear in metadata or DOM attributes during debugging or serialization, but users should not need to interact with them directly.
⸻

## 9. Invariants

The following invariants must always hold.
	
No transformation may:
*	collapse mixed content
*	reinterpret or coerce primitives
*	discard attributes without explicit instruction
	Serializing to another format and reparsing back into HsonNode IR must yield an equivalent node graph.

'Equivalent' here means:
*	identical structure
*	identical ordering
*	identical primitive values
*	identical semantic roles

⸻

## 10. Non-Goals

The HsonNode model intentionally does not attempt to:
*	enforce schemas
*	validate business rules
*	interpret semantics beyond structure
*	infer intent beyond the source data

Those concerns are explicitly layered above the node model.

⸻
`,Eh=`// hson-spec-2-json.md

# HSON Spec[2]
## JSON Representation in HSON

This section defines the normative mapping between JSON values and the HSON node graph.
It specifies how JSON structures are represented internally, independent of syntax, parser, or runtime projection.

This mapping enables a lossless, deterministic round-trip conversion between JSON and HTML via HSON.

⸻

## 2.1 Scope

This specification applies to:
*	JSON values as defined by ECMA-404:
*	object
*	array
*	string
*	number
*	boolean
*	null
*	Their representation within the HSON node graph
*	Serialization back to JSON without structural drift

This section does not describe HTML, markup syntax, or runtime behavior.

⸻

## 2.2 HSON Node Model (Summary)

All JSON values are represented using HsonNode structures and a fixed set of Virtual Structural Nodes (VSNs).

A HsonNode consists of:
*	a tag name (the "key")
*	an ordered list of child nodes (the "value")
*	optional metadata and attributes 

Primitive values never appear directly as children of arbitrary nodes.
They are always wrapped in explicit primitive VSNs.

⸻

## 2.3 JSON Object Mapping

A JSON object is represented as a node containing an <_obj> VSN. The position of the <_obj> tag roughly mirrors the position of the curly braces that would delimit the object in JSON, and are serialized to JSON as such.
Nodes other than 'cluster' VSNs - <_obj>, <_elem>, <_arr> -  may not contain multiple child nodes in their _content properties. Other than primitive-containing <_str> and <_val> tags, **every node's _content property is wrapped in its native cluster VSN**, even if the propery contains a single child node. 

Accurate preservation of cluster structure using these VSNs is a core requirement for HSON, as <_obj> and <_elem> shapes look similar but are fundamentally incompatible. 

#### Mapping rules
*	Each JSON object maps to exactly one <_obj> node.
*	Each property of the object is represented as a child node of <_obj>.
*	Property names are represented as node _tags.
*	Property values are represented as _content under their corresponding 'key' property node.

#### Conceptual Example:
\`\`\`
{
  "a": 1,
  "b": "x"
}
\`\`\`
maps to:
\`\`\`
<_obj>
 ├─ a
 │   └─ <_val>(1)
 └─ b
     └─<_str>("x")
\`\`\`
#### Notes
*	JSON object ordering is not semantically significant and is not interpreted as meaningful.
*	HSON canonicalizes JSON property order once at parsing.

⸻

## 2.4 JSON Array Mapping

A JSON array is represented as a node containing an <_arr> VSN. 

#### Mapping rules
*	Each array maps to exactly one <_arr> node.
*	Each element of the array is wrapped in an <_ii> (index item) node.
*	<_ii> nodes preserve array ordering by carrying the index number in _meta.data-_index.
*	Each <_ii> contains exactly one child representing the element value. <_ii> nodes may also contain <_arr> or <_obj> nodes

#### Example:
\`\`\`
[1, "x", true]
\`\`\`
maps to:
\`\`\`
<_arr>
 ├─ <_ii> → <_val>(1)
 ├─ <_ii> →<_str>("x")
 └─ <_ii> → <_val>(true)
\`\`\`

⸻

## 2.5 Primitive Value Mapping

Primitive values are represented using dedicated primitive VSNs.

#### Primitive VSNs
Primitive VSNs are the 'endpoint' for HsonNode graphs, containing the 'value' of the ordered pair. To preserve JSON's typed primitives when converted to untyped HTML, typed VSNs act as parser hints to dictate how to handle a given value.

* type -> VSN _tag
* string ->	<_str>
* number ->	<_val>
* boolean ->	<_val>
* null ->	<_val>

Rules
*	Primitive values must appear only within primitive nodes: <_str> or <_val>.
*	Primitive values may not appear directly as children of non-primitive nodes.
*	<_str> preserves string content verbatim.
*	<_val> preserves numeric, boolean, and null. It is a parser hint to coerce the node's string value to a typed primitive on reentry into JSON. 

⸻

## 2.6 Mixed and Nested Structures

JSON values may be nested arbitrarily.

The mapping rules above apply recursively:
*	Objects may contain arrays
*	Arrays may contain objects
*	Any structure depth is permitted

No information is discarded or reinterpreted during nesting.

⸻

## 2.7 Round-Trip Guarantees

Given a valid JSON value J:
1.	Parsing J into HsonNode IR
2.	Serializing the resulting node graph back to JSON

must produce a JSON value J′ such that:
*	J′ is structurally equivalent to J
*	All values are preserved exactly
*	No keys or values are added, removed, or coerced
*	If J′ is reparsed into HsonNodes again, the second node graph will be identical to the first

Whitespace, formatting, and source-level ordering are not part of this guarantee.

⸻

## 2.8 Canonicalization

HSON does not impose semantic meaning on:
*	object property order
*	formatting choices
*	source syntax

However, once parsed into the node graph:
*	the structure is explicit
*	value semantics are fixed
*	transformations are deterministic

This canonical form is the basis for HTML mapping, runtime projection, and reactive systems described in later sections.

⸻

## 2.9 Non-Goals

This mapping does not attempt to:
*	validate JSON schemas
*	infer types
*	enforce application-level constraints
*	interpret JSON as markup

It describes representation only.
`,Oh=`// hson-spec-3-html.md

# HSON Spec[3]
## HTML Representation in HSON

This section defines the normative mapping between HTML (and HTML-adjacent markup such as SVG/XML) and the HSON node graph.

Unlike JSON, HTML does not purely describe key-value pairs. It includes:
*	mixed content (elements and text interleaved),
*	attributes, a 'third layer' of user data,
*	void elements,
*	namespaces such as SVG,
*	ordering that is semantically meaningful.

The <_elem> VSN exists to preserve these properties when parsing HTML to JSON and back.

⸻

## 3.1 Scope

This specification applies to:
*	HTML and HTML-compatible markup (including SVG and XML-style elements)
*	Parsing from markup into HSON
*	Serializing HSON back into markup without loss

This section does not describe runtime projection, sanitization policy, or DOM APIs.

⸻

## 3.2 <_elem> as the Structural Boundary

All HTML content in HSON is represented within <_elem> VSN wrappers.

#### Rule
*	Except for primitive nodes, any node containing markup content must contain exactly one <_elem> VSN as its structural 'cluster' wrapper. <_elem> nodes, like <_obj> and <_arr> nodes, may contain any number of children (which is why they're described as 'clusters') 
*	No HTML element, text node, or attribute may exist outside an <_elem> context.

<_elem> establishes:
*	child ordering,
*	mixed content boundaries,
*	element nesting,
*	the distinction between data and markup semantics.

Without <_elem>, HTML cannot be represented faithfully; elements would be treated as objects and the mismatches between the two types (no duplicate keys/_tags in JSON; raw text content in HTML) would cause fatal runtime errors.

⸻

## 3.3 Element Mapping

Each HTML element maps to:
*	a node whose tag name is the element name
*	whose _content is wrapped within an <_elem>

Example:

\`\`\`
<p>Hello <em>world</em></p>
\`\`\`

maps to:

\`\`\`
<p>
 └─ <_elem>
     ├─<_str>("Hello ")
     ├─ em
     │   └─ <_elem>
     │       └─<_str>("world")
\`\`\`

#### Rules
*	Element names are preserved verbatim (case rules follow source semantics).
*	Nesting depth is preserved exactly.
*	Element ordering is preserved and semantically significant.

⸻

## 3.4 Text Nodes

Text nodes are represented using either <_str> or <_val> VSNs. Lacking types, HTML-native content is always parsed into <_str> tags. For JSON-native data, <_val> nodes exist as a parser hint to preserve types across transformations.

#### Rules
*	String text content must be wrapped in <_str>.
*	When parsing typed data from JSON, such as numbers, <_val> tags keep it separate and safe from stringification.
*	Text nodes may appear anywhere within <_elem> VSNs.
*	Whitespace is preserved as encountered by the parser.

Text is not normalized, merged, or reordered.

⸻

## 3.5 Attributes

Attributes are represented as data, not syntax.

#### Mapping
*	Attributes are stored on the node’s attribute map (*not* as children).
*	Attribute names and values are preserved exactly.
*	Boolean attributes are preserved explicitly.

Example:
\`\`\`
<input disabled value="x">
\`\`\`
maps to:
\`\`\`
input
 ├─ _attrs:
 │   ├─ disabled: true
 │   └─ value: "x"
 └─ <_elem>
\`\`\`
Notes
*	Attribute presence vs value is preserved.
*	Attribute ordering is not semantically significant after parsing.

⸻

## 3.6 Void Elements

Void elements (e.g. img, br, input) are represented as nodes with an empty <_elem>.

#### Rules
*	Void elements still contain <_elem>.
*	<_elem> is empty and must not contain children.
*	The voidness is inferred from tag semantics, not from structure.

This ensures uniform handling of all elements.

⸻

## 3.7 Mixed Content Guarantees

HTML allows arbitrary interleaving of text and elements.

HSON preserves this exactly by:
*	using <_elem> as an ordered container,
*	representing text (and all HTML-native textcontent) as <_str>,
*	representing typed primitives as <_val>,
*	representing elements as child nodes.

No flattening or normalization occurs.

⸻

## 3.8 Namespaces (SVG / XML)

Namespaced elements and attributes are preserved verbatim.

#### Rules
*	Namespaced tag names are preserved as-is.
*	Namespace prefixes are not stripped or inferred.
*	SVG and XML structures are treated identically to HTML at the structural level.

HSON does not reinterpret namespaces; it preserves them.

⸻

## 3.9 Round-Trip Guarantees

Given valid HTML H:
	1.	Parsing H into HsonNodes
	2.	Serializing the resulting node graph back to HTML

must produce markup H′ such that:
*	element structure is preserved
*	attribute presence and values are preserved
*	text content and ordering are preserved
*	mixed content boundaries are preserved
*	if reparsed again into HsonNodes, the node graph is identical to the first

Formatting differences (whitespace, quoting style) are not considered violations.

⸻

## 3.10 Relationship to JSON Mapping

HTML and JSON differ structurally:
*	JSON is value-oriented
*	HTML is content-oriented and ordered

HSON reconciles this by:
*	using <_obj> / <_arr> for JSON semantics
*	using <_elem> for markup semantics

These VSNs never overlap in responsibility.

A node representing HTML always uses <_elem>.
A node representing JSON structure never does.

####  Node graphs that mix _elem and _obj types are invalid and will cause parser errors. 

⸻

## 3.11 Non-Objectives

This mapping does not attempt to:
*	enforce HTML semantic validity or browser-specific correction rules
*	infer meaning or structure from tag names (non-VSN)
*	repair broken markup except to require XML well-formedness 
*	impose rendering rules
*	normalize authoring style

It describes representation only.
`,Wh=[{key:"readme",title:"README",body:vh},{key:"hson-syntax",title:"syntax",body:Ah},{key:"nodes",title:"nodes",body:Mh},{key:"json",title:"json",body:Eh},{key:"html",title:"html",body:Oh},{key:"transform",title:"transform",body:xh},{key:"livetree",title:"liveTree",body:Sh},{key:"hson-css",title:"css-manager",body:Th}],Nh=[["pos","pos"],["vel","vel"],["acc","acc"],["jerk","jerk"],["snap","snap"],["crackle","crackle"],["pop","pop"]],Ht=e=>String(Math.round(e)),Ch=e=>`${Ht(e.left)},${Ht(e.top)}  ${Ht(e.width)}×${Ht(e.height)}`,jh=e=>e instanceof HTMLElement?e.dataset?._quid??"":"";function Lh(e){let t=0,n=!0,a={x:0,y:0},i=!0;e.root.css.setMany({pointerEvents:"none"});const s=u=>{a={x:u.clientX,y:u.clientY},i=!0},o=()=>{const u=e.stage.asDomElement();if(!u)return{x:0,y:0};const b=u.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2}},r=u=>u*180/Math.PI;window.addEventListener("pointermove",s,{passive:!0});const l=e.readout.rows.length,c=()=>{const{x:u,y:b}=a;e.readout.xy.text.set(`x: ${Ht(u)}   y: ${Ht(b)}`);const h=o(),d=u-h.x,m=b-h.y,v=Math.atan2(m,d),w=r(v);e.readout.angle.text.set(`θ: ${w.toFixed(1)}°`),e.pointer.css.setMany({transform:`translate(0, -50%) rotate(${w}deg)`});const y=document.elementsFromPoint(u,b);for(let f=0;f<l;f++){const x=e.readout.rows[f],S=y[f];if(!x)continue;if(!S){x.ix.text.set(""),x.tag.text.set(""),x.quid.text.set("");continue}const T=S.tagName.toLowerCase(),M=S instanceof HTMLElement&&S.id?`#${S.id}`:"",O=S instanceof HTMLElement&&S.classList.length?"."+Array.from(S.classList).slice(0,2).join("."):"";S instanceof Element&&getComputedStyle(S),x.ix.text.set(String(f)),x.tag.text.set(`${T}${M}${O}`),x.quid.text.set(jh(S))}const g=y[0];if(g instanceof Element){const f=g.getBoundingClientRect();e.readout.angle.text.set(`θ: ${w.toFixed(1)}°   box: ${Ch(f)}`)}},p=()=>{n&&(i&&(i=!1,c()),t=requestAnimationFrame(p))};t=requestAnimationFrame(p),e.dispose=()=>{n=!1,cancelAnimationFrame(t),window.removeEventListener("pointermove",s)}}function Rh(e){try{const t=Ph(e);return Lh(t),ne.data(t)}catch(t){return ne.err(t instanceof Error?t.message:"unknown error")}}function Ph(e){const t=e.find.byId("mouse-panel-root");t&&t.removeSelf();const n={display:"grid",gridTemplateColumns:"3ch 22ch 1fr",columnGap:"12px",alignItems:"baseline",minWidth:"0"},a={fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",fontSize:"12px",letterSpacing:"0.06em"},i={minWidth:"0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},s=e.create.div().id.set("mouse-panel-root").classlist.add("mouse-panel").css.setMany({display:"grid",gridTemplateRows:"auto 1fr",gap:"10px",minWidth:"0",minHeight:"0",height:"100%",width:"500px"}),o=s.create.div().css.setMany({display:"grid",gridTemplateRows:"1fr 1fr",gap:"10px",alignItems:"center",minWidth:"0"}),r=o.create.div().classlist.add("mouse-xy").css.setMany({...a,whiteSpace:"pre"}).text.set("x: —   y: —"),l=o.create.div().classlist.add("mouse-angle").css.setMany({...a,opacity:"0.78",whiteSpace:"pre",justifySelf:"end"}).text.set("θ: —°"),c=s.create.div().css.setMany({display:"grid",gridTemplateColumns:"140px 1fr",gap:"12px",minWidth:"0",minHeight:"0",height:"100%"}),p=c.create.div().css.setMany({position:"relative",minWidth:"0",minHeight:"0",maxHeight:"140px",maxWidth:"140px",borderRadius:"999px",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.03)",overflow:"hidden"}),u=p.create.div().classlist.add("mouse-pointer").css.setMany({position:"absolute",left:"50%",top:"50%",width:"64px",height:"2px",background:"rgba(255,255,255,0.75)",transformOrigin:"0% 50%",transform:"translate(0, -50%) rotate(0deg)",boxShadow:"0 0 10px rgba(140,210,255,0.20)"});p.create.div().css.setMany({position:"absolute",left:"50%",top:"50%",width:"6px",height:"6px",borderRadius:"99px",background:"rgba(255,255,255,0.6)",transform:"translate(-50%, -50%)"});const b=c.create.div().classlist.add("mouse-stack").css.setMany({display:"grid",gridAutoRows:"auto",gap:"6px",minWidth:"0",minHeight:"0",alignContent:"start"}),h=[],d=b.create.div().classlist.add("mouse-stack-head").css.setMany({...n,...a,opacity:"0.7",letterSpacing:"0.04em"});d.create.div().text.set("#").css.setMany({...i,opacity:"0.7"}),d.create.div().text.set("element").css.setMany(i),d.create.div().text.set("_QUID").css.setMany(i);const m=(w,k)=>{const y=w.create.div();return y.css.setMany({...i,...k??{}}),y};for(let w=0;w<Nh.length;w++){const k=b.create.div().classlist.add("mouse-stack-row").css.setMany({...n,...a}),y=m(k,{opacity:"0.7"}),g=m(k),f=m(k,{opacity:"0.85"});h.push({ix:y,tag:g,quid:f})}return{root:s,stage:p,pointer:u,readout:{xy:r,angle:l,rows:h},dispose:()=>{}}}function $h(e){e.dead||(e.dead=!0,e.rise.css.anim.pause(),e.sway.css.anim.pause(),e.ink.css.anim.end("clear-all"),e.ink.css.anim.begin({name:"ink-die",duration:"6000ms",timingFunction:"ease-out",iterationCount:"1",fillMode:"forwards"}),e.fall.css.anim.begin({name:"wrap-die",duration:"6000ms",timingFunction:"ease-out",iterationCount:"1",fillMode:"forwards"}))}function Fh(e,t,n){const a=lt(e,"mote-wrap"),i=lt(a,"mote-rise");i.css.setMany({position:"absolute",top:"0px",left:`${n.xPx}px`,willChange:"transform",pointerEvents:"auto"});const s=lt(i,"mote-sway");s.css.setMany({willChange:"transform"});const o=lt(s,"mote-fall");o.css.setMany({willChange:"transform"});const r=o.create.span().classlist.add("mote-ink");return r.text.set(t),r.css.setMany({display:"inline-block",fontSize:`${n.sizePx}px`,opacity:String(n.opacity),color:n.color,filter:n.blurPx>0?`blur(${n.blurPx}px)`:"none",willChange:"transform, opacity, filter",userSelect:"none"}),i.css.anim.begin({name:"mote-rise",duration:`${n.riseMs}ms`,timingFunction:"linear",delay:`${n.riseDelayMs}ms`,iterationCount:"infinite"}),s.css.anim.begin({name:"mote-sway",duration:`${n.swayMs}ms`,timingFunction:"ease-in-out",delay:`${n.swayDelayMs}ms`,iterationCount:"infinite",direction:"alternate"}),r.css.anim.begin({name:n.spinDir==="cw"?"mote-spin-cw":"mote-spin-ccw",duration:`${n.spinMs}ms`,timingFunction:"linear",iterationCount:"infinite"}),{wrap:a,rise:i,sway:s,fall:o,ink:r,dead:!1}}const Dh=[{name:"mote-rise",steps:{"0%":{transform:"translateY(110vh)"},"100%":{transform:"translateY(-15vh)"}}},{name:"mote-sway",steps:{"0%":{transform:"translateX(-10px)"},"50%":{transform:"translateX(12px)"},"100%":{transform:"translateX(-8px)"}}},{name:"mote-spin-cw",steps:{"0%":{transform:"rotate(0deg)"},"100%":{transform:"rotate(360deg)"}}},{name:"mote-spin-ccw",steps:{"0%":{transform:"rotate(0deg)"},"100%":{transform:"rotate(-360deg)"}}},{name:"ink-die",steps:{"0%":{opacity:"1",filter:"blur(0px)"},"25%":{opacity:"0.9",filter:"grayscale(0.5)"},"100%":{opacity:"0",filter:"grayscale(1) brightness(0.25)"}}},{name:"wrap-die",steps:{"0%":{transform:"translateY(0px)"},"25%":{transform:"translateY(12px)"},"100%":{transform:"translateY(80px)"}}},{name:"ink-die",steps:{"25%":{filter:"grayscale(0.5)"},"100%":{opacity:"0",filter:"grayscale(1) brightness(0.25)"}}},{name:"wrap-die",steps:{"0%":{transform:"translateY(0px)"},"100%":{transform:"translateY(80px)"}}}],Ih=60,Gh=1e3/Ih,ya=(e,t)=>e+Math.random()*(t-e),wr=(e,t)=>Math.floor(ya(e,t+1));function Hh(e){if(e.length===0)throw new Error("pick(): empty array");return e[wr(0,e.length-1)]}const Ya=e=>ya(e[0],e[1]),cn=e=>wr(e[0],e[1]);function zh(e,t){const n=Math.random()<.5?"cw":"ccw";return{xPx:e,sizePx:Ya(t.sizePx),opacity:Ya(t.opacity),color:Hh(t.colors),blurPx:Ya(t.blurPx),riseMs:cn(t.riseDurMs),riseDelayMs:-cn(t.riseDurMs),swayMs:cn(t.swayDurMs),swayDelayMs:-cn(t.swayDurMs),spinMs:cn(t.spinDurMs),spinDir:n}}function Bh(e,t){let n=!1,a={x:0,y:0};const i=b=>{a={x:b.clientX,y:b.clientY}};window.addEventListener("pointermove",i,{passive:!0}),e.layer.css.keyframes.setMany(Dh);const s=[],o=(b,h)=>b*h/1e6,r=()=>{const b=window.innerWidth,h=window.innerHeight,d=Math.floor(t.densityPerKpx2*o(b,h));return Math.max(0,Math.min(t.maxMotes,d))},l=()=>{const b=window.innerWidth,h=window.innerHeight,d=ya(0,b),m=ya(0,h),v=zh(d,t),w=Fh(e.layer,t.char,v);w.wrap.css.set.top(`${m}px`),s.push({mote:w,baseX:d,alive:!0})},c=()=>{const b=r();let h=t.spawnBatch;for(;s.length<b&&h-- >0;)l()};let p=0;const u=()=>{if(n)return;c();const b=t.killRadiusPx,h=b*b;for(let d=0;d<s.length;d++){const m=s[d];if(!m||!m.alive)continue;const v=m.mote.wrap.asDomElement();if(!v)continue;const w=v.getBoundingClientRect(),k=w.left+w.width/2,y=w.top+w.height/2,g=k-a.x,f=y-a.y,x=g*g+f*f,S=y>a.y;if(t.killOnHit){const T=m.mote.ink.asDomElement();if(T){const M=T.getBoundingClientRect(),O=M.left+M.width/2,W=M.top+M.height/2,G=O-a.x,R=W-a.y,Z=G*G+R*R,I=t.killRadiusPx;if(Z<=I*I){m.alive=!1,$h(m.mote);continue}}}if(x<h&&(!t.repelOnlyBelowMouse||S)){const T=Math.max(1,Math.sqrt(x)),M=1-Math.min(1,T/b),W=(g===0?Math.random()<.5?-1:1:Math.sign(g))*(t.repelStrengthPx*M);m.mote.wrap.css.set.left(`${m.baseX+W}px`)}else m.mote.wrap.css.set.left(`${m.baseX}px`)}p=window.setTimeout(u,Gh)};return p=window.setTimeout(u,0),e.dispose=()=>{n=!0,window.removeEventListener("pointermove",i),window.clearTimeout(p),e.root.removeSelf()},ne.ok()}function Uh(e,t={}){try{const n=He(Jh(t)),a=He(qh(e,n));return Mr(Bh(a,n)),ne.data(a)}catch(n){return ne.err(n instanceof Error?n.message:"unknown error")}}function qh(e,t){const n=e.find.byId("motes2-root");n&&n.removeSelf();const a=e.create.div().id.set("motes2-root").classlist.add("motes2-root").css.setMany({position:"fixed",left:"0",top:"0",width:"100%",height:"100%",overflow:"hidden",zIndex:"0",pointerEvents:t.pointerEvents==="none"?"none":"auto"}),i=a.create.div().id.set("motes2-layer").classlist.add("motes2-layer").css.setMany({position:"absolute",inset:"0",overflow:"hidden",pointerEvents:"inherit"}),s=()=>{};return ne.data({root:a,layer:i,dispose:s})}function Jh(e){return ne.data({char:e.char??"*",colors:e.colors??["rgba(120, 255, 160, 0.85)"],sizePx:e.sizePx??[10,18],opacity:e.opacity??[.25,.9],blurPx:e.blurPx??[.3,1.6],densityPerKpx2:e.densityPerKpx2??38,maxMotes:e.maxMotes??820,spawnBatch:e.spawnBatch??12,riseDurMs:e.riseDurMs??[9e3,17e3],swayDurMs:e.swayDurMs??[5600,15200],spinDurMs:e.spinDurMs??[6e3,14e3],swayAmpPx:e.swayAmpPx??[10,60],spinTurns:e.spinTurns??[-.35,.35],repelRadiusPx:e.repelRadiusPx??90,repelStrengthPx:e.repelStrengthPx??28,killRadiusPx:e.killRadiusPx??10,repelOnlyBelowMouse:e.repelOnlyBelowMouse??!0,killOnHit:e.killOnHit??!0,pointerEvents:e.pointerEvents??"none"})}const Vn=e=>{e.classlist.add(yt)},Kn=e=>{e.classlist.remove(yt)};async function Vh(e){e.empty();const t=Ge.globals.invoke(),n=oe(e,Hn.demo).classlist.add(Hn.demo).css.setMany(Ip),a=oe(n,Hn.screen).classlist.add("demo screen").css.setMany(Gp),i=oe(a,Hn.screenFx).classlist.add("demo screen fx").css.setMany(Hp),s=oe(i,"menu-container").css.setMany(qp),o=oe(i,"motes").classlist.add("demo motes").css.setMany({position:"fixed",left:"0",top:"0",height:"100%",width:"100%",pointerEvents:"none"});Uh(o);const r=oe(s,"title-box").css.setMany(Bp),l=oe(r,"hson-headline").css.setMany(Up),c=oe(i,"ui-root").css.setMany(Zp),p=oe(c,"layout-grid").css.setMany(Jp),u=oe(s,"menu-box").css.setMany(zp),b={aboutBtn:Tt(u,`${Js}-button`,Js),testBtn:Tt(u,`${Hs}-button`,Hs),parseBtn:Tt(u,`${Gs}-button`,Gs),buildBtn:Tt(u,`${zs}-button`,zs),oklchBtn:Tt(u,`${Us}-button`,`${Us}`),mouseBtn:Tt(u,`${qs}-button`,`${qs}`),consoleBtn:Tt(u,`${Bs}-button`,`${Bs}`)};pp(b).forEach(O=>{b[O].css.setMany({...Fp,color:qt.candy})}),Rs.forEach(O=>{t.rule(`demo-${O}-shade`,`.${Is(O)}`).setMany({color:xu[O]})}),t.rule("hide-hidden",`.${yt}`).set.visibility("hidden");const[h,d,m,v]=Rs.map(O=>Ud(l,`${O}-letter`).text.set(Qd[O]).classlist.add(Is(O)).css.setMany(Dp)),w=oe(p,"view-slot").css.setMany(Vp),k=oe(p,"dock-slot").css.setMany(Kp),y=O=>{O.classlist.toggle(yt)},g=ln(w,"parse"),f=ln(w,"test"),x=ln(w,"build"),S=ln(w,"about"),T=ln(k,"mouse");He(kh(S.surface,Wh)),He(vf(f.surface)),He(Df(g.surface)),He(th(x.surface)),He(Rh(T.surface));const M=()=>{const O=Tf();Vn(g.panel),Vn(f.panel),Vn(x.panel),Vn(S.panel),O==="parse"?Kn(g.panel):O==="test"?Kn(f.panel):O==="build"?Kn(x.panel):O==="about"&&Kn(S.panel)};return Mf(()=>M()),M(),b.parseBtn.listen.onClick(()=>{Jn("parse")}),b.testBtn.listen.onClick(()=>{Jn("test")}),b.aboutBtn.listen.onClick(()=>{Jn("about")}),b.buildBtn.listen.onClick(()=>{Jn("build")}),b.mouseBtn.listen.onClick(()=>{y(T.panel)}),ne.ok()}const Za=()=>fp(Sa*.15);async function Kh(e){e.empty();const t=oe(e,"app").classlist.set("app").css.set.backgroundColor(U.bckgd),n=oe(t,"stage").classlist.add("stage").css.setMany(hp),{skip:a,cancel:i}=$p(n);try{{const o=qa(n,Wu,Za),r=await Promise.race([o,a]);i(),r==="skip"&&n.empty()}let s;{const o=qa(n,Rp,Za);await Promise.race([o,a])==="skip"&&n.empty()}{const o=qa(n,Vh,Za)}return ne.ok()}finally{i()}}function Xh(){const e=Rd();return Kh(e),!0}Xh();
