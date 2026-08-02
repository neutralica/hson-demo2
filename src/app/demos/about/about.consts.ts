import type { AboutDocs } from "./about.types";
import README from "../../../../../hson-live/README.md?raw";
import HSON_TRANSFORM_MD from "../../../../../hson-live/docs/transform/api-transform.md?raw";
import HSON_CSS_API from "../../../../../hson-live/docs/livetree/api-css-manager.md?raw";
import HSON_SPEC_SYNTAX from "../../../../../hson-live/docs/hson-syntax.md?raw";
import HSON_SPEC_NODE_GRAPH from "../../../../../hson-live/docs/hson-nodes.md?raw";
import HSON_SPEC_JSON from "../../../../../hson-live/docs/hson-json.md?raw";
import HSON_SPEC_HTML from "../../../../../hson-live/docs/hson-html.md?raw";
import LIVETREE_LIST from "../../../../../hson-live/docs/livetree/api-livetree.md?raw";
import LIVEMAP_LIST from "../../../../../hson-live/docs/livemap/api-livemap.md?raw";
import LIVEHOST_LIST from "../../../../../hson-live/docs/livehost/api-livehost.md?raw";
import LIVEHOST_ABOUT from "../../../../../hson-live/docs/hson-livehost.md?raw";
import LIVEMAP_ABOUT from "../../../../../hson-live/docs/hson-livemap.md?raw";
import LIVETREE_ABOUT from "../../../../../hson-live/docs/hson-livetree.md?raw";
import LIVEDEMO_README from "../../../../README.md?raw";


export const ABOUT_DOCS: AboutDocs = [
  { key: "livedemo", title: "this site", body: LIVEDEMO_README },
  { key: "readme", title: "hson-live", body: README },
  { key: "hson-syntax", title: "HSON", body: HSON_SPEC_SYNTAX },
  { key: "json`", title: "JSON", body: HSON_SPEC_JSON },
  { key: "html", title: "HTML", body: HSON_SPEC_HTML },
  { key: "hson-nodes", title: "graph", body: HSON_SPEC_NODE_GRAPH },
  { key: "transform", title: "Transform API", body: HSON_TRANSFORM_MD },
  { key: "livetree", title: "LiveTree", body: LIVETREE_ABOUT },
  { key: "livetree-api", title: "LiveTree API", body: LIVETREE_LIST },
  { key: "livemap", title: "LiveMap", body: LIVEMAP_ABOUT },
  { key: "livemap-api", title: "LiveMap API", body: LIVEMAP_LIST },
  { key: "livehost", title: "LiveHost", body: LIVEHOST_ABOUT },
  { key: "livehost-api", title: "LiveHost API", body: LIVEHOST_LIST },
  { key: "hson-css", title: "css", body: HSON_CSS_API },
  // later:
  // { key: "api", title: "API", body: API_MD },
];

export const MD_TERM_RE = /(hson-live|LiveDemo|hson |LiveTree|HSON)/g;