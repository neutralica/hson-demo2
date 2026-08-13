import { hson } from "hson-live";
import type { InferLiveMapSchema } from "hson-live/livemap";
import type { OklchValues } from "./oklch.types";

const finite_range = (label: string, min: number, max: number) =>
  hson.liveMap.schema.define((s) => s.number.constrain(
    `${label} must be finite and within ${min}–${max}`,
    (value) => Number.isFinite(value) && value >= min && value <= max,
  ));

const lightness = finite_range("OKLCH lightness", 0, 100);
const chroma = finite_range("OKLCH chroma", 0, 1);
const hue = finite_range("OKLCH hue", 0, 360);
const alpha = finite_range("OKLCH alpha", 0, 1);

export function make_oklch_schema(targetPaths: readonly string[]) {
  const allowedPaths = new Set(targetPaths);
  return hson.liveMap.schema.define((s) => s.object.exact({
    activePath: s.string.constrain(
      "activePath must identify one configured OKLCH token",
      (value) => allowedPaths.has(value),
    ),
    tokens: s.array(s.object.exact({
      path: s.string.constrain(
        "token path must identify one configured OKLCH token",
        (value) => allowedPaths.has(value),
      ),
      value: s.object.exact({
        l: lightness,
        c: chroma,
        h: hue,
        a: alpha,
      }),
    })).constrain(
      "tokens must contain every configured path exactly once in configured order",
      (tokens) => tokens.length === targetPaths.length
        && tokens.every((token, index) => token.path === targetPaths[index]),
    ),
  }));
}

export type OklchCanonicalState = InferLiveMapSchema<ReturnType<typeof make_oklch_schema>>;
export type OklchCanonicalToken = OklchCanonicalState["tokens"][number];

export function create_oklch_store(initial: OklchCanonicalState, targetPaths: readonly string[]) {
  const map = hson.liveMap
    .fromJson(JSON.stringify(initial))
    .schema.use(make_oklch_schema(targetPaths));
  const activePath = map.at(["activePath"]);
  const tokens = map.at(["tokens"]);

  return Object.freeze({
    map,
    locations: Object.freeze({ activePath, tokens }),
  });
}

export function token_value(
  tokens: readonly OklchCanonicalToken[],
  path: string,
): OklchValues | undefined {
  return tokens.find((token) => token.path === path)?.value;
}
