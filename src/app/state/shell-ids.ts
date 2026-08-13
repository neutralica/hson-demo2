export const PUBLIC_MAIN_VIEW_IDS = [
  "about",
  "test",
  "parse",
  "build",
  "bar-bar",
  "towl",
  "cells",
  "fleurs",
] as const;

export const EXPERIMENTAL_MAIN_VIEW_IDS = [
  "color-sudoku",
] as const;

export const MAIN_VIEW_IDS = [
  ...PUBLIC_MAIN_VIEW_IDS,
  ...EXPERIMENTAL_MAIN_VIEW_IDS,
] as const;

export const WIDGET_IDS = [
  "point",
  "oklch",
  "bling",
] as const;

export type PublicMainViewId = typeof PUBLIC_MAIN_VIEW_IDS[number];
export type ExperimentalMainViewId = typeof EXPERIMENTAL_MAIN_VIEW_IDS[number];
export type MainViewId = typeof MAIN_VIEW_IDS[number];
export type WidgetId = typeof WIDGET_IDS[number];
