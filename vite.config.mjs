import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
 
export default defineConfig({
  // resolve: {
  //   alias: [
  //     // Put the more specific aliases FIRST
  //     { find: "hson-live/diagnostics", replacement: path.resolve(__dirname, "../hson-live/dist/diagnostics/index.js") },
  //     { find: "hson-live/types", replacement: path.resolve(__dirname, "../hson-live/dist/types/index.js") },
  //     { find: "hson-live/hson", replacement: path.resolve(__dirname, "../hson-live/dist/hson.js") },

  //     // Then map the package root
  //     { find: "hson-live", replacement: path.resolve(__dirname, "../hson-live/dist/index.js") },

  //     // Same idea for intrastructure (adjust filename if needed)
  //     { find: "intrastructure", replacement: path.resolve(__dirname, "../../intrastructure/dist/index.js") },
  //   ],
  // },
});