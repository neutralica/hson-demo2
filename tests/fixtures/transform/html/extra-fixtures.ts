import { _freeze } from "../../app/demos/test/tests.consts";


const AUTO_FIXTURES = _freeze({
    explicitHtmlCloser: `
      <main id="root">
        <div id="box">x</div>
      </main>
    `,

    hsonOnlySyntax: `
      <main id="root"
        <div id="box" "x"/>
      />
    `,
});

export const JSON_SHAPE_SENTRIES = _freeze({
    emptyElement: {
        "_hson_elem": [
            {
                "div": {
                    "_hson_elem": []
                }
            }
        ]
    },

    elementWithStringChild: {
        "_hson_elem": [
            {
                "div": {
                    "_hson_elem": ["x"]
                }
            }
        ]
    },

    objectValuedProperty: {
        "widget": {
            "mode": "on",
            "state": {
                "open": true
            }
        }
    },
});

export const HTML_ATTR_SENTRIES = _freeze({
    minimalJsonAttr: `
      <main id="root">
        <div id="t1" data-json='{"a":"b"}'></div>
      </main>
    `,

    windowsPathAndQuote: `
      <main id="root">
        <div id="t2" data-payload='{"path":"C:\\\\temp\\\\file.txt","quote":"\\"hi\\""}'></div>
      </main>
    `,

    multilineQuotedAttr: `
      <main id="root">
        <div
          id="t3"
          data-note="line1
line2
line3"
        ></div>
      </main>
    `,

    rawTextPlusJsonAttr: `
      <main id="root">
        <script
          id="t4"
          data-cf-beacon='{"token":"abc123"}'
        >console.log("x")</script>
      </main>
    `,
});


export const EXTRA_FIXTURES = {
    AUTO_FIXTURES,
    HTML_ATTR_SENTRIES,
    JSON_SHAPE_SENTRIES,
}
