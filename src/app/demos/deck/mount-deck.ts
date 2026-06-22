// mount-deck.ts

import { LiveTree } from "hson-live";
import { _cols } from "../../core/consts/colors.consts";
import { ABOUT_P_TEXTcss, ABOUT_HEADERcss, ABOUT_LIST_ROWcss, ABOUT_LIST_MARKERcss, LIST_TEXTcss, FLUSH_LISTcss } from "../about/about.css";
import { set_alpha } from "../../core/helpers/color-helpers";
import { deckCodeStringCss, deckCodeKeywordCss, deckCodeMethodCss, deckCodeMutedCss, deckCodeCommentCss, deckCodeCss, deckBodyCss, deckHeaderBStackCss, deckHeaderBCss, deckSectionStackCss, deckSectionCss, deckSectionHeadingCss, deckSectionTextCss, deckSlideCss, deckHeaderCss, deckHeaderVisibleCss, deckBodyGridCss, deckFooterCss, deckRootCss, deckVeilCss, deckChromeCss, deckStageCss, deckButtonCss } from "./deck.css";
import { SLIDES } from "./deck-slides";
import { normalize_code_block_text, is_deck_list_line, body_grid_columns, body_markdown, clamp_index, clear_timers, deck_code_format_color, deck_code_watermark, deck_markdown_heading_css, is_formatted_data_lang, slide_bodies, write_in_text } from "./deck-helpers";
import type { DeckSlideConfig, DeckState, DeckSlideBody, DeckSlideSection, DeckApi } from "./deck.types";
import { deckCodeStringPattern, deckCodeKeywordPattern, deckCodePunctuationPattern, deckCodeTokenPattern } from "./deck.consts";
import { deckCodeSyntaxCss, deckCodeContentCss } from "./deck.css";
import type { CssMap } from "hson-live/types";
import { render_line_with_comment } from "../about/about-helpers";



export function deckTransitionMs(): number { return 180 };
export const writeTickMs = 24;
export const writeMinMs = 460;
export const writeMaxMs = 980;
export const writeNoise = "<>/\\{}[]()*&^%$#@!?:;~";

function deck_code_panel_css(lang: string | undefined, fillPanel: boolean): CssMap {
  const formatColor = deck_code_format_color(lang);

  return {
    position: "relative",
    minWidth: "0",
    minHeight: "0",
    height: fillPanel ? "100%" : "auto",
    maxHeight: fillPanel ? "100%" : "min(18rem, 42vh)",
    overflowX: "hidden",
    overflowY: "auto",
    boxSizing: "border-box",
    // CHANGED: this is the actual shell used by both solo code bodies and
    // fenced markdown code blocks, so panel padding belongs here.
    padding: "1rem 1rem",
    background: _cols.backlo,
    // CHANGED: restore format-aware body text color inside data/code panels.
    color: formatColor,
    border: `1px solid ${formatColor}`,
    boxShadow: "inset 0 0 15px 0.1px " + set_alpha(formatColor, 0.5),
    scrollbarWidth: "thin",

  };
}

function deck_code_token_css(token: string): Record<string, string> {
  if (deckCodeStringPattern.test(token)) return deckCodeStringCss;
  if (deckCodeKeywordPattern.test(token)) return deckCodeKeywordCss;
  if (token.startsWith(".")) return deckCodeMethodCss;
  if (deckCodePunctuationPattern.test(token)) return deckCodeMutedCss;
  return deckCodeSyntaxCss;
}

function deck_code_comment_index(line: string): number {
  let quote: "'" | "\"" | "`" | undefined;
  let escaped = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) quote = undefined;
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "/" && next === "/") return i;
  }

  return -1;
}

function mount_deck_code_span(state: DeckState, host: LiveTree, text: string, css: Record<string, string>): void {
  const span = host.create.span().css.setMany({
  ...css,
  lineHeight: "inherit",
  verticalAlign: "baseline",
});
  write_in_text(state, span, text);
}

function mount_deck_code_tokens(state: DeckState, host: LiveTree, code: string): void {
  const tokens = code.match(deckCodeTokenPattern) ?? [code];

  for (const token of tokens) {
    mount_deck_code_span(state, host, token, deck_code_token_css(token));
  }
}

