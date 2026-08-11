import { hson } from "hson-live";
import { hsonTransform } from "hson-live/transform";

type ParseOutcome =
  | Readonly<{ ok: true; node: unknown }>
  | Readonly<{ ok: false; message: string }>;

export type SanitizerMetadataCase = Readonly<{
  browser: ParseOutcome;
  worker: ParseOutcome;
}>;

function error_message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parse_browser(source: string): ParseOutcome {
  try {
    return { ok: true, node: hson.fromUntrustedHtml(source).toNode() };
  } catch (error) {
    return { ok: false, message: error_message(error) };
  }
}

function parse_worker(source: string): ParseOutcome {
  try {
    return { ok: true, node: hsonTransform.fromUntrustedHtml(source).toNode() };
  } catch (error) {
    return { ok: false, message: error_message(error) };
  }
}

function compare(source: string): SanitizerMetadataCase {
  return {
    browser: parse_browser(source),
    worker: parse_worker(source),
  };
}

export function run_sanitizer_metadata_fixture() {
  const root = document.querySelector("#fixture-root");
  if (!(root instanceof HTMLElement)) {
    throw new Error("sanitizer metadata fixture root is unavailable");
  }
  root.dataset.fixtureState = "running";

  try {
    const result = {
      validQuidAndUnsafeHandler: compare(
        `<main><span hson:quid="000000001" data-_quid="application" onclick="run()">ready</span></main>`,
      ),
      malformedQuid: compare(`<main hson:quid="bad"/>`),
      unknownMetadata: compare(`<main hson:unknown="value"/>`),
      validIndex: compare(
        `<_hson_arr><_hson_ii hson:index="0"><_hson_obj><span><_hson_obj/></span></_hson_obj></_hson_ii></_hson_arr>`,
      ),
      malformedIndex: compare(
        `<_hson_arr><_hson_ii hson:index="banana"><_hson_obj><span><_hson_obj/></span></_hson_obj></_hson_ii></_hson_arr>`,
      ),
      misplacedIndex: compare(`<main hson:index="0"/>`),
      duplicateQuid: compare(
        `<main hson:quid="000000001" hson:quid="000000002"/>`,
      ),
      caseEquivalentDuplicateQuid: compare(
        `<main HSON:QUID="000000001" hson:quid="000000002"/>`,
      ),
      duplicateIndex: compare(
        `<_hson_arr><_hson_ii hson:index="0" hson:index="1"/></_hson_arr>`,
      ),
      metadataPrivateName: compare(
        `<main _hson_meta_attr_v2_71756964="000000001"/>`,
      ),
      ordinaryPrivateName: compare(
        `<main _hson_attr_transit_v1_613a62="value"/>`,
      ),
      applicationData: compare(
        `<main data-_quid="q" data-_index="i" data--attrmap="map" hson-foo="ordinary"/>`,
      ),
      ordinaryColonized: compare(`<main a:b="ordinary"/>`),
    } satisfies Record<string, SanitizerMetadataCase>;
    root.dataset.fixtureState = "complete";
    return result;
  } catch (error) {
    root.dataset.fixtureState = "failed";
    root.dataset.fixtureError = error_message(error);
    throw error;
  }
}
