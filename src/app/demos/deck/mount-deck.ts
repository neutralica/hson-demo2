// mount-deck.ts

import { LiveTree } from "hson-live";
import { _cols } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { øfontSize } from "../../core/consts/ui-consts";
import { ABOUT_P_TEXTcss, ABOUT_HEADERcss, ABOUT_LIST_ROWcss, ABOUT_LIST_MARKERcss, LIST_TEXTcss, FLUSH_LISTcss, MD_CODE_PREcss } from "../about/about.css";

export type MarkdownRenderOptions = Readonly<{
headingCss?: (level: 1 | 2 | 3 | 4) =>
Record<string, string>;
}>;

export type DeckBodyKind = "text" | "code" | "image";

export type DeckSlideBody = Readonly<
  | {
    kind: "text";
    text: string;
  }
  | {
    kind: "code";
    text: string;
    lang?: string;
  }
  | {
    kind: "image";
    src: string;
    alt?: string;
  }
>;

export type DeckSlideSection = Readonly<{
  heading: string;
  text?: string;
}>;

export type DeckSlideConfig = Readonly<{
  headerA?: string;
  headerB?: string;
  bodyA?: DeckSlideBody;
  bodyB?: DeckSlideBody;
  bodyC?: DeckSlideBody;
  sections?: readonly DeckSlideSection[];
  footer?: string;
}>;

export type DeckApi = Readonly<{
  root: LiveTree;
  open: () => void;
  close: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}>;

type DeckState = {
  isOpen: boolean;
  index: number;
  timerIds: number[];
};

const deckTransitionMs = 180;
const writeTickMs = 24;
const writeMinMs = 460;
const writeMaxMs = 980;
const writeNoise = "█▓▒░<>/\\{}[]()*&^%$#@!?:;~";

const deckHeaderBCss = {
  color: _cols.yellowlike,
  fontSize: "clamp(1.65rem, 2.8vw, 3rem)",
  lineHeight: "1.02",
  letterSpacing: "-0.025em",
  textShadow: `0 0 0.12rem ${_cols.yellowlike}`,
  // CHANGED: align secondary deck headers with the main slide header/body rail.
  justifySelf: "stretch",
  textAlign: "left",
  // CHANGED: separate headerB from the previous body while keeping its own
  // following body close enough to read as a unit.
  marginTop: "2.15rem",
  marginBottom: "0.25rem",
};

const deckHeaderBStackCss = {
  display: "grid",
  gap: "0.55rem",
  alignContent: "start",
  justifyContent: "stretch",
  gridTemplateColumns: "1fr",
  minHeight: "0",
};

const deckRootCss = {
  ...FONT_FAM_MONO,
  position: "absolute",
  inset: "0",
  zIndex: "95",
  display: "none",
  color: _cols.fade,
  // CHANGED: the deck root itself stays transparent so the hson/livedemo
  // lighthouse mark can remain visually distinct.
  background: "transparent",
};

const deckVeilCss = {
  position: "absolute",
  inset: "0",
  zIndex: "0",
  pointerEvents: "none",
  background: "color-mix(in oklch, black 34%, transparent)",
  backdropFilter: "blur(1.5px) brightness(0.78)",
  // CHANGED: leave the top-left logo area untouched while dimming/filtering
  // the menu, graffiti, motes, and the rest of the screen behind the deck.
  clipPath: "polygon(0 7.35rem, 12.75rem 7.35rem, 12.75rem 0, 100% 0, 100% 100%, 0 100%)",
};

const deckChromeCss = {
  position: "absolute",
  top: "0.85rem",
  right: "0.85rem",
  zIndex: "2",
  display: "flex",
  gap: "0.4rem",
  alignItems: "center",
  fontSize: øfontSize.smol,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: _cols.fade,
  opacity: "0.72",
};

const deckButtonCss = {
  border: `1px solid ${_cols.bluelike}`,
  background: "color-mix(in oklch, black 42%, transparent)",
  color: _cols.fade,
  padding: "0.25rem 0.45rem",
  cursor: "pointer",
  userSelect: "none",
};

