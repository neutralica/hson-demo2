import { hson } from "hson-live";
import type { LoopReport } from "../../../hson-live/dist/diagnostics/loop-3.test";
import type { CaseKey } from "./tests.types";
import { $cols } from "../app/consts/colors.consts";

type ReportHtml = Readonly<{ title: string; html: string }>;

function escape_html(s: string): string {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll(`"`, "&quot;")
        .replaceAll("'", "&#39;");
}

export function render_report_html(
    key: CaseKey,
    name: string,
    suite: string,
    report: LoopReport,
): ReportHtml {
    const title = `[HSON capture] ${suite} :: ${name}`;
    const testKey = name.split("|");
    const cat = testKey[0];
    const val = testKey[1] || null;
    if (testKey[2]) { console.warn('extra pipe found in key string') };

    const traceRows = (report.trace ?? []).map((t, i) => {
        const step = escape_html(String(t.step ?? ""));
        const ok = t.ok ? "ok" : "fail";
        return `<tr>
      <td class="idx">${i}</td>
      <td class="ok ${ok}">${ok}</td>
      <td class="step">${step}</td>
    </tr>`;
    }).join("");

    // artifacts grouped by lap
    const arts = report.artifacts ?? [];
    const byLap = new Map<number, typeof arts>();
    for (const a of arts) {
        const lap = Number(a.lap ?? 0);
        const arr = byLap.get(lap);
        if (arr) arr.push(a);
        else byLap.set(lap, [a]);
    }
    const lapKeys = [...byLap.keys()].sort((a, b) => a - b);

    const artifactCards = lapKeys.map((lap) => {
        const items = byLap.get(lap)!;

        const cards = items.map((a) => {
            const fmt = escape_html(String(a.fmt));
            const text = escape_html(String(a.text ?? ""));
            const node = escape_html(String((a as any).node ?? "")); // keep optional; huge

            return `<section class="card">
        <header class="cardHead">
          <div class="fmt">${fmt}</div>
          <div class="meta">lap ${lap}</div>
        </header>

        <details open>
          <summary>artifact text</summary>
          <pre class="pre">${text}</pre>
        </details>

        ${node ? `
        <details>
          <summary>node snapshot</summary>
          <pre class="pre">${node}</pre>
        </details>` : ""}
      </section>`;
        }).join("");

        return `<h3 class="lapTitle">lap ${lap}</h3>
      <div class="grid">${cards}</div>`;
    }).join("");

    const head = `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escape_html(title)}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; padding: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px; line-height: 1.35;
      background: ${$cols.backdeep}; color: #e9e9ee;
    }
    .top {
      display: grid; gap: 10px;
      grid-template-columns: 1fr 3fr;
      margin-bottom: 12px;
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
    .pre {
      margin: 8px 0 0 0;
      padding: 10px;
      border-radius: 8px;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.08);
      overflow: auto;
      max-height: 42vh;
      white-space: pre;
    }
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

    const body = `
  <div class="top">
    <div>
    <hr></hr>
    <h2>${escape_html(suite)}::</h2>
    <h1>${escape_html(name)}</h1>
    <h2>3-way test - full loop analysis</h2>
    <hr></hr>
      <div class="pillRow">
        <div class="pill">key: ${escape_html(key)}</div>
        <div class="pill">ok: ${String(report.ok)}</div>
        <div class="pill">entry: ${escape_html(String(report.entry))}</div>
        <div class="pill">dir: ${escape_html(String(report.dir))}</div>
        <div class="pill">times: ${String(report.times)}</div>
        <div class="pill">failures: ${String(report.failures?.length ?? 0)}</div>
      </div>
    </div>

    <div class="traceWrap">
      <details ${report.trace?.length ? "open" : ""}>
        <summary>trace (${report.trace?.length ?? 0})</summary>
        <div style="overflow:auto; max-height: 40vh;">
          <table>
            <thead><tr><th>#</th><th>ok</th><th>step</th></tr></thead>
            <tbody>${traceRows || `<tr><td class="small" colspan="3">no trace</td></tr>`}</tbody>
          </table>
        </div>
      </details>
    </div>
  </div>

  ${artifactCards || `<div class="small">no artifacts captured</div>`}
  `;
    // console.log(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`)
    return { title, html: `<html><head>${head}</head><body>${body}</body></html>` };
}


// CHANGED: open HTML report in a separate document via Blob URL
export function open_report_window(htmlDoc: string): void {
    const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // open new tab/window showing that document
    const w = window.open(url, "_blank");

    // cleanup: revoke after a bit (enough time for navigation)
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);

    if (!w) console.warn("[capture:view] popup blocked");
}