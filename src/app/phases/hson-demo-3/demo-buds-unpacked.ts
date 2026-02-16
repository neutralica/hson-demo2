import type { LiveTree } from "hson-live";
import { makeDivId, makeDivIdTxt } from "../../utils/makers";
import { $DS } from "./demo.consts";

const demoBuds = (host: LiveTree) => makeDivId(host, $DS.demo)