const deckStageCss = {
  position: "absolute",
  inset: "0",
  display: "grid",
  placeItems: "center",
  zIndex: "1",
  // CHANGED: give the lighthouse mark breathing room and shift slide content
  // into the open stage area instead of starting under the logo/menu rail.
  padding: "5.75rem 6rem 4.25rem clamp(13.5rem, 14vw, 18rem)",
  boxSizing: "border-box",
  transition: `opacity ${deckTransitionMs}ms ease, transform ${deckTransitionMs}ms ease, filter ${deckTransitionMs}ms ease`,
};

const deckSlideCss = {
  width: "min(72rem, 100%)",
  minHeight: "min(38rem, 100%)",
  display: "grid",
  // CHANGED: keep the body directly under headerA instead of letting the middle
  // row absorb vertical space and visually behave like a large margin-bottom.
  gridTemplateRows: "auto auto auto",
  alignContent: "start",
  gap: "0.55rem",
  boxSizing: "border-box",
};

const deckHeaderCss = {
  color: _cols.yellowlike,
  fontSize: "clamp(2.1rem, 5vw, 5rem)",
  lineHeight: "0.95",
  letterSpacing: "-0.055em",
  textShadow: `0 0 0.18rem ${_cols.yellowlike}`,
  opacity: "0",
  transform: "translateY(-0.22rem)",
  transition: "opacity 220ms ease, transform 220ms ease, text-shadow 220ms ease",
};

const deckHeaderVisibleCss = {
  opacity: "1",
  transform: "translateY(0)",
};

const deckBodyGridCss = {
  display: "grid",
  gap: "1.25rem",
  alignContent: "start",
  minHeight: "0",
};

const deckBodyCss = {
  minWidth: "0",
  minHeight: "0",
  color: _cols.fade,
  fontSize: "clamp(1rem, 1.4vw, 1.38rem)",
  lineHeight: "1.42",
  whiteSpace: "pre-wrap",
  overflow: "hidden",
};

const deckSectionStackCss = {
  display: "grid",
  gap: "2.2rem",
  alignContent: "center",
  maxWidth: "48rem",
  justifySelf: "center",
};

const deckSectionCss = {
  display: "grid",
  gap: "0.55rem",
};

const deckSectionHeadingCss = {
  color: _cols.yellowlike,
  fontSize: "clamp(1.35rem, 2.15vw, 2rem)",
  lineHeight: "1.08",
  letterSpacing: "0.02em",
  textShadow: `0 0 0.1rem ${_cols.yellowlike}`,
};

const deckSectionTextCss = {
  ...deckBodyCss,
  fontSize: "clamp(0.95rem, 1.18vw, 1.18rem)",
  lineHeight: "1.38",
};

const deckCodeCss = {
  ...deckBodyCss,
  color: _cols.fmt.json,
  fontSize: "clamp(0.8rem, 1.1vw, 1.08rem)",
  lineHeight: "1.35",
  padding: "0.8rem 0 0 0",
};

const deckFooterCss = {
  color: _cols.fade,
  opacity: "0.56",
  fontSize: øfontSize.smol,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  position: "absolute",
  bottom: "3rem",
  left: "3rem"
};

