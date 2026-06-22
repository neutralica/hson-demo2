// mount-deck.ts

import { LiveTree } from "hson-live";
import { _cols } from "../../core/consts/colors.consts";
import { FONT_FAM_MONO } from "../../core/consts/css.consts";
import { øfontSize } from "../../core/consts/ui-consts";

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
  background: "color-mix(in oklch, black 18%, transparent)",
  backdropFilter: "blur(2px)",
  overflow: "hidden",
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
  padding: "5.5rem 6rem 4.25rem 6rem",
  boxSizing: "border-box",
  transition: `opacity ${deckTransitionMs}ms ease, transform ${deckTransitionMs}ms ease, filter ${deckTransitionMs}ms ease`,
};

const deckSlideCss = {
  width: "min(78rem, 100%)",
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
      text: "A terminal-gothic slide shell mounted inside LiveDemo.\n\nTilde toggles the deck. Arrows move through slides. Escape closes.",
    },
    footer: "mount-deck / first pass",
  },
  {
    header: "State as substrate",
    bodyA: {
      kind: "text",
      text: "The deck is just another mounted LiveTree surface: a small state object, a scheduler, a slide factory, and a few effects.",
    },
    bodyB: {
      kind: "code",
      lang: "ts",
      text: `type DeckState = {\n  isOpen: boolean;\n  index: number;\n  timerIds: number[];\n};`,
    },
    footer: "split slide",
  },
  {
    header: "Three columns",
    bodyA: { kind: "text", text: "One panel can carry argument." },
    bodyB: { kind: "text", text: "One panel can carry proof." },
    bodyC: { kind: "text", text: "One panel can carry diagnostics, code, or a little theatrical nonsense." },
    footer: "triple slide",
  },
  {
    header: "The point",
    bodyA: {
      kind: "text",
      text: "A web-native deck can use the same visual language, same runtime, and same interaction model as the thing being presented.",
    },
    bodyB: {
      kind: "code",
      text: `mount_deck(screen);\n// then press ~`,
    },
    footer: "end / or beginning",
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

function write_in_text(state: DeckState, target: LiveTree, text: string): void {
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
  if (count <= 1) return "1fr";
  if (count === 2) return "1fr 1fr";
  return "1fr 1fr 1fr";
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

  const bodyTree = host.create.div().css.setMany(body.kind === "code" ? deckCodeCss : deckBodyCss);

  // CHANGED: first pass uses plain fenced/code text; syntax highlighting can be
  // swapped in here once the deck shell is wired and stable.
  write_in_text(state, bodyTree, body.text);
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