
const hsonTestsA = {
  a: `<img alt="x" style="
color: red; font-size: 10px
"/>`,
  1: `<figure
  <img alt="x" src="x.png"/>
/>`,
  c: `<img alt="x" style="color: red;
font-size: 10px
"/>`,
  2: `<figure
  <img alt="x" style="color: red; font-size: 10px"/>
/>`,
  3: `<figure
  <img alt="x" style="color: red;
  font-size: 10px
  "/>
/>`,
  4: `<figure
  <img alt="x" style="
  color: red; font-size: 10px"/>
/>`,
  5: `<figure
  <img alt="x" style="
  color: red;
  font-size: 10px"/>
/>`,
  6: `<figure
  <img alt="x" style="
  color: red;
  font-size: 10px
  "/>
  />`,
  bareWordInHeader: `<div hello/>`, // OK -- this is a flag
  quotedWordInHeader: `<div "hello"/>`, // OK, idiomatically
  strayTextAfter_attr: `<div id="x" hello/>`, // OK as well--a flag
  childBeforeHeaderClosed: `<div <span/>/>`, // OK -- accepted but normalized
  attrThen_childBeforeClose: `<div id="x" <span/>/>`, // OK -- accepted but normalized 
  spaceAfterOpenBeforeName: `< div/>`,
};

const hsonShouldFail: Record<string, string> = {
  // ----------------------------
  // bare structural garbage
  // ----------------------------
  
  justAngles: `><`,
  loneOpenAngle: `<`,
  loneCloseAngle: `>`,
  //   empty_tag_open: `<>`,
  emptyTagClose: `</>`,
  
  // ----------------------------
  // malformed tag names
  // ----------------------------
  
  missingTagName: `< />`,
  equalsAsTagName: `<=>`,
  quoteAsTagName: `<"x"/>`,
  
  // ----------------------------
  // bad attribute assignment
  // ----------------------------
  
  emptyAssignment: `<div id=/>`,
  emptyAssignment_spaced: `<div id= />`,
  doubleEquals: `<div id==\"x\"/>`,
  assignmentNoName: `<div =\"x\"/>`,
  assignmentNoValueThenAttr: `<div id= class=\"x\"/>`,
  
  // ----------------------------
  // bad quoting
  // ----------------------------
  
  singleQuotedText: `<div 'hi'/>`,
  singleQuotedAttr: `<div id='x'/>`,
  unclosedDoubleQuoteAttr: `<div id="x/>`,
  mismatchedQuotesAttr: `<div id="x'/>`,
  strayQuoteRun: `<div """"""/>`,
  
  // ----------------------------
  // stray text in tag header
  // ----------------------------
  
  contentThenSecondContent: `<div "a" "b"/>`, 
  
  // ----------------------------
  // malformed closing / self-close
  // ----------------------------
  
  splitSelfClose: `<div / >`, 
  badSelfClose: `<div //>`,
  extraCloseMarker: `<div />>`,
  extraOpenMarker: `<<div/>`,
  extraCloseAngleUnspaced: `<div/>>`,

  // ----------------------------
  // malformed nesting
  // ----------------------------

  htmlStyle: `
  <div 
  <span></span>
  />`,
  orphanChildClose: `</span>`,
  extraParentClose: `<div/></div>`,

  // ----------------------------
  // bad text/content placement
  // ----------------------------

  contentThenFlag: `<div "hi" disabled/>`,
  contentThenHeaderAttr: `<div "hi" id="x"/>`,

  // ----------------------------
  // newline/termination variants
  // ----------------------------

  newlineAfterEquals: `<div id=\n/>`,
  newlineInsideUnclosedQuote: `<div id="x\n/>`, 
};

const tricksyFlagsAttrs = {
  attrNameWithDigitst: `<div x000="111"/>`,
  flagNameWithDigits: `<div x000/>`,
  underscoreDigitFlag: `<div _000/>`,
  dataNumericSuffix: `<div data-000="111"/>`,
};

const tricksyAttrsINVALID = {
  numericEginLag: `<div 000/>`,
  numericEginTtr: `<div 000="111"/>`,
};







export const HSON_FIXTURES = {
  hson: hsonTestsA,
  attrsFlags: tricksyFlagsAttrs,
};

export const HSON_FXT_INVALID = {
  negative: hsonShouldFail,
  attrsFlags: tricksyAttrsINVALID
}