const sampleSlides: readonly DeckSlideConfig[] = [
  {
    headerA: "HSON",
    bodyA: {
      kind: "text",
      text: "### Hypertext Structured Object Notation\na 'glue format' that unites JSON and HTML",
    },
    headerB: "hson-live",
    bodyB: {
      kind: "text",
      text: "### a typescript library containing:\n• hson.transform: a transformer set for converting data to and from JSON, HTML, and HSON\n• hson.liveTree: a responsive web authoring surface built on top of a HsonNode graph",
    },
    footer: "terminal gothic / hson-live",
  },
  {
    headerA: "about the author/why?",
    bodyA: {
      kind: "text",
      text: "- I am a bartender\n- I have no idea what I'm doing",
    },
    footer: "necessary disclosure",
  },
  {
    headerA: "v1 — hson.transform",
    bodyA: {
      kind: "text",
      text: "seven parsers and serializers that convert any json or xml-valid html to HsonNodes",
    },
    footer: "v1 / transform",
  },
  {
    headerA: "HSON syntax and relation",
    bodyA: {
      kind: "text",
      text: "```json\n// json sample data\n```\nkey:value",
    },
    bodyB: {
      kind: "text",
      text: "```hson\n// hson sample data\n```\ntag:content",
    },
    bodyC: {
      kind: "text",
      text: "```html\n// html sample data\n```\nparent:child",
    },
    footer: "json / hson / html",
  },
  {
    headerA: "HTML <=> HSON",
    bodyA: {
      kind: "code",
      lang: "html",
      text: "// html sample data",
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: "// hson sample data",
    },
    footer: "transform pair / html + hson",
  },
  {
    headerA: "JSON <=> HSON",
    bodyA: {
      kind: "code",
      lang: "json",
      text: "// json sample data",
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: "// hson sample data",
    },
    footer: "transform pair / json + hson",
  },
  {
    headerA: "JSON <=> HSON <=> HTML",
    bodyA: {
      kind: "code",
      lang: "json",
      text: "// json sample data",
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: "// hson sample data",
    },
    bodyC: {
      kind: "code",
      lang: "html",
      text: "// html sample data (derived from JSON)",
    },
    footer: "derived projection / json source",
  },
  {
    headerA: "HTML <=> HSON <=> JSON",
    bodyA: {
      kind: "code",
      lang: "html",
      text: "// html sample data",
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: "// hson sample data",
    },
    bodyC: {
      kind: "code",
      lang: "json",
      text: "// json sample data (html-derived)",
    },
    footer: "derived projection / html source",
  },
  {
    headerA: "v2 — hson.liveTree",
    bodyA: {
      kind: "text",
      text: "A web authoring platform built on top of the HsonNode graph, allowing a single source of truth for a united state and view",
    },
    footer: "v2.0 / livetree",
  },
  {
    headerA: "LiveTree - Internals",
    bodyA: {
      kind: "text",
      text: "1) parses <body> and all child nodes to HsonNodes (must be xml compatible)\n2) replaces it with identical HTML projection projected from HsonNode graph\n3) provides interface for node graph; changes and mutations are reflected in realtime on-DOM",
    },
    footer: "livetree internals",
  },
  {
    headerA: "LiveTree - example",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const tree = hson.queryBody() // or \`.queryDom(/*selector*/)\`
.liveTree // initialize LiveTree creation
.graft(); // replace document.body with identical LiveTree projection

  // LiveTree extends many basic JS document methods
const branchDiv = tree.create.div()
    .setText("hello world")
     // methods return \`this\`, enabling complex chained operations
    .css.set.backgroundColor("pink");

// liveTree's ListenerManager exposes event listeners and handling
tree.listen
   // listener teardown/cleanup occurs automatically on node removal
  .once()
   // event listener options are fully represented in liveTree's .listen toolchain
  .onClick(() => {
       // changes to the node graph are rendered to the DOM in realtime
      branchDiv.setText("goodbye world")
          .css.set.backgroundColor("blue");
});
`,
    },
    footer: "livetree graft example",
  },
  {
    headerA: "LiveTree",
    bodyA: {
      kind: "text",
      text: "features:\n- node creation/removal, always synced to DOM\n- dynamic, typed CSS using standard JS variables\n- event listener management & teardown\n- animation, keyframes, and @property management & sequencing\n- automated teardown (CSS, listeners, keyframes)\n- native SVG support: creation, mutation, and animation\n- native <canvas> support\n- getComputedStyle, getBoundingClientRect, elementAtPoint (from liveTree.dom)",
    },
    footer: "features / surface",
  },
  {
    headerA: "LiveTree - a new way of creating web content?",
    bodyA: {
      kind: "text",
      text: "rather than `ui = ƒ(state)`...\n### ui === state",
    },
    footer: "view === state",
  },
  {
    headerA: "LiveDemo",
    bodyA: {
      kind: "text",
      text: "explore working demos in the first site ever made entirely with hson-live",
    },
    bodyB: {
      kind: "text",
      text: "- full hson-live docs provided ([about]) as well as over 1000 transformer, livetree, and unit tests\n- demonstrates various LiveTree features and its potential for authoring complex interactive websites",
    },
    footer: "site / proof surface",
  },
  {
    headerA: "v3? LiveMap (WIP)",
    bodyA: {
      kind: "text",
      text: "fulfilling the other half of the promise",
    },
    bodyB: {
      kind: "text",
      text: "state management that automatically links to LiveTree, updating css and content by editing the underlying node graph that both link to\n\nETA: July 2026",
    },
    footer: "v3 / livemap",
  },
  {
    headerA: "and please remember: I have no idea what I'm doing",
    bodyA: {
      kind: "text",
      text: "(seriously what should I do with this)",
    },
    footer: "confession / question",
  },
  {
    headerA: "ty",
    bodyA: {
      kind: "text",
      text: "terminalgothic.com\nhansonpw@gmail.com\ngithub.com/neutralica/hson-live\ngithub.com/neutralica/hson-demo2",
    },
    footer: "contact / links",
  },
];

function clamp_index(index: number, slides: readonly DeckSlideConfig[]): number {
  if (slides.length === 0) return 0;
  return Math.max(0, Math.min(slides.length - 1, index));
}

function random_write_char(): string {
  const index = Math.floor(Math.random() * writeNoise.length);
  return writeNoise[index] ?? "*";
}

function clear_timers(state: DeckState): void {
  state.timerIds.forEach((timerId) => window.clearInterval(timerId));
  state.timerIds = [];
}

function write_in_text(state: DeckState, target: LiveTree, text: string, onComplete?: () => void): void {
  target.text.set("");
  const chars = [...text];
  const duration = Math.max(writeMinMs, Math.min(writeMaxMs, chars.length * 18));
  const started = performance.now();

  const timerId = window.setInterval(() => {
    const elapsed = performance.now() - started;
    const progress = Math.min(1, elapsed / duration);
    const settledCount = Math.floor(chars.length * progress);
    const noisyCount = Math.min(chars.length - settledCount, 10);
    const settled = chars.slice(0, settledCount).join("");
    const noisy = Array.from({ length: noisyCount }, () => random_write_char()).join("");

    target.text.set(settled + noisy);

    if (progress >= 1) {
      target.text.set(text);
      onComplete?.();
      window.clearInterval(timerId);
      state.timerIds = state.timerIds.filter((id) => id !== timerId);
    }
  }, writeTickMs);

  state.timerIds.push(timerId);
}

function slide_bodies(slide: DeckSlideConfig): readonly DeckSlideBody[] {
  return [slide.bodyA, slide.bodyB, slide.bodyC].filter((body): body is DeckSlideBody => body !== undefined);
}

function body_grid_columns(count: number): string {
  if (count <= 1) return "minmax(24rem, 48rem)";
  if (count === 2) return "1fr 1fr";
  return "1fr 1fr 1fr";
}

function body_markdown(body: Extract<DeckSlideBody, { kind: "text" | "code"; }>): string {
  if (body.kind === "code") {
    const lang = body.lang ?? "ts";
    return `\`\`\`${lang}\n${body.text}\n\`\`\``;
  }

  return body.text;
}

