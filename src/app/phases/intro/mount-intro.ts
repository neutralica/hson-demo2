// intro.ts

import type { LiveTree } from "hson-live";
import { relay, void_sync, type Outcome } from "intrastructure";
import { bckColor } from "../splash/types-consts/css.consts";
import { attach_error_underline } from "./error-underline";

export function mount_intro(stage: LiveTree): boolean {
  const logoBox = stage.create.div().id.set("logo-box").css.setMany({
    height: "2rem",
    position: "absolute",
    bottom: "2rem",
    right: "2rem",
    overflowX: "hidden",
    overflowY: "hidden",
    color: "white",
    width: "15ch",
    backgroundColor: bckColor,
    fontFamily: `monospace`,
  });
  logoBox.css.keyframes.set({
    name: 'logo-fade',
    steps: {
      "0%": {opacity: "0"},
      "02%": {opacity: "0"},
      "08%": {opacity: "1"},
      "25%": {opacity: "1"},
      "95%": {opacity: "0"},
      "100%": {opacity: "0"},
    
    }
  })
logoBox.css.anim.begin({
    name: 'logo-fade',
  duration: '3000ms',
    timingFunction: "linear"
  })
  console.log(logoBox.node)
  const $T$G = logoBox.create.div().setText("TERMINAL_GOTHIC")
  attach_error_underline(logoBox)
  return true;

  // return void_sync(() => {
  // // container
  // const intro = stage.create.section().id.set("intro").classlist.set(["intro", "wwot"]);

  // // two-column layout: chaos text left, logo right
  // const grid = intro.create.div().classlist.set(["intro-grid"]);

  // const left = grid.create.div().classlist.set(["intro-left"]);
  // const right = grid.create.aside().classlist.set(["intro-right"]);

  // // RIGHT: logo placeholder (you'll replace later)
  // right.create.div().classlist.set(["logo-box"]);
  // right.create.div().classlist.set(["logo-label"]).setText("LOGO GOES HERE");
  // right.create.div().classlist.set(["logo-sub"]).setText("typographic mark / wordmark");

  // // LEFT: intentionally chaotic WWOT
  // left.create.h2().classlist.set(["wwot-title"]).setText("HSON LIVE / INTRASTRUCTURE");
  // left.create.p().classlist.set(["wwot-lede"]).setText(
  //   "This is intentionally a broken, hostile wall of text. It is not a design. It is a warning."
  // );

  // const blob = left.create.div().classlist.set(["wwot-blob"]);

  //     // A few different “voices” / chunks to feel messy
  //     add_chunk(blob,
  //       "BOOTSTRAP SEQUENCE: parse → hydrate → canonical node graph → projection (DOM optional) → mutation-by-reference."
  //     );
  //     add_chunk(blob,
  //       "OUTCOME CONTRACT: success|fail, payload|noval, trace-not-message-snowball. Errors are artifacts. Blame is metadata."
  //     );
  //     add_chunk(blob,
  //       "LIVE TREE: find/create/listen/style/css/data/attrs/flags — no document.* escape hatches. Data === view (mostly)."
  //     );
  //     add_chunk(blob,
  //       "WARNING: this page is deliberately ugly. Typography is unstable. Layout is slightly wrong. Everything looks like it is about to fall apart."
  //     );

  //     // Scatter some “broken” elements: inline code shards, fake warnings, random dividers
  //     const shards = blob.create.div().classlist.set(["wwot-shards"]);
  //     for (let i = 0; i < 14; i += 1) {
  //       shards
  //         .create.span()
  //         .classlist.set(["shard"])
  //         .setText(pick(SHARD_TEXT, i));
  //       if (i % 3 === 2) shards.create.br();
  //     }

  //     // Fake “system log” chunk
  //     const log = left.create.pre().classlist.set(["wwot-log"]);
  //     log.setText(
  // `[boot] hson-live :: init
  // [boot] parse(phtml) -> xml -> nodes
  // [boot] project(dom) -> optional
  // [warn] css manager: rule batching enabled
  // [warn] outcome: void-success is distinct
  // [ok]  system nominal*
  // [ok]  *nominal is a lie`
  //     );

  //     // Quick, ugly CSS via QUID-scoped css (keeps DOM calls out)
  //     // This is intentionally “bad design”: awkward spacing, harsh borders, inconsistent type.
  //     // It only targets this intro subtree via its QUID attribute selectors.
  //     intro.css.setMany({
  //       display: "block",
  //       background: "white",
  //       color: "black",
  //       padding: "18px",
  //       border: "2px solid black",
  //       boxSizing: "border-box",
  //       fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  //     });

  //     grid.css.setMany({
  //       display: "grid",
  //       gridTemplateColumns: "1fr 260px",
  //       gap: "16px",
  //       alignItems: "start",
  //     });

  //     left.css.setMany({
  //       border: "1px dashed black",
  //       padding: "10px",
  //       minHeight: "340px",
  //     });

  //     right.css.setMany({
  //       border: "3px double black",
  //       padding: "10px",
  //       position: "sticky",
  //       top: "12px",
  //     });

  //     // Make the logo area loud and “placeholder-y”
  //     const logoBox = right.find({ attrs: { class: "logo-box" } });
  //     if (logoBox) {
  //       logoBox.css.setMany({
  //         height: "140px",
  //         border: "2px solid black",
  //         background: "white",
  //         marginBottom: "8px",
  //       });
  //     }

  //     const title = left.find({ attrs: { class: "wwot-title" } });
  //     if (title) {
  //       title.css.setMany({
  //         margin: "0 0 8px 0",
  //         fontSize: "20px",
  //         letterSpacing: "1px",
  //         textTransform: "uppercase",
  //       });
  //     }

  //     const lede = left.find({ attrs: { class: "wwot-lede" } });
  //     if (lede) {
  //       lede.css.setMany({
  //         margin: "0 0 10px 0",
  //         fontSize: "12px",
  //         lineHeight: "1.35",
  //         borderLeft: "6px solid black",
  //         paddingLeft: "10px",
  //       });
  //     }

  //     const blobLt = left.find({ attrs: { class: "wwot-blob" } });
  //     if (blobLt) {
  //       blobLt.css.setMany({
  //         borderTop: "1px solid black",
  //         paddingTop: "10px",
  //         fontSize: "12px",
  //         lineHeight: "1.25",
  //       });
  //     }

  //     const shardsLt = left.find({ attrs: { class: "wwot-shards" } });
  //     if (shardsLt) {
  //       shardsLt.css.setMany({
  //         display: "block",
  //         marginTop: "12px",
  //         border: "1px dotted black",
  //         padding: "8px",
  //       });
  //     }

  //     // Make shards look broken/overprinted
  //     const shardSel = left.findAll({ attrs: { class: "shard" } });
  //     shardSel.forEach(sh => sh.classlist.add("shard"));
  //     shardSel.css.setMany({
  //       display: "inline-block",
  //       padding: "2px 4px",
  //       margin: "2px",
  //       border: "1px solid black",
  //       transform: "rotate(-1deg)",
  //       whiteSpace: "nowrap",
  //     });

  //     log.css.setMany({
  //       marginTop: "12px",
  //       padding: "10px",
  //       border: "2px solid black",
  //       background: "white",
  //       fontSize: "11px",
  //       lineHeight: "1.2",
  //       overflow: "auto",
  //       maxHeight: "160px",
  //     });
  //   }, "mount_intro");
}

function add_chunk(parent: LiveTree, text: string): void {
  const p = parent.create.p().classlist.set(["wwot-chunk"]);
  p.setText(text);
  p.css.setMany({
    margin: "0 0 8px 0",
    borderBottom: "1px dashed black",
    paddingBottom: "6px",
  });
}

const SHARD_TEXT: string[] = [
  "UNSAFE MODE",
  "NO DOM",
  "XML PARSER",
  "QUID",
  "NODE GRAPH",
  "TRACE≠MESSAGE",
  "$NOVAL",
  "void success",
  "failErr",
  "css:batch",
  "mutation",
  "projection",
  "hydrate",
  "graft()",
  "findAll()",
  "setMany()",
];

function pick(arr: string[], i: number): string {
  return arr[i % arr.length] ?? "";
}

