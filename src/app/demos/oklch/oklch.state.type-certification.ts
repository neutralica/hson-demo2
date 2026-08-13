import type { LiveMapPathHandle } from "hson-live/livemap";
import { create_oklch_store, type OklchCanonicalState, type OklchCanonicalToken } from "./oklch.state";

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends
  (<T>() => T extends TRight ? 1 : 2) ? true : false;
type Expect<TValue extends true> = TValue;

declare const initial: OklchCanonicalState;
const store = create_oklch_store(initial, ["txt.main"]);

type ActivePathSnap = ReturnType<typeof store.locations.activePath.snap>;
type TokensSnap = ReturnType<typeof store.locations.tokens.snap>;

type _ActivePathLocation = Expect<Equal<ActivePathSnap, string>>;
type _TokensLocation = Expect<Equal<TokensSnap, readonly OklchCanonicalToken[]>>;

const _activePathHandle: LiveMapPathHandle<string> = store.locations.activePath;
const _tokensHandle: LiveMapPathHandle<readonly OklchCanonicalToken[]> = store.locations.tokens;

void _activePathHandle;
void _tokensHandle;
