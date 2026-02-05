// console.ts

import type { LiveTree } from "hson-live";
import type { TestEvent, TestFailure, TestSummary } from "../../tests/tests.types";
import { _freeze } from "../../fixtures/generate-fixtures";

export type ConsoleLevel = "quiet" | "normal" | "verbose" | "v2";

export const CONSOLE_LEVELS: readonly ConsoleLevel[] = _freeze([
  "quiet",
  "normal",
  "verbose",
  "v2",
] as const);

export type ConsoleUi = Readonly<{
  setLevel: (lvl: ConsoleLevel) => void;
  onEvent: (e: TestEvent) => void;
  onSummary: (s: TestSummary) => void;
  showFailure: (f: TestFailure) => void;
  clear: () => void;
}>;

export function create_console(host: LiveTree): ConsoleUi {
  let level: ConsoleLevel = "normal";
  let buf = ""; // CHANGED: internal buffer; no getText needed

  const root = host.create.div().setAttrs("class", "console");
  const header = root.create.div().setAttrs("class", "cons-header");
  const status = header.create.div().setAttrs("class", "cons-status").setText("tests: idle");
  const chips = header.create.div().setAttrs("class", "cons-chips").setText("—");
  const body = root.create.div().setAttrs("class", "cons-body").setText("");

  root.css.setMany({
    display: "grid",
    gap: "8px",
    padding: "10px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "12px",
    lineHeight: "1.35",
    userSelect: "text",
    minHeight: "0",
    minWidth: "0",
  });

  const setChips = (s: TestSummary): void => {
    chips.setText(`pass ${s.pass}  fail ${s.fail}  skip ${s.skip}  total ${s.cases}  ${s.msTotal.toFixed(1)}ms`);
  };

  const flush = (): void => {
    body.setText(buf);
  };

  const writeLine = (t: string): void => {
    if (level === "quiet") return;
    buf = buf.length ? `${buf}\n${t}` : t;
    flush();
  };

  return {
    setLevel: (lvl) => { level = lvl; },

    onEvent: (e) => {
      switch (e.t) {
        case "suite_begin":
          status.setText(`suite: ${e.suite}`);
          if (level === "verbose") writeLine(`BEGIN suite ${e.suite} (${e.totalPlanned ?? "?"} planned)`);
          return;

        case "case_begin":
          if (level === "verbose") writeLine(`… ${e.suite} :: ${e.name}`);
          return;

        case "case_end":
          if (e.status === "fail") {
            writeLine(`FAIL ${e.suite} :: ${e.name} (${e.ms.toFixed(1)}ms)`);
            if (e.err) writeLine(e.err);
          } else if (level === "verbose") {
            writeLine(`PASS ${e.suite} :: ${e.name} (${e.ms.toFixed(1)}ms)`);
          }
          return;

        case "suite_end":
          if (level === "verbose") writeLine(`END suite ${e.suite} (${e.ms.toFixed(1)}ms)`);
          return;
      }
    },

    onSummary: (s) => {
      status.setText(s.fail === 0 ? "tests: green" : `tests: ${s.fail} failing`);
      setChips(s);
      if (level !== "quiet") writeLine(`DONE: ${s.cases} cases, ${s.fail} failing`);
    },

    showFailure: (f) => {
      writeLine(``);
      writeLine(`=== FAILURE ===`);
      writeLine(`${f.suite} :: ${f.name} (${f.ms.toFixed(1)}ms)`);
      writeLine(f.err);
    },

    clear: () => {
      level = level; // no-op, keeps current level
      buf = "";
      status.setText("tests: idle");
      chips.setText("—");
      body.setText("");
    },
  };
}