function deck_markdown_heading_css(level: 1 | 2 | 3 | 4): Record<string, string> {
  if (level !== 3) return {};

  // CHANGED: deck-local markdown subheads should read as subheads, not small
  // about-page labels.
  return {
    fontSize: "clamp(1.25rem, 1.9vw, 1.85rem)",
    lineHeight: "1.16",
    letterSpacing: "0.035em",
    opacity: "0.9",
    // CHANGED: deck subheads should bind tightly to the body they introduce.
    margin: "0 0 0.35rem 0",
    padding: "0",
  };
}

function deck_code_fence_css(lang: string | undefined): Record<string, string> {
  const normalized = (lang ?? "ts").toLowerCase();

  if (normalized === "json") {
    return {
      color: _cols.bluelike,
      boxShadow: `0 0 0.12rem ${_cols.bluelike}`,
    };
  }

  if (normalized === "hson") {
    return {
      color: _cols.yellowlike,
      boxShadow: `0 0 0.12rem ${_cols.yellowlike}`,
    };
  }

  if (normalized === "html") {
    return {
      color: _cols.pinklike,
      boxShadow: `0 0 0.12rem ${_cols.pinklike}`,
    };
  }

  return {};
}

function writing_shell_css(body: Extract<DeckSlideBody, { kind: "text" | "code"; }>) {
  if (body.kind === "code") {
    return {
      ...MD_CODE_PREcss,
      ...deck_code_fence_css(body.lang),
    };
  }

  return {
    ...ABOUT_P_TEXTcss,
    textIndent: "4ch",
  };
}

