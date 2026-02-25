

export type AboutDocKey = string;

export type AboutDocSpec = Readonly<{
  key: AboutDocKey;
  title: string;
  body: string; // markdown-ish source
}>;

export type AboutDocs = ReadonlyArray<AboutDocSpec>;