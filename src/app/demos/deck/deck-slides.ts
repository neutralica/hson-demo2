import type { DeckSlideConfig } from "./deck.types";

export const SLIDES: readonly DeckSlideConfig[] = [
  {
    headerA: "HSON",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: "### Hypertext Structured Object Notation\na 'glue format' that unites JSON and HTML",
    },
    headerB: "hson-live",
    bodyB: {
      kind: "text",
      text: "### a typescript library containing:\n• hson.transform: a transformer set for converting data to and from JSON, HTML, and HSON\n• hson.liveTree: a responsive web authoring surface built on top of a HsonNode graph",
    },
    footer: "HSON / hson-live",
  },
  {
    headerA: "why?",
    bodyA: {
      kind: "text",
      text: "### why\nwhy.",
    },
    bodyB: {
      kind: "image",
      src: "/whah.jpg",
      alt: "whah",
    },
    footer: "whah",
  },
  {
    headerA: "about the author",
    bodyA: {
      kind: "text",
      text: "### I have no idea what I'm doing\n (figure 1: the author in his natural environment)",
    },
    bodyB: {
      kind: "image",
      src: "/pretentious-guy.jpeg",
      alt: "pretentious guy",
    },
    footer: "full disclosure",
  },
  {
    headerA: "v1 — hson.transform",
    bodyA: {
      kind: "text",
      text: `seven parsers and serializers that convert any json or xml-valid html to HsonNodes
      - tokenize_hson (HSON -> tokens)
      - parse_tokens (tokens -> HsonNode)
      - serialize_hson (HsonNode -> HSON)
      - parse_json (JSON -> HsonNode)
      - serialize_json (HsonNode -> JSON)
      - parse_html/parse_xml (HTML -> HsonNode)
      - serialize_html (HsonNode -> HTML)
transformations are stable and lossless. user data can run in loops strings through the full chain many times without degradation or distortion of user data
`
    },
    footer: "v1 / transform",
  },
  {
    headerA: "HSON syntax and relation",
    bodyA: {
      kind: "text",
      text: `
      \`\`\`json
{
  "site": {
    "title": "HSON Live",
    "version": "2.0.26",
    "theme": {
      "mode": "terminal-gothic",
      "accent": "yellowlike"
    },
    "sections": [
      {
        "id": "transform",
        "label": "hson.transform",
        "status": "stable"
      },
      {
        "id": "liveTree",
        "label": "hson.liveTree",
        "status": "active"
      },
      {
        "id": "liveMap",
        "label": "hson.liveMap",
        "status": "wip"
      }
    ]
  }
}\n\`\`\``,
    },
    bodyB: {
      kind: "text",
      text: `
      \`\`\`hson\n
<site
  <title  "HSON Live">
  <version  "2.0.26">
  <theme
    <mode  "terminal-gothic">
    <accent  "yellowlike">
  >
  <sections
    «
      <
        <id  "transform">
        <label  "hson.transform">
        <status  "stable">
      >,
      <
        <id  "liveTree">
        <label  "hson.liveTree">
        <status  "active">
      >,
      <
        <id  "liveMap">
        <label  "hson.liveMap">
        <status  "wip">
      >
    »
  >
>\n\`\`\``,
    },
    bodyC: {
      kind: "text",
      text: `\`\`\`html\n<_-obj>
<site><_-obj>
<title><_-obj>
HSON Live
</_-obj></title>
<version><_-obj>
2.0.26
</_-obj></version>
<theme><_-obj>
<mode><_-obj>
terminal-gothic
</_-obj></mode>
<accent><_-obj>
yellowlike
</_-obj></accent>
</_-obj></theme>
<sections><_-arr><_-ii data-_index="0"><_-obj>
<id><_-obj>
transform
</_-obj></id>
<label><_-obj>
hson.transform
</_-obj></label>
<status><_-obj>
stable
</_-obj></status>
</_-obj></_-ii><_-ii data-_index="1"><_-obj>
<id><_-obj>
liveTree
</_-obj></id>
<label><_-obj>
hson.liveTree
</_-obj></label>
<status><_-obj>
active
</_-obj></status>
</_-obj></_-ii><_-ii data-_index="2"><_-obj>
<id><_-obj>
liveMap
</_-obj></id>
<label><_-obj>
hson.liveMap
</_-obj></label>
<status><_-obj>
wip
</_-obj></status>
</_-obj></_-ii></_-arr></sections>
</_-obj></site>
</_-obj>\n\`\`\``,
    },
    footer: "json / hson / html",
  },
  {
    headerA: "HTML <=> HSON",
    bodyA: {
      kind: "code",
      lang: "html",
      text: `
<body id="hson-demo">
  <main class="deck">
    <section id="transform" data-status="stable">
      <h1>hson.transform</h1>
      <p>JSON, HTML, and HSON convert through one node graph.</p>
    </section>

    <section id="liveTree" data-status="active">
      <h1>hson.liveTree</h1>
      <p>The DOM is projected from a live HsonNode graph.</p>
    </section>

    <section id="liveMap" data-status="wip">
      <h1>hson.liveMap</h1>
      <p>State and view begin to share one editable source.</p>
    </section>
  </main>
</body>
`,
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: `
<body id="hson-demo"
  <main class="deck"
    <section id="transform" data-status="stable"
      <h1 "hson.transform"/>
      <p "JSON, HTML, and HSON convert through one node graph."/>
    />
    <section id="liveTree" data-status="active"
      <h1 "hson.liveTree"/>
      <p "The DOM is projected from a live HsonNode graph."/>
    />
    <section id="liveMap" data-status="wip"
      <h1 "hson.liveMap"/>
      <p "State and view begin to share one editable source."/>
    />
  />
/>
`,
    },
    footer: "transform pair / html + hson",
  },
  {
    headerA: "JSON <=> HSON",
    bodyA: {
      kind: "code",
      lang: "json",
      text: `
{
  "site": {
    "title": "HSON Live",
    "version": "2.0.26",
    "theme": {
      "mode": "terminal-gothic",
      "accent": "yellowlike"
    },
    "sections": [
      {
        "id": "transform",
        "label": "hson.transform",
        "status": "stable"
      },
      {
        "id": "liveTree",
        "label": "hson.liveTree",
        "status": "active"
      },
      {
        "id": "liveMap",
        "label": "hson.liveMap",
        "status": "wip"
      }
    ]
  }
}`,
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: `
<site
  <title  "HSON Live">
  <version  "2.0.26">
  <theme
    <mode  "terminal-gothic">
    <accent  "yellowlike">
  >
  <sections
    «
      <
        <id  "transform">
        <label  "hson.transform">
        <status  "stable">
      >,
      <
        <id  "liveTree">
        <label  "hson.liveTree">
        <status  "active">
      >,
      <
        <id  "liveMap">
        <label  "hson.liveMap">
        <status  "wip">
      >
    »
  >
>`,
    },
    footer: "transform pair / json + hson",
  },
  {
    headerA: "JSON <=> HSON <=> HTML",
    bodyA: {
      kind: "code",
      lang: "json",
      text: `
{
  "site": {
    "title": "HSON Live",
    "version": "2.0.26",
    "theme": {
      "mode": "terminal-gothic",
      "accent": "yellowlike"
    },
    "sections": [
      {
        "id": "transform",
        "label": "hson.transform",
        "status": "stable"
      },
      {
        "id": "liveTree",
        "label": "hson.liveTree",
        "status": "active"
      },
      {
        "id": "liveMap",
        "label": "hson.liveMap",
        "status": "wip"
      }
    ]
  }
}
  `,
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: `
<site
  <title  "HSON Live">
  <version  "2.0.26">
  <theme
    <mode  "terminal-gothic">
    <accent  "yellowlike">
  >
  <sections
    «
      <
        <id  "transform">
        <label  "hson.transform">
        <status  "stable">
      >,
      <
        <id  "liveTree">
        <label  "hson.liveTree">
        <status  "active">
      >,
      <
        <id  "liveMap">
        <label  "hson.liveMap">
        <status  "wip">
      >
    »
  >
>`,
    },
    bodyC: {
      kind: "code",
      lang: "html",
      text: `
<_-obj>
<site><_-obj>
<title><_-obj>
HSON Live
</_-obj></title>
<version><_-obj>
2.0.26
</_-obj></version>
<theme><_-obj>
<mode><_-obj>
terminal-gothic
</_-obj></mode>
<accent><_-obj>
yellowlike
</_-obj></accent>
</_-obj></theme>
<sections><_-arr><_-ii data-_index="0"><_-obj>
<id><_-obj>
transform
</_-obj></id>
<label><_-obj>
hson.transform
</_-obj></label>
<status><_-obj>
stable
</_-obj></status>
</_-obj></_-ii><_-ii data-_index="1"><_-obj>
<id><_-obj>
liveTree
</_-obj></id>
<label><_-obj>
hson.liveTree
</_-obj></label>
<status><_-obj>
active
</_-obj></status>
</_-obj></_-ii><_-ii data-_index="2"><_-obj>
<id><_-obj>
liveMap
</_-obj></id>
<label><_-obj>
hson.liveMap
</_-obj></label>
<status><_-obj>
wip
</_-obj></status>
</_-obj></_-ii></_-arr></sections>
</_-obj></site>
</_-obj>
`,
    },
    footer: "derived projection / json",
  },
  {
    headerA: "HTML <=> HSON <=> JSON",
    bodyA: {
      kind: "code",
      lang: "html",
      text: `
<body id="hson-demo">
  <main class="deck">
    <section data-status="stable" id="transform">
      <h1>hson.transform</h1>
      <p>JSON, HTML, and HSON convert through one node graph.</p>
    </section>
    <section data-status="active" id="liveTree">
      <h1>hson.liveTree</h1>
      <p>The DOM is projected from a live HsonNode graph.</p>
    </section>
    <section data-status="wip" id="liveMap">
      <h1>hson.liveMap</h1>
      <p>State and view begin to share one editable source.</p>
    </section> 
  </main>
</body>`,
    },
    bodyB: {
      kind: "code",
      lang: "hson",
      text: `
<body id="hson-demo"
  <main class="deck"
    <section id="transform" data-status="stable"
      <h1 "hson.transform"/>
      <p "JSON, HTML, and HSON convert through one node graph."/>
    />
    <section id="liveTree" data-status="active"
      <h1 "hson.liveTree"/>
      <p "The DOM is projected from a live HsonNode graph."/>
    />
    <section id="liveMap" data-status="wip"
      <h1 "hson.liveMap"/>
      <p "State and view begin to share one editable source."/>
    />
  />
/>`,
    },
    bodyC: {
      kind: "code",
      lang: "json",
      text: `
{
  "_-elem": [
    {
      "$_attrs": {
        "id": "hson-demo"
      },
      "body": {
        "_-elem": [
          {
            "$_attrs": {
              "class": "deck"
            },
            "main": {
              "_-elem": [
                {
                  "$_attrs": {
                    "data-status": "stable",
                    "id": "transform"
                  },
                  "section": {
                    "_-elem": [
                      {
                        "h1": {
                          "_-elem": [
                            "hson.transform"
                          ]
                        }
                      },
                      {
                        "p": {
                          "_-elem": [
                            "JSON, HTML, and HSON convert through one node graph."
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  "$_attrs": {
                    "data-status": "active",
                    "id": "liveTree"
                  },
                  "section": {
                    "_-elem": [
                      {
                        "h1": {
                          "_-elem": [
                            "hson.liveTree"
                          ]
                        }
                      },
                      {
                        "p": {
                          "_-elem": [
                            "The DOM is projected from a live HsonNode graph."
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  "$_attrs": {
                    "data-status": "wip",
                    "id": "liveMap"
                  },
                  "section": {
                    "_-elem": [
                      {
                        "h1": {
                          "_-elem": [
                            "hson.liveMap"
                          ]
                        }
                      },
                      {
                        "p": {
                          "_-elem": [
                            "State and view begin to share one editable source."
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ]
}
  `,
    },
    footer: "derived projection / html",
  },
  {
    headerA: "v2 — hson.liveTree",
    bodyA: {
      kind: "text",
      text: "A web authoring platform built on top of the HsonNode graph, allowing a single source of truth for a united state and view",
    },
    footer: "hson.livetree",
  },
  {
    headerA: "LiveTree - Internals",
    bodyA: {
      kind: "text",
      text: "1) parses <body> and all child nodes to HsonNodes (must be xml compatible)\n2) replaces it with identical HTML projection projected from HsonNode graph\n3) provides interface for node graph; changes and mutations are reflected in realtime on-DOM",
    },
    footer: "livetree / internals",
  },
  {
    headerA: "LiveTree - example",
    bodyA: {
      kind: "code",
      lang: "ts",
      text: `
const tree = hson.queryBody() // or \`.queryDom(/*selector*/)\`
.liveTree // initialize LiveTree creation
.graft(); // replace document.body with identical LiveTree projection

  // LiveTree extends many basic JS document methods
const branchDiv = tree.create.div()
    .setText("hello world")
     // methods return \`this\`, enabling complex chained operations
    .css.set.backgroundColor("pink");

// liveTree's ListenerManager exposes event listeners and handling
tree.listen
   // listener teardown/cleanup occurs automatically on node removal
  .once()
   // event listener options are fully represented in liveTree's .listen toolchain
  .onClick(() => {
       // changes to the node graph are rendered to the DOM in realtime
      branchDiv.setText("goodbye world")
          .css.set.backgroundColor("blue");
});
`,
    },
    footer: "livetree graft",
  },
  {
    headerA: "LiveTree",
    bodyA: {
      kind: "text",
      text: "### features:\n- node creation/removal, always synced to DOM\n- dynamic, typed CSS using standard JS variables\n- event listener management & teardown\n- animation, keyframes, and @property management & sequencing\n- automated teardown (CSS, listeners, keyframes)\n- native SVG support: creation, mutation, and animation\n- native <canvas> support\n- getComputedStyle, getBoundingClientRect, elementAtPoint (from liveTree.dom)",
    },
    footer: "livetree features",
  },
  {
    headerA: "a new way to create the web?",
    stackAlign: "center",
    bodyA: {
      kind: "text",
      text: "instead of \n\n### `ui = ƒ(state)`\n\n LiveTree proposes a new paradigm:",
    },
    headerB: "ui === state",
    footer: "view === state",
  },
  {
    headerA: "LiveDemo",
    bodyA: {
      kind: "text",
      text: "### explore working demos in the first site ever made entirely with hson-live\n- full hson-live docs & readme\n- over 1000 transformer, livetree, and unit tests\n- proof of concept for LiveTree as an authoring surface for complex interactive web content",
    },
    footer: "about livedemo",
  },
  {
    headerA: "v3? LiveMap (WIP)",
    bodyA: {
      kind: "text",
      text: "### fulfilling the other half of the promise:\n state management that automatically links to LiveTree, updating css and content by editing the underlying node graph source-of-truth",
    },
    footer: "v3 / livemap - WIP",
  },
  {
    headerA: "Q&A",
    bodyA: {
      kind: "text",
      text: "### please remember:\n### I have no idea what I'm doing\n(seriously, I'm way over my skis)",
    },
    footer: "q / a",
  },
  {
    headerA: "ty",
    bodyA: {
      kind: "text",
      text: "terminalgothic.com\nhansonpw@gmail.com\ngithub.com/neutralica/hson-live\ngithub.com/neutralica/hson-demo2",
    },
    footer: "acknowledgement / contact / links",
  },
];
