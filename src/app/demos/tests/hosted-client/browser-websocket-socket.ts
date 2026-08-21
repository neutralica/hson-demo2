/**
 * @deprecated Import `create_browser_locus_socket` from
 * `hson-live/locus`. This compatibility module owns no state.
 */
export {
  create_browser_locus_socket as make_hosted_test_browser_websocket,
} from "hson-live/locus";
export type {
  BrowserLocusSocket as HostedTestBrowserSocket,
  BrowserLocusSocketStatus as BrowserWebSocketReadyState,
  BrowserWebSocketConstructor,
  BrowserWebSocketLike,
} from "hson-live/locus";