function writing_text(body: Extract<DeckSlideBody, { kind: "text" | "code"; }>, markdown: string): string {
  if (body.kind === "code") return body.text;
  return markdown;
}

// CHANGED: deck-local markdown mounting creates styled nodes first, then writes
// text into those nodes. This avoids raw markdown write-in followed by a
// separate parser/styling snap.
type DeckMarkdownBlock = Readonly<
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; lines: readonly string[] }
  | { kind: "code"; lang?: string; text: string }
>;

function is_deck_list_line(line: string): boolean {
  return /^\s*(?:[-*•]|\d+[.)])\s+/.test(line);
}

function parse_deck_markdown(markdown: string): readonly DeckMarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: DeckMarkdownBlock[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = (): void => {
    const text = para.map((line) => line.trim()).filter(Boolean).join("\n");
    para = [];
    if (text) blocks.push({ kind: "paragraph", text });
  };

  const flushList = (): void => {
    const lines = list.slice();
    list = [];
    if (lines.length > 0) blocks.push({ kind: "list", lines });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushPara();
      flushList();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;

      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }

      const text = codeLines.join("\n");
      // CHANGED: with exactOptionalPropertyTypes, omit `lang` entirely instead
      // of passing `undefined` to an optional property.
      blocks.push(lang ? { kind: "code", lang, text } : { kind: "code", text });
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      flushList();
      const marks = heading[1] ?? "#";
      const level = marks.length as 1 | 2 | 3 | 4;
      blocks.push({ kind: "heading", level, text: (heading[2] ?? "").trim() });
      continue;
    }

    if (trimmed.length === 0) {
      flushPara();
      flushList();
      continue;
    }

    if (is_deck_list_line(line)) {
      flushPara();
      list.push(line);
      continue;
    }

    if (list.length > 0 && /^\s+/.test(line)) {
      list[list.length - 1] = `${list[list.length - 1] ?? ""}\n${trimmed}`;
      continue;
    }

    flushList();
    para.push(line);
  }

  flushPara();
  flushList();
  return blocks;
}

function mount_deck_heading_block(state: DeckState, host: LiveTree, block: Extract<DeckMarkdownBlock, { kind: "heading" }>): void {
  const heading = host.create.div().css.setMany({
    ...ABOUT_HEADERcss(block.level),
    ...deck_markdown_heading_css(block.level),
  });
  write_in_text(state, heading, block.text);
}

function mount_deck_paragraph_block(state: DeckState, host: LiveTree, text: string): void {
  const paragraph = host.create.div().css.setMany(ABOUT_P_TEXTcss);

  for (const line of text.split("\n")) {
    const row = paragraph.create.div().css.setMany({ textIndent: "4ch" });
    write_in_text(state, row, line);
  }
}

