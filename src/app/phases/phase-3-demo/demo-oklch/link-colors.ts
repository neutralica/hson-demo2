// link-colors.ts

import { COLOR_VAR_SOURCES, type ColorVarSource } from "../../../core/consts/colors.consts";
import type { OklchTarget } from "./oklch.types";

function isOklchString(value: unknown): value is string {
  return typeof value === "string" && value.trim().startsWith("oklch(");
}

function labelForPath(path: string): string {
  return path.replace(/\./g, "-");
}

function makeTarget(source: ColorVarSource): OklchTarget {
  return Object.freeze({
    label: labelForPath(source.path),
    varName: source.varName,
    initial: source.value,
  });
}

export const OKLCH_COLOR_TARGETS: readonly OklchTarget[] = Object.freeze(
  COLOR_VAR_SOURCES
    .filter((source) => isOklchString(source.value))
    .map(makeTarget),
);