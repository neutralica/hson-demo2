// src/vite-env.d.ts

/// <reference types="vite/client" />

declare module "*.md?raw" {
  const content: string;
  export default content;
}