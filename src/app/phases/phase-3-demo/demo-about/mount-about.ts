import type { LiveTree } from "hson-live";
import { about_factory, type AboutPanel } from "./about-factory";
import { type Outcome, relay, relay_data } from "intrastructure";
import type { AboutDocs } from "./about.types";
import { about_init } from "./about-init";


export function mount_about_panels(host: LiveTree, docs: AboutDocs): Outcome<AboutPanel> {
  const ap = relay_data(about_factory(host)); 
  about_init(
    { toc: ap.toc, doc: ap.doc },
    { docs },
  );
  return relay.data(ap);
}