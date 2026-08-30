import { Hson, type HsonSchema } from "hson-live";

export const TOWL_SCHEMA: HsonSchema = Hson`
  <type "data" defs <
    Seat <content <sessionId <union ["string", "null"]> connected "boolean" ready "boolean">>
  > content <
    phase "string"
    player1 <ref "Seat">
    player2 <ref "Seat">
    position <number <int true min -10 max 10>>
    winner <union ["string", "null"]>
    round <number <int true min 1>>
  >>
`;

// @hson-schema generated type exports
import type { TOWL_SCHEMAType, TOWL_SCHEMAHson } from "./towl.schema.TOWL_SCHEMA.hson-schema.generated.js";
export type { TOWL_SCHEMAType, TOWL_SCHEMAHson };
// @hson-schema end generated type exports
