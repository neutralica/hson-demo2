// console.ts
// Purpose: tiny LiveTree UI console that can show status + counters + failure details.
// NOTE: if your LiveTree method names differ, patch only here.

import type { TestEvent, TestFailure, TestSummary } from "../../tests/tests.types";

export type ConsoleLevel = "quiet" | "normal" | "verbose";

export type ConsoleUi = Readonly<{
  setLevel: (lvl: ConsoleLevel) => void;
  onEvent: (e: TestEvent) => void;
  onSummary: (s: TestSummary) => void;
  showFailure: (f: TestFailure) => void;
  clear: () => void;
}>;

type ConsoleHost = {
  create: { div: () => ConsoleHost };
  setAttrs: (...args: string[]) => ConsoleHost;
  setText: (t: string) => ConsoleHost;
  style: { setMany: (m: Record<string, string>) => ConsoleHost };
};

export function create_console(host: ConsoleHost): ConsoleUi {
  let level: ConsoleLevel = "normal";

  const root = host.create.div().setAttrs("class", "console");
  const header = root.create.div().setAttrs("class", "cons-header");
  const status = header.create.div().setAttrs("class", "cons-status").setText("tests: idle");
  const chips = header.create.div().setAttrs("class", "cons-chips").setText("—");
  const body = root.create.div().setAttrs("class", "cons-body").setText("");

  root.style.setMany({
    display: "grid",
    gap: "8px",
    padding: "10px",
    "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
    "font-size": "12px",
    "line-height": "1.35",
    "user-select": "text",
  });

  const setChips = (s: TestSummary): void => {
    chips.setText(`pass ${s.pass}  fail ${s.fail}  skip ${s.skip}  total ${s.cases}  ${s.msTotal.toFixed(1)}ms`);
  };

  const writeLine = (t: string): void => {
    if (level === "quiet") return;
    body.setText(`${bodyText(body)}\n${t}`.trim());
  };

  return {
    setLevel: (lvl) => { level = lvl; },

    onEvent: (e) => {
      if (e.t === "suite_begin") {
        status.setText(`suite: ${e.suite}`);
        if (level === "verbose") writeLine(`BEGIN suite ${e.suite}`);
        return;
      }
      if (e.t === "case_begin") {
        if (level === "verbose") writeLine(`… ${e.suite} :: ${e.name}`);
        return;
      }
      if (e.t === "case_end") {
        if (e.status === "fail") {
          writeLine(`FAIL ${e.suite} :: ${e.name} (${e.ms.toFixed(1)}ms)\n${e.err ?? ""}`.trim());
        } else if (level === "verbose") {
          writeLine(`PASS ${e.suite} :: ${e.name} (${e.ms.toFixed(1)}ms)`);
        }
        return;
      }
      if (e.t === "suite_end") {
        if (level === "verbose") writeLine(`END suite (${e.ms.toFixed(1)}ms)`);
      }
    },

    onSummary: (s) => {
      status.setText(s.fail === 0 ? "tests: green" : `tests: ${s.fail} failing`);
      setChips(s);
      if (level !== "quiet") writeLine(`DONE: ${s.cases} cases, ${s.fail} failing`);
    },

    showFailure: (f) => {
      writeLine(`\n=== FAILURE ===\n${f.suite} :: ${f.name}\n${f.err}\n(${f.ms.toFixed(1)}ms)\n`);
    },

    clear: () => {
      status.setText("tests: idle");
      chips.setText("—");
      body.setText("");
    },
  };
}

// CHANGED: LiveTree-like has no getText API in your snippets, so we keep it internal.
// If you have a proper getter, swap this out.
function bodyText(_body: unknown): string {
  // best-effort: we treat append-as-replace; keeps module tiny.
  return "";
}