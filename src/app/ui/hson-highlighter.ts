// hson-highlighter.ts

// CHANGED: all colors centralized here for easy tuning
export const HSON_HL = {
    text: "rgba(214, 224, 236, 0.94)",
    tag: "rgba(170, 218, 255, 0.98)",
    attr: "rgba(255, 192, 92, 0.96)",
    string: "rgba(132, 196, 148, 0.96)",
    punct: "rgba(132, 160, 188, 0.9)",
    equals: "rgba(112, 142, 172, 0.92)",
    comment: "rgba(118, 134, 148, 0.9)",
    invalid: "rgba(132, 78, 70, 0.96)", // drab brick
} as const;

export type HsonTokenType =
    | "text"
    | "tag"
    | "attr"
    | "string"
    | "punct"
    | "equals"
    | "comment"
    | "invalid"
    | "ws";

export type HsonToken = Readonly<{
    type: HsonTokenType;
    text: string;
    start: number;
    end: number;
}>;

export type HsonHighlightResult = Readonly<{
    ok: boolean;
    tokens: readonly HsonToken[];
    errorIndex: number | null;
}>;

// CHANGED: tiny helpers
function isWs(ch: string): boolean {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function ch_at(src: string, i: number): string {
    return src[i] as string;
}

function isNameStart(ch: string): boolean {
    return /[A-Za-z_:@]/.test(ch);
}

function isNameChar(ch: string): boolean {
    return /[A-Za-z0-9_\-:.@]/.test(ch);
}

function escape_html(s: string): string {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll(`"`, "&quot;");
}

function push_token(
    out: HsonToken[],
    type: HsonTokenType,
    text: string,
    start: number,
    end: number,
): void {
    if (start === end) return;
    out.push({ type, text, start, end });
}

function color_for(type: HsonTokenType): string {
    switch (type) {
        case "tag": return HSON_HL.tag;
        case "attr": return HSON_HL.attr;
        case "string": return HSON_HL.string;
        case "punct": return HSON_HL.punct;
        case "equals": return HSON_HL.equals;
        case "comment": return HSON_HL.comment;
        case "invalid": return HSON_HL.invalid;
        case "ws": return HSON_HL.text;
        case "text":
        default:
            return HSON_HL.text;
    }
}

// CHANGED: tolerant tokenizer for HSON / pared-html-ish syntax
// - highlights valid structure normally
// - if a quote or tag never closes, marks the remainder invalid
export function tokenize_hson_loose(src: string): HsonHighlightResult {
    const out: HsonToken[] = [];
    const len = src.length;

    let i = 0;
    let errorIndex: number | null = null;

    const fail_tail = (from: number): HsonHighlightResult => {
        if (from < len) push_token(out, "invalid", src.slice(from), from, len);
        return { ok: false, tokens: out, errorIndex: from };
    };

    while (i < len) {
        const ch = src[i];

        // CHANGED: line comments, if you want them
        if (ch === "/" && src[i + 1] === "/") {
            const start = i;
            i += 2;
            while (i < len && src[i] !== "\n") i++;
            push_token(out, "comment", src.slice(start, i), start, i);
            continue;
        }

        // outside tag
        if (ch !== "<") {
            const start = i;
            while (i < len && src[i] !== "<") i++;
            push_token(out, "text", src.slice(start, i), start, i);
            continue;
        }

        // inside tag-ish structure
        const tagStart = i;
        push_token(out, "punct", "<", i, i + 1);
        i++;

        if (i >= len) {
            errorIndex = tagStart;
            return fail_tail(tagStart);
        }

        // optional closer slash
        if (src[i] === "/") {
            push_token(out, "punct", "/", i, i + 1);
            i++;
        }

        // whitespace after <
        while (i < len && isWs(ch_at(src, i))) {
            const wsStart = i;
            while (i < len && isWs(ch_at(src, i))) i++;
            push_token(out, "ws", src.slice(wsStart, i), wsStart, i);
        }

        // tag name required
        if (i >= len || !isNameStart(ch_at(src, i))) {
            errorIndex = tagStart;
            return fail_tail(tagStart);
        }

        {
            const nameStart = i;
            i++;
            while (i < len && isNameChar(ch_at(src, i))) i++;
            push_token(out, "tag", src.slice(nameStart, i), nameStart, i);
        }

        // attributes / text content shorthand until > or />
        while (i < len) {
            // whitespace
            if (isWs(ch_at(src, i))) {
                const wsStart = i;
                while (i < len && isWs(ch_at(src, i))) i++;
                push_token(out, "ws", src.slice(wsStart, i), wsStart, i);
                continue;
            }

            // end tag
            if (src[i] === ">") {
                push_token(out, "punct", ">", i, i + 1);
                i++;
                break;
            }

            // self-close
            if (src[i] === "/" && src[i + 1] === ">") {
                push_token(out, "punct", "/>", i, i + 2);
                i += 2;
                break;
            }

            // bare slash alone
            if (src[i] === "/") {
                push_token(out, "punct", "/", i, i + 1);
                i++;
                continue;
            }

            // quoted text node shorthand, e.g. <div "hello" />
            if (src[i] === `"` || src[i] === `'`) {
                const q = src[i];
                const strStart = i;
                i++;

                while (i < len) {
                    if (src[i] === "\\") {
                        i += 2;
                        continue;
                    }
                    if (src[i] === q) {
                        i++;
                        push_token(out, "string", src.slice(strStart, i), strStart, i);
                        break;
                    }
                    i++;
                }

                if (i > len || src[i - 1] !== q) {
                    errorIndex = strStart;
                    return fail_tail(strStart);
                }

                continue;
            }

            // attribute / bare content key
            if (isNameStart(ch_at(src, i))) {
                const attrStart = i;
                i++;
                while (i < len && isNameChar(ch_at(src, i))) i++;
                push_token(out, "attr", src.slice(attrStart, i), attrStart, i);

                // optional whitespace
                while (i < len && isWs(ch_at(src, i))) {
                    const wsStart = i;
                    while (i < len && isWs(ch_at(src, i))) i++;
                    push_token(out, "ws", src.slice(wsStart, i), wsStart, i);
                }

                // optional = value
                if (src[i] === "=") {
                    push_token(out, "equals", "=", i, i + 1);
                    i++;

                    while (i < len && isWs(ch_at(src, i))) {
                        const wsStart = i;
                        while (i < len && isWs(ch_at(src, i))) i++;
                        push_token(out, "ws", src.slice(wsStart, i), wsStart, i);
                    }

                    if (i >= len) {
                        errorIndex = attrStart;
                        return fail_tail(attrStart);
                    }

                    // quoted value
                    if (src[i] === `"` || src[i] === `'`) {
                        const q = src[i];
                        const strStart = i;
                        i++;

                        while (i < len) {
                            if (src[i] === "\\") {
                                i += 2;
                                continue;
                            }
                            if (src[i] === q) {
                                i++;
                                push_token(out, "string", src.slice(strStart, i), strStart, i);
                                break;
                            }
                            i++;
                        }

                        if (i > len || src[i - 1] !== q) {
                            errorIndex = strStart;
                            return fail_tail(strStart);
                        }
                        continue;
                    }

                    // bare value
                    const bareStart = i;
                    while (
                        i < len &&
                        !isWs(ch_at(src, i)) &&
                        src[i] !== ">" &&
                        !(src[i] === "/" && src[i + 1] === ">")
                    ) {
                        i++;
                    }
                    push_token(out, "string", src.slice(bareStart, i), bareStart, i);
                }

                continue;
            }

            // unknown char inside tag: treat tail as invalid
            errorIndex = i;
            return fail_tail(i);
        }
    }

    return {
        ok: errorIndex === null,
        tokens: out,
        errorIndex,
    };
}

// CHANGED: quick renderer for prototyping or contenteditable overlay usage
export function render_hson_highlight_html(src: string): string {
    const res = tokenize_hson_loose(src);
    return res.tokens
    .map((tok) => {
            console.log(color_for(tok.type))
            const text = tok.text
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll("\n", "<br>")
                .replaceAll("  ", "&nbsp; ");
            return `<span data-hl="${tok.type}" style="color:${color_for(tok.type)}">${text}</span>`;
        })
        .join("");
}