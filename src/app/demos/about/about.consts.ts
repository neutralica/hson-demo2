import type { AboutDocs } from "./about.types";
import README from "../../../../../hson-live/README.md?raw";
import HSON_TRANSFORM_MD from "../../../../../hson-live/docs/transform/api-transform.md?raw";
import HSON_CSS_API from "../../../../../hson-live/docs/livetree/api-css-manager.md?raw";
import HSON_SPEC_SYNTAX from "../../../../../hson-live/docs/hson-syntax.md?raw";
import HSON_SPEC_NODE_GRAPH from "../../../../../hson-live/docs/hson-nodes.md?raw";
import HSON_SPEC_JSON from "../../../../../hson-live/docs/hson-json.md?raw";
import HSON_SPEC_HTML from "../../../../../hson-live/docs/hson-html.md?raw";
import LIVETREE_LIST from "../../../../../hson-live/docs/livetree/api-livetree.md?raw";
import LIVEDEMO_README from "../../../../README.md?raw";


export const ABOUT_DOCS: AboutDocs = [
  { key: "livedemo", title: "LiveDemo", body: LIVEDEMO_README },
  { key: "readme", title: "hson-live", body: README },
  { key: "hson-syntax", title: "hson", body: HSON_SPEC_SYNTAX },
  { key: "json`", title: "json", body: HSON_SPEC_JSON },
  { key: "html", title: "html", body: HSON_SPEC_HTML },
  { key: "hson-nodes", title: "graph", body: HSON_SPEC_NODE_GRAPH },
  { key: "transform", title: ".transform", body: HSON_TRANSFORM_MD },
  { key: "hson-css", title: "css", body: HSON_CSS_API },
  { key: "livetree-api", title: "liveTree api", body: LIVETREE_LIST },
  // later:
  // { key: "api", title: "API", body: API_MD },
];

export const MD_TERM_RE = /(hson-live|LiveDemo|hson |LiveTree|HSON)/g;