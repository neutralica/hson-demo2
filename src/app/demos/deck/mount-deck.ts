// mount-deck.ts

import { type LiveTree } from "hson-live/livetree";
import { _colors } from "../../core/consts/colors.consts";
import { ABOUT_P_TEXTcss, ABOUT_HEADERcss, ABOUT_LIST_ROWcss, ABOUT_LIST_MARKERcss, LIST_TEXTcss, FLUSH_LISTcss } from "../about/about.css";
import { set_alpha } from "../../core/helpers/color-helpers";
import {
  deckBodyCss,
  deckBodyGridCss,
  deckButtonCss,
  deckChromeCss,
  deckCodeContentCss,
  deckCodeCss,
  deckFooterCss,
  deckHeaderBStackCss,
  deckHeaderBCss,
  deckHeaderVisibleCss,
  deckRootCss,
  deckSectionCss,
  deckSectionHeadingCss,
  deckSectionStackCss,
  deckSectionTextCss,
  deckSlideCss,
  deckStageCss,
  deckCoverCss,
  DECK_ROW_TXTcss,
  IMGcss,
  TXT_ROWcss,
  DECK_EMPTYHRcss,
  DECK_HRcss,
  P_BLOCKcss,
} from "./deck.css";
import { SLIDES } from "./deck-slides";
import { normalize_code_block_text, is_deck_list_line, body_grid_columns, body_markdown, clamp_index, clear_timers, deck_code_format_color, deck_code_watermark, deck_markdown_heading_css, is_formatted_data_lang, schedule_deck_frame, schedule_deck_timeout, slide_bodies, write_in_text } from "./deck-helpers";
import type { DeckSlideConfig, DeckState, DeckSlideBody, DeckSlideSection, DeckApi } from "./deck.types";
import type { CssMap } from "hson-live/types";
import { render_line_with_comment } from "../about/about-helpers";
import { mk_div_cls, mk_div_cls_txt, mk_div_id, mk_div_id_txt, mk_span_cls, mk_span_cls_txt } from "../../utils/makers";
import { HSON_LIVE_GRAFFITIstr } from "../../core/consts/ui-consts";
import { DEMO_SCREENcss, HSON_GRAFFITIcss } from "../../phases/phase-3-demo/demo.css";


function deck_align_css(stackAlign: DeckSlideConfig["stackAlign"] | undefined): CssMap {
  if (stackAlign !== "center") return {};

  return {
    textAlign: "center",
    justifySelf: "center",
  };
}

function deck_header_css(): CssMap {
  return {
    ...deckHeaderBCss,
    textAlign: "center",
    justifySelf: "center",
    width: "100%",
  };
}

function deck_header_b_css(): CssMap {
  return {
    ...deckHeaderBCss,
    textAlign: "center",
    justifySelf: "center",
    width: "100%",
  };
}
export function deckTransitionMs(): number { return 180 };

function deck_code_panel_css(lang: string | undefined, options: DeckMarkdownOptions): CssMap {
  const formatColor = deck_code_format_color(lang);
  const css: CssMap = {
    position: "relative",
    minWidth: "0",
    minHeight: "0",
    height: options.fillCodePanels ? "100%" : "auto",
    // maxHeight: "80%",
    // width: "60ch",
    width: "100%",
    maxWidth: (options.isTs) ? "100ch" : "40ch",
    placeSelf: "center",
    overflowX: "hidden",
    overflowY: "auto",
    boxSizing: "border-box",
    // CHANGED: this is the actual shell used by both solo code bodies and
    // fenced markdown code blocks, so panel padding belongs here.
    padding: "0.75rem 0.75rem",
    background: _colors.backlo,
    // CHANGED: restore format-aware body text color inside data/code panels.
    color: formatColor,
    border: `1px solid ${formatColor}`,
    boxShadow: "inset 0 0 15px 0.1px " + set_alpha(formatColor, 0.5),
    scrollbarWidth: "thin",

  };

  return css;
}


// CHANGED: deck-local markdown mounting creates styled nodes first, then writes
// text into those nodes. This avoids raw markdown write-in followed by a
// separate parser/styling snap.
type DeckMarkdownBlock = Readonly<
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; lines: readonly string[] }
  | { kind: "hr" }
  | { kind: "empty-hr" }
  | { kind: "code"; lang?: string; text: string }
>;

