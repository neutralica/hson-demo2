import type { AboutDocs } from "./about.types";
import README from "../../../../../../hson-live/README.md?raw";
import HSON_LIVETREE_MD from "../../../../../../hson-live/docs/hson-livetree-api.md?raw";
import HSON_TRANSFORM_MD from "../../../../../../hson-live/docs/hson-transform-api.md?raw";
import HSON_CSS_API from "../../../../../../hson-live/docs/css-manager-api.md?raw";
import HSON_SPEC_SYNTAX from "../../../../../../hson-live/docs/hson-spec-0-syntax.md?raw";
import HSON_SPEC_NODE_GRAPH from "../../../../../../hson-live/docs/hson-spec-1-nodes.md?raw";
import HSON_SPEC_JSON from "../../../../../../hson-live/docs/hson-spec-2-json.md?raw";
import HSON_SPEC_HTML from "../../../../../../hson-live/docs/hson-spec-3-html.md?raw";
import LIVETREE_LIST from "../../../../../../hson-live/docs/livetree-methods-list.md?raw";
import LIVEDEMO_README from "../../../../../README.md?raw";

export const ABOUT_DOCS: AboutDocs = [
  { key: "about", title: "about", body: LIVEDEMO_README },
  { key: "readme", title: "README", body: README },
  { key: "hson-syntax", title: "syntax", body: HSON_SPEC_SYNTAX },
  { key: "nodes", title: "nodes", body: HSON_SPEC_NODE_GRAPH },
  { key: "json", title: "json", body: HSON_SPEC_JSON },
  { key: "html", title: "html", body: HSON_SPEC_HTML },
  { key: "transform", title: "transform", body: HSON_TRANSFORM_MD },
  { key: "livetree", title: "liveTree", body: HSON_LIVETREE_MD },
  { key: "hson-css", title: "css-manager", body: HSON_CSS_API },
  { key: "livetree-list", title: "livetree api", body: LIVETREE_LIST },
  // later:
  // { key: "api", title: "API", body: API_MD },
];