function mount_deck_list_block(state: DeckState, host: LiveTree, lines: readonly string[]): void {
  const list = host.create.div().css.setMany(FLUSH_LISTcss);

  for (const line of lines) {
    const match = /^\s*([-*•]|\d+[.)])\s+([\s\S]*)$/.exec(line);
    const marker = match?.[1] ?? "•";
    const text = match?.[2] ?? line.trim();
    const row = list.create.div().css.setMany(ABOUT_LIST_ROWcss);

    row.create.span()
      .text.set(marker)
      .css.setMany({
        ...ABOUT_LIST_MARKERcss,
        marginLeft: "1rem",
      });

    const body = row.create.span().css.setMany(LIST_TEXTcss);
    for (const bodyLine of text.split("\n")) {
      const bodyRow = body.create.div();
      write_in_text(state, bodyRow, bodyLine);
    }
  }
}

function mount_deck_code_block(state: DeckState, host: LiveTree, block: Extract<DeckMarkdownBlock, { kind: "code" }>): void {
  const pre = host.create.div().css.setMany({
    ...MD_CODE_PREcss,
    ...deck_code_fence_css(block.lang),
    whiteSpace: "pre",
  });
  write_in_text(state, pre, block.text);
}

function mount_deck_markdown(state: DeckState, host: LiveTree, markdown: string): void {
  const blocks = parse_deck_markdown(markdown);
  host.empty();

  for (const block of blocks) {
    if (block.kind === "heading") {
      mount_deck_heading_block(state, host, block);
      continue;
    }

    if (block.kind === "paragraph") {
      mount_deck_paragraph_block(state, host, block.text);
      continue;
    }

    if (block.kind === "list") {
      mount_deck_list_block(state, host, block.lines);
      continue;
    }

    mount_deck_code_block(state, host, block);
  }
}

function mount_body(state: DeckState, host: LiveTree, body: DeckSlideBody): void {
  if (body.kind === "image") {
    host.create.img()
      .attr.setMany({ src: body.src, alt: body.alt ?? "" })
      .css.setMany({
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        opacity: "0.88",
      });
    return;
  }

  const bodyFrame = host.create.div().css.setMany(body.kind === "code" ? deckCodeCss : deckBodyCss);
  const markdown = body_markdown(body);

  // CHANGED: styling/layout now lands first; write-in fills already-styled nodes.
  mount_deck_markdown(state, bodyFrame, markdown);
}

function mount_header_b_stack(state: DeckState, host: LiveTree, slide: DeckSlideConfig): void {
  const stack = host.create.div().css.setMany(deckHeaderBStackCss);

  if (slide.bodyA) {
    const bodyAHost = stack.create.div().css.setMany({ minWidth: "0", minHeight: "0" });
    mount_body(state, bodyAHost, slide.bodyA);
  }

  stack.create.div()
    .text.set(slide.headerB ?? "")
    .css.setMany(deckHeaderBCss);

  if (slide.bodyB) {
    const bodyBHost = stack.create.div().css.setMany({ minWidth: "0", minHeight: "0" });
    mount_body(state, bodyBHost, slide.bodyB);
  }

  if (slide.bodyC) {
    const bodyCHost = stack.create.div().css.setMany({ minWidth: "0", minHeight: "0" });
    mount_body(state, bodyCHost, slide.bodyC);
  }
}

function mount_sections(state: DeckState, host: LiveTree, sections: readonly DeckSlideSection[]): void {
  const stack = host.create.div().css.setMany(deckSectionStackCss);

  for (const section of sections) {
    const sectionTree = stack.create.div().css.setMany(deckSectionCss);
    sectionTree.create.div()
      .text.set(section.heading)
      .css.setMany(deckSectionHeadingCss);

    if (!section.text) continue;

    const textTree = sectionTree.create.div().css.setMany(deckSectionTextCss);
    write_in_text(state, textTree, section.text);
  }
}

