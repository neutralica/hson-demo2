/**
 * @deprecated Import the experimental Node hosting surface from
 * `hson-live/livehost/node`. This compatibility module owns no state.
 */
export {
  start_node_application_host,
} from "hson-live/livehost/node";
export type {
  NodeApplicationHost,
  NodeApplicationHostOptions,
  NodeApplicationHttpRoute,
  NodeAuthorityNamespace,
  NodeHostedApplication,
  NodeHostOperationalEvent,
} from "hson-live/livehost/node";
