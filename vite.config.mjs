import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "hson-live": path.resolve(__dirname, "../hson-live/dist/index.js"),
      "hson-live/hson": path.resolve(__dirname, "../hson-live/dist/hson.js"),
      "hson-live/diagnostics": path.resolve(__dirname, "../hson-live/dist/diagnostics/index.js"),
      "hson-live/types": path.resolve(__dirname, "../hson-live/dist/types/index.js"),
      "intrastructure": path.resolve(__dirname, "../intrastructure/dist/index.js"),
    },
  },
});