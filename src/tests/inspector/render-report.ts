
import type { LoopReport, Artifact } from "../../../../hson-live/dist/types/diagnostics.types";
import { _cols } from "../../app/core/consts/colors.consts";
import { _freeze } from "../../app/demos/test/tests.consts";
import type { CaseKey, CaseMeta } from "../../app/demos/test/tests.types";
import { render_livetree_report } from "./report-livetree";


type ReportHtml = Readonly<{ title: string; html: string }>;

export function escape_html(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(`"`, "&quot;")
    .replaceAll("'", "&#39;");
}
// refactor into “model then render” so later we can swap the renderer to HSON-authored
type ReportViewModel = Readonly<{
  title: string;
  pills: readonly string[];
  traceRowsHtml: string;
  failuresHtml: string;
  artifactCards: string;
}>;

function build_report_view_model(
  key: CaseKey,
  name: string,
  suite: string,
  report: LoopReport,
): ReportViewModel {
  const title = `[HSON capture] ${suite} :: ${name}`;

  // keep summary pills in one place (same info as report_to_text, plus key)
  const pills = _freeze([
    `ok: ${String(report.ok)}`,
    `entry: ${String(report.entry)}`,
    `dir: ${String(report.dir)}`,
    `times: ${String(report.times)}`,
    `failures: ${String(report.failures?.length ?? 0)}`,
    // placeholder hooks:
    `hash: —`,
    `norm: —`,
  ]);

  // trace table rows (same semantics as text)
  const trace = report.trace ?? [];
  const traceRowsHtml = trace.map((t, i) => {
    const step = escape_html(String(t.step ?? ""));
    const ok = t.ok ? "ok" : "fail";
    // NOTE: LoopReport trace entries sometimes carry .error
    const detail = (t as any).error ? escape_html(String((t as any).error)) : "";
    return `<tr>
      <td class="idx">${i}</td>
      <td class="ok ${ok}">${ok}</td>
      <td class="step">${step}${detail ? ` <span class="small">— ${detail}</span>` : ""}</td>
    </tr>`;
  }).join("");

  // ADDED: failures table/list (your HTML view currently doesn’t show them explicitly)
  const failures = report.failures ?? [];
  const failuresHtml = failures.length
    ? `<details open>
        <summary>failures (${failures.length})</summary>
        <div style="overflow:auto; max-height: 26vh;">
          <table>
            <thead><tr><th>#</th><th>step</th><th>error</th></tr></thead>
            <tbody>
              ${failures.map((f, i) => {
      const step = escape_html(String(f.step ?? ""));
      const err = escape_html(String((f as any).error ?? "—"));
      return `<tr>
                  <td class="idx">${i}</td>
                  <td class="step">${step}</td>
                  <td class="small">${err}</td>
                </tr>`;
    }).join("")}
            </tbody>
          </table>
        </div>
      </details>`
    : `<div class="small">no failures</div>`;

  const arts = report.artifacts ?? [];

  // Build a stable list of unique (lap, fmt) keys in first-seen order.
  const keyOrder: string[] = [];
  const buckets = new Map<string, Artifact[]>();

  for (const a of arts) {
    const lap = Number(a.lap ?? 0);
    const fmt = String(a.fmt ?? "—");
    const k = `${lap}::${fmt}`;
    if (!buckets.has(k)) {
      buckets.set(k, []);
      keyOrder.push(k);
    }
    buckets.get(k)!.push(a);
  }

  // Split into cw and ccw sequences by “first artifact in bucket = cw, second = ccw”.
  // (If a bucket has 1 item, treat it as cw-only.)
  const cwByLap = new Map<number, Artifact[]>();
  const ccwByLap = new Map<number, Artifact[]>();

  const pushLap = (m: Map<number, Artifact[]>, lap: number, a: Artifact): void => {
    const arr = m.get(lap);
    if (arr) arr.push(a);
    else m.set(lap, [a]);
  };

  for (const k of keyOrder) {
    const [lapStr] = k.split("::");
    const lap = Number(lapStr);
    const items = buckets.get(k)!;

    if (items[0]) pushLap(cwByLap, lap, items[0]);
    if (items[1]) pushLap(ccwByLap, lap, items[1]);
  }

  // Ensure laps render in numeric order.
  const lapKeys = (m: Map<number, Artifact[]>): number[] =>
    [...m.keys()].sort((a, b) => a - b);

  // inside render_report_html(), replace the cards map with this
  // Fixed fmt order inside each lap (optional, but improves readability)
  const fmtRank = (fmt: string): number => {
    if (fmt === "json") return 1;
    if (fmt === "html") return 2;
    if (fmt === "hson") return 3;
    return 9;
  };

  const renderLap = (lap: number, items: readonly Artifact[]): string => {
    // Sort within lap by fmt (json/html/hson), otherwise preserve original.
    const sorted = [...items].sort((a, b) => {
      const ra = fmtRank(String(a.fmt));
      const rb = fmtRank(String(b.fmt));
      if (ra !== rb) return ra - rb;
      return String(a.fmt).localeCompare(String(b.fmt));
    });

    const cards = sorted.map((a) => {
      // render both views; toggle chooses which is visible.
      // single copy button copies *current* view (text or node).
      const fmt = escape_html(String(a.fmt));
      const text = escape_html(String(a.text ?? ""));
      const nodeRaw = String((a as any).node ?? "");           // keep optional
      const node = escape_html(nodeRaw);

      return `
      <section class="card artCard" data-mode="text">
  <header class="cardHead">
    <div class="fmt">${fmt}</div>
    <div class="meta">lap ${lap}</div>
  </header>

  <div class="cardTools">
    <div class="seg">
      <button class="btn" data-action="mode" data-mode="text">text</button>
      <button class="btn" data-action="mode" data-mode="node" ${nodeRaw ? "" : "disabled"}>node</button>
    </div>
    <button class="btn" data-action="copy">copy</button>
  </div>
<div class="viewBox">
  <pre class="pre viewText" data-view="text">${text}</pre>
  <pre class="pre viewNode" data-view="node">${nodeRaw ? node : "— no node snapshot —"}</pre>
  </div>
</section>`;
    }).join("");

    return `<h3 class="lapTitle">lap ${lap}</h3>
    <div class="grid">${cards}</div>`;
  };

  const renderDir = (dirLabel: string, m: Map<number, Artifact[]>): string => {
    const laps = lapKeys(m);
    if (!laps.length) return `<div class="small">no ${escape_html(dirLabel)} artifacts captured</div>`;

    const out = laps.map((lap) => renderLap(lap, m.get(lap)!)).join("");
    return `<section style="margin-top: 14px;">
    <h2 style="margin: 0 0 8px 0;">${escape_html(dirLabel)}</h2>
    ${out}
  </section>`;
  };

  // Two linear stories:
  const artifactCards = `
  ${renderDir("clockwise (cw)", cwByLap)}
  ${renderDir("counterclockwise (ccw)", ccwByLap)}
`;

  return _freeze({
    title,
    pills,
    traceRowsHtml,
    failuresHtml,
    artifactCards,
  });
}

