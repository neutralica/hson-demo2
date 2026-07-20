import { performance } from "node:perf_hooks";
import { JSDOM } from "jsdom";
import { hson, make_sanitizer } from "hson-live";
import { with_hosted_dom_runtime } from "../../hosted-test/dom/hosted-dom-mutex";

function expect_sanitizer(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted sanitizer: ${message}`);
}

expect_sanitizer(typeof window === "undefined", "hson-live imports without ambient window access");
const domA = new JSDOM("<!doctype html><p>A</p>");
const domB = new JSDOM("<!doctype html><p>B</p>");
const started = performance.now();
const sanitizerA = make_sanitizer(domA.window as unknown as Window);
const sanitizerConstructionMs = performance.now() - started;
const sanitizerAAgain = make_sanitizer(domA.window as unknown as Window);
const sanitizerB = make_sanitizer(domB.window as unknown as Window);
expect_sanitizer(sanitizerA === sanitizerAAgain, "one window reuses its WeakMap-cached sanitizer");
expect_sanitizer(sanitizerA !== sanitizerB, "different windows receive distinct sanitizers");
expect_sanitizer(sanitizerA.sanitize("<script>x</script><b>A</b>").includes("<b>A</b>"), "window A sanitizer is operational");
domA.window.close();
expect_sanitizer(sanitizerB.sanitize("<i>B</i>") === "<i>B</i>", "disposing window A cannot rebind window B");
domB.window.close();

let documentA: Document | undefined;
await with_hosted_dom_runtime((runtime) => {
  documentA = runtime.document;
  const branch = hson.liveTree.fromUntrustedHtml("<article id='safe'><span id='safe-child'>ok</span><script>bad()</script></article>");
  branch.find.must.byId("safe-child").classlist.add("seen");
  branch.attrs.set("data-after", "ok");
  expect_sanitizer(
    branch.id.get() === "safe"
      && branch.find.must.byId("safe-child").classlist.has("seen")
      && branch.attrs.get("data-after") === "ok"
      && !branch.content.markup.outerHTML.includes("script"),
    "fromUntrustedHtml returns a mutable sanitized branch",
  );
});
await with_hosted_dom_runtime((runtime) => {
  expect_sanitizer(runtime.document !== documentA, "the next action owns a fresh document");
  const branch = hson.liveTree.fromUntrustedHtml("<section id='next'>next</section>");
  expect_sanitizer(branch.id.get() === "next", "the next action resolves its current window sanitizer");
});
expect_sanitizer(typeof window === "undefined" && typeof document === "undefined", "sanitizer runs leave no hosted DOM globals");

console.log(JSON.stringify({ sanitizerConstructionMs }));