type DeckMarkdownOptions = Readonly<{
  fillCodePanels: boolean;
  stackAlign?: DeckSlideConfig["stackAlign"];
  isTs?: boolean;
}>;

function deckSpacingPrefix(count: number): string {
  return "\u00A0".repeat(Math.max(0, Math.min(160, count)));
}

function formatDeckSpacingLine(line: string): string {
  const trimmed = line.trim();
  const match = /^#(?:_(\d+)|(\d+)ch)#\s*([\s\S]*)$/.exec(trimmed);

  if (!match) return trimmed;

  const count = Number.parseInt(match[1] ?? match[2] ?? "0", 10);
  const text = match[3] ?? "";

  return `${deckSpacingPrefix(Number.isFinite(count) ? count : 0)}${text}`;
}
function deck_header_b_stack_css(slide: DeckSlideConfig): CssMap {
  if (slide.stackAlign === "center") {
    return {
      ...deckHeaderBStackCss,
      gridTemplateColumns: "minmax(24rem, 54rem)",
    };
  }

  return deckHeaderBStackCss;
}

function parse_deck_markdown(markdown: string): readonly DeckMarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: DeckMarkdownBlock[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = (): void => {
    const text = para.map(formatDeckSpacingLine).filter(Boolean).join("\n");
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

    if (trimmed === "#HR#") {
      flushPara();
      flushList();
      blocks.push({ kind: "hr" });
      continue;
    }
    if (trimmed === "#__#") {
      flushPara();
      flushList();
      blocks.push({ kind: "empty-hr" });
      continue;
    }

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

function mount_deck_heading_block(
  state: DeckState,
  host: LiveTree,
  block: Extract<DeckMarkdownBlock, { kind: "heading" }>,
  options: DeckMarkdownOptions,
): void {
  const heading = mk_div_cls(host, "deck heading").css.setMany({
    ...ABOUT_HEADERcss(block.level),
    ...deck_markdown_heading_css(block.level),
    ...deck_align_css(options.stackAlign),
    maxWidth: "65ch"
  });
  write_in_text(state, heading, block.text);
}

function mount_deck_paragraph_block(state: DeckState, host: LiveTree, text: string): void {
  const paragraph = mk_div_cls(host, "p block").css.setMany(P_BLOCKcss);

  for (const line of text.split("\n")) {
    const row = mk_div_cls(paragraph, "p row").css.setMany(DECK_ROW_TXTcss);
    write_in_text(state, row, line);
  }
}

function mount_deck_list_block(state: DeckState, host: LiveTree, lines: readonly string[]): void {
  const list = mk_div_cls(host, "list block").css.setMany({
    ...FLUSH_LISTcss,
    textAlign: "left",
  });

  for (const line of lines) {
    const match = /^\s*([-*•]|\d+[.)])\s+([\s\S]*)$/.exec(line);
    const marker = match?.[1] ?? "•";
    const text = match?.[2] ?? line.trim();
    const row = mk_div_cls(list, "list row").css.setMany(ABOUT_LIST_ROWcss);

    mk_span_cls_txt(row, "list marker", marker)
      .css.setMany({
        ...ABOUT_LIST_MARKERcss,
        marginLeft: "1rem",
      });

    const body = mk_span_cls(row, "list body").css.setMany(LIST_TEXTcss);
    for (const bodyLine of text.split("\n")) {
      const bodyRow = mk_div_cls(body, "body row");
      write_in_text(state, bodyRow, bodyLine);
    }
  }
}

function mount_deck_hr_block(host: LiveTree): void {
  mk_div_cls(host, "hr").css.setMany(DECK_HRcss);
}

function mount_empty_hr_block(host: LiveTree): void {
  mk_div_cls(host, "empty hr").css.setMany(DECK_EMPTYHRcss);
}

function mount_deck_code_block(
  state: DeckState,
  host: LiveTree,
  block: Extract<DeckMarkdownBlock, { kind: "code" }>,
  options: DeckMarkdownOptions,
): void {
  const isTs = options.isTs || false;
  const panel = mk_div_cls(host, "content panel code").css.setMany(deck_code_panel_css(block.lang, options));

  const content = mk_div_cls(panel, "code content block").css.setMany(deckCodeContentCss);

  if (is_formatted_data_lang(block.lang)) {
    write_in_text(state, content, block.text);
    return;
  }

  // CHANGED: ordinary code fences create their final row structure first, then
  // each row writes in and settles into syntax highlighting. This avoids the
  // whole code block jumping when one raw text node is replaced by many rows.
  for (const line of block.text.split("\n")) {
    const row = mk_div_cls(content, "text row").css.setMany(TXT_ROWcss);

    render_line_with_comment(row, line, "code", (target, text) => {
      write_in_text(state, target, text);
    });
  }
}

function mount_deck_markdown(state: DeckState, host: LiveTree, markdown: string, options: DeckMarkdownOptions): void {
  const blocks = parse_deck_markdown(markdown);
  const onlyCodeBlock = blocks.length === 1 && blocks[0]?.kind === "code";
  host.empty();

  for (const block of blocks) {
    if (block.kind === "heading") {
      mount_deck_heading_block(state, host, block, options);
      continue;
    }

    if (block.kind === "hr") {
      mount_deck_hr_block(host);
      continue;
    }

    if (block.kind === "empty-hr") {
      mount_empty_hr_block(host);
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
      fillCodePanels: options.fillCodePanels || onlyCodeBlock,
    });
  }
}

