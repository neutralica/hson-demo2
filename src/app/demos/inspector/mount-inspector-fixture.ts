import { hson } from "hson-live";
import type { LiveInspector, LiveMap } from "hson-live";
import type { LiveTree } from "hson-live";

export type InspectorFixture = Readonly<{
  root: LiveTree;
  source: LiveMap;
  inspector: LiveInspector;
  dispose: () => void;
}>;

/** Restrained development fixture for examining Patch 7B's neutral grammar. */
export function mount_inspector_fixture(host: LiveTree): InspectorFixture {
  const root = host.create.section();
  root.attr.set("data-demo-inspector-fixture", "true");
  const heading = root.create.h2();
  heading.text.set("Structured data inspector fixture");
  const commands = root.create.div();
  commands.attr.set("aria-label", "External source commands");
  const inspectorHost = root.create.div();
  const output = root.create.pre();
  output.attr.set("aria-live", "polite");

  let source = makeSource("primary");
  const inspector = hson.inspect.create({
    source,
    host: inspectorHost,
    initialDepth: 2,
    arrayKey: (item) => typeof item === "object" && item !== null && !Array.isArray(item)
      ? item.id as string | undefined
      : undefined,
  });

  const command = (label: string, run: () => void): void => {
    const button = commands.create.button();
    button.text.set(label);
    button.listen.onClick(run);
  };
  const replaceFixture = (label: string, next: LiveMap): void => {
    const started = performance.now();
    source = next;
    inspector.replaceSource(source);
    const elapsedMs = performance.now() - started;
    output.text.set(JSON.stringify({
      fixture: label,
      replaceAndMaterializeMs: Number(elapsedMs.toFixed(2)),
      diagnostics: inspector.diagnostics(),
    }, null, 2));
  };
  command("Change external value", () => source.set(["profile", "visits"], Number(source.snap(["profile", "visits"])) + 1));
  command("Move keyed item", () => source.at(["items"]).array.move(1, 0));
  command("Select profile", () => inspector.select(["profile"]));
  command("Collapse or expand", () => inspector.toggle(["items"]));
  command("Convert selection", () => output.text.set(inspector.serialize("json")));
  command("Replace snapshot source", () => {
    replaceFixture("replacement", makeSource("replacement"));
  });
  command("Create 100 properties", () => replaceFixture("object-100", makeFlatObject(100)));
  command("Create 1,000 properties", () => replaceFixture("object-1000", makeFlatObject(1_000)));
  command("Create 1,000 keyed items", () => replaceFixture("keyed-array-1000", makeKeyedArray(1_000)));
  command("Show diagnostics", () => output.text.set(JSON.stringify(inspector.diagnostics(), null, 2)));

  let disposed = false;
  return Object.freeze({
    root,
    get source() { return source; },
    inspector,
    dispose() {
      if (disposed) return;
      disposed = true;
      inspector.dispose();
      if (!root.isDisposed) root.remove();
    },
  });
}

function makeSource(snapshot: string): LiveMap {
  return hson.liveMap.fromJson({
    snapshot,
    profile: { name: "Ada", visits: 3, active: true },
    items: [
      { id: "alpha", label: "Alpha" },
      { id: "beta", label: "Beta" },
    ],
    empty: {},
  });
}

function makeFlatObject(size: number): LiveMap {
  return hson.liveMap.fromJson(Object.fromEntries(
    Array.from({ length: size }, (_, index) => [`property-${index}`, index]),
  ));
}

function makeKeyedArray(size: number): LiveMap {
  return hson.liveMap.fromJson({
    items: Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, value: index })),
  });
}
