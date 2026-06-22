// mount-deck.ts

import { LiveTree } from "hson-live";
import { _cols } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { øfontSize } from "../../core/consts/ui-consts";
import { render_md_doc } from "../about/markdown-parser";
import { ABOUT_P_TEXTcss, MD_CODE_PREcss } from "../about/about.css";

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

export type DeckSlideConfig = Readonly<{
  header?: string;
  bodyA: DeckSlideBody;
  bodyB?: DeckSlideBody;
  bodyC?: DeckSlideBody;
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
  gridTemplateRows: "auto 1fr auto",
  gap: "1.8rem",
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
};

const sampleSlides: readonly DeckSlideConfig[] = [
  {
    header: "LiveDemo Deck",
    bodyA: {
      kind: "text",
      text: "### first pass\nA terminal-gothic slide shell mounted inside LiveDemo.\n\nTilde toggles the deck. Arrows move through slides. Escape closes.",
    },
    footer: "mount-deck / first pass",
  },
  {
    header: "Structured Text",
    bodyA: {
      kind: "text",
      text: "### Plain text\nThis panel is standard body copy. It should write in, then settle into the shared markdown parser without a layout jump.\n\nThe goal is boring stability: readable text, clean rhythm, no PowerPoint smell unless we ask for it.",
    },
    bodyB: {
      kind: "text",
      text: "### List text\n• bullet marker\n- dash marker\n* star marker\n\n### nested-ish continuation\n- first item\n  continued line for the first item\n- second item",
    },
    footer: "split / text + list",
  },
  {
    header: "Code Split",
    bodyA: {
      kind: "text",
      text: "### Text beside code\nThis should feel like a compact technical slide: one side argument, one side proof.\n\nThe code body writes in without showing the fence markers, then settles into the markdown/code renderer.",
    },
    bodyB: {
      kind: "code",
      lang: "ts",
      text: `type DeckSlideConfig = Readonly<{\n  header?: string;\n  bodyA: DeckSlideBody;\n  bodyB?: DeckSlideBody;\n  bodyC?: DeckSlideBody;\n  footer?: string;\n}>;`,
    },
    footer: "split / text + ts",
  },
  {
    header: "Format Lanes",
    bodyA: {
      kind: "code",
      lang: "json",
      text: `{\n  "format": "json",\n  "color": "bluelike",\n  "active": true\n}`,
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: `<deck\n  <slide\n    header "Format Lanes"\n    body "hson sample"\n  >\n>`,
    },
    bodyC: {
      kind: "code",
      lang: "html",
      text: `<section class="deck-slide">\n  <h3>HTML sample</h3>\n  <p>pinklike lane</p>\n</section>`,
    },
    footer: "triple / json + hson + html",
  },
  {
    header: "Markdown Edges",
    bodyA: {
      kind: "text",
      text: "### Subheading\nParagraph text before a rule.\n\n---\n\n!!! caution line rendered through the warning path\n\nhttps://neutralica.dev",
    },
    bodyB: {
      kind: "text",
      text: "### Inline formatted data\n```json\n{\n  \"from\": \"text body\",\n  \"still\": \"markdown parsed\"\n}\n```",
    },
    footer: "edge cases / heading + rule + warning + url + fenced text body",
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

  const bodyFrame = host.create.div().css.setMany({
    ...(body.kind === "code" ? deckCodeCss : deckBodyCss),
    position: "relative",
  });
  const markdown = body_markdown(body);

  const finalTree = bodyFrame.create.div().css.setMany({ visibility: "hidden" });
  render_md_doc(finalTree, markdown);

  const writer = bodyFrame.create.div().css.setMany({
    ...writing_shell_css(body),
    position: "absolute",
    inset: "0",
  });

  // CHANGED: render the final markdown structure invisibly before write-in so
  // headings/lists/code boxes reserve their final layout and do not jump when
  // the parser pass becomes visible.
  write_in_text(state, writer, writing_text(body, markdown), () => {
    writer.css.setMany({ display: "none" });
    finalTree.css.setMany({ visibility: "visible" });
  });
}

function mount_slide(state: DeckState, stage: LiveTree, slide: DeckSlideConfig): void {
  stage.empty();
  const slideTree = stage.create.div().css.setMany(deckSlideCss);
  const header = slideTree.create.div().css.setMany(deckHeaderCss);
  header.text.set(slide.header ?? "");

  window.setTimeout(() => header.css.setMany(deckHeaderVisibleCss), 30);

  const bodies = slide_bodies(slide);
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
      mount_slide(state, stage, slides[state.index]! ?? slides[0]); // had to null-assert
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