export function render_report_html(
  key: CaseKey,
  name: string,
  suite: string,
  report: LoopReport,
  meta?: CaseMeta,
): ReportHtml {
  if (suite.startsWith("livetree/")) {
    return render_livetree_report(key, name, suite, report, meta);
  }
  return render_transform_report(key, name, suite, report, meta);
}
export function render_transform_report(
  key: CaseKey,
  name: string,
  suite: string,
  report: LoopReport,
  meta?: CaseMeta,
): ReportHtml {
  // build model first
  const m = build_report_view_model(key, name, suite, report);
  const failuresRows = (report.failures ?? []).map((f, i) => `
  <tr>
    <td class="idx">${i}</td>
    <td class="step">${escape_html(String(f.step ?? ""))}</td>
    <td class="small">${escape_html(String(f.error ?? ""))}</td>
  </tr>
`).join("");

  const failHtml = `
<div class="traceWrap">
  <details ${(report.failures?.length ?? 0) ? "open" : ""}>
    <summary>failures (${report.failures?.length ?? 0})</summary>
    <div style="overflow:auto; max-height: 40vh;">
      <table>
        <thead><tr><th>#</th><th>step</th><th>error</th></tr></thead>
        <tbody>${failuresRows || `<tr><td class="small" colspan="3">no failures</td></tr>`}</tbody>
      </table>
    </div>
  </details>
</div>
`;

  const head = `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escape_html(m.title)}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; padding: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px; line-height: 1.35;
      background: ${_cols.backhi}; color: #e9e9ee;
    }
    .top{
  display:grid;
  gap:10px;
  grid-template-columns: 1fr 2fr 2fr; /* details | steps | failures */
  align-items:start;
  margin-bottom:12px;
}
@media (max-width: 1100px){
  .top{ grid-template-columns: 1fr; }
}
     .cardTools{
    display:flex; justify-content:space-between; align-items:center;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.02);
    gap: 10px;
  }
  .seg{ display:flex; gap:6px; }
  .btn{
    padding:4px 8px; border-radius:8px;
    border:1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: inherit;
    cursor:pointer;
    user-select:none;
    font: inherit;
  }
.artCard { position: relative; }

.artCard .viewBox{
  position: relative;
  height: 22vh;
  min-height: 180px;
  overflow: hidden;         /* containment */
  padding: 8px 10px;
}

.artCard .viewBox > .pre[data-view]{
  position: absolute;
  inset: 0;
  overflow: auto;
  white-space: pre;
}
.artCard[data-mode="text"] .pre[data-view="text"] { display: block; }
.artCard[data-mode="node"] .pre[data-view="node"] { display: block; }
   .artCard[data-mode="text"] [data-view="node"]{ display:none; }
  .artCard[data-mode="node"] [data-view="text"]{ display:none; }
 .artCard[data-mode="text"] .btn[data-mode="text"],
  .artCard[data-mode="node"] .btn[data-mode="node"]{
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.20);
  }
  .btn[disabled]{ opacity:0.4; cursor:not-allowed; }

    .btn:hover { background: rgba(255,255,255,0.10); }
    .btn:active { transform: translateY(1px); }
    .btn.on {
      background: rgba(255,255,255,0.14);
      border-color: rgba(0,255,255,0.42);
    }

    .viewPane { display: none; }
    .viewPane.on { display: block; }
.finalGrid{
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
}
@media (max-width: 1100px){ .finalGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 720px){ .finalGrid{ grid-template-columns: 1fr; } }
    /* fixed-ish height so toggling doesn’t explode the layout */
    .pre {
      margin: 0;
      padding: 10px;
      border-radius: 8px;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.08);
      overflow: auto;
      max-height: 42vh;
      white-space: pre;
    }
    .pillRow { display: flex; flex-direction: column; flex-wrap: wrap; gap: 8px; }
    .pill {
      padding: 4px 8px; border-radius: 999px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.10);
      white-space: nowrap;
    }
    h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 700; }
    h2 { margin: 0 0 6px 0; font-size: 13px; font-weight: 700; }
    h3 { margin: 14px 0 8px 0; font-size: 12px; font-weight: 700; opacity: 0.9; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 1100px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      overflow: hidden;
    }
    .cardHead {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
    }
    .fmt { font-weight: 700; }
    .meta { opacity: 0.7; }
    details { padding: 8px 10px; }
    summary { cursor: pointer; user-select: none; opacity: 0.9; }
    .traceWrap {
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.07); }
    th { text-align: left; font-weight: 700; background: rgba(255,255,255,0.03); }
    td.idx { width: 5ch; opacity: 0.7; }
    td.ok { width: 7ch; font-weight: 700; }
    td.ok.ok { color: #87f7a6; }
    td.ok.fail { color: #ff6b6b; }
    td.step { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .small { opacity: 0.75; }
  </style>`;

  const pillsHtml = m.pills.map(p => `<div class="pill">${escape_html(p)}</div>`).join("");
  /* unused; delete */
  const entryBlock = `
  <section class="traceWrap" style="margin: 12px 0;">
    <details open>
      <summary>entry</summary>
      <pre class="pre">${escape_html(String(report.entry ?? "—"))}</pre>
    </details>
  </section>
`;
  const input = meta?.input ?? meta?.fixture ?? "unk";


  const finalsBlock = `
<section class="traceWrap" style="margin: 12px 0;">
  <details open>
    <summary>final outputs</summary>
    <div style="padding: 8px 10px;">

      <div class="finalGrid">

        <section class="artCard" data-mode="text">
          <header class="cardHead">
            <div class="fmt">input</div>
            <div class="meta">
              <button class="btn" data-action="copy">copy</button>
            </div>
          </header>
          <div class="viewBox">
            <pre class="pre" data-view="text">${escape_html(input || "—")}</pre>
            <pre class="pre" data-view="node" style="display:none;"></pre>
          </div>
        </section>

        <section class="artCard" data-mode="text">
          <header class="cardHead">
            <div class="fmt">final ${report.final ? `(${escape_html(String(report.final.fmt))})` : ""}</div>
            <div class="meta">
              <button class="btn" data-action="copy">copy</button>
            </div>
          </header>
          <div class="viewBox">
            <pre class="pre" data-view="text">${report.final ? escape_html(String(report.final.text ?? "")) : "—"}</pre>
            <pre class="pre" data-view="node" style="display:none;"></pre>
          </div>
        </section>

        ${report.dualFinals?.cw ? `
        <section class="artCard" data-mode="text">
          <header class="cardHead">
            <div class="fmt">cw final (${escape_html(String(report.dualFinals.cw.fmt))})</div>
            <div class="meta">
              <button class="btn" data-action="copy">copy</button>
            </div>
          </header>
          <div class="viewBox">
            <pre class="pre" data-view="text">${escape_html(String(report.dualFinals.cw.text ?? ""))}</pre>
            <pre class="pre" data-view="node" style="display:none;"></pre>
          </div>
        </section>` : ""}

        ${report.dualFinals?.ccw ? `
        <section class="artCard" data-mode="text">
          <header class="cardHead">
            <div class="fmt">ccw final (${escape_html(String(report.dualFinals.ccw.fmt))})</div>
            <div class="meta">
              <button class="btn" data-action="copy">copy</button>
            </div>
          </header>
          <div class="viewBox">
            <pre class="pre" data-view="text">${escape_html(String(report.dualFinals.ccw.text ?? ""))}</pre>
            <pre class="pre" data-view="node" style="display:none;"></pre>
          </div>
        </section>` : ""}

      </div>
    </div>
  </details>
</section>
`;

  // view now shows trace + failures + artifacts (same “canonical blocks” as copy)
  const body = `
  <div class="top">
    <div>
      <h2>${escape_html(suite)}::</h2>
      <h1>${escape_html(name)}</h1>
      <h2>3-way test — capture report</h2>

      <div class="pillRow">
        ${pillsHtml}
      </div>

      
    </div>

    <div class="traceWrap">
      <details ${report.trace?.length ? "open" : ""}>
        <summary>trace (${report.trace?.length ?? 0})</summary>
        <div style="overflow:auto; max-height: 40vh;">
          <table>
            <thead><tr><th>#</th><th>ok</th><th>step</th></tr></thead>
            <tbody>${m.traceRowsHtml || `<tr><td class="small" colspan="3">no trace</td></tr>`}</tbody>
          </table>
        </div>
      </details>
    </div>
        ${failHtml}
  </div>

   ${finalsBlock}

  ${m.artifactCards || "<div class='small'>no artifacts captured</div>"}
  `;

  return {
    title: m.title,
    html: `<html><head>${head}
  <script>
(() => {
  const findCard = (el) => el && el.closest && el.closest(".artCard");

  document.addEventListener("click", async (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    const action = t.getAttribute("data-action");
    if (!action) return;

    const card = findCard(t);
    if (!card) return;

    if (action === "mode") {
      const mode = t.getAttribute("data-mode");
      if (mode === "text" || mode === "node") card.setAttribute("data-mode", mode);
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }

    if (action === "copy") {
      const mode = card.getAttribute("data-mode") || "text";
      const pre = card.querySelector('[data-view="' + mode + '"]');
      const txt = pre ? pre.textContent : "";
      try {
        await navigator.clipboard.writeText(txt || "");
        t.textContent = "copied";
      } catch (e) {
        console.error(e);
        t.textContent = "failed";
      } finally {
        window.setTimeout(() => (t.textContent = "copy"), 900);
      }
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
  });
})();
</script></head><body>${body}</body></html>`
  };

}

// ADDED: minimal card body renderer (text/node toggle + copy current view)
const mk_art_block = (o: { text: string; node: string }): string => {
  // note: `text` and `node` are already escaped when passed in
  const hasNode = !!o.node;

  // Use data attributes + a tiny inline script-free trick: two <details> blocks.
  // If you already have a JS toggle, swap this to match your current UI.
  return `
    <details open>
      <summary>text</summary>
      <pre class="pre">${o.text}</pre>
    </details>

    ${hasNode ? `
    <details>
      <summary>node</summary>
      <pre class="pre">${o.node}</pre>
    </details>` : ""}
  `;
};

// open HTML report in a separate document via Blob URL
export function open_report_window(htmlDoc: string): void {
  // const html = hson.fromHson(hsonDoc).toHtml().serialize();  
  const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // open new tab/window showing that document
  const w = window.open(url, "_blank");

  // cleanup: revoke after a bit (enough time for navigation)
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);

  if (!w) console.warn("[capture:view] popup blocked");
}