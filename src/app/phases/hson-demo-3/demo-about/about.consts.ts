import type { AboutDocs } from "./about.types";
import README from "../../../../../../hson-live/README.md?raw";
import HSON_LIVETREE_MD from "../../../../../../hson-live/src/docs/hson-livetree-api.md?raw";
import HSON_TRANSFORM_MD from "../../../../../../hson-live/src/docs/hson-transform-api.md?raw";
import HSON_CSS_API from "../../../../../../hson-live/src/docs/css-manager-api.md?raw";
import HSON_SPEC_SYNTAX from "../../../../../../hson-live/src/docs/hson-spec-0-syntax.md?raw";
import HSON_SPEC_NODE_GRAPH from "../../../../../../hson-live/src/docs/hson-spec-1-nodes.md?raw";
import HSON_SPEC_JSON from "../../../../../../hson-live/src/docs/hson-spec-2-json.md?raw";
import HSON_SPEC_HTML from "../../../../../../hson-live/src/docs/hson-spec-3-html.md?raw";

export const ABOUT_DOCS: AboutDocs = [
  { key: "readme", title: "README", body: README },
  { key: "hson-syntax", title: "syntax", body: HSON_SPEC_SYNTAX },
  { key: "nodes", title: "nodes", body: HSON_SPEC_NODE_GRAPH },
  { key: "json", title: "json", body: HSON_SPEC_JSON },
  { key: "html", title: "html", body: HSON_SPEC_HTML },
  { key: "transform", title: "transform", body: HSON_LIVETREE_MD },
  { key: "livetree", title: "liveTree", body: HSON_TRANSFORM_MD },
  { key: "hson-css", title: "css-manager", body: HSON_CSS_API },
  // later:
  // { key: "api", title: "API", body: API_MD },
];