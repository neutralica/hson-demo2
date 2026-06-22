

import type { LoopReport } from "hson-live/diagnostics";
import type { CaseKey, CaseMeta, TestAssertRow } from "../../app/demos/test/tests.types";
import { escape_html } from "./render-report";

export type ReportHtml = {
  title: string;
  html: string;
};
export function render_livetree_report(
  key: CaseKey,
  name: string,
  suite: string,
  report: LoopReport,
  meta?: CaseMeta,
): ReportHtml {
  const title = `[LiveTree capture] ${suite} :: ${name}`;

  let assertRows: TestAssertRow[] = [];
  try {
    assertRows = meta?.assertRows
      ? JSON.parse(meta.assertRows) as TestAssertRow[]
      : [];
  } catch {
    assertRows = [];
  }

  const pills = [
    `ok: ${String(report.ok)}`,
    `entry: ${String(report.entry)}`,
    `dir: ${String(report.dir)}`,
    `times: ${String(report.times)}`,
    `failures: ${String(report.failures?.length ?? 0)}`,
    `fixture: ${String(meta?.fixture ?? "—")}`,
    `sub: ${String(meta?.sub ?? "—")}`,
  ];

  const pillsHtml = pills
    .map((p) => `<div class="pill">${escape_html(p)}</div>`)
    .join("");

  const inputText =
    typeof meta?.input === "string" && meta.input.trim()
      ? meta.input
      : "—";

  const resultText =
    typeof meta?.preview === "string" && meta.preview.trim()
      ? meta.preview
      : "—";

  const trace = report.trace ?? [];
  const traceRowsHtml = trace.length
    ? trace.map((t, i) => {
        const step = escape_html(String(t.step ?? ""));
        const ok = t.ok ? "ok" : "fail";
        const detail = (t as any).error
          ? escape_html(String((t as any).error))
          : "";
        return `
          <tr>
            <td>${i}</td>
            <td class="${ok}">${ok}</td>
            <td>${step}</td>
            <td>${detail || "—"}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="4">—</td></tr>`;

  const failures = report.failures ?? [];
  const failuresHtml = failures.length
    ? `
      <section class="panel failPanel">
        <h2>failures</h2>
        <pre>${escape_html(JSON.stringify(failures, null, 2))}</pre>
      </section>
    `
    : "";

  const assertRowsHtml = assertRows.length
    ? `
      <section class="panel">
        <h2>assertions</h2>
        <table>
          <thead>
            <tr>
              <th>ok</th>
              <th>label</th>
              <th>actual</th>
              <th>expected</th>
            </tr>
          </thead>
          <tbody>
            ${assertRows.map((r) => `
              <tr>
                <td class="${r.ok ? "ok" : "fail"}">${r.ok ? "ok" : "fail"}</td>
                <td>${escape_html(r.label)}</td>
                <td>${escape_html(r.actual ?? "—")}</td>
                <td>${escape_html(r.expected ?? "—")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    `
    : "";

  const head = `
    <meta charset="utf-8" />
    <title>${escape_html(title)}</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #111;
        color: #ddd;
        font: 14px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      body {
        padding: 16px;
      }

      .wrap {
        display: grid;
        gap: 16px;
      }

      .title {
        margin: 0;
        font-size: 16px;
      }

      .pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .pill {
        padding: 4px 8px;
        border: 1px solid #3a3a3a;
        border-radius: 999px;
        background: #181818;
      }

      .panel {
        border: 1px solid #333;
        background: #181818;
        padding: 12px;
      }

      .failPanel {
        border-color: #6b2a2a;
        background: #221414;
      }

      h1, h2 {
        margin: 0 0 10px 0;
        font-size: 14px;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        text-align: left;
        vertical-align: top;
        padding: 6px 8px;
        border-bottom: 1px solid #2a2a2a;
      }

      .ok {
        color: #7fd48a;
      }

      .fail {
        color: #ff8b8b;
      }
    </style>
  `;

  const body = `
    <div class="wrap">
      <h1 class="title">${escape_html(title)}</h1>

      <div class="pills">${pillsHtml}</div>

      ${failuresHtml}

      <section class="panel">
        <h2>input</h2>
        <pre>${escape_html(inputText)}</pre>
      </section>

      <section class="panel">
        <h2>result</h2>
        <pre>${escape_html(resultText)}</pre>
      </section>

      ${assertRowsHtml}

      <section class="panel">
        <h2>trace</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ok</th>
              <th>step</th>
              <th>detail</th>
            </tr>
          </thead>
          <tbody>
            ${traceRowsHtml}
          </tbody>
        </table>
      </section>
    </div>
  `;

  return {
    title,
    html: `<html><head>${head}</head><body>${body}</body></html>`,
  };
}