import type { LiveTree } from "hson-live";
import { about_factory, type AboutPanel } from "./about-factory";
import { type Outcome, relay } from "intrastructure";
import type { AboutDocs } from "./about.types";
import { about_init } from "./init-about";


export function mount_about_panels(host: LiveTree, docs: AboutDocs): Outcome<AboutPanel> {
  const o = about_factory(host);
  if ((o as any).t === "err") return o as any; // use your outcomeIs/relay_data style if preferred
  const ap = (o as any).data as AboutPanel;

  about_init(
    { toc: ap.toc, doc: ap.doc, title: ap.title },
    { docs},
  );

  return relay.data(ap);
}