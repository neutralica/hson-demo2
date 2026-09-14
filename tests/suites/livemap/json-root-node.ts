import { hson } from "hson-live";
import type { HsonNode, JsonValue } from "hson-live/hson";

export function json_root_node(
  input: JsonValue,
): HsonNode {
  return hson.fromJson(input).toNode();
}
