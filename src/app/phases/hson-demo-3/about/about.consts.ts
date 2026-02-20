import type { AboutDocs } from "./about.types";
import README from "../../../../../../hson-live/README.md?raw";

export const ABOUT_DOCS: AboutDocs = [
  { key: "readme", title: "README", body: README },
  // later:
  // { key: "api", title: "API", body: API_MD },
];