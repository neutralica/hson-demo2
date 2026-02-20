import type { AboutDocs } from "./about.types";
import README from "../../../../../../hson-live/README.md?raw";
import HSON_LIVETREE_MD from "../../../../../../hson-live/src/docs/hson-livetree.md?raw"


export const ABOUT_DOCS: AboutDocs = [
  { key: "readme", title: "README", body: README },
  { key: "livetree", title: "LiveTree", body: HSON_LIVETREE_MD },
  // later:
  // { key: "api", title: "API", body: API_MD },
];