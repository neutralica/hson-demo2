/** Typed Object.freeze wrapper shared by fixtures, suites, reporting, and the panel. */
export const freeze = <T>(value: T): Readonly<T> => Object.freeze(value);
