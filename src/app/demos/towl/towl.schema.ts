import { hson } from "hson-live";
import { TOWL_WIN_POSITION } from "./towl.consts";

const ropePosition = hson.liveMap.schema.define((s) => s.refine(
  s.number,
  "integer TOWL rope position within the win boundaries",
  (value) => Number.isInteger(value) && Math.abs(value) <= TOWL_WIN_POSITION,
));

const positiveInteger = hson.liveMap.schema.define((s) => s.refine(
  s.number,
  "positive integer",
  (value) => Number.isInteger(value) && value > 0,
));

const seat = hson.liveMap.schema.define((s) => s.exact({
  sessionId: s.string.nullable,
  connected: s.boolean,
  ready: s.boolean,
}));

export const TOWL_SCHEMA = hson.liveMap.schema.define((s) => s.exact({
  phase: s.pick("lobby", "ready", "playing", "finished"),
  player1: seat,
  player2: seat,
  position: ropePosition,
  winner: s.pick("player1", "player2").nullable,
  round: positiveInteger,
}));
