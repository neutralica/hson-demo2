import { Hson, type HsonSchema } from "hson-live";

export const TOWL_SCHEMA: HsonSchema<TOWL_SCHEMAType, "data"> = Hson`
  <type "data" defs <
    Seat <content <sessionId <union ["string", "null"]> connected "boolean" ready "boolean">>
  > content <
    phase <union [
      <exact "lobby">,
      <union [<exact "ready">, <union [<exact "playing">, <exact "finished">]>]>
    ]>
    player1 <ref "Seat">
    player2 <ref "Seat">
    position <number <int true min -10 max 10>>
    winner <union [<union [<exact "player1">, <exact "player2">]>, "null"]>
    round <number <int true min 1>>
  >>
`;

// @hson-schema generated type exports
import type { TOWL_SCHEMAType, TOWL_SCHEMAHson } from "./towl.schema.TOWL_SCHEMA.hson-schema.generated.js";
export type { TOWL_SCHEMAType, TOWL_SCHEMAHson };
// @hson-schema end generated type exports
