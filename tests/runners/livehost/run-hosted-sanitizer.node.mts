import { hson } from "hson-live";
import { with_hosted_dom_runtime } from "../../harness/runtimes/dom/hosted-dom-mutex";

function expect_sanitizer(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`hosted sanitizer: ${message}`);
}

expect_sanitizer(typeof window === "undefined", "hson-live imports without ambient window access");

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

console.log(JSON.stringify({ sanitizer: "public ingress" }));