function mount_deck_code_line(state: DeckState, host: LiveTree, line: string): void {
  const commentIndex = deck_code_comment_index(line);

  if (commentIndex < 0) {
    mount_deck_code_tokens(state, host, line);
    return;
  }

  const code = line.slice(0, commentIndex);
  const comment = line.slice(commentIndex);
  if (code) mount_deck_code_tokens(state, host, code);
  mount_deck_code_span(state, host, comment, deckCodeCommentCss);
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

type DeckMarkdownOptions = Readonly<{
  fillCodePanels: boolean;
}>;

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

      const text = normalize_code_block_text(codeLines);
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
  const paragraph = host.create.div().css.setMany({
    ...ABOUT_P_TEXTcss,
    // CHANGED: deck paragraphs need a little air between generated rows; the
    // imported about text style alone does not affect each row div.
    display: "grid",
    gap: "0.28rem",
    lineHeight: "1.28",
  });

  for (const line of text.split("\n")) {
    const row = paragraph.create.div().css.setMany({
      textIndent: "4ch",
      lineHeight: "1.28",
      minHeight: "1.28em",
    });
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

function mount_deck_code_block(
  state: DeckState,
  host: LiveTree,
  block: Extract<DeckMarkdownBlock, { kind: "code" }>,
  options: DeckMarkdownOptions,
): void {
  const panel = host.create.div().css.setMany(deck_code_panel_css(block.lang, options.fillCodePanels));

  const content = panel.create.div().css.setMany({
    ...deckCodeContentCss,
    // CHANGED: apply line-height at the final write-in target so formatted
    // data blocks and tokenized TS blocks share the same vertical rhythm.
  });

  if (is_formatted_data_lang(block.lang)) {
    write_in_text(state, content, block.text);
    return;
  }

  // CHANGED: ordinary code fences create their final row structure first, then
  // each row writes in and settles into syntax highlighting. This avoids the
  // whole code block jumping when one raw text node is replaced by many rows.
  for (const line of block.text.split("\n")) {
    const row = content.create.div().css.setMany({
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      lineHeight: "1.22",
      minHeight: "1.22em",
      overflow: "hidden",
    });
    // CHANGED: ordinary code styling now exists before write-in begins; comments
    // no longer snap into styling after the line has already appeared.
    render_line_with_comment(row, line, "code");
  }
}

function mount_deck_markdown(state: DeckState, host: LiveTree, markdown: string, options: DeckMarkdownOptions): void {
  const blocks = parse_deck_markdown(markdown);
  const onlyCodeBlock = blocks.length === 1 && blocks[0]?.kind === "code";
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

    mount_deck_code_block(state, host, block, {
      ...options,
      // CHANGED: a text body containing only a fenced code block should behave
      // like a full code panel; mixed prose+code bodies still size code to content.
      fillCodePanels: options.fillCodePanels || onlyCodeBlock,
    });
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

  const markdown = body_markdown(body);
  const parsedBlocks = parse_deck_markdown(markdown);
  const onlyCodeBlock = parsedBlocks.length === 1 && parsedBlocks[0]?.kind === "code";
  const fillAsCodePanel = body.kind === "code" || onlyCodeBlock;

  const bodyFrame = host.create.div().css.setMany({
    ...(body.kind === "code" ? deckCodeCss : deckBodyCss),
    // CHANGED: text bodies that contain only one fenced code block should use
    // the same constrained panel geometry as true code bodies.
    height: fillAsCodePanel ? "100%" : "auto",
    minHeight: "0",
    overflow: fillAsCodePanel ? "hidden" : "visible",
  });

  // CHANGED: styling/layout now lands first; write-in fills already-styled nodes.
  mount_deck_markdown(state, bodyFrame, markdown, {
    // CHANGED: full code bodies and code-only text bodies own the slide panel height;
    // mixed prose+code bodies size code to content.
    fillCodePanels: fillAsCodePanel,
  });
}
function deck_header_b_stack_css(slide: DeckSlideConfig) {
  if (slide.stackAlign === "center") {
    return {
      ...deckHeaderBStackCss,
      justifyContent: "center",
      gridTemplateColumns: "minmax(24rem, 54rem)",
    };
  }

  return deckHeaderBStackCss;
}
function mount_header_b_stack(state: DeckState, host: LiveTree, slide: DeckSlideConfig): void {
  const stack = host.create.div().css.setMany(deck_header_b_stack_css(slide));

  if (slide.bodyA) {
    const bodyAHost = stack.create.div().css.setMany({ minWidth: "0", minHeight: "0", overflow: "hidden" });
    mount_body(state, bodyAHost, slide.bodyA);
  }

  stack.create.div()
    .text.set(slide.headerB ?? "")
    .css.setMany(deckHeaderBCss);

  if (slide.bodyB) {
    const bodyBHost = stack.create.div().css.setMany({ minWidth: "0", minHeight: "0", overflow: "hidden" });
    mount_body(state, bodyBHost, slide.bodyB);
  }

  if (slide.bodyC) {
    const bodyCHost = stack.create.div().css.setMany({ minWidth: "0", minHeight: "0", overflow: "hidden" });
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
      const bodyHost = bodyGrid.create.div().css.setMany({ minWidth: "0", minHeight: "0", overflow: "hidden" });
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

export function mount_deck(host: LiveTree, slides: readonly DeckSlideConfig[] = SLIDES): DeckApi {
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
    stage.css.setMany({ opacity: "0", transform: "translateY(-1rem)", filter: "blur(2px)" });

    window.setTimeout(() => {
      mount_slide(state, stage, slides[state.index]! ?? slides[0]);
      requestAnimationFrame(() => {
        stage.css.setMany({ opacity: "1", transform: "translateY(0)", filter: "blur(0)" });
      });
    }, deckTransitionMs());
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