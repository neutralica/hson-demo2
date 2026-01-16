import type { LiveTree } from "hson-live";
import type { LetterKey } from "./helpers";

export const makeDivClass = (lt: LiveTree, cls: string | string[]) => lt.create.div().classlist.set(cls);
export const makeDivId = (lt: LiveTree, id: string) => lt.create.div().id.set(id);
export const makeSpanClass = (lt: LiveTree, cls: string | string[]) => lt.create.span().classlist.set(cls);
export const makeSection = (lt: LiveTree, cls: string | string[]) => lt.create.section().classlist.set(cls);

export const createHSON = (stage: LiveTree) => {
    const frame = makeDivClass(stage, 'frame');
    const hsonWord = makeDivClass(frame, "wordmark");
    const createLetter = (ltr: LetterKey): readonly [LiveTree, LiveTree] => {
        const cell = makeSpanClass(hsonWord, ["cell", ltr]);
        const l = makeSpanClass(cell, ["letter", ltr]).setText(ltr);
        return [l, cell];
    };

    const [h, hCell] = createLetter("H")
    const [s, sCell] = createLetter("S")
    const [o, oCell] = createLetter("O")
    const [n, nCell] = createLetter("N")
    const letters = [h, s, o, n];
    const cells = [hCell, sCell, oCell, nCell];

    return [letters, cells];

}