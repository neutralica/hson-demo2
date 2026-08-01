/**
 * @deprecated Import `create_browser_livehost_socket` from
 * `hson-live/livehost`. This compatibility module owns no state.
 */
export {
  create_browser_livehost_socket as make_hosted_test_browser_websocket,
} from "hson-live/livehost";
export type {
  BrowserLiveHostSocket as HostedTestBrowserSocket,
  BrowserLiveHostSocketStatus as BrowserWebSocketReadyState,
  BrowserWebSocketConstructor,
  BrowserWebSocketLike,
} from "hson-live/livehost";
