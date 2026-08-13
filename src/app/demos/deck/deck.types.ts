import type { LiveTree } from "hson-live/livetree";

export type DeckBodyKind = "text" | "code" | "image";

export type DeckSlideBody = Readonly<
  {
    kind: "text";
    text: string;
  } |
  {
    kind: "code";
    text: string;
    lang?: string;
  } |
  {
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
  headerC?: string;
  bodyA?: DeckSlideBody;
  bodyB?: DeckSlideBody;
  bodyC?: DeckSlideBody;
  sections?: readonly DeckSlideSection[];
  stackAlign?: "start" | "center";
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
  dispose: () => void;
}>;
export type DeckState = {
  isOpen: boolean;
  index: number;
  timerIds: number[];
  frameIds: number[];
  disposed: boolean;
};

export type MarkdownRenderOptions = Readonly<{
  headingCss?: (level: 1 | 2 | 3 | 4) => Record<string, string>;
}>;