function mount_body(state: DeckState, host: LiveTree, body: DeckSlideBody, stackAlign?: DeckSlideConfig["stackAlign"]): void {
  if (body.kind === "image") {
    host.create.img()
      .attrs.setMany({ src: body.src, alt: body.alt ?? "" })
      .css.setMany(IMGcss);
    return;
  }

  const markdown = body_markdown(body);
  const parsedBlocks = parse_deck_markdown(markdown);
  const onlyCodeBlock = parsedBlocks.length === 1 && parsedBlocks[0]?.kind === "code";
  const fillAsCodePanel = body.kind === "code" || onlyCodeBlock;
  const langIsTs = (body.kind === "code" && body.lang === "ts");

  const bodyFrame = mk_div_cls(host, "body frame").css.setMany({
    ...deckBodyCss,
    height: "100%",
    textAlign: "left",
  });

  mount_deck_markdown(state, bodyFrame, markdown, {
    fillCodePanels: fillAsCodePanel,
    stackAlign,
    isTs: langIsTs
  });
}
function slide_has_stacked_headers(slide: DeckSlideConfig): boolean {
  return slide.headerB !== undefined || slide.headerC !== undefined;
}

function mount_slide_header(state: DeckState, host: LiveTree, text: string): void {
  const header = mk_div_cls_txt(host, "slide-header", text).css.setMany(deck_header_css());
  schedule_deck_timeout(state, () => header.css.setMany(deckHeaderVisibleCss), 30);
}

function mount_header_stack(state: DeckState, host: LiveTree, slide: DeckSlideConfig): void {
  const stack = mk_div_cls(host, "header stack").css.setMany(deck_header_b_stack_css(slide));

  const rows: readonly [string | undefined, DeckSlideBody | undefined][] = [
    [slide.headerA, slide.bodyA],
    [slide.headerB, slide.bodyB],
    [slide.headerC, slide.bodyC],
  ];

  for (const [header, body] of rows) {
    if (header) mount_slide_header(state, stack, header);

    if (body) {
      const bodyHost = mk_div_cls(stack, "body host").css.setMany({
        minWidth: "0",
        minHeight: "0",
        overflow: "hidden",
      });

      mount_body(state, bodyHost, body, slide.stackAlign);
    }
  }
}

function mount_sections(state: DeckState, host: LiveTree, sections: readonly DeckSlideSection[], stackAlign?: DeckSlideConfig["stackAlign"]): void {
  const stack = mk_div_cls(host, "section stack").css.setMany(deckSectionStackCss);

  for (const section of sections) {
    const sectionTree = mk_div_cls(stack, `section tree`).css.setMany(deckSectionCss);
    mk_div_cls_txt(sectionTree, "section heading", section.heading)
      .css.setMany({
        ...deckSectionHeadingCss,
        ...deck_align_css(stackAlign),
      });

    if (!section.text) continue;

    const textTree = mk_div_cls(sectionTree, "text tree").css.setMany(deckSectionTextCss);
    write_in_text(state, textTree, section.text);
  }
}

function mount_slide(state: DeckState, stage: LiveTree, slide: DeckSlideConfig): void {
  stage.empty();
  const slideTree = mk_div_cls(stage, "slide").css.setMany(deckSlideCss);
  const bodies = slide_bodies(slide);

  if (slide_has_stacked_headers(slide)) {
    mount_header_stack(state, slideTree, slide);
  } else {
    if (slide.headerA) {
      mount_slide_header(state, slideTree, slide.headerA);
    }

    if (slide.sections && slide.sections.length > 0) {
      mount_sections(state, slideTree, slide.sections, slide.stackAlign);
    } else if (bodies.length > 0) {
      const bodyGrid = mk_div_cls(slideTree, "body grid").css.setMany({
        ...deckBodyGridCss,
        gridTemplateColumns: body_grid_columns(bodies.length),
        // justifyContent: bodies.length <= 1 ? "center" : "stretch",
      });

      bodies.forEach((body) => {
        const bodyHost = mk_div_cls(bodyGrid, "body host").css.setMany({
          minWidth: "0",
          minHeight: "0",
          overflow: "hidden",
        });

        mount_body(state, bodyHost, body, slide.stackAlign);
      });
    } else {
      mk_div_cls(slideTree, "deck empty div");
    }
  }

  mk_div_cls_txt(slideTree, "slide footer", slide.footer ?? "")
    .css.setMany(deckFooterCss);
}

export function mount_deck(host: LiveTree, slides: readonly DeckSlideConfig[] = SLIDES): DeckApi {
  const state: DeckState = {
    isOpen: false,
    index: 0,
    timerIds: [],
    frameIds: [],
    disposed: false,
  };

  const root = mk_div_id(host, "live-demo-deck").css.setMany(deckRootCss);
  const chrome = mk_div_id(root, "deck-chrome").css.setMany(deckChromeCss);

  const stage = mk_div_id(root, "deck-stage").css.setMany(deckStageCss);
  const counter = mk_div_id_txt(chrome, "slide-counter", `1 / ${slides.length}`);

  const prevButton = mk_div_id_txt(chrome, "prev-btn", "prev").css.setMany(deckButtonCss);
  const nextButton = mk_div_id_txt(chrome, "next-btn", "next").css.setMany(deckButtonCss);
  const closeButton = mk_div_id_txt(chrome, "close-btn", "close").css.setMany(deckButtonCss);

  const deckCover = mk_div_id(root, "deck-cover")
    .css.setMany(deckCoverCss)
  const graf = mk_div_id(deckCover, "graffiti-layer-2")
    .text.set(HSON_LIVE_GRAFFITIstr)
    .css.setMany(HSON_GRAFFITIcss);

  const sync_counter = (): void => {
    counter.text.set(`${state.index + 1} / ${slides.length}`);
  };

  const render_current = (): void => {
    if (state.disposed) return;
    clear_timers(state);
    sync_counter();
    stage.css.setMany({ opacity: "0", transform: "translateY(-1rem)", filter: "blur(2px)" });

    schedule_deck_timeout(state, () => {
      mount_slide(state, stage, slides[state.index]! ?? slides[0]);
      schedule_deck_frame(state, () => {
        stage.css.setMany({ opacity: "1", transform: "translateY(0)", filter: "blur(0)" });
      });
    }, deckTransitionMs());
  };

  const open = (): void => {
    if (state.disposed || state.isOpen) return;
    state.isOpen = true;
    root.css.setMany({ display: "block" });
    render_current();
  };

  const close = (): void => {
    if (state.disposed || !state.isOpen) return;
    state.isOpen = false;
    clear_timers(state);
    root.css.setMany({ display: "none" });
  }

  const goTo = (index: number): void => {
    if (state.disposed) return;
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

  const prevListener = prevButton.listen.stopProp().onClick(prev);
  const nextListener = nextButton.listen.stopProp().onClick(next);
  const closeListener = closeButton.listen.stopProp().onClick(close);

  const keyListener = root.listen.document.onKeyDown((ke) => {
    if (state.disposed) return;
    if (ke.key === "~" || ke.key === "~") {
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

  const dispose = (): void => {
    if (state.disposed) return;
    state.disposed = true;
    state.isOpen = false;
    clear_timers(state);
    prevListener.off();
    nextListener.off();
    closeListener.off();
    keyListener.off();
    if (!root.isDisposed) root.remove();
  };

  return Object.freeze({ root, open, close, toggle, next, prev, goTo, dispose });
}
