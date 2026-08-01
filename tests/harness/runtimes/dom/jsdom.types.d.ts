declare module "jsdom" {
  export type ConstructorOptions = Readonly<{
    url?: string;
    pretendToBeVisual?: boolean;
  }>;

  export class JSDOM {
    constructor(html?: string, options?: ConstructorOptions);
    readonly window: Window & typeof globalThis & Readonly<{ close(): void }>;
  }
}
