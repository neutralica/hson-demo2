// palette-board.ts
import type { LiveTree } from "hson-live";
import type { Palette } from "./calc-palette";
import { mk_div_cls, mk_div_id } from "../../utils/makers";
import { MONO_MAINfont } from "../../core/consts/ui-consts";

// Render a simple grid of clickable swatches.
// Click swatch → copies `oklch(...)` string.
export function render_palette_board(host: LiveTree, p: Palette): () => void {
    const root = host.create.div().attr.set("class", "palette-board");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // Layout shell
    root.text.set("HSON")
        .css.setMany({
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "10px",
          fontFamily: MONO_MAINfont,
            fontSize: "12px",
            color: p.textOnDark,
        });


    // Background helps you see contrast immediately.
    const pal = mk_div_cls(root, "palette-banner")
        .text.set(`PALETTE seed: ${p.seed}  vol: ${p.opts.volatility.toFixed(2)}`)
        .css.setMany({
            padding: "10px 12px",
            borderRadius: "10px",
            background: p.bgDark,
            border: `1px solid ${p.grays[1]}`,
        });

    /* 
    single-section helper
    the 'mode' passing may seem totally pointless since we already a browser pref checker
        but here it lets me set the background behind the dark-mode color palette independently of
        current browser mode */
    const section = (title: string, mode: "dark" | "light" = "dark") => {
        const isLight = mode === "light";
        const box = mk_div_cls(root, "palette-section");
        const background = isLight ? p.bgLight : p.bgDark;
        const modeGrey = isLight ? p.grays[3] : p.grays[2];
        box.css.setMany({
            padding: "10px 12px",
            borderRadius: "10px",
            background,
            border: `1px solid ${modeGrey}`,
            display: "grid",
            gap: "2px",
        });

        box.create.div().text.set(title).css.setMany({
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: `${modeGrey}`,
            opacity: "1",
            fontWeight: "700"
        });

        const grid = mk_div_cls(box, "palette-grid");
        grid.css.setMany({
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "2px",
        });

        return grid;
    };

    const addSwatch = (grid: LiveTree, name: string, value: string) => {
        const sw = mk_div_cls(grid, "swatch");

        sw.css.setMany({
            borderRadius: "10px",
            padding: "10px",
            border: `3px double ${p.bgDark}`,
            background: value,
            cursor: "pointer",
            userSelect: "none",
            display: "flex",
            gap: "1px",
            minHeight: "48px",
            placeItems: "center",
            justifyContent: "center",
            //   boxShadow: "0 10px 20px rgba(0,0,0,0.22)",
        });

        // Auto text color based on lightness guess:
        const text = guess_text(value, p.textOnDark, p.textOnLight);

        sw.create.div().text.set(name).css.setMany({
            color: text,
            fontWeight: "700",
        });

        // Click → copy
        sw.listen?.onClick?.(() => {
            void copy_text(value);
        });
    };

    // Render sections
    const g1 = section("LIGHT  (8)", "light");
    p.lightMode.forEach((v, i) => addSwatch(g1, `dark${i + 1}`, v));

    const g2 = section("DARK (8)", "dark");
    p.darkMode.forEach((v, i) => addSwatch(g2, `light${i + 1}`, v));

    const g3 = section("Grays + Text + BG");
    p.grays.forEach((v, i) => addSwatch(g3, `gray${i + 1}`, v));
    addSwatch(g3, "dark\nbg", p.bgDark);
    addSwatch(g3, "lite\nbg", p.bgLight);
    addSwatch(g3, "dark\ntxt", p.textOnDark);
    addSwatch(g3, "lite\ntxt", p.textOnLight);

    const g4 = section("Accents (4)");
    p.accents.forEach((v, i) => addSwatch(g4, `accent${i + 1}`, v));
    const empty = () => root.empty()
    return empty;
}

// Minimal clipboard helper (no DOM selection gymnastics unless you want it later)
async function copy_text(s: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(s);
    } catch {
        // Worst-case fallback: prompt (still copies easily).
        // eslint-disable-next-line no-alert
        window.prompt("Copy OKLCH:", s);
    }
}

// Cheap heuristic: if the string contains “oklch(8” it’s likely light enough for dark text.
// You can replace this with a real OKLCH parser later.
function guess_text(oklchStr: string, textOnDark: string, textOnLight: string): string {
    const m = /oklch\(\s*([0-9.]+)%/i.exec(oklchStr);
    const Lpct = m ? Number(m[1]) : 50;
    return Lpct >= 60 ? textOnLight : textOnDark;
}