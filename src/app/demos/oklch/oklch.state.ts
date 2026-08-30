import { Hson, hson, type HsonSchema } from "hson-live";
import type { OklchValues } from "./oklch.types";

export const OKLCH_SCHEMA: HsonSchema = Hson`
  <type "data" content <
    activePath "string"
    tokens <array <content <
      path "string"
      value <content <
        l <number <min 0 max 100>>
        c <number <min 0 max 1>>
        h <number <min 0 max 360>>
        a <number <min 0 max 1>>
      >>
    >>>
  >>
`;

export type OklchCanonicalToken = Readonly<{ path: string; value: OklchValues }>;
export type OklchCanonicalState = Readonly<{
  activePath: string;
  tokens: readonly OklchCanonicalToken[];
}>;

export function create_oklch_store(initial: OklchCanonicalState, targetPaths: readonly string[]) {
  const allowedPaths = new Set(targetPaths);
  if (!allowedPaths.has(initial.activePath)
    || initial.tokens.length !== targetPaths.length
    || initial.tokens.some((token, index) => token.path !== targetPaths[index])) {
    throw new TypeError("OKLCH state paths must match the configured targets exactly and in order.");
  }
  const map = hson.liveMap
    .fromJson(JSON.stringify(initial))
    .schema.use<OklchCanonicalState>(OKLCH_SCHEMA);
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

// @hson-schema generated type exports
import type { OKLCH_SCHEMAType, OKLCH_SCHEMAHson } from "./oklch.state.OKLCH_SCHEMA.hson-schema.generated.js";
export type { OKLCH_SCHEMAType, OKLCH_SCHEMAHson };
// @hson-schema end generated type exports
