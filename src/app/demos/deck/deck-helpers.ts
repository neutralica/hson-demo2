import type { LiveTree } from "hson-live";
import { _colors } from "../../core/consts/colors.consts";
import type { DeckSlideConfig, DeckState, DeckSlideBody } from "./deck.types";
import { _fontSize } from "../../core/consts/ui-consts";
import type { CssMap } from "hson-live/types";

const writeTickMs = 24;
const writeMinMs = 460;
const writeMaxMs = 980;
const writeNoise = "<>/\\{}[]()*&^%$#@!?:;~";
export function is_deck_list_line(line: string): boolean {
  return /^\s*(?:[-*•]|\d+[.)])\s+/.test(line);
}
function count_leading_spaces(line: string): number {
  const match = /^\s*/.exec(line);
  return match?.[0].length ?? 0;
}
export function normalize_code_block_text(lines: readonly string[]): string {
  const normalized = lines.slice();

  while (normalized.length > 0 && (normalized[0] ?? "").trim().length === 0) {
    normalized.shift();
  }

  while (normalized.length > 0 && (normalized[normalized.length - 1] ?? "").trim().length === 0) {
    normalized.pop();
  }

  const nonBlank = normalized.filter((line) => line.trim().length > 0);
  const commonIndent = nonBlank.length === 0
    ? 0
    : Math.min(...nonBlank.map(count_leading_spaces));

  return normalized.map((line) => line.slice(commonIndent)).join("\n");
}

export function clamp_index(index: number, slides: readonly DeckSlideConfig[]): number {
  if (slides.length === 0) return 0;
  return Math.max(0, Math.min(slides.length - 1, index));
}
function random_write_char(): string {
  const index = Math.floor(Math.random() * writeNoise.length);
  return writeNoise[index] ?? "*";
}
export function clear_timers(state: DeckState): void {
  state.timerIds.forEach((timerId) => window.clearInterval(timerId));
  state.timerIds = [];
}

export function write_in_rendered_text(state: DeckState, root: LiveTree): void {
  // CHANGED: keep the public helper LiveTree-native. We only touch the DOM at
  // the boundary where the canonical markdown renderer has already produced
  // styled text nodes.
  const rootElement = root.dom.must.html();
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);
  const entries: { node: Text; text: string; }[] = [];
  let current = walker.nextNode();

  while (current) {
    const node = current as Text;
    entries.push({ node, text: node.textContent ?? "" });
    current = walker.nextNode();
  }

  entries.forEach(({ node }) => {
    node.textContent = "";
  });

  entries.forEach(({ node, text }) => {
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

      node.textContent = settled + noisy;

      if (progress >= 1) {
        node.textContent = text;
        window.clearInterval(timerId);
        state.timerIds = state.timerIds.filter((id) => id !== timerId);
      }
    }, writeTickMs);

    state.timerIds.push(timerId);
  });
}

export function write_in_text(state: DeckState, target: LiveTree, text: string, onComplete?: () => void): void {
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
export function slide_bodies(slide: DeckSlideConfig): readonly DeckSlideBody[] {
  return [slide.bodyA, slide.bodyB, slide.bodyC].filter((body): body is DeckSlideBody => body !== undefined);
}
export function body_grid_columns(count: number): string {
  if (count <= 1) return "minmax(24rem, 48rem)";
  if (count === 2) return "1fr 1fr";
  return "1fr 1fr 1fr";
}
export function body_markdown(body: Extract<DeckSlideBody, { kind: "text" | "code"; }>): string {
  if (body.kind === "code") {
    const lang = body.lang ?? "ts";
    return `\`\`\`${lang}\n${body.text}\n\`\`\``;
  }

  return body.text;
}
export function deck_markdown_heading_css(level: 1 | 2 | 3 | 4): CssMap {
  if (level !== 3) return {};

  return {
    fontSize: _fontSize.header,
    letterSpacing: "0.035em",
    opacity: "0.9",
    margin: "0 0 0.35rem 0",
    padding: "0.5rem",
    color: _colors.txt.menu,
  };
}
export function is_formatted_data_lang(lang: string | undefined): boolean {
  const normalized = (lang ?? "ts").toLowerCase();
  return normalized === "json" || normalized === "hson" || normalized === "html";
}
export function deck_code_format_color(lang: string | undefined): string {
  const normalized = (lang ?? "ts").toLowerCase();
  if (normalized === "json") return _colors.bluelike;
  if (normalized === "hson") return _colors.yellowlike;
  if (normalized === "html") return _colors.pinklike;
  return _colors.bluelike;
}
export function deck_code_watermark(lang: string | undefined): string {
  const normalized = (lang ?? "ts").toLowerCase();
  if (normalized === "json") return "{JSON}";
  if (normalized === "hson") return "<HSON>";
  if (normalized === "html") return "<HTML/>";
  return normalized.toUpperCase();
}