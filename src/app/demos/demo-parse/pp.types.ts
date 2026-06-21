

export type PrimParse =
    | { ok: true; value: string | number | boolean | null; kind: "string" | "scalar" }
    | { ok: false };