function mount_slide(state: DeckState, stage: LiveTree, slide: DeckSlideConfig): void {
  stage.empty();
  const slideTree = stage.create.div().css.setMany(deckSlideCss);
  const header = slideTree.create.div().css.setMany(deckHeaderCss);
  header.text.set(slide.headerA ?? "");

  window.setTimeout(() => header.css.setMany(deckHeaderVisibleCss), 30);

  const bodies = slide_bodies(slide);
  if (slide.headerB) {
    mount_header_b_stack(state, slideTree, slide);
  } else if (slide.sections && slide.sections.length > 0) {
    mount_sections(state, slideTree, slide.sections);
  } else if (bodies.length > 0) {
    const bodyGrid = slideTree.create.div().css.setMany({
      ...deckBodyGridCss,
      gridTemplateColumns: body_grid_columns(bodies.length),
      // CHANGED: single-body slides sit nearer the visual center; split/triple
      // slides still use the full available slide width.
      justifyContent: bodies.length <= 1 ? "center" : "stretch",
    });

    bodies.forEach((body) => {
      const bodyHost = bodyGrid.create.div().css.setMany({ minWidth: "0", minHeight: "0" });
      mount_body(state, bodyHost, body);
    });
  } else {
    // CHANGED: support title/heading-only slides without requiring dummy body text.
    slideTree.create.div();
  }

  slideTree.create.div()
    .text.set(slide.footer ?? "")
    .css.setMany(deckFooterCss);
}

export function mount_deck(host: LiveTree, slides: readonly DeckSlideConfig[] = sampleSlides): DeckApi {
  const state: DeckState = {
    isOpen: false,
    index: 0,
    timerIds: [],
  };

  const root = host.create.div().id.set("live-demo-deck").css.setMany(deckRootCss);
  root.create.div().css.setMany(deckVeilCss);
  const chrome = root.create.div().css.setMany(deckChromeCss);
  const stage = root.create.div().css.setMany(deckStageCss);
  const counter = chrome.create.div().text.set(`1 / ${slides.length}`);

  const prevButton = chrome.create.div().text.set("prev").css.setMany(deckButtonCss);
  const nextButton = chrome.create.div().text.set("next").css.setMany(deckButtonCss);
  const closeButton = chrome.create.div().text.set("close").css.setMany(deckButtonCss);

  const sync_counter = (): void => {
    counter.text.set(`${state.index + 1} / ${slides.length}`);
  };

  const render_current = (): void => {
    clear_timers(state);
    sync_counter();
    stage.css.setMany({ opacity: "0", transform: "translateY(0.8rem)", filter: "blur(2px)" });

    window.setTimeout(() => {
      mount_slide(state, stage, slides[state.index]! ?? slides[0]);
      requestAnimationFrame(() => {
        stage.css.setMany({ opacity: "1", transform: "translateY(0)", filter: "blur(0)" });
      });
    }, deckTransitionMs);
  };

  const open = (): void => {
    if (state.isOpen) return;
    state.isOpen = true;
    root.css.setMany({ display: "block" });
    render_current();
  };

  const close = (): void => {
    if (!state.isOpen) return;
    state.isOpen = false;
    clear_timers(state);
    root.css.setMany({ display: "none" });
  };

  const goTo = (index: number): void => {
    const nextIndex = clamp_index(index, slides);
    if (nextIndex === state.index && state.isOpen) return;
    state.index = nextIndex;
    if (state.isOpen) render_current();
  };

  const next = (): void => goTo(state.index + 1);
  const prev = (): void => goTo(state.index - 1);
  const toggle = (): void => {
    if (state.isOpen) close();
    else open();
  };

  prevButton.listen.stopProp().onClick(prev);
  nextButton.listen.stopProp().onClick(next);
  closeButton.listen.stopProp().onClick(close);

  root.listen.document.onKeyDown((ke) => {
    if (ke.key === "`" || ke.key === "~") {
      ke.preventDefault();
      toggle();
      return;
    }

    if (!state.isOpen) return;

    if (ke.key === "Escape") {
      ke.preventDefault();
      close();
      return;
    }

    if (ke.key === "ArrowRight" || ke.key === " ") {
      ke.preventDefault();
      next();
      return;
    }

    if (ke.key === "ArrowLeft") {
      ke.preventDefault();
      prev();
    }
  });

  return Object.freeze({ root, open, close, toggle, next, prev, goTo });
}