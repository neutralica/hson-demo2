// core.types.ts

import type { HSON_LETTERS } from "../app/consts/config.consts";

export type PhaseId = "intro" | "splash";

export type AppEnv = {
  readonly mountId: string;
  readonly dev: boolean;
};

export type Phase = {
  readonly id: PhaseId;
  readonly render: (ctx: PhaseCtx) => void;
  readonly dispose?: () => void;
};

export type PhaseCtx = {
  readonly env: AppEnv;
  readonly nav: (to: PhaseId) => void;
};

export type App = {
  readonly start: () => void;
};
export type LetterKey = (typeof HSON_LETTERS)[